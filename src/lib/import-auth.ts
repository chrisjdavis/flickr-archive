import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IMPORT_AUTH_COOKIE_MAX_AGE } from "./import-limits";

export const IMPORT_AUTH_COOKIE = "flickr-archive-import";

type SessionPayload = {
  v: 1;
  exp: number;
  jti: string;
};

export function isImportProtected(): boolean {
  return Boolean(process.env.IMPORT_SECRET?.trim());
}

export function isImportExplicitlyDisabled(): boolean {
  const flag = process.env.IMPORT_ENABLED?.trim().toLowerCase();
  return flag === "false" || flag === "0" || flag === "no";
}

export function isImportExplicitlyEnabled(): boolean {
  const flag = process.env.IMPORT_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
}

export function isImportEnabled(): boolean {
  if (isImportExplicitlyDisabled()) return false;

  // Web import needs a persistent local disk — not available on Vercel serverless.
  if (process.env.VERCEL) return false;

  if (process.env.NODE_ENV === "production") {
    // Production is opt-in: require explicit enable + secret.
    return isImportExplicitlyEnabled() && isImportProtected();
  }

  // Local/dev: enabled unless explicitly disabled; password optional.
  return true;
}

function importSecret(): string | null {
  const secret = process.env.IMPORT_SECRET?.trim();
  return secret || null;
}

function signPayload(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/** Issue a short-lived signed import session cookie value. */
export function createImportSessionToken(): string | null {
  const secret = importSecret();
  if (!secret) return null;

  const payload: SessionPayload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + IMPORT_AUTH_COOKIE_MAX_AGE,
    jti: randomBytes(16).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Verify a signed session cookie; returns jti on success. */
export function verifyImportSessionToken(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const secret = importSecret();
  if (!secret) return null;

  const parts = cookieValue.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = signPayload(payloadB64, secret);
  try {
    const actual = Buffer.from(sig);
    const target = Buffer.from(expectedSig);
    if (actual.length !== target.length || !timingSafeEqual(actual, target)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SessionPayload;
    if (parsed.v !== 1 || typeof parsed.jti !== "string" || typeof parsed.exp !== "number") {
      return null;
    }
    if (!/^[a-f0-9]{32}$/.test(parsed.jti)) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.jti;
  } catch {
    return null;
  }
}

export function isImportAuthorized(cookieValue: string | undefined): boolean {
  if (!isImportProtected()) return true;
  return verifyImportSessionToken(cookieValue) !== null;
}

export function verifyImportSecret(submitted: string): boolean {
  const secret = importSecret();
  if (!secret) return true;

  try {
    const actual = Buffer.from(submitted);
    const target = Buffer.from(secret);
    return actual.length === target.length && timingSafeEqual(actual, target);
  } catch {
    return false;
  }
}

export async function hasImportAccess(): Promise<boolean> {
  if (!isImportEnabled()) return false;
  if (!isImportProtected()) return true;
  const cookieStore = await cookies();
  return isImportAuthorized(cookieStore.get(IMPORT_AUTH_COOKIE)?.value);
}

export async function shouldShowImportNav(): Promise<boolean> {
  return hasImportAccess();
}

export async function getImportOwnerToken(): Promise<string> {
  if (!isImportEnabled()) {
    throw new Error("Import is disabled.");
  }
  if (!isImportProtected()) return "local-dev";

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(IMPORT_AUTH_COOKIE)?.value;
  const jti = verifyImportSessionToken(cookieValue);
  if (!jti) {
    throw new Error("Unauthorized.");
  }
  return jti;
}

export function importAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPORT_AUTH_COOKIE_MAX_AGE,
  };
}

export async function denyImportUnlessAuthorized(): Promise<NextResponse | null> {
  if (!isImportEnabled()) {
    return NextResponse.json({ error: "Import is disabled." }, { status: 503 });
  }
  if (!isImportProtected()) return null;
  if (await hasImportAccess()) return null;
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
