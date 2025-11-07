"use client";

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";

export default function SyntaxHighlighter({
  files,
}: {
  files: Array<{ name: string; content: string; language: string }>;
}) {
  const file = files[0];
  const monacoLanguage = useMemo(
    () => getMonacoLanguage(file.language),
    [file.language],
  );

  return (
    <Editor
      value={file.content}
      language={monacoLanguage}
      theme="github-light-default"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
      }}
      height="85vh"
    />
  );
}
