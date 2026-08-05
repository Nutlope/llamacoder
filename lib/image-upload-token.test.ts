import assert from "node:assert/strict";
import test from "node:test";
import { ImageUploadError } from "@/lib/image-upload";
import {
  createValidatedImageToken,
  verifyValidatedImageToken,
} from "@/lib/image-upload-token";

const originalUploadSecret = process.env.S3_UPLOAD_SECRET;
process.env.S3_UPLOAD_SECRET = "test-upload-secret";

test.after(() => {
  if (originalUploadSecret === undefined) {
    delete process.env.S3_UPLOAD_SECRET;
  } else {
    process.env.S3_UPLOAD_SECRET = originalUploadSecret;
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
