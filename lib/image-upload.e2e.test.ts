import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { POST as completeUpload } from "@/app/api/s3-upload/complete/route";
import { POST as signUpload } from "@/app/api/s3-upload/route";
import { createValidatedImageDownloadUrl } from "@/lib/s3-image-storage";

const liveTest = process.env.IMAGE_UPLOAD_E2E === "1" ? test : test.skip;

liveTest(
  "a real S3 upload is write-once, validated, and downloadable by capability",
  async () => {
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
    const uploadBody = Uint8Array.from(bytes).buffer;
    const checksum = createHash("sha256").update(bytes).digest("base64");

    const signResponse = await signUpload(
      new NextRequest("http://localhost/api/s3-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: "e2e.png",
          contentType: "image/png",
          size: bytes.length,
          checksum,
        }),
      }),
    );
    assert.equal(signResponse.status, 200);

    const signedUpload = (await signResponse.json()) as {
      url: string;
      key: string;
      headers: Record<string, string>;
    };

    const origin =
      process.env.IMAGE_UPLOAD_E2E_ORIGIN ?? "https://llamacoder.together.ai";
    const preflight = await fetch(signedUpload.url, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": Object.keys(signedUpload.headers)
          .join(",")
          .toLowerCase(),
      },
    });
    assert.equal(preflight.status, 200);
    assert.ok(
      [origin, "*"].includes(
        preflight.headers.get("access-control-allow-origin") ?? "",
      ),
    );

    const upload = await fetch(signedUpload.url, {
      method: "PUT",
      headers: signedUpload.headers,
      body: uploadBody,
    });
    assert.equal(upload.status, 200);

    const replay = await fetch(signedUpload.url, {
      method: "PUT",
      headers: signedUpload.headers,
      body: uploadBody,
    });
    assert.equal(replay.status, 412);

    const completeResponse = await completeUpload(
      new NextRequest("http://localhost/api/s3-upload/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: signedUpload.key }),
      }),
    );
    assert.equal(
      completeResponse.status,
      200,
      await completeResponse.clone().text(),
    );

    const { token } = (await completeResponse.json()) as { token: string };
    const downloadUrl = await createValidatedImageDownloadUrl(token);
    const download = await fetch(downloadUrl);
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);

    console.log(`Verified live S3 image upload: ${signedUpload.key}`);
  },
);
