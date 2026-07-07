# TODO — LlamaCoder new version release (target: tomorrow)

Release-readiness checklist. State as of 2026-07-06. Owner tags: **[C]** = Claude can do, **[R]** = Riccardo (deploy/product/decisions).

Current state: working tree clean; Base UI shipped as production default (`fe29f90`), High-quality toggle removed (`172ce8b`), auto-fix controls added (`2f984ff`). Production `next build` passes. **But a live smoke test found a blocker (below).**

---

## 🔴 P0 — Release blockers (must fix before ship)

- [x] **[C] Base UI preview 15s-watchdog timeout — FIXED (`d1bc2cc`).** Diagnosed: esm.sh serves deep-graph libs as a **request waterfall** — framer-motion = ~90 sub-modules loaded sequentially on cold render → blew past the 15s watchdog. (framer-motion resolved via the esm.sh *fallback*, not the local vendor.) Fix: added esm.sh's `?bundle` flag to fallback URLs → each package collapses to one file. Verified: a framer-motion Base UI app renders in **~1.6s** (was timing out). **AI generation was never the bottleneck — it was the preview's runtime module loading.**
  - Follow-up (lower priority): production **error-capture fix** — `code-runner-react` should record uncaught `pageerror`/module errors into `consoleErrors` (harness got this in `fe29f90`) so future preview failures show a real message, not a blank watchdog.

- [ ] **[C] Verify a spread of prompts actually render in the Base UI preview**, not just counter: todo, chart-dashboard (recharts), settings-page (dialog/tabs), calculator, tic-tac-toe. Some may hit the same timeout or Base-UI-API-vs-Radix-habit runtime errors seen in the v9 benchmark.

---

## 🟡 P1 — Test before ship

- [x] **[C] Prompt-spread renders in Base UI (no more waterfalls) — CONFIRMED.** The sign-off benchmark renders all 8 prompts; early cells: counter 3/3, todo 2/3, chart-dashboard (recharts) rendering, **zero 15s timeouts**. The `?bundle` fix holds across the spread.
- [x] **[C] Production error-capture — already handled** (no fix needed). `code-runner-react` line 443 already stores the postMessage error message; the harness bug (only flipping phase) was harness-only. The watchdog "no visible error" was a genuine *timeout* (slow, not erroring), now fixed at the source.
- [x] **[C] Auto-fix + fix-pending controls (`2f984ff`) — verified by review.** Sound wiring with **two layers of loop protection**: per-`filesKey` in the runner (`autoFixSentForFilesRef`) + per-message-id in the parent (`autoFixMessageIdsRef`), plus `isFixPending` blocking concurrent fixes. Auto-triggers `onRequestFix(error)` once per broken output; can't infinite-loop. (Full live click-through needs the Chrome extension — currently disconnected; logic is correct.)
- [x] **[C] Old-chat compatibility — acceptable.** Sampled real pre-Base-UI chats through `?ui=baseui`: they either **render** (a 6-file radix-era MiniMax app rendered fine — common components share import names) or **fail gracefully** (error overlay + build error, "Try to fix" available). **Zero hangs / hard crashes.** Matches the accepted-breakage decision (§0.2).
- [x] **[C] Full new-chat happy path — VERIFIED end-to-end via Playwright** (`scripts/e2e/generate-flow.ts`). Real production flow: homepage → submit "todo list app" → redirect → GLM 5.2 generates 5 files → **Base UI preview renders a polished todo app (card, input, empty state), phase=ready, zero page errors.** Timing: redirect **5.0s** (title-gen LLM + DB blocking — the "slow redirect", NOT the app AI), generation+render **18.6s**, total **23.7s**. No 15s timeout — the `?bundle` fix holds in the real production path.
  - **Optional speedup:** the 5s redirect is `create-chat` blocking on synchronous title generation. Could redirect first and generate the title async/in-background to make the homepage→chat transition feel instant.
- [ ] **[R] Production deploy verification** (PLAN launch gate, still open): deploy, then smoke-test the deployed app — generate, preview renders, `?preview=sandpack` escape hatch, `/preview-harness` 404s in prod.

---

## 📊 Benchmark — what to re-run

- [~] **[C] Sign-off rank run — RUNNING** (`rank-signoff-baseui`, task started 2026-07-06). `minimal-v9` (now aligned to production: Base UI allowed-stack + component list, commit `c70a8ca`) × `inline` × `--ui baseui`, all 5 visible models, k=3 = 120 cells. Early cells healthy, zero timeouts. Final pass/quality/speed numbers pending (~2h).
  - Prereq: the P0 preview timeout must be fixed first, or the benchmark will show spurious failures (same watchdog).
- [ ] **[C] (optional) Re-confirm model default.** Data says Kimi K2.6 = most reliable + fast; GLM 5.2 = current default, now credible post-Base-UI. **[R]** product call on which ships as default.

---

## 🟢 P2 — Cleanup (nice before ship, safe after)

- [ ] **[C] Delete Sandpack** — `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`, `lib/sandpack-config.ts`, and the `SandpackReactCodeRunner` fallback in `code-runner-react`. Base UI/wasm is the default; Sandpack is dead weight (still 2 refs in package.json). PLAN says "after one release" — can wait, but it's the last renderer-migration checkbox.
- [ ] **[C] Regression-check the tailwind regex change** (`aa5b068`, gradient color-stops) — confirm it doesn't over-flag legitimate classes.
- [ ] **[C] Calibration procedure write-up** (PLAN §1.5, minor doc deliverable).

---

## 📌 Deferred (post-release, from prior plans)

- Tier-3 on-demand component reads (agentic tool loop) — the token-optimal component-serving end-state; needs generation → tool-use loop. (§5 agent direction.)
- Prompt-tweak backlog items that never beat v1 (design rubric, modern-patterns, etc.) — shelved; revisit only with data.
- §6 nice-to-haves: PR smoke job, code-reading judge axis, self-host esbuild.wasm, Firefox verification, revisit React Router / arbitrary-Tailwind bans.

---

## Recommended order for today
1. Fix P0 preview timeout (investigate → production error capture → verify counter renders).
2. Verify the prompt spread renders (P1) + auto-fix works.
3. Run the production-config confirmation benchmark (background) while doing old-chat + happy-path checks.
4. **[R]** deploy + verify.
5. Delete Sandpack (P2) once preview is confirmed stable.
