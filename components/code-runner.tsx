import CodeRunnerReact, {
  type PreviewBundleMode,
  type PreviewVendorMode,
} from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  files,
  onRequestFix,
  previewDebounceMs,
  previewVendor,
  previewBundleMode,
  isFixPending,
  allowAutoFix,
  refreshNonce,
  isActivePane,
}: {
  language?: string;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
  previewDebounceMs?: number;
  previewVendor?: PreviewVendorMode;
  previewBundleMode?: PreviewBundleMode;
  isFixPending?: boolean;
  allowAutoFix?: boolean;
  refreshNonce?: number;
  isActivePane?: boolean;
}) {
  const actualFiles =
    files || (code ? [{ path: "App.tsx", content: code }] : []);
  return (
    <CodeRunnerReact
      files={actualFiles}
      onRequestFix={onRequestFix}
      previewDebounceMs={previewDebounceMs}
      previewVendor={previewVendor}
      previewBundleMode={previewBundleMode}
      isFixPending={isFixPending}
      allowAutoFix={allowAutoFix}
      refreshNonce={refreshNonce}
      isActivePane={isActivePane}
    />
  );
}
