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
import { assemblePreviewFiles } from "@/lib/preview/files";
import { buildSrcdoc } from "@/lib/preview/html";

type RunnerProps = {
  files: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
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
};

export default function ReactCodeRunner({ files, onRequestFix }: RunnerProps) {
  const useWasmPreview = useWasmPreviewFlag();

  if (useWasmPreview) {
    return <WasmReactCodeRunner files={files} onRequestFix={onRequestFix} />;
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

function WasmReactCodeRunner({ files, onRequestFix }: RunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runStartedAtRef = useRef<number>(0);
  const iframeStartedAtRef = useRef<number | null>(null);
  const showDebugMetrics = usePreviewDebugFlag();
  const [srcdoc, setSrcdoc] = useState("");
  const [state, setState] = useState<PreviewState>({ phase: "bundling" });
  const [metrics, setMetrics] = useState<PreviewMetrics>({});
  const filesKey = useMemo(
    () => files.map((file) => file.path + file.content).join(""),
    [files],
  );

  useEffect(() => {
    void ensureEsbuild();
  }, []);

  useEffect(() => {
    let didCancel = false;
    runStartedAtRef.current = performance.now();
    iframeStartedAtRef.current = null;
    setMetrics({});
    setState({ phase: "bundling" });

    const timeout = window.setTimeout(async () => {
      const result = await bundle(assemblePreviewFiles(files));

      if (didCancel) return;

      if (!result.ok) {
        setState({ phase: "error", error: result.error });
        return;
      }

      iframeStartedAtRef.current = performance.now();
      setSrcdoc(buildSrcdoc(result.code, result.css));
      setMetrics({
        bundleMs: result.durationMs,
        prepareMs: performance.now() - runStartedAtRef.current,
      });
      setState({ phase: "running" });
    }, 300);

    return () => {
      didCancel = true;
      window.clearTimeout(timeout);
    };
  }, [filesKey]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.source !== "preview"
      ) {
        return;
      }

      if (event.data.type === "ready") {
        const readyAt = performance.now();
        setMetrics((current) => ({
          ...current,
          runtimeMs: iframeStartedAtRef.current
            ? readyAt - iframeStartedAtRef.current
            : undefined,
          totalMs: readyAt - runStartedAtRef.current,
        }));
        setState({ phase: "ready" });
        return;
      }

      if (event.data.type === "error") {
        setState({
          phase: "error",
          error: String(event.data.message || "Unknown preview error"),
        });
        return;
      }

      if (event.data.type === "console-error") {
        setState({
          phase: "error",
          error: String(event.data.message || "Unknown console error"),
        });
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const error = state.phase === "error" ? state.error : undefined;

  return (
    <div
      className="relative h-full w-full"
      data-preview-phase={state.phase}
      data-preview-bundle-ms={formatMetricValue(metrics.bundleMs)}
      data-preview-prepare-ms={formatMetricValue(metrics.prepareMs)}
      data-preview-runtime-ms={formatMetricValue(metrics.runtimeMs)}
      data-preview-total-ms={formatMetricValue(metrics.totalMs)}
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
    <div className="absolute bottom-3 left-3 z-20 rounded-md border border-zinc-300 bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur">
      <span className="mr-2 text-zinc-500">wasm</span>
      <span className="mr-2">phase {state.phase}</span>
      <span className="mr-2">prep {formatMs(metrics.prepareMs)}</span>
      <span className="mr-2">bundle {formatMs(metrics.bundleMs)}</span>
      <span className="mr-2">runtime {formatMs(metrics.runtimeMs)}</span>
      <span>total {formatMs(metrics.totalMs)}</span>
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
  const envFlag = process.env.NEXT_PUBLIC_PREVIEW_RUNNER === "wasm";
  const [queryFlag, setQueryFlag] = useState<"sandpack" | "wasm" | null>(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview");
    setQueryFlag(preview === "wasm" || preview === "sandpack" ? preview : null);
  }, []);

  return queryFlag ? queryFlag === "wasm" : envFlag;
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
