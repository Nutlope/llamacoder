# TODO — LlamaCoder new version release (target: tomorrow)

Release-readiness checklist. State as of 2026-07-08. Owner tags: **[C]** = Claude can do, **[R]** = Riccardo (deploy/product/decisions).

Current state: working tree clean on `new-models-new-renderer`. Base UI is the production default; preview timeout fixed; code-fence parser hardened; Hallmark design rubric shipped; model picker refreshed. Production `next build` passes; `pnpm test` green. **No known blockers — remaining work is the [R] deploy smoke test.**

Recent commits: `4aae298` model picker refresh · `3b10d4c` Hallmark rubric · `50833d9`/`fcf4177` next-line `{path=...}` parsing · `3c0875f` glued-fence fix + watchdog 60s · `25d19a9` demo prompts.

---

## 🔴 P0 — Release blockers

- [x] **[C] Base UI preview 15s-watchdog timeout — FIXED (`d1bc2cc`).** esm.sh served deep-graph libs (framer-motion ≈ 90 sub-modules) as a sequential request waterfall → blew past the watchdog. Fix: esm.sh `?bundle` flag collapses each package to one file. Verified ~1.6s render.

- [x] **[C] Broken preview from glued/misplaced code fences — FIXED (`3c0875f`, `fcf4177`, `50833d9`).** Real chats hit "Preview did not report ready or error within 15s" because GLM sometimes (a) glues the opening fence onto the prose line (`...elements.\`\`\`tsx{path=...}`) or (b) puts `{path=...}` on the line *after* a bare ` ```tsx `. The line-anchored UI parser (`parseReplySegments`) dropped/merged files → missing module → silent watchdog. Fix: `normalizeFenceOpeners` + next-line-attribute handling, applied in both parsers so they agree. Unit tests in `lib/utils.test.ts` (`pnpm test`). Also bumped the preview watchdog **15s → 60s** (headroom for cold heavy-dep bundles like recharts+d3).

- [x] **[C] Hallmark design rubric shipped (`3b10d4c`).** GLM apps came out flat/white/barebone — the earlier v10 rubric's "keep everything neutral" line actively suppressed color. Replaced production `## Design` with `HALLMARK_DESIGN_SECTION` (real palette, depth/tinted surfaces, serif display type, biased layout, dodge the AI tells), informed by usehallmark.com. Shared with `minimal-v11` (no drift). Visual A/B on GLM (dashboard + todo): dramatic win — color, serif headings, populated charts, richer layout.

- [x] **[C] Prompt spread renders in Base UI — CONFIRMED.** Sign-off benchmark rendered all 8 prompts across 5 models, zero 15s timeouts; the `?bundle` fix holds across the spread.

---

## 🟡 P1 — Verified this cycle

- [x] **[C] All selectable models create correct apps — VERIFIED.** Every homepage model, exact production path (`buildProductionCodingPrompt` + Hallmark, temp 0.4, 13000 max_tokens), Expense Tracker prompt, rendered `phase=ready`, zero page errors. GLM/Kimi/Nemotron polished; MiniMax/Kimi K2.6 seeded colorful charts.
- [x] **[C] Model picker refreshed (`4aae298`).** New set: **GLM 5.2 (default), Kimi K2.7 Code, Kimi K2.6, Nemotron 3 Ultra, Qwen3.7 Max ("slower")**. Dropped MiniMax M3 + old Qwen 235B from the picker (slow/inconsistent serverless throughput; kept as hidden entries so old chats + `MODEL_ALIASES` still resolve). See "Model latency findings" below.
- [x] **[C] Full new-chat happy path — VERIFIED end-to-end via Playwright** (`scripts/e2e/generate-flow.ts`). homepage → submit → redirect → GLM generates → Base UI preview renders, `phase=ready`, zero errors. Redirect ~5s (title-gen + DB), generation+render ~18.6s.
  - **Optional speedup:** the 5s redirect is `create-chat` blocking on synchronous title generation — could redirect first, generate title async.
- [x] **[C] Auto-fix + fix-pending controls (`2f984ff`) — verified by review.** Two layers of loop protection (`autoFixSentForFilesRef` + `autoFixMessageIdsRef` + `isFixPending`); triggers once per broken output, can't infinite-loop. This is also the safety net that recovers the occasional model build error (e.g. a mis-wired import).
- [x] **[C] Old-chat compatibility — acceptable.** Pre-Base-UI chats through `?ui=baseui` either render or fail gracefully (error overlay + "Try to fix"); zero hangs/hard crashes.
- [ ] **[R] Production deploy verification** (launch gate — the one open item): deploy, then smoke-test the deployed app:
  - Generate on **each** of the 5 picker models; confirm preview renders. **Watch Nemotron 3 Ultra specifically** — the Together SDK `.stream().finalContent()` helper intermittently threw `missing finish_reason` in the *test harness*; production uses the raw `create({stream:true}).toReadableStream()` path (same as GLM/Kimi, unaffected in principle), but confirm a Nemotron generation completes cleanly.
  - Confirm `?preview=sandpack` escape hatch works and `/preview-harness` 404s in prod (`ENABLE_PREVIEW_HARNESS` not set on Vercel).

---

## 📊 Model latency findings (why MiniMax M3 + Qwen 235B were dropped)

- Root cause is **Together serverless throughput, not bad output** — both produce correct apps. Measured tok/s (single samples, high variance): GLM ~230 · Nemotron ~117 · Qwen3.7 Max/Plus ~56 · MiniMax M3 ~40–75 · old Qwen 235B ~38.
- At ~38 tok/s a near-max generation ≈ 340s → **over the 300s edge-function limit** → hard timeout. MiniMax swung 32s→251s on the *same* prompt.
- **Reducing `max_tokens` does NOT help** (tested): time is throughput-bound; a lower cap only truncates the app (`finish=length`, broken). Reverted that experiment.
- New models tested (production path + render): **Nemotron 3 Ultra** = fast (117 tok/s) + correct but plainer → added. **Qwen3.7 Max** = best-looking output of all, ~56 tok/s → added, flagged "slower", replaces old Qwen 235B. Qwen3.7/3.6 Plus = medium, fine. **DeepSeek V4 Pro** = neither fast nor pretty → skipped.
- **Don't over-prompt Nemotron:** an aggressive "seed data + populate charts" design boost made it *more ambitious* (6–8 files) but broke the build 2/2 (missing export; re-emitted forbidden `lib/utils.ts`). Keep it on the standard rubric — it's the fast/functional pick, not the looker.

---

## 📊 Benchmark

- [x] **[C] Sign-off rank run — DONE** (`rank-signoff-baseui`, `minimal-v9 × inline × baseui`, 5 models × 8 prompts × k=3). 111/120 judged, avg quality **8.03/10**, none below 7.7: Kimi K2.7 8.45 · MiniMax 8.09 · Kimi K2.6 8.08 · Qwen 235B 7.75 · GLM 5.2 7.73. Base UI stack holds. (Ran on v9 without the Hallmark rubric.)
- [ ] **[C] (optional) Judge-scored Hallmark regression** — v10-vs-v11 (or vs v9) k=3 on GLM to confirm the richer design didn't dent functional quality. Shipped on visual evidence; low risk (additive guidance).

---

## 🟢 P2 — Cleanup (safe after ship)

- [ ] **[C] Delete Sandpack** — `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`, `lib/sandpack-config.ts`, `SandpackReactCodeRunner` fallback. Base UI/wasm is default; Sandpack is dead weight. Last renderer-migration checkbox.
- [ ] **[C] Replace hand-rolled Tailwind candidate extraction** with Tailwind's own scanner (post-release note from the padding-fix work).
- [ ] **[C] Regression-check the tailwind gradient-stop regex** (`aa5b068`) — confirm it doesn't over-flag legitimate classes.

---

## 📌 Deferred (post-release)

- Tier-3 on-demand component reads (agentic tool loop).
- §6 nice-to-haves: PR smoke job, code-reading judge axis, self-host esbuild.wasm, Firefox verification.

---

## Recommended order
1. **[R]** Deploy + smoke test the 5 picker models (watch Nemotron), preview render, sandpack escape hatch, harness 404s in prod.
2. (Optional) Judge-scored Hallmark regression while deploying.
3. Post-release: delete Sandpack, swap in Tailwind's scanner.
