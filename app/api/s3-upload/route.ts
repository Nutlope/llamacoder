import { NextRequest, NextResponse } from "next/server";
import { ImageUploadError, parseImageUploadRequest } from "@/lib/image-upload";
import { createImageUploadPost } from "@/lib/s3-image-storage";

export async function POST(request: NextRequest) {
  try {
    const upload = parseImageUploadRequest(await request.json());
    const post = await createImageUploadPost(upload);
    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to create image upload:", error);
    return NextResponse.json(
      { error: "Failed to create image upload" },
      { status: 500 },
    );
  }
}
