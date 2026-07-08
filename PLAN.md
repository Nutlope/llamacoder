# LlamaCoder improvement plan

This plan captures the current problems and proposes concrete fixes. The goal is to make model evaluation repeatable, to know generated apps compile and render, and to modernize the prompt for current-generation models.

The plan is written around agreed data structures so the implementation has clear interfaces and is not open to reinterpretation.

**Status (2026-07-02):** the renderer migration (section 0) is implemented and wasm is now the only production preview runner. Chrome and real-device iOS Safari have been verified. The GLM 5.2 launch sweep and §0.3 hardening are complete. The eval harness exists through judge integration (§4 step 3.4), and the dataset is **reviewed and approved (§7)**. Local production build was repaired by pinning TypeScript back to the stable 5.9 line and excluding benchmark scratch output from app type-checking; production deploy verification is still an explicit launch gate. All open design decisions below were resolved in a grilling session on 2026-07-02; decisions are marked **[decided]**. Do not re-open [decided] items without flagging it — they were settled deliberately, with the trade-offs on the table.

---

## Base UI shipped (2026-07-05)

Production now ships the Base UI direction (commit `fe29f90`), validated by the `minimal-v9 × inline × baseui` benchmark (GLM k=3: quality parity, −22% latency, missing-component failures eliminated):
- **Renderer locked to Base UI** (`code-runner-react.tsx`) — all chat/share previews render Base UI's 64 modern components (scroll-area, combobox, command, data-table, date-picker, sidebar, …), with the old Sandpack/Radix fallback removed.
- **Production prompt is Base UI-aware** (`buildProductionCodingPrompt`): allowed-stack generated from the Base UI deps, full Base UI component inventory listed, inline plan retained.
- **Supporting fixes:** harness renders Base UI (`a9528d7`); Base UI import map completed with general libs like framer-motion (`5e7d6a6`); harness error bridge records uncaught runtime/module errors (`fe29f90`).
- **Verified:** production `next build` passes; Base UI renders through the product preview path.
- **Remaining:** (1) production deploy verification (owner: Riccardo); (2) old stored chats were generated against the previous component/runtime assumptions — some may break under Base UI per the accepted-breakage decision (§0.2); (3) the production `code-runner` "Try to fix" error capture could get the same `pageerror` fix the harness got.

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

- **What already exists:** the wasm renderer POC was built and committed (`d49406f`, `6637ec3`) and has since been absorbed into the product renderer path. `poc-wasm-esm.md` was the original build spec; where it and the code disagree, **the code + this plan win** (the POC deviated from the spec in reviewed, accepted ways).
- **Try it:** `pnpm dev`, then generate through the app preview. Flags: `?preview=wasm|sandpack` per-page, `NEXT_PUBLIC_PREVIEW_RUNNER=wasm` globally, `?debug=1` shows the timing badge. Temporary fixture routes were used during validation and then deleted so they do not ship publicly.
- **Environment:** generation needs `TOGETHER_API_KEY` (Helicone proxy is optional, auto-enabled via env). The eval harness needs no database — only the app's chat routes touch Prisma; `/eval-harness` stays client-only precisely so the harness never needs one.
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
- `components/code-runner-react.tsx` — wasm iframe pipeline, phase state machine, timing metrics exposed as `data-preview-*` attributes, debug badge behind `?debug=1`.
- Product preview routes now exercise the Base UI preview kit through the wasm renderer; standalone fixture routes were removed before release.

### 0.2 Decisions

- **Dependency freshness [decided]:** keep `recharts@3.9.1` (and modern pins generally). Update the recharts snippet in `lib/prompts.ts` and any `lib/shadcn-docs` references to v3 patterns as part of hardening. The migration's purpose is a modern stack; pinning back to v2 for parity would contradict it.
- **Backwards compatibility [decided]:** accept breakage of old stored chats. llamacoder is a demo/eval vehicle, not an archive. Old apps that break under the new renderer show the error overlay + "Try to fix"; `?preview=sandpack` remains as escape hatch for one release. No per-chat renderer versioning. Before the flip, manually spot-check a handful of recent real chats through the wasm preview to confirm breakage is the exception.
- **Browser support bar [decided]:** Chrome + Safari must pass; Firefox is best-effort. Status: Chrome verified; **iOS Safari verified on a real device (2026-07-02, wasm preview page)**. Note the stack intentionally needs no SharedArrayBuffer / COOP-COEP (unlike WebContainers), which is why mobile Safari works.
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
- Authorship: drafted by Claude; **reviewed and approved 2026-07-02** (see §7). The 8 prompts and their `expectedBehavior` lists are locked — any change from here follows the append-only rule (new id, never an edit).
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
- **Calibration [revised 2026-07-02, supersedes the original hand-labeling protocol]:** calibration by inspection, not by labeling. Every judged run generates an HTML report (`scripts/benchmark/report.ts`) showing each cell's screenshot beside the judge's verdicts, score, rationale, timing, and tokens. Riccardo skims the report and either agrees with the judge (rank results are trusted) or points at disagreements (judge prompt/model gets adjusted and the run repeats). The stored rationale is what makes this audit possible. Rationale for the change: the scores have exactly one consumer, so formal judge–human agreement stats add process without adding trust.

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

- **A dedicated `/eval-harness` route** — client-only, no DB, `notFound()` in production deployments unless `ENABLE_EVAL_HARNESS=1`. The page exposes `window.renderFiles(files)`, which runs `assemblePreviewFiles → bundle → srcdoc` and mirrors the `data-preview-phase` / `data-preview-*-ms` attributes the production runner already exposes.
- Playwright does `page.goto("/eval-harness")` once per worker, then `page.evaluate(renderFiles, files)` per cell — no POST route, no server state, no re-navigation between cells.
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
2. [x] **Draft the dataset (§1.1)** — Claude drafts 7–9 prompts, Riccardo reviews. Draft exists in `scripts/benchmark/prompts.json`; **reviewed and approved 2026-07-02 (§7)**.
3. [x] **Build the benchmark harness (§1 + §2)** — in dependency order, each sub-step testable before the next exists:
   1. [x] `lib/generation.ts` (`generateApp`) — prompt in, files out. Tested standalone against GLM 5.2.
   2. [x] `/eval-harness` route + Playwright runner (§2.2) — files in, `RunnerOutput` + screenshot out. Tested with hand-written files, no model needed.
   3. [x] Orchestration: CLI walks the manifest, chains 3.1 → 3.2, adds the static policy scan, writes `results.jsonl` with mechanical pass/fail. **The harness is useful from this point** even with `judge: null`.
   4. [x] Judge integration (§1.5) last — it consumes the screenshots 3.2 produces and fills `qualityScore`. Judge retries empty/unparseable output and records failures per cell. (Note: document order §1-then-§2 is problem-statement order, not build order; the judge depends on the runner, not the other way around.)
4. [x] **Calibrate the judge** (§1.5, inspection-based): GLM 5.2 × 8 prompts judged run (`tmp/benchmark/calibration-glm52`), HTML report reviewed by Riccardo 2026-07-02 — **scoring approved as-is** (7/8 mechanical pass, mean quality 6.9; the one failure was a genuine model bug caught by the build gate). Judge locked: `moonshotai/Kimi-K2.7-Code` with the current judge prompt.
5. [x] **Baseline rank runs, both arch modes (2026-07-03).** Discovery during review: production's *default* is `quality: "low"` (no planning call) — the plan's assumption that `separate` was "current behavior" described only the non-default High-quality toggle. So the baseline ran both modes: 5 models × 8 prompts × k=3 × {`none`, `separate`} = 240 cells (`tmp/benchmark/rank-current-v0-none`, `rank-current-v0-separate`). Headline results:
   - **`none` (production default):** Kimi K2.6 23/24 pass · 7.5 quality · 22s; Kimi K2.7-Code 21/24 · 7.5 · 21s; MiniMax M3 23/24 · 7.0 · 58s; **GLM 5.2 (launch default) 18/24 · 7.6 · 81s (slowest)**; Qwen 18/24 · 7.8 · 70s.
   - **`separate` (High-quality toggle) hurts reliability:** pass rate drops for 3 of 5 models (K2.7-Code 21→12, MiniMax 23→17, Qwen 18→14; GLM flat, K2.6 −1) while adding ~20–25s latency and ~40% more tokens. Quality of *passing* cells rises ~+0.3–0.8 (survivorship caveat: fewer passes). The planning step appears to inflate scope beyond what models reliably implement.
   - **Policy violations are rampant under the current prompt** (GLM 17/24 cells, K2.6 15/24 — almost all arbitrary Tailwind values, which §3.2 confirmed render fine). Strong input for the §6 bracket-ban revisit and the §3 rewrite.
   - **Failure taxonomy (54 fails, 46 build / 8 runtime):** (1) ~13× truncated or unparseable output — models blow past the 9,000 `max_tokens` cap, concentrated in `separate` mode (plan-inflated scope) and `settings-page-v1`; (2) 9× models emit their own `lib/utils.ts` without `cn`, clobbering the injected shadcn one and breaking every `import { cn }`; (3) ~8× phantom imports of files never written. Clusters 1–2 are pipeline/prompt bugs, not model failures — fixing them should lift every model's score.
   - **Pending product decisions from this data:** (a) fate of the High-quality toggle — decided to **retest with fixes first** (step 6) since passing runs showed a real quality lift (+0.3–0.8, best score of the campaign was K2.7-Code at 8.3 in `separate`); (b) whether GLM 5.2 stays the Monday default given Kimi K2.6 beats it on pass rate and speed at equal quality — escalate to whoever owns the launch narrative.
6. [x] **High-quality retest with fixes (2026-07-03, `tmp/benchmark/rank-plan-v2-separate`).** Fixes implemented (via tcodex, reviewed, commit `00840f1`): (a) `maxTokens` 13k for `separate`-mode coding calls; (b) scope constraint appended to `softwareArchitectPrompt` (2–3 features, ≤5 files, ≤300-word plan) — labeled `current-v0-plan-v2`; (c) guard in `assemblePreviewFiles` so generated files cannot overwrite injected ones. **Results (120 cells vs both baselines):** overall `none` 103/120 pass · q7.5 · 51s · 6.4k tok; `separate` (broken) 83/120 · q7.8 · 67s · 9k tok; `separate` (fixed) 88/120 · q7.6 · **46s** · 6.7k tok. The fixes worked as engineering — truncations gone, faster than `none` on average — but reliability stayed 13 points below `none` (73% vs 86%) and the quality lift collapsed to noise (7.6 vs 7.5), confirming the old "quality advantage" was just inflated scope on surviving runs. **Verdict: the separate planning call costs reliability and buys nothing — recommend removing the High-quality toggle.** Final §3.4 check (`inline`) rides along in step 8; the causal insight (plan-constrained outputs are shorter and faster even including the extra call) transfers to the `inline` design.
7. **Implement §3 prompt/pipeline modes** after launch: `PromptConfig`, `minimal-v1` prompt (allowed stack generated from `PREVIEW_DEPS`, `includeExamples: false` default), `inline` arch mode. **Note: examples on/off has NOT been tested yet** — all runs so far use `current-v0`, the production prompt with examples. This step builds the apparatus for that experiment.
8. [x] **Explore profile run (2026-07-03, `tmp/benchmark/explore-*`).** 4 configs × 3 top models × 8 prompts, k=1, vs the k=3 baseline (3-model slice: 86% pass · q7.5 · 42s · 45 policy-violating cells):
   - `minimal-v1 × none`: 83% · q7.9 · **14s** · 5 violations
   - **`minimal-v1 × inline`: 92% · q8.2 · 14s · 6 violations ← winner on every axis**
   - `minimal-v1+examples × none`: 88% · q7.6 · 23s · **18.4k input tokens/call** (vs ~1.5k without)
   - `current-v0 × inline`: 92% · q7.8 · 22s · 12 violations
   **Examples verdict: remove them.** Within the same prompt structure, examples cost 12× input tokens and +9s latency, *lower* judged quality (7.6 vs 7.9), and buy at most one pass (within k=1 noise). They also appear to be the source of the baseline's rampant policy violations (45 → ~6 with the minimal prompt): the old examples teach outdated patterns. **Inline-planning verdict: keep** — +9pp pass and +0.3 quality over `none` at zero latency cost, vindicating the one good idea inside the dead High-quality toggle. Caveat: k=1 (±4pp noise per config) — step 9 confirms at k=3.
9. [x] **Confirmation rank run (2026-07-03, `tmp/benchmark/rank-minimal-inline`).** All 5 models × `minimal-v1` × `inline` × k=3 vs the `current-v0` × `none` baseline: **104/120 vs 103/120 pass · q8.0 vs q7.5 · 24s vs 51s (2.1× faster) · violations 30 vs 54.** The explore run's 92% pass was k=1 optimism (real: ~87%, equal to baseline), but quality, speed, tokens, and compliance gains all confirmed. Per model: every model gains quality except Qwen (7.1, dislikes the minimal prompt); GLM 5.2 transforms (81s→19s, q7.6→8.1) but Kimi K2.6 remains the reliability leader (23/24 · q8.0 · 13s). **Config locked: `minimal-v1` × `inline` is the recommended production default.** Model default remains a product call: Kimi K2.6 for reliability+speed, GLM 5.2 now credible if the launch narrative requires it.
10. **Lock defaults:** refactor production routes onto `generateApp` + winning `PromptConfig`; delete the Sandpack path and competing prompt implementations.
11. **Only then** consider the autonomous-agent direction (§5).

---

## 5. Notes on the autonomous agent direction

The autonomous-agent proposal (filesystem and web access) is a future step, not the next step. The guardrails in this plan—file-count limits, forbidden libraries, single-page scope, and an eval loop—must be codified first. Without them, an agent can run indefinitely, install unbounded dependencies, or produce apps that cannot be reliably benchmarked.

---

## 6. Post-release / nice-to-have

Explicitly deferred until the §4 sequence ships. Each item exists because the benchmark can then answer it with data instead of opinion.

- **Revisit the React Router ban (§0.2/§3.2).** Run a matrix with the ban lifted and the single-page guardrail loosened; measure pass rate, file count, latency, and judge-score impact. Lift permanently if the damage is small.
- **Revisit the arbitrary Tailwind bracket-value ban (§3.2).** The temporary `/tailwind-test` route proved Tailwind 4 browser rendering supports arbitrary values in both wasm and Sandpack; use benchmark data to decide whether the product/prompt ban still improves consistency enough to keep.
- **Stress-tier prompts:** drag-and-drop kanban, deliberate scope-explosion traps, historically-failing prompts mined from the real chat DB. Grow the dataset toward 30–50 prompts once the harness has proven itself.
- **PR smoke job:** counter prompt × 1 fast model × mechanical gate only (no judge) on PRs touching `lib/preview/` or `lib/prompts.ts`. Pipeline regression protection, not model evaluation.
- **Code-reading judge axis:** a second judge pass over `generatedFiles` (code quality, idiom), kept separate from the visual score.
- **Self-host `esbuild.wasm`** in `public/` with a CI check that its version matches `esbuild-wasm` in package.json; removes esm.sh as a dependency for the compiler itself.
- **Firefox verification** of the preview pipeline (best-effort tier).
- ~~**HTML report generation** from `results.jsonl`~~ — pulled forward into v1 (`scripts/benchmark/report.ts`) as the vehicle for inspection-based judge calibration (§1.5 revised).
- **together-ai SDK crash bug:** `together-ai@0.40.0` has a TDZ bug (`Cannot access 'TogetherError' before initialization` in `AbstractChatCompletionRunner`) that kills the process from a background tick when a stream errors, bypassing per-cell isolation (observed 2026-07-03, cost 18 cells, recovered via `--models`/`--prompts` patch rerun into the same out dir). Upgrade the SDK when a fix ships, or add a `process.on("unhandledRejection")` guard in `run.ts`.
- **`--models all` semantics:** today it returns `manifest.models` (the 5 visible models); either add the hidden models to the manifest or make `all` mean "every model in `lib/constants.ts`".
- **Base UI migration test (completed 2026-07-05).** shadcn/ui moved off Radix primitives onto Base UI, and the renderer now injects the Base UI preview kit through the product preview path. Keep future renderer-substrate changes isolated from prompt experiments so benchmark attribution stays clean.

### 6.1 `minimal-v2` prompt tweak backlog (data-backed candidates)

Each is a hypothesis grounded in the 744-cell campaign, to be run as an explore-profile variant against the locked `minimal-v1` × `inline` baseline (reuse stored baseline results; only run the new variant). Ranked by expected payoff. Confidence ordering is a prior, not a result — the benchmark decides.

1. **Phantom-import rule (high confidence).** ~8 baseline failures imported a `./` file the model never emitted — the biggest *unaddressed* failure cluster. Add to output-format: "Every relative import must resolve to a file you also emit; verify before finishing." Free to add; targets a known-failing class. Catchable by the mechanical gate alone (build failure) — `--skip-judge`.
2. **Design-quality bar in identity.** The judge scores visual completeness but the identity paragraph only asks for "working MVP." Add one sentence about polish (spacing, hierarchy, hover/empty/loading states). Targets the quality axis; risk: may nudge scope up and cost speed — needs the judge.
3. **Recharts-only-when-charting.** Chart prompts were slowest + most failure-prone; recharts is the heaviest dep. Guardrail: "Only use recharts when the app is fundamentally data visualization." Measures latency delta on non-chart prompts.
4. **Drop the arbitrary-Tailwind ban (high confidence).** Violated in most cells (GLM 17/24, K2.6 15/24), proven to render fine under Tailwind 4 browser build. Removing it shortens the prompt (faster) and stops models fighting an ignored rule (maybe better). Overlaps §6's ban-revisit item; promote to the next explore run.
5. **Fewer, larger files.** "ALWAYS multiple files" contradicts "≤5 files" and multiplies import edges (→ tweak 1 risk) and output tokens (→ slower). Replace with "2–3 files by concern; avoid over-fragmenting." Hypothesis: fewer resolution failures + faster, no quality loss.

Sequencing: **1 and 4 first** (highest confidence; one shortens the prompt, one closes a live failure class, neither risks scope creep) as `minimal-v2`. Tweaks 2/3/5 each trade one axis against another — run isolated, not bundled, or attribution is lost.

### 6.1a Experiment results log (`minimal-vN`)

Baseline for all: `minimal-v1 × inline`, explore profile (3 models × 8 prompts, k=1, judged) = `explore-min-inline` → **22/24 pass · q8.18 · 13.8s · 3005 out-tok**. All variants run against it. **Caveat: k=1 detects only large effects; ±0.2 quality / ±1 cell is noise.** Only a big, consistent win justifies promoting a variant over `minimal-v1`.

| Variant | Change | Pass | Quality | Gen s | Out-tok | Verdict |
|---|---|---|---|---|---|---|
| **v1** (champion, shipped) | clean minimal prompt + inline | 22/24 | 8.18 | 13.8 | 3005 | **live in prod** |
| **v2** | +phantom-import rule, −Tailwind ban | 21/24 | 7.86 | (confounded) | 2953 | ✗ shelved — no gain; phantom rule didn't fix its target; dropping ban raised flagged violations |
| **v3** | +Hallmark design-quality section | 20/24 | 8.00 | 13.5 | 3832 | ~ mixed — **not promoted**. See below. |
| **v4** | +Modern-patterns section | 21/24 | 8.00 | 13.4 | 3020 | ✗ shelved — fewer policy violations, but no quality/pass gain and GLM regressed. |
| **v5** | +Scope-discipline section | 20/24 | 8.10 | 11.4 | 3194 | ✗ shelved — fast and good for K2.7 only; reliability regressed elsewhere. |
| **v6** | +Self-check section | 19/24 | 8.16 | 10.6 | 2984 | ✗ shelved — helped K2.6, but badly destabilized GLM. |
| **v7** | +Output-contract section | 23/24 | 7.78 | 18.8 | 3290 | ~ reliability win, quality/speed loss — **not promoted**; possible Kimi reliability follow-up. |

**v9 — full Base UI direction, GLM k=3 (2026-07-05, `rank-v9-baseui-glm`):** the culmination — serve the rich Base UI-64 set (`--ui baseui`) + list all 64 in the prompt (minimal-v9). Required fixing the harness to render Base UI (buildSrcdoc deps+vendor, commit `a9528d7`) and completing the Base UI import map with general libs like framer-motion (`5e7d6a6`). Result vs GLM Radix v1 (19/24 · q8.05 · 18.6s): **19/24 · q8.11 · 14.4s (−22% latency)**. **Quality parity, 22% faster, and the missing-component failure class is eliminated** (zero scroll-area-style errors; the 5 remaining failures are ordinary model syntax/phantom-import slips + 2 uncapturable runtime errors). Component-heavy prompts improved (chart 9.3→10.0, settings 5.5→6.0); Radix-API-habit prompts dipped (todo, quiz, tic-tac-toe). **Verdict: Base UI is a viable, faster, modern-component direction to ship at no quality cost — but not a quality *leap*, because the judge rewards completeness and both stacks produce complete apps. The remaining lever for better apps is the model's inherent syntax/import error rate, not the component library.** Follow-ups: (1) harness error bridge should capture `pageerror`/uncaught module errors, not just `console.error` — the gap hid the framer-motion failure and produces the recurring "runtime, no msg" cells; (2) if shipping Base UI, generate the prompt's *allowed-stack* from the served (baseui) deps too, not just the component list, to kill the last prompt-vs-renderer drift.

**v8 — full component inventory in prompt, GLM k=3 (2026-07-05, `rank-v8-glm`):** auto-generated list of all 35 injected `@/components/ui` components (vs the hand-listed 8), drift-proof from the served set. GLM `minimal-v1` = 19/24 · q8.05 · 18.6s; GLM `minimal-v8` = **21/24 · q7.71 · 11.2s (−40% latency)**. **Pass +2 and generation 40% faster** (model stops hand-writing components it now knows exist) — real speed/reliability win. Quality −0.34 (partly dragged by calculator's scroll-area failures). **Critical finding: listing did NOT stop the model from importing `scroll-area` — it failed calculator twice despite scroll-area not being in the list AND an explicit "don't import non-listed components" rule. The model's training prior for well-known shadcn components overrides prompt negatives.** → You cannot prompt the model off a known component; you must *serve* it. **Next step (real Tier 1): flip the renderer to the Base UI-67 set (which has scroll-area + modern components) AND list all 67** — should keep v8's speed win and kill the scroll-area failure class. Tier 3 (on-demand component reads via a tool loop) remains the token-optimal end-state (§5).

**v3b — GLM-only trimmed rubric, tested at k=3 (2026-07-04, `rank-v3b-glm`):** hypothesis was that v3's big k=1 GLM lift (+0.8) would survive with a shorter rubric. **It did not.** GLM `minimal-v1` k=3 = 19/24 · **q8.05** · 18.6s; GLM `minimal-v3b` k=3 = 21/25 · **q7.48** · 18.1s · +19% tokens. Quality went **down 0.57**, most prompts flat-or-down (todo 7.0→5.8, quiz 6.3→5.3, calculator 9.0→7.5). **Conclusion: the v3 k=1 GLM lift was noise — the design rubric does not reliably help GLM when measured at k=3, and the trimmed version hurts.** Not wired to production; GLM keeps the plain `minimal-v1`. (Caveat: this tested the *trimmed* rubric; a full-v3 k=3 GLM run could differ, but the prior is now strongly against it — every quality tweak that looked good at k=1 has failed to replicate at higher n.)

**v3 detail (design rubric, k=1):** net a slight wash at k=1, but *polarizing* and worth remembering — and now known to be **k=1 noise** (see v3b above):
- **Helped GLM 5.2 notably** (q 7.63→**8.43**) and lifted visually-weak prompts hard (calculator 6.5→9.0, quiz 7.0→9.0, chart 9.3→9.7).
- **Hurt Kimi K2.7-Code** (q 8.43→7.33, −1 pass) and some prompts (todo 7.7→6.3, settings 6.0→5.3).
- Costs **+28% output tokens** (3005→3832) — the rubric makes models write more styling code.
- Takeaway: design guidance is *model-dependent* — a clear win for GLM (the launch default), a loss for Kimi. If GLM is locked as the production model, a **trimmed** design rubric is worth a k=3 re-test on GLM alone. As a universal prompt addition it doesn't pay for its tokens. Not promoted; revisit if the model choice narrows to GLM.

**v4 detail (modern-patterns directive):** not worth promoting as a universal prompt:
- Net result was baseline-ish but worse where it matters: `21/24` pass vs baseline `22/24`, judged quality `8.00` vs `8.18`.
- **Helped Kimi K2.7-Code quality** (q 8.43→**8.57**) and Kimi K2.6 reliability (7/8→**8/8**), but **hurt GLM 5.2 reliability** (8/8→**6/8**) with a missing `scroll-area` import and a settings-page runtime timeout.
- Token cost stayed effectively flat (3005→3020 output tokens) and policy violations improved (11→6), so the wording is not bloating output.
- Takeaway: code-modernity wording is cheap and makes outputs more compliant, but it did not improve the headline benchmark and it creates GLM risk. Shelved.

**v5 detail (scope discipline):** confirms "less scope" is model-sensitive, not a universal free lunch:
- Overall pass regressed to `20/24`; judged quality on passing cells was a small nominal lift (`8.10`) but not enough to offset reliability.
- **Kimi K2.7-Code loved it**: `8/8`, q `8.38`, and **6.9s** average generation, a real speed win.
- **GLM 5.2 and Kimi K2.6 both fell to 6/8**. GLM introduced unterminated strings and a missing emitted component; K2.6 still hit missing `scroll-area`/`use-toast`.
- Output tokens rose slightly overall (3005→3194) because K2.6 got longer, so the scope wording did not reliably shrink generated code.
- Takeaway: keep in mind if product defaults to Kimi K2.7, but do not promote as the shared production prompt.

**v6 detail (self-check inside `<thinking>`):** the intended reliability guard did not generalize:
- Overall pass regressed hardest so far: `19/24` vs baseline `22/24`, with judged quality basically flat (`8.16` vs `8.18`).
- **Kimi K2.6 improved to 8/8** with q `8.50` and reasonable tokens, so the risk-check wording can help a model that follows it calmly.
- **GLM 5.2 collapsed to 4/8**, adding failures the baseline did not have: unresolved `./App`, bad default export import, missing `scroll-area`, and a runtime failure on tic-tac-toe.
- Kimi K2.7 stayed 7/8 but quality fell (q `8.43`→`7.86`), so even the stable model did not benefit.
- Takeaway: asking for an explicit risk check may consume attention or disturb output discipline. Do not promote; if we revisit, make it a hidden harness-side retry/fix step rather than prompt text.

**v7 detail (stricter output contract):** the first variant to beat baseline reliability, but not the champion:
- Overall pass improved to `23/24` vs baseline `22/24`; both Kimi models went **8/8**.
- The cost was visible: judged quality dropped (`8.18`→`7.78`), generation slowed (`13.8s`→`18.8s`), and output tokens rose (`3005`→`3290`).
- **GLM 5.2 regressed from 8/8 to 7/8**, still failing calculator with missing emitted files (`HistoryPanel`, `calc`).
- **Kimi K2.7 improved reliability** (7/8→8/8) while quality only softened (q `8.43`→`8.13`), so this may be worth a Kimi-only k=3 confirmation if reliability is the product priority.
- Takeaway: stricter output contract reduces format/path weirdness for Kimi, but the k=1 effect is not large enough and the quality/speed trade-off is too high for a universal prompt promotion. Keep `minimal-v1 × inline` as champion.

### 6.2 Fast-iteration recipe for prompt tweaks

The full 3-model × 8-prompt × judged explore run is the *confirmation* pass, not the iteration loop. For a ~1–2 minute smoke signal per tweak:

- **Reuse the baseline** — `minimal-v1` × `inline` numbers already exist (`rank-minimal-inline`, `explore-min-inline`); only run the new variant, compare against stored `results.jsonl`.
- **1 fast model, not 3** — a prompt tweak's effect is largely model-independent; smoke on Kimi K2.7-Code (~10–14s/gen), confirm on 3 only if promising.
- **Representative prompt subset** — run `--prompts` scoped to the failure modes the tweak targets (e.g. tweak 1: `settings-page-v1,data-table-v1,calculator-v1`), not all 8.
- **`--skip-judge` for mechanical tweaks** — tweaks 1, 4, 5 move pass-rate/speed/tokens, all visible without the vision judge; skipping it removes the per-cell judge latency. Add the judge back only for quality tweaks (2, 3).

Smoke example: `minimal-v2 × inline`, Kimi K2.7-Code, 5 prompts, `--skip-judge` ≈ **~75 seconds**. Escalate to the full judged 3-model run only when the smoke looks worth it.

**Durable harness fix (separate task):** the runner is serial today (one Playwright page, sequential cells). Generation is Together-API-bound, so parallelizing generation across ~3–5 workers (render stays serialized) would cut a 24-cell judged run from ~8–10 min to ~2–3 min — the right long-term answer once tweak iteration becomes frequent.

---

## 7. Review & approval record (2026-07-02)

**Approved.** The implementation was reviewed commit-by-commit (`f26e869` → `68c0b40`) against this plan, with fixes verified in code, not just by report:

- **Dataset (`scripts/benchmark/prompts.json`): approved as-is.** 8 prompts (counter canary + 7 core), all `expectedBehavior` items static-screenshot-checkable after the rewrite, no internal guidance leaked into user prompts. Locked under the append-only rule.
- **Harness: approved.** All review findings were fixed and independently verified: per-cell failure isolation (`cellError`), judge retry on empty/unparseable output (flakiness observed empirically: 1 of 3 probe calls returned empty), policy scan separated from the mechanical gate, variant-aware Tailwind tokenizer, viewport screenshots, coding-stream `firstTokenMs`, generated-file path sanitization.
- **Judge vision capability: verified empirically** — `moonshotai/Kimi-K2.7-Code` correctly described two different app screenshots via the Together API (probe script preserved at `tmp/vision-check.ts`).
- **Build health: verified independently** — `pnpm lint` and `pnpm exec next build` both pass after the TypeScript `5.9.3` pin (the `7.0.1-rc` regression predated this work, from commit `e7f80c6`).

**Open gates, in order — this is the to-do list:**

1. **Deploy verification** (launch item 5, the only unchecked launch item): push to the production host, smoke-test the deployed app — homepage generation with GLM 5.2, wasm preview renders, `/eval-harness` returns 404 unless `ENABLE_EVAL_HARNESS=1`. *Owner: Riccardo (needs deploy access). Before Monday.*
2. **Judge calibration by inspection** (§1.5, revised): run `--profile explore --models "zai-org/GLM-5.2"` (8 judged cells), generate the HTML report, Riccardo skims screenshots vs judge scores/rationales and says agree/disagree. No hand-labeling protocol. *Owner: Claude runs + reports, Riccardo skims.*
3. **Baseline rank run** (§4 step 5): `--profile rank`, all visible models, `current-v0`/`separate`. Deliverable: the model leaderboard (pass rate × quality × latency × tokens) answering "which models are good with today's prompt." *Unblocked the moment #2 is acceptable; results inform launch-week model choices.*
4. **Monday morning:** launch checklist sweep — deployed build healthy, GLM 5.2 default confirmed in prod, error overlay + "Try to fix" behave on a forced failure.
5. **Post-launch:** §4 steps 6–10 in order (prompt/pipeline modes → explore → re-rank vs baseline → lock defaults → delete Sandpack after one release).

Anything not listed here is §6 material. The benchmark exists as of today; from now on, changes to prompts, models, or renderer policy get measured, not argued.
