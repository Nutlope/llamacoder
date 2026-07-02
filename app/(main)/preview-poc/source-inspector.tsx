"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Code2Icon,
  CopyIcon,
  FileIcon,
  FilesIcon,
  FolderIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

type PreviewFile = {
  path: string;
  content: string;
};

type SourceView = "generated" | "assembled";

type FileTreeNode = {
  name: string;
  path: string;
  type: "directory" | "file";
  children: Array<FileTreeNode>;
};

export default function SourceInspector({
  generatedFiles,
  assembledFiles,
}: {
  generatedFiles: Array<PreviewFile>;
  assembledFiles: Array<PreviewFile>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<SourceView>("generated");
  const [activePathByView, setActivePathByView] = useState<
    Record<SourceView, string>
  >({
    generated: generatedFiles[0]?.path ?? "",
    assembled: assembledFiles[0]?.path ?? "",
  });
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>(
    {},
  );
  const [didCopy, setDidCopy] = useState(false);
  const files = view === "generated" ? generatedFiles : assembledFiles;
  const activePath = activePathByView[view];
  const activeFile = files.find((file) => file.path === activePath) ?? files[0];
  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const totalLines = useMemo(
    () =>
      files.reduce((count, file) => count + file.content.split("\n").length, 0),
    [files],
  );

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-50 w-[min(calc(100vw-2rem),920px)] text-zinc-950">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-zinc-50"
      >
        <Code2Icon className="size-4" />
        {isOpen ? "Hide source" : "Show source"}
      </button>

      {isOpen && (
        <section className="pointer-events-auto mt-3 overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-xl">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Preview source files</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <FilesIcon className="size-3.5" />
                {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                {totalLines} lines in{" "}
                {view === "generated"
                  ? "generated payload"
                  : "assembled preview filesystem"}
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!activeFile) return;

                setDidCopy(true);
                await navigator.clipboard.writeText(activeFile.content);
                window.setTimeout(() => setDidCopy(false), 1600);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-2.5 py-1.5 text-xs font-medium transition hover:bg-zinc-50"
            >
              {didCopy ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
              Copy file
            </button>
          </header>

          <div className="flex gap-1 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
            <button
              type="button"
              onClick={() => setView("generated")}
              className={`rounded px-2.5 py-1.5 text-xs font-medium ${
                view === "generated"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Generated payload ({generatedFiles.length})
            </button>
            <button
              type="button"
              onClick={() => setView("assembled")}
              className={`rounded px-2.5 py-1.5 text-xs font-medium ${
                view === "assembled"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              Preview filesystem ({assembledFiles.length})
            </button>
          </div>

          <div className="grid h-[72vh] min-h-0 grid-cols-1 md:grid-cols-[300px_1fr]">
            <nav className="min-h-0 overflow-auto border-b border-zinc-200 bg-zinc-50 p-2 md:border-b-0 md:border-r">
              {fileTree.children.map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  view={view}
                  depth={0}
                  activePath={activeFile?.path ?? ""}
                  expandedPaths={expandedPaths}
                  onToggle={(path, nextExpanded) =>
                    setExpandedPaths((current) => ({
                      ...current,
                      [`${view}:${path}`]: nextExpanded,
                    }))
                  }
                  onSelect={(path) =>
                    setActivePathByView((current) => ({
                      ...current,
                      [view]: path,
                    }))
                  }
                />
              ))}
            </nav>

            <div className="min-w-0 overflow-auto bg-zinc-950">
              <div className="sticky top-0 border-b border-zinc-800 bg-zinc-900 px-4 py-2 font-mono text-xs text-zinc-300">
                {activeFile?.path}
              </div>
              <pre className="p-4 text-xs leading-5 text-zinc-100">
                <code>{activeFile?.content}</code>
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TreeItem({
  node,
  view,
  depth,
  activePath,
  expandedPaths,
  onToggle,
  onSelect,
}: {
  node: FileTreeNode;
  view: SourceView;
  depth: number;
  activePath: string;
  expandedPaths: Record<string, boolean>;
  onToggle: (path: string, nextExpanded: boolean) => void;
  onSelect: (path: string) => void;
}) {
  const isDirectory = node.type === "directory";
  const isExpanded = isNodeExpanded(view, node.path, depth, expandedPaths);

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          isDirectory ? onToggle(node.path, !isExpanded) : onSelect(node.path)
        }
        className={`flex w-full min-w-0 items-center gap-1 rounded px-1.5 py-1.5 text-left font-mono text-xs ${
          !isDirectory && node.path === activePath
            ? "bg-zinc-900 font-medium text-white"
            : "text-zinc-700 hover:bg-zinc-200"
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
        title={node.path}
      >
        {isDirectory ? (
          isExpanded ? (
            <ChevronDownIcon className="size-3.5 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {isDirectory ? (
          <FolderIcon className="size-3.5 shrink-0 text-zinc-500" />
        ) : (
          <FileIcon className="size-3.5 shrink-0 text-zinc-500" />
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDirectory &&
        isExpanded &&
        node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            view={view}
            depth={depth + 1}
            activePath={activePath}
            expandedPaths={expandedPaths}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

function isNodeExpanded(
  view: SourceView,
  path: string,
  depth: number,
  expandedPaths: Record<string, boolean>,
) {
  return expandedPaths[`${view}:${path}`] ?? depth < 2;
}

function buildFileTree(files: Array<PreviewFile>): FileTreeNode {
  const root: FileTreeNode = {
    name: "",
    path: "",
    type: "directory",
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join("/");
      const type = index === parts.length - 1 ? "file" : "directory";
      let child = current.children.find((item) => item.path === path);

      if (!child) {
        child = { name: part, path, type, children: [] };
        current.children.push(child);
        current.children.sort(sortTreeNodes);
      }

      current = child;
    });
  }

  return root;
}

function sortTreeNodes(left: FileTreeNode, right: FileTreeNode) {
  if (left.type !== right.type) {
    return left.type === "directory" ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}
