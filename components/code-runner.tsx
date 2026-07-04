import CodeRunnerReact, {
  type PreviewBundleMode,
  type PreviewVendorMode,
} from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  files,
  onRequestFix,
  previewKit,
  previewDebounceMs,
  previewVendor,
  previewBundleMode,
}: {
  language?: string;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  previewKit?: "radix" | "baseui";
  previewDebounceMs?: number;
  previewVendor?: PreviewVendorMode;
  previewBundleMode?: PreviewBundleMode;
}) {
  const actualFiles =
    files || (code ? [{ path: "App.tsx", content: code }] : []);
  return (
    <CodeRunnerReact
      files={actualFiles}
      onRequestFix={onRequestFix}
      previewKit={previewKit}
      previewDebounceMs={previewDebounceMs}
      previewVendor={previewVendor}
      previewBundleMode={previewBundleMode}
    />
  );
}
