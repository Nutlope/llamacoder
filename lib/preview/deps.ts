import { baseuiPreviewDependencies } from "./generated/baseui-files";

// framer-motion and vaul moved into the baseui preview kit (locally
// vendored); versions now come from preview-kits/baseui/package.json.
const GENERAL_PREVIEW_DEPS: Record<string, string> = {};

export const PREVIEW_DEPS: Record<string, string> = {
  ...GENERAL_PREVIEW_DEPS,
  ...baseuiPreviewDependencies,
};

export function buildImportMapObject(
  deps: Record<string, string> = PREVIEW_DEPS,
  options: { localVendor?: boolean; vendor?: "local" | "cdn" | "flat" } = {},
) {
  const vendor =
    options.vendor ?? (options.localVendor === false ? "cdn" : "local");
  const localVendor = deps["@base-ui/react"]
    ? getBaseuiVendorImports(vendor)
    : {};
  const componentVendor =
    deps["@base-ui/react"] && (vendor === "local" || vendor === "flat")
      ? BASEUI_COMPONENT_VENDOR_IMPORTS
      : {};
  const imports: Record<string, string> = {
    react: localVendor.react ?? `https://esm.sh/react@${deps.react}`,
    "react/jsx-runtime":
      localVendor["react/jsx-runtime"] ??
      `https://esm.sh/react@${deps.react}/jsx-runtime`,
    "react-dom":
      localVendor["react-dom"] ?? `https://esm.sh/react-dom@${deps["react-dom"]}`,
    "react-dom/client":
      localVendor["react-dom/client"] ??
      `https://esm.sh/react-dom@${deps["react-dom"]}/client`,
  };

  for (const [name, version] of Object.entries(deps)) {
    if (name === "react" || name === "react-dom") continue;

    imports[name] =
      localVendor[name] ??
      buildEsmUrl(name, version, {
        externalReact: true,
      });
    // Import-map prefix entries cannot carry esm.sh query params, so React
    // packages should be imported from their root specifier in generated apps.
    imports[`${name}/`] = `https://esm.sh/${name}@${version}/`;
  }

  if (deps["@base-ui/react"]) {
    for (const subpath of BASE_UI_SUBPATHS) {
      const specifier = `@base-ui/react/${subpath}`;
      imports[specifier] =
        localVendor[specifier] ??
        buildEsmUrl("@base-ui/react", deps["@base-ui/react"], {
          subpath,
          externalReact: true,
        });
    }
  }

  if (deps["@shadcn/react"]) {
    imports["@shadcn/react/message-scroller"] =
      localVendor["@shadcn/react/message-scroller"] ??
      buildEsmUrl("@shadcn/react", deps["@shadcn/react"], {
        subpath: "message-scroller",
        externalReact: true,
      });
  }

  Object.assign(imports, localVendor, componentVendor);

  return { imports };
}

function buildEsmUrl(
  name: string,
  version: string,
  options: {
    subpath?: string;
    externalReact?: boolean;
  } = {},
) {
  const url = new URL(
    `https://esm.sh/${name}@${version}${options.subpath ? `/${options.subpath}` : ""}`,
  );

  if (options.externalReact) {
    url.searchParams.set("external", "react,react-dom");
  }
  // Collapse the package's whole module graph into ONE bundled file. Without
  // this, esm.sh serves deep-graph libs (framer-motion has ~90 sub-modules) as
  // a request waterfall that blows past the 15s preview watchdog on cold load.
  url.searchParams.set("bundle", "");
  return url.toString();
}

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

const BASEUI_LOCAL_VENDOR_IMPORTS = buildBaseuiVendorImports(
  "/preview-vendor-v2/baseui",
);

function getBaseuiVendorImports(vendor: "local" | "cdn" | "flat") {
  if (vendor === "local") return BASEUI_LOCAL_VENDOR_IMPORTS;
  if (vendor === "flat") {
    return buildBaseuiVendorImports("/preview-vendor-v2/baseui-flat");
  }
  return {};
}

function buildBaseuiVendorImports(prefix: string): Record<string, string> {
  return {
    react: `${prefix}/react.js`,
    "react/jsx-runtime": `${prefix}/react-jsx-runtime.js`,
    "react-dom": `${prefix}/react-dom.js`,
    "react-dom/client": `${prefix}/react-dom-client.js`,
    "@base-ui/react": `${prefix}/base-ui-react.js`,
    "@shadcn/react/message-scroller": `${prefix}/shadcn-react-message-scroller.js`,
    "class-variance-authority": `${prefix}/class-variance-authority.js`,
    cmdk: `${prefix}/cmdk.js`,
    clsx: `${prefix}/clsx.js`,
    "date-fns": `${prefix}/date-fns.js`,
    "embla-carousel-react": `${prefix}/embla-carousel-react.js`,
    "framer-motion": `${prefix}/framer-motion.js`,
    "input-otp": `${prefix}/input-otp.js`,
    "lucide-react": `${prefix}/lucide-react.js`,
    "next-themes": `${prefix}/next-themes.js`,
    "react-day-picker": `${prefix}/react-day-picker.js`,
    "react-resizable-panels": `${prefix}/react-resizable-panels.js`,
    recharts: `${prefix}/recharts.js`,
    sonner: `${prefix}/sonner.js`,
    "tailwind-merge": `${prefix}/tailwind-merge.js`,
    vaul: `${prefix}/vaul.js`,
    ...Object.fromEntries(
      BASE_UI_SUBPATHS.map((subpath) => [
        `@base-ui/react/${subpath}`,
        `${prefix}/base-ui-${subpath.replaceAll("/", "-")}.js`,
      ]),
    ),
  };
}

const BASEUI_COMPONENT_VENDOR_PATHS = [
  "components/ui/accordion",
  "components/ui/alert-dialog",
  "components/ui/alert",
  "components/ui/aspect-ratio",
  "components/ui/attachment",
  "components/ui/avatar",
  "components/ui/badge",
  "components/ui/breadcrumb",
  "components/ui/bubble",
  "components/ui/button-group",
  "components/ui/button",
  "components/ui/calendar",
  "components/ui/card",
  "components/ui/carousel",
  "components/ui/chart",
  "components/ui/checkbox",
  "components/ui/collapsible",
  "components/ui/combobox",
  "components/ui/command",
  "components/ui/context-menu",
  "components/ui/data-table",
  "components/ui/date-picker",
  "components/ui/dialog",
  "components/ui/direction",
  "components/ui/drawer",
  "components/ui/dropdown-menu",
  "components/ui/empty",
  "components/ui/field",
  "components/ui/hover-card",
  "components/ui/index",
  "components/ui/input-group",
  "components/ui/input-otp",
  "components/ui/input",
  "components/ui/item",
  "components/ui/kbd",
  "components/ui/label",
  "components/ui/marker",
  "components/ui/menubar",
  "components/ui/message-scroller",
  "components/ui/message",
  "components/ui/native-select",
  "components/ui/navigation-menu",
  "components/ui/pagination",
  "components/ui/popover",
  "components/ui/progress",
  "components/ui/radio-group",
  "components/ui/resizable",
  "components/ui/scroll-area",
  "components/ui/select",
  "components/ui/separator",
  "components/ui/sheet",
  "components/ui/sidebar",
  "components/ui/skeleton",
  "components/ui/slider",
  "components/ui/sonner",
  "components/ui/spinner",
  "components/ui/switch",
  "components/ui/table",
  "components/ui/tabs",
  "components/ui/textarea",
  "components/ui/toast",
  "components/ui/toaster",
  "components/ui/toggle-group",
  "components/ui/toggle",
  "components/ui/tooltip",
  "components/ui/typography",
  "components/ui/use-toast",
  "hooks/use-mobile",
  "hooks/use-toast",
  "lib/utils",
];

const BASEUI_COMPONENT_VENDOR_IMPORTS = buildBaseuiComponentVendorImports(
  "/preview-vendor-v2/baseui-components",
);

function buildBaseuiComponentVendorImports(prefix: string) {
  const entries = BASEUI_COMPONENT_VENDOR_PATHS.flatMap((virtualPath) => {
    const href = `${prefix}/${virtualPath.replace(/[^a-zA-Z0-9]+/g, "-")}.js`;
    return [
      [`@/${virtualPath}`, href],
      [`@/${virtualPath}.tsx`, href],
      [`@/${virtualPath}.ts`, href],
    ];
  });

  entries.push(["@/components/ui", `${prefix}/components-ui-index.js`]);

  return Object.fromEntries(entries);
}

export function buildImportMap(
  deps?: Record<string, string>,
  options?: { localVendor?: boolean; vendor?: "local" | "cdn" | "flat" },
): string {
  return JSON.stringify(buildImportMapObject(deps, options));
}

export function buildPreviewPackageJson(
  deps: Record<string, string> = PREVIEW_DEPS,
): string {
  return JSON.stringify(
    {
      private: true,
      type: "module",
      previewResolution:
        "The browser preview resolves these dependencies via import-map.json, not node_modules.",
      dependencies: deps,
    },
    null,
    2,
  );
}
