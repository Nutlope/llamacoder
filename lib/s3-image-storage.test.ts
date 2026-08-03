import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createValidatedImageToken } from "@/lib/image-upload-token";
import { createValidatedImageDownloadUrl } from "@/lib/s3-image-storage";
import { setUpS3TestEnv } from "@/lib/test/s3-env";

test.after(setUpS3TestEnv());

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
