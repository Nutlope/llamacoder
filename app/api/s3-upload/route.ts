import { NextRequest, NextResponse } from "next/server";
import { parseImageUploadRequest } from "@/lib/image-upload";
import { imageUploadErrorResponse } from "@/lib/image-upload-route";
import { createImageUploadUrl } from "@/lib/s3-image-storage";

export async function POST(request: NextRequest) {
  try {
    const upload = parseImageUploadRequest(await request.json());
    const signedUpload = await createImageUploadUrl(upload);
    return NextResponse.json(signedUpload);
  } catch (error) {
    return imageUploadErrorResponse(error, "Failed to create image upload");
  }
}
