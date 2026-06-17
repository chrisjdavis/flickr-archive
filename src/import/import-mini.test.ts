import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";

const projectRoot = path.resolve(__dirname, "../..");
const testArchive = path.join(projectRoot, ".test-archive");
const fixtureDir = path.join(projectRoot, "fixtures/mini-export");

describe("mini export import", () => {
  beforeAll(() => {
    if (fs.existsSync(testArchive)) {
      fs.rmSync(testArchive, { recursive: true, force: true });
    }
    execSync(`npx tsx scripts/import.ts "${fixtureDir}" --output "${testArchive}" --force`, {
      cwd: projectRoot,
      stdio: "pipe",
    });
  });

  afterAll(() => {
    if (fs.existsSync(testArchive)) {
      fs.rmSync(testArchive, { recursive: true, force: true });
    }
  });

  it("imports photos, albums, and FTS index", () => {
    const db = new Database(path.join(testArchive, "index.sqlite"), { readonly: true });

    const photoCount = (db.prepare("SELECT COUNT(*) as c FROM photos").get() as { c: number }).c;
    expect(photoCount).toBe(2);

    const albumCount = (db.prepare("SELECT COUNT(*) as c FROM albums").get() as { c: number }).c;
    expect(albumCount).toBe(1);

    const comments = (db.prepare("SELECT COUNT(*) as c FROM comments").get() as { c: number }).c;
    expect(comments).toBe(1);

    const search = db
      .prepare(
        `SELECT p.id FROM photos p
         INNER JOIN photos_fts fts ON fts.photo_id = p.id
         WHERE photos_fts MATCH '"cms"*'`
      )
      .all() as { id: string }[];
    expect(search.map((r) => r.id)).toContain("100000001");

    db.close();
  });
});
