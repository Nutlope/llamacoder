"use client";

import { useEffect, useRef, useState } from "react";
import { bundle } from "@/lib/preview/bundle";
import {
  assemblePreviewFiles,
  getPreviewDependencies,
} from "@/lib/preview/files";
import { buildSrcdoc } from "@/lib/preview/html";

type GeneratedFile = {
  path: string;
  content: string;
};

type Phase = "idle" | "bundling" | "running" | "ready" | "error";

type HarnessResult = {
  build: { ok: boolean; stdout: string; stderr: string; durationMs: number };
  runtime: { ok: boolean; consoleErrors: string[]; durationMs: number };
};

// Match the app runner's watchdog (see code-runner-react.tsx): 60s of headroom
// for cold heavy-dep bundles, still bounded so a true hang surfaces an error.
const WATCHDOG_MS = 60_000;

declare global {
  interface Window {
    renderFiles: (files: GeneratedFile[]) => Promise<HarnessResult>;
    getEvalHarnessResult: () => HarnessResult;
  }
}

const emptyResult: HarnessResult = {
  build: { ok: false, stdout: "", stderr: "", durationMs: 0 },
  runtime: { ok: false, consoleErrors: [], durationMs: 0 },
};

export default function EvalHarnessClient() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeStartedAtRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const watchdogRef = useRef<number | null>(null);
  const resultRef = useRef<HarnessResult>(emptyResult);
  const [srcdoc, setSrcdoc] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<HarnessResult>(emptyResult);

  function updatePhase(nextPhase: Phase) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }

  function updateResult(
    updater: (current: HarnessResult) => HarnessResult,
  ): HarnessResult {
    const next = updater(resultRef.current);
    resultRef.current = next;
    setResult(next);
    return next;
  }

  useEffect(() => {
    window.getEvalHarnessResult = () => resultRef.current;
    window.renderFiles = async (files: GeneratedFile[]) => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);

      iframeStartedAtRef.current = null;
      setSrcdoc("");
      updatePhase("bundling");
      updateResult(() => emptyResult);

      const buildResult = await bundle(
        assemblePreviewFiles(files, {
          uiLibrary: "baseui",
          externalBaseuiComponents: true,
        }),
        {
          externalBaseuiComponents: true,
        },
      );

      if (!buildResult.ok) {
        updatePhase("error");
        return updateResult(() => ({
          build: {
            ok: false,
            stdout: "",
            stderr: buildResult.error,
            durationMs: buildResult.durationMs,
          },
          runtime: { ok: false, consoleErrors: [], durationMs: 0 },
        }));
      }

      updateResult(() => ({
        build: {
          ok: true,
          stdout: "",
          stderr: "",
          durationMs: buildResult.durationMs,
        },
        runtime: { ok: false, consoleErrors: [], durationMs: 0 },
      }));

      iframeStartedAtRef.current = performance.now();
      // Unique marker per run: rendering the same files twice would otherwise
      // produce an identical srcdoc, React would skip the attribute write, and
      // the iframe would never reload or re-post `ready` (60s watchdog).
      setSrcdoc(
        buildSrcdoc(
          buildResult.code,
          buildResult.css,
          getPreviewDependencies(),
          { vendor: "flat" },
        ).replace("<body>", `<body><!-- run:${Date.now()} -->`),
      );
      updatePhase("running");

      watchdogRef.current = window.setTimeout(() => {
        if (phaseRef.current !== "running") return;
        updatePhase("error");
        updateResult((current) => ({
          ...current,
          runtime: {
            ...current.runtime,
            ok: false,
            durationMs: elapsedRuntimeMs(),
          },
        }));
      }, WATCHDOG_MS);

      return resultRef.current;
    };

    return () => {
      if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    };
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.source !== "preview"
      ) {
        return;
      }

      if (event.data.type === "console-error") {
        updateResult((current) => ({
          ...current,
          runtime: {
            ...current.runtime,
            consoleErrors: [
              ...current.runtime.consoleErrors,
              String(event.data.message || "Unknown console error"),
            ],
          },
        }));
        return;
      }

      if (event.data.type === "error") {
        updatePhase("error");
        updateResult((current) => ({
          ...current,
          runtime: {
            ...current.runtime,
            ok: false,
            // Record the uncaught error / rejection message so runtime failures
            // are diagnosable (previously "error" only flipped phase, leaving
            // consoleErrors empty — the "runtime, no msg" mystery).
            consoleErrors: [
              ...current.runtime.consoleErrors,
              String(event.data.message || "Unknown runtime error"),
            ],
            durationMs: elapsedRuntimeMs(),
          },
        }));
        return;
      }

      if (event.data.type === "ready") {
        if (phaseRef.current === "error") return;
        updatePhase("ready");
        updateResult((current) => ({
          ...current,
          runtime: {
            ...current.runtime,
            ok: true,
            durationMs: elapsedRuntimeMs(),
          },
        }));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function elapsedRuntimeMs() {
    return iframeStartedAtRef.current
      ? performance.now() - iframeStartedAtRef.current
      : 0;
  }

  return (
    <main
      className="h-screen w-screen bg-white"
      data-preview-phase={phase}
      data-preview-build-ms={formatMetric(result.build.durationMs)}
      data-preview-runtime-ms={formatMetric(result.runtime.durationMs)}
      data-preview-console-errors={JSON.stringify(
        result.runtime.consoleErrors,
      )}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts allow-forms allow-modals allow-popups"
        srcDoc={srcdoc}
        title="Preview harness"
        className="h-full w-full border-0"
      />
    </main>
  );
}

function formatMetric(value: number) {
  return value ? String(Math.round(value)) : "";
}
