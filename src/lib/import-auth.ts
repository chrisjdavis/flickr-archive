import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { IMPORT_AUTH_COOKIE_MAX_AGE } from "./import-limits";

export const IMPORT_AUTH_COOKIE = "flickr-archive-import";

export function isImportProtected(): boolean {
  return Boolean(process.env.IMPORT_SECRET?.trim());
}

export function isImportExplicitlyDisabled(): boolean {
  const flag = process.env.IMPORT_ENABLED?.trim().toLowerCase();
  return flag === "false" || flag === "0" || flag === "no";
}

export function isImportEnabled(): boolean {
  if (isImportExplicitlyDisabled()) return false;
  if (process.env.NODE_ENV === "production" && !isImportProtected()) {
    return false;
  }
  return true;
}

export function expectedAuthToken(): string | null {
  const secret = process.env.IMPORT_SECRET?.trim();
  if (!secret) return null;
  return createHash("sha256").update(`${secret}:import-access`).digest("hex");
}

export function isImportAuthorized(cookieValue: string | undefined): boolean {
  if (!isImportProtected()) return true;

  const expected = expectedAuthToken();
  if (!expected || !cookieValue) return false;

  try {
    const actual = Buffer.from(cookieValue, "hex");
    const target = Buffer.from(expected, "hex");
    return actual.length === target.length && timingSafeEqual(actual, target);
  } catch {
    return false;
  }
}

export function verifyImportSecret(submitted: string): boolean {
  const secret = process.env.IMPORT_SECRET?.trim();
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
  if (!isImportAuthorized(cookieValue)) {
    throw new Error("Unauthorized.");
  }

  const token = expectedAuthToken();
  if (!token) throw new Error("Import is not configured.");
  return token;
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
