import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import { MAX_ZIP_ENTRIES, MAX_ZIP_UNCOMPRESSED_BYTES } from "./import-limits";

export class ZipLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipLimitError";
  }
}

export class ZipPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZipPathError";
  }
}

type ZipEntry = AdmZip.IZipEntry;

export function resolveSafeZipEntryPath(destDir: string, entryName: string): string | null {
  const normalizedDest = path.resolve(destDir);
  const normalizedEntry = entryName.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedEntry || normalizedEntry.includes("..")) return null;

  const segments = normalizedEntry.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment === ".")) return null;

  const resolved = path.resolve(normalizedDest, ...segments);
  if (!resolved.startsWith(normalizedDest + path.sep) && resolved !== normalizedDest) {
    return null;
  }
  return resolved;
}

export class ZipExtractionTracker {
  private entryCount = 0;
  private uncompressedBytes = 0;

  trackEntry(uncompressedSize: number): void {
    this.entryCount += 1;
    if (this.entryCount > MAX_ZIP_ENTRIES) {
      throw new ZipLimitError(`ZIP exceeds maximum entry count (${MAX_ZIP_ENTRIES}).`);
    }

    this.uncompressedBytes += Math.max(0, uncompressedSize);
    if (this.uncompressedBytes > MAX_ZIP_UNCOMPRESSED_BYTES) {
      throw new ZipLimitError("ZIP exceeds maximum uncompressed size.");
    }
  }
}

export function getEntryUncompressedSize(entry: ZipEntry): number {
  return entry.header.size;
}

export function isSymlinkEntry(entry: ZipEntry): boolean {
  const mode = entry.header.attr >>> 0;
  // Unix symlink type in external attributes (upper 16 bits on Windows builds vary; also check name)
  if ((mode & 0o170000) === 0o120000) return true;
  return entry.entryName.endsWith("/") === false && entry.header.method === 0 && entry.header.size === 0;
}

export function extractZipEntriesSafely(
  zip: AdmZip,
  destDir: string,
  options: {
    tracker?: ZipExtractionTracker;
    flattenToBasename?: boolean;
    skipDuplicates?: boolean;
  } = {}
): string[] {
  const tracker = options.tracker ?? new ZipExtractionTracker();
  const extracted: string[] = [];
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (isSymlinkEntry(entry)) {
      throw new ZipPathError(`ZIP entry is not allowed: ${entry.entryName}`);
    }

    tracker.trackEntry(getEntryUncompressedSize(entry));

    const safePath = options.flattenToBasename
      ? resolveSafeZipEntryPath(destDir, path.basename(entry.entryName.replace(/\\/g, "/")))
      : resolveSafeZipEntryPath(destDir, entry.entryName);

    if (!safePath) {
      throw new ZipPathError(`Unsafe ZIP entry path: ${entry.entryName}`);
    }

    if (options.skipDuplicates && fs.existsSync(safePath)) {
      continue;
    }

    fs.mkdirSync(path.dirname(safePath), { recursive: true });
    fs.writeFileSync(safePath, entry.getData());
    extracted.push(path.relative(destDir, safePath));
  }

  return extracted;
}
