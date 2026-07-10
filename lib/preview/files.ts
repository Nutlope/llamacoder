import {
  baseuiPreviewFiles,
} from "./generated/baseui-files";
import { PREVIEW_DEPS, buildImportMapObject, buildPreviewPackageJson } from "./deps";

export type PreviewInputFile = { path: string; content: string };
export type PreviewUiLibrary = "baseui";

export function assemblePreviewFiles(
  files: Array<PreviewInputFile>,
  options: {
    uiLibrary?: PreviewUiLibrary;
    externalBaseuiComponents?: boolean;
    inlineBaseuiComponentPaths?: string[];
  } = {},
): Record<string, string> {
  const sourceInjectedFiles = baseuiPreviewFiles;
  const injectedFiles =
    options.externalBaseuiComponents
      ? omitExternalizedBaseuiFiles(
          sourceInjectedFiles,
          new Set(options.inlineBaseuiComponentPaths ?? []),
        )
      : sourceInjectedFiles;
  const deps = getPreviewDependencies();
  const previewFiles: Record<string, string> = {
    ...injectedFiles,
  };

  if (!options.externalBaseuiComponents) {
    previewFiles["package.json"] = buildPreviewPackageJson(deps);
    previewFiles["import-map.json"] = JSON.stringify(
      buildImportMapObject(deps),
      null,
      2,
    );
  }

  for (const file of files) {
    const normalized = normalizeModelPath(file.path);
    if (normalized in sourceInjectedFiles) continue;
    previewFiles[normalized] = file.content;
  }

  if (!previewFiles["App.tsx"] && files.length > 0) {
    const mainFile =
      files.find((file) => /\.(tsx|jsx)$/.test(file.path)) || files[0];
    const importPath = normalizeModelPath(mainFile.path).replace(
      /\.(tsx|ts|jsx|js)$/,
      "",
    );

    previewFiles["App.tsx"] = `import React from "react";
import MainComponent from "./${importPath}";

export default function App() {
  return <MainComponent />;
}`;
  }

previewFiles["main.tsx"] = `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`;

  return previewFiles;
}

export function collectUsedBaseuiInlinePaths(files: Array<PreviewInputFile>) {
  const sourceFiles = Object.fromEntries(
    files.map((file) => [normalizeModelPath(file.path), file.content]),
  );
  const inlinePaths = new Set<string>();
  const queue: string[] = [];

  for (const [path, content] of Object.entries(sourceFiles)) {
    collectBaseuiImports(content, path, (resolvedPath) => {
      if (shouldInlineBaseuiPath(resolvedPath, true)) {
        queueInlinePath(resolvedPath, inlinePaths, queue);
      }
    });
  }

  for (let index = 0; index < queue.length; index++) {
    const path = queue[index];
    const content = baseuiPreviewFiles[path];
    if (!content) continue;

    collectBaseuiImports(content, path, (resolvedPath) => {
      if (shouldInlineBaseuiPath(resolvedPath, false)) {
        queueInlinePath(resolvedPath, inlinePaths, queue);
      }
    });
  }

  return [...inlinePaths].sort();
}

function queueInlinePath(
  path: string,
  inlinePaths: Set<string>,
  queue: string[],
) {
  if (inlinePaths.has(path)) return;
  inlinePaths.add(path);
  queue.push(path);
}

function collectBaseuiImports(
  content: string,
  importer: string,
  onImport: (path: string) => void,
) {
  const importPattern =
    /(?:import|export)\s+(?:[^'"]*?\s+from\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(content))) {
    const specifier = match[1] || match[2];
    const resolvedPath = resolveBaseuiPreviewPath(specifier, importer);
    if (resolvedPath) onImport(resolvedPath);
  }
}

function resolveBaseuiPreviewPath(specifier: string, importer: string) {
  const withoutQuery = specifier.split("?")[0] || specifier;
  let basePath: string;

  if (withoutQuery.startsWith("@/")) {
    basePath = withoutQuery.slice(2);
  } else if (withoutQuery.startsWith(".")) {
    basePath = joinPreviewPath(dirname(importer), withoutQuery);
  } else {
    return null;
  }

  return probeBaseuiPreviewFile(basePath);
}

function probeBaseuiPreviewFile(path: string) {
  const normalized = normalizePreviewPath(path);
  const candidates = [
    normalized,
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.jsx`,
    `${normalized}/index.js`,
  ];

  return candidates.find((candidate) => candidate in baseuiPreviewFiles) ?? null;
}

function shouldInlineBaseuiPath(path: string, directUserImport: boolean) {
  if (
    path === "lib/utils.ts" ||
    path === "hooks/use-mobile.ts" ||
    path === "hooks/use-toast.ts"
  ) {
    return true;
  }

  if (!path.startsWith("components/ui/")) return false;
  if (path === "components/ui/index.tsx") return false;

  return directUserImport || isSmallBaseuiSupportPath(path);
}

function isSmallBaseuiSupportPath(path: string) {
  return (
    path === "components/ui/button.tsx" ||
    path === "components/ui/kbd.tsx" ||
    path === "components/ui/input.tsx" ||
    path === "components/ui/label.tsx" ||
    path === "components/ui/separator.tsx" ||
    path === "components/ui/skeleton.tsx" ||
    path === "components/ui/spinner.tsx" ||
    path === "components/ui/textarea.tsx" ||
    path === "components/ui/typography.tsx"
  );
}

function dirname(path: string) {
  const normalized = normalizePreviewPath(path);
  const index = normalized.lastIndexOf("/");

  return index === -1 ? "" : normalized.slice(0, index);
}

function joinPreviewPath(basePath: string, path: string) {
  return normalizePreviewPath(basePath ? `${basePath}/${path}` : path);
}

function normalizePreviewPath(path: string) {
  const parts: string[] = [];

  for (const part of path.replace(/^\/+/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }

  return parts.join("/");
}

function omitExternalizedBaseuiFiles(
  files: Record<string, string>,
  inlinePaths: Set<string>,
) {
  return Object.fromEntries(
    Object.entries(files).filter(
      ([path]) =>
        inlinePaths.has(path) || !isExternalizedBaseuiPreviewFile(path),
    ),
  );
}

function isExternalizedBaseuiPreviewFile(path: string) {
  return (
    path === "components.json" ||
    path === "package.json" ||
    path === "tsconfig.json" ||
    path === "styles/globals.css" ||
    path === "lib/utils.ts" ||
    path === "hooks/use-mobile.ts" ||
    path === "hooks/use-toast.ts" ||
    path.startsWith("components/ui/")
  );
}

export function getPreviewDependencies(): Record<string, string> {
  return PREVIEW_DEPS;
}

// Sorted, de-duplicated component base names derived from the same injected
// Base UI file map the renderer uses. Pure Object.keys enumeration — no
// filesystem reads. Excludes the non-component utility entries.
export function listInjectedComponentNames(): string[] {
  const fileMap = baseuiPreviewFiles;
  const excluded = new Set(["index", "use-toast", "toaster"]);
  const names = new Set<string>();

  for (const file of Object.keys(fileMap)) {
    const match = file.match(/^\/?components\/ui\/([^/]+)\.tsx$/);
    if (!match) continue;
    const name = match[1];
    if (excluded.has(name)) continue;
    names.add(name);
  }

  return [...names].sort();
}

function normalizeModelPath(path: string): string {
  let normalizedPath = path.replace(/^\/+/, "");

  if (normalizedPath.startsWith("src/")) {
    normalizedPath = normalizedPath.slice(4);
  }

  return normalizedPath;
}
