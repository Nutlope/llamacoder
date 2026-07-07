import Together from "together-ai";
import { PLANNING_MODEL, resolveModel } from "./constants";
import {
  getMainCodingPrompt,
  softwareArchitectPrompt,
} from "./prompts";
import {
  DEFAULT_PROMPT_CONFIG,
  INLINE_PLAN_INSTRUCTION,
  buildMinimalCodingPrompt,
  type PromptConfig,
} from "./prompt-config";
import { extractAllCodeBlocks } from "./utils";

export type GeneratedFile = {
  path: string;
  content: string;
};

export type ArchMode = "separate" | "none" | "inline";

export type PromptVersion =
  | "current-v0"
  | "current-v0-plan-v2"
  | "minimal-v1"
  | "minimal-v2"
  | "minimal-v3"
  | "minimal-v4"
  | "minimal-v5"
  | "minimal-v6"
  | "minimal-v7"
  | "minimal-v3b"
  | "minimal-v8"
  | "minimal-v9";

export type GenerateAppConfig = {
  promptVersion?: PromptVersion;
  archMode?: ArchMode;
  temperature?: number;
  maxTokens?: number;
  heliconeSessionId?: string;
  promptConfig?: PromptConfig;
};

export type GenerateAppResult = {
  files: GeneratedFile[];
  rawText: string;
  plan: string;
  promptVersion: PromptVersion;
  archMode: ArchMode;
  sampling: {
    temperature: number;
    maxTokens: number;
  };
  timing: {
    firstTokenMs: number;
    totalGenerationMs: number;
  };
  tokens: {
    input: number;
    output: number;
  };
};

type TokenUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
};

export async function generateApp(
  prompt: string,
  model: string,
  config: GenerateAppConfig = {},
): Promise<GenerateAppResult> {
  const promptVersion = config.promptVersion ?? "current-v0";
  const archMode = config.archMode ?? "separate";
  const temperature = config.temperature ?? 0.4;

  const maxTokens =
    config.maxTokens ??
    (archMode === "separate" || archMode === "inline" ? 13000 : 9000);

  if (
    promptVersion !== "current-v0" &&
    promptVersion !== "current-v0-plan-v2" &&
    promptVersion !== "minimal-v1" &&
    promptVersion !== "minimal-v2" &&
    promptVersion !== "minimal-v3" &&
    promptVersion !== "minimal-v4" &&
    promptVersion !== "minimal-v5" &&
    promptVersion !== "minimal-v6" &&
   promptVersion !== "minimal-v7" &&
   promptVersion !== "minimal-v3b" &&
   promptVersion !== "minimal-v8" &&
   promptVersion !== "minimal-v9"
  ) {
    throw new Error(`Unsupported promptVersion: ${promptVersion}`);
  }

  if (
    archMode !== "separate" &&
    archMode !== "none" &&
    archMode !== "inline"
  ) {
    throw new Error(`Unsupported archMode: ${archMode}`);
  }

  const together = new Together(getTogetherOptions(config.heliconeSessionId));
  const startedAt = performance.now();

  // archMode "none" mirrors the production default (quality "low"): the raw
  // user prompt goes straight to the coding model with no planning call.
  let plan = prompt;
  let planUsage: TokenUsage | undefined;

  // archMode "inline" behaves like "none" (no planning API call; the raw
  // user prompt is the user message) but folds a short plan-first instruction
  // into the system prompt so the model writes its brief plan inside the
  // <thinking> block before the code files, all in one response.
  if (archMode === "separate") {
    const planResponse = await together.chat.completions.create({
      model: PLANNING_MODEL,
      messages: [
        {
          role: "system",
          content: softwareArchitectPrompt,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      max_tokens: 3000,
    });
    plan = planResponse.choices[0].message?.content ?? prompt;
    planUsage = planResponse.usage ?? undefined;
  }

  let firstTokenMs = 0;
  const codingStartedAt = performance.now();

  // Resolve the minimal-prompt variant (if any) for the current promptVersion.
  // `minimal-v1` uses the caller's config as-is (no variant); `minimal-v2`,
  // `minimal-v3`, `minimal-v4`, `minimal-v5`, `minimal-v6`, `minimal-v7`, and `minimal-v3b` force their `promptVariant`
  // onto the spread config. Anything else falls back to the legacy
  // `getMainCodingPrompt`.
  const minimalVariant:
    | "v2"
    | "v3"
    | "v4"
    | "v5"
    | "v6"
    | "v7"
    | "v3b"
    | "v8"
    | "v9"
    | null =
    promptVersion === "minimal-v2"
      ? "v2"
      : promptVersion === "minimal-v3"
        ? "v3"
        : promptVersion === "minimal-v4"
          ? "v4"
          : promptVersion === "minimal-v5"
            ? "v5"
            : promptVersion === "minimal-v6"
              ? "v6"
              : promptVersion === "minimal-v7"
                ? "v7"
                : promptVersion === "minimal-v3b"
                  ? "v3b"
                  : promptVersion === "minimal-v8"
                    ? "v8"
                    : promptVersion === "minimal-v9"
                      ? "v9"
                      : null;

  let systemPrompt =
    promptVersion === "minimal-v1" ||
    promptVersion === "minimal-v2" ||
    promptVersion === "minimal-v3" ||
    promptVersion === "minimal-v4" ||
    promptVersion === "minimal-v5" ||
    promptVersion === "minimal-v6" ||
    promptVersion === "minimal-v7" ||
    promptVersion === "minimal-v3b" ||
    promptVersion === "minimal-v8" ||
    promptVersion === "minimal-v9"
      ? buildMinimalCodingPrompt(
          minimalVariant
            ? {
                ...(config.promptConfig ?? DEFAULT_PROMPT_CONFIG),
                promptVariant: minimalVariant,
                // v9 is the Base UI variant — generate the allowed-stack from
                // the Base UI deps too (not just the component list), so it
                // matches the shipped production prompt exactly.
                ...(promptVersion === "minimal-v9"
                  ? { uiLibrary: "baseui" as const }
                  : {}),
              }
            : config.promptConfig ?? DEFAULT_PROMPT_CONFIG,
        )
      : getMainCodingPrompt();

  if (archMode === "inline") {
    systemPrompt += "\n\n" + INLINE_PLAN_INSTRUCTION;
  }

  const stream = together.chat.completions.stream({
    model: resolveModel(model),
    reasoning: { enabled: false },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: plan },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  stream.on("content", (delta) => {
    if (!firstTokenMs && delta.length > 0) {
      firstTokenMs = performance.now() - codingStartedAt;
    }
  });

  const rawText = (await stream.finalContent()) ?? "";
  const totalGenerationMs = performance.now() - startedAt;
  const usage = addUsage(
    planUsage,
    await stream.totalUsage().catch(() => undefined),
  );
  const files = extractAllCodeBlocks(rawText).map((file) => ({
    path: file.path,
    content: file.code,
  }));

  return {
    files,
    rawText,
    plan,
    promptVersion,
    archMode,
    sampling: {
      temperature,
      maxTokens,
    },
    timing: {
      firstTokenMs,
      totalGenerationMs,
    },
    tokens: {
      input: usage.prompt_tokens ?? 0,
      output: usage.completion_tokens ?? 0,
    },
  };
}

function getTogetherOptions(
  heliconeSessionId: string | undefined,
): ConstructorParameters<typeof Together>[0] {
  if (!process.env.HELICONE_API_KEY) return {};

  return {
    baseURL: "https://together.helicone.ai/v1",
    defaultHeaders: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder Benchmark",
      "Helicone-Session-Id": heliconeSessionId ?? "benchmark-generate-app",
      "Helicone-Session-Name": "LlamaCoder Benchmark",
    },
  };
}

function addUsage(
  left: TokenUsage | undefined,
  right: TokenUsage | undefined,
): Required<TokenUsage> {
  return {
    prompt_tokens: (left?.prompt_tokens ?? 0) + (right?.prompt_tokens ?? 0),
    completion_tokens:
      (left?.completion_tokens ?? 0) + (right?.completion_tokens ?? 0),
  };
}
