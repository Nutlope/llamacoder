"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSandpackConfig } from "@/lib/sandpack-config";
import { bundle, ensureEsbuild, type BundleResult } from "@/lib/preview/bundle";
import {
  assemblePreviewFiles,
  collectUsedBaseuiInlinePaths,
  getPreviewDependencies,
  type PreviewUiLibrary,
} from "@/lib/preview/files";
import { buildSrcdoc } from "@/lib/preview/html";
import {
  buildPreviewStyleSignature,
  collectPreviewStyleCandidates,
} from "@/lib/preview/tailwind-signature";

export type PreviewVendorMode = "local" | "cdn" | "flat";
export type PreviewBundleMode =
  | "external"
  | "inline-components"
  | "inline-used"
  | "inline-leaf"
  | "single-file"
  | "app-bare";

type RunnerProps = {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  previewKit?: PreviewUiLibrary;
  previewDebounceMs?: number;
  previewVendor?: PreviewVendorMode;
  previewBundleMode?: PreviewBundleMode;
  isFixPending?: boolean;
  allowAutoFix?: boolean;
};

type PreviewState =
  | { phase: "bundling" }
  | { phase: "running" }
  | { phase: "ready" }
  | { phase: "error"; error: string };

type PreviewMetrics = {
  bundleMs?: number;
  bundleCacheHit?: boolean;
  bundleCacheSource?: string;
  bundleCacheLookupMs?: number;
  esbuildEnsureMs?: number;
  assemblyMs?: number;
  tailwindCacheReadMs?: number;
  tailwindCandidateMs?: number;
  tailwindCssCacheHit?: boolean;
  bundleInputFileCount?: number;
  bundleInputBytes?: number;
  bundleCacheKeyBytes?: number;
  bundleOutputJsBytes?: number;
  bundleOutputCssBytes?: number;
  tailwindPrecompileMs?: number;
  tailwindPrecompileCacheHit?: boolean;
  prepareMs?: number;
  runtimeMs?: number;
  totalMs?: number;
  documentMs?: number;
  styledMs?: number;
  iframeReadyMs?: number;
  resourceCount?: number;
  esmResourceCount?: number;
  jsdelivrResourceCount?: number;
  stylesheetRules?: number;
  slowResources?: Array<PreviewResource>;
  tailwindProbe?: Record<string, string>;
};

type PreviewResource = {
  name: string;
  duration: number;
  initiatorType?: string;
  transferSize?: number;
  decodedBodySize?: number;
};

// Safety net for a preview that never posts back `ready`/`error` (e.g. a cold
// bundle of a heavy dep like recharts+d3). 60s leaves generous headroom while
// still surfacing a genuine hang rather than spinning forever.
const PREVIEW_WATCHDOG_MS = 60_000;
const previewTailwindCssCache = new Map<string, string>();
const staticPreviewTailwindCandidatesCache = new Map<
  PreviewUiLibrary,
  string[]
>();
const PREVIEW_TAILWIND_CSS_CACHE_PREFIX = "llamacoder-preview-tailwind-css:";
const PREVIEW_TAILWIND_CSS_CACHE_VERSION = "v2";
const LEAF_INLINE_BASEUI_COMPONENT_PATHS = [
  "lib/utils.ts",
  "components/ui/badge.tsx",
  "components/ui/button.tsx",
  "components/ui/card.tsx",
  "components/ui/input.tsx",
  "components/ui/kbd.tsx",
  "components/ui/label.tsx",
  "components/ui/separator.tsx",
  "components/ui/skeleton.tsx",
  "components/ui/table.tsx",
  "components/ui/textarea.tsx",
  "components/ui/typography.tsx",
];

export default function ReactCodeRunner({
  files,
  onRequestFix,
  previewKit = "baseui",
  previewDebounceMs,
  previewVendor,
  previewBundleMode = "external",
  isFixPending,
  allowAutoFix,
}: RunnerProps) {
  const useWasmPreview = useWasmPreviewFlag();
  const effectivePreviewVendor =
    previewVendor ?? (previewKit === "baseui" ? "flat" : "local");

  if (useWasmPreview || previewKit === "baseui") {
    return (
      <WasmReactCodeRunner
        files={files}
        onRequestFix={onRequestFix}
        previewKit={previewKit}
        previewDebounceMs={previewDebounceMs}
        previewVendor={effectivePreviewVendor}
        previewBundleMode={previewBundleMode}
        isFixPending={isFixPending}
        allowAutoFix={allowAutoFix}
      />
    );
  }

  return <SandpackReactCodeRunner files={files} onRequestFix={onRequestFix} isFixPending={isFixPending} allowAutoFix={allowAutoFix} />;
}

function SandpackReactCodeRunner({ files, onRequestFix, isFixPending }: RunnerProps) {
  const filesKey = files.map((f) => f.path + f.content).join("");
  return (
    <SandpackProvider
      key={filesKey}
      className="relative h-full w-full [&_.sp-preview-container]:flex [&_.sp-preview-container]:h-full [&_.sp-preview-container]:w-full [&_.sp-preview-container]:grow [&_.sp-preview-container]:flex-col [&_.sp-preview-container]:justify-center [&_.sp-preview-iframe]:grow"
      {...getSandpackConfig(files)}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        className="h-full w-full"
      />
      {onRequestFix && <SandpackErrorMessage onRequestFix={onRequestFix} isFixPending={isFixPending} />}
    </SandpackProvider>
  );
}

function WasmReactCodeRunner({
  files,
  onRequestFix,
  isFixPending,
  allowAutoFix,
  previewKit = "baseui",
  previewDebounceMs = 0,
  previewVendor,
  previewBundleMode = "external",
}: RunnerProps) {
  const effectivePreviewVendor =
    previewVendor ?? (previewKit === "baseui" ? "flat" : "local");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runStartedAtRef = useRef<number>(0);
  const iframeStartedAtRef = useRef<number | null>(null);
  const stateRef = useRef<PreviewState>({ phase: "bundling" });
  const consoleErrorsRef = useRef<string[]>([]);
  const tailwindCssCacheKeyRef = useRef("");
  const shouldStoreIframeCompiledCssRef = useRef(false);
  const showDebugMetrics = usePreviewDebugFlag();
  const [srcdoc, setSrcdoc] = useState("");
  const [state, setState] = useState<PreviewState>({ phase: "bundling" });
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<PreviewMetrics>({});
  const canUseServerPrebundle =
    previewKit === "baseui" &&
    (effectivePreviewVendor === "local" || effectivePreviewVendor === "flat");
  const filesKey = useMemo(
    () => files.map((file) => file.path + file.content).join(""),
    [files],
  );
  const tailwindCssCacheKey = `${PREVIEW_TAILWIND_CSS_CACHE_PREFIX}${PREVIEW_TAILWIND_CSS_CACHE_VERSION}:${previewKit}:${effectivePreviewVendor}:${hashString(buildPreviewStyleSignature(files))}`;
  tailwindCssCacheKeyRef.current = tailwindCssCacheKey;

  function transitionState(nextState: PreviewState) {
    stateRef.current = nextState;
    setState(nextState);
  }

  function appendConsoleError(message: string) {
    consoleErrorsRef.current = [...consoleErrorsRef.current, message];
    setConsoleErrors(consoleErrorsRef.current);
  }

  useEffect(() => {
    if (!canUseServerPrebundle) {
      void ensureEsbuild();
    }
  }, [canUseServerPrebundle]);

  useEffect(() => {
    let didCancel = false;
    runStartedAtRef.current = performance.now();
    iframeStartedAtRef.current = null;
    consoleErrorsRef.current = [];
    setConsoleErrors([]);
    setMetrics({});
    transitionState({ phase: "bundling" });

    const runBundle = async () => {
      const assemblyStartedAt = performance.now();
      const externalBaseuiComponents =
        canUseServerPrebundle &&
        previewBundleMode !== "inline-components" &&
        previewBundleMode !== "single-file";
      const bundleBareDependencies =
        previewBundleMode === "single-file" || previewBundleMode === "app-bare";
      const externalReactDependencies = previewBundleMode === "app-bare";
      const inlineBaseuiComponentPaths =
        previewBundleMode === "inline-used"
          ? collectUsedBaseuiInlinePaths(files)
          : previewBundleMode === "inline-leaf"
            ? LEAF_INLINE_BASEUI_COMPONENT_PATHS
            : undefined;
      const assembledFiles = assemblePreviewFiles(files, {
        uiLibrary: previewKit,
        externalBaseuiComponents,
        inlineBaseuiComponentPaths,
      });
      const assemblyMs = performance.now() - assemblyStartedAt;
      const tailwindCacheReadStartedAt = performance.now();
      let cachedTailwindCss =
        effectivePreviewVendor === "local" || effectivePreviewVendor === "flat"
          ? getCachedPreviewTailwindCss(tailwindCssCacheKey)
          : undefined;
      const tailwindCacheReadMs =
        performance.now() - tailwindCacheReadStartedAt;
      let tailwindPrecompileMetrics: Pick<
        PreviewMetrics,
        | "tailwindCandidateMs"
        | "tailwindPrecompileCacheHit"
        | "tailwindPrecompileMs"
      > = {};
      const tailwindPrecompileRequest =
        cachedTailwindCss === undefined &&
        previewKit === "baseui" &&
        (effectivePreviewVendor === "local" ||
          effectivePreviewVendor === "flat")
          ? preparePreviewTailwindPrecompile(files, previewKit, tailwindCssCacheKey)
          : null;

      const serverBundle =
        canUseServerPrebundle
          ? await prebundlePreviewFiles(assembledFiles, {
              externalBaseuiComponents,
              bundleBareDependencies,
              externalReactDependencies,
              inlineBaseuiComponentPaths,
              tailwind: tailwindPrecompileRequest
                ? {
                    cacheKey: tailwindPrecompileRequest.cacheKey,
                    candidates: tailwindPrecompileRequest.candidates,
                  }
                : undefined,
            })
          : null;
      const result =
        serverBundle ??
        (await bundle(assembledFiles, {
          externalBaseuiComponents,
          bundleBareDependencies,
          externalReactDependencies,
          inlineBaseuiComponentPaths,
        }));

      if (didCancel) return;

      if (!result.ok) {
        transitionState({ phase: "error", error: result.error });
        return;
      }

      const precompiledTailwind =
        serverBundle?.tailwind?.ok === true
          ? serverBundle.tailwind
          : tailwindPrecompileRequest
            ? await precompilePreviewTailwindCss(
                tailwindPrecompileRequest.cacheKey,
                tailwindPrecompileRequest.candidates,
              )
            : null;

      if (didCancel) return;

      if (precompiledTailwind) {
        cachedTailwindCss = precompiledTailwind.css;
        storeCompiledPreviewCss(tailwindCssCacheKey, precompiledTailwind.css);
        tailwindPrecompileMetrics = {
          tailwindCandidateMs: tailwindPrecompileRequest?.candidateMs,
          tailwindPrecompileCacheHit: precompiledTailwind.cacheHit,
          tailwindPrecompileMs: precompiledTailwind.durationMs,
        };
      }
      shouldStoreIframeCompiledCssRef.current = cachedTailwindCss === undefined;

      iframeStartedAtRef.current = performance.now();
      setSrcdoc(
        buildSrcdoc(
          result.code,
          result.css,
          getPreviewDependencies(previewKit),
          {
            precompiledTailwindCss: cachedTailwindCss,
            vendor: effectivePreviewVendor,
          },
        ),
      );
      setMetrics({
        bundleMs: result.durationMs,
        bundleCacheHit: result.cacheHit,
        bundleCacheSource: result.cacheSource,
        bundleCacheLookupMs: result.cacheLookupMs,
        esbuildEnsureMs: result.ensureMs,
        assemblyMs,
        tailwindCacheReadMs,
        tailwindCssCacheHit: cachedTailwindCss !== undefined,
        ...tailwindPrecompileMetrics,
        bundleInputFileCount: result.inputFileCount,
        bundleInputBytes: result.inputBytes,
        bundleCacheKeyBytes: result.cacheKeyBytes,
        bundleOutputJsBytes: result.outputJsBytes,
        bundleOutputCssBytes: result.outputCssBytes,
        prepareMs: performance.now() - runStartedAtRef.current,
      });
      transitionState({ phase: "running" });
    };

    const timeout =
      previewDebounceMs > 0
        ? window.setTimeout(runBundle, previewDebounceMs)
        : window.setTimeout(runBundle, 0);

    const watchdog = window.setTimeout(() => {
      if (didCancel || stateRef.current.phase !== "running") return;

      transitionState({
        phase: "error",
        error: `Preview did not report ready or error within ${Math.round(
          PREVIEW_WATCHDOG_MS / 1000,
        )}s.`,
      });
    }, PREVIEW_WATCHDOG_MS);

    return () => {
      didCancel = true;
      window.clearTimeout(timeout);
      window.clearTimeout(watchdog);
    };
  }, [
    filesKey,
    previewKit,
    previewDebounceMs,
    effectivePreviewVendor,
    previewBundleMode,
    tailwindCssCacheKey,
    canUseServerPrebundle,
  ]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.source !== "preview"
      ) {
        return;
      }

      if (event.data.type === "ready") {
        if (stateRef.current.phase === "error") return;

        if (shouldStoreIframeCompiledCssRef.current) {
          storeCompiledPreviewCss(
            tailwindCssCacheKeyRef.current,
            event.data.compiledCss,
          );
        }
        const readyAt = performance.now();
        const iframeMetrics = parseIframeMetrics(event.data);
        setMetrics((current) => ({
          ...current,
          runtimeMs: iframeStartedAtRef.current
            ? readyAt - iframeStartedAtRef.current
            : undefined,
          totalMs: readyAt - runStartedAtRef.current,
          iframeReadyMs: toNumber(event.data.elapsedMs),
          ...iframeMetrics,
        }));
        transitionState({ phase: "ready" });
        return;
      }

      if (event.data.type === "document-loaded") {
        setMetrics((current) => ({
          ...current,
          documentMs: toNumber(event.data.elapsedMs),
          ...parseIframeMetrics(event.data),
        }));
        return;
      }

      if (event.data.type === "tailwind-ready") {
        if (shouldStoreIframeCompiledCssRef.current) {
          storeCompiledPreviewCss(
            tailwindCssCacheKeyRef.current,
            event.data.compiledCss,
          );
        }
        setMetrics((current) => ({
          ...current,
          styledMs: toNumber(event.data.elapsedMs),
          ...parseIframeMetrics(event.data),
        }));
        return;
      }

      if (event.data.type === "error") {
        transitionState({
          phase: "error",
          error: String(event.data.message || "Unknown preview error"),
        });
        return;
      }

      if (event.data.type === "console-error") {
        appendConsoleError(
          String(event.data.message || "Unknown console error"),
        );
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const error =
    state.phase === "error"
      ? formatErrorForFixPayload(state.error, consoleErrors)
      : undefined;

  const autoFixSentForFilesRef = useRef<string | null>(null);

  useEffect(() => {
    if (!allowAutoFix || !onRequestFix || isFixPending || !error || !filesKey) {
      return;
    }
    if (autoFixSentForFilesRef.current === filesKey) {
      return;
    }
    autoFixSentForFilesRef.current = filesKey;
    onRequestFix(error);
  }, [allowAutoFix, error, filesKey, isFixPending, onRequestFix]);

  return (
    <div
      className="relative h-full w-full"
      data-preview-phase={state.phase}
      data-preview-bundle-ms={formatMetricValue(metrics.bundleMs)}
      data-preview-bundle-cache-hit={metrics.bundleCacheHit ? "1" : "0"}
      data-preview-bundle-cache-source={metrics.bundleCacheSource ?? ""}
      data-preview-bundle-cache-lookup-ms={formatMetricValue(
        metrics.bundleCacheLookupMs,
      )}
      data-preview-esbuild-ensure-ms={formatMetricValue(metrics.esbuildEnsureMs)}
      data-preview-assembly-ms={formatMetricValue(metrics.assemblyMs)}
      data-preview-tailwind-cache-read-ms={formatMetricValue(
        metrics.tailwindCacheReadMs,
      )}
      data-preview-tailwind-candidate-ms={formatMetricValue(
        metrics.tailwindCandidateMs,
      )}
      data-preview-tailwind-css-cache-hit={
        metrics.tailwindCssCacheHit ? "1" : "0"
      }
      data-preview-tailwind-precompile-ms={formatMetricValue(
        metrics.tailwindPrecompileMs,
      )}
      data-preview-tailwind-precompile-cache-hit={
        metrics.tailwindPrecompileCacheHit ? "1" : "0"
      }
      data-preview-bundle-input-files={metrics.bundleInputFileCount ?? ""}
      data-preview-bundle-input-bytes={metrics.bundleInputBytes ?? ""}
      data-preview-bundle-cache-key-bytes={metrics.bundleCacheKeyBytes ?? ""}
      data-preview-bundle-output-js-bytes={metrics.bundleOutputJsBytes ?? ""}
      data-preview-bundle-output-css-bytes={metrics.bundleOutputCssBytes ?? ""}
      data-preview-prepare-ms={formatMetricValue(metrics.prepareMs)}
      data-preview-runtime-ms={formatMetricValue(metrics.runtimeMs)}
      data-preview-total-ms={formatMetricValue(metrics.totalMs)}
      data-preview-document-ms={formatMetricValue(metrics.documentMs)}
      data-preview-styled-ms={formatMetricValue(metrics.styledMs)}
      data-preview-iframe-ready-ms={formatMetricValue(metrics.iframeReadyMs)}
      data-preview-debounce-ms={previewDebounceMs}
      data-preview-vendor={effectivePreviewVendor}
      data-preview-bundle-mode={previewBundleMode}
      data-preview-resource-count={metrics.resourceCount ?? ""}
      data-preview-esm-resource-count={metrics.esmResourceCount ?? ""}
      data-preview-jsdelivr-resource-count={metrics.jsdelivrResourceCount ?? ""}
      data-preview-stylesheet-rules={metrics.stylesheetRules ?? ""}
      data-preview-slow-resources={JSON.stringify(metrics.slowResources ?? [])}
      data-preview-console-errors={JSON.stringify(consoleErrors)}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        srcDoc={srcdoc}
        title="Preview"
        className="h-full w-full border-0"
      />
      {(state.phase === "bundling" || state.phase === "running") && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm font-medium text-gray-500 backdrop-blur-sm">
          {state.phase === "bundling" ? "Bundling preview..." : "Running..."}
        </div>
      )}
      {error && <ErrorMessage error={error} onRequestFix={onRequestFix} disabled={isFixPending} />}
      {showDebugMetrics && (
        <PreviewMetricsBadge state={state} metrics={metrics} />
      )}
    </div>
  );
}

function PreviewMetricsBadge({
  state,
  metrics,
}: {
  state: PreviewState;
  metrics: PreviewMetrics;
}) {
  return (
    <div className="absolute bottom-3 left-3 z-20 max-w-[min(680px,calc(100%-1.5rem))] rounded-md border border-zinc-300 bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur">
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <span className="text-zinc-500">wasm</span>
        <span>phase {state.phase}</span>
        <span>prep {formatMs(metrics.prepareMs)}</span>
        <span>bundle {formatMs(metrics.bundleMs)}</span>
        <span>cache {metrics.bundleCacheHit ? "hit" : "miss"}</span>
        <span>ensure {formatMs(metrics.esbuildEnsureMs)}</span>
        <span>css cache {metrics.tailwindCssCacheHit ? "hit" : "miss"}</span>
        <span>css pre {formatMs(metrics.tailwindPrecompileMs)}</span>
        <span>input {formatBytes(metrics.bundleInputBytes)}</span>
        <span>out {formatBytes(metrics.bundleOutputJsBytes)}</span>
        <span>iframe {formatMs(metrics.iframeReadyMs)}</span>
        <span>load {formatMs(metrics.documentMs)}</span>
        <span>style {formatMs(metrics.styledMs)}</span>
        <span>total {formatMs(metrics.totalMs)}</span>
        <span>resources {metrics.resourceCount ?? "--"}</span>
        <span>css rules {metrics.stylesheetRules ?? "--"}</span>
      </div>
      {metrics.slowResources?.[0] && (
        <div className="mt-1 truncate text-zinc-500">
          slowest {formatMs(metrics.slowResources[0].duration)}{" "}
          {formatResourceName(metrics.slowResources[0].name)}
        </div>
      )}
    </div>
  );
}

function SandpackErrorMessage({
  onRequestFix,
  isFixPending,
}: {
  onRequestFix: (e: string) => void;
  isFixPending?: boolean;
}) {
  const { sandpack } = useSandpack();

  if (!sandpack.error) return null;

  return (
    <ErrorMessage error={sandpack.error.message} onRequestFix={onRequestFix} />
  );
}

function ErrorMessage({
  error,
  onRequestFix,
  disabled,
}: {
  error: string;
  onRequestFix?: (e: string) => void;
  disabled?: boolean;
}) {
  const [didCopy, setDidCopy] = useState(false);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/5 text-base backdrop-blur-sm">
      <div className="max-w-[400px] rounded-md bg-red-500 p-4 text-white shadow-xl shadow-black/20">
        <p className="text-lg font-medium">Error</p>

        <p className="mt-4 line-clamp-[10] overflow-x-auto whitespace-pre font-mono text-xs">
          {error}
        </p>

        <div className="mt-8 flex justify-between gap-4">
          <button
            onClick={async () => {
              setDidCopy(true);
              await window.navigator.clipboard.writeText(error);
              await new Promise((resolve) => setTimeout(resolve, 2000));
              setDidCopy(false);
            }}
            className="rounded border-red-300 px-2.5 py-1.5 text-sm font-semibold text-red-50"
          >
            {didCopy ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
          </button>
          {onRequestFix && (
            <button
              onClick={() => {
                onRequestFix(error);
              }}
              disabled={disabled}
              className="rounded bg-white px-2.5 py-1.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Try to fix
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function useWasmPreviewFlag() {
  const envFlag = process.env.NEXT_PUBLIC_PREVIEW_RUNNER;
  const [queryFlag, setQueryFlag] = useState<"sandpack" | "wasm" | null>(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    setQueryFlag(preview === "wasm" || preview === "sandpack" ? preview : null);
  }, []);

  if (queryFlag) return queryFlag === "wasm";
  if (envFlag === "sandpack" || envFlag === "wasm") return envFlag === "wasm";
  return true;
}

function usePreviewDebugFlag() {
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get("debug") === "1");
  }, []);

  return debug;
}

function formatMs(value: number | undefined) {
  return typeof value === "number" ? `${Math.round(value)}ms` : "--";
}

function formatBytes(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "--";
  if (value < 1024) return `${value}b`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)}kb`;
  return `${(value / (1024 * 1024)).toFixed(1)}mb`;
}

function formatMetricValue(value: number | undefined) {
  return typeof value === "number" ? String(Math.round(value)) : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseIframeMetrics(data: unknown): Partial<PreviewMetrics> {
  if (!isPreviewMetricMessage(data)) return {};

  return {
    resourceCount: toNumber(data.metrics.resourceCount),
    esmResourceCount: toNumber(data.metrics.esmResourceCount),
    jsdelivrResourceCount: toNumber(data.metrics.jsdelivrResourceCount),
    stylesheetRules: toNumber(data.metrics.stylesheetRules),
    slowResources: Array.isArray(data.metrics.slowResources)
      ? data.metrics.slowResources.filter(isPreviewResource).slice(0, 10)
      : undefined,
    tailwindProbe:
      typeof data.metrics.tailwindProbe === "object" &&
      data.metrics.tailwindProbe !== null
        ? (data.metrics.tailwindProbe as Record<string, string>)
        : undefined,
  };
}

function isPreviewMetricMessage(data: unknown): data is {
  metrics: {
    resourceCount?: number;
    esmResourceCount?: number;
    jsdelivrResourceCount?: number;
    stylesheetRules?: number;
    slowResources?: unknown;
    tailwindProbe?: unknown;
  };
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "metrics" in data &&
    typeof (data as { metrics?: unknown }).metrics === "object" &&
    (data as { metrics?: unknown }).metrics !== null
  );
}

function isPreviewResource(value: unknown): value is PreviewResource {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PreviewResource).name === "string" &&
    typeof (value as PreviewResource).duration === "number"
  );
}

function formatResourceName(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return value;
  }
}

function getCachedPreviewTailwindCss(key: string) {
  const memoryValue = previewTailwindCssCache.get(key);
  if (memoryValue) return memoryValue;
  if (typeof window === "undefined") return undefined;

  try {
    const storedValue = window.localStorage.getItem(key) ?? undefined;
    if (storedValue) previewTailwindCssCache.set(key, storedValue);
    return storedValue;
  } catch {
    return undefined;
  }
}

function storeCompiledPreviewCss(key: string, value: unknown) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length >= 1_000_000
  ) {
    return;
  }

  previewTailwindCssCache.set(key, value);
  setCachedPreviewTailwindCss(key, value);
}

function setCachedPreviewTailwindCss(key: string, css: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, css);
  } catch {
    // Memory cache still covers same-page preview rerenders.
  }
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function toPreviewFileList(fileMap: Record<string, string>) {
  return Object.entries(fileMap).map(([path, content]) => ({ path, content }));
}

function preparePreviewTailwindPrecompile(
  files: Array<{ path: string; content: string }>,
  previewKit: PreviewUiLibrary,
  cacheKey: string,
) {
  const tailwindCandidateStartedAt = performance.now();
  const tailwindCandidates =
    previewKit === "baseui"
      ? mergeTailwindCandidates(
          getStaticPreviewTailwindCandidates(previewKit),
          collectPreviewStyleCandidates(files),
        )
      : collectPreviewStyleCandidates(
          toPreviewFileList(
            assemblePreviewFiles(files, {
              uiLibrary: previewKit,
            }),
          ),
        );
  const candidateMs = performance.now() - tailwindCandidateStartedAt;

  return {
    cacheKey,
    candidates: tailwindCandidates,
    candidateMs,
  };
}

function getStaticPreviewTailwindCandidates(previewKit: PreviewUiLibrary) {
  const cached = staticPreviewTailwindCandidatesCache.get(previewKit);
  if (cached) return cached;

  const candidates = collectPreviewStyleCandidates(
    toPreviewFileList(
      assemblePreviewFiles([], {
        uiLibrary: previewKit,
      }),
    ),
  );
  staticPreviewTailwindCandidatesCache.set(previewKit, candidates);
  return candidates;
}

function mergeTailwindCandidates(left: string[], right: string[]) {
  return [...new Set([...left, ...right])].sort();
}

async function prebundlePreviewFiles(
  files: Record<string, string>,
  options: {
    externalBaseuiComponents: boolean;
    bundleBareDependencies?: boolean;
    externalReactDependencies?: boolean;
    inlineBaseuiComponentPaths?: string[];
    tailwind?: {
      cacheKey: string;
      candidates: string[];
    };
  },
): Promise<
  | (Extract<BundleResult, { ok: true }> & {
      tailwind?: PreviewTailwindPrecompileResult;
    })
  | null
> {
  const response = await fetch("/api/preview-bundle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      files,
      options: {
        externalBaseuiComponents: options.externalBaseuiComponents,
        bundleBareDependencies: options.bundleBareDependencies,
        externalReactDependencies: options.externalReactDependencies,
        inlineBaseuiComponentPaths: options.inlineBaseuiComponentPaths,
      },
      tailwind: options.tailwind,
    }),
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as
    | (Partial<Extract<BundleResult, { ok: true }>> & {
        ok?: unknown;
      })
    | null;

  if (
    payload?.ok !== true ||
    typeof payload.code !== "string" ||
    typeof payload.css !== "string"
  ) {
    return null;
  }

  return {
    ok: true,
    code: payload.code,
    css: payload.css,
    durationMs: toFiniteNumber(payload.durationMs),
    cacheHit: payload.cacheHit === true,
    cacheSource:
      typeof payload.cacheSource === "string"
        ? payload.cacheSource
        : "server",
    cacheLookupMs: toFiniteNumber(payload.cacheLookupMs),
    ensureMs: 0,
    inputFileCount: toFiniteNumber(payload.inputFileCount),
    inputBytes: toFiniteNumber(payload.inputBytes),
    cacheKeyBytes: toFiniteNumber(payload.cacheKeyBytes),
    outputJsBytes: toFiniteNumber(payload.outputJsBytes),
    outputCssBytes: toFiniteNumber(payload.outputCssBytes),
    tailwind: parsePreviewTailwindPrecompileResult(
      (payload as { tailwind?: unknown }).tailwind,
    ),
  };
}

type PreviewTailwindPrecompileResult =
  | {
      ok: true;
      css: string;
      cacheHit: boolean;
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
    };

function parsePreviewTailwindPrecompileResult(
  value: unknown,
): PreviewTailwindPrecompileResult | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  if (
    (value as { ok?: unknown }).ok === true &&
    typeof (value as { css?: unknown }).css === "string"
  ) {
    return {
      ok: true,
      css: (value as { css: string }).css,
      cacheHit: (value as { cacheHit?: unknown }).cacheHit === true,
      durationMs: toFiniteNumber((value as { durationMs?: unknown }).durationMs),
    };
  }

  if ((value as { ok?: unknown }).ok === false) {
    return {
      ok: false,
      error:
        typeof (value as { error?: unknown }).error === "string"
          ? (value as { error: string }).error
          : "Tailwind precompile failed.",
      durationMs: toFiniteNumber((value as { durationMs?: unknown }).durationMs),
    };
  }

  return undefined;
}

async function precompilePreviewTailwindCss(
  cacheKey: string,
  candidates: string[],
) {
  const response = await fetch("/api/preview-tailwind", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ cacheKey, candidates }),
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = (await response.json().catch(() => null)) as {
    css?: unknown;
    cacheHit?: unknown;
    durationMs?: unknown;
  } | null;

  if (typeof payload?.css !== "string" || payload.css.length === 0) {
    return null;
  }

  return {
    css: payload.css,
    cacheHit: payload.cacheHit === true,
    durationMs:
      typeof payload.durationMs === "number" ? payload.durationMs : undefined,
  };
}

function toFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatErrorForFixPayload(error: string, consoleErrors: string[]) {
  if (consoleErrors.length === 0) return error;

  return `${error}\n\nConsole errors before the fatal error:\n${consoleErrors
    .map((message) => `- ${message}`)
    .join("\n")}`;
}
