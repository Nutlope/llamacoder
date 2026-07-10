import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { build, type Plugin } from "esbuild";

const require = createRequire(import.meta.url);

const OUT_DIR = path.join(process.cwd(), "public/preview-vendor/baseui");
const FLAT_OUT_DIR = path.join(
  process.cwd(),
  "public/preview-vendor/baseui-flat",
);
const COMPONENTS_OUT_DIR = path.join(
  process.cwd(),
  "public/preview-vendor/baseui-components",
);
const ESBUILD_OUT_DIR = path.join(process.cwd(), "public/preview-vendor/esbuild");
const STYLES_OUT_DIR = path.join(process.cwd(), "public/preview-vendor/styles");
const GENERATED_STYLE_ASSETS_PATH = path.join(
  process.cwd(),
  "lib/preview/generated/style-assets.ts",
);
const GENERATED_VENDOR_PRELOADS_PATH = path.join(
  process.cwd(),
  "lib/preview/generated/vendor-preloads.ts",
);
const TMP_ROOT = path.join(process.cwd(), ".tmp/preview-vendor");
const TMP_DIR = path.join(TMP_ROOT, "baseui");
// v2 is a one-time namespace escape from the old URLs, which were served as
// immutable even though their contents could change between deploys.
const PUBLIC_URL_PREFIX = "/preview-vendor-v2/baseui";
const FLAT_PUBLIC_URL_PREFIX = "/preview-vendor-v2/baseui-flat";
const COMPONENTS_PUBLIC_URL_PREFIX = "/preview-vendor-v2/baseui-components";
const KIT_ROOT = path.join(process.cwd(), "preview-kits/baseui");
const PRODUCTION_DEFINES = {
  "process.env.NODE_ENV": '"production"',
};

const BASE_UI_SUBPATHS = [
  "accordion",
  "alert-dialog",
  "avatar",
  "button",
  "checkbox",
  "collapsible",
  "context-menu",
  "direction-provider",
  "dialog",
  "drawer",
  "field",
  "input",
  "merge-props",
  "menu",
  "menubar",
  "navigation-menu",
  "popover",
  "preview-card",
  "progress",
  "radio",
  "radio-group",
  "scroll-area",
  "select",
  "separator",
  "slider",
  "switch",
  "tabs",
  "toggle",
  "toggle-group",
  "tooltip",
  "use-render",
];

const REACT_SPECS = ["react"];
const REACT_DOM_SPECS = ["react/jsx-runtime", "react-dom", "react-dom/client"];
const RUNTIME_SPECS = [
  "@shadcn/react/message-scroller",
  "@base-ui/react",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "date-fns",
  "embla-carousel-react",
  "framer-motion",
  "input-otp",
  "lucide-react",
  "next-themes",
  "react-day-picker",
  "react-resizable-panels",
  "recharts",
  "sonner",
  "tailwind-merge",
  "vaul",
];

type Entry = {
  specifier: string;
  filename: string;
  source: string;
};

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.rm(FLAT_OUT_DIR, { recursive: true, force: true });
  await fs.rm(COMPONENTS_OUT_DIR, { recursive: true, force: true });
  await fs.rm(ESBUILD_OUT_DIR, { recursive: true, force: true });
  await fs.rm(STYLES_OUT_DIR, { recursive: true, force: true });
  await fs.rm(TMP_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(FLAT_OUT_DIR, { recursive: true });
  await fs.mkdir(COMPONENTS_OUT_DIR, { recursive: true });
  await fs.mkdir(ESBUILD_OUT_DIR, { recursive: true });
  await fs.mkdir(STYLES_OUT_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });

  const entries = buildEntries();
  await writeEntryFiles(entries);
  await buildVendor(entries);
  await writeManifest(entries, OUT_DIR, PUBLIC_URL_PREFIX);
  await buildFlatVendor(entries);
  await writeManifest(entries, FLAT_OUT_DIR, FLAT_PUBLIC_URL_PREFIX);
  await buildComponentVendor();
  await writeVendorPreloadGraph();
  await copyEsbuildWasm();
  await copyPreviewStyleAssets();
  await fs.rm(TMP_ROOT, { recursive: true, force: true });
}

async function buildFlatVendor(entries: Entry[]) {
  if (entries.length === 0) return;

  await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(TMP_DIR, `${entry.filename}.ts`);

      return build({
        entryPoints: [entryPath],
        outfile: path.join(FLAT_OUT_DIR, `${entry.filename}.js`),
        bundle: true,
        splitting: false,
        format: "esm",
        target: "es2022",
        platform: "browser",
        logLevel: "info",
        jsx: "automatic",
        define: PRODUCTION_DEFINES,
        legalComments: "none",
        minify: true,
        plugins: [flatSharedReactPlugin(entry, entryPath)],
      });
    }),
  );
}

function flatSharedReactPlugin(entry: Entry, entryPath: string): Plugin {
  return {
    name: "flat-shared-react",
    setup(buildApi) {
      buildApi.onResolve({ filter: FLAT_SHARED_REACT_FILTER }, (args) => {
        if (
          args.path === entry.specifier &&
          path.resolve(args.importer) === path.resolve(entryPath)
        ) {
          return null;
        }

        return { path: args.path, namespace: "flat-shared-react" };
      });

      buildApi.onResolve(
        { filter: /^\/preview-vendor-v2\/baseui-flat\// },
        (args) => ({ path: args.path, external: true }),
      );

      buildApi.onLoad(
        { filter: FLAT_SHARED_REACT_FILTER, namespace: "flat-shared-react" },
        (args) => ({
          loader: "js",
          contents: buildFlatSharedReactShim(args.path),
        }),
      );
    },
  };
}

function buildFlatSharedReactShim(specifier: string) {
  const href = FLAT_SHARED_REACT_IMPORTS[specifier];
  const defaultExport = FLAT_SHARED_REACT_DEFAULT_EXPORTS.has(specifier)
    ? `\nexport { default } from ${JSON.stringify(href)};`
    : "";

  return `export * from ${JSON.stringify(href)};${defaultExport}\n`;
}

const FLAT_SHARED_REACT_FILTER =
  /^(react|react\/jsx-runtime|react-dom|react-dom\/client)$/;

const FLAT_SHARED_REACT_IMPORTS: Record<string, string> = {
  react: `${FLAT_PUBLIC_URL_PREFIX}/react.js`,
  "react/jsx-runtime": `${FLAT_PUBLIC_URL_PREFIX}/react-jsx-runtime.js`,
  "react-dom": `${FLAT_PUBLIC_URL_PREFIX}/react-dom.js`,
  "react-dom/client": `${FLAT_PUBLIC_URL_PREFIX}/react-dom-client.js`,
};

const FLAT_SHARED_REACT_DEFAULT_EXPORTS = new Set([
  "react",
  "react-dom",
  "react-dom/client",
]);

function buildEntries(): Entry[] {
  return [
    ...[
      ...REACT_SPECS,
      ...REACT_DOM_SPECS,
      ...RUNTIME_SPECS,
    ].map((specifier) => ({
      specifier,
      filename: slugSpecifier(specifier),
      source: exportAll(specifier),
    })),
    ...BASE_UI_SUBPATHS.map((subpath) => {
      const specifier = `@base-ui/react/${subpath}`;
      return {
        specifier,
        filename: `base-ui-${slugSpecifier(subpath)}`,
        source: exportAll(specifier),
      };
    }),
  ];
}

async function writeEntryFiles(entries: Entry[]) {
  await Promise.all(
    entries.map((entry) =>
      fs.writeFile(path.join(TMP_DIR, `${entry.filename}.ts`), entry.source),
    ),
  );
}

async function buildVendor(entries: Entry[]) {
  if (entries.length === 0) return;

  await build({
    entryPoints: Object.fromEntries(
      entries.map((entry) => [
        entry.filename,
        path.join(TMP_DIR, `${entry.filename}.ts`),
      ]),
    ),
    outdir: OUT_DIR,
    bundle: true,
    splitting: true,
    format: "esm",
    target: "es2022",
    platform: "browser",
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    logLevel: "info",
    jsx: "automatic",
    define: PRODUCTION_DEFINES,
    legalComments: "none",
    minify: true,
  });
}

async function writeManifest(
  entries: Entry[],
  outDir: string,
  publicUrlPrefix: string,
) {
  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(
      Object.fromEntries(
        entries.map((entry) => [
          entry.specifier,
          `${publicUrlPrefix}/${entry.filename}.js`,
        ]),
      ),
      null,
      2,
    ),
  );
}

async function buildComponentVendor() {
  const entries = await collectComponentEntries();

  await build({
    entryPoints: Object.fromEntries(
      entries.map((entry) => [entry.filename, entry.absolutePath]),
    ),
    outdir: COMPONENTS_OUT_DIR,
    bundle: true,
    splitting: false,
    format: "esm",
    target: "es2022",
    platform: "browser",
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    logLevel: "info",
    define: PRODUCTION_DEFINES,
    external: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-dom/client",
      "@base-ui/react",
      "@base-ui/react/*",
      "@shadcn/react/message-scroller",
      "class-variance-authority",
      "clsx",
      "cmdk",
      "embla-carousel-react",
      "input-otp",
      "next-themes",
      "react-day-picker",
      "react-resizable-panels",
      "recharts",
      "sonner",
      "tailwind-merge",
    ],
    jsx: "automatic",
    legalComments: "none",
    minify: true,
    plugins: [baseuiAliasPlugin()],
  });

  await fs.writeFile(
    path.join(COMPONENTS_OUT_DIR, "manifest.json"),
    JSON.stringify(
      Object.fromEntries(
        entries.flatMap((entry) => [
          [
            `@/${entry.virtualPath.replace(/\.(tsx|ts|jsx|js)$/, "")}`,
            `${COMPONENTS_PUBLIC_URL_PREFIX}/${entry.filename}.js`,
          ],
          [
            `@/${entry.virtualPath}`,
            `${COMPONENTS_PUBLIC_URL_PREFIX}/${entry.filename}.js`,
          ],
        ]),
      ),
      null,
      2,
    ),
  );
}

async function writeVendorPreloadGraph() {
  const graphEntries: Array<[string, string[]]> = [];
  const directories = [
    [FLAT_OUT_DIR, FLAT_PUBLIC_URL_PREFIX],
    [COMPONENTS_OUT_DIR, COMPONENTS_PUBLIC_URL_PREFIX],
  ] as const;

  for (const [directory, publicUrlPrefix] of directories) {
    const files = await collectBuiltJavaScriptFiles(directory);

    for (const filePath of files) {
      const source = await fs.readFile(filePath, "utf8");
      const href = `${publicUrlPrefix}/${path
        .relative(directory, filePath)
        .split(path.sep)
        .join("/")}`;
      const imports = collectStaticImportSpecifiers(source);

      if (imports.length > 0) {
        graphEntries.push([href, imports]);
      }
    }
  }

  const graph = Object.fromEntries(
    graphEntries.sort(([left], [right]) => left.localeCompare(right)),
  );

  await fs.writeFile(
    GENERATED_VENDOR_PRELOADS_PATH,
    `export const previewVendorPreloadGraph = ${JSON.stringify(
      graph,
      null,
      2,
    )} as const;\n`,
  );
}

async function collectBuiltJavaScriptFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectBuiltJavaScriptFiles(absolutePath);
      }
      if (entry.isFile() && entry.name.endsWith(".js")) {
        return [absolutePath];
      }
      return [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

function collectStaticImportSpecifiers(source: string) {
  const specifiers = new Set<string>();
  const pattern =
    /(?:import|export)(?:[^"']*?from)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    const specifier = match[1] ?? match[2];
    if (specifier) specifiers.add(specifier);
  }

  return [...specifiers].sort();
}

async function copyEsbuildWasm() {
  const wasmPath = require.resolve("esbuild-wasm/esbuild.wasm");
  await fs.copyFile(wasmPath, path.join(ESBUILD_OUT_DIR, "esbuild.wasm"));
}

async function copyPreviewStyleAssets() {
  const twAnimateCssPath = path.join(
    process.cwd(),
    "node_modules/tw-animate-css/dist/tw-animate.css",
  );
  const shadcnTailwindCssPath = require.resolve("shadcn/tailwind.css");

  await fs.copyFile(
    require.resolve("@tailwindcss/browser"),
    path.join(STYLES_OUT_DIR, "tailwind-browser.js"),
  );
  await fs.copyFile(
    twAnimateCssPath,
    path.join(STYLES_OUT_DIR, "tw-animate.css"),
  );
  await fs.copyFile(
    shadcnTailwindCssPath,
    path.join(STYLES_OUT_DIR, "shadcn-tailwind.css"),
  );

  const [twAnimateCss, shadcnTailwindCss] = await Promise.all([
    fs.readFile(twAnimateCssPath, "utf8"),
    fs.readFile(shadcnTailwindCssPath, "utf8"),
  ]);

  await fs.writeFile(
    GENERATED_STYLE_ASSETS_PATH,
    `export const previewStyleAssetCss = ${JSON.stringify(
      {
        twAnimateCss,
        shadcnTailwindCss,
      },
      null,
      2,
    )} as const;\n`,
  );
}

async function collectComponentEntries() {
  const paths = await collectFiles(KIT_ROOT);
  return paths
    .map((absolutePath) => {
      const virtualPath = path
        .relative(KIT_ROOT, absolutePath)
        .split(path.sep)
        .join("/");

      return {
        absolutePath,
        virtualPath,
        filename: slugSpecifier(virtualPath.replace(/\.(tsx|ts|jsx|js)$/, "")),
      };
    })
    .filter(
      (entry) =>
        entry.virtualPath.startsWith("components/ui/") ||
        entry.virtualPath === "hooks/use-mobile.ts" ||
        entry.virtualPath === "hooks/use-toast.ts" ||
        entry.virtualPath === "lib/utils.ts",
    );
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(absolutePath);
      }
      if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        return [absolutePath];
      }
      return [];
    }),
  );

  return files.flat();
}

function baseuiAliasPlugin(): Plugin {
  return {
    name: "baseui-alias",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^@\// }, (args) => {
        const resolved = resolveKitImport(args.path);

        if (!resolved) {
          return {
            errors: [
              {
                text: `Cannot resolve "${args.path}" from "${args.importer}"`,
              },
            ],
          };
        }

        return { path: resolved };
      });
    },
  };
}

function resolveKitImport(specifier: string) {
  const basePath = path.join(KIT_ROOT, specifier.slice(2));
  const candidates = [
    basePath,
    `${basePath}.tsx`,
    `${basePath}.ts`,
    `${basePath}.jsx`,
    `${basePath}.js`,
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.jsx"),
    path.join(basePath, "index.js"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function exportAll(specifier: string) {
  if (specifier === "react") {
    return `import React from "react";

const {
  Activity,
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  __COMPILER_RUNTIME,
  act,
  cache,
  cacheSignal,
  captureOwnerStack,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  unstable_useCacheRefresh,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
} = React;

export {
  Activity,
  Children,
  Component,
  Fragment,
  Profiler,
  PureComponent,
  StrictMode,
  Suspense,
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  __COMPILER_RUNTIME,
  act,
  cache,
  cacheSignal,
  captureOwnerStack,
  cloneElement,
  createContext,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  lazy,
  memo,
  startTransition,
  unstable_useCacheRefresh,
  use,
  useActionState,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useOptimistic,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  version,
};
export default React;
`;
  }
  if (specifier === "react/jsx-runtime") {
    return `import * as Runtime from "react/jsx-runtime";

const { Fragment, jsx, jsxs } = Runtime;

export { Fragment, jsx, jsxs };
`;
  }
  if (specifier === "react-dom/client") {
    return `import * as ReactDomClient from "react-dom/client";

const { createRoot, hydrateRoot, version } = ReactDomClient;

export { createRoot, hydrateRoot, version };
export default ReactDomClient;
`;
  }
  if (specifier === "react-dom") {
    return `import * as ReactDom from "react-dom";

const {
  __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  createPortal,
  flushSync,
  preconnect,
  prefetchDNS,
  preinit,
  preinitModule,
  preload,
  preloadModule,
  requestFormReset,
  unstable_batchedUpdates,
  useFormState,
  useFormStatus,
  version,
} = ReactDom;

export {
  __DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  createPortal,
  flushSync,
  preconnect,
  prefetchDNS,
  preinit,
  preinitModule,
  preload,
  preloadModule,
  requestFormReset,
  unstable_batchedUpdates,
  useFormState,
  useFormStatus,
  version,
};
export default ReactDom;
`;
  }
  if (specifier === "embla-carousel-react") {
    return `export * from "embla-carousel-react";
export { default } from "embla-carousel-react";
`;
  }

  return `export * from "${specifier}";\n`;
}

function slugSpecifier(specifier: string) {
  return specifier
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
