import fs from "node:fs";
import path from "node:path";
import { getArchivePath } from "./db";
export { mediaUrl, photoThumbUrl } from "./media-urls";

export function resolveArchiveFile(kind: "media" | "thumbs", filename: string): string | null {
  const baseDir = kind === "media"
    ? path.join(getArchivePath(), "media")
    : path.join(getArchivePath(), "thumbs");

  const resolved = path.resolve(baseDir, filename);
  const normalizedBase = path.resolve(baseDir);

  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    return null;
  }

  return resolved;
}

export function isSafeArchiveFile(filePath: string): boolean {
  try {
    const stat = fs.lstatSync(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
