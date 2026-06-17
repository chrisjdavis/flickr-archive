import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePhotoJsonFile } from "./parse-photo";

const fixturePhoto = path.resolve(
  __dirname,
  "../../fixtures/mini-export/metadata/photo_100000001.json"
);

describe("parsePhotoJsonFile", () => {
  it("parses Flickr photo JSON with comments and tags", () => {
    const photo = parsePhotoJsonFile(fixturePhoto);

    expect(photo.id).toBe("100000001");
    expect(photo.name).toBe("First Photo");
    expect(photo.comments).toHaveLength(1);
    expect(photo.comments?.[0]?.comment).toBe("Nice shot!");
    expect(photo.tags?.map((t) => t.tag)).toEqual(["test", "cms"]);
  });

  it("parses real Flickr export sample shape", () => {
    const sample = {
      id: "102713493",
      name: "Daily Screenshot",
      description: "Some description",
      count_views: "269",
      count_comments: "9",
      date_taken: "2006-02-21 15:04:21",
      comments: [{ id: "1", comment: "Hello" }],
      tags: [{ tag: "cms" }],
    };

    fs.writeFileSync(path.join(__dirname, ".tmp-photo.json"), JSON.stringify(sample));
    const photo = parsePhotoJsonFile(path.join(__dirname, ".tmp-photo.json"));
    fs.unlinkSync(path.join(__dirname, ".tmp-photo.json"));

    expect(photo.id).toBe("102713493");
    expect(photo.name).toBe("Daily Screenshot");
  });
});
