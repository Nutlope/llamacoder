import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { MODELS } from "../../lib/constants";
import {
  generateApp,
  type ArchMode,
  type GeneratedFile,
  type PromptVersion,
} from "../../lib/generation";
import {
  createPreviewHarnessSession,
  type RunnerOutput,
} from "./preview-runner";
import { findPolicyViolations } from "./policy";

type BenchmarkPrompt = {
  id: string;
  prompt: string;
  referenceScreenshot?: string;
  expectedBehavior: string[];
  maxFiles?: number;
};

type BenchmarkManifest = {
  prompts: BenchmarkPrompt[];
  models: string[];
  judgeModel: string;
  promptVersion?: PromptVersion;
  archMode?: ArchMode;
};

type EvalResult = {
  runId: string;
  promptId: string;
  model: string;
  promptVersion: PromptVersion;
  archMode: ArchMode;
  sampling: { temperature: number; maxTokens: number };
  timing: {
    firstTokenMs: number;
    totalGenerationMs: number;
    buildMs: number;
    renderMs: number;
  };
  tokens: {
    input: number;
    output: number;
  };
  generatedFiles: GeneratedFile[];
  policyViolations: string[];
  build: { ok: boolean; stdout: string; stderr: string };
  runtime: { ok: boolean; consoleErrors: string[] };
  screenshot: string | null;
  judge: null;
  qualityScore: number;
};

const PROFILES = {
  explore: 1,
  rank: 3,
} as const;

async function main() {
  const args = parseCliArgs();
  const manifest = await readManifest(args.manifest);
  const runId = args.runId ?? makeRunId();
  const outDir = path.resolve(args.out ?? `tmp/benchmark/${runId}`);
  const promptVersion = args.promptVersion ?? manifest.promptVersion ?? "current-v0";
  const archMode = args.archMode ?? manifest.archMode ?? "separate";
  const repetitions = args.repetitions ?? PROFILES[args.profile];
  const prompts = selectPrompts(manifest.prompts, args.prompts);
  const models = selectModels(args.models, manifest.models);
  const baseUrl = args.baseUrl ?? "http://localhost:3100";

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    path.join(outDir, "run.json"),
    JSON.stringify(
      {
        runId,
        promptVersion,
        archMode,
        profile: args.profile,
        repetitions,
        models,
        prompts: prompts.map((prompt) => prompt.id),
        judgeModel: manifest.judgeModel,
      },
      null,
      2,
    ),
  );

  const server = await ensurePreviewHarnessServer(baseUrl);
  const session = await createPreviewHarnessSession({ baseUrl });
  const results: EvalResult[] = [];

  try {
    for (const model of models) {
      for (const prompt of prompts) {
        for (let rep = 0; rep < repetitions; rep++) {
          const result = await runCell({
            runId,
            outDir,
            prompt,
            model,
            rep,
            promptVersion,
            archMode,
            renderFiles: session.renderFiles,
          });
          results.push(result);
          await appendJsonl(path.join(outDir, "results.jsonl"), result);
          printCell(result);
        }
      }
    }
  } finally {
    await session.close();
    await server?.stop();
  }

  printSummary(results);
}

async function runCell(options: {
  runId: string;
  outDir: string;
  prompt: BenchmarkPrompt;
  model: string;
  rep: number;
  promptVersion: PromptVersion;
  archMode: ArchMode;
  renderFiles: (
    files: GeneratedFile[],
    options: { screenshotPath?: string },
  ) => Promise<RunnerOutput>;
}): Promise<EvalResult> {
  const cellDir = path.join(
    options.outDir,
    `${options.prompt.id}_${sanitizePathPart(options.model)}_${options.rep}`,
  );
  const generatedDir = path.join(cellDir, "generated");
  await fs.mkdir(generatedDir, { recursive: true });

  const generated = await generateApp(options.prompt.prompt, options.model, {
    promptVersion: options.promptVersion,
    archMode: options.archMode,
  });

  for (const file of generated.files) {
    const filePath = path.join(generatedDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content);
  }

  const runnerOutput = await options.renderFiles(generated.files, {
    screenshotPath: path.join(cellDir, "screenshot.png"),
  });
  await fs.mkdir(cellDir, { recursive: true });
  await fs.writeFile(
    path.join(cellDir, "build.log"),
    runnerOutput.build.stderr || runnerOutput.build.stdout,
  );

  const policyViolations = findPolicyViolations(generated.files);
  const mechanicalPass =
    policyViolations.length === 0 &&
    runnerOutput.build.ok &&
    runnerOutput.runtime.ok &&
    runnerOutput.screenshot !== null;

  return {
    runId: options.runId,
    promptId: options.prompt.id,
    model: options.model,
    promptVersion: options.promptVersion,
    archMode: options.archMode,
    sampling: generated.sampling,
    timing: {
      firstTokenMs: generated.timing.firstTokenMs,
      totalGenerationMs: generated.timing.totalGenerationMs,
      buildMs: runnerOutput.build.durationMs,
      renderMs: runnerOutput.runtime.durationMs,
    },
    tokens: generated.tokens,
    generatedFiles: generated.files,
    policyViolations,
    build: {
      ok: runnerOutput.build.ok,
      stdout: runnerOutput.build.stdout,
      stderr: runnerOutput.build.stderr,
    },
    runtime: {
      ok: runnerOutput.runtime.ok,
      consoleErrors: runnerOutput.runtime.consoleErrors,
    },
    screenshot: runnerOutput.screenshot
      ? path.relative(options.outDir, runnerOutput.screenshot)
      : null,
    judge: null,
    qualityScore: mechanicalPass ? 0 : 0,
  };
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      manifest: { type: "string", default: "scripts/benchmark/prompts.json" },
      models: { type: "string", default: "visible" },
      profile: { type: "string", default: "explore" },
      "prompt-version": { type: "string" },
      "arch-mode": { type: "string" },
      out: { type: "string" },
      prompts: { type: "string" },
      repetitions: { type: "string" },
      "base-url": { type: "string" },
      "run-id": { type: "string" },
    },
  });

  if (values.profile !== "explore" && values.profile !== "rank") {
    throw new Error(`Unsupported --profile ${values.profile}`);
  }

  if (
    values["prompt-version"] &&
    values["prompt-version"] !== "current-v0"
  ) {
    throw new Error(`Unsupported --prompt-version ${values["prompt-version"]}`);
  }

  if (values["arch-mode"] && values["arch-mode"] !== "separate") {
    throw new Error(`Unsupported --arch-mode ${values["arch-mode"]}`);
  }

  return {
    manifest: values.manifest,
    models: values.models,
    profile: values.profile,
    promptVersion: values["prompt-version"] as PromptVersion | undefined,
    archMode: values["arch-mode"] as ArchMode | undefined,
    out: values.out,
    prompts: values.prompts,
    repetitions: values.repetitions
      ? Number.parseInt(values.repetitions, 10)
      : undefined,
    baseUrl: values["base-url"],
    runId: values["run-id"],
  };
}

async function readManifest(pathname: string): Promise<BenchmarkManifest> {
  return JSON.parse(await fs.readFile(pathname, "utf8"));
}

function selectPrompts(
  prompts: BenchmarkPrompt[],
  promptList: string | undefined,
) {
  if (!promptList) return prompts;

  const ids = new Set(promptList.split(",").map((id) => id.trim()));
  const selected = prompts.filter((prompt) => ids.has(prompt.id));

  if (selected.length !== ids.size) {
    throw new Error(`Unknown prompt id in --prompts ${promptList}`);
  }

  return selected;
}

function selectModels(modelArg: string | undefined, manifestModels: string[]) {
  if (!modelArg || modelArg === "visible") {
    return MODELS.filter((model) => !model.hidden).map((model) => model.value);
  }

  if (modelArg === "all") return manifestModels;

  return modelArg.split(",").map((model) => model.trim());
}

async function ensurePreviewHarnessServer(baseUrl: string) {
  if (await isPreviewHarnessUp(baseUrl)) return null;

  await runCommand("pnpm", ["exec", "next", "build"], {
    ENABLE_PREVIEW_HARNESS: "1",
  });

  const url = new URL(baseUrl);
  const child = spawn(
    "pnpm",
    ["exec", "next", "start", "-p", url.port || "3000"],
    {
      stdio: "inherit",
      env: { ...process.env, ENABLE_PREVIEW_HARNESS: "1" },
    },
  );

  await waitForServer(baseUrl);

  return {
    stop: async () => {
      child.kill("SIGTERM");
      await waitForExit(child);
    },
  };
}

async function isPreviewHarnessUp(baseUrl: string) {
  try {
    const response = await fetch(`${baseUrl}/preview-harness`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (await isPreviewHarnessUp(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}/preview-harness`);
}

async function runCommand(
  command: string,
  args: string[],
  env: Record<string, string>,
) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  const code = await waitForExit(child);
  if (code !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

function waitForExit(child: ChildProcess) {
  return new Promise<number | null>((resolve) => {
    child.on("exit", (code) => resolve(code));
  });
}

async function appendJsonl(pathname: string, value: unknown) {
  await fs.appendFile(pathname, `${JSON.stringify(value)}\n`);
}

function printCell(result: EvalResult) {
  const pass =
    result.policyViolations.length === 0 &&
    result.build.ok &&
    result.runtime.ok &&
    result.screenshot !== null;
  console.log(
    `${pass ? "PASS" : "FAIL"} ${result.promptId} ${result.model} ` +
      `gen=${Math.round(result.timing.totalGenerationMs)}ms ` +
      `build=${Math.round(result.timing.buildMs)}ms ` +
      `render=${Math.round(result.timing.renderMs)}ms`,
  );
}

function printSummary(results: EvalResult[]) {
  const byModel = new Map<string, EvalResult[]>();
  for (const result of results) {
    byModel.set(result.model, [...(byModel.get(result.model) ?? []), result]);
  }

  console.table(
    Array.from(byModel.entries()).map(([model, modelResults]) => {
      const passCount = modelResults.filter(
        (result) =>
          result.policyViolations.length === 0 &&
          result.build.ok &&
          result.runtime.ok &&
          result.screenshot !== null,
      ).length;
      return {
        model,
        samples: modelResults.length,
        passRate: `${passCount}/${modelResults.length}`,
        buildPass: modelResults.filter((result) => result.build.ok).length,
        runtimePass: modelResults.filter((result) => result.runtime.ok).length,
        screenshots: modelResults.filter((result) => result.screenshot).length,
        avgLatencyMs: Math.round(
          average(modelResults.map((result) => result.timing.totalGenerationMs)),
        ),
        avgTokens: Math.round(
          average(
            modelResults.map(
              (result) => result.tokens.input + result.tokens.output,
            ),
          ),
        ),
      };
    }),
  );
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function makeRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
