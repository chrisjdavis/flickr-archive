import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSessionOwner, bindSessionOwner } from "./import-api";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeSessionDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flickr-import-session-"));
  tempDirs.push(dir);
  return dir;
}

describe("assertSessionOwner", () => {
  it("throws when .owner is missing", () => {
    const dir = makeSessionDir();
    expect(() => assertSessionOwner(dir, "owner-a")).toThrow("Invalid upload session.");
  });

  it("throws when owner token does not match", () => {
    const dir = makeSessionDir();
    bindSessionOwner(dir, "owner-a");
    expect(() => assertSessionOwner(dir, "owner-b")).toThrow("Invalid upload session.");
  });

  it("accepts matching owner token", () => {
    const dir = makeSessionDir();
    bindSessionOwner(dir, "owner-a");
    expect(() => assertSessionOwner(dir, "owner-a")).not.toThrow();
  });
});
