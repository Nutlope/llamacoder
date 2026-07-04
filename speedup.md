# Preview Speedup Plan

Goal: make normal wasm renderer previews feel fast while keeping `/preview-baseui` as the heavy all-components stress test.

## Current Baseline

Observed on `/preview-baseui?debug=1`:

```text
phase ready
prep ~500ms
bundle ~225ms
iframe ~2800ms
load ~2940ms
style ~3000ms
total ~3350ms
resources 250
css rules 148
```

Interpretation:

- Bundling is not the main bottleneck.
- `prep` includes a fixed `300ms` debounce.
- The largest cost is iframe/module/runtime loading.
- The full Base UI gauntlet loads about `250` resources, mostly `esm.sh` modules.
- Tailwind browser compilation is also a major contributor.

## Current Status - 2026-07-04

Implemented:

- Repeatable benchmark script: `scripts/preview/benchmark-baseui-preview.ts`.
- `0ms` debounce support for wasm/Base UI preview runs.
- Local `esbuild.wasm` loading from `/preview-vendor/esbuild/esbuild.wasm`.
- Local Tailwind/shadcn style assets instead of CDN style imports.
- Local Base UI dependency vendor and local `@/components/ui/*` component vendor.
- Bundle cache in memory plus IndexedDB.
- Base UI component externalization so generated apps can still import `@/components/ui/*`, while injected component files do not get rebundled into the generated app bundle.
- Benchmark metrics for bundle cache hits, input file count, input/cache-key bytes, and output JS/CSS bytes.

Latest kept cold local run:

```text
file: benchmark-results/preview-speedup-2026-07-04T17-14-11-284Z.json

minimal   total  980ms  bundle 238ms  resources  48  esm 0  cdn 0  input  1kb  output  4kb
typical   total 1000ms  bundle 206ms  resources 107  esm 0  cdn 0  input  4kb  output 13kb
heavy     total 1049ms  bundle 209ms  resources  95  esm 0  cdn 0  input  4kb  output 13kb
gauntlet  total 1269ms  bundle 229ms  resources 224  esm 0  cdn 0  input 34kb  output 110kb
```

Latest kept warm-cache local run:

```text
file: benchmark-results/preview-speedup-2026-07-04T17-14-56-645Z.json

minimal   cold  900ms  warm  72ms  cache hits 1/2  resources  48
typical   cold  943ms  warm 108ms  cache hits 1/2  resources 107
gauntlet  cold 1308ms  warm 294ms  cache hits 1/2  resources 224
```

Production-minified vendor update:

```text
file: benchmark-results/preview-speedup-2026-07-04T17-41-56-144Z.json
server: next start --port 3101

minimal   cold 1314ms  warm  91ms  resources  47  errors 0
typical   cold 1404ms  warm 129ms  resources 106  errors 0
gauntlet  cold 1753ms  warm 268ms  resources 223  errors 0
```

Production-mode precompilation shrank the local vendor artifacts substantially:

```text
react-dom-client.js 983kb -> 176kb
recharts.js         1.3mb -> 565kb
lucide-react.js     1.1mb -> 627kb
base-ui-react.js    307kb -> 105kb
dialog wrapper        7kb ->   5kb
```

This did not lower request count, but it reduces parse/evaluation payload and removes development React warnings from the benchmark (`errors 0` in the production-server run). It helps the heavier gauntlet hot path and keeps the typical hot path well under the `1500ms` target, though not always faster than the earlier noisy dev-server hot sample.

Compiled Tailwind CSS cache update:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-02-03-148Z.json
server: next start --port 3103

minimal   cold 1267ms  warm 45-47ms   css cache hits 2/3  resources 47 -> 45  errors 0
typical   cold 1310ms  warm 86-93ms   css cache hits 2/3  resources 106 -> 104 errors 0
gauntlet  cold 1781ms  warm 210-268ms css cache hits 2/3  resources 223 -> 221 errors 0
```

The first render still uses Tailwind browser so generated dynamic classes work. When the iframe reports `ready`, the parent stores the compiled CSS in `localStorage` under a hash of the generated files. Subsequent renders of the same generated app inject plain compiled CSS and skip the Tailwind browser resources. This is the strongest hot-path result so far for normal repeated preview rendering.

Style-signature CSS cache update:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-07-42-171Z.json
server: next start --port 3104

minimal   cold  763ms  warm 41-43ms   bundle cache hits 2/3  css cache hits 2/3  resources 47 -> 45
typical   cold  858ms  warm 59-66ms   bundle cache hits 2/3  css cache hits 2/3  resources 106 -> 104
gauntlet  cold 1079ms  warm 149-152ms bundle cache hits 2/3  css cache hits 2/3  resources 223 -> 221
```

The compiled CSS cache key now uses a style signature made from file paths, import specifiers, and likely Tailwind utility tokens instead of hashing the full source text. That keeps the CSS cache reusable when copy changes but imports/classes do not.

Copy-only mutation run:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-06-49-563Z.json
server: next start --port 3104

minimal   cold  742ms  copy-edit warm 239-285ms  bundle cache hits 0/3  css cache hits 2/3
typical   cold  789ms  copy-edit warm 271-291ms  bundle cache hits 0/3  css cache hits 2/3
gauntlet  cold 1017ms  copy-edit warm 408-443ms  bundle cache hits 0/3  css cache hits 2/3
```

This is the important "app changed, component/class surface stayed the same" result. The generated app bundle correctly misses cache because source text changed, but Tailwind compilation is skipped after the first render. Typical generated-app rendering-to-content stays under `300ms` for these copy-only edits.

Server-side Tailwind v4 precompile update:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-19-36-465Z.json
server: next start --port 3107

minimal   cold  795ms  warm 39-51ms    resources 45  css precompile 71ms
typical   cold  776ms  warm 66-70ms    resources 104 css precompile 13ms
gauntlet  cold 1023ms  warm 155-157ms  resources 221 css precompile 11ms
```

The local Base UI path now calls `/api/preview-tailwind` before writing the iframe when no compiled CSS is present in browser storage. The API uses the Tailwind v4 compiler from the `tailwindcss-v4` alias, builds CSS from the same preview theme plus extracted candidates from the generated app and Base UI kit files, and caches by style signature. That means the iframe receives plain CSS on the first render and skips `@tailwindcss/browser` completely.

Compared with the prior fixed production run (`preview-speedup-2026-07-04T18-07-42-171Z.json`):

```text
minimal   cold 763ms -> 795ms   resources 47 -> 45
typical   cold 858ms -> 776ms   resources 106 -> 104
gauntlet  cold 1079ms -> 1023ms resources 223 -> 221
```

Minimal is basically flat/noisy, while typical and gauntlet cold rendering improve and all first renders remove the Tailwind browser resources. The cache now also avoids re-storing CSS collected from already-precompiled iframes, which keeps CSS rule counts stable across warm renders.

Copy-only mutation after server precompile:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-20-24-559Z.json
server: next start --port 3107

minimal   cold 730ms  copy-edit warm 242-311ms  bundle cache hits 0/3  css cache hits 3/3
typical   cold 804ms  copy-edit warm 271-282ms  bundle cache hits 0/3  css cache hits 3/3
gauntlet  cold 978ms  copy-edit warm 407-449ms  bundle cache hits 0/3  css cache hits 3/3
```

Copy-edit timing is roughly unchanged versus the style-signature cache result because source edits still require an esbuild run. The win is that CSS is already available on first render and can also come from the API cache in about `1ms` when the server has seen that style signature.

Server native prebundle update:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-30-30-886Z.json
server: next start --port 3111

minimal   cold 286ms  warm 66ms   bundle 181ms -> 0ms  source server-none -> server-memory
typical   cold 143ms  warm 64ms   bundle   5ms -> 0ms  source server-none -> server-memory
gauntlet  cold 377ms  warm 160ms  bundle  29ms -> 0ms  source server-none -> server-memory
```

The local Base UI path now tries `/api/preview-bundle` before falling back to browser `esbuild-wasm`. The API uses native `esbuild` on the Next server, with `serverExternalPackages: ["esbuild"]` so Turbopack does not bundle the native binary. The output shape and virtual filesystem rules mirror the wasm bundler, including externalized Base UI component imports.

This removes browser wasm initialization from the successful local Base UI path:

```text
previous instrumented run: ensure ~230-263ms
server prebundle run:      ensure 0ms
```

Copy-only mutation after server native prebundle:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-31-16-516Z.json
server: next start --port 3111

minimal   copy-edit 46-108ms  bundle 3-4ms
typical   copy-edit 76-131ms  bundle 4-8ms
gauntlet  copy-edit 182-334ms bundle 20-33ms
```

Compared with the previous browser-wasm copy-edit run (`preview-speedup-2026-07-04T18-20-24-559Z.json`):

```text
minimal   warm copy-edit ~242-311ms -> ~46-58ms after first mutation
typical   warm copy-edit ~271-282ms -> ~76-87ms after first mutation
gauntlet  warm copy-edit ~407-449ms -> ~182-208ms after first mutation
```

This is the largest renderer-to-content improvement so far. The browser wasm renderer is still present as fallback, but the preferred local Base UI route now prebundles generated app code on the server and ships the already-built module to the iframe.

Wrapper inlining experiment:

```text
external control:
file: benchmark-results/preview-speedup-2026-07-04T18-35-10-120Z.json
server: next start --port 3112

typical   cold 246ms  warm 79ms   resources 104  output  13kb
gauntlet  cold 363ms  warm 163ms  resources 221  output 110kb

inline components:
file: benchmark-results/preview-speedup-2026-07-04T18-35-42-498Z.json
server: next start --port 3112

typical   cold 147ms  warm 82ms   resources  94  output  93kb
gauntlet  cold 338ms  warm 153ms  resources 156  output 708kb
```

Inlining Base UI wrapper files into the server-produced generated app bundle does reduce requests, but it makes the generated JS much larger. The copy-edit control makes the default decision clearer:

```text
external copy-edit:
file: benchmark-results/preview-speedup-2026-07-04T18-37-29-585Z.json

minimal   copy-edit 40-79ms   output   4kb  resources 45
typical   copy-edit 75-122ms  output  13kb  resources 104
gauntlet  copy-edit 179-317ms output 110kb  resources 221

inline copy-edit:
file: benchmark-results/preview-speedup-2026-07-04T18-36-35-486Z.json

minimal   copy-edit 60-129ms  output  22kb  resources 42
typical   copy-edit 107-181ms output  93kb  resources 94
gauntlet  copy-edit 200-319ms output 708kb  resources 156
```

Decision: keep external Base UI wrappers as the default. The resource drop is real, especially for gauntlet, but typical generated apps get slower on copy edits because the larger generated JS has more parse/eval work. The `bundle=inline-components` preview switch remains useful as a benchmark/debug lever, but it is not the preferred path for normal rendering.

Selective leaf-wrapper inlining experiment:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-41-49-486Z.json
server: next start --port 3113

minimal   cold 187ms  warm 51ms   resources 45   output   4kb
typical   cold 137ms  warm 69ms   resources 104  output  13kb
gauntlet  cold 338ms  warm 225ms  resources 221  output 110kb
```

The `bundle=inline-leaf` mode keeps a small inline set (`button`, `card`, `input`, `textarea`, `table`, `badge`, `label`, `separator`, `skeleton`, `kbd`, `typography`, and `lib/utils`) while keeping heavy interactive wrappers external.

Copy-only mutation:

```text
file: benchmark-results/preview-speedup-2026-07-04T18-42-44-542Z.json
server: next start --port 3113

minimal   copy-edit 46-136ms  resources 45   output   4kb
typical   copy-edit 67-138ms  resources 104  output  13kb
gauntlet  copy-edit 176-316ms resources 221  output 110kb
```

Decision: reject `inline-leaf` as a default. It keeps the bundle small, but it does not reduce resource count versus the external default. The likely reason is that the selected wrappers are not the load-bearing request graph; their dependency imports and the remaining heavy wrapper/vendor graph dominate. The switch is still useful for experiments, but normal rendering should stay on `bundle=external`.

Flat dependency vendor experiment:

```text
local split control:
file: benchmark-results/preview-speedup-2026-07-04T18-59-51-298Z.json
server: next start --port 3116

typical   cold 137ms  warm 68-71ms    resources 104  errors 0
gauntlet  cold 312ms  warm 155-185ms  resources 221  errors 0

flat no-split dependency vendor:
file: benchmark-results/preview-speedup-2026-07-04T18-59-51-298Z.json

typical   cold 118ms  warm 53ms       resources  27  errors 0
gauntlet  cold 295ms  warm 149-150ms  resources 113  errors 0
```

The first flat attempts proved why React singleton correctness matters: bundling every flat entry independently gave fast-looking numbers, but only because the app crashed early with null React hook dispatchers. Marking React as external then produced a browser-unsafe dynamic `require("react")`. The working fix is to build flat entries with virtual ESM shims for shared React-family imports and preserve the private React/ReactDOM internals that `react-dom/client` reads during initialization.

Copy-only mutation:

```text
file: benchmark-results/preview-speedup-2026-07-04T19-01-20-649Z.json
server: next start --port 3116

minimal   local 52ms  resources  45  -> flat 52ms  resources  12
typical   local 145ms resources 104  -> flat 61ms  resources  27
gauntlet  local 187ms resources 221  -> flat 142ms resources 113
```

Decision: promote `vendor=flat` as the default Base UI wasm vendor. Keep `vendor=local` available in `/preview-baseui` as the split-vendor fallback/comparison path.

Post-flat wrapper inlining retest:

```text
external flat control:
file: benchmark-results/preview-speedup-2026-07-04T19-08-48-443Z.json
server: next start --port 3119

typical   cold 205ms  warm 52-53ms    resources  27  output  13kb
gauntlet  cold 346ms  warm 134-143ms  resources 113  output 110kb

inline-used:
file: benchmark-results/preview-speedup-2026-07-04T19-09-28-838Z.json

typical   cold 118ms  warm 57-61ms    resources 17  output  93kb
gauntlet  cold 318ms  warm 133-143ms  resources 50  output 704kb

inline-leaf:
file: benchmark-results/preview-speedup-2026-07-04T19-10-20-175Z.json

minimal   cold 76ms   warm 32-41ms    resources   9  output  22kb
typical   cold 119ms  warm 50-64ms    resources  21  output  45kb
gauntlet  cold 313ms  warm 133-136ms  resources 102  output 153kb
```

The selective inlining bug was that the virtual resolver still externalized paths after the inline allowlist check. Fixing that made `bundle=inline-leaf` and the new `bundle=inline-used` mode actually inline their selected wrapper files. The result is useful as a diagnostic lever, but not a default improvement: `inline-used` reduces requests strongly while growing generated JS too much, and `inline-leaf` improves request count with only mixed timing wins.

Copy-only mutation:

```text
external:
file: benchmark-results/preview-speedup-2026-07-04T19-11-11-728Z.json

minimal   60ms   resources  12  output   4kb
typical   65ms   resources  27  output  13kb
gauntlet  171ms  resources 113  output 110kb

inline-leaf:
file: benchmark-results/preview-speedup-2026-07-04T19-11-51-960Z.json

minimal   35ms   resources   9  output  22kb
typical   66ms   resources  21  output  45kb
gauntlet  167ms  resources 102  output 153kb
```

Decision: keep `bundle=external` as the default even with flat vendor. Keep `bundle=inline-leaf` and `bundle=inline-used` as benchmark/debug switches for resource-count experiments.

Inline sourcemap removal:

```text
external flat after sourcemap removal:
file: benchmark-results/preview-speedup-2026-07-04T19-14-22-189Z.json
server: next start --port 3120

minimal   cold 163ms  warm 43-50ms    resources  12  output  1kb
typical   cold 125ms  warm 51ms       resources  27  output  5kb
gauntlet  cold 331ms  warm 140-145ms  resources 113  output 40kb

copy-only mutation:
file: benchmark-results/preview-speedup-2026-07-04T19-15-06-806Z.json

minimal   53ms   resources  12  output  1kb
typical   69ms   resources  27  output  5kb
gauntlet  161ms  resources 113  output 40kb
```

Disabling inline sourcemaps in both the server-native prebundle and browser wasm fallback substantially shrinks the generated app module (`typical 13kb -> 5kb`, `gauntlet 110kb -> 40kb`). Timing is mostly neutral in these small samples, but the iframe does less parse work and ships less JS, so this is kept.

Inline-leaf after sourcemap removal:

```text
file: benchmark-results/preview-speedup-2026-07-04T19-15-54-814Z.json

minimal   cold 72ms   warm 27-48ms    resources   9  output  7kb
typical   cold 109ms  warm 51-58ms    resources  21  output 15kb
gauntlet  cold 314ms  warm 139-149ms  resources 102  output 53kb
```

The smaller output makes `inline-leaf` more plausible than before, but it still does not beat the default clearly (`typical 58ms` vs external `51ms`, `gauntlet 149ms` vs external `145ms`). Decision remains: default is `bundle=external`.

Lazy browser wasm fallback:

```text
manual Playwright check:
url: /preview-baseui?scenario=typical&debug=1
server: next start --port 3121

phase ready
vendor flat
resources 27
esbuildEnsureMs 0
bundleSource server-none
esbuild requests []
pageErrors []

benchmark:
file: benchmark-results/preview-speedup-2026-07-04T19-18-54-505Z.json

minimal   cold 80ms   warm 49-50ms    resources  12  output  1kb
typical   cold 99ms   warm 59-62ms    resources  27  output  5kb
gauntlet  cold 326ms  warm 133-136ms  resources 113  output 40kb
```

The Base UI happy path uses `/api/preview-bundle`, so the client no longer eagerly calls `ensureEsbuild()` for `vendor=flat` or `vendor=local`. Browser `esbuild-wasm` remains as fallback for server prebundle failures and for other wasm preview paths, but the default Base UI load avoids the extra wasm request and worker initialization entirely.

Static Tailwind candidate cache:

```text
file: benchmark-results/preview-speedup-2026-07-04T19-21-44-615Z.json
server: next start --port 3122

minimal   cold 162ms  warm 37-49ms    resources  12  output  1kb  candidates 6ms
typical   cold 118ms  warm 47-60ms    resources  27  output  5kb  candidates 5ms
gauntlet  cold 337ms  warm 128-141ms  resources 113  output 40kb  candidates 5ms
```

Tailwind candidate extraction now caches the static Base UI kit candidates and merges them with candidates from the generated app files. The visible timing impact is neutral in this benchmark, but it avoids rescanning the full injected Base UI kit after the first Base UI render in a client session. Decision: keep as low-risk prep hygiene, not a headline latency win.

Combined server bundle plus Tailwind prepare:

```text
focused Playwright trace:
url: /preview-baseui?scenario=typical&debug=1
server: next start --port 3124

phase ready
vendor flat
bundleMode external
resources 27
bundleSource server-memory
esbuildEnsureMs 0
apiRequests ["/api/preview-bundle"]
esbuild requests []
pageErrors []

benchmark:
file: benchmark-results/preview-speedup-2026-07-04T19-26-56-342Z.json

minimal   cold 79ms   warm 45-50ms     resources  12  output  1kb
typical   cold 108ms  warm 49-54ms     resources  27  output  5kb
gauntlet  cold 321ms  warm 130-131ms   resources 113  output 40kb

copy-only mutation:
file: benchmark-results/preview-speedup-2026-07-04T19-29-12-686Z.json

minimal   median 52ms   min 51ms   max  64ms  resources  12  output  1kb
typical   median 66ms   min 65ms   max 130ms  resources  27  output  5kb
gauntlet  median 144ms  min 143ms  max 294ms  resources 113  output 40kb
```

The client now sends Tailwind precompile candidates in the `/api/preview-bundle` request when no browser CSS cache exists. That lets the server run native esbuild and Tailwind v4 precompile in the same request/response instead of doing `/api/preview-bundle` followed by `/api/preview-tailwind`.

The focused request trace confirms the happy path has no browser `esbuild-wasm` request, no eager `ensureEsbuild()` initialization, and no second preview API hop. Browser wasm remains as fallback for server prebundle failures and non-server-preview modes, but the default Base UI renderer-to-content path is server-native plus local flat vendor.

The copy-only run still prints `FAIL` for typical/gauntlet because the benchmark's pass threshold is older than the current scenario shape, not because rendering failed. All runs reached `phase=ready`, had `0` console/page errors, used `server-none` for changed app bundles, and reported `ensure=0ms`.

Transitive vendor modulepreload graph:

```text
focused resource trace:
server: next start --port 3126

before:
typical Base UI submodules discovered around 14-16ms
gauntlet Base UI submodules discovered around 13-54ms

after:
typical Base UI submodules start around 4ms
gauntlet Base UI submodules start around 5-6ms

benchmark:
file: benchmark-results/preview-speedup-2026-07-04T19-35-48-746Z.json

minimal   cold 80ms   warm 26-32ms     resources  12  output  1kb
typical   cold 98ms   warm 49-51ms     resources  27  output  5kb
gauntlet  cold 275ms  warm 132-141ms   resources 113  output 40kb

copy-only mutation:
file: benchmark-results/preview-speedup-2026-07-04T19-36-35-161Z.json

minimal   median 34ms   min 30ms   max  64ms  resources  12  output  1kb
typical   median 70ms   min 52ms   max 100ms  resources  27  output  5kb
gauntlet  median 143ms  min 142ms  max 287ms  resources 113  output 40kb
```

The vendor generator now writes `lib/preview/generated/vendor-preloads.ts`, a static graph of imports for the built preview vendor modules. `buildSrcdoc` uses that graph to recursively emit `<link rel="modulepreload">` for transitive dependencies of the generated app's direct imports. This keeps generated app JS small while removing a dependency-discovery waterfall inside the iframe.

Decision: keep the preload graph. It does not reduce resource count and it is mostly neutral on warm typical/gauntlet runs, but it improves cold gauntlet in this sample (`321ms -> 275ms`), cold typical (`108ms -> 98ms`), and minimal warm (`45-50ms -> 26-32ms`). It also makes the resource timeline healthier because Base UI submodules are fetched immediately as preloads rather than after evaluating wrapper modules.

Benchmark harness clarity update:

```text
file: benchmark-results/preview-speedup-2026-07-04T19-37-18-284Z.json

FAIL typical debounce-0 flat external #1 render=pass smoke=fail total=116ms out=5kb resources=27
```

The benchmark now records and prints `renderOk` separately from `smokeOk`. `FAIL` can still mean the interaction smoke check failed, but the output now shows when the renderer reached `phase=ready` with no console/page errors. This avoids mistaking component behavior follow-up for a renderer speed regression.

Single-file server bundle experiment:

```text
quick cold trace:
server: next start --port 3127

minimal   total 189ms  bundle  92ms  output 765kb  resources 0
typical   total 454ms  bundle 338ms  output 1.3mb  resources 0

warm harness:
file: benchmark-results/preview-speedup-2026-07-04T19-45-12-848Z.json

minimal   warm 52ms   output 765kb  resources 0
typical   warm 64ms   output 1.3mb  resources 0
```

`bundle=single-file` asks the server-native esbuild route to bundle the generated app, Base UI wrappers, and runtime packages into one inline module. It required the virtual filesystem resolver to let real `node_modules` imports resolve normally once esbuild leaves the virtual namespace.

Decision: keep as an experiment/debug switch, but reject as a default. It proves request count can go to `0`, but the server bundle and browser parse/eval costs dominate. Even warm-cache typical is slower than the external flat default (`64ms` vs `49-51ms`), and cold typical is much worse because it produces a `1.3mb` inline script.

App-level bare dependency bundling experiment:

```text
file: benchmark-results/preview-speedup-2026-07-04T19-50-28-181Z.json
server: next start --port 3128

minimal   warm 27-33ms   output  1kb  resources 12  render 3/3
typical   warm 54-62ms   output 10kb  resources 27  render 3/3

heavy failure check:
file: benchmark-results/preview-speedup-2026-07-04T19-50-34-130Z.json

heavy     render fail  output 765kb resources 26
```

`bundle=app-bare` keeps Base UI wrappers and React-family imports external, but lets the server bundle other app-level bare imports such as `lucide-react` and `recharts`. The goal was to tree-shake model app imports without duplicating React or Base UI.

Decision: reject as a default. Typical output grows from `5kb` to `10kb`, resources stay at `27` because component wrappers still import the shared `lucide-react` vendor, and warm typical is slower than the external flat default (`54-62ms` vs `49-51ms`). Heavy apps that import Recharts can pull a large CJS graph and fail with a dynamic React require. The better next target is icon handling inside the component/vendor layer, not app-level bare dependency bundling.

Component-wrapper icon inlining:

```text
change:
component vendor no longer externalizes lucide-react
wrapper modules importing icons: 22
generated preload graph lucide-react references from wrappers: removed

external default:
file: benchmark-results/preview-speedup-2026-07-04T19-53-45-480Z.json

minimal   warm 48-51ms    output  1kb  resources  12
typical   warm 51-54ms    output  5kb  resources  27
gauntlet  warm 134-135ms  output 40kb  resources 113

app-bare exact-repeat:
file: benchmark-results/preview-speedup-2026-07-04T19-54-07-243Z.json

minimal   warm 37-40ms  output  1kb  resources 12
typical   warm 39-45ms  output 10kb  resources 26

app-bare copy-only mutation:
file: benchmark-results/preview-speedup-2026-07-04T19-54-28-074Z.json

minimal   copy-edit 32-48ms    output  1kb  resources 12
typical   copy-edit 287-387ms  output 10kb  resources 26

app-bare heavy failure:
file: benchmark-results/preview-speedup-2026-07-04T19-54-34-875Z.json

heavy     render fail  output 765kb resources 25
```

Inlining `lucide-react` only into prebuilt component wrappers removed wrapper-side `lucide-react` imports without meaningfully growing the component files. The external default remains basically neutral: direct generated-app icon imports still use the flat `lucide-react` vendor, so typical stays at `27` resources and `51-54ms` warm.

Combining wrapper-icon inlining with `bundle=app-bare` removes the direct app icon request too (`typical resources 27 -> 26`) and makes exact-repeat typical faster in this sample (`39-45ms`). But copy-only edits become much slower because every changed app bundle has to run the package-bundling path, and heavy Recharts still fails. Decision: keep wrapper-icon inlining as a safe vendor cleanup, keep `app-bare` as a diagnostic switch only, and do not promote it as default.

Conclusion:

- Yes, wasm rendering to content is much faster versus the original `~3350ms` Base UI gauntlet baseline.
- The generated app bundle is no longer the large cost. Typical generated app input is about `4kb`, output JS is about `5kb`, exact-repeat hot render is about `49-51ms`, and copy-only edits are around `52-70ms` after the first mutation.
- Cold typical Base UI rendering is now around `98ms` in the latest production run, with Tailwind CSS and generated app JS both prepared before the iframe.
- The local iframe module graph is now below the original `<=75` typical target: typical flat vendor renders with `27` resources, while the gauntlet drops from `221` to `113`.
- The default Base UI path no longer initializes browser `esbuild-wasm`; `esbuildEnsureMs` stays `0` and Playwright sees no `esbuild`/`.wasm` requests.
- Collapsing everything into one generated module is not the next default speed path; it removes requests but bloats parse/eval. The better default remains small generated app JS plus flat prebuilt vendor modules and transitive preloads.
- Bundling app-level bare dependencies is also not the next default path; it leaves the component wrapper icon vendor load in place, grows generated JS, and breaks heavy Recharts cases.
- Component-wrapper icon inlining is safe to keep, but it only creates a speed win when combined with app-bare exact-repeat rendering. The real edit loop still favors the external flat default.
- Some benchmark failures are interaction smoke failures, not renderer load failures. The harness now prints `render=pass smoke=fail` for that case; dropdown/toast/sonner/popover/alert behavior still needs component-level follow-up.

Rejected follow-up experiments:

- `pack-common.js` for common `@/components/ui/*` paths reduced typical resources from `107` to `98`, but worsened cold total from about `1000ms` to about `1176ms` and made minimal load many unnecessary modules.
- Full inlining of Base UI component files reduced resources, but raised cold totals and made gauntlet output about `708kb`.
- Selective leaf-component inlining reduced only a few requests and worsened cold totals, so component wrappers should stay external for now.
- No-split dependency vendor with React external reduced resource counts dramatically (`typical ~33`, `gauntlet ~123`) and was made runtime-safe with `use-sync-external-store` ESM shims, but parse/evaluation cost made cold and warm totals worse (`typical warm ~136ms` vs kept split-vendor `~108ms`; gauntlet warm `~439ms` vs kept `~294ms`).
- Parent-page modulepreload of detected local imports competed with iframe loading and worsened cold totals.
- Removing preview `React.StrictMode` did not improve timing in this benchmark and was reverted.
- Full server-side wrapper inlining reduced requests (`typical 104 -> 94`, `gauntlet 221 -> 156`) but increased generated JS (`typical 13kb -> 93kb`, `gauntlet 110kb -> 708kb`) and slowed typical copy edits, so it remains an experiment rather than default.
- Selective leaf-wrapper inlining now reduces resource count after the resolver fix, but its timing wins are mixed and its JS output is larger, so it remains an experiment rather than default.
- Selective used-wrapper inlining reduces requests more aggressively, but grows typical output to `93kb` and gauntlet output to `704kb`, so it is not a default.
- Single-file server bundling reduces resources to `0`, but produces a `765kb` minimal module and a `1.3mb` typical module. Warm typical is slower than the kept external flat default, and cold typical is much slower because server bundling and inline parse/eval dominate.
- App-level bare dependency bundling tree-shakes some generated-app icon imports, but does not remove the shared `lucide-react` request created by component wrappers and can break heavy Recharts apps through CJS dynamic React requires.

## What To Benchmark

Build a repeatable benchmark script, for example:

```text
scripts/preview/benchmark-baseui-preview.ts
```

The script should run each scenario multiple times, collect timing data from the existing debug metrics, and print a table.

Run at least `10` iterations per scenario. Report median, p75, p95, min, and max.

## Scenarios

### 1. Current Full Gauntlet

Route:

```text
/preview-baseui?debug=1
```

Purpose:

- Stress test all Base UI/shadcn components.
- Should compile, render, and pass interaction smoke tests.
- This is not the 1 second target.

### 2. Minimal Generated App

Components:

- `button`
- `card`
- `input`
- basic layout

Purpose:

- Establish the best-case floor for the wasm renderer.
- This should be the easiest route to get near 1 second.

### 3. Typical Generated App

Components:

- `button`
- `card`
- `input`
- `textarea`
- `select`
- `dialog`
- `dropdown-menu`
- `toast` or `sonner`
- `table` or `chart`

Purpose:

- Represents the real product target.
- This is the most important benchmark for generated LlamaCoder apps.

### 4. Heavy Generated App

Components:

- Form controls
- Dialog/popover/dropdown
- Chart
- Table
- Scroll area
- Tabs
- Accordion
- Toast/sonner

Purpose:

- More realistic than the all-components gauntlet, but still heavy.
- Useful to catch regressions from common model behavior.

## Metrics To Capture

Capture these on every run:

- `prepMs`
- `bundleMs`
- `iframeReadyMs`
- `documentLoadMs`
- `styledMs`
- `totalMs`
- resource count
- CSS rule count
- number of `esm.sh` resources
- number of `cdn.jsdelivr.net` resources
- slowest 10 resources
- console errors
- page errors
- whether the app reached `phase ready`

Also capture interaction smoke results for at least:

- dropdown opens
- dialog opens
- alert dialog opens
- popover opens
- tooltip shows
- toast fires
- sonner fires
- scroll area scrolls
- chart renders an SVG

## Experiments

Run the same benchmark matrix for each experiment below.

### Experiment A: Remove The 300ms Debounce

Current code waits before bundling in `WasmReactCodeRunner`.

Test:

- `300ms` debounce
- `0ms` debounce
- optional: `requestIdleCallback` or microtask scheduling

Expected impact:

- Saves about `250-300ms`.

Risk:

- May increase rebuild churn while typing.
- Could be guarded so generated final previews use `0ms`, while live editing keeps debounce.

### Experiment B: Precompile Tailwind CSS

Current wasm iframe uses `@tailwindcss/browser@4`.

Test:

- Current Tailwind browser runtime.
- Precompiled CSS generated outside the iframe and injected as plain CSS.

Expected impact:

- Likely saves `1-2s` on styled readiness.

Risk:

- Need to ensure generated dynamic class names are included.
- Need a content extraction strategy from the virtual files.
- Must preserve shadcn Tailwind v4 tokens, `@theme inline`, custom variants, and `tw-animate-css`.

Success criteria:

- No `border-border` / unknown utility errors.
- Computed styles prove Tailwind utilities are active.
- Visual parity with current `/preview-baseui`.

### Experiment C: Prebundle Vendor Dependencies

Current iframe imports many modules from `esm.sh`.

Test:

- Current import map and CDN-per-module loading.
- A cached vendor bundle for React, ReactDOM, Base UI, shadcn helper deps, Recharts, DayPicker, etc.
- Optional split bundles:
  - `vendor-core`
  - `vendor-baseui`
  - `vendor-charts`
  - `vendor-heavy`

Expected impact:

- Biggest likely win.
- Reduces `250` network/module loads to a small number of local bundle loads.

Risk:

- Need stable module externalization and export compatibility.
- Need source maps or readable errors for generated apps.
- Need to avoid bundling unused heavy deps into minimal apps if it hurts startup.

Success criteria:

- Typical app warm preview approaches `~1s`.
- Full gauntlet significantly below current `~3-4s`.
- Same generated app code works without changing model prompts.

### Experiment D: Dependency Pruning By Actual Imports

Current Base UI preview deps may expose everything.

Test:

- Current dependency map.
- Dependency map limited to packages actually imported by the generated app.
- Compare minimal, typical, heavy, and gauntlet scenarios.

Expected impact:

- Large win for minimal/typical apps if combined with prebundling.
- Smaller win for full gauntlet.

Risk:

- Import analysis must be reliable.
- Dynamic imports and alias paths need to stay compatible.

### Experiment E: Cache Generated Base UI File Map

Current flow assembles the preview virtual filesystem every run.

Test:

- Current assembly.
- Cached generated baseui files, only merging user app files per run.

Expected impact:

- Small to medium.
- Reduces prep overhead and memory churn.

Risk:

- Must invalidate when `preview-kits/baseui` changes.

## Acceptance Targets

### Minimal App

Target:

```text
total <= 1000ms warm
styled <= 1000ms warm
resources <= 50
```

### Typical App

Target:

```text
total <= 1500ms warm
styled <= 1500ms warm
resources <= 75
```

Stretch target:

```text
total <= 1000ms warm
```

### Full Base UI Gauntlet

Target:

```text
total <= 2500ms warm
no runtime errors
all smoke interactions pass
```

Stretch target:

```text
total <= 1500ms warm
```

## Recommended Order

1. Create the benchmark script and capture baseline numbers.
2. Remove or bypass the `300ms` debounce for final/generated previews.
3. Precompile Tailwind CSS and inject plain CSS into the iframe.
4. Prebundle vendor dependencies.
5. Add dependency pruning based on actual imports.
6. Add CI/perf guardrails for the minimal and typical scenarios.

## Output Format

The benchmark script should print a table like:

```text
scenario          variant              median  p75   p95   resources  esm  css  errors
minimal          baseline             1200ms  1300  1600  80         76   90   0
minimal          no-debounce           900ms  1000  1200  80         76   90   0
typical          baseline             2200ms  2400  3000  160        155  120  0
typical          precompiled-css       1400ms  1500  1900  160        155  120  0
gauntlet         baseline             3500ms  3900  5000  250        246  148  0
```

Also write JSON output for later comparison:

```text
benchmark-results/preview-speedup-YYYY-MM-DD.json
```

## Important Notes

- Do not optimize only `/preview-baseui`; it is intentionally huge.
- The real product target is the typical generated app.
- Do not change model prompts during these tests.
- Keep import paths stable: generated apps should still import from `@/components/ui/*`.
- Visual correctness matters as much as raw timing. Fast but unstyled is a failed run.
