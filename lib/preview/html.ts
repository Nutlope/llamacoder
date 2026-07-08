import { PREVIEW_DEPS, buildImportMapObject } from "./deps";
import { previewStyleAssetCss } from "./generated/style-assets";
import { previewVendorPreloadGraph } from "./generated/vendor-preloads";

const ERROR_BRIDGE = `
function memoryStorageShim() {
  const values = new Map();
  return {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
  };
}
try {
  performance.setResourceTimingBufferSize(2000);
  Object.defineProperty(window, "localStorage", { value: memoryStorageShim(), configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: memoryStorageShim(), configurable: true });
} catch (_) {}
function scrollPreviewHash(hash) {
  let id = String(hash || "").replace(/^#/, "");
  try {
    id = decodeURIComponent(id);
  } catch (_) {}
  if (!id) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const escapedId =
    window.CSS && typeof window.CSS.escape === "function"
      ? window.CSS.escape(id)
      : id.replace(/"/g, '\\\\"');
  const target =
    document.getElementById(id) ||
    document.querySelector('[name="' + escapedId + '"]');

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  try {
    history.replaceState(null, "", "#" + id);
  } catch (_) {}
}
window.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const anchor = event.target && event.target.closest
    ? event.target.closest("a[href]")
    : null;
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return;

  const href = anchor.getAttribute("href") || "";

  if (href.startsWith("#")) {
    event.preventDefault();
    scrollPreviewHash(href);
    return;
  }

  if (href.startsWith("/#")) {
    event.preventDefault();
    scrollPreviewHash(href.slice(1));
    return;
  }

  if (href === "/" || href.startsWith("/")) {
    event.preventDefault();
  }
}, true);
window.addEventListener("error", (event) => {
  parent.postMessage({
    source: "preview",
    type: "error",
    message: String((event.error && event.error.stack) || event.message),
  }, "*");
});
window.addEventListener("unhandledrejection", (event) => {
  parent.postMessage({
    source: "preview",
    type: "error",
    message: "Unhandled promise rejection: " + String((event.reason && event.reason.stack) || event.reason),
  }, "*");
});
const originalError = console.error;
console.error = (...args) => {
  parent.postMessage({
    source: "preview",
    type: "console-error",
    message: args.map((arg) => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === "object") {
        try { return JSON.stringify(arg); } catch (_) { return String(arg); }
      }
      return String(arg);
    }).join(" "),
  }, "*");
  originalError(...args);
};
function collectPreviewMetrics() {
  const resources = performance
    .getEntriesByType("resource")
    .map((resource) => ({
      name: resource.name,
      initiatorType: resource.initiatorType,
      startTime: Math.round(resource.startTime),
      duration: Math.round(resource.duration),
      transferSize: resource.transferSize || 0,
      decodedBodySize: resource.decodedBodySize || 0,
    }))
    .sort((left, right) => right.duration - left.duration);

  const stylesheets = Array.from(document.styleSheets).map((sheet) => {
    let rules = null;
    try { rules = sheet.cssRules ? sheet.cssRules.length : null; } catch (_) {}
    return { href: sheet.href, rules };
  });

  const probe = document.createElement("div");
  probe.className = "grid rounded-md bg-zinc-50 p-6 text-zinc-950";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const tailwindProbe = {
    display: style.display,
    backgroundColor: style.backgroundColor,
    borderRadius: style.borderRadius,
    paddingTop: style.paddingTop,
  };
  probe.remove();

  return {
    elapsedMs: Math.round(performance.now()),
    resourceCount: resources.length,
    esmResourceCount: resources.filter((resource) => resource.name.includes("https://esm.sh/")).length,
    jsdelivrResourceCount: resources.filter((resource) => resource.name.includes("cdn.jsdelivr.net")).length,
    slowResources: resources.slice(0, 10),
    stylesheetRules: stylesheets.reduce((count, sheet) => count + (sheet.rules || 0), 0),
    stylesheets,
    tailwindProbe,
  };
}
function collectCompiledCss() {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .map((rule) => rule.cssText)
          .join("\\n");
      } catch (_) {
        return "";
      }
    })
    .filter(Boolean)
    .join("\\n");
}
function postPreviewMetric(type, extra = {}) {
  parent.postMessage({
    source: "preview",
    type,
    elapsedMs: Math.round(performance.now()),
    metrics: collectPreviewMetrics(),
    ...extra,
  }, "*");
}
window.__previewCollectMetrics = collectPreviewMetrics;
window.__previewCollectCompiledCss = collectCompiledCss;
window.__previewPostMetric = postPreviewMetric;
let previewAppReadyPayload = null;
let previewStyleReadyPayload = null;
let previewStyleWatchStarted = false;
function maybePostPreviewReady() {
  if (!previewAppReadyPayload || !previewStyleReadyPayload) return;

  postPreviewMetric("ready", {
    ...previewStyleReadyPayload,
    ...previewAppReadyPayload,
    compiledCss: collectCompiledCss(),
  });
}
window.__previewMarkAppReady = (extra = {}) => {
  previewAppReadyPayload = extra;
  startTailwindReadyWatch();
  maybePostPreviewReady();
};
function startTailwindReadyWatch() {
  if (previewStyleWatchStarted) return;
  previewStyleWatchStarted = true;
  if (window.__previewStylesPrecompiled) {
    const readyPayload = { tailwindWaitMs: 0, compiledCss: collectCompiledCss() };
    previewStyleReadyPayload = readyPayload;
    postPreviewMetric("tailwind-ready", readyPayload);
    maybePostPreviewReady();
    return;
  }
  waitForTailwindReady();
}
function waitForTailwindReady() {
  const startedAt = performance.now();
  const timeoutMs = 5000;
  let probe = null;

  function check() {
    if (!document.body) {
      requestAnimationFrame(check);
      return;
    }

    // The probe must stay attached across frames: Tailwind's browser compiler
    // scans the DOM asynchronously, so an element added and removed within a
    // single frame never gets its classes compiled and the check can't pass.
    if (!probe || !probe.isConnected) {
      probe = document.createElement("div");
      probe.className = "grid rounded-md bg-zinc-50 p-6";
      probe.style.position = "fixed";
      probe.style.left = "-9999px";
      probe.style.top = "0";
      document.body.appendChild(probe);
    }

    const style = getComputedStyle(probe);
    const isReady =
      style.display === "grid" &&
      style.paddingTop === "24px" &&
      style.borderRadius !== "0px" &&
      style.backgroundColor !== "rgba(0, 0, 0, 0)";

    if (isReady || performance.now() - startedAt > timeoutMs) {
      probe.remove();
      const readyPayload = {
        tailwindWaitMs: Math.round(performance.now() - startedAt),
        compiledCss: collectCompiledCss(),
      };
      previewStyleReadyPayload = readyPayload;
      postPreviewMetric("tailwind-ready", readyPayload);
      maybePostPreviewReady();
      return;
    }

    requestAnimationFrame(check);
  }

  requestAnimationFrame(check);
}
window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    postPreviewMetric("document-loaded");
    startTailwindReadyWatch();
  });
});
`;

export function buildSrcdoc(
  bundledCode: string,
  bundledCss = "",
  deps: Record<string, string> = PREVIEW_DEPS,
  options: {
    localVendor?: boolean;
    vendor?: "local" | "cdn" | "flat";
    precompiledTailwindCss?: string;
  } = {},
): string {
  const safeCode = escapeScriptContents(`${bundledCode}
requestAnimationFrame(() => {
  if (window.__previewMarkAppReady) {
    window.__previewMarkAppReady({});
  } else {
    parent.postMessage({ source: "preview", type: "ready" }, "*");
  }
});
`);
  const safeBridge = escapeScriptContents(ERROR_BRIDGE);
  const safeCss = bundledCss.replace(/<\/style/gi, "<\\/style");
  const safePrecompiledTailwindCss = options.precompiledTailwindCss?.replace(
    /<\/style/gi,
    "<\\/style",
  );
  const styleAssets = getPreviewStyleAssets(deps, options);
  const safeTailwindCss = buildPreviewTailwindCss(deps, styleAssets).replace(
    /<\/style/gi,
    "<\\/style",
  );
  const importMap = buildImportMapObject(deps, options);
  const modulePreloads = buildModulePreloads(bundledCode, importMap.imports);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script type="importmap">${JSON.stringify(importMap)}</script>
${modulePreloads}
${buildStyleTags({
  bundledCss: safeCss,
  precompiledTailwindCss: safePrecompiledTailwindCss,
  tailwindBrowser: styleAssets.tailwindBrowser,
  tailwindCss: safeTailwindCss,
})}
${options.precompiledTailwindCss ? "<script>window.__previewStylesPrecompiled = true;</script>" : ""}
<script>${safeBridge}</script>
</head>
<body>
<div id="root"></div>
<script type="module">${safeCode}</script>
</body>
</html>`;
}

function buildStyleTags(options: {
  bundledCss: string;
  precompiledTailwindCss?: string;
  tailwindBrowser: string;
  tailwindCss: string;
}) {
  if (options.precompiledTailwindCss) {
    return `<style>${options.precompiledTailwindCss}</style>`;
  }

  return `<script src="${escapeHtmlAttribute(options.tailwindBrowser)}"></script>
<style type="text/tailwindcss">${options.tailwindCss}</style>
<style type="text/tailwindcss">${options.bundledCss}</style>`;
}

export function buildPreviewTailwindCss(
  deps: Record<string, string>,
  assets: PreviewStyleAssets,
): string {
  if (!deps.shadcn) return "";

  return `
@import "tailwindcss";
${assets.tailwindCss}

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }

  body {
    @apply bg-background text-foreground;
  }
}
`;
}

type PreviewStyleAssets = {
  tailwindBrowser: string;
  tailwindCss: string;
};

function getPreviewStyleAssets(
  deps: Record<string, string>,
  options: { localVendor?: boolean; vendor?: "local" | "cdn" | "flat" },
): PreviewStyleAssets {
  const vendor =
    options.vendor ?? (options.localVendor === false ? "cdn" : "local");

  if (vendor === "local" || vendor === "flat") {
    return {
      tailwindBrowser: "/preview-vendor/styles/tailwind-browser.js",
      tailwindCss: `${previewStyleAssetCss.twAnimateCss}\n${previewStyleAssetCss.shadcnTailwindCss}`,
    };
  }

  return {
    tailwindBrowser: "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
    tailwindCss: `@import "https://cdn.jsdelivr.net/npm/tw-animate-css@${deps["tw-animate-css"] ?? "1.4.0"}/dist/tw-animate.css";
@import "https://cdn.jsdelivr.net/npm/shadcn@${deps.shadcn ?? "4.13.0"}/dist/tailwind.css";`,
  };
}

function buildModulePreloads(
  bundledCode: string,
  imports: Record<string, string>,
) {
  const hrefs = new Set<string>();
  const importPattern =
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;

  while ((match = importPattern.exec(bundledCode))) {
    const specifier = match[1];
    const href = specifier ? resolvePreviewModuleHref(specifier, "", imports) : "";

    if (href) {
      hrefs.add(href);
    }
  }

  for (const href of [...hrefs]) {
    collectTransitiveModulePreloads(href, imports, hrefs);
  }

  return [...hrefs]
    .map(
      (href) =>
        `<link rel="modulepreload" href="${escapeHtmlAttribute(href)}" crossorigin>`,
    )
    .join("\n");
}

function collectTransitiveModulePreloads(
  href: string,
  imports: Record<string, string>,
  seen: Set<string>,
) {
  const dependencies =
    previewVendorPreloadGraph[href as keyof typeof previewVendorPreloadGraph];

  if (!dependencies) return;

  for (const specifier of dependencies) {
    const dependencyHref = resolvePreviewModuleHref(specifier, href, imports);

    if (!dependencyHref || seen.has(dependencyHref)) continue;

    seen.add(dependencyHref);
    collectTransitiveModulePreloads(dependencyHref, imports, seen);
  }
}

function resolvePreviewModuleHref(
  specifier: string,
  importerHref: string,
  imports: Record<string, string>,
) {
  if (imports[specifier]) return imports[specifier];
  if (specifier.startsWith("/")) return specifier;
  if (specifier.startsWith(".") && importerHref) {
    return new URL(specifier, `http://preview.local${importerHref}`).pathname;
  }

  return "";
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeScriptContents(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}
