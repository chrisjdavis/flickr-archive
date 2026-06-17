import path from "node:path";
import { extractPhotoIdFromFilename } from "../lib/types";

export function buildMediaIndex(mediaFilenames: string[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const filename of mediaFilenames) {
    const id = extractPhotoIdFromFilename(filename);
    if (id) {
      index.set(id, filename);
    }
  }

  return index;
}

export function matchPhotoToMedia(
  photoId: string,
  mediaIndex: Map<string, string>
): string | null {
  return mediaIndex.get(photoId) ?? null;
}

export function basenameMediaPath(mediaPath: string): string {
  return path.basename(mediaPath);
}
