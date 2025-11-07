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

  // Group files by directory structure
  const fileTree = buildFileTree(files);

  return (
    <div className="flex h-full">
      {files.length > 1 && (
        <div className="w-64 border-r border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 p-2 text-sm font-medium text-gray-700">
            Files ({files.length})
          </div>
          <div className="overflow-y-auto">
            <FileTree
              tree={fileTree}
              activeFile={files[activeFile]?.path}
              onFileSelect={(path) => {
                const index = files.findIndex((f) => f.path === path);
                if (index !== -1) setActiveFile(index);
              }}
            />
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {file?.path}
        </div>
        <div className="flex-1">
          <Editor
            value={file?.content || ""}
            language={monacoLanguage}
            theme="github-light-default"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
            }}
            height="82vh"
          />
        </div>
      </div>
    </div>
  );
}

function buildFileTree(
  files: Array<{ path: string; content: string; language: string }>,
) {
  const tree: any = {};

  files.forEach((file) => {
    const parts = file.path.split("/");
    let current = tree;

    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] =
          index === parts.length - 1 ? { ...file, isFile: true } : {};
      }
      current = current[part];
    });
  });

  return tree;
}

function FileTree({
  tree,
  activeFile,
  onFileSelect,
  prefix = "",
}: {
  tree: any;
  activeFile: string;
  onFileSelect: (path: string) => void;
  prefix?: string;
}) {
  return (
    <>
      {Object.entries(tree).map(([name, node]: [string, any]) => {
        const fullPath = prefix ? `${prefix}/${name}` : name;
        const isActive = fullPath === activeFile;

        if (node.isFile) {
          return (
            <div
              key={name}
              className={`cursor-pointer px-2 py-1 text-sm hover:bg-gray-200 ${
                isActive ? "bg-blue-100 text-blue-700" : "text-gray-700"
              }`}
              onClick={() => onFileSelect(fullPath)}
            >
              📄 {name}
            </div>
          );
        } else {
          return (
            <div key={name}>
              <div className="px-2 py-1 text-sm font-medium text-gray-600">
                📁 {name}
              </div>
              <div className="ml-4">
                <FileTree
                  tree={node}
                  activeFile={activeFile}
                  onFileSelect={onFileSelect}
                  prefix={fullPath}
                />
              </div>
            </div>
          );
        }
      })}
    </>
  );
}
