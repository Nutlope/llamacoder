# tcodex — usage feedback log

Running notes on delegating code changes to `tcodex` (Codex CLI routed to Together AI / GLM 5.2) from within this project's benchmark/prompt work. Maintained so the tcodex tool can be improved. Newest issues first; positives and patterns at the bottom.

## Invocation pattern that works

```
tcodex exec -s workspace-write -C /abs/repo "<tight, single-concern task with explicit files + guardrails>" < /dev/null 2>&1
```

Run in the background, then **health-check at ~60s** (see below), review the diff, run lint, commit. One file or one concern per task gives the cleanest reviews.

---

## Issues found (ranked by impact)

### 1. [HIGH] Hangs forever on stdin when backgrounded / non-interactive
**Symptom:** launched in the background without redirecting stdin, tcodex printed
`togetherlink ▸ Routing Codex → Together AI (GLM 5.2 · default)` then
`Reading additional input from stdin...` and blocked indefinitely — never started the task, produced no edits, consumed a wall-clock hour before we noticed.
**Trigger:** `tcodex exec ... "<prompt>"` with an open/inherited stdin and no TTY.
**Workaround:** append `< /dev/null` to every invocation. With stdin closed it runs cleanly every time.
**Suggested fix:** when `exec` is given the task as an argument AND stdin is not a TTY, do **not** block waiting for more stdin — treat the arg as the complete task. Or add a `--no-stdin` flag. This is the single biggest footgun; it cost the most time.
**Refinement (2026-07-04):** the log line `Reading additional input from stdin...` **also prints on healthy `< /dev/null` runs** — tcodex reads EOF immediately and proceeds. So that string alone is NOT a hang signal (my health check falsely flagged it). The true hang signal is: that line is the **last** line AND the output line-count stays frozen. Health check should watch for *frozen line count*, not the presence of the stdin message.

### 2. [MED] No fast failure signal — a bad start looks identical to a slow start
A hung/failed start and a legitimately-working task both look like "background process still running." Without tailing the log there's no way to tell in the first minute whether it even connected.
**Workaround adopted:** a scripted 60s health check — process alive + `grep "Routing Codex"` present (confirms it connected, not hung pre-connection) + no `command not found`/startup error in the log.
**Suggested fix:** emit an explicit machine-readable start marker (e.g. `TASK_STARTED`) once the task is accepted and the first model call is in flight, and a `TASK_FAILED_TO_START` on early bail. Would make supervision trivial.

### 3. [LOW] Wide cost variance per task; verbose/defensive style inflates tokens
Observed session costs for comparably-sized changes:
- shadcn-docs path fix (6 files, mechanical): **$0.10**
- generation.ts wiring (1 file): **$0.09**
- step-6 fixes (4 files): **$0.19**
- prompt-config builder (1 new file): **$0.51**
- minimal-v2 variant (3 files): **$1.64** (4.1M input tokens, 96% cached; 103k output)

The $1.64 task wrote unusually verbose JSDoc + defensive guard code, driving output tokens ~3–20× the others. Not a bug, but the model sometimes over-documents small changes. A "match surrounding comment density; don't over-explain" system nudge might cut cost.

### 4. [INFO] File-watchers see malformed intermediate states mid-edit
During the minimal-v3 edit, a JSDoc block was briefly malformed (a stray `*/` mid-comment) as tcodex rewrote it; it was correct by task end and lint passed. Not a tcodex defect — expected mid-write state — but worth knowing: **do not review or lint until the task reports done**, or you'll chase phantom errors.

---

## Positive observations (keep these)

- **Respects scope guardrails precisely.** Told to touch only 6 named files, it correctly left a 7th (`card.tsx`) with the same issue **untouched and flagged it** in its summary rather than silently overstepping. Exactly the right behavior — surfaced the gap for a human to decide.
- **Self-verifies with lint.** Runs `pnpm lint` at the end and reports the result honestly; the reported pass/fail has matched reality every time.
- **Good defensive engineering when unprompted.** For minimal-v2 it chose to render the base prompt then apply guarded string substitutions (throwing if the expected substring wasn't found) instead of branching the template — keeping the v1 path provably byte-identical. That's a genuinely thoughtful choice.
- **Clear change summaries.** End-of-task summaries accurately describe what changed per file, which makes review fast.
- **Follows tight specs well.** When given exact file-by-file instructions and verbatim text to insert, output matched the spec with no drift.

---

## Working recommendations for this project

1. Always `< /dev/null`.
2. One concern per task; give explicit file list + verbatim text for any creative content (keep taste decisions on the human/orchestrator side).
3. 60s health check after launch; kill + relaunch on a failed start.
4. Never lint/review mid-run; wait for the done signal.
5. Review the diff + re-run lint yourself before committing — the review step has caught real issues twice (a `server-only` import that would crash the benchmark; a 7th file needing the same fix).
