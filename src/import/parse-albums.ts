import fs from "node:fs";
import path from "node:path";
import { flickrAlbumsFileSchema } from "../lib/types";
import type { FlickrAlbum } from "../lib/types";

export function parseAlbums(metadataDir: string): FlickrAlbum[] {
  const filePath = path.join(metadataDir, "albums.json");
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const parsed = flickrAlbumsFileSchema.parse(raw);
  return parsed.albums;
}
