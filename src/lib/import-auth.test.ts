import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createImportSessionToken,
  isImportAuthorized,
  isImportEnabled,
  isImportExplicitlyEnabled,
  verifyImportSessionToken,
} from "./import-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isImportEnabled", () => {
  it("is enabled in non-production when unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("IMPORT_ENABLED", "");
    vi.stubEnv("IMPORT_SECRET", "");
    delete process.env.IMPORT_ENABLED;
    delete process.env.IMPORT_SECRET;
    expect(isImportEnabled()).toBe(true);
  });

  it("respects explicit disable in non-production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("IMPORT_ENABLED", "false");
    expect(isImportEnabled()).toBe(false);
  });

  it("is disabled in production when IMPORT_ENABLED is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IMPORT_SECRET", "s3cret-value");
    delete process.env.IMPORT_ENABLED;
    expect(isImportEnabled()).toBe(false);
    expect(isImportExplicitlyEnabled()).toBe(false);
  });

  it("requires both explicit enable and secret in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("IMPORT_ENABLED", "true");
    delete process.env.IMPORT_SECRET;
    expect(isImportEnabled()).toBe(false);

    vi.stubEnv("IMPORT_SECRET", "s3cret-value");
    expect(isImportEnabled()).toBe(true);
  });

  it("is always disabled on Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("IMPORT_ENABLED", "true");
    vi.stubEnv("IMPORT_SECRET", "s3cret-value");
    expect(isImportEnabled()).toBe(false);
  });
});

describe("signed import sessions", () => {
  it("issues unique verifiable tokens with jti", () => {
    vi.stubEnv("IMPORT_SECRET", "test-import-secret");
    const a = createImportSessionToken();
    const b = createImportSessionToken();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);

    const jtiA = verifyImportSessionToken(a!);
    const jtiB = verifyImportSessionToken(b!);
    expect(jtiA).toMatch(/^[a-f0-9]{32}$/);
    expect(jtiB).toMatch(/^[a-f0-9]{32}$/);
    expect(jtiA).not.toBe(jtiB);
    expect(isImportAuthorized(a!)).toBe(true);
  });

  it("rejects tampered or unsigned cookies", () => {
    vi.stubEnv("IMPORT_SECRET", "test-import-secret");
    const token = createImportSessionToken()!;
    const [payload] = token.split(".");
    expect(verifyImportSessionToken(`${payload}.deadbeef`)).toBeNull();
    expect(verifyImportSessionToken("not-a-token")).toBeNull();
    expect(verifyImportSessionToken(undefined)).toBeNull();
  });

  it("rejects expired sessions", () => {
    vi.stubEnv("IMPORT_SECRET", "test-import-secret");
    const payload = Buffer.from(
      JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) - 10, jti: "a".repeat(32) }),
      "utf8"
    ).toString("base64url");
    const sig = createHmac("sha256", "test-import-secret").update(payload).digest("base64url");
    expect(verifyImportSessionToken(`${payload}.${sig}`)).toBeNull();
  });
});
