export type ImportReport = {
  photosImported: number;
  photosMissingMedia: string[];
  orphanMedia: string[];
  albumsImported: number;
  albumsMissingPhotos: { albumId: string; photoId: string }[];
  mediaTypeCounts: Record<string, number>;
  commentsImported: number;
  tagsImported: number;
};

export function printImportReport(report: ImportReport): void {
  console.log("\n=== Flickr Archive Import Report ===\n");
  console.log(`Photos imported:     ${report.photosImported}`);
  console.log(`Albums imported:     ${report.albumsImported}`);
  console.log(`Comments imported:   ${report.commentsImported}`);
  console.log(`Tags imported:       ${report.tagsImported}`);

  console.log("\nMedia types:");
  for (const [type, count] of Object.entries(report.mediaTypeCounts).sort()) {
    console.log(`  ${type}: ${count}`);
  }

  if (report.photosMissingMedia.length > 0) {
    console.log(`\nPhotos missing media (${report.photosMissingMedia.length}):`);
    for (const id of report.photosMissingMedia.slice(0, 10)) {
      console.log(`  - ${id}`);
    }
    if (report.photosMissingMedia.length > 10) {
      console.log(`  ... and ${report.photosMissingMedia.length - 10} more`);
    }
  } else {
    console.log("\nPhotos missing media: 0");
  }

  if (report.orphanMedia.length > 0) {
    console.log(`\nOrphan media files (${report.orphanMedia.length}):`);
    for (const f of report.orphanMedia.slice(0, 10)) {
      console.log(`  - ${f}`);
    }
    if (report.orphanMedia.length > 10) {
      console.log(`  ... and ${report.orphanMedia.length - 10} more`);
    }
  } else {
    console.log("Orphan media files: 0");
  }

  if (report.albumsMissingPhotos.length > 0) {
    console.log(`\nAlbum references to missing photos: ${report.albumsMissingPhotos.length}`);
  }

  console.log("\nImport complete.\n");
}
