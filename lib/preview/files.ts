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
  options: { uiLibrary?: PreviewUiLibrary } = {},
): Record<string, string> {
  const injectedFiles =
    options.uiLibrary === "baseui" ? baseuiPreviewFiles : shadcnFiles;
  const deps = getPreviewDependencies(options.uiLibrary);
  const previewFiles: Record<string, string> = {
    "package.json": buildPreviewPackageJson(deps),
    "import-map.json": JSON.stringify(buildImportMapObject(deps), null, 2),
    ...injectedFiles,
  };

  for (const file of files) {
    const normalized = normalizeModelPath(file.path);
    if (normalized in injectedFiles) continue;
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
