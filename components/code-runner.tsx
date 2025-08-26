import CodeRunnerReact from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
  onRequestFix,
}: {
  language: string;
  code: string;
  onRequestFix?: (e: string) => void;
}) {
  return <CodeRunnerReact code={code} onRequestFix={onRequestFix} />;
}
