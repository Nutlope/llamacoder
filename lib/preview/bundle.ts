import * as esbuild from "esbuild-wasm";

const ESBUILD_WASM_URL = "/preview-vendor/esbuild/esbuild.wasm";

type OutputFile = { path: string; text: string };

type BundleOptions = {
  externalBaseuiComponents?: boolean;
  bundleBareDependencies?: boolean;
  externalReactDependencies?: boolean;
  inlineBaseuiComponentPaths?: string[];
};

export type BundleResult =
  | {
      ok: true;
      code: string;
      css: string;
      durationMs: number;
      cacheHit: boolean;
      cacheSource: string;
      cacheLookupMs: number;
      ensureMs: number;
      inputFileCount: number;
      inputBytes: number;
      cacheKeyBytes: number;
      outputJsBytes: number;
      outputCssBytes: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
      cacheHit: boolean;
      cacheSource: string;
      cacheLookupMs: number;
      ensureMs: number;
      inputFileCount: number;
      inputBytes: number;
      cacheKeyBytes: number;
      outputJsBytes: number;
      outputCssBytes: number;
    };

declare global {
  var __llamacoderEsbuildInitPromise: Promise<void> | undefined;
  var __llamacoderPreviewBundleCache: Map<string, CachedBundle> | undefined;
}

type CachedBundle = {
  code: string;
  css: string;
};

const BUNDLE_CACHE_LIMIT = 24;
const BUNDLE_DB_NAME = "llamacoder-preview";
const BUNDLE_DB_VERSION = 1;
const BUNDLE_STORE_NAME = "bundles";
const REACT_DEPENDENCY_SPECIFIERS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react-dom/client",
];

export function ensureEsbuild(): Promise<void> {
  globalThis.__llamacoderEsbuildInitPromise ??= esbuild.initialize({
    wasmURL: ESBUILD_WASM_URL,
    worker: true,
  });

  return globalThis.__llamacoderEsbuildInitPromise;
}

export async function bundle(
  files: Record<string, string>,
  options: BundleOptions = {},
): Promise<BundleResult> {
  const bundleFiles = getBundleFiles(files, options);
  const cacheKey = stableFilesKey(files, options);
  const inputStats = getInputStats(bundleFiles, cacheKey);
  const cacheLookupStartedAt = performance.now();
  const cached = getCachedBundle(cacheKey);
  if (cached) {
    return {
      ok: true,
      code: cached.code,
      css: cached.css,
      durationMs: 0,
      cacheHit: true,
      cacheSource: "memory",
      cacheLookupMs: performance.now() - cacheLookupStartedAt,
      ensureMs: 0,
      ...inputStats,
      outputJsBytes: cached.code.length,
      outputCssBytes: cached.css.length,
    };
  }
  const persistentCached = await getPersistentCachedBundle(cacheKey);
  if (persistentCached) {
    setCachedBundle(cacheKey, persistentCached);
    return {
      ok: true,
      code: persistentCached.code,
      css: persistentCached.css,
      durationMs: 0,
      cacheHit: true,
      cacheSource: "indexeddb",
      cacheLookupMs: performance.now() - cacheLookupStartedAt,
      ensureMs: 0,
      ...inputStats,
      outputJsBytes: persistentCached.code.length,
      outputCssBytes: persistentCached.css.length,
    };
  }

  const cacheLookupMs = performance.now() - cacheLookupStartedAt;
  const ensureStartedAt = performance.now();
  await ensureEsbuild();
  const ensureMs = performance.now() - ensureStartedAt;
  const start = performance.now();

  try {
    const result = await esbuild.build({
      entryPoints: ["/main.tsx"],
      bundle: true,
      outfile: "/bundle.js",
      write: false,
      format: "esm",
      target: "es2022",
      jsx: "automatic",
      sourcemap: false,
      logLevel: "silent",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      legalComments: "none",
      external: options.externalReactDependencies
        ? REACT_DEPENDENCY_SPECIFIERS
        : [],
      plugins: [virtualFs(bundleFiles, files, options)],
    });

    const code = joinJavaScriptOutput(result.outputFiles);
    const css = joinOutputFiles(result.outputFiles, ".css");
    const bundled = {
      ok: true,
      code,
      css,
      durationMs: performance.now() - start,
      cacheHit: false,
      cacheSource: "none",
      cacheLookupMs,
      ensureMs,
      ...inputStats,
      outputJsBytes: code.length,
      outputCssBytes: css.length,
    } as const;
    setCachedBundle(cacheKey, {
      code: bundled.code,
      css: bundled.css,
    });
    void setPersistentCachedBundle(cacheKey, {
      code: bundled.code,
      css: bundled.css,
    });
    return bundled;
  } catch (error) {
    return {
      ok: false,
      error: formatEsbuildError(error),
      durationMs: performance.now() - start,
      cacheHit: false,
      cacheSource: "none",
      cacheLookupMs,
      ensureMs,
      ...inputStats,
      outputJsBytes: 0,
      outputCssBytes: 0,
    };
  }
}

function getInputStats(files: Record<string, string>, cacheKey: string) {
  return {
    inputFileCount: Object.keys(files).length,
    inputBytes: Object.values(files).reduce(
      (total, content) => total + content.length,
      0,
    ),
    cacheKeyBytes: cacheKey.length,
  };
}

async function getPersistentCachedBundle(
  key: string,
): Promise<CachedBundle | null> {
  const db = await openBundleCacheDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction(BUNDLE_STORE_NAME, "readonly");
    const request = transaction.objectStore(BUNDLE_STORE_NAME).get(key);

    request.onsuccess = () => {
      const value = request.result;
      resolve(isCachedBundleRecord(value) ? value : null);
    };
    request.onerror = () => resolve(null);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => db.close();
  });
}

async function setPersistentCachedBundle(key: string, value: CachedBundle) {
  const db = await openBundleCacheDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(BUNDLE_STORE_NAME, "readwrite");
    transaction.objectStore(BUNDLE_STORE_NAME).put({
      ...value,
      key,
      updatedAt: Date.now(),
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
  db.close();
}

function openBundleCacheDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(BUNDLE_DB_NAME, BUNDLE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BUNDLE_STORE_NAME)) {
        db.createObjectStore(BUNDLE_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function isCachedBundleRecord(value: unknown): value is CachedBundle {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CachedBundle).code === "string" &&
    typeof (value as CachedBundle).css === "string"
  );
}

function getBundleCache() {
  globalThis.__llamacoderPreviewBundleCache ??= new Map();
  return globalThis.__llamacoderPreviewBundleCache;
}

function getCachedBundle(key: string) {
  const cache = getBundleCache();
  const cached = cache.get(key);
  if (!cached) return null;

  cache.delete(key);
  cache.set(key, cached);
  return cached;
}

function setCachedBundle(key: string, value: CachedBundle) {
  const cache = getBundleCache();
  cache.set(key, value);

  while (cache.size > BUNDLE_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

function stableFilesKey(files: Record<string, string>, options: BundleOptions) {
  const keyFiles = getCacheKeyFiles(files, options);

  return JSON.stringify(
    {
      files: Object.keys(keyFiles)
        .sort()
        .map((path) => [path, keyFiles[path]]),
      options: {
        externalBaseuiComponents: options.externalBaseuiComponents === true,
        bundleBareDependencies: options.bundleBareDependencies === true,
        externalReactDependencies: options.externalReactDependencies === true,
        inlineBaseuiComponentPaths: [...getInlineBaseuiComponentPaths(options)].sort(),
      },
    },
  );
}

function getCacheKeyFiles(
  files: Record<string, string>,
  options: BundleOptions,
) {
  return getBundleFiles(files, options);
}

function getBundleFiles(
  files: Record<string, string>,
  options: BundleOptions,
) {
  if (!options.externalBaseuiComponents) return files;
  const inlinePaths = getInlineBaseuiComponentPaths(options);

  return Object.fromEntries(
    Object.entries(files).filter(
      ([path]) => inlinePaths.has(path) || !isExternalizedBaseuiPreviewFile(path),
    ),
  );
}

function getInlineBaseuiComponentPaths(options: BundleOptions) {
  return new Set(options.inlineBaseuiComponentPaths ?? []);
}

function isExternalizedBaseuiPreviewFile(path: string) {
  return (
    path === "package.json" ||
    path === "import-map.json" ||
    path === "components.json" ||
    path === "tsconfig.json" ||
    path === "styles/globals.css" ||
    path === "lib/utils" ||
    path === "lib/utils.ts" ||
    path === "hooks/use-mobile" ||
    path === "hooks/use-mobile.ts" ||
    path === "hooks/use-toast" ||
    path === "hooks/use-toast.ts" ||
    path.startsWith("components/ui/")
  );
}

function virtualFs(
  files: Record<string, string>,
  resolveFiles: Record<string, string>,
  options: BundleOptions,
): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace !== "vfs" && args.importer) {
          return null;
        }

        if (
          options.externalBaseuiComponents &&
          isBaseuiComponentVendorSpecifier(args.path) &&
          !isInlineBaseuiSpecifier(args.path, options)
        ) {
          return { path: args.path, external: true };
        }

        if (options.externalBaseuiComponents) {
          const externalSpecifier = resolveExternalizedBaseuiSpecifier(
            args.path,
            args.importer,
          );

          if (
            externalSpecifier &&
            !isInlineBaseuiSpecifier(externalSpecifier, options)
          ) {
            return { path: externalSpecifier, external: true };
          }
        }

        if (isBareSpecifier(args.path)) {
          if (
            options.externalReactDependencies &&
            isReactDependencySpecifier(args.path)
          ) {
            return { path: args.path, external: true };
          }

          return options.bundleBareDependencies
            ? null
            : { path: args.path, external: true };
        }

        const resolved = resolveVirtual(args.path, args.importer, resolveFiles);

        if (
          options.externalBaseuiComponents &&
          resolved &&
          isExternalizedBaseuiPreviewFile(resolved) &&
          !getInlineBaseuiComponentPaths(options).has(resolved)
        ) {
          return {
            path: externalizedBaseuiSpecifier(resolved),
            external: true,
          };
        }

        if (!resolved) {
          return {
            errors: [
              {
                text: `Cannot resolve "${args.path}" from "${args.importer || "entry"}"`,
              },
            ],
          };
        }

        return { path: resolved, namespace: "vfs" };
      });

      build.onLoad({ filter: /.*/, namespace: "vfs" }, (args) => ({
        contents: files[args.path],
        loader: getLoader(args.path),
        resolveDir: "/",
      }));
    },
  };
}

function externalizedBaseuiSpecifier(path: string) {
  const withoutExtension = path.replace(/\.(tsx|ts|jsx|js)$/, "");
  return `@/${withoutExtension}`;
}

function resolveExternalizedBaseuiSpecifier(
  specifier: string,
  importer: string,
) {
  const withoutQuery = specifier.split("?")[0] || specifier;
  let basePath: string;

  if (withoutQuery.startsWith("@/")) {
    basePath = withoutQuery.slice(2);
  } else if (withoutQuery.startsWith("/")) {
    basePath = withoutQuery.replace(/^\/+/, "");
  } else if (withoutQuery.startsWith(".")) {
    basePath = joinVirtual(dirname(importer), withoutQuery);
  } else {
    return null;
  }

  const normalized = normalizeVirtualPath(basePath);

  if (!isExternalizedBaseuiPreviewFile(normalized)) {
    return null;
  }

  return externalizedBaseuiSpecifier(normalized);
}

function isBaseuiComponentVendorSpecifier(specifier: string) {
  return (
    specifier === "@/components/ui" ||
    specifier.startsWith("@/components/ui/") ||
    specifier === "@/hooks/use-mobile" ||
    specifier === "@/hooks/use-mobile.ts" ||
    specifier === "@/hooks/use-toast" ||
    specifier === "@/hooks/use-toast.ts" ||
    specifier === "@/lib/utils" ||
    specifier === "@/lib/utils.ts"
  );
}

function isReactDependencySpecifier(specifier: string) {
  return REACT_DEPENDENCY_SPECIFIERS.includes(specifier);
}

function isInlineBaseuiSpecifier(specifier: string, options: BundleOptions) {
  const inlinePaths = getInlineBaseuiComponentPaths(options);
  if (specifier.startsWith("@/")) {
    const path = specifier.slice(2);
    return (
      inlinePaths.has(path) ||
      inlinePaths.has(`${path}.ts`) ||
      inlinePaths.has(`${path}.tsx`)
    );
  }

  return false;
}

function resolveVirtual(
  specifier: string,
  importer: string,
  files: Record<string, string>,
): string | null {
  const withoutQuery = specifier.split("?")[0] || specifier;
  let basePath: string;

  if (withoutQuery.startsWith("@/")) {
    basePath = withoutQuery.slice(2);
  } else if (withoutQuery.startsWith("/")) {
    basePath = withoutQuery.replace(/^\/+/, "");
  } else {
    basePath = joinVirtual(dirname(importer), withoutQuery);
  }

  return probeVirtualFile(basePath, files);
}

function probeVirtualFile(
  path: string,
  files: Record<string, string>,
): string | null {
  const normalized = normalizeVirtualPath(path);
  const candidates = [
    normalized,
    `${normalized}.tsx`,
    `${normalized}.ts`,
    `${normalized}.jsx`,
    `${normalized}.js`,
    `${normalized}.mjs`,
    `${normalized}.css`,
    `${normalized}.json`,
    `${normalized}/index.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.jsx`,
    `${normalized}/index.js`,
    `${normalized}/index.mjs`,
    `${normalized}/index.css`,
  ];

  return candidates.find((candidate) => candidate in files) ?? null;
}

function isBareSpecifier(specifier: string): boolean {
  return (
    !specifier.startsWith(".") &&
    !specifier.startsWith("/") &&
    !specifier.startsWith("@/")
  );
}

function dirname(path: string): string {
  const normalized = normalizeVirtualPath(path);
  const index = normalized.lastIndexOf("/");

  return index === -1 ? "" : normalized.slice(0, index);
}

function joinVirtual(basePath: string, path: string): string {
  return normalizeVirtualPath(basePath ? `${basePath}/${path}` : path);
}

function normalizeVirtualPath(path: string): string {
  const parts: Array<string> = [];

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

function getLoader(path: string): esbuild.Loader {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "js";
}

function joinOutputFiles(outputFiles: Array<OutputFile>, extension: string) {
  return outputFiles
    .filter((file) => file.path.endsWith(extension))
    .map((file) => file.text)
    .join("\n");
}

function joinJavaScriptOutput(outputFiles: Array<OutputFile>) {
  return outputFiles
    .filter(
      (file) => !file.path.endsWith(".css") && !file.path.endsWith(".map"),
    )
    .map((file) => file.text)
    .join("\n");
}

function formatEsbuildError(error: unknown): string {
  if (isEsbuildFailure(error) && error.errors.length > 0) {
    return error.errors.map(formatMessage).join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
}

function isEsbuildFailure(
  error: unknown,
): error is { errors: Array<esbuild.Message> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  );
}

function formatMessage(message: esbuild.Message): string {
  const location = message.location;

  if (!location) {
    return message.text;
  }

  return `${location.file}:${location.line}:${location.column}: ${message.text}`;
}
