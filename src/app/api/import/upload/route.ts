export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { isImportRunning } from "@/import/import-state";
import { denyImportUnlessAuthorized, getImportOwnerToken } from "@/lib/import-auth";
import { ensureUploadSession, saveSingleZip } from "@/lib/import-api";

export async function POST(request: NextRequest) {
  const denied = await denyImportUnlessAuthorized();
  if (denied) return denied;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Upload a ZIP file as multipart form data." }, { status: 415 });
    }

    if (isImportRunning()) {
      return NextResponse.json({ error: "An import is already in progress." }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const sessionId = formData.get("sessionId")?.toString() ?? null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const ownerToken = await getImportOwnerToken();
    const session = ensureUploadSession(sessionId, ownerToken);
    const filename = await saveSingleZip(file, session.dir, ownerToken);

    return NextResponse.json({
      sessionId: session.sessionId,
      filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
