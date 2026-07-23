/**
 * Archive storage backends.
 *
 * - local: SQLite + media on disk (default; VPS / local dev)
 * - blob: SQLite cached from Vercel Blob into /tmp; media served from public Blob URLs
 */
export type ArchiveStorageMode = "local" | "blob";

const DEFAULT_BLOB_PREFIX = "flickr-archive";

export function getArchiveStorageMode(): ArchiveStorageMode {
  const explicit = process.env.ARCHIVE_STORAGE?.trim().toLowerCase();
  if (explicit === "blob") return "blob";
  if (explicit === "local") return "local";

  // Auto-detect on Vercel when a public Blob base URL is configured.
  if (process.env.VERCEL && process.env.BLOB_PUBLIC_BASE_URL?.trim()) {
    return "blob";
  }
  return "local";
}

export function isBlobArchiveMode(): boolean {
  return getArchiveStorageMode() === "blob";
}

/** Pathname prefix inside the Blob store (no leading/trailing slash). */
export function getBlobArchivePrefix(): string {
  const prefix = process.env.BLOB_ARCHIVE_PREFIX?.trim() || DEFAULT_BLOB_PREFIX;
  return prefix.replace(/^\/+|\/+$/g, "");
}

/**
 * Public base URL for archive blobs, e.g.
 * https://xxx.public.blob.vercel-storage.com/flickr-archive
 * (no trailing slash)
 */
export function getBlobPublicBaseUrl(): string | null {
  const base = process.env.BLOB_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

export function blobObjectPath(relativePath: string): string {
  const prefix = getBlobArchivePrefix();
  const safe = relativePath.replace(/^\/+/, "").replace(/\\/g, "/");
  return `${prefix}/${safe}`;
}

export function blobPublicUrl(relativePath: string): string | null {
  const base = getBlobPublicBaseUrl();
  if (!base) return null;
  const safe = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${safe}`;
}

export function isRunningOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}
