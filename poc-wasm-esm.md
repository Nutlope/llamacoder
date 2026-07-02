# POC: Replace Sandpack with esbuild-wasm + import maps + esm.sh

## Why

Sandpack (`@codesandbox/sandpack-react` 2.20.0) is no longer actively maintained. Its in-browser bundler pins us to an aging toolchain and we cannot control dependency freshness. This POC replaces it with three independently maintained, browser-only pieces — no server, no VM, no license:

| Concern | Today (Sandpack) | POC |
|---|---|---|
| Transpile TSX/TS | Sandpack's internal bundler | `esbuild-wasm` (runs as WebAssembly in the browser) |
| npm dependencies | CodeSandbox CDN, Sandpack-resolved | Import map → `esm.sh` URLs, versions pinned by us |
| Preview surface | `<SandpackPreview>` iframe | Our own sandboxed `<iframe srcdoc>` |
| Styling | Tailwind 4 browser CDN (already) | Same, unchanged |
| Runtime errors | `useSandpack().error` | `postMessage` bridge from the iframe |

Everything the generated apps need already fits this model: single-page React, fixed preloaded dependency list, shadcn component sources injected as files, Tailwind from a CDN. We use ~20% of Sandpack; this replaces exactly that 20%.

## Scope

**In scope:** a new preview pipeline behind a feature flag, rendering the same `Array<{ path, content }>` input that `ReactCodeRunner` receives today, with error reporting wired to the existing "Try to fix" UI.

**Out of scope:** letting models add arbitrary npm packages (dep list stays fixed), multi-page routing, editing inside the preview, benchmark harness (separate work — but see §9).

## 1. Architecture

```
components/code-runner-react.tsx        (rewritten, same props)
        │  files: {path, content}[]
        ▼
lib/preview/bundle.ts                   esbuild-wasm: TSX → single ESM string
        │  (npm imports left as bare specifiers = "external")
        ▼
lib/preview/html.ts                     builds srcdoc: import map + Tailwind CDN
        │                               + error bridge + inlined module code
        ▼
<iframe sandbox srcdoc=...>             browser resolves bare imports via
        │                               import map → esm.sh (cached by browser)
        ▼
postMessage ─► parent: ok / runtime error / console.error[]
```

New directory: `lib/preview/` with four files:

- `deps.ts` — the pinned dependency table and import-map generator
- `bundle.ts` — esbuild-wasm singleton + virtual-filesystem plugin
- `html.ts` — srcdoc template with the error bridge
- `files.ts` — file-map assembly (extract the path normalization, tsconfig-equivalent aliases, and shadcn file injection from `lib/sandpack-config.ts` — that logic survives nearly unchanged)

## 2. `deps.ts` — pinned dependencies and the import map

Convert the current `dependencies` object in `lib/sandpack-config.ts` into an **exact-version** table (no `latest`, no `^` — reproducibility is the point):

```ts
export const PREVIEW_DEPS: Record<string, string> = {
  react: "19.1.0",
  "react-dom": "19.1.0",
  "lucide-react": "0.525.0",          // was "latest" — pin it
  recharts: "2.9.0",                   // keep for POC parity; upgrade later
  "react-router-dom": "7.6.0",         // present today; prompt bans it, keep for parity
  "@radix-ui/react-accordion": "1.2.0",
  // ... every entry currently in lib/sandpack-config.ts, pinned ...
  "class-variance-authority": "0.7.0",
  clsx: "2.1.1",
  "date-fns": "3.6.0",
  "embla-carousel-react": "8.1.8",
  "react-day-picker": "8.10.1",
  "tailwind-merge": "2.4.0",
  "framer-motion": "11.15.0",
  vaul: "0.9.1",
};
```

Generate the import map from it:

```ts
export function buildImportMap(): string {
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${PREVIEW_DEPS.react}`,
    "react/jsx-runtime": `https://esm.sh/react@${PREVIEW_DEPS.react}/jsx-runtime`,
    "react-dom": `https://esm.sh/react-dom@${PREVIEW_DEPS["react-dom"]}`,
    "react-dom/client": `https://esm.sh/react-dom@${PREVIEW_DEPS["react-dom"]}/client`,
  };
  for (const [name, version] of Object.entries(PREVIEW_DEPS)) {
    if (name === "react" || name === "react-dom") continue;
    imports[name] = `https://esm.sh/${name}@${version}?external=react,react-dom`;
    imports[`${name}/`] = `https://esm.sh/${name}@${version}&external=react,react-dom/`;
  }
  return JSON.stringify({ imports });
}
```

**Critical detail — one React instance.** Every non-React package MUST carry `?external=react,react-dom`. That makes esm.sh emit `import ... from "react"` (bare) instead of bundling its own React copy; the bare specifier then resolves through the same import map. Without this, Radix/recharts/framer-motion load a second React and everything dies with the classic "invalid hook call" error.

The trailing-slash entries (`"pkg/"`) cover subpath imports like `react-day-picker/dist/style.css` or `date-fns/locale`.

**Note:** `react/jsx-runtime` must be mapped explicitly — esbuild's automatic JSX transform emits imports of it (see §3).

## 3. `bundle.ts` — esbuild-wasm with a virtual filesystem

```ts
import * as esbuild from "esbuild-wasm";

let initPromise: Promise<void> | null = null;
export function ensureEsbuild(): Promise<void> {
  initPromise ??= esbuild.initialize({
    wasmURL: `https://esm.sh/esbuild-wasm@0.25.5/esbuild.wasm`, // or self-host in /public
    worker: true,
  });
  return initPromise;
}
```

- `esbuild.initialize` may only be called **once per page** — hence the singleton. Calling it twice throws.
- The `.wasm` binary is ~10 MB; `worker: true` keeps the main thread free. Prefer self-hosting the wasm file in `public/` so the version can never drift from the npm package (`esbuild-wasm` version and wasm binary version must match exactly).
- Kick off `ensureEsbuild()` on app load (module side effect or layout effect), not on first preview, so the download overlaps with generation streaming.

The bundler:

```ts
export type BundleResult =
  | { ok: true; code: string; durationMs: number }
  | { ok: false; error: string; durationMs: number };

export async function bundle(
  files: Record<string, string>, // normalized: "App.tsx", "components/ui/button.tsx", ...
): Promise<BundleResult> {
  await ensureEsbuild();
  const start = performance.now();
  try {
    const result = await esbuild.build({
      entryPoints: ["/main.tsx"],
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      jsx: "automatic",           // emits react/jsx-runtime imports
      sourcemap: "inline",        // real line numbers in error messages
      logLevel: "silent",
      plugins: [virtualFs(files)],
    });
    return { ok: true, code: result.outputFiles[0].text, durationMs: performance.now() - start };
  } catch (e: any) {
    // esbuild throws with .errors: Message[] — format file/line/column into the string
    return { ok: false, error: formatEsbuildError(e), durationMs: performance.now() - start };
  }
}
```

The plugin is the heart of the POC. Resolution rules, in order:

```ts
function virtualFs(files: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        // 1. Bare npm specifier → leave it to the import map at runtime
        if (!args.path.startsWith(".") && !args.path.startsWith("/") && !args.path.startsWith("@/")) {
          return { path: args.path, external: true };
        }
        // 2. "@/x" alias → "x" (mirrors the tsconfig paths Sandpack used)
        // 3. "./x" / "../x" → resolve against dirname(args.importer)
        // 4. Extension probing: x → x.tsx, x.ts, x/index.tsx, x/index.ts, x.jsx, x.js
        const resolved = resolveVirtual(args.path, args.importer, files);
        if (!resolved) {
          return { errors: [{ text: `Cannot resolve "${args.path}" from "${args.importer}"` }] };
        }
        return { path: resolved, namespace: "vfs" };
      });
      build.onLoad({ filter: /.*/, namespace: "vfs" }, (args) => ({
        contents: files[args.path],
        loader: args.path.endsWith(".tsx") ? "tsx"
              : args.path.endsWith(".ts")  ? "ts"
              : args.path.endsWith(".css") ? "css"
              : "jsx",
      }));
    },
  };
}
```

Because npm packages are externalized, esbuild only bundles the **project files**, and only those reachable from the entry — so injecting all ~40 shadcn component sources costs nothing unless the generated app imports them. Bundle time for a typical generated app should be tens of milliseconds after wasm init.

The synthesized entry (added to the file map in `files.ts`):

```tsx
// /main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

`files.ts` also ports from `lib/sandpack-config.ts`, unchanged in behavior:
- strip leading `/` and `src/` prefixes from model-emitted paths
- inject the shadcn sources from `lib/shadcn.ts` at `components/ui/*`
- synthesize `App.tsx` wrapping the first component if the model didn't emit one

## 4. `html.ts` — the iframe document

```ts
export function buildSrcdoc(bundledCode: string): string {
  // A literal "</script>" inside the bundle would terminate the inline script
  // tag early — escape it. This is the one classic srcdoc footgun.
  const safe = bundledCode.replace(/<\/script/gi, "<\\/script");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script type="importmap">${buildImportMap()}</script>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<script>${ERROR_BRIDGE}</script>
</head>
<body>
<div id="root"></div>
<script type="module">${safe}</script>
</body>
</html>`;
}
```

The error bridge (plain inline script, runs before anything else):

```js
const ERROR_BRIDGE = `
window.addEventListener("error", (e) => {
  parent.postMessage({ source: "preview", type: "error",
    message: String((e.error && e.error.stack) || e.message) }, "*");
});
window.addEventListener("unhandledrejection", (e) => {
  parent.postMessage({ source: "preview", type: "error",
    message: "Unhandled promise rejection: " + String((e.reason && e.reason.stack) || e.reason) }, "*");
});
const origError = console.error;
console.error = (...args) => {
  parent.postMessage({ source: "preview", type: "console-error",
    message: args.map(a => a instanceof Error ? a.stack : typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ") }, "*");
  origError(...args);
};
window.addEventListener("load", () => {
  // "ready" ≈ modules resolved + first paint happened
  requestAnimationFrame(() => parent.postMessage({ source: "preview", type: "ready" }, "*"));
});
`;
```

Import-map failures (typo'd package, esm.sh outage) surface as `TypeError: Failed to resolve module specifier ...` through the `error` listener — they're caught, not silent.

**Iframe sandboxing — decision needed:**

- `sandbox="allow-scripts allow-forms allow-modals allow-popups"` (recommended): opaque origin, generated code cannot touch the parent app. Cost: `localStorage` throws inside the iframe, and models love `localStorage`. Mitigation: the error bridge script installs an in-memory shim for `localStorage`/`sessionStorage` before the app module runs (~15 lines: `Object.defineProperty(window, "localStorage", { value: memoryStorageShim() })`).
- Adding `allow-same-origin` makes storage work natively but a srcdoc iframe then shares the parent's origin — untrusted generated code could reach `window.parent` DOM, cookies, and any auth state. Do **not** do this; Sandpack avoided it by hosting its runner on a separate domain, which we're deliberately not building for a POC.

## 5. `components/code-runner-react.tsx` — rewritten, same interface

Props stay `{ files, onRequestFix }` so no caller changes.

```
state: { phase: "bundling" | "running" | "ready" | "error", error?: string }

useEffect on filesKey (same content-hash key as today):
  1. setState(bundling)
  2. const result = await bundle(assembleFiles(files))
  3. if !result.ok → setState(error, result.error)      // build error
  4. else → setSrcdoc(buildSrcdoc(result.code)); setState(running)

useEffect (mount):
  window "message" listener, filtered on e.data?.source === "preview"
  AND e.source === iframeRef.current?.contentWindow   // ignore other iframes
    "ready"          → setState(ready)
    "error"          → setState(error, message)        // runtime error
    "console-error"  → accumulate; surface after N repeats or on demand
```

Keep the existing `ErrorMessage` overlay UI (copy button + "Try to fix" wired to `onRequestFix`) — swap its data source from `useSandpack().error` to this component's state. Build errors and runtime errors both flow into it; that's the same UX as today, with better messages (esbuild gives file/line/column; inline sourcemaps make runtime stacks point at real generated-file lines).

While streaming: today Sandpack re-mounts on every `filesKey` change. Keep that behavior initially (bundle is fast), but debounce re-bundles to ~300ms trailing edge so we don't bundle every token.

## 6. Pitfalls checklist (things that will bite if skipped)

1. **Duplicate React** — `?external=react,react-dom` on every esm.sh URL, plus explicit `react/jsx-runtime` map entry. Test: render one Radix component + one framer-motion animation in the same app.
2. **`esbuild.initialize` called twice** — singleton promise, survives React StrictMode double-effects and HMR (`globalThis` guard in dev).
3. **`</script>` in generated code** — the escaping in §4. Test with an app whose source contains the literal string.
4. **`latest` versions** — forbidden. Everything pinned in `deps.ts`; esm.sh URLs with exact versions are immutable and cached hard by the browser.
5. **CSS imports** — some generated code does `import "./styles.css"`. Loader `css` handles it (esbuild inlines it as an injected style tag when bundling). Tailwind itself needs nothing: the browser CDN build scans the DOM at runtime, same as today.
6. **localStorage under opaque origin** — shim in the bridge (§4), or accept the error surfacing through `onRequestFix`.
7. **esm.sh as a runtime dependency** — previews now depend on esm.sh uptime (Sandpack equally depended on the CodeSandbox CDN). Acceptable for POC; note `esm.sh` supports self-hosting later if it ever matters.
8. **wasm/npm version lockstep** — self-host `esbuild.wasm` from `public/` and add a CI check that its version matches `package.json`'s `esbuild-wasm`.

## 7. Rollout

1. Build behind `?preview=wasm` query flag (or env flag). `ReactCodeRunner` picks the pipeline; Sandpack path untouched.
2. Parity-test against every app in `lib/shadcn-examples.ts` (they're known-good Sandpack apps — ideal fixtures) plus 10–20 fresh generations.
3. Flip the default; keep Sandpack for one release as fallback flag.
4. Delete `@codesandbox/sandpack-react`, `@codesandbox/sandpack-themes`, and `lib/sandpack-config.ts` (its logic now lives in `lib/preview/files.ts`).

## 8. Acceptance criteria

- [ ] Every `lib/shadcn-examples.ts` app renders visually identical to the Sandpack version (manual side-by-side).
- [ ] A syntax error in generated code shows the error overlay with file/line, and "Try to fix" sends it to the model.
- [ ] A runtime throw (e.g. `undefined.map`) shows the overlay with a stack pointing at the generated file/line.
- [ ] Radix + framer-motion + recharts coexist in one app (single-React proof).
- [ ] Cold preview (wasm not yet loaded) → first paint under ~3s on a normal connection; warm re-bundle under ~200ms.
- [ ] No network requests except esm.sh, jsdelivr (Tailwind), and the wasm binary.
- [ ] `pnpm build` passes with Sandpack packages removed from the new path's imports.

## 9. Tie-in with PLAN.md (do not skip)

This renderer is a plain function pipeline: `files → bundle() → srcdoc → iframe`. The benchmark harness in PLAN.md §2 should drive **this exact pipeline** in headless Playwright — load the same srcdoc, listen for the same `ready`/`error` messages, screenshot. `bundle()`'s `ok/error/durationMs` maps 1:1 onto `EvalResult.build`, and the bridge's messages onto `EvalResult.runtime.consoleErrors`. That replaces PLAN.md §2.2–2.3 ("must match Sandpack") with something strictly better: production and benchmark share one implementation, so parity is by construction, not by convention.

## 10. Estimated effort

| Piece | Size |
|---|---|
| `deps.ts` + import map | ~80 lines, half a day incl. pinning/testing versions |
| `bundle.ts` + virtual fs plugin | ~150 lines, 1 day |
| `html.ts` + error bridge + storage shim | ~120 lines, half a day |
| `files.ts` (port from sandpack-config) | ~100 lines, 2h |
| `code-runner-react.tsx` rewrite | ~150 lines, 1 day incl. streaming/debounce |
| Parity testing + fixes | 1–2 days |

**Total: roughly one engineer-week to a flag-gated POC.**
