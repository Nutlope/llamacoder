import Together from "together-ai";

const together = new Together();

const MODELS = [
  { label: "Llama 3.3 70B (title generation)", value: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { label: "Kimi K2.5 (screenshot analysis)", value: "moonshotai/Kimi-K2.5" },
  { label: "Qwen 3 Coder Next (high quality)", value: "Qwen/Qwen3-Coder-Next-FP8" },
  { label: "GLM 4.6", value: "zai-org/GLM-4.6" },
  { label: "GLM 5", value: "zai-org/GLM-5" },
  { label: "GLM 5.1", value: "zai-org/GLM-5.1" },
  { label: "MiniMax M2.5", value: "MiniMaxAI/MiniMax-M2.5" },
  { label: "Qwen 3 Coder 480B", value: "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8" },
  { label: "DeepSeek V3", value: "deepseek-ai/DeepSeek-V3" },
];

async function testModel(modelValue: string): Promise<{ model: string; success: boolean; error?: string; rawResponse?: any }> {
  try {
    const response = await together.chat.completions.create({
      model: modelValue,
      messages: [{ role: "user", content: "Say 'OK' if you can read this." }],
      max_tokens: 200,
    });

    if (response.choices && response.choices[0]?.message?.content) {
      return { model: modelValue, success: true };
    }
    return { model: modelValue, success: false, error: "No response content", rawResponse: response };
  } catch (error) {
    return {
      model: modelValue,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      rawResponse: error,
    };
  }
}

async function main() {
  console.log("Testing Together AI models used in project...\n");

  const results = await Promise.all(
    MODELS.map(async (m) => {
      const result = await testModel(m.value);
      return { ...result, label: m.label };
    })
  );

  console.log("Results:\n");
  results.forEach((r) => {
    const status = r.success ? "✓" : "✗";
    console.log(`${status} ${r.label} (${r.value})`);
    if (!r.success) {
      console.log(`  Error: ${r.error}`);
      console.log(`  Raw: ${JSON.stringify(r.rawResponse, null, 2)}\n`);
    }
  });

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`\n${passed}/${results.length} models working`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
