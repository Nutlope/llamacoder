import { createRequire } from "node:module";
import { NextRequest, NextResponse } from "next/server";
import { precompilePreviewTailwindCss } from "@/lib/preview/server-tailwind";

export const runtime = "nodejs";

type BundleOptions = {
  externalBaseuiComponents?: boolean;
  bundleBareDependencies?: boolean;
  externalReactDependencies?: boolean;
  inlineBaseuiComponentPaths?: string[];
};

type CachedBundle = {
  code: string;
  css: string;
};

type OutputFile = { path: string; text: string };
type Esbuild = typeof import("esbuild");
type EsbuildPlugin = import("esbuild").Plugin;
type EsbuildLoader = import("esbuild").Loader;
type EsbuildMessage = import("esbuild").Message;

const BUNDLE_CACHE_LIMIT = 48;
const bundleCache = new Map<string, CachedBundle>();
const nativeRequire = createRequire(import.meta.url);
const REACT_DEPENDENCY_SPECIFIERS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react-dom/client",
];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    files?: unknown;
    options?: unknown;
    tailwind?: unknown;
  } | null;
  const files = normalizeFiles(body?.files);
  const options = normalizeOptions(body?.options);
  const tailwindOptions = normalizeTailwindOptions(body?.tailwind);

  if (!files || !files["main.tsx"]) {
    return NextResponse.json(
      { ok: false, error: "Missing preview files." },
      { status: 400 },
    );
  }

  const bundleFiles = getBundleFiles(files, options);
  const cacheKey = stableFilesKey(files, options);
  const inputStats = getInputStats(bundleFiles, cacheKey);
  const cacheLookupStartedAt = performance.now();
  const cached = getCachedBundle(cacheKey);
  const tailwindPromise = tailwindOptions
    ? startTailwindPrecompile(tailwindOptions.cacheKey, tailwindOptions.candidates)
    : null;

  if (cached) {
    const tailwind = await tailwindPromise;
    return NextResponse.json({
      ok: true,
      code: cached.code,
      css: cached.css,
      durationMs: 0,
      cacheHit: true,
      cacheSource: "server-memory",
      cacheLookupMs: Math.round(performance.now() - cacheLookupStartedAt),
      ensureMs: 0,
      ...inputStats,
      outputJsBytes: cached.code.length,
      outputCssBytes: cached.css.length,
      tailwind: formatTailwindResult(tailwind),
    });
  }

  const cacheLookupMs = performance.now() - cacheLookupStartedAt;
  const startedAt = performance.now();

  try {
    const esbuild = getNativeEsbuild();
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
      code,
      css,
    };
    setCachedBundle(cacheKey, bundled);

    return NextResponse.json({
      ok: true,
      ...bundled,
      durationMs: Math.round(performance.now() - startedAt),
      cacheHit: false,
      cacheSource: "server-none",
      cacheLookupMs: Math.round(cacheLookupMs),
      ensureMs: 0,
      ...inputStats,
      outputJsBytes: code.length,
      outputCssBytes: css.length,
      tailwind: formatTailwindResult(await tailwindPromise),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: formatEsbuildError(error),
      durationMs: Math.round(performance.now() - startedAt),
      cacheHit: false,
      cacheSource: "server-none",
      cacheLookupMs: Math.round(cacheLookupMs),
      ensureMs: 0,
      ...inputStats,
      outputJsBytes: 0,
      outputCssBytes: 0,
    });
  }
}

function normalizeTailwindOptions(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const cacheKey =
    typeof (value as { cacheKey?: unknown }).cacheKey === "string"
      ? (value as { cacheKey: string }).cacheKey
      : "";
  const candidates = (value as { candidates?: unknown }).candidates;

  return cacheKey ? { cacheKey, candidates } : null;
}

async function startTailwindPrecompile(cacheKey: string, candidates: unknown) {
  try {
    return await precompilePreviewTailwindCss(cacheKey, candidates);
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error),
      durationMs: 0,
    };
  }
}

function formatTailwindResult(
  result: Awaited<ReturnType<typeof startTailwindPrecompile>> | null,
) {
  if (!result) return null;
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      durationMs: result.durationMs,
    };
  }

  return {
    ok: true,
    css: result.css,
    cacheHit: result.cacheHit,
    durationMs: result.durationMs,
  };
}

function normalizeFiles(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const files: Record<string, string> = {};
  for (const [path, content] of Object.entries(value)) {
    if (typeof content === "string") files[path] = content;
  }
  return files;
}

function normalizeOptions(value: unknown): BundleOptions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return {
    externalBaseuiComponents:
      (value as BundleOptions).externalBaseuiComponents === true,
    bundleBareDependencies:
      (value as BundleOptions).bundleBareDependencies === true,
    externalReactDependencies:
      (value as BundleOptions).externalReactDependencies === true,
    inlineBaseuiComponentPaths: Array.isArray(
      (value as BundleOptions).inlineBaseuiComponentPaths,
    )
      ? (value as BundleOptions).inlineBaseuiComponentPaths?.filter(
          (path): path is string => typeof path === "string",
        )
      : undefined,
  };
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

function getCachedBundle(key: string) {
  const cached = bundleCache.get(key);
  if (!cached) return null;

  bundleCache.delete(key);
  bundleCache.set(key, cached);
  return cached;
}

function setCachedBundle(key: string, value: CachedBundle) {
  bundleCache.set(key, value);

  while (bundleCache.size > BUNDLE_CACHE_LIMIT) {
    const oldestKey = bundleCache.keys().next().value;
    if (!oldestKey) break;
    bundleCache.delete(oldestKey);
  }
}

function stableFilesKey(files: Record<string, string>, options: BundleOptions) {
  const keyFiles = getBundleFiles(files, options);

  return JSON.stringify({
    files: Object.keys(keyFiles)
      .sort()
      .map((path) => [path, keyFiles[path]]),
      options: {
        externalBaseuiComponents: options.externalBaseuiComponents === true,
        bundleBareDependencies: options.bundleBareDependencies === true,
        externalReactDependencies: options.externalReactDependencies === true,
        inlineBaseuiComponentPaths: [...getInlineBaseuiComponentPaths(options)].sort(),
      },
  });
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
): EsbuildPlugin {
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
        resolveDir: process.cwd(),
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

function joinVirtual(basePath: string, path: string) {
  return normalizeVirtualPath(basePath ? `${basePath}/${path}` : path);
}

function normalizeVirtualPath(path: string) {
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

function getLoader(path: string): EsbuildLoader {
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

function formatEsbuildError(error: unknown) {
  if (isEsbuildFailure(error) && error.errors.length > 0) {
    return error.errors.map(formatMessage).join("\n\n");
  }

  return error instanceof Error ? error.message : String(error);
}

function isEsbuildFailure(
  error: unknown,
): error is { errors: Array<EsbuildMessage> } {
  return (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown }).errors)
  );
}

function formatMessage(message: EsbuildMessage) {
  const location = message.location;

  if (!location) {
    return message.text;
  }

  return `${location.file}:${location.line}:${location.column}: ${message.text}`;
}

function getNativeEsbuild() {
  return nativeRequire(`es${"build"}`) as Esbuild;
}
