import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/s3-upload/route";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload";
import { setUpS3TestEnv } from "@/lib/test/s3-env";

test.after(setUpS3TestEnv());

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

test("the upload signer creates a narrow conditional image PUT", async () => {
  const checksum = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const response = await requestUpload({
    filename: "screenshot.png",
    contentType: "image/png",
    size: 1_024,
    checksum,
  });
  const body = (await response.json()) as {
    key: string;
    url: string;
    headers: Record<string, string>;
    token?: unknown;
  };
  const url = new URL(body.url);

  assert.equal(response.status, 200);
  assert.match(body.key, /^next-s3-uploads\/uploads\/[0-9a-f-]+\.png$/);
  assert.equal(body.headers["Content-Type"], "image/png");
  assert.equal(
    body.headers["Content-Disposition"],
    'attachment; filename="upload.png"',
  );
  assert.equal(body.headers["Cache-Control"], "no-store, max-age=0");
  assert.equal(body.headers["If-None-Match"], "*");
  assert.equal(body.headers["x-amz-checksum-sha256"], checksum);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(url.searchParams.has("x-amz-checksum-sha256"), false);
  assert.equal(
    url.searchParams.get("X-Amz-SignedHeaders"),
    "cache-control;content-disposition;content-length;content-type;host;if-none-match;x-amz-checksum-sha256",
  );
  assert.equal(decodeURIComponent(url.pathname), `/${body.key}`);
  assert.equal(body.token, undefined);
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
