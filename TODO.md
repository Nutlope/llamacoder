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

- [ ] **[C] Smoke-test the new auto-fix + fix-pending controls** (`2f984ff`) — do they trigger on a real preview error and successfully re-generate? The preview error above is a perfect test case.
- [ ] **[C] Old-chat compatibility spot-check.** Existing stored chats were Radix-generated; opening them now renders through Base UI. Per accepted-breakage (§0.2) some will break — confirm the failure is *graceful* (error overlay + Try to fix), not a hard crash, and gauge how many break.
- [ ] **[C] Full new-chat happy path** on 2–3 models (GLM 5.2, Kimi K2.6): homepage → submit → redirect (measure) → generate → preview renders. Confirm redirect isn't slow (live test showed redirect < ~3s; AI generation is fast — the bottleneck is preview, not AI).
- [ ] **[R] Production deploy verification** (PLAN launch gate, still open): deploy, then smoke-test the deployed app — generate, preview renders, `?preview=sandpack` escape hatch, `/preview-harness` 404s in prod.

---

## 📊 Benchmark — what to re-run

- [ ] **[C] One confirmation rank run on the ACTUAL shipped config** — Base UI + production prompt (`buildProductionCodingPrompt`) × `inline`, all 5 visible models, k=3, `--ui baseui`. Every prior run tested pieces; nothing has benchmarked the exact production config end-to-end. This is the release-signoff number (pass rate + quality + speed). ~2h background.
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
