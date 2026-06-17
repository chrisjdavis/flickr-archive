import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  getImportState,
  markImportComplete,
  markImportError,
  releaseImportLock,
  tryStartImportJob,
  updateImportProgress,
} from "@/import/import-state";
import { runImport } from "@/import/run-import";
import { archiveExists, getArchivePath } from "@/lib/db";
import {
  MAX_SESSION_BYTES,
  MAX_SESSION_FILES,
  MAX_UPLOAD_BYTES,
} from "@/lib/import-limits";

export function isZipFilename(name: string): boolean {
  return path.basename(name).toLowerCase().endsWith(".zip");
}

export function isZipUpload(file: Pick<File, "name" | "type">): boolean {
  if (isZipFilename(file.name)) return true;
  return file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

export async function saveUploadedZips(files: File[], destDir: string, ownerToken: string): Promise<number> {
  if (files.length === 0) {
    throw new Error("No files uploaded.");
  }

  const invalid = files.filter((file) => !isZipUpload(file));
  if (invalid.length > 0) {
    const names = invalid.slice(0, 3).map((file) => file.name).join(", ");
    const suffix = invalid.length > 3 ? ` and ${invalid.length - 3} more` : "";
    throw new Error(`Only ZIP files can be uploaded. Rejected: ${names}${suffix}`);
  }

  fs.mkdirSync(destDir, { recursive: true });
  bindSessionOwner(destDir, ownerToken);

  for (const file of files) {
    await saveSingleZip(file, destDir, ownerToken);
  }

  return files.length;
}

export function validateSessionId(sessionId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    throw new Error("Invalid upload session.");
  }
  return sessionId;
}

export function getUploadRoot(): string {
  return path.join(process.cwd(), ".import-uploads");
}

export function getUploadSessionDir(sessionId: string): string {
  return path.join(getUploadRoot(), validateSessionId(sessionId));
}

function sessionOwnerPath(sessionDir: string): string {
  return path.join(sessionDir, ".owner");
}

export function bindSessionOwner(sessionDir: string, ownerToken: string): void {
  const ownerFile = sessionOwnerPath(sessionDir);
  if (!fs.existsSync(ownerFile)) {
    fs.writeFileSync(ownerFile, ownerToken, { mode: 0o600 });
  }
}

export function assertSessionOwner(sessionDir: string, ownerToken: string): void {
  const ownerFile = sessionOwnerPath(sessionDir);
  if (!fs.existsSync(ownerFile)) return;
  const owner = fs.readFileSync(ownerFile, "utf8");
  if (owner !== ownerToken) {
    throw new Error("Invalid upload session.");
  }
}

function sessionUsage(sessionDir: string): { fileCount: number; totalBytes: number } {
  if (!fs.existsSync(sessionDir)) return { fileCount: 0, totalBytes: 0 };

  let fileCount = 0;
  let totalBytes = 0;
  for (const name of fs.readdirSync(sessionDir)) {
    if (name.startsWith(".")) continue;
    if (!name.toLowerCase().endsWith(".zip")) continue;
    const full = path.join(sessionDir, name);
    const stat = fs.lstatSync(full);
    if (!stat.isFile()) continue;
    fileCount += 1;
    totalBytes += stat.size;
  }
  return { fileCount, totalBytes };
}

export function ensureUploadSession(
  sessionId: string | null | undefined,
  ownerToken: string
): { sessionId: string; dir: string } {
  const id = sessionId ? validateSessionId(sessionId) : randomUUID();
  const dir = getUploadSessionDir(id);
  fs.mkdirSync(dir, { recursive: true });
  if (sessionId) {
    assertSessionOwner(dir, ownerToken);
  } else {
    bindSessionOwner(dir, ownerToken);
  }
  return { sessionId: id, dir };
}

export function cleanupUploadSession(sessionId: string, ownerToken: string): void {
  const dir = getUploadSessionDir(sessionId);
  assertSessionOwner(dir, ownerToken);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function saveSingleZip(
  file: File,
  destDir: string,
  ownerToken: string
): Promise<string> {
  if (!isZipUpload(file)) {
    throw new Error(`Only ZIP files can be uploaded. Rejected: ${file.name}`);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File too large (${formatBytes(file.size)}). Maximum upload size is ${formatBytes(MAX_UPLOAD_BYTES)}.`
    );
  }

  fs.mkdirSync(destDir, { recursive: true });
  bindSessionOwner(destDir, ownerToken);
  assertSessionOwner(destDir, ownerToken);

  const usage = sessionUsage(destDir);
  if (usage.fileCount >= MAX_SESSION_FILES) {
    throw new Error(`Upload session limit reached (${MAX_SESSION_FILES} files).`);
  }
  if (usage.totalBytes + file.size > MAX_SESSION_BYTES) {
    throw new Error(`Upload session size limit reached (${formatBytes(MAX_SESSION_BYTES)}).`);
  }

  const name = path.basename(file.name);
  const dest = path.join(destDir, name);
  if (fs.existsSync(dest)) {
    throw new Error(`A file named "${name}" was already uploaded in this session.`);
  }

  const nodeStream = Readable.fromWeb(file.stream() as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, createWriteStream(dest));

  return name;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function listSessionZipCount(sessionDir: string): number {
  return sessionUsage(sessionDir).fileCount;
}

export function startImportJob(inputDir: string, force: boolean, cleanupInput = false): void {
  if (!tryStartImportJob()) {
    throw new Error("An import is already in progress.");
  }

  const outputDir = getArchivePath();

  void runImport({
    inputDir,
    outputDir,
    force,
    onProgress: (progress) => {
      updateImportProgress({
        phase: progress.phase,
        message: progress.message,
        current: progress.current ?? 0,
        total: progress.total ?? 0,
      });
    },
  })
    .then((report) => markImportComplete(report))
    .catch((err) => {
      markImportError(err instanceof Error ? err.message : String(err));
    })
    .finally(() => {
      releaseImportLock();
      if (cleanupInput) {
        fs.rmSync(inputDir, { recursive: true, force: true });
      }
    });
}

export function getImportStatusResponse() {
  const state = getImportState();
  return {
    ...state,
    archiveExists: archiveExists(),
  };
}
