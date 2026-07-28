import { NextRequest, NextResponse } from "next/server";
import { ImageUploadError } from "@/lib/image-upload";
import { validateUploadedImage } from "@/lib/image-verification";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
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
    if (error instanceof ImageUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to verify image upload:", error);
    return NextResponse.json(
      { error: "Failed to verify image upload" },
      { status: 500 },
    );
  }
}
