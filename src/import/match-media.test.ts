import { describe, expect, it } from "vitest";
import { buildMediaIndex, matchPhotoToMedia } from "./match-media";
import { extractPhotoIdFromFilename } from "../lib/types";

describe("extractPhotoIdFromFilename", () => {
  it("extracts ID from Flickr original filename", () => {
    expect(extractPhotoIdFromFilename("this-is-my-favorite-hat_129630808_o.jpg")).toBe("129630808");
    expect(extractPhotoIdFromFilename("daily-screenshot_102713493_o.png")).toBe("102713493");
    expect(extractPhotoIdFromFilename("11403803314_3bfe0f8a1d_o.jpg")).toBe("11403803314");
    expect(extractPhotoIdFromFilename("jakob--alexander_12438759944.mov")).toBe("12438759944");
  });

  it("returns null for non-matching filenames", () => {
    expect(extractPhotoIdFromFilename("random-file.jpg")).toBeNull();
    expect(extractPhotoIdFromFilename("photo_123.json")).toBeNull();
  });
});

describe("buildMediaIndex", () => {
  it("indexes media files by photo ID", () => {
    const index = buildMediaIndex([
      "hat_129630808_o.jpg",
      "screenshot_102713493_o.png",
    ]);

    expect(matchPhotoToMedia("129630808", index)).toBe("hat_129630808_o.jpg");
    expect(matchPhotoToMedia("102713493", index)).toBe("screenshot_102713493_o.png");
    expect(matchPhotoToMedia("999", index)).toBeNull();
  });
});
