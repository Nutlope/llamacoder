import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_MODEL,
  MODEL_ALIASES,
  MODELS,
  resolveModel,
  resolveModelAlias,
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

test("every approved model and alias resolves to a model in MODELS", () => {
  for (const model of MODELS) {
    assert.equal(resolveModel(model.value), resolveModelAlias(model.value));
    assert.ok(MODELS.some((m) => m.value === resolveModel(model.value)));
  }
  for (const alias of Object.keys(MODEL_ALIASES)) {
    assert.ok(MODELS.some((m) => m.value === resolveModel(alias)));
  }
});

test("unknown or non-string models are rejected instead of passed through", () => {
  for (const model of [
    "meta-llama/Llama-3.1-405B-Instruct",
    "deepseek-ai/DeepSeek-R1",
    "",
    "__proto__",
    "constructor",
    "toString",
    undefined,
    null,
    42,
    { value: FALLBACK_MODEL },
  ]) {
    assert.equal(resolveModel(model), null, String(model));
  }
});
