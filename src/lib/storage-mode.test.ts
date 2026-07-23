import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blobPublicUrl,
  getArchiveStorageMode,
  getBlobArchivePrefix,
  isBlobArchiveMode,
} from "./storage-mode";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("storage-mode", () => {
  it("defaults to local", () => {
    delete process.env.ARCHIVE_STORAGE;
    delete process.env.VERCEL;
    delete process.env.BLOB_PUBLIC_BASE_URL;
    expect(getArchiveStorageMode()).toBe("local");
    expect(isBlobArchiveMode()).toBe(false);
  });

  it("uses blob when ARCHIVE_STORAGE=blob", () => {
    vi.stubEnv("ARCHIVE_STORAGE", "blob");
    expect(getArchiveStorageMode()).toBe("blob");
  });

  it("auto-detects blob on Vercel when public base URL is set", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("BLOB_PUBLIC_BASE_URL", "https://example.public.blob.vercel-storage.com/flickr-archive");
    delete process.env.ARCHIVE_STORAGE;
    expect(getArchiveStorageMode()).toBe("blob");
  });

  it("builds public object URLs under the base", () => {
    vi.stubEnv(
      "BLOB_PUBLIC_BASE_URL",
      "https://example.public.blob.vercel-storage.com/flickr-archive/"
    );
    expect(blobPublicUrl("media/foo bar.jpg")).toBe(
      "https://example.public.blob.vercel-storage.com/flickr-archive/media/foo%20bar.jpg"
    );
    expect(getBlobArchivePrefix()).toBe("flickr-archive");
  });
});
