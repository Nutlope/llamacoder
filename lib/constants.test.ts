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

test("models retired on 2026-10-22 resolve to the fallback", () => {
  assert.equal(
    resolveModel("deepseek-ai/DeepSeek-V4-Flash-0731"),
    FALLBACK_MODEL,
  );
  assert.equal(
    resolveModel("meta-llama/Llama-3.3-70B-Instruct-Turbo"),
    FALLBACK_MODEL,
  );
  assert.equal(
    MODELS.some(
      (model) => model.value === "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    ),
    false,
  );
});

test("screenshot analysis uses the supported Gemma replacement", () => {
  assert.equal(SCREENSHOT_MODEL, "zai-org/GLM-5.3-Flash");
});
