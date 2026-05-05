import Together from "together-ai";
import * as fs from "fs";
import * as path from "path";
import { screenshotToCodePrompt } from "./lib/prompts";

const together = new Together();

const VISION_MODELS = [
  { label: "Kimi K2.6 FP4", value: "moonshotai/Kimi-K2.6" },
  { label: "Gemma 4 31B-it FP8", value: "google/gemma-4-31B-it" },
  { label: "Qwen3.5 397B A17B", value: "Qwen/Qwen3.5-397B-A17B" },
  { label: "Kimi K2.5", value: "moonshotai/Kimi-K2.5" },
  { label: "Qwen3.5 9B FP8", value: "Qwen/Qwen3.5-9B-FP8" },
  { label: "Gemma 3N E4B Instruct", value: "google/gemma-3n-E4B-it" },
];

function getImageDataUrl(): string {
  const imgPath = path.join(__dirname, "public", "landing.png");
  const data = fs.readFileSync(imgPath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function testVisionModel(
  modelValue: string,
  imageDataUrl: string,
): Promise<{ model: string; success: boolean; ms: number; tokens?: number; preview?: string; error?: string }> {
  const start = Date.now();
  try {
    const response = await together.chat.completions.create({
      model: modelValue,
      reasoning: { enabled: false },
      temperature: 0.4,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: screenshotToCodePrompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ] as any,
        },
      ],
    });

    const ms = Date.now() - start;
    const content = response.choices[0]?.message?.content ?? "";
    const tokens = response.usage?.completion_tokens;

    if (!content) {
      return { model: modelValue, success: false, ms, error: "Empty response" };
    }

    return {
      model: modelValue,
      success: true,
      ms,
      tokens,
      preview: content.slice(0, 120).replace(/\n/g, " "),
    };
  } catch (error) {
    return {
      model: modelValue,
      success: false,
      ms: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("Loading landing.png...");
  const imageDataUrl = getImageDataUrl();
  console.log(`Image loaded (${Math.round(imageDataUrl.length / 1024)} KB base64)\n`);
  console.log("Testing vision models with screenshotToCodePrompt in parallel...\n");

  const results = await Promise.all(
    VISION_MODELS.map(async (m) => {
      const result = await testVisionModel(m.value, imageDataUrl);
      const status = result.success ? "✓" : "✗";
      const time = `${(result.ms / 1000).toFixed(1)}s`;
      const tok = result.tokens ? ` | ${result.tokens} tokens` : "";
      console.log(`${status} ${m.label} (${m.value}) — ${time}${tok}`);
      if (result.success && result.preview) {
        console.log(`  Preview: ${result.preview}...`);
      } else if (!result.success) {
        console.log(`  Error: ${result.error}`);
      }
      return { ...result, label: m.label };
    }),
  );

  console.log("\n--- Ranked by speed (fastest first) ---");
  results
    .filter((r) => r.success)
    .sort((a, b) => a.ms - b.ms)
    .forEach((r, i) => {
      console.log(`${i + 1}. ${r.label} — ${(r.ms / 1000).toFixed(1)}s${r.tokens ? ` (${r.tokens} tokens)` : ""}`);
    });

  const failed = results.filter((r) => !r.success);
  if (failed.length) {
    console.log(`\n${failed.length} model(s) failed: ${failed.map((r) => r.label).join(", ")}`);
  }
}

main();
