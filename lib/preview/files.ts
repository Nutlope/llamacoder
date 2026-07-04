import * as shadcnComponents from "@/lib/shadcn";
import {
  baseuiPreviewDependencies,
  baseuiPreviewFiles,
} from "./generated/baseui-files";
import {
  PREVIEW_DEPS,
  buildImportMapObject,
  buildPreviewPackageJson,
} from "./deps";

export type PreviewInputFile = { path: string; content: string };
export type PreviewUiLibrary = "radix" | "baseui";

export function assemblePreviewFiles(
  files: Array<PreviewInputFile>,
  options: {
    uiLibrary?: PreviewUiLibrary;
    externalBaseuiComponents?: boolean;
    inlineBaseuiComponentPaths?: string[];
  } = {},
): Record<string, string> {
  const sourceInjectedFiles =
    options.uiLibrary === "baseui" ? baseuiPreviewFiles : shadcnFiles;
  const injectedFiles =
    options.uiLibrary === "baseui" && options.externalBaseuiComponents
      ? omitExternalizedBaseuiFiles(
          sourceInjectedFiles,
          new Set(options.inlineBaseuiComponentPaths ?? []),
        )
      : sourceInjectedFiles;
  const deps = getPreviewDependencies(options.uiLibrary);
  const previewFiles: Record<string, string> = {
    ...injectedFiles,
  };

  if (
    options.uiLibrary !== "baseui" ||
    !options.externalBaseuiComponents
  ) {
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

export function getPreviewDependencies(
  uiLibrary: PreviewUiLibrary = "radix",
): Record<string, string> {
  return uiLibrary === "baseui" ? baseuiPreviewDependencies : PREVIEW_DEPS;
}

function normalizeModelPath(path: string): string {
  let normalizedPath = path.replace(/^\/+/, "");

  if (normalizedPath.startsWith("src/")) {
    normalizedPath = normalizedPath.slice(4);
  }

  return normalizedPath;
}

const shadcnFiles = {
  "lib/utils.ts": shadcnComponents.utils,
  "components/ui/accordion.tsx": shadcnComponents.accordian,
  "components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "components/ui/alert.tsx": shadcnComponents.alert,
  "components/ui/avatar.tsx": shadcnComponents.avatar,
  "components/ui/badge.tsx": shadcnComponents.badge,
  "components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "components/ui/button.tsx": shadcnComponents.button,
  "components/ui/calendar.tsx": shadcnComponents.calendar,
  "components/ui/card.tsx": shadcnComponents.card,
  "components/ui/carousel.tsx": shadcnComponents.carousel,
  "components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "components/ui/dialog.tsx": shadcnComponents.dialog,
  "components/ui/drawer.tsx": shadcnComponents.drawer,
  "components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "components/ui/input.tsx": shadcnComponents.input,
  "components/ui/label.tsx": shadcnComponents.label,
  "components/ui/menubar.tsx": shadcnComponents.menuBar,
  "components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "components/ui/pagination.tsx": shadcnComponents.pagination,
  "components/ui/popover.tsx": shadcnComponents.popover,
  "components/ui/progress.tsx": shadcnComponents.progress,
  "components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "components/ui/select.tsx": shadcnComponents.select,
  "components/ui/separator.tsx": shadcnComponents.separator,
  "components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "components/ui/slider.tsx": shadcnComponents.slider,
  "components/ui/switch.tsx": shadcnComponents.switchComponent,
  "components/ui/table.tsx": shadcnComponents.table,
  "components/ui/tabs.tsx": shadcnComponents.tabs,
  "components/ui/textarea.tsx": shadcnComponents.textarea,
  "components/ui/toast.tsx": shadcnComponents.toast,
  "components/ui/toaster.tsx": shadcnComponents.toaster,
  "components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "components/ui/toggle.tsx": shadcnComponents.toggle,
  "components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "components/ui/use-toast.tsx": shadcnComponents.useToast,
  "components/ui/index.tsx": `
export * from "./button"
export * from "./card"
export * from "./input"
export * from "./label"
export * from "./select"
export * from "./textarea"
export * from "./avatar"
export * from "./radio-group"
`,
};
