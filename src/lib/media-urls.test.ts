import { afterEach, describe, expect, it, vi } from "vitest";
import { mediaUrl } from "./media-urls";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mediaUrl", () => {
  it("uses /api/media in local mode", () => {
    vi.stubEnv("ARCHIVE_STORAGE", "local");
    delete process.env.BLOB_PUBLIC_BASE_URL;
    expect(mediaUrl("a/b.jpg", "media")).toBe("/api/media/media/a/b.jpg");
  });

  it("uses Blob public URLs in blob mode", () => {
    vi.stubEnv("ARCHIVE_STORAGE", "blob");
    vi.stubEnv(
      "BLOB_PUBLIC_BASE_URL",
      "https://example.public.blob.vercel-storage.com/flickr-archive"
    );
    expect(mediaUrl("a/b.jpg", "thumbs")).toBe(
      "https://example.public.blob.vercel-storage.com/flickr-archive/thumbs/a/b.jpg"
    );
  });
});
