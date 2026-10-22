import { NextRequest, NextResponse } from "next/server";
import { ImageUploadError } from "@/lib/image-upload";
import { imageUploadErrorResponse } from "@/lib/image-upload-route";
import { validateUploadedImage } from "@/lib/image-verification";
import { enforceRateLimit } from "@/lib/server-rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit(
    "imageUploadComplete",
    request.headers,
  );
  if (limited) return limited;

  try {
    const body: unknown = await request.json().catch(() => null);
    const key =
      typeof body === "object" &&
      body !== null &&
      "key" in body &&
      typeof body.key === "string"
        ? body.key
        : null;

    if (!key) {
      throw new ImageUploadError("Invalid upload key", 400);
    }

    const image = await validateUploadedImage(key);
    return NextResponse.json(image);
  } catch (error) {
    return imageUploadErrorResponse(error, "Failed to verify image upload");
  }
}
