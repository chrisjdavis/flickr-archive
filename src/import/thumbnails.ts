import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MAX_IMAGE_DIMENSION, MAX_SHARP_PIXELS } from "../lib/import-limits";
import { mediaTypeFromExtension } from "../lib/types";

const THUMB_WIDTH = 400;

export type ThumbnailResult = {
  filename: string | null;
  width: number | null;
  height: number | null;
};

export async function generateThumbnail(
  sourcePath: string,
  thumbsDir: string,
  photoId: string
): Promise<ThumbnailResult> {
  const ext = path.extname(sourcePath).slice(1).toLowerCase();
  const mediaType = mediaTypeFromExtension(ext);

  if (mediaType === "video" || mediaType !== "image") {
    return { filename: null, width: null, height: null };
  }

  fs.mkdirSync(thumbsDir, { recursive: true });
  const thumbName = `${photoId}.jpg`;
  const thumbPath = path.join(thumbsDir, thumbName);

  const pipeline = sharp(sourcePath, {
    limitInputPixels: MAX_SHARP_PIXELS,
  }).rotate();
  const meta = await pipeline.metadata();

  if (
    (meta.width ?? 0) > MAX_IMAGE_DIMENSION ||
    (meta.height ?? 0) > MAX_IMAGE_DIMENSION
  ) {
    throw new Error(`Image dimensions exceed ${MAX_IMAGE_DIMENSION}px.`);
  }

  await pipeline
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  return {
    filename: thumbName,
    width: meta.width ?? null,
    height: meta.height ?? null,
  };
}
