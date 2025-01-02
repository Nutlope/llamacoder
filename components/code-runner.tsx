import {
  runJavaScriptCode,
  runPythonCode,
} from "@/components/code-runner-actions";
import CodeRunnerServerAction from "@/components/code-runner-server-action";
import CodeRunnerReact from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return <CodeRunnerReact code={code} />;

  return (
    <>
      {language === "python" ? (
        <CodeRunnerServerAction
          code={code}
          runCodeAction={runPythonCode}
          key={code}
        />
      ) : ["ts", "js", "javascript", "typescript"].includes(language) ? (
        <CodeRunnerServerAction
          code={code}
          runCodeAction={runJavaScriptCode}
          key={code}
        />
      ) : (
        <CodeRunnerReact code={code} />
      )}
    </>
  );
}
