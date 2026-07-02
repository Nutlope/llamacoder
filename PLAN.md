# LlamaCoder improvement plan

This plan captures the current problems and proposes concrete fixes. The goal is to make model evaluation repeatable, to know generated apps compile and render, and to modernize the prompt for current-generation models.

The plan is written around agreed data structures so the implementation has clear interfaces and is not open to reinterpretation.

**Status (2026-07-02):** the renderer migration (section 0) is implemented and wasm is now the default preview runner, with Sandpack still available via `?preview=sandpack` for one release. Chrome and real-device iOS Safari have been verified. The GLM 5.2 launch sweep and §0.3 hardening are complete. The benchmark harness exists through judge integration (§4 step 3.4), and the dataset draft is ready for Riccardo review before any full rank run. Local production build was repaired by pinning TypeScript back to the stable 5.9 line and excluding benchmark scratch output from app type-checking; production deploy verification is still an explicit launch gate. All open design decisions below were resolved in a grilling session on 2026-07-02; decisions are marked **[decided]**. Do not re-open [decided] items without flagging it — they were settled deliberately, with the trade-offs on the table.

---

## Launch scope — Monday 2026-07-06, GLM 5.2 default

The company launch does **not** wait for this plan. Launch-critical vs. deferred:

**Must happen before Monday:**
1. [x] GLM 5.2 confirmed as default model (it is first in `lib/constants.ts`, and the homepage default-selection path uses the first visible model).
2. [x] **Manual render test:** run GLM 5.2 on the 8 dataset prompt categories (§1.1) through the app, in *both* renderers (`?preview=wasm` vs default Sandpack). Result: 7/8 generated apps rendered in both; `settings-page-v1` failed in both because generated source included a stray code fence, not because of a renderer-specific break. Screenshots are in `tmp/benchmark/launch-scope-manual/screenshots`.
3. [x] **Renderer decision, driven by #2:**
   - If GLM 5.2 output renders fine under Sandpack → launch on Sandpack, flip to wasm calmly mid-week after launch.
   - If GLM 5.2's modern output breaks Sandpack (e.g. recharts v3 code) → the wasm flip becomes launch-critical: do §0.3 hardening + parity run before Monday (small, known edits — feasible in a day).
   - Actual decision: no Sandpack-specific GLM 5.2 launch blocker was found; wasm hardening still completed and the default was flipped.
4. [x] §0.3 hardening fixes regardless (they're on the critical path of every timeline).
5. [ ] **Production build passes and deploys.** Local `pnpm exec next build` now passes after TypeScript was pinned to `5.9.3` and scratch output was excluded from `tsconfig.json`; production deployment still needs verification.

**Everything else in this plan is post-launch.** Sequence so each day ends in a shippable state: launch must never depend on the benchmark existing. If the harness (§1–§2) lands before Monday, benchmark data is a bonus, not a blocker.

---

## Context for the implementer

- **What already exists:** the wasm renderer POC is *built and committed* (`d49406f`, `6637ec3`) — see §0.1 for the file map. `poc-wasm-esm.md` in the repo root is the original build spec; where it and the code disagree, **the code + this plan win** (the POC deviated from the spec in reviewed, accepted ways).
- **Try it:** `pnpm dev`, then `/preview-poc?preview=wasm&debug=1` (gauntlet fixture app + error cases). Flags: `?preview=wasm|sandpack` per-page, `NEXT_PUBLIC_PREVIEW_RUNNER=wasm` globally, `?debug=1` shows the timing badge. A temporary `/tailwind-test` route was used to validate Tailwind 4 browser arbitrary-value behavior and then deleted so it does not ship publicly.
- **Environment:** generation needs `TOGETHER_API_KEY` (Helicone proxy is optional, auto-enabled via env). The benchmark harness needs no database — only the app's chat routes touch Prisma; `/preview-harness` must stay client-only precisely so the harness never needs one.
- **Known bugs fixed in §0.3:** console-error overlay regression, the ready/error race, and the missing watchdog were fixed in `components/code-runner-react.tsx`.
- **Content deliverables that don't exist yet** (design is specified, the artifact isn't — don't assume they're written somewhere):
  - [x] The 8 dataset prompt texts + static-screenshot-judgeable `expectedBehavior` lists (§1.1) — drafted in `scripts/benchmark/prompts.json` for Riccardo's review.
  - [x] The judge prompt template — implemented in `scripts/benchmark/judge.ts`.
  - [ ] Calibration procedure write-up (§1.5).
  - [x] The canonical machine-readable forbidden-import/policy scan — implemented in `scripts/benchmark/policy.ts`.

---

## 0. Renderer migration: Sandpack → esbuild-wasm + esm.sh

Sandpack is unmaintained (last release ~a year ago, maintainer gone, CodeSandbox pivoted to VM products after the Together AI acquisition). Its frozen toolchain means new models generating modern code get judged by an old renderer. This had to be fixed before any benchmark work, otherwise every result would be re-run after the inevitable migration.

### 0.1 What is built (done)

- `lib/preview/deps.ts` — pinned dependency table (`PREVIEW_DEPS`, React 19, exact versions, no `latest`) and import-map generator pointing at esm.sh with `?external=react,react-dom` so all packages share one React instance.
- `lib/preview/bundle.ts` — esbuild-wasm singleton + virtual-filesystem plugin (resolves `@/` aliases and relative imports against the in-memory file map; bare specifiers stay external for the import map).
- `lib/preview/files.ts` — file-map assembly: path normalization, shadcn source injection, synthesized `App.tsx`/`main.tsx` (ported from `lib/sandpack-config.ts`).
- `lib/preview/html.ts` — srcdoc template: import map, Tailwind 4 CDN, error/console postMessage bridge, storage shim, inlined bundle with `</script>` escaping. Sandboxed iframe without `allow-same-origin`.
- `components/code-runner-react.tsx` — both pipelines behind a flag (`NEXT_PUBLIC_PREVIEW_RUNNER=wasm` or `?preview=wasm|sandpack`), phase state machine, timing metrics exposed as `data-preview-*` attributes, debug badge behind `?debug=1`.
- `app/(main)/preview-poc` — fixture page (gauntlet app exercising Radix + framer-motion + recharts + CSS + error cases) for manual and automated testing.

### 0.2 Decisions

- **Dependency freshness [decided]:** keep `recharts@3.9.1` (and modern pins generally). Update the recharts snippet in `lib/prompts.ts` and any `lib/shadcn-docs` references to v3 patterns as part of hardening. The migration's purpose is a modern stack; pinning back to v2 for parity would contradict it.
- **Backwards compatibility [decided]:** accept breakage of old stored chats. llamacoder is a demo/eval vehicle, not an archive. Old apps that break under the new renderer show the error overlay + "Try to fix"; `?preview=sandpack` remains as escape hatch for one release. No per-chat renderer versioning. Before the flip, manually spot-check a handful of recent real chats through the wasm preview to confirm breakage is the exception.
- **Browser support bar [decided]:** Chrome + Safari must pass; Firefox is best-effort. Status: Chrome verified; **iOS Safari verified on a real device (2026-07-02, preview-poc page)**. Note the stack intentionally needs no SharedArrayBuffer / COOP-COEP (unlike WebContainers), which is why mobile Safari works.
- **react-router-dom [decided]:** keep the dependency in `PREVIEW_DEPS` (renderer stays forgiving; old chats and disobedient generations still render), keep the prompt ban (scope control: single-page MVPs keep evaluation well-defined — one screenshot, one route). Enforcement principle: **the forbidden list is enforced by static checks on `generatedFiles`, never by the renderer.** Revisit the ban post-release with benchmark data (see §6).

### 0.3 Hardening checklist (complete except post-release cleanup)

- [x] `console-error` messages must not trigger the fatal error overlay (current regression): only `type: "error"` flips the overlay; accumulate console errors in state for the "Try to fix" payload and the benchmark.
- [x] Guard the `ready` handler so it cannot overwrite an `error` state (render errors can be reported before the `ready` rAF fires).
- [x] Watchdog: if neither `ready` nor `error` arrives within ~15s of `running`, flip to error so the overlay never hangs forever.
- [x] Update recharts prompt/docs snippets to v3 (per §0.2).
- [x] Parity run: every app in `lib/shadcn-examples.ts` side-by-side in both pipelines; fix divergences. Result: five shipped examples passed in both renderers. Chart apps compare "renders without errors," not pixel-identical (recharts major bump).
- [x] Spot-check recent real chats from the DB through the wasm preview (per §0.2 backwards-compat decision). Result: 3 recent chats passed wasm, 1 showed wasm-only old-chat breakage, and 1 had no runnable preview surface.
- [x] Safari verification (real iPhone, 2026-07-02). Firefox: best-effort, non-blocking.
- [x] Flip the default to wasm; keep Sandpack behind `?preview=sandpack` for one release.
- [ ] After one release, delete `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`, and `lib/sandpack-config.ts`.

### 0.4 Definition of done

Launch-critical checklist above complete. Remaining renderer work is the post-release Sandpack deletion. Do not polish beyond it — the renderer exists to serve sections 1–3, not the other way around. (Optional wasm self-hosting moved to §6.)

---

## 1. Model evaluation is hard today

`llamacoder` is a web UI where a user types a prompt, a model streams code, and the preview renders it. That is good for demos but not a benchmark. Two runs of the same prompt with the same model leave no structured record of whether the output compiled, rendered, or looked correct.

We need a reproducible loop: a fixed dataset of prompts, a fixed set of models, and a structured result object every time.

### 1.1 Dataset structure

```ts
type BenchmarkPrompt = {
  id: string;                    // immutable; append-only dataset (see below)
  prompt: string;
  referenceScreenshot?: string;  // optional path to expected UI screenshot
  expectedBehavior: string[];    // 3-5 visually checkable statements
  maxFiles?: number;             // override global file limit per prompt
};

interface BenchmarkManifest {
  prompts: BenchmarkPrompt[];
  models: string[];              // default: the 5 visible models in lib/constants.ts
  judgeModel: string;            // pinned per run (see §1.5)
}
```

**Dataset v1 [decided]: 7–9 prompts** — the core-usage tier plus one canary:

- *Canary (1):* counter. Exists to distinguish "harness/renderer broke" from "models are bad" — if the canary fails across all models, debug the pipeline, not the models.
- *Core tier (6–8):* todo CRUD, chart dashboard (deliberately exercises recharts v3), sortable/filterable data table, quiz app, calculator, shadcn-heavy settings page (dialog/tabs/select), tic-tac-toe.

Rules:
- `expectedBehavior` items are written as **static-screenshot-checkable** statements ("increment, decrement, and reset buttons are visible") because the judge sees one frame, not interaction history.
- **Append-only, immutable ids.** Editing a prompt after runs exist invalidates comparisons; changed prompts get a new id (`counter-v2`), old ids never change meaning.
- Authorship: drafted by Claude, pending Riccardo review.
- Stress-tier prompts (kanban drag-drop, scope-explosion traps) are post-release (§6).

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
  sampling: { temperature: number; maxTokens: number };  // recorded, not assumed
  timing: {
    firstTokenMs: number;
    totalGenerationMs: number;
    buildMs: number;   // = BundleResult.durationMs from lib/preview/bundle.ts
    renderMs: number;  // = running → ready, from data-preview-runtime-ms
  };
  tokens: {
    input: number;
    output: number;
  };
  generatedFiles: GeneratedFile[];
  policyViolations: string[];   // forbidden imports found by static scan (§0.2)
  build: { ok: boolean; stdout: string; stderr: string; };  // ok/error from BundleResult
  runtime: { ok: boolean; consoleErrors: string[]; };       // from the postMessage bridge
  screenshot: string | null;    // relative path inside run dir
  judge: JudgeResult | null;    // null when the mechanical gate failed
  qualityScore: number;         // 0 when gate failed; else judge score 0-10
  cellError?: string;            // generation/render/judge failure details when a cell fails unexpectedly
};
```

Why this shape:
- `runId` makes every benchmark traceable and reproducible.
- `promptVersion` lets us compare prompt A versus prompt B on the same prompt/model pair.
- `timing` and `tokens` are the raw inputs for cost/score analysis; `sampling` is recorded so no run's conditions are implicit.
- `generatedFiles` is kept so failures can be inspected or re-run.
- `build`, `runtime`, and `screenshot` separate three mechanical failure modes; `policyViolations` separates a fourth (disobedience) from all of them — a rendered app that used a banned library or pattern is a *different* defect than a crash and must not fail the mechanical gate by itself.
- The build/runtime fields map 1:1 onto types that already exist in `lib/preview` — the harness consumes them, it does not reinvent them.
- `cellError` lets a long campaign continue after a flaky judge, model API issue, path-safety rejection, or unexpected runner error; one cell failure must never kill the whole run.

### 1.3 On-disk layout

```
tmp/benchmark/            # gitignored; commit conclusions, not artifacts
  <runId>/
    results.jsonl
    <promptId>_<model>_<rep>/
      generated/       # source files emitted by the model
      build.log        # bundle error output
      screenshot.png
      judge.json       # verdicts + rationale
```

### 1.4 CLI shape

```
scripts/benchmark/run.ts \
  --manifest scripts/benchmark/prompts.json \
  --models "visible" | "all" | "m1,m2" \
  --profile explore | rank \
  --prompt-version "minimal-v1" \
  --arch-mode none|inline|separate \
  --out tmp/benchmark/<runId>
```

Output: a summary table with model x pass/fail counts, average latency, average tokens, estimated cost, and mean quality score.

**Run profiles [decided]** (temperature stays 0.4 — production parity; variance is handled by repetition, not by benchmarking a model we never ship):

- **explore (k=1):** for the §3.4 architecture-mode comparison. 2–3 representative models only (e.g. GLM 5.2, Kimi K2.7 Code, Qwen 3 235B) × all prompts × 3 arch modes ≈ 72 cells. Arch mode is a pipeline property; a winner on three diverse models holds for the rest.
- **rank (k=3):** the model leaderboard, run after arch mode and prompt version are locked. All models × all prompts × 3 repetitions ≈ 192 cells with the winning config. Pass rate out of ~24 samples per model separates good from bad (not good from slightly-better — acceptable for v1).

Rough cost: ~260 generations × ~4k output tokens + ~200 judge calls — single-digit dollars per campaign on Together. Wall-clock and legibility are the real constraints, not cost.

**Execution [decided]: manual, local-only.** A campaign is a deliberate act triggered by a question (new model dropped, prompt change proposed). No CI integration in v1 (a tiny PR smoke job is post-release, §6).

### 1.5 LLM judge [decided: ships in v1]

```ts
type JudgeResult = {
  model: string;                     // = manifest.judgeModel, pinned per run
  verdicts: Array<{
    behavior: string;                // one expectedBehavior item
    verdict: "met" | "not-met" | "cannot-tell";
  }>;
  score: number;                     // 0-10 overall
  rationale: string;                 // one paragraph; makes scores auditable
};
```

- **Gate first, judge second.** The judge only runs on cells that pass the mechanical gate (`build.ok && runtime.ok && screenshot !== null`). `policyViolations` are recorded separately and do not block judging by themselves. Gate failures get `qualityScore: 0` and `judge: null` — no vision tokens spent scoring error overlays.
- **Judge inputs:** screenshot + original user prompt + `expectedBehavior` checklist. **Not the generated source code** — the judge scores pixels, so it can't be seduced by nice code that renders poorly. (A code-reading judge is a possible second axis, post-release.)
- **Judge model:** a Together-hosted vision model (currently `moonshotai/Kimi-K2.7-Code`; single API/key for the whole harness), set in `manifest.judgeModel` and pinned per run — a benchmark whose judge silently changes between runs cannot be compared across time.
- **Judge resilience:** retry empty or unparseable judge output 1–2 times, then record a `cellError` and continue the campaign with `judge: null` / `qualityScore: 0`.
- **Calibration:** hand-label ~20 judged runs early and check judge–human agreement; adjust the judge prompt or model if agreement is poor. The stored rationale is what makes this audit possible.

---

## 2. Headless compile + screenshot of generated apps

**Largely solved by section 0.** The benchmark drives the *same* pipeline production uses — parity is by construction, not by convention. The original §2.2 ("runner template must match Sandpack") and §2.3 ("which build tool?") are obsolete: the pipeline is `assemblePreviewFiles → bundle → buildSrcdoc → iframe`, and it runs identically in the app and under Playwright.

### 2.1 Runner contract (unchanged)

Input: `GeneratedFile[]`

Output:
```ts
interface RunnerOutput {
  build: { ok: boolean; stdout: string; stderr: string; durationMs: number };
  runtime: { ok: boolean; consoleErrors: string[]; durationMs: number };
  screenshot: string | null; // relative path
}
```

### 2.2 How the runner works [decided]

- **A dedicated `/preview-harness` route** — client-only, no DB, `notFound()` in production deployments. The page exposes `window.renderFiles(files)`, which runs `assemblePreviewFiles → bundle → srcdoc` and mirrors the `data-preview-phase` / `data-preview-*-ms` attributes the production runner already exposes.
- Playwright does `page.goto("/preview-harness")` once per worker, then `page.evaluate(renderFiles, files)` per cell — no POST route, no server state, no re-navigation between cells.
- **The run script spawns the app itself** (`next build` + `next start`) if it isn't already up. Production build, not dev mode — that's what we're measuring.
- **Wait condition:** poll `data-preview-phase` until `"ready"` or `"error"`, bounded by the §0.3 watchdog. (Replaces the old `networkidle` idea — this observes the pipeline's own state machine.)
- **Screenshot determinism:** fixed 1280×800 viewport crop, not full-page screenshots; after `ready`, wait ~800ms for framer-motion entrance animations to settle; disable animations via Playwright where possible. The judge scores pixels — mid-animation frames and variable-height screenshots make quality scores flaky for identical apps.
- **Field mapping:** `BundleResult.ok/error/durationMs` → `build`; bridge `error`/`console-error` messages → `runtime`; `data-preview-runtime-ms` → `runtime.durationMs`; `page.screenshot()` → `screenshot`.
- Rejected alternative: bundling in Node with native esbuild (faster per cell, but then the benchmark is not running the production pipeline; speed is irrelevant at ~260 cells).

### 2.3 Success criteria

- For every `BenchmarkPrompt` and every model, one command runs end to end.
- The command prints a table: builds passed, runtime passed, screenshots taken, mean quality score, average latency, average tokens.
- Adding a prompt is a one-line edit to `prompts.json`; adding a model is a one-line edit to the manifest.
- The runner imports from `lib/preview/*` — zero renderer logic duplicated in the harness.

---

## 3. The system prompt is probably overweight and example-driven

The current prompt in `lib/prompts.ts` mixes a planning role, a coding role, full example apps from `lib/shadcn-examples.ts`, and component-level usage snippets for every Shadcn component. That made sense when models needed few-shot examples to guess the output format.

Current-generation reasoning models follow explicit instructions better than they imitate long copied blocks. We should move to a compact structured prompt with opt-in examples.

### 3.1 Prompt configuration structure

```ts
interface PromptConfig {
  includeExamples: boolean;        // default false
  includeComponentDocs: boolean;   // default true
  maxFiles: number;                // default 5
  architectureStep: "none" | "inline" | "separate"; // default "inline"
}
```

**Generation entry point [decided]: two-step extraction.**

1. *Now:* build `lib/generation.ts` with `generateApp(prompt, model, promptConfig) → { files, timing, tokens }`, reusing `lib/prompts.ts` for prompt content. Only the benchmark harness uses it; production routes are untouched while the renderer migration is in flight.
2. *After the matrix locks a winning config:* refactor `create-chat` / `get-next-completion-stream-promise` to call `generateApp` — a change being made at that point anyway to ship the winner.

Accepted temporary cost: orchestration logic exists twice for a few weeks. Contained because prompt *content* stays single-sourced in `lib/prompts.ts`; only call-ordering differs, and call-ordering is exactly the `architectureStep` variable the harness must control anyway.

### 3.2 Required prompt sections

1. **Identity** — one paragraph. Sets the role and tone; no examples.
2. **Allowed stack** — **generated from `PREVIEW_DEPS` in `lib/preview/deps.ts`**, not hand-written. The prompt can then never advertise a package or version the renderer does not serve (the recharts 2-vs-3 drift, codified away). Models must not add dependencies outside this list.
3. **Forbidden libraries / patterns** — `@chakra-ui/react`, `@headlessui/react`, `axios`, arbitrary Tailwind bracket values, React Router (kept per §0.2; revisit post-release per §6). Plus one renderer-derived rule: **import packages from their root specifier only** (no subpath imports — import-map prefix entries can't carry `?external`, so subpaths would duplicate React). Enforced by static scan → `EvalResult.policyViolations`, never by the renderer and never as part of the mechanical render gate. Note: the temporary `/tailwind-test` route confirmed arbitrary Tailwind values currently render in both wasm and Sandpack via `@tailwindcss/browser@4`; that route has been deleted, and the bracket-value ban remains a prompt/product policy rather than a renderer limitation.
4. **Output format** — each file as a code fence with `path=...`; no prose outside `<thinking>` tags; all files form a single valid React project; entry point `App.tsx`.
5. **Renderer contract** — much simpler than the Sandpack version: entry point `App.tsx`, alias table (`@/components/*`, `@/lib/*`, `@/utils/*`, `@/types/*`), pinned versions from the import map, root-specifier imports only.
6. **Complexity guardrails** — single page only, max N files, no external APIs or backend, target 2-3 MVP features.
7. **Reasoning instructions** — reasoning inside `<thinking>`; the final answer is only valid code files.

### 3.3 What to do with existing examples

- Keep `lib/shadcn-examples.ts`; do not delete it (it is also the parity-test fixture set for §0.3).
- Default prompt generation uses `includeExamples: false`.
- Provide an opt-in legacy/weaker-model tier that injects the current examples.
- Component docs, if kept, are short import/prop snippets from `lib/shadcn-docs`, version-accurate for `PREVIEW_DEPS` (recharts v3!).
- Consider a short "negative example" block (one file that fails to build or uses a forbidden library).

### 3.4 Architecture step decision

Compared in the benchmark's **explore profile** (2–3 models, k=1, all prompts):
- `none`: files directly from the user prompt.
- `inline`: brief plan inside `<thinking>`, then files, one response.
- `separate`: the current two-call pipeline.

Winner chosen by mechanical pass rate, quality score, latency, and token cost. Other modes are dropped once a default is locked.

---

## 4. Order of work

1. [x] **Finish renderer hardening (§0.3).** Time-boxed ~2 days; it is a checklist, not a project.
2. [x] **Draft the dataset (§1.1)** — Claude drafts 7–9 prompts, Riccardo reviews. Draft exists in `scripts/benchmark/prompts.json`; Riccardo review is still pending before any big run.
3. [x] **Build the benchmark harness (§1 + §2)** — in dependency order, each sub-step testable before the next exists:
   1. [x] `lib/generation.ts` (`generateApp`) — prompt in, files out. Tested standalone against GLM 5.2.
   2. [x] `/preview-harness` route + Playwright runner (§2.2) — files in, `RunnerOutput` + screenshot out. Tested with hand-written files, no model needed.
   3. [x] Orchestration: CLI walks the manifest, chains 3.1 → 3.2, adds the static policy scan, writes `results.jsonl` with mechanical pass/fail. **The harness is useful from this point** even with `judge: null`.
   4. [x] Judge integration (§1.5) last — it consumes the screenshots 3.2 produces and fills `qualityScore`. Judge retries empty/unparseable output and records failures per cell. (Note: document order §1-then-§2 is problem-statement order, not build order; the judge depends on the runner, not the other way around.)
4. **Calibrate the judge** on ~20 hand-labeled runs (§1.5).
5. **Run rank profile with `current-v0` / `separate`** → baseline model leaderboard for today's production prompt and two-call pipeline. This is the next big run after Riccardo reviews `scripts/benchmark/prompts.json` and judge calibration is acceptable.
6. **Implement §3 prompt/pipeline modes** after launch. Today `generateApp` intentionally supports only `promptVersion: "current-v0"` and `archMode: "separate"`; other modes throw by design so the current benchmark measures production behavior, not speculative prompt work.
7. **Run explore profile** → lock architecture mode and prompt version (§3.4) once §3 modes exist.
8. **Re-run rank profile** against the winning prompt/pipeline config, then compare to the `current-v0` / `separate` baseline.
9. **Lock defaults:** refactor production routes onto `generateApp` + winning `PromptConfig`; delete the Sandpack path and competing prompt implementations.
10. **Only then** consider the autonomous-agent direction (§5).

---

## 5. Notes on the autonomous agent direction

The autonomous-agent proposal (filesystem and web access) is a future step, not the next step. The guardrails in this plan—file-count limits, forbidden libraries, single-page scope, and an eval loop—must be codified first. Without them, an agent can run indefinitely, install unbounded dependencies, or produce apps that cannot be reliably benchmarked.

---

## 6. Post-release / nice-to-have

Explicitly deferred until after steps 1–7 of §4 ship. Each item exists because the benchmark can then answer it with data instead of opinion.

- **Revisit the React Router ban (§0.2/§3.2).** Run a matrix with the ban lifted and the single-page guardrail loosened; measure pass rate, file count, latency, and judge-score impact. Lift permanently if the damage is small.
- **Revisit the arbitrary Tailwind bracket-value ban (§3.2).** The temporary `/tailwind-test` route proved Tailwind 4 browser rendering supports arbitrary values in both wasm and Sandpack; use benchmark data to decide whether the product/prompt ban still improves consistency enough to keep.
- **Stress-tier prompts:** drag-and-drop kanban, deliberate scope-explosion traps, historically-failing prompts mined from the real chat DB. Grow the dataset toward 30–50 prompts once the harness has proven itself.
- **PR smoke job:** counter prompt × 1 fast model × mechanical gate only (no judge) on PRs touching `lib/preview/` or `lib/prompts.ts`. Pipeline regression protection, not model evaluation.
- **Code-reading judge axis:** a second judge pass over `generatedFiles` (code quality, idiom), kept separate from the visual score.
- **Self-host `esbuild.wasm`** in `public/` with a CI check that its version matches `esbuild-wasm` in package.json; removes esm.sh as a dependency for the compiler itself.
- **Firefox verification** of the preview pipeline (best-effort tier).
- **HTML report generation** from `results.jsonl` (screenshot grid per run) if the summary table proves insufficient.
