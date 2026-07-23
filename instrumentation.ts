export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertImportEnvironment } = await import("./src/lib/env-check");
    assertImportEnvironment();

    const { isBlobArchiveMode } = await import("./src/lib/storage-mode");
    if (isBlobArchiveMode() && process.env.NEXT_PHASE !== "phase-production-build") {
      const { prepareBlobSqlite } = await import("./src/lib/blob-archive");
      try {
        await prepareBlobSqlite();
      } catch (err) {
        console.error("[flickr-archive] Failed to prepare Blob SQLite:", err);
      }
    }
  }
}
