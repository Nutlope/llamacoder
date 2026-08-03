import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  IMAGE_UPLOAD_EXPIRY_SECONDS,
  createUploadedImageKey,
  imageContentDisposition,
  type ImageUploadRequest,
} from "@/lib/image-upload";
import { ImageUploadError } from "@/lib/image-upload";
import { verifyValidatedImageToken } from "@/lib/image-upload-token";
import { getS3 } from "@/lib/s3";

const UPLOAD_CACHE_CONTROL = "no-store, max-age=0";
const DOWNLOAD_URL_EXPIRY_SECONDS = 10 * 60;

export async function createImageUploadUrl(request: ImageUploadRequest) {
  const { bucket, client } = getS3();
  const key = createUploadedImageKey(request.contentType);
  const contentDisposition = imageContentDisposition(request.contentType);

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: request.contentType,
      ContentDisposition: contentDisposition,
      CacheControl: UPLOAD_CACHE_CONTROL,
      ContentLength: request.size,
      ChecksumSHA256: request.checksum,
      IfNoneMatch: "*",
    }),
    {
      expiresIn: IMAGE_UPLOAD_EXPIRY_SECONDS,
      signableHeaders: new Set(["cache-control", "content-type"]),
      unhoistableHeaders: new Set(["x-amz-checksum-sha256"]),
    },
  );

  return {
    url,
    key,
    headers: {
      "Content-Type": request.contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": UPLOAD_CACHE_CONTROL,
      "If-None-Match": "*",
      "x-amz-checksum-sha256": request.checksum,
    },
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
