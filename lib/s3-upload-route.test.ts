import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/s3-upload/route";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload";

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

test("the upload signer rejects SVG files", async () => {
  const response = await requestUpload({
    filename: "coffin.svg",
    contentType: "image/svg+xml",
    filetype: "image/svg+xml",
    size: 1_024,
    _nextS3: { strategy: "presigned" },
  });

  assert.equal(response.status, 415);
});

test("the upload signer rejects oversized images", async () => {
  const response = await requestUpload({
    filename: "large.png",
    contentType: "image/png",
    size: MAX_IMAGE_UPLOAD_BYTES + 1,
  });

  assert.equal(response.status, 413);
});

test("the upload signer rejects a filename that conflicts with its MIME type", async () => {
  const response = await requestUpload({
    filename: "coffin.svg",
    contentType: "image/png",
    size: 1_024,
  });

  assert.equal(response.status, 415);
});

test("the upload signer creates a narrow image-only S3 POST policy", async () => {
  const checksum = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const response = await requestUpload({
    filename: "screenshot.png",
    contentType: "image/png",
    size: 1_024,
    checksum,
  });
  const body = (await response.json()) as {
    key: string;
    fields: Record<string, string>;
    token?: unknown;
  };

  assert.equal(response.status, 200);
  assert.match(body.key, /^next-s3-uploads\/uploads\/[0-9a-f-]+\.png$/);
  assert.equal(body.fields["Content-Type"], "image/png");
  assert.equal(
    body.fields["Content-Disposition"],
    'attachment; filename="upload.png"',
  );
  assert.equal(body.fields["x-amz-checksum-algorithm"], "SHA256");
  assert.equal(body.fields["x-amz-checksum-sha256"], checksum);
  assert.equal(body.token, undefined);

  const policy = JSON.parse(
    Buffer.from(body.fields.Policy, "base64").toString("utf8"),
  ) as {
    conditions: unknown[];
  };

  assert.deepEqual(
    policy.conditions.find(
      (condition) =>
        Array.isArray(condition) && condition[0] === "content-length-range",
    ),
    ["content-length-range", 1, MAX_IMAGE_UPLOAD_BYTES],
  );
  assert.ok(
    policy.conditions.some(
      (condition) =>
        Array.isArray(condition) &&
        condition[0] === "eq" &&
        condition[1] === "$Content-Type" &&
        condition[2] === "image/png",
    ),
  );
  assert.ok(
    policy.conditions.some(
      (condition) =>
        typeof condition === "object" &&
        condition !== null &&
        "x-amz-checksum-sha256" in condition &&
        condition["x-amz-checksum-sha256"] === checksum,
    ),
  );
});

async function requestUpload(body: Record<string, unknown>) {
  return POST(
    new NextRequest("http://localhost/api/s3-upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
