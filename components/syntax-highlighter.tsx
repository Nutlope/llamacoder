"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { getMonacoLanguage } from "@/lib/utils";

export default function SyntaxHighlighter({
  files,
  activePath,
  disableSelection,
  isStreaming,
}: {
  files: Array<{ path: string; content: string; language: string }>;
  activePath?: string;
  disableSelection?: boolean;
  isStreaming?: boolean;
}) {
  const [activeFile, setActiveFile] = useState(0);
  const editorRef = useRef<any>(null);

  // Keep the active file synced when an external activePath is provided
  useEffect(() => {
    if (!activePath) return;
    const idx = files.findIndex((f) => f.path === activePath);
    if (idx !== -1 && idx !== activeFile) {
      setActiveFile(idx);
    }
  }, [activePath, files, activeFile]);

  const file = files[activeFile];
  const monacoLanguage = useMemo(
    () => (file ? getMonacoLanguage(file.language) : "plaintext"),
    [file?.language],
  );

  // Auto-scroll the editor to bottom when streaming updates arrive
  useEffect(() => {
    if (!isStreaming || !editorRef.current) return;
    const editor = editorRef.current;
    const model = editor.getModel?.();
    const lineCount = model?.getLineCount?.() || 1;
    // Reveal last line and ensure scroll position at bottom
    editor.revealLine?.(lineCount);
    const scrollHeight = editor.getScrollHeight?.();
    if (typeof scrollHeight === "number") {
      editor.setScrollTop?.(scrollHeight);
    }
  }, [file?.content, activeFile, isStreaming]);

  if (files.length === 0) {
    return <div className="p-4 text-gray-500">No files to display</div>;
  }

  // Group files by directory structure
  const fileTree = buildFileTree(files);

  return (
    <div className="flex h-full flex-col md:flex-row">
      {files.length > 1 && (
        <>
          {/* Mobile: File tree above code editor */}
          <div className="block border-b border-gray-200 bg-gray-50 md:hidden">
            <div className="border-b border-gray-200 p-2 text-sm font-medium text-gray-700">
              Files ({files.length})
            </div>
            <div className="max-h-32 overflow-y-auto">
              <FileTree
                tree={fileTree}
                activeFile={files[activeFile]?.path}
                onFileSelect={(path) => {
                  if (disableSelection) return;
                  const index = files.findIndex((f) => f.path === path);
                  if (index !== -1) setActiveFile(index);
                }}
              />
            </div>
          </div>

          {/* Desktop: File tree as sidebar */}
          <div
            className={`hidden w-fit max-w-48 border-r border-gray-200 bg-gray-50 md:block md:w-64 ${isStreaming ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className="border-b border-gray-200 p-2 text-sm font-medium text-gray-700">
              Files ({files.length})
            </div>
            <div className="overflow-y-auto">
              <FileTree
                tree={fileTree}
                activeFile={files[activeFile]?.path}
                onFileSelect={(path) => {
                  if (disableSelection) return;
                  const index = files.findIndex((f) => f.path === path);
                  if (index !== -1) setActiveFile(index);
                }}
              />
            </div>
          </div>
        </>
      )}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {file?.path}
        </div>
        <div className="flex-1">
          <div className="relative h-full">
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
                scrollbar: isStreaming
                  ? { vertical: "hidden", horizontal: "hidden" }
                  : { vertical: "auto", horizontal: "auto" },
              }}
              onMount={(editor) => {
                editorRef.current = editor;
                if (isStreaming) {
                  const model = editor.getModel?.();
                  const lineCount = model?.getLineCount?.() || 1;
                  editor.revealLine?.(lineCount);
                  const scrollHeight = editor.getScrollHeight?.();
                  if (typeof scrollHeight === "number") {
                    editor.setScrollTop?.(scrollHeight);
                  }
                }
              }}
              height="82vh"
            />
            {isStreaming && (
              <>
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
                  onWheel={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseMove={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onScroll={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    // Prevent arrow keys, page up/down, home/end from scrolling
                    if (
                      [
                        "ArrowUp",
                        "ArrowDown",
                        "ArrowLeft",
                        "ArrowRight",
                        "PageUp",
                        "PageDown",
                        "Home",
                        "End",
                      ].includes(e.key)
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  tabIndex={-1}
                  style={{ pointerEvents: "all" }}
                />
                <div className="absolute bottom-4 left-0 right-0 z-20 pb-4 pt-8">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-500"></div>
                      </div>
                      <span>
                        AI is writing your{" "}
                        {activePath ? activePath.split("/").pop() : "code"}...
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
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
