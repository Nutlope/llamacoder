"use client";

import {
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react/unstyled";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSandpackConfig } from "@/lib/sandpack-config";
import { bundle, ensureEsbuild } from "@/lib/preview/bundle";
import {
  assemblePreviewFiles,
  getPreviewDependencies,
  type PreviewUiLibrary,
} from "@/lib/preview/files";
import { buildSrcdoc } from "@/lib/preview/html";

type RunnerProps = {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  previewKit?: PreviewUiLibrary;
};

type PreviewState =
  | { phase: "bundling" }
  | { phase: "running" }
  | { phase: "ready" }
  | { phase: "error"; error: string };

type PreviewMetrics = {
  bundleMs?: number;
  prepareMs?: number;
  runtimeMs?: number;
  totalMs?: number;
  documentMs?: number;
  styledMs?: number;
  iframeReadyMs?: number;
  resourceCount?: number;
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

const PREVIEW_WATCHDOG_MS = 15_000;

export default function ReactCodeRunner({
  files,
  onRequestFix,
  previewKit = "radix",
}: RunnerProps) {
  const useWasmPreview = useWasmPreviewFlag();

  if (useWasmPreview || previewKit === "baseui") {
    return (
      <WasmReactCodeRunner
        files={files}
        onRequestFix={onRequestFix}
        previewKit={previewKit}
      />
    );
  }

  return <SandpackReactCodeRunner files={files} onRequestFix={onRequestFix} />;
}

function SandpackReactCodeRunner({ files, onRequestFix }: RunnerProps) {
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
      {onRequestFix && <SandpackErrorMessage onRequestFix={onRequestFix} />}
    </SandpackProvider>
  );
}

function WasmReactCodeRunner({
  files,
  onRequestFix,
  previewKit = "radix",
}: RunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runStartedAtRef = useRef<number>(0);
  const iframeStartedAtRef = useRef<number | null>(null);
  const stateRef = useRef<PreviewState>({ phase: "bundling" });
  const consoleErrorsRef = useRef<string[]>([]);
  const showDebugMetrics = usePreviewDebugFlag();
  const [srcdoc, setSrcdoc] = useState("");
  const [state, setState] = useState<PreviewState>({ phase: "bundling" });
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<PreviewMetrics>({});
  const filesKey = useMemo(
    () => files.map((file) => file.path + file.content).join(""),
    [files],
  );

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
    let didCancel = false;
    runStartedAtRef.current = performance.now();
    iframeStartedAtRef.current = null;
    consoleErrorsRef.current = [];
    setConsoleErrors([]);
    setMetrics({});
    transitionState({ phase: "bundling" });

    const timeout = window.setTimeout(async () => {
      const result = await bundle(
        assemblePreviewFiles(files, { uiLibrary: previewKit }),
      );

      if (didCancel) return;

      if (!result.ok) {
        transitionState({ phase: "error", error: result.error });
        return;
      }

      iframeStartedAtRef.current = performance.now();
      setSrcdoc(
        buildSrcdoc(
          result.code,
          result.css,
          getPreviewDependencies(previewKit),
        ),
      );
      setMetrics({
        bundleMs: result.durationMs,
        prepareMs: performance.now() - runStartedAtRef.current,
      });
      transitionState({ phase: "running" });
    }, 300);

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
  }, [filesKey, previewKit]);

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

  return (
    <div
      className="relative h-full w-full"
      data-preview-phase={state.phase}
      data-preview-bundle-ms={formatMetricValue(metrics.bundleMs)}
      data-preview-prepare-ms={formatMetricValue(metrics.prepareMs)}
      data-preview-runtime-ms={formatMetricValue(metrics.runtimeMs)}
      data-preview-total-ms={formatMetricValue(metrics.totalMs)}
      data-preview-document-ms={formatMetricValue(metrics.documentMs)}
      data-preview-styled-ms={formatMetricValue(metrics.styledMs)}
      data-preview-iframe-ready-ms={formatMetricValue(metrics.iframeReadyMs)}
      data-preview-resource-count={metrics.resourceCount ?? ""}
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
      {error && <ErrorMessage error={error} onRequestFix={onRequestFix} />}
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
}: {
  onRequestFix: (e: string) => void;
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
}: {
  error: string;
  onRequestFix?: (e: string) => void;
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
              className="rounded bg-white px-2.5 py-1.5 text-sm font-medium text-black"
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
    stylesheetRules: toNumber(data.metrics.stylesheetRules),
    slowResources: Array.isArray(data.metrics.slowResources)
      ? data.metrics.slowResources.filter(isPreviewResource).slice(0, 8)
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

function formatErrorForFixPayload(error: string, consoleErrors: string[]) {
  if (consoleErrors.length === 0) return error;

  return `${error}\n\nConsole errors before the fatal error:\n${consoleErrors
    .map((message) => `- ${message}`)
    .join("\n")}`;
}
