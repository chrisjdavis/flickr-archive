/** Max size of a single uploaded ZIP (2 GiB). */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Max ZIP files per upload session. */
export const MAX_SESSION_FILES = 50;

/** Max total bytes stored in one upload session (10 GiB). */
export const MAX_SESSION_BYTES = 10 * 1024 * 1024 * 1024;

/** Max entries extracted from ZIP archives during import. */
export const MAX_ZIP_ENTRIES = 100_000;

/** Max cumulative uncompressed bytes extracted from ZIP archives. */
export const MAX_ZIP_UNCOMPRESSED_BYTES = 50 * 1024 * 1024 * 1024;

/** Sharp input pixel limit (~16384²). */
export const MAX_SHARP_PIXELS = 268_402_689;

/** Max decoded image dimension passed to Sharp. */
export const MAX_IMAGE_DIMENSION = 16_384;

export const AUTH_RATE_LIMIT_ATTEMPTS = 8;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Import auth cookie lifetime (7 days). */
export const IMPORT_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
