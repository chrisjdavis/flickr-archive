import AdmZip from "adm-zip";
import fs from "node:fs";
import path from "node:path";
import { extractZipEntriesSafely, ZipExtractionTracker } from "../lib/zip-safe";

export function extractMetadataZip(zipPath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  const tracker = new ZipExtractionTracker();
  extractZipEntriesSafely(zip, destDir, { tracker });
}

export function extractMediaZips(
  zipPaths: string[],
  destDir: string,
  onZip?: (index: number, total: number, zipPath: string) => void
): string[] {
  fs.mkdirSync(destDir, { recursive: true });
  const extracted: string[] = [];
  const tracker = new ZipExtractionTracker();

  for (let i = 0; i < zipPaths.length; i++) {
    const zipPath = zipPaths[i];
    onZip?.(i + 1, zipPaths.length, zipPath);
    const zip = new AdmZip(zipPath);
    const names = extractZipEntriesSafely(zip, destDir, {
      tracker,
      flattenToBasename: true,
      skipDuplicates: true,
    });
    extracted.push(...names);
  }

  return extracted;
}

export function listPhotoJsonFiles(metadataDir: string): string[] {
  return fs
    .readdirSync(metadataDir)
    .filter((f) => /^photo_\d+\.json$/i.test(f))
    .map((f) => path.join(metadataDir, f));
}

export function listMediaFiles(mediaDir: string): string[] {
  return fs
    .readdirSync(mediaDir)
    .filter((f) => !f.startsWith("."))
    .map((f) => path.join(mediaDir, f));
}
