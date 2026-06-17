export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_RATE_LIMIT_ATTEMPTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from "@/lib/import-limits";
import {
  expectedAuthToken,
  importAuthCookieOptions,
  IMPORT_AUTH_COOKIE,
  isImportEnabled,
  isImportProtected,
  verifyImportSecret,
} from "@/lib/import-auth";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!isImportEnabled()) {
    return NextResponse.json({ error: "Import is disabled." }, { status: 503 });
  }

  if (!isImportProtected()) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  const limit = checkRateLimit(`import-auth:${ip}`, AUTH_RATE_LIMIT_ATTEMPTS, AUTH_RATE_LIMIT_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  const body = (await request.json()) as { secret?: string };
  const secret = body.secret?.trim() ?? "";
  if (!secret || !verifyImportSecret(secret)) {
    return NextResponse.json({ error: "Invalid import password." }, { status: 401 });
  }

  const token = expectedAuthToken();
  if (!token) {
    return NextResponse.json({ error: "Import is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPORT_AUTH_COOKIE, token, importAuthCookieOptions());
  return response;
}
