import {
  runJavaScriptCode,
  runPythonCode,
} from "@/app/(main)/chats/[id]/actions";
import CodeRunnerServerAction from "@/components/code-runner-server-action";
import CodeRunnerReact from "./code-runner-react";

export default function CodeRunner({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
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
