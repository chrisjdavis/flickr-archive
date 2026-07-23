import fs from "node:fs";
import path from "node:path";
import { blobPublicUrl, isBlobArchiveMode } from "./storage-mode";

export const BLOB_SQLITE_TMP_PATH = path.join("/tmp", "flickr-archive-index.sqlite");

let preparePromise: Promise<string> | null = null;

function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Download index.sqlite from public Blob URL into /tmp (once per isolate).
 * Safe to call from instrumentation and before opening the DB.
 */
export async function prepareBlobSqlite(): Promise<string> {
  if (!isBlobArchiveMode()) {
    throw new Error("prepareBlobSqlite called outside blob archive mode.");
  }
  if (isProductionBuildPhase()) {
    throw new Error("Skipping Blob SQLite download during production build.");
  }

  if (fs.existsSync(BLOB_SQLITE_TMP_PATH)) {
    return BLOB_SQLITE_TMP_PATH;
  }

  if (!preparePromise) {
    preparePromise = (async () => {
      const url = blobPublicUrl("index.sqlite");
      if (!url) {
        throw new Error(
          "BLOB_PUBLIC_BASE_URL is required in blob archive mode (run npm run upload:blob)."
        );
      }

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to download archive database from Blob (${response.status}): ${url}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const tmpWrite = `${BLOB_SQLITE_TMP_PATH}.${process.pid}.tmp`;
      fs.writeFileSync(tmpWrite, buffer);
      fs.renameSync(tmpWrite, BLOB_SQLITE_TMP_PATH);
      return BLOB_SQLITE_TMP_PATH;
    })().catch((err) => {
      preparePromise = null;
      throw err;
    });
  }

  return preparePromise;
}

export function blobSqliteReady(): boolean {
  return isBlobArchiveMode() && fs.existsSync(BLOB_SQLITE_TMP_PATH);
}
