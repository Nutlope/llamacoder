import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IMAGE_UPLOAD_EXPIRY_SECONDS,
  MAX_IMAGE_UPLOAD_BYTES,
  createUploadedImageKey,
  imageContentDisposition,
  type ImageUploadRequest,
} from "@/lib/image-upload";
import { ImageUploadError } from "@/lib/image-upload";
import { verifyValidatedImageToken } from "@/lib/image-upload-token";
import { getS3 } from "@/lib/s3";

const UPLOAD_CACHE_CONTROL = "no-store, max-age=0";
const DOWNLOAD_URL_EXPIRY_SECONDS = 10 * 60;

export async function createImageUploadPost(request: ImageUploadRequest) {
  const { bucket, client } = getS3();
  const key = createUploadedImageKey(request.contentType);
  const contentDisposition = imageContentDisposition(request.contentType);

  const post = await createPresignedPost(client, {
    Bucket: bucket,
    Key: key,
    Expires: IMAGE_UPLOAD_EXPIRY_SECONDS,
    Fields: {
      "Content-Type": request.contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": UPLOAD_CACHE_CONTROL,
      "x-amz-checksum-algorithm": "SHA256",
      "x-amz-checksum-sha256": request.checksum,
    },
    Conditions: [
      ["eq", "$Content-Type", request.contentType],
      ["eq", "$Content-Disposition", contentDisposition],
      ["eq", "$Cache-Control", UPLOAD_CACHE_CONTROL],
      ["eq", "$x-amz-checksum-algorithm", "SHA256"],
      ["eq", "$x-amz-checksum-sha256", request.checksum],
      ["content-length-range", 1, MAX_IMAGE_UPLOAD_BYTES],
    ],
  });

  return {
    ...post,
    key,
  };
}

export async function createValidatedImageDownloadUrl(token: unknown) {
  const image = verifyValidatedImageToken(token);
  const { bucket, client } = getS3();
  const object = await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: image.key,
      ChecksumMode: "ENABLED",
    }),
  );

  if (
    object.ContentLength !== image.size ||
    object.ContentType !== image.contentType ||
    object.ContentDisposition !== imageContentDisposition(image.contentType) ||
    object.ChecksumSHA256 !== image.checksum ||
    object.ETag !== image.etag
  ) {
    throw new ImageUploadError("Screenshot upload changed", 400);
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: image.key,
      ResponseContentType: image.contentType,
      ResponseContentDisposition: imageContentDisposition(image.contentType),
      ResponseCacheControl: UPLOAD_CACHE_CONTROL,
    }),
    { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS },
  );
}
