import assert from "node:assert/strict";
import test from "node:test";
import { ImageUploadError } from "@/lib/image-upload";
import {
  createValidatedImageToken,
  verifyValidatedImageToken,
} from "@/lib/image-upload-token";

const TOKEN_SECRET = "test-image-upload-token-secret-0123456789";
const originalEnv = {
  IMAGE_UPLOAD_TOKEN_SECRET: process.env.IMAGE_UPLOAD_TOKEN_SECRET,
  S3_UPLOAD_SECRET: process.env.S3_UPLOAD_SECRET,
};
process.env.IMAGE_UPLOAD_TOKEN_SECRET = TOKEN_SECRET;
process.env.S3_UPLOAD_SECRET = "test-upload-secret";

test.after(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

const image = {
  key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
  contentType: "image/png" as const,
  checksum: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  etag: '"d41d8cd98f00b204e9800998ecf8427e"',
  size: 1_024,
};

test("a validated image token preserves the verified object identity", () => {
  const token = createValidatedImageToken(image, 1_000);

  assert.deepEqual(verifyValidatedImageToken(token, 1_001), {
    ...image,
    expiresAt: 2_800,
  });
});

test("a modified validated image token is rejected", () => {
  const token = createValidatedImageToken(image, 1_000);
  const modified = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

  assert.throws(
    () => verifyValidatedImageToken(modified, 1_001),
    (error: unknown) =>
      error instanceof ImageUploadError &&
      error.status === 400 &&
      error.message === "Invalid screenshot token",
  );
});

test("tokens are not signed without a dedicated secret", () => {
  delete process.env.IMAGE_UPLOAD_TOKEN_SECRET;
  try {
    assert.throws(
      () => createValidatedImageToken(image, 1_000),
      /IMAGE_UPLOAD_TOKEN_SECRET must be set/,
    );
  } finally {
    process.env.IMAGE_UPLOAD_TOKEN_SECRET = TOKEN_SECRET;
  }
});

test("the S3 secret is never reused as the token secret", () => {
  process.env.IMAGE_UPLOAD_TOKEN_SECRET = "s".repeat(40);
  process.env.S3_UPLOAD_SECRET = "s".repeat(40);
  try {
    assert.throws(
      () => createValidatedImageToken(image, 1_000),
      /must differ from S3_UPLOAD_SECRET/,
    );
  } finally {
    process.env.IMAGE_UPLOAD_TOKEN_SECRET = TOKEN_SECRET;
    process.env.S3_UPLOAD_SECRET = "test-upload-secret";
  }
});

test("an expired validated image token is rejected", () => {
  const token = createValidatedImageToken(image, 1_000);

  assert.throws(
    () => verifyValidatedImageToken(token, 2_801),
    (error: unknown) =>
      error instanceof ImageUploadError &&
      error.status === 400 &&
      error.message === "Screenshot upload expired",
  );
});
