import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { ImageUploadError, MAX_IMAGE_DIMENSION } from "@/lib/image-upload";
import { validateImage } from "@/lib/image-verification";

test("byte validation rejects SVG content disguised as PNG", async () => {
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
  );

  await assert.rejects(
    validateImage(svg, "image/png"),
    (error: unknown) =>
      error instanceof ImageUploadError &&
      error.status === 415 &&
      /valid image|supported image/.test(error.message),
  );
});

test("byte validation accepts a real PNG without producing replacement bytes", async () => {
  const input = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: "#2563eb",
    },
  })
    .png()
    .toBuffer();

  const result = await validateImage(input, "image/png");

  assert.deepEqual(result, {
    width: 2,
    height: 2,
  });
});

test("byte validation rejects excessive image dimensions", async () => {
  const input = await sharp({
    create: {
      width: MAX_IMAGE_DIMENSION + 1,
      height: 1,
      channels: 3,
      background: "#ffffff",
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    validateImage(input, "image/png"),
    (error: unknown) =>
      error instanceof ImageUploadError && error.status === 415,
  );
});
