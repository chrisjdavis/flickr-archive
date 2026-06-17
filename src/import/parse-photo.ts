import fs from "node:fs";
import path from "node:path";
import { flickrPhotoSchema } from "../lib/types";
import type { FlickrPhoto } from "../lib/types";

export function parsePhotoJsonFile(filePath: string): FlickrPhoto {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return flickrPhotoSchema.parse(raw);
}

export function photoIdFromJsonFilename(filename: string): string | null {
  const match = path.basename(filename).match(/^photo_(\d+)\.json$/i);
  return match?.[1] ?? null;
}

export function parseAllPhotos(metadataDir: string): FlickrPhoto[] {
  const files = fs
    .readdirSync(metadataDir)
    .filter((f) => /^photo_\d+\.json$/i.test(f));

  return files.map((f) => parsePhotoJsonFile(path.join(metadataDir, f)));
}
