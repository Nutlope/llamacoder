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

test("deprecated and non-serverless models resolve to the fallback", () => {
  assert.equal(resolveModel("deepseek-ai/DeepSeek-V3"), FALLBACK_MODEL);
  assert.equal(
    resolveModel("deepseek-ai/DeepSeek-V4-Flash-0731"),
    FALLBACK_MODEL,
  );
  assert.equal(
    resolveModel("Qwen/Qwen3-235B-A22B-Instruct-2507-FP8"),
    FALLBACK_MODEL,
  );
});

test("GLM 5.2 chats are upgraded to GLM 5.3", () => {
  assert.equal(resolveModel("zai-org/GLM-5.2"), "zai-org/GLM-5.3");
});

test("screenshot analysis uses the supported Gemma replacement", () => {
  assert.equal(SCREENSHOT_MODEL, "zai-org/GLM-5.3-Flash");
});
