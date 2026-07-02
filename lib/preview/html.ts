import { buildImportMap } from "./deps";

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
  Object.defineProperty(window, "localStorage", { value: memoryStorageShim(), configurable: true });
  Object.defineProperty(window, "sessionStorage", { value: memoryStorageShim(), configurable: true });
} catch (_) {}
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
window.addEventListener("load", () => {
  requestAnimationFrame(() => parent.postMessage({ source: "preview", type: "document-loaded" }, "*"));
});
`;

export function buildSrcdoc(bundledCode: string, bundledCss = ""): string {
  const moduleLoader = `
const moduleUrl = URL.createObjectURL(new Blob([${JSON.stringify(bundledCode)}], { type: "text/javascript" }));
import(moduleUrl)
  .then(() => requestAnimationFrame(() => parent.postMessage({ source: "preview", type: "ready" }, "*")))
  .catch((error) => {
    parent.postMessage({
      source: "preview",
      type: "error",
      message: String((error && error.stack) || error),
    }, "*");
  })
  .finally(() => URL.revokeObjectURL(moduleUrl));
`;
  const safeCode = escapeScriptContents(moduleLoader);
  const safeBridge = escapeScriptContents(ERROR_BRIDGE);
  const safeCss = bundledCss.replace(/<\/style/gi, "<\\/style");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script type="importmap">${buildImportMap()}</script>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style>${safeCss}</style>
<script>${safeBridge}</script>
</head>
<body>
<div id="root"></div>
<script type="module">${safeCode}</script>
</body>
</html>`;
}

function escapeScriptContents(value: string): string {
  return value.replace(/<\/script/gi, "<\\/script");
}
