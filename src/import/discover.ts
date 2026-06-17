import fs from "node:fs";
import path from "node:path";

export type DiscoveredExport = {
  metadataZip: string;
  dataZips: string[];
};

export function discoverExport(inputDir: string): DiscoveredExport {
  if (!fs.existsSync(inputDir)) {
    throw new Error(`Input directory not found: ${inputDir}`);
  }

  const entries = fs.readdirSync(inputDir);
  const zips = entries
    .filter((f) => f.toLowerCase().endsWith(".zip"))
    .map((f) => path.join(inputDir, f));

  const metadataZip = zips.find((z) => /_part\d+\.zip$/i.test(path.basename(z)));
  const dataZips = zips
    .filter((z) => /^data-download-\d+\.zip$/i.test(path.basename(z)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!metadataZip) {
    throw new Error(
      `No metadata zip (*_part1.zip) found in ${inputDir}. Expected Flickr metadata export.`
    );
  }

  if (dataZips.length === 0) {
    throw new Error(
      `No data-download-*.zip files found in ${inputDir}. Expected Flickr photo export.`
    );
  }

  return { metadataZip, dataZips };
}

export function discoverExtractedExport(inputDir: string): {
  metadataDir: string;
  mediaDir: string;
} | null {
  const metadataDir = path.join(inputDir, "metadata");
  const mediaDir = path.join(inputDir, "media");
  if (
    fs.existsSync(metadataDir) &&
    fs.existsSync(path.join(metadataDir, "account_profile.json")) &&
    fs.existsSync(mediaDir)
  ) {
    return { metadataDir, mediaDir };
  }
  return null;
}
