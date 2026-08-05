import { createHash } from "node:crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import {
  ImageUploadError,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_UPLOAD_BYTES,
  getImageTypeSpec,
  imageContentDisposition,
  parseUploadedImageKey,
  type SupportedImageType,
} from "@/lib/image-upload";
import { createValidatedImageToken } from "@/lib/image-upload-token";
import { getS3 } from "@/lib/s3";

export async function validateUploadedImage(key: unknown) {
  const { contentType, key: uploadedKey } = parseUploadedImageKey(key);
  const { bucket, client } = getS3();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: uploadedKey,
      ChecksumMode: "ENABLED",
    }),
  );

  if (!object.Body) {
    throw new ImageUploadError("The uploaded image is missing", 400);
  }

  if (
    object.ContentLength === undefined ||
    object.ContentLength < 1 ||
    object.ContentLength > MAX_IMAGE_UPLOAD_BYTES
  ) {
    throw new ImageUploadError("The uploaded image has an invalid size", 413);
  }

  if (
    object.ContentType !== contentType ||
    object.ContentDisposition !== imageContentDisposition(contentType)
  ) {
    throw new ImageUploadError("The uploaded image metadata is invalid", 415);
  }

  const bytes = Buffer.from(await object.Body.transformToByteArray());
  if (bytes.length !== object.ContentLength) {
    throw new ImageUploadError("The uploaded image has an invalid size", 413);
  }

  const checksum = createHash("sha256").update(bytes).digest("base64");
  if (object.ChecksumSHA256 !== checksum) {
    throw new ImageUploadError("The uploaded image checksum is invalid", 400);
  }

  if (!object.ETag) {
    throw new ImageUploadError("The uploaded image identity is missing", 400);
  }

  await validateImage(bytes, contentType);

  return {
    token: createValidatedImageToken({
      key: uploadedKey,
      contentType,
      checksum,
      etag: object.ETag,
      size: bytes.length,
    }),
  };
}

export async function validateImage(
  bytes: Buffer,
  contentType: SupportedImageType,
): Promise<{ width: number; height: number }> {
  const spec = getImageTypeSpec(contentType);

  try {
    const input = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    const metadata = await input.metadata();

    if (
      metadata.format !== spec.sharpFormat ||
      !metadata.width ||
      !metadata.height ||
      metadata.pages !== undefined ||
      metadata.width > MAX_IMAGE_DIMENSION ||
      metadata.height > MAX_IMAGE_DIMENSION ||
      metadata.width * metadata.height > MAX_IMAGE_PIXELS
    ) {
      throw new ImageUploadError(
        "The uploaded file is not a supported image",
        415,
      );
    }

    await input.stats();

    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    if (error instanceof ImageUploadError) {
      throw error;
    }
    throw new ImageUploadError("The uploaded file is not a valid image", 415);
  }
}
