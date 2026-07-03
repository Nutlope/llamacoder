import Together from "together-ai";
import { PLANNING_MODEL, resolveModel } from "./constants";
import {
  getMainCodingPrompt,
  softwareArchitectPrompt,
} from "./prompts";
import {
  DEFAULT_PROMPT_CONFIG,
  buildMinimalCodingPrompt,
  type PromptConfig,
} from "./prompt-config";
import { extractAllCodeBlocks } from "./utils";

export type GeneratedFile = {
  path: string;
  content: string;
};

export type ArchMode = "separate" | "none" | "inline";

export type PromptVersion = "current-v0" | "current-v0-plan-v2" | "minimal-v1";

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
    promptVersion !== "minimal-v1"
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

  let systemPrompt =
    promptVersion === "minimal-v1"
      ? buildMinimalCodingPrompt(config.promptConfig ?? DEFAULT_PROMPT_CONFIG)
      : getMainCodingPrompt();

  if (archMode === "inline") {
    systemPrompt +=
      "\n\n" +
      "Before writing any code files, first write a brief implementation plan inside a single <thinking>...</thinking> block. List the MVP features you will build and the files you will create (with their paths), keeping it concise. After the closing </thinking>, emit all the code files in the fenced format above. Everything — the plan and the code — must be in this one response.";
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
