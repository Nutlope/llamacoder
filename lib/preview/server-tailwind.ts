import { readFile } from "node:fs/promises";
import nodePath from "node:path";
import { getPreviewDependencies } from "@/lib/preview/files";
import { previewStyleAssetCss } from "@/lib/preview/generated/style-assets";
import { buildPreviewTailwindCss } from "@/lib/preview/html";

const MAX_CANDIDATES = 8_000;
const MAX_CANDIDATE_LENGTH = 180;
const cssCache = new Map<string, string>();
let compilerPromise: ReturnType<typeof createCompiler> | undefined;

export async function precompilePreviewTailwindCss(
  cacheKey: string,
  rawCandidates: unknown,
) {
  const startedAt = performance.now();
  const candidates = normalizeCandidates(rawCandidates);

  if (!cacheKey || candidates.length === 0) {
    return {
      ok: false as const,
      error: "Missing preview Tailwind cache key or candidates.",
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  const cachedCss = cssCache.get(cacheKey);
  if (cachedCss) {
    return {
      ok: true as const,
      css: cachedCss,
      cacheHit: true,
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  const compiler = await getCompiler();
  const builtCss = compiler.build(candidates);
  if (!builtCss) {
    return {
      ok: false as const,
      error: "Tailwind compiler returned empty CSS.",
      durationMs: Math.round(performance.now() - startedAt),
    };
  }

  cssCache.set(cacheKey, builtCss);

  return {
    ok: true as const,
    css: builtCss,
    cacheHit: false,
    durationMs: Math.round(performance.now() - startedAt),
  };
}

function normalizeCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((candidate): candidate is string => typeof candidate === "string")
        .map((candidate) => candidate.trim())
        .filter(
          (candidate) =>
            candidate.length > 0 && candidate.length <= MAX_CANDIDATE_LENGTH,
        ),
    ),
  ].slice(0, MAX_CANDIDATES);
}

function getCompiler() {
  compilerPromise ??= createCompiler();
  return compilerPromise;
}

async function createCompiler() {
  const { compile } = await import("tailwindcss-v4");

  return compile(
    buildPreviewTailwindCss(getPreviewDependencies("baseui"), {
      tailwindBrowser: "",
      tailwindCss: `${previewStyleAssetCss.twAnimateCss}\n${previewStyleAssetCss.shadcnTailwindCss}`,
    }),
    {
      base: process.cwd(),
      loadStylesheet: async (id, base) => {
        const stylesheetPath = resolveTailwindStylesheet(id, base);
        if (!stylesheetPath) {
          throw new Error(`Cannot resolve Tailwind stylesheet "${id}".`);
        }

        return {
          path: stylesheetPath,
          base: nodePath.dirname(stylesheetPath),
          content: await readFile(stylesheetPath, "utf8"),
        };
      },
    },
  );
}

function resolveTailwindStylesheet(id: string, base: string) {
  if (id === "tailwindcss") return tailwindV4Stylesheet("index.css");
  if (id === "tailwindcss/theme" || id === "./theme.css") {
    return tailwindV4Stylesheet("theme.css");
  }
  if (id === "tailwindcss/preflight" || id === "./preflight.css") {
    return tailwindV4Stylesheet("preflight.css");
  }
  if (id === "tailwindcss/utilities" || id === "./utilities.css") {
    return tailwindV4Stylesheet("utilities.css");
  }
  if (id.startsWith("./") && base.includes("tailwindcss-v4")) {
    return tailwindV4Stylesheet(id.slice(2));
  }
  return null;
}

function tailwindV4Stylesheet(filename: string) {
  return nodePath.join(process.cwd(), "node_modules/tailwindcss-v4", filename);
}
