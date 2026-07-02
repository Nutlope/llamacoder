import * as esbuild from "esbuild-wasm";

const ESBUILD_VERSION = "0.25.5";

type OutputFile = { path: string; text: string };

export type BundleResult =
  | { ok: true; code: string; css: string; durationMs: number }
  | { ok: false; error: string; durationMs: number };

declare global {
  var __llamacoderEsbuildInitPromise: Promise<void> | undefined;
}

export function ensureEsbuild(): Promise<void> {
  globalThis.__llamacoderEsbuildInitPromise ??= esbuild.initialize({
    wasmURL: `https://esm.sh/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`,
    worker: true,
  });

  return globalThis.__llamacoderEsbuildInitPromise;
}

export async function bundle(
  files: Record<string, string>,
): Promise<BundleResult> {
  await ensureEsbuild();
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
      sourcemap: "inline",
      logLevel: "silent",
      plugins: [virtualFs(files)],
    });

    return {
      ok: true,
      code: joinJavaScriptOutput(result.outputFiles),
      css: joinOutputFiles(result.outputFiles, ".css"),
      durationMs: performance.now() - start,
    };
  } catch (error) {
    return {
      ok: false,
      error: formatEsbuildError(error),
      durationMs: performance.now() - start,
    };
  }
}

function virtualFs(files: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (isBareSpecifier(args.path)) {
          return { path: args.path, external: true };
        }

        const resolved = resolveVirtual(args.path, args.importer, files);

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
      }));
    },
  };
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
