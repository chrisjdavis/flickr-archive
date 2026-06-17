export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { denyImportUnlessAuthorized, getImportOwnerToken } from "@/lib/import-auth";
import {
  assertSessionOwner,
  cleanupUploadSession,
  getImportStatusResponse,
  getUploadSessionDir,
  listSessionZipCount,
  startImportJob,
  validateSessionId,
} from "@/lib/import-api";

export async function GET() {
  const denied = await denyImportUnlessAuthorized();
  if (denied) return denied;
  return NextResponse.json(getImportStatusResponse());
}

export async function POST(request: NextRequest) {
  const denied = await denyImportUnlessAuthorized();
  if (denied) return denied;

  try {
    const ownerToken = await getImportOwnerToken();
    const body = (await request.json()) as { sessionId?: string; force?: boolean };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    validateSessionId(sessionId);
    const uploadDir = getUploadSessionDir(sessionId);
    assertSessionOwner(uploadDir, ownerToken);
    const zipCount = listSessionZipCount(uploadDir);
    if (zipCount === 0) {
      return NextResponse.json({ error: "No ZIP files found in upload session." }, { status: 400 });
    }

    startImportJob(uploadDir, Boolean(body.force), true);
    return NextResponse.json({ started: true, filesSaved: zipCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed to start.";
    const status =
      message === "Unauthorized."
        ? 401
        : message.includes("already in progress")
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await denyImportUnlessAuthorized();
  if (denied) return denied;

  try {
    const ownerToken = await getImportOwnerToken();
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    cleanupUploadSession(sessionId, ownerToken);
    return NextResponse.json({ cleared: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to clear upload session.";
    const status = message === "Unauthorized." || message === "Invalid upload session." ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
