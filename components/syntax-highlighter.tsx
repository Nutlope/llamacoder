"use client";

import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";

export default function SyntaxHighlighter({
  files,
}: {
  files: Array<{ path: string; content: string; language: string }>;
}) {
  const [activeFile, setActiveFile] = useState(0);

  const file = files[activeFile];
  const monacoLanguage = useMemo(
    () => (file ? getMonacoLanguage(file.language) : "plaintext"),
    [file?.language],
  );

  if (files.length === 0) {
    return <div className="p-4 text-gray-500">No files to display</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {files.length > 1 && (
        <div className="flex border-b border-gray-200">
          {files.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setActiveFile(i)}
              className={`border-r border-gray-200 px-3 py-2 text-sm last:border-r-0 ${
                i === activeFile
                  ? "border-b-2 border-blue-500 bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1">
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
      </div>
    </div>
  );
}
