import { NextRequest, NextResponse } from "next/server";
import { parseImageUploadRequest } from "@/lib/image-upload";
import { imageUploadErrorResponse } from "@/lib/image-upload-route";
import { createImageUploadUrl } from "@/lib/s3-image-storage";
import { enforceRateLimit } from "@/lib/server-rate-limit";

export async function POST(request: NextRequest) {
  const limited = await enforceRateLimit("imageUpload", request.headers);
  if (limited) return limited;

  try {
    const upload = parseImageUploadRequest(
      await request.json().catch(() => null),
    );
    const signedUpload = await createImageUploadUrl(upload);
    return NextResponse.json(signedUpload);
  } catch (error) {
    return imageUploadErrorResponse(error, "Failed to create image upload");
  }
}
