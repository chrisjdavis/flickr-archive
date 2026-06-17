import fs from "node:fs";
import path from "node:path";
import { flickrAccountSchema } from "../lib/types";
import type { FlickrAccount } from "../lib/types";

export function parseAccount(metadataDir: string): FlickrAccount {
  const filePath = path.join(metadataDir, "account_profile.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`account_profile.json not found in ${metadataDir}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return flickrAccountSchema.parse(raw);
}
