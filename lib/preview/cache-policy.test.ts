import { test } from "node:test";
import assert from "node:assert/strict";
import { PREVIEW_CACHE_STORAGE } from "./cache-policy";

test("preview artifacts do not persist across page reloads", () => {
  assert.equal(PREVIEW_CACHE_STORAGE, "memory");
});
