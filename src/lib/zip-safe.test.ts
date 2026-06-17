import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSafeZipEntryPath } from "./zip-safe";

describe("resolveSafeZipEntryPath", () => {
  it("rejects path traversal", () => {
    expect(resolveSafeZipEntryPath("/tmp/out", "../etc/passwd")).toBeNull();
    expect(resolveSafeZipEntryPath("/tmp/out", "foo/../../etc/passwd")).toBeNull();
  });

  it("allows nested paths under destination", () => {
    const dest = path.join(process.cwd(), ".test-zip-safe");
    expect(resolveSafeZipEntryPath(dest, "metadata/photo_1.json")).toBe(
      path.resolve(dest, "metadata/photo_1.json")
    );
  });
});
