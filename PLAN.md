# LlamaCoder improvement plan

This plan captures three current problems and proposes concrete fixes. The goal is to make model evaluation repeatable, to know generated apps compile and render, and to modernize the prompt for current-generation models.

The plan is written around agreed data structures so the implementation has clear interfaces and is not open to reinterpretation.

---

## 1. Model evaluation is hard today

`llamacoder` is a web UI where a user types a prompt, a model streams code, and Sandpack renders it. That is good for demos but not a benchmark. Two runs of the same prompt with the same model leave no structured record of whether the output compiled, rendered, or looked correct.

We need a reproducible loop: a fixed dataset of prompts, a fixed set of models, and a structured result object every time.

### 1.1 Dataset structure

```ts
type BenchmarkPrompt = {
  id: string;
  prompt: string;
  referenceScreenshot?: string; // optional path to expected UI screenshot
  expectedBehavior: string[];   // e.g. ["render a counter", "increment on click"]
  maxFiles?: number;             // override global file limit per prompt
};

interface BenchmarkManifest {
  prompts: BenchmarkPrompt[];
  models: string[];
}
```

Why this shape:
- `id` links the result back to the input, so regressions can be traced.
- `expectedBehavior` gives human reviewers and future LLM judges a shared checklist.
- `referenceScreenshot` is optional because not every prompt has a canonical visual target.
- `maxFiles` lets hard prompts be stricter or looser without changing the global prompt.

### 1.2 Result structure

```ts
type GeneratedFile = {
  path: string;
  content: string;
};

type EvalResult = {
  runId: string;
  promptId: string;
  model: string;
  promptVersion: string;
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
  build: { ok: boolean; stdout: string; stderr: string; };
  runtime: { ok: boolean; consoleErrors: string[]; };
  screenshot: string | null; // relative path inside run dir
  qualityScore?: number;       // null until scored
};
```

Why this shape:
- `runId` makes every benchmark traceable and reproducible.
- `promptVersion` lets us compare prompt A versus prompt B on the same prompt/model pair.
- `timing` and `tokens` are the raw inputs for cost/score analysis.
- `generatedFiles` is kept so failures can be inspected or re-run.
- `build`, `runtime`, and `screenshot` separate three failure modes: syntax/type errors, runtime crashes, and visual/output problems.

### 1.3 On-disk layout

```
tmp/benchmark/
  <runId>/
    results.jsonl
    <promptId>_<model>/
      generated/       # source files emitted by the model
      build.log        # stdout + stderr from build
      dist/            # build output
      screenshot.png
```

Why this layout:
- `results.jsonl` is easy to append to and load into pandas / notebooks.
- One directory per prompt+model keeps artifacts close together for manual debugging.
- `generated/` is separate from `dist/` so we can rebuild manually if needed.

### 1.4 CLI shape

```
scripts/benchmark/run.ts \
  --manifest scripts/benchmark/prompts.json \
  --models "all" \
  --prompt-version "minimal-v1" \
  --out tmp/benchmark/<runId>
```

Output: a summary table with model x pass/fail counts, average latency, average tokens, and estimated cost.

---

## 2. We lack a headless way to compile and screenshot generated apps

The production renderer is Sandpack in the browser. The benchmark needs the same contract, but running headlessly with measurable failure modes.

### 2.1 Runner contract

Input: `GeneratedFile[]`

Output:
```ts
interface RunnerOutput {
  build: { ok: boolean; stdout: string; stderr: string; durationMs: number };
  runtime: { ok: boolean; consoleErrors: string[]; durationMs: number };
  screenshot: string | null; // relative path
}
```

Why this contract:
- It maps directly to the fields in `EvalResult`.
- It isolates build failures from runtime failures, which usually have different causes.
- A screenshot is required for visual quality checks even when build and runtime pass.

### 2.2 Project template must match Sandpack

The runner creates a temp project from the generated files and injects:
- the same `tsconfig.json` used in production
- the same path aliases: `@/components/*`, `@/lib/*`, `@/utils/*`, `@/types/*`
- the same Tailwind config and global CSS
- the same Shadcn component source files that Sandpack preloads
- the same dependency list (React, React-DOM, Tailwind, lucide-react, etc.)

Why this matters:
- If the benchmark uses a simpler or different template, a passing benchmark does not mean the app works in production.
- `lib/sandpack-config.ts` already encodes this contract, so the runner should import and reuse it.

### 2.3 Tooling choices

- **Build tool:** We should use same thing used by the nextjs app so Sandpack works as expected.
- **Browser:** Playwright headless Chromium. It gives screenshots, console capture, and stable wait conditions out of the box.
- **Wait condition:** `networkidle`, then an extra short delay for layout. This is simpler than waiting on a specific selector while still catching most blank-screen failures.

### 2.4 Success criteria

- For every `BenchmarkPrompt` and every model, one command runs end to end.
- The command prints a table: builds passed, runtime passed, screenshots taken, average latency, average tokens.
- Adding a prompt is a one-line edit to `prompts.json`.
- Adding a model is a one-line edit to `models` in the manifest.

---

## 3. The system prompt is probably overweight and example-driven

The current prompt in `lib/prompts.ts` mixes a planning role, a coding role, full example apps from `lib/shadcn-examples.ts`, and component-level usage snippets for every Shadcn component. That made sense when models needed few-shot examples to guess the output format.

Current-generation reasoning models follow explicit instructions better than they imitate long copied blocks. The current prompt likely wastes tokens, increases latency, and gives the model too many patterns to confuse.

We should move to a compact structured prompt with opt-in examples.

### 3.1 Prompt configuration structure

```ts
type PromptSection = {
  name: string;
  content: string;
};

interface PromptConfig {
  includeExamples: boolean;        // default false
  includeComponentDocs: boolean;   // default true
  maxFiles: number;                // default 5
  architectureStep: "none" | "inline" | "separate"; // default "inline"
}
```

Why this shape:
- `includeExamples` lets us test "no examples" versus the current few-shot style.
- `includeComponentDocs` lets us test whether component import/prop snippets help or just bloat tokens.
- `maxFiles` is exposed as a variable because the prompt must repeat this limit, and the tokenizer/verifier must enforce it.
- `architectureStep` controls whether planning is skipped, inlined in reasoning tags, or kept as a separate API call.

### 3.2 Required prompt sections

1. **Identity** — one paragraph. Sets the role and tone; no examples.
2. **Allowed stack** — React, TypeScript, Tailwind CSS, an explicit list of pre-installed Shadcn UI components, `lucide-react` for icons, browser `fetch` for data. Models must not add dependencies outside this list, because Sandpack cannot install new packages.
3. **Forbidden libraries / patterns** — `@chakra-ui/react`, `@headlessui/react`, `axios`, arbitrary Tailwind bracket values like `w-[100px]`, React Router. These are common failure modes in generated output, so they are banned explicitly.
4. **Output format** — exact rules for the file list:
   - each file as a code fence with `path=...` or `filename=...`
   - no prose outside `<thinking>...</thinking>` tags
   - all files together form a single valid React project
   - entry point must be `App.tsx`
5. **Renderer contract** — how Sandpack resolves imports, where the `index.html` and `main.tsx` equivalents live, which aliases are preconfigured (`@/components/*`, `@/lib/*`, etc.). This prevents models from picking non-existent paths.
6. **Complexity guardrails** — single page only, max N files, no external APIs or backend, target 2-3 MVP features. This avoids timeouts and failed renders.
7. **Reasoning instructions** — if the model emits `<thinking>`, the reasoning goes there; the final answer must be only valid code files.

### 3.3 What to do with existing examples

- Keep `lib/shadcn-examples.ts`; do not delete it.
- Default prompt generation uses `includeExamples: false`.
- Provide an opt-in legacy/weaker-model tier that injects the current examples.
- If component docs are kept, they should be short import/prop snippets from `lib/shadcn-docs`, not full working apps.
- Consider adding a short "negative example" block (one file that fails to build or uses a forbidden library) to reinforce guardrails.

### 3.4 Architecture step decision

Today `create-chat` calls a separate planning model with `stream=false`, then the coding model. This is an extra blocking call with extra cost and latency.

Three modes must be compared in the benchmark:
- `none`: the model generates files directly from the user prompt.
- `inline`: the model emits a brief plan inside `<thinking>` tags, then the file list in the same response.
- `separate`: keep the current two-call pipeline.

Winner is chosen by compile/runtime pass rate, latency, and token cost on the dataset. We drop the other modes once a default model and config are locked.

---

## 4. Order of work

1. **Implement benchmark harness.** Define the data structures, manifest, runner contract, and CLI. This unlocks every later decision.
2. **Build the minimal prompt config and default prompt.** Wire `PromptConfig` into the generation path so we can switch tiers at runtime.
3. **Run the matrix.** Compare prompt versions and architecture step modes across the dataset and all models in `lib/constants.ts`.
4. **Lock the default prompt and architecture mode.** Remove competing implementations once benchmark results are clear.
5. **Only then consider Version 4 (autonomous agent).** An agent that can loop forever makes the timeout and file-count problems much worse unless the guardrails above are already enforced.

---

## 5. Notes on the autonomous agent direction

`architecture.md` proposes a fully autonomous agent with filesystem and web access. That is a future step, not the next step. The guardrails in this plan—file-count limits, forbidden libraries, single-page scope, and an eval loop—must be codified first. Without them, an agent can run indefinitely, install unbounded dependencies, or produce apps that cannot be reliably benchmarked.
