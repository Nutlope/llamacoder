import { NextResponse } from "next/server";
import { ImageUploadError } from "@/lib/image-upload";

export function imageUploadErrorResponse(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof ImageUploadError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error(`${fallbackMessage}:`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
