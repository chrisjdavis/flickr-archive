export const runtime = "nodejs";

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { isSafeArchiveFile, resolveArchiveFile } from "@/lib/media";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const segments = (await context.params).path;
  if (!segments || segments.length < 2) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const [kind, ...rest] = segments;
  if (kind !== "media" && kind !== "thumbs") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const filename = rest.map((segment) => decodeURIComponent(segment)).join("/");
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = resolveArchiveFile(kind, filename);
  if (!filePath || !isSafeArchiveFile(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext];
  const stat = fs.statSync(filePath);
  const stream = Readable.toWeb(fs.createReadStream(filePath)) as ReadableStream;

  const headers: Record<string, string> = {
    "Content-Length": String(stat.size),
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (contentType) {
    headers["Content-Type"] = contentType;
  } else {
    headers["Content-Type"] = "application/octet-stream";
    headers["Content-Disposition"] = `attachment; filename="${path.basename(filePath)}"`;
    headers["X-Content-Type-Options"] = "nosniff";
  }

  return new NextResponse(stream, { headers });
}
