import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { mock } from "node:test";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { POST } from "@/app/api/s3-upload/complete/route";
import { verifyValidatedImageToken } from "@/lib/image-upload-token";
import { setUpS3TestEnv } from "@/lib/test/s3-env";

test.after(setUpS3TestEnv());

test("completing an upload validates one S3 object without writing another", async () => {
  const bytes = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: "#2563eb",
    },
  })
    .png()
    .toBuffer();
  const checksum = createHash("sha256").update(bytes).digest("base64");
  const etag = '"f817a89f6f4f0b1fdfe5d2f131e73d9f"';
  const commands: unknown[] = [];

  mock.method(S3Client.prototype, "send", async (command: unknown) => {
    commands.push(command);
    assert.ok(command instanceof GetObjectCommand);
    return {
      Body: {
        transformToByteArray: async () => bytes,
      },
      ContentLength: bytes.length,
      ContentType: "image/png",
      ContentDisposition: 'attachment; filename="upload.png"',
      ChecksumSHA256: checksum,
      ETag: etag,
    };
  });

  const response = await POST(
    new NextRequest("http://localhost/api/s3-upload/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
      }),
    }),
  );
  const body = (await response.json()) as { token: string };
  const token = verifyValidatedImageToken(body.token);

  assert.equal(response.status, 200);
  assert.equal(commands.length, 1);
  assert.equal(
    token.key,
    "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
  );
  assert.equal(token.checksum, checksum);
  assert.equal(token.etag, etag);
  assert.equal(token.size, bytes.length);

  mock.restoreAll();
});
