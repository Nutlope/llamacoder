import CodeRunnerReact from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  files,
  onRequestFix,
}: {
  language: string;
  code?: string;
  files?: Array<{ path: string; content: string }>;
  onRequestFix?: (e: string) => void;
}) {
  const actualFiles =
    files || (code ? [{ path: "App.tsx", content: code }] : []);
  return <CodeRunnerReact files={actualFiles} onRequestFix={onRequestFix} />;
}
