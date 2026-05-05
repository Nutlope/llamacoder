import { NextRequest, NextResponse } from "next/server";
import { POST as s3POST } from "next-s3-upload/route";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const cloned = req.clone();
  const body = await cloned.json().catch(() => null);

  if (!body || !ALLOWED_TYPES.has(body.filetype)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (typeof body.size === "number" && body.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  return s3POST(req);
}
