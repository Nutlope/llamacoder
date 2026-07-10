import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FALLBACK_MODEL,
  MODEL_ALIASES,
  isNonServerlessModelError,
  resolveModel,
} from "./constants";

describe("model compatibility aliases", () => {
  it("maps Together models that are no longer serverless", () => {
    assert.equal(
      MODEL_ALIASES["moonshotai/Kimi-K2-Instruct-0905"],
      "moonshotai/Kimi-K2.7-Code",
    );
    assert.equal(
      MODEL_ALIASES["deepseek-ai/DeepSeek-V3.1"],
      "moonshotai/Kimi-K2.7-Code",
    );
  });

  it("resolves legacy IDs while preserving current IDs", () => {
    assert.equal(
      resolveModel("moonshotai/Kimi-K2-Instruct-0905"),
      "moonshotai/Kimi-K2.7-Code",
    );
    assert.equal(
      resolveModel("deepseek-ai/DeepSeek-V3.1"),
      "moonshotai/Kimi-K2.7-Code",
    );
    assert.equal(resolveModel("moonshotai/Kimi-K2.6"), "moonshotai/Kimi-K2.6");
  });

  it("recognizes Together's non-serverless model error only", () => {
    assert.equal(FALLBACK_MODEL, "moonshotai/Kimi-K2.7-Code");
    assert.equal(
      isNonServerlessModelError({
        error: {
          code: "model_not_available",
          message: "Unable to access non-serverless model old/model",
        },
      }),
      true,
    );
    assert.equal(
      isNonServerlessModelError({
        error: { code: "invalid_request_error", message: "bad request" },
      }),
      false,
    );
  });
});
