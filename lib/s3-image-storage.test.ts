import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createValidatedImageToken } from "@/lib/image-upload-token";
import { createValidatedImageDownloadUrl } from "@/lib/s3-image-storage";

const originalEnv = {
  key: process.env.S3_UPLOAD_KEY,
  secret: process.env.S3_UPLOAD_SECRET,
  bucket: process.env.S3_UPLOAD_BUCKET,
  region: process.env.S3_UPLOAD_REGION,
};

process.env.S3_UPLOAD_KEY = "test-access-key";
process.env.S3_UPLOAD_SECRET = "test-secret-key";
process.env.S3_UPLOAD_BUCKET = "test-bucket";
process.env.S3_UPLOAD_REGION = "us-east-1";

test.after(() => {
  restoreEnv("S3_UPLOAD_KEY", originalEnv.key);
  restoreEnv("S3_UPLOAD_SECRET", originalEnv.secret);
  restoreEnv("S3_UPLOAD_BUCKET", originalEnv.bucket);
  restoreEnv("S3_UPLOAD_REGION", originalEnv.region);
});

test.afterEach(() => {
  mock.restoreAll();
});

test("a validated image token creates a signed URL for the unchanged object", async () => {
  const image = {
    key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
    contentType: "image/png" as const,
    checksum: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    etag: '"f817a89f6f4f0b1fdfe5d2f131e73d9f"',
    size: 1_024,
  };
  const token = createValidatedImageToken(image);
  const commands: unknown[] = [];

  mock.method(S3Client.prototype, "send", async (command: unknown) => {
    commands.push(command);
    assert.ok(command instanceof HeadObjectCommand);
    return {
      ContentLength: image.size,
      ContentType: image.contentType,
      ContentDisposition: 'attachment; filename="upload.png"',
      ChecksumSHA256: image.checksum,
      ETag: image.etag,
    };
  });

  const url = new URL(await createValidatedImageDownloadUrl(token));

  assert.equal(commands.length, 1);
  assert.equal(
    decodeURIComponent(url.pathname),
    "/next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
  );
  assert.equal(url.searchParams.get("response-content-type"), "image/png");
  assert.equal(
    url.searchParams.get("response-content-disposition"),
    'attachment; filename="upload.png"',
  );
  assert.ok(url.searchParams.has("X-Amz-Signature"));
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
