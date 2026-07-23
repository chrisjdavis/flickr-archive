/**
 * Upload a local flickr-archive `archive/` tree to Vercel Blob.
 *
 * Prerequisites:
 *   1. Create a Blob store in the Vercel project
 *   2. `BLOB_READ_WRITE_TOKEN` in the environment (or `.env.local`)
 *   3. A completed local import (`archive/index.sqlite`, `media/`, `thumbs/`)
 *
 * Usage:
 *   npm run upload:blob
 *   npm run upload:blob -- --dry-run
 *
 * After upload, set these on the Vercel project and redeploy:
 *   ARCHIVE_STORAGE=blob
 *   BLOB_PUBLIC_BASE_URL=<printed by this script>
 *   BLOB_ARCHIVE_PREFIX=flickr-archive   # optional, default
 *   BLOB_READ_WRITE_TOKEN=<same token>   # optional at runtime; public media URLs don't need it
 */
import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import Database from "better-sqlite3";

const projectRoot = process.cwd();
const archiveRoot = process.env.FLICKR_ARCHIVE_PATH
  ? path.isAbsolute(process.env.FLICKR_ARCHIVE_PATH)
    ? process.env.FLICKR_ARCHIVE_PATH
    : path.resolve(projectRoot, process.env.FLICKR_ARCHIVE_PATH)
  : path.resolve(projectRoot, "archive");

const PREFIX = (process.env.BLOB_ARCHIVE_PREFIX?.trim() || "flickr-archive").replace(
  /^\/+|\/+$/g,
  ""
);
const CONCURRENCY = Number(process.env.BLOB_UPLOAD_CONCURRENCY || 6);
const MULTIPART_THRESHOLD = 8 * 1024 * 1024; // 8 MiB
const dryRun = process.argv.includes("--dry-run");

type UploadItem = { absolute: string; pathname: string; size: number };

function walkFiles(dir: string, relativeBase: string): UploadItem[] {
  if (!fs.existsSync(dir)) return [];
  const out: UploadItem[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(dir, entry.name);
    const relative = path.posix.join(relativeBase, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(absolute, relative));
    } else if (entry.isFile()) {
      out.push({
        absolute,
        pathname: `${PREFIX}/${relative.replace(/\\/g, "/")}`,
        size: fs.statSync(absolute).size,
      });
    }
  }
  return out;
}

function checkpointSqlite(dbPath: string): void {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Missing database at ${dbPath}. Run a local import first.`);
  }
  const db = new Database(dbPath);
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    db.close();
  }
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

function contentTypeFor(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".mov": "video/quicktime",
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".sqlite": "application/x-sqlite3",
    ".json": "application/json",
  };
  return map[ext];
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim() && !dryRun) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required. Create a Blob store in Vercel and copy the token.");
  }

  const dbPath = path.join(archiveRoot, "index.sqlite");
  console.log(`Archive: ${archiveRoot}`);
  console.log(`Prefix:  ${PREFIX}`);
  console.log(dryRun ? "Mode:    dry-run (no uploads)" : "Mode:    upload");

  checkpointSqlite(dbPath);

  const items: UploadItem[] = [
    {
      absolute: dbPath,
      pathname: `${PREFIX}/index.sqlite`,
      size: fs.statSync(dbPath).size,
    },
    ...walkFiles(path.join(archiveRoot, "media"), "media"),
    ...walkFiles(path.join(archiveRoot, "thumbs"), "thumbs"),
  ];

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  console.log(`Files:   ${items.length.toLocaleString()} (${(totalBytes / 1e9).toFixed(2)} GB)`);

  let uploaded = 0;
  let baseUrl: string | null = null;
  const started = Date.now();

  await mapPool(items, CONCURRENCY, async (item) => {
    if (dryRun) {
      uploaded += 1;
      if (uploaded % 100 === 0 || uploaded === items.length) {
        console.log(`  planned ${uploaded}/${items.length}`);
      }
      return;
    }

    const body = fs.createReadStream(item.absolute);
    const result = await put(item.pathname, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: item.size >= MULTIPART_THRESHOLD,
      contentType: contentTypeFor(item.absolute),
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!baseUrl) {
      // result.url = https://xxx.public.blob.vercel-storage.com/flickr-archive/index.sqlite
      const marker = `/${PREFIX}/`;
      const idx = result.url.indexOf(marker);
      if (idx === -1) {
        throw new Error(`Unexpected Blob URL shape: ${result.url}`);
      }
      baseUrl = result.url.slice(0, idx + marker.length - 1); // include prefix, no trailing slash
    }

    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === items.length) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(0);
      console.log(`  uploaded ${uploaded}/${items.length} (${elapsed}s)`);
    }
  });

  console.log("");
  if (dryRun) {
    console.log("Dry run complete. Re-run without --dry-run to upload.");
    return;
  }

  console.log("Upload complete.");
  console.log("");
  console.log("Set these environment variables on Vercel, then redeploy:");
  console.log(`  ARCHIVE_STORAGE=blob`);
  console.log(`  BLOB_PUBLIC_BASE_URL=${baseUrl}`);
  console.log(`  BLOB_ARCHIVE_PREFIX=${PREFIX}`);
  console.log("");
  console.log("Web import stays disabled on Vercel; re-run this script after a local re-import.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
