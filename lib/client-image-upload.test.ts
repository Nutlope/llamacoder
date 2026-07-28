import assert from "node:assert/strict";
import test, { mock } from "node:test";
import { uploadImage } from "@/lib/client-image-upload";

test.afterEach(() => {
  mock.restoreAll();
});

test("the browser binds the direct upload to the selected file checksum", async () => {
  const file = new File(["hello"], "screenshot.png", { type: "image/png" });
  const expectedChecksum = "LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=";
  const requests: Array<{ input: string; init?: RequestInit }> = [];

  mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ input: String(input), init });

      if (requests.length === 1) {
        assert.deepEqual(JSON.parse(String(init?.body)), {
          filename: "screenshot.png",
          contentType: "image/png",
          size: 5,
          checksum: expectedChecksum,
        });
        return Response.json({
          url: "https://test-bucket.s3.amazonaws.com",
          key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
          fields: {
            key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
            "x-amz-checksum-sha256": expectedChecksum,
          },
        });
      }

      if (requests.length === 2) {
        const form = init?.body;
        assert.ok(form instanceof FormData);
        assert.equal(form.get("x-amz-checksum-sha256"), expectedChecksum);
        assert.equal(form.get("file"), file);
        return new Response(null, { status: 204 });
      }

      assert.deepEqual(JSON.parse(String(init?.body)), {
        key: "next-s3-uploads/uploads/8a2ebde7-8eda-42e3-9242-c03169dbfcff.png",
      });
      return Response.json({ token: "validated-image-token" });
    },
  );

  assert.deepEqual(await uploadImage(file), {
    token: "validated-image-token",
  });
  assert.equal(requests.length, 3);
});
