"use client";

import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";

export default function SyntaxHighlighter({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const monacoLanguage = useMemo(() => getMonacoLanguage(language), [language]);

  return (
    <Editor
      value={code}
      language={monacoLanguage}
      theme="github-light-default"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
      height="90vh"
    />
  );
}
