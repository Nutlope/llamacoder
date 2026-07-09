# URGENT — Preview rendering fixes

## 0. THE MASTER ROOT CAUSE (found 2026-07-09, FIXED): rAF-based readiness

The recurring fake "Preview did not report ready or error within 60s" was
ultimately caused by the ready pipeline running on `requestAnimationFrame`:
the app-ready trailer, the bridge's load handler, and the tailwind-ready
watch in `lib/preview/html.ts` were all rAF-driven. Chrome fully suspends
rAF in hidden/occluded tabs — and users tab away during a 60-90s generation
almost every time — so the preview loaded in the background, rAF never
fired, `ready` never posted, the watchdog fired, and auto-fix sent a bogus
"code is not working" message into the chat. Reproduced live with
`visibilityState: "hidden"`: rAF suspended even in the parent page.

FIXED: readiness now uses timers (setTimeout polling), which keep running in
hidden tabs (throttled to ~1s ticks, which is fine). Verified: preview
reaches ready in ~940ms with the tab fully hidden.

Related hardening in the same pass: the runner's `ready` handler now flips
phase FIRST and wraps auxiliary work (paint nudge, CSS store, metrics) in
try/catch — a stale-HMR ReferenceError inside that handler was observed
eating ready messages, which produced identical fake-60s symptoms.

## Remaining speed opportunities (found while profiling, NOT yet done)

- **Pre-warm the preview during streaming**: the runner only mounts when the
  Preview tab is first opened (`hasOpenedPreview` in code-viewer.tsx), and
  during streaming the app sits on the Code tab — so the first preview boot
  (vendor fetches, tailwind compile, HTTP cache) all happens AFTER
  generation finishes. Mounting the hidden runner as soon as files exist
  would make the post-generation preview appear near-instantly.
- **`@import "tailwindcss"` triggers a real fetch**: the browser Tailwind
  build resolves it as a relative URL — observed request to
  `/chats/tailwindcss`, which Next SSRs via the `/chats/[id]` route (633ms
  warm, worse cold, plus pointless server load). Investigate dropping the
  import line or serving a tiny static stub.
- **Same-process iframe blocks the app's main thread**: the sandboxed srcdoc
  iframe shares the renderer with the chat UI; cold tailwind compiles and
  big vendor evals visibly freeze the parent page. Long-term: serve previews
  from a separate origin so Chrome gives them their own process.

Findings from the 2026-07-08 preview investigation. The bundling pipeline and its
caches work; the pain comes from how the preview is mounted, how failures inside
the iframe are (not) reported, and a cache that silently dies over time.

Items 0a and 0b were REPRODUCED AND CONFIRMED live in Chrome against the
running dev server (via /eval-harness + `window.renderFiles`), with mutation
observers and postMessage spies.

STATUS 2026-07-08: #0a, #0b, #1, #3 and #4 are FIXED on this branch and
verified end-to-end in Chrome with a real GLM 5.2 generation (pomodoro app):
cold preview ready in 883ms (was 5.4s+), warm page reload ready in 447ms,
repeat render of identical files ready in ~160ms (was a 60s watchdog failure),
Code<->Preview toggle causes zero iframe reloads. #2 is also FIXED:
`findMissingPreviewModules` (lib/preview/html.ts) validates every bare import
in the bundle output against the import map before the srcdoc is written —
an app importing e.g. `three` now errors in ~100ms with an actionable message
instead of hanging 60s — plus a script-element error listener in the srcdoc
catches module fetch failures (CDN/network) that never fire window errors.
Still open: #5 polish items only.

## 0a. CONFIRMED: identical srcdoc never reloads the iframe → false "did not report ready within 60s"

**Where:** `app/(main)/eval-harness/eval-harness-client.tsx` and
`components/code-runner-react.tsx` (same pattern in both).

**Repro (observed live):** call `renderFiles` twice with the same files. Second
run: bundle cache hits, `setSrcdoc("")` and `setSrcdoc(content)` land in one
React commit, and since `content` is byte-identical to the current attribute,
React never touches the DOM. Observed with a MutationObserver + load listener:
**srcdoc attribute never mutated, iframe never fired `load`, zero postMessages**.
The old document keeps rendering (the app LOOKS fine!), nothing ever posts
`ready`, and the 60s watchdog reports the code as broken. With unique file
content the same flow works end-to-end (srcdoc mutation → load →
document-loaded → tailwind-ready → ready).

This is why "we generate an app and it always says the code is not working":
any re-render whose bundle output is unchanged (eval/benchmark re-runs of the
same app, chat effect re-runs where the changed file is externalized —
`components/ui/*`, `package.json`, etc. — or any same-files remount that keeps
the iframe element alive) hangs for the full 60s and then reports a bogus
failure. The better our caches got, the more often this fired.

**Fix:** short-circuit when the new srcdoc equals the current one: don't reload,
just transition straight to `ready` (the content is already live). Optionally
also embed a per-run nonce comment in the srcdoc when a forced reload is
actually wanted (Refresh button already remounts via `key`).

## 0b. CONFIRMED: tailwind-ready probe can never pass → every preview wastes its full 5s timeout

**Where:** `lib/preview/html.ts`, `waitForTailwindReady` (added in HEAD commit
517ee71 "add tailwind ready watch").

**Repro (observed live):** fresh app renders and is fully styled at ~400ms, but
`tailwind-ready` arrives at exactly ~5351ms — the 5000ms timeout, not a real
signal. The `ready` message is gated on BOTH app-ready and style-ready
(`maybePostPreviewReady`), so **every preview shows the blocking overlay ~5s
longer than necessary**, cold or cached.

**Why:** the probe div (`grid rounded-md bg-zinc-50 p-6`) is appended, measured
synchronously with `getComputedStyle`, and removed in the same frame. Tailwind
v4 browser compiles classes asynchronously from DOM it can scan — an ephemeral
node is gone before the scanner sees it, so those classes never enter the
stylesheet and the check fails on every rAF tick until timeout. Verified: the
identical probe left ATTACHED for 500ms reports fully compiled styles
(display:grid, radius 8px, bg oklch), while the synchronous read reports
nothing compiled.

**Fix:** keep ONE persistent probe element attached (e.g.
`position:fixed; left:-9999px`) and poll its computed style in the rAF loop,
removing it only after ready fires. tailwind-ready then lands in ~100-300ms.
Also make the precompiled-CSS path (cached Tailwind) skip the probe entirely —
the CSS is inline in `<head>`, there is nothing to wait for.

## 1. Tab switch destroys and reboots the whole preview (biggest UX win)

**Where:** `app/(main)/chats/[id]/code-viewer.tsx` (~line 355)

**What happens:** Code vs Preview panes are a ternary
(`activeTab === "code" ? <SyntaxHighlighter/> : <CodeRunner/>`). Switching to
Code **unmounts the CodeRunner and its iframe**. Switching back mounts a brand
new runner at `phase: "bundling"`, so the "Bundling preview... / Running..."
overlay shows on every toggle, and the iframe boots from zero: parse import
map, fetch/instantiate vendor ES modules, run React, run the
`waitForTailwindReady` probe loop. The bundle/Tailwind caches all hit — they
make bundling fast, but they cannot make an iframe reboot free.

**Fix:** Keep BOTH panes mounted; toggle visibility with CSS (`hidden` /
`display:none`). An iframe reloads if its node is detached, so it must
genuinely stay in the tree. Mount the preview lazily on first open; keep
`key={refresh}` so the Refresh button still forces a real reboot.

## 2. Silent 60s watchdog: module-load failures never reach the error bridge

**Where:** `lib/preview/html.ts` (ERROR_BRIDGE) + `components/code-runner-react.tsx`
(`PREVIEW_WATCHDOG_MS = 60_000`) + `app/(main)/eval-harness/eval-harness-client.tsx`
(same 60s watchdog).

**Symptom:** "Preview did not report ready or error within 60s" even though the
generated code is fine — looks like the app is broken when it's actually a
loading failure.

**Status update after browser repro:** the dominant cause of the 60s error is
#0a (identical srcdoc, confirmed). The gaps below are still real (a module that
fails to LOAD posts no error), but they were not the reproduced failure mode —
treat this section as hardening, not the primary fix.

**Root cause (hypothesis, partially superseded by #0a):** the bridge listens for
`window` `error` + `unhandledrejection` events, but those do NOT fire when the
inline `<script type="module">` fails to LOAD rather than to run:

- generated app imports a bare specifier that is not in the import map
  (anything outside PREVIEW_DEPS / baseui vendor list) → unresolvable
  specifier kills the module script;
- a vendor file 404s or an esm.sh request hangs/fails on cold cache;
- any static `import` in the bundled output that can't be fetched.

In all these cases the module never executes, `__previewMarkAppReady` is never
called, no `error` message is posted → the parent waits the full 60s and shows
a misleading error.

**Fixes:**
- Bridge the gap: also listen for module-script load failures. Options:
  attach `onerror` on the module `<script>` element; add a fallback timer
  INSIDE the iframe (e.g. 10s) that posts `error` with
  `performance.getEntriesByType("resource")` failures included; and/or
  validate at bundle time that every external specifier in the output is
  covered by the import map and fail fast with a clear message ("app imports
  `three` which isn't available in the preview").
- The bundle step already knows every external specifier — the import-map
  validation can run entirely in the parent before writing srcdoc. Prefer this:
  instant, precise error instead of any watchdog wait.
- Consider dropping the watchdog to ~15-20s once load failures are surfaced
  properly; 60s only exists because real failures were invisible.

## 3. localStorage Tailwind CSS cache silently dies at quota

**Where:** `components/code-runner-react.tsx` (`storeCompiledPreviewCss`,
`setCachedPreviewTailwindCss`)

**What happens:** compiled-CSS snapshots up to 1MB each are stored under a new
localStorage key per app version / kit / vendor, with no eviction. localStorage
quota is ~5MB, so after a couple dozen entries `setItem` throws, the catch
swallows it, and the persistent cache stops working forever — every session is
a cold in-iframe Tailwind compile again ("it feels like nothing is cached").

**Fix:** evict old `llamacoder-preview-tailwind-css:` keys (prefix scan + LRU
by timestamp, cap ~10 entries), or better: move this cache into the existing
IndexedDB `llamacoder-preview` DB (bundles store already there, much larger
quota).

## 4. Streaming re-bundles on every chunk

**Where:** `code-viewer.tsx` (never passes `previewDebounceMs`) +
`code-runner-react.tsx` (`previewDebounceMs = 0` default)

**What happens:** with the Preview tab open during streaming, every chunk
changes `filesKey` → full re-bundle + iframe reload per chunk.

**Fix:** pass a debounce (~300-500ms) while `streamText` is non-empty. The prop
is already plumbed through.

## 5. Smaller items

- **Overlay is all-or-nothing:** even a warm re-run covers the old preview with
  a blocking blur overlay. Once #1 lands this mostly disappears; if re-runs
  are still visible, prefer stale-while-revalidate (keep old iframe visible,
  swap srcdoc when the new bundle is ready) with a small corner spinner.
- **`filesKey`** (`files.map(path+content).join("")`) builds a giant string
  every render for large apps; cheap hash would do. Minor.
- **Watchdog message** should distinguish "iframe never loaded vendor modules"
  from "app code ran but never signaled ready" — after #2 these are separable.

## Suggested order

1. #0a same-srcdoc short-circuit (kills the false "60s not ready" failures)
2. #0b persistent tailwind probe (removes the flat +5s on every preview)
3. #1 CSS-toggle tabs (removes the overlay-on-every-switch, feels instant)
4. #2 surface module-load failures + import-map validation (hardening)
5. #3 Tailwind cache eviction / IndexedDB migration
6. #4 streaming debounce
7. #5 polish
