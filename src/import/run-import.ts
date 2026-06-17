import fs from "node:fs";
import path from "node:path";
import { closeDb, getDbPath, initSchema, openWritableDb } from "../lib/db";
import { extractPhotoIdFromFilename, mediaTypeFromExtension } from "../lib/types";
import { discoverExport, discoverExtractedExport } from "./discover";
import { extractMediaZips, extractMetadataZip, listMediaFiles } from "./extract";
import { buildMediaIndex } from "./match-media";
import { parseAccount } from "./parse-account";
import { parseAlbums } from "./parse-albums";
import { parseAllPhotos } from "./parse-photo";
import type { ImportReport } from "./report";
import { generateThumbnail } from "./thumbnails";
import { clearDatabase, writeAccount, writeAlbums, writePhotos } from "./write-db";

export type ImportPhase =
  | "preparing"
  | "extracting"
  | "parsing"
  | "matching"
  | "thumbnails"
  | "database"
  | "complete";

export type ImportProgress = {
  phase: ImportPhase;
  message: string;
  current?: number;
  total?: number;
};

export type RunImportOptions = {
  inputDir: string;
  outputDir: string;
  force?: boolean;
  onProgress?: (progress: ImportProgress) => void;
};

function report(onProgress: RunImportOptions["onProgress"], progress: ImportProgress): void {
  onProgress?.(progress);
}

async function prepareArchiveDirs(
  outputDir: string,
  force: boolean
): Promise<{ metadataDir: string; mediaDir: string; thumbsDir: string }> {
  const metadataDir = path.join(outputDir, ".staging", "metadata");
  const mediaDir = path.join(outputDir, "media");
  const thumbsDir = path.join(outputDir, "thumbs");

  if (force && fs.existsSync(outputDir)) {
    fs.rmSync(path.join(outputDir, "media"), { recursive: true, force: true });
    fs.rmSync(path.join(outputDir, "thumbs"), { recursive: true, force: true });
    const dbPath = path.join(outputDir, "index.sqlite");
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(metadataDir, { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.mkdirSync(thumbsDir, { recursive: true });

  return { metadataDir, mediaDir, thumbsDir };
}

export async function runImport(options: RunImportOptions): Promise<ImportReport> {
  const { inputDir, outputDir, force = false, onProgress } = options;

  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const dbPath = path.join(outputDir, "index.sqlite");
  if (fs.existsSync(dbPath) && !force) {
    throw new Error(
      `Archive already exists at ${outputDir}. Enable re-import to replace it.`
    );
  }

  report(onProgress, { phase: "preparing", message: "Preparing archive directories..." });
  const { metadataDir, mediaDir, thumbsDir } = await prepareArchiveDirs(outputDir, force);

  const extracted = discoverExtractedExport(inputDir);
  if (extracted) {
    report(onProgress, { phase: "extracting", message: "Copying pre-extracted export..." });
    fs.cpSync(extracted.metadataDir, metadataDir, { recursive: true });
    for (const file of fs.readdirSync(extracted.mediaDir)) {
      fs.copyFileSync(path.join(extracted.mediaDir, file), path.join(mediaDir, file));
    }
  } else {
    report(onProgress, { phase: "extracting", message: "Extracting metadata ZIP..." });
    const { metadataZip, dataZips } = discoverExport(inputDir);
    extractMetadataZip(metadataZip, metadataDir);
    extractMediaZips(dataZips, mediaDir, (index, total, zipPath) => {
      report(onProgress, {
        phase: "extracting",
        message: `Extracting ${path.basename(zipPath)} (${index}/${total})...`,
        current: index,
        total,
      });
    });
  }

  report(onProgress, {
    phase: "parsing",
    message: "Parsing metadata...",
    current: 0,
    total: 0,
  });
  const account = parseAccount(metadataDir);
  const albums = parseAlbums(metadataDir);
  const photos = parseAllPhotos(metadataDir);

  const mediaFiles = listMediaFiles(mediaDir).map((f) => path.basename(f));
  const mediaIndex = buildMediaIndex(mediaFiles);

  const photosMissingMedia: string[] = [];
  const usedMedia = new Set<string>();
  const mediaTypeCounts: Record<string, number> = {};
  const photoInserts: {
    photo: (typeof photos)[0];
    mediaFilename: string;
    thumbFilename: string | null;
    width: number | null;
    height: number | null;
  }[] = [];

  report(onProgress, {
    phase: "matching",
    message: `Matching media for ${photos.length} photos...`,
    current: 0,
    total: photos.length,
  });

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const mediaFilename = mediaIndex.get(photo.id);
    if (!mediaFilename) {
      photosMissingMedia.push(photo.id);
      continue;
    }

    usedMedia.add(mediaFilename);
    const ext = mediaFilename.split(".").pop() ?? "unknown";
    const type = mediaTypeFromExtension(ext);
    mediaTypeCounts[type] = (mediaTypeCounts[type] ?? 0) + 1;

    const sourcePath = path.join(mediaDir, mediaFilename);
    let thumbFilename: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    report(onProgress, {
      phase: "thumbnails",
      message: `Generating thumbnails (${photoInserts.length + 1}/${photos.length})...`,
      current: i + 1,
      total: photos.length,
    });

    try {
      const thumb = await generateThumbnail(sourcePath, thumbsDir, photo.id);
      thumbFilename = thumb.filename;
      width = thumb.width;
      height = thumb.height;
    } catch {
      /* thumbnail optional */
    }

    photoInserts.push({ photo, mediaFilename, thumbFilename, width, height });
  }

  const orphanMedia = mediaFiles.filter((f) => {
    const id = extractPhotoIdFromFilename(f);
    return id ? !usedMedia.has(f) : true;
  });

  report(onProgress, { phase: "database", message: "Writing search index...", current: 0, total: 0 });

  const db = openWritableDb(dbPath);
  initSchema(db);
  if (force) clearDatabase(db);

  writeAccount(db, account);
  const { commentsImported, tagsImported } = writePhotos(db, photoInserts);
  const importedPhotoIds = new Set(photoInserts.map((p) => p.photo.id));
  const { albumsImported, missingPhotos } = writeAlbums(db, albums, importedPhotoIds);

  db.close();
  closeDb();

  fs.rmSync(path.join(outputDir, ".staging"), { recursive: true, force: true });

  const importReport: ImportReport = {
    photosImported: photoInserts.length,
    photosMissingMedia,
    orphanMedia,
    albumsImported,
    albumsMissingPhotos: missingPhotos,
    mediaTypeCounts,
    commentsImported,
    tagsImported,
  };

  report(onProgress, { phase: "complete", message: "Import complete." });
  return importReport;
}
