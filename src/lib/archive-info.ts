import fs from "node:fs";
import path from "node:path";
import { getDbPath, getMediaDir } from "./db";

export type ArchiveFilesystemInfo = {
  dbPath: string;
  dbSizeBytes: number;
  dbModified: Date;
  mediaRoot: string;
  mediaSizeBytes: number | null;
};

const MEDIA_SIZE_CACHE_TTL_MS = 5 * 60 * 1000;
let mediaSizeCache: { at: number; root: string; bytes: number | null } | null = null;

function dirSize(dir: string): number | null {
  try {
    let total = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = dirSize(full);
        if (sub !== null) total += sub;
      } else if (entry.isFile()) {
        total += fs.lstatSync(full).size;
      }
    }
    return total;
  } catch {
    return null;
  }
}

function cachedMediaSize(mediaRoot: string): number | null {
  const now = Date.now();
  if (
    mediaSizeCache &&
    mediaSizeCache.root === mediaRoot &&
    now - mediaSizeCache.at < MEDIA_SIZE_CACHE_TTL_MS
  ) {
    return mediaSizeCache.bytes;
  }

  const bytes = fs.existsSync(mediaRoot) ? dirSize(mediaRoot) : null;
  mediaSizeCache = { at: now, root: mediaRoot, bytes };
  return bytes;
}

export function getArchiveFilesystemInfo(): ArchiveFilesystemInfo {
  const dbPath = getDbPath();
  const stat = fs.statSync(dbPath);
  const mediaRoot = getMediaDir();
  const mediaSizeBytes = cachedMediaSize(mediaRoot);

  return {
    dbPath,
    dbSizeBytes: stat.size,
    dbModified: stat.mtime,
    mediaRoot,
    mediaSizeBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatShortDate(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 16);
}

export function shortenPath(p: string): string {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (home && p.startsWith(home)) {
    return "~" + p.slice(home.length);
  }
  return p;
}
