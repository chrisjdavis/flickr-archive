import { isImportEnabled, isImportProtected } from "./import-auth";

let checked = false;

export function assertImportEnvironment(): void {
  if (checked) return;
  checked = true;

  if (process.env.NODE_ENV === "production" && isImportEnabled() && !isImportProtected()) {
    throw new Error(
      "IMPORT_SECRET must be set when NODE_ENV=production and web import is enabled. Set IMPORT_ENABLED=false to disable import entirely."
    );
  }
}
