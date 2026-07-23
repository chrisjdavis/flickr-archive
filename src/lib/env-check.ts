import {
  isImportEnabled,
  isImportExplicitlyEnabled,
  isImportProtected,
} from "./import-auth";

let checked = false;

export function assertImportEnvironment(): void {
  if (checked) return;
  checked = true;

  if (
    process.env.NODE_ENV === "production" &&
    isImportExplicitlyEnabled() &&
    !isImportProtected()
  ) {
    throw new Error(
      "IMPORT_SECRET must be set when NODE_ENV=production and IMPORT_ENABLED=true. Omit IMPORT_ENABLED (or set false) to leave web import disabled."
    );
  }

  // isImportEnabled() already requires secret in production when enabled;
  // keep a belt-and-suspenders check for misconfigured starts.
  if (process.env.NODE_ENV === "production" && isImportEnabled() && !isImportProtected()) {
    throw new Error(
      "IMPORT_SECRET must be set when NODE_ENV=production and web import is enabled."
    );
  }
}
