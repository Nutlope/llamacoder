import fs from "node:fs/promises";
import Together from "together-ai";

export type JudgeResult = {
  model: string;
  verdicts: Array<{
    behavior: string;
    verdict: "met" | "not-met" | "cannot-tell";
  }>;
  score: number;
  rationale: string;
};

type JudgeRequest = {
  create: (options: {
    model: string;
    prompt: string;
    expectedBehavior: string[];
    screenshotBase64: string;
  }) => Promise<string>;
};

export async function judgeScreenshot(options: {
  model: string;
  prompt: string;
  expectedBehavior: string[];
  screenshotPath: string;
  maxAttempts?: number;
  request?: JudgeRequest;
}): Promise<JudgeResult> {
  const screenshot = await fs.readFile(options.screenshotPath, "base64");
  const request = options.request ?? createTogetherJudgeRequest();
  const maxAttempts = options.maxAttempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const content = await request.create({
        model: options.model,
        prompt: options.prompt,
        expectedBehavior: options.expectedBehavior,
        screenshotBase64: screenshot,
      });

      return normalizeJudgeResult(
        options.model,
        options.expectedBehavior,
        content,
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildJudgePrompt(prompt: string, expectedBehavior: string[]) {
  return `You are judging a generated React app from a screenshot only.

Original user prompt:
${prompt}

Expected visible behavior checklist:
${expectedBehavior.map((behavior, index) => `${index + 1}. ${behavior}`).join("\n")}

Score only what is visible in the screenshot. Do not inspect or assume source code.
Return strict JSON only, with this shape:
{
  "verdicts": [
    { "behavior": "exact checklist text", "verdict": "met" | "not-met" | "cannot-tell" }
  ],
  "score": 0,
  "rationale": "one short paragraph"
}

Use a 0-10 score. A beautiful but incomplete app should not score above 6. A screenshot showing an error, blank page, or irrelevant app should score 0-2.`;
}

export function normalizeJudgeResult(
  model: string,
  expectedBehavior: string[],
  content: string,
): JudgeResult {
  const parsed = parseJsonObject(content);
  const verdicts = expectedBehavior.map((behavior, index) => {
    const verdict = parsed.verdicts?.[index]?.verdict;
    return {
      behavior,
      verdict:
        verdict === "met" || verdict === "not-met" || verdict === "cannot-tell"
          ? verdict
          : "cannot-tell",
    };
  });
  const rawScore = Number(parsed.score);
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(10, rawScore))
    : 0;

  return {
    model,
    verdicts,
    score,
    rationale:
      typeof parsed.rationale === "string"
        ? parsed.rationale
        : content.slice(0, 500),
  };
}

function parseJsonObject(content: string): any {
  if (!content.trim()) {
    throw new Error("Judge returned empty content");
  }

  const trimmed = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error(`Judge did not return JSON: ${content.slice(0, 500)}`);
  }
}

function createTogetherJudgeRequest(): JudgeRequest {
  const together = new Together(getTogetherOptions());

  return {
    create: async (options) => {
      const response = await together.chat.completions.create({
        model: options.model,
        reasoning: { enabled: false },
        temperature: 0,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildJudgePrompt(
                  options.prompt,
                  options.expectedBehavior,
                ),
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${options.screenshotBase64}`,
                },
              },
            ],
          },
        ],
      });

      return response.choices[0].message?.content ?? "";
    },
  };
}

function getTogetherOptions(): ConstructorParameters<typeof Together>[0] {
  if (!process.env.HELICONE_API_KEY) return {};

  return {
    baseURL: "https://together.helicone.ai/v1",
    defaultHeaders: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder Benchmark Judge",
      "Helicone-Session-Name": "LlamaCoder Benchmark Judge",
    },
  };
}
