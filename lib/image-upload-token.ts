import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ImageUploadError,
  MAX_IMAGE_UPLOAD_BYTES,
  parseUploadedImageKey,
  type SupportedImageType,
} from "@/lib/image-upload";

const VALIDATED_IMAGE_TOKEN_TTL_SECONDS = 30 * 60;

export type ValidatedImage = {
  key: string;
  contentType: SupportedImageType;
  checksum: string;
  etag: string;
  size: number;
};

export type ValidatedImageTokenPayload = ValidatedImage & {
  expiresAt: number;
};

export function createValidatedImageToken(
  image: ValidatedImage,
  nowSeconds = Math.floor(Date.now() / 1_000),
) {
  assertValidatedImage(image);

  const payload: ValidatedImageTokenPayload = {
    ...image,
    expiresAt: nowSeconds + VALIDATED_IMAGE_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyValidatedImageToken(
  token: unknown,
  nowSeconds = Math.floor(Date.now() / 1_000),
): ValidatedImageTokenPayload {
  if (typeof token !== "string" || token.length > 2_048) {
    throw invalidToken();
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw invalidToken();
  }

  const [encodedPayload, suppliedSignature] = parts;
  const expectedSignature = sign(encodedPayload);
  const suppliedBytes = Buffer.from(suppliedSignature, "base64url");
  const expectedBytes = Buffer.from(expectedSignature, "base64url");

  if (
    suppliedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    throw invalidToken();
  }

  let payload: unknown;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    throw invalidToken();
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("expiresAt" in payload) ||
    typeof payload.expiresAt !== "number" ||
    !Number.isSafeInteger(payload.expiresAt)
  ) {
    throw invalidToken();
  }

  assertValidatedImage(payload);

  if (payload.expiresAt < nowSeconds) {
    throw new ImageUploadError("Screenshot upload expired", 400);
  }

  return payload as ValidatedImageTokenPayload;
}

function assertValidatedImage(input: unknown): asserts input is ValidatedImage {
  if (
    typeof input !== "object" ||
    input === null ||
    !("key" in input) ||
    !("contentType" in input) ||
    !("checksum" in input) ||
    !("etag" in input) ||
    !("size" in input) ||
    typeof input.key !== "string" ||
    typeof input.contentType !== "string" ||
    typeof input.checksum !== "string" ||
    typeof input.etag !== "string" ||
    typeof input.size !== "number" ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > MAX_IMAGE_UPLOAD_BYTES ||
    !/^[A-Za-z0-9+/]{43}=$/.test(input.checksum) ||
    input.etag.length < 3 ||
    input.etag.length > 128
  ) {
    throw invalidToken();
  }

  const parsedKey = parseUploadedImageKey(input.key);
  if (
    parsedKey.key !== input.key ||
    parsedKey.contentType !== input.contentType
  ) {
    throw invalidToken();
  }
}

function sign(payload: string) {
  const rootSecret = process.env.IMAGE_UPLOAD_TOKEN_SECRET;
  const s3Secret = process.env.S3_UPLOAD_SECRET;
  const secret = rootSecret || s3Secret;

  if (!secret) {
    throw new Error("Missing image upload token configuration");
  }

  const signingKey = createHmac("sha256", secret)
    .update("llamacoder:image-upload-token:v1")
    .digest();

  return createHmac("sha256", signingKey).update(payload).digest("base64url");
}

function invalidToken() {
  return new ImageUploadError("Invalid screenshot token", 400);
}
