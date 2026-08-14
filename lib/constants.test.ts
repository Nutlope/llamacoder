import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_MODEL,
  MODELS,
  resolveModel,
  SCREENSHOT_MODEL,
} from "./constants";

test("retired Kimi models are migrated instead of exposed", () => {
  assert.equal(resolveModel("moonshotai/Kimi-K2.6"), FALLBACK_MODEL);
  assert.equal(resolveModel("moonshotai/Kimi-K2.7-Code"), FALLBACK_MODEL);
  assert.equal(
    MODELS.some((model) => model.value.startsWith("moonshotai/Kimi-K2.")),
    false,
  );
});

test("screenshot analysis uses the benchmarked Gemma replacement", () => {
  assert.equal(SCREENSHOT_MODEL, "google/gemma-4-31B-it");
});
