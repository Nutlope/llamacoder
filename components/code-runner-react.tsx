"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { bundle, ensureEsbuild } from "@/lib/preview/bundle";
import {
  assemblePreviewFiles,
  collectUsedBaseuiInlinePaths,
  getPreviewDependencies,
  type PreviewUiLibrary,
} from "@/lib/preview/files";
import { baseuiPreviewFiles } from "@/lib/preview/generated/baseui-files";
import { buildSrcdoc, findMissingPreviewModules } from "@/lib/preview/html";
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
  refreshNonce?: number;
  /**
   * Whether the pane containing this runner is the one the user is looking
   * at. The pre-warm path renders the runner inside an opacity-0 wrapper, so
   * the srcdoc often finishes loading uncomposited; flipping opacity back
   * fires neither IntersectionObserver nor visibilitychange, so the reveal
   * needs its own repaint nudge.
   */
  isActivePane?: boolean;
};

type PreviewState =
  | { phase: "bundling" }
  | { phase: "running" }
  | { phase: "ready" }
  | { phase: "error"; error: string; canAutoFix?: boolean };

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
const PREVIEW_TAILWIND_CSS_CACHE_PREFIX = "llamacoder-preview-tailwind-css:";
const PREVIEW_TAILWIND_CSS_CACHE_VERSION = "v3";
const BASEUI_STYLE_FILES = Object.entries(baseuiPreviewFiles).map(
  ([path, content]) => ({ path, content }),
);
const BASEUI_STYLE_SIGNATURE = buildPreviewStyleSignature(BASEUI_STYLE_FILES);
const BASEUI_STYLE_CANDIDATES =
  collectPreviewStyleCandidates(BASEUI_STYLE_FILES);
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
  previewDebounceMs,
  previewVendor,
  previewBundleMode = "external",
  isFixPending,
  allowAutoFix,
  refreshNonce,
  isActivePane,
}: RunnerProps) {
  return (
    <WasmReactCodeRunner
      files={files}
      onRequestFix={onRequestFix}
      previewKit="baseui"
      previewDebounceMs={previewDebounceMs}
      previewVendor={previewVendor ?? "flat"}
      previewBundleMode={previewBundleMode}
      isFixPending={isFixPending}
      allowAutoFix={allowAutoFix}
      refreshNonce={refreshNonce}
      isActivePane={isActivePane}
    />
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
  refreshNonce = 0,
  isActivePane = true,
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
  const loadedSrcdocRef = useRef("");
  const loadedSrcdocReadyRef = useRef(false);
  const loadedRefreshNonceRef = useRef(refreshNonce);
  const showDebugMetrics = usePreviewDebugFlag();
  const [srcdoc, setSrcdoc] = useState("");
  const [state, setState] = useState<PreviewState>({ phase: "bundling" });
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<PreviewMetrics>({});
  // First-ever ready flips this: before it, loading must cover the whole
  // panel (the iframe underneath is a blank white document); after it, the
  // previous app stays visible during re-bundles and a corner hint suffices.
  const [hasEverBeenReady, setHasEverBeenReady] = useState(false);
  const filesKey = useMemo(
    () => files.map((file) => file.path + file.content).join(""),
    [files],
  );
  const runKey = `${refreshNonce}:${filesKey}`;
  const previewStyleSignature = buildPreviewStyleSignature(files);
  const tailwindCssCacheKey = `${PREVIEW_TAILWIND_CSS_CACHE_PREFIX}${PREVIEW_TAILWIND_CSS_CACHE_VERSION}:${previewKit}:${effectivePreviewVendor}:${hashString(
    `${previewStyleSignature}\n${BASEUI_STYLE_SIGNATURE}`,
  )}`;
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
    void ensureEsbuild();
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || typeof IntersectionObserver === "undefined") return;

    // The srcdoc can finish loading while the iframe is hidden (Code tab) or
    // mid-layout-animation (panel width transition); Chromium then leaves the
    // sandboxed frame blank until something invalidates its surface. Repaint
    // whenever the iframe comes (back) into view.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        nudgeIframePaint(iframe);
      }
    });
    observer.observe(iframe);

    // IntersectionObserver doesn't fire while the tab itself is hidden, and
    // previews now finish loading in background tabs — repaint when the user
    // comes back, or the frame can stay blank.
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        nudgeIframePaint(iframe);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Pre-warmed previews load behind an opacity-0 wrapper; when the user
    // switches to the Preview tab, that opacity flip triggers neither the
    // IntersectionObserver nor visibilitychange, so repaint explicitly.
    if (isActivePane) {
      nudgeIframePaint(iframeRef.current);
    }
  }, [isActivePane]);

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
        previewKit === "baseui" &&
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
      const tailwindCandidateClasses = [
        ...collectPreviewStyleCandidates(files),
        ...BASEUI_STYLE_CANDIDATES,
      ].join(" ");
      const assemblyMs = performance.now() - assemblyStartedAt;
      const tailwindCacheReadStartedAt = performance.now();
      let cachedTailwindCss =
        effectivePreviewVendor === "local" || effectivePreviewVendor === "flat"
          ? getCachedPreviewTailwindCss(tailwindCssCacheKey)
          : undefined;
      const tailwindCacheReadMs =
        performance.now() - tailwindCacheReadStartedAt;
      const result = await bundle(assembledFiles, {
        externalBaseuiComponents,
        bundleBareDependencies,
        externalReactDependencies,
        inlineBaseuiComponentPaths,
      });

      if (didCancel) return;

      if (!result.ok) {
        transitionState({ phase: "error", error: result.error });
        return;
      }

      // Fail fast instead of hanging: a bare import the import map can't
      // resolve kills the module script without firing any window error.
      const missingModules = findMissingPreviewModules(
        result.code,
        getPreviewDependencies(),
        { vendor: effectivePreviewVendor },
      );
      if (missingModules.length > 0) {
        transitionState({
          phase: "error",
          error: `The app imports packages that are not available in the preview: ${missingModules.join(
            ", ",
          )}. Rewrite the app without these imports, using only the preview's bundled dependencies.`,
        });
        return;
      }

      shouldStoreIframeCompiledCssRef.current = cachedTailwindCss === undefined;

      const nextSrcdoc = buildSrcdoc(
        result.code,
        result.css,
        getPreviewDependencies(),
        {
          precompiledTailwindCss: cachedTailwindCss,
          tailwindCandidateClasses,
          vendor: effectivePreviewVendor,
        },
      );

      // React skips the srcdoc attribute write when the string is unchanged,
      // so the iframe never reloads and never re-posts `ready` — the watchdog
      // would then report a bogus 60s failure over a working preview.
      const isSameSrcdoc = nextSrcdoc === loadedSrcdocRef.current;
      const isManualRefresh = refreshNonce !== loadedRefreshNonceRef.current;

      if (isSameSrcdoc && !isManualRefresh) {
        if (loadedSrcdocReadyRef.current) {
          setMetrics({
            bundleMs: result.durationMs,
            bundleCacheHit: result.cacheHit,
            bundleCacheSource: result.cacheSource,
            bundleCacheLookupMs: result.cacheLookupMs,
            esbuildEnsureMs: result.ensureMs,
            assemblyMs,
            tailwindCacheReadMs,
            tailwindCssCacheHit: cachedTailwindCss !== undefined,
            prepareMs: performance.now() - runStartedAtRef.current,
            totalMs: performance.now() - runStartedAtRef.current,
          });
          transitionState({ phase: "ready" });
          setHasEverBeenReady(true);
          return;
        }
      }

      const runSrcdoc =
        isSameSrcdoc
          ? // Same document, either from manual refresh or a retry after a
            // missing ready signal: force a real iframe reload.
            nextSrcdoc.replace("<body>", `<body><!-- reload:${Date.now()} -->`)
          : nextSrcdoc;
      loadedSrcdocRef.current = nextSrcdoc;
      loadedSrcdocReadyRef.current = false;
      loadedRefreshNonceRef.current = refreshNonce;

      iframeStartedAtRef.current = performance.now();
      setSrcdoc(runSrcdoc);
      setMetrics({
        bundleMs: result.durationMs,
        bundleCacheHit: result.cacheHit,
        bundleCacheSource: result.cacheSource,
        bundleCacheLookupMs: result.cacheLookupMs,
        esbuildEnsureMs: result.ensureMs,
        assemblyMs,
        tailwindCacheReadMs,
        tailwindCssCacheHit: cachedTailwindCss !== undefined,
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
        canAutoFix: false,
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
    runKey,
    previewKit,
    previewDebounceMs,
    effectivePreviewVendor,
    previewBundleMode,
    tailwindCssCacheKey,
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

        // Flip to ready before anything else: an exception in the auxiliary
        // work below must never swallow the ready signal (that turns a
        // working preview into a bogus 60s watchdog failure).
        loadedSrcdocReadyRef.current = true;
        transitionState({ phase: "ready" });
        setHasEverBeenReady(true);
        try {
          nudgeIframePaint(iframeRef.current);
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
        } catch {
          // Metrics/cache/paint-nudge failures are non-fatal by design.
        }
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
  const canAutoFix = state.phase !== "error" || state.canAutoFix !== false;

  const autoFixSentForFilesRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !canAutoFix ||
      !allowAutoFix ||
      !onRequestFix ||
      isFixPending ||
      !error ||
      !filesKey
    ) {
      return;
    }
    if (autoFixSentForFilesRef.current === filesKey) {
      return;
    }
    autoFixSentForFilesRef.current = filesKey;
    onRequestFix(error);
  }, [allowAutoFix, canAutoFix, error, filesKey, isFixPending, onRequestFix]);

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
      {(state.phase === "bundling" || state.phase === "running") &&
        (!hasEverBeenReady ? (
          // Nothing has ever rendered in the iframe: it is a blank white
          // document until `ready`, so the loading state must cover the
          // panel for the whole boot (bundle + iframe boot + tailwind), not
          // just until the srcdoc is set.
          <PreviewLoadingOverlay phase={state.phase} metrics={metrics} />
        ) : (
          // Keep the current preview visible during re-bundles; just hint
          // that an update is in flight.
          <div className="absolute bottom-3 right-3 animate-pulse rounded-full border border-gray-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm">
            Updating...
          </div>
        ))}
      {error && (
        <ErrorMessage
          error={error}
          onRequestFix={canAutoFix ? onRequestFix : undefined}
          disabled={isFixPending}
        />
      )}
      {showDebugMetrics && (
        <PreviewMetricsBadge state={state} metrics={metrics} />
      )}
    </div>
  );
}

function PreviewLoadingOverlay({
  phase,
  metrics,
}: {
  phase: "bundling" | "running";
  metrics: PreviewMetrics;
}) {
  // Real pipeline signals, in order: esbuild finishes (phase leaves
  // "bundling"), the iframe document loads, tailwind finishes compiling.
  const steps = [
    { label: "Bundling code", done: phase !== "bundling" },
    { label: "Starting preview", done: metrics.documentMs !== undefined },
    { label: "Compiling styles", done: metrics.styledMs !== undefined },
  ];
  const activeIndex = steps.findIndex((step) => !step.done);
  const progress =
    activeIndex === -1 ? 96 : [16, 48, 80][activeIndex];

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white">
      <div className="flex w-56 flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium text-gray-900">
            Building your app
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            return (
              <li
                key={step.label}
                className={`flex items-center gap-2 text-[13px] transition-colors duration-300 ${
                  step.done
                    ? "text-gray-400"
                    : isActive
                      ? "font-medium text-gray-900"
                      : "text-gray-300"
                }`}
              >
                <span className="flex size-4 items-center justify-center">
                  {step.done ? (
                    <CheckIcon className="size-3.5 text-blue-500" />
                  ) : isActive ? (
                    <span className="size-3 animate-spin rounded-full border-[1.5px] border-gray-300 border-t-blue-500" />
                  ) : (
                    <span className="size-1 rounded-full bg-gray-300" />
                  )}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      </div>
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

function nudgeIframePaint(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;

  // Never touch the iframe's own styles here. The old transform/opacity/
  // willChange dance promoted and then demoted the iframe's compositor
  // layer, and that demotion was observed dropping the rastered surface of
  // a HEALTHY visible preview: the panel went blank shortly after window
  // focus returned, and every manual refresh re-blanked it (the `ready`
  // handler re-ran the dance). Since an idle app produces no new paint
  // damage, the blank then persisted indefinitely.
  //
  // Instead, ask the srcdoc bridge to produce a few frames of imperceptible
  // 1x1-pixel paint damage inside the frame (the same keep-alive that fixes
  // loads in hidden tabs). Inner damage forces Chromium to re-raster the
  // frame's surface without any layer churn, so it is safe to fire over a
  // perfectly healthy preview.
  iframe.contentWindow?.postMessage({ type: "llamacoder-repaint" }, "*");
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
    // Quota exceeded: these entries are up to 1MB each, so a few dozen app
    // versions fill localStorage and every future write would silently fail.
    // Drop all preview CSS entries (old cache versions included) and retry.
    try {
      const staleKeys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index++) {
        const storedKey = window.localStorage.key(index);
        if (storedKey?.startsWith(PREVIEW_TAILWIND_CSS_CACHE_PREFIX)) {
          staleKeys.push(storedKey);
        }
      }
      staleKeys.forEach((staleKey) => window.localStorage.removeItem(staleKey));
      window.localStorage.setItem(key, css);
    } catch {
      // Memory cache still covers same-page preview rerenders.
    }
  }
}

function hashString(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function formatErrorForFixPayload(error: string, consoleErrors: string[]) {
  if (consoleErrors.length === 0) return error;

  return `${error}\n\nConsole errors before the fatal error:\n${consoleErrors
    .map((message) => `- ${message}`)
    .join("\n")}`;
}
