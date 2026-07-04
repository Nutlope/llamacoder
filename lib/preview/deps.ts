export const PREVIEW_DEPS: Record<string, string> = {
  react: "19.1.0",
  "react-dom": "19.1.0",
  "lucide-react": "0.525.0",
  recharts: "3.9.1",
  "react-router-dom": "7.6.0",
  "@radix-ui/react-accordion": "1.2.0",
  "@radix-ui/react-alert-dialog": "1.1.1",
  "@radix-ui/react-aspect-ratio": "1.1.0",
  "@radix-ui/react-avatar": "1.1.0",
  "@radix-ui/react-checkbox": "1.1.1",
  "@radix-ui/react-collapsible": "1.1.0",
  "@radix-ui/react-dialog": "1.1.1",
  "@radix-ui/react-dropdown-menu": "2.1.1",
  "@radix-ui/react-hover-card": "1.1.1",
  "@radix-ui/react-label": "2.1.0",
  "@radix-ui/react-menubar": "1.1.1",
  "@radix-ui/react-navigation-menu": "1.2.0",
  "@radix-ui/react-popover": "1.1.1",
  "@radix-ui/react-progress": "1.1.0",
  "@radix-ui/react-radio-group": "1.2.0",
  "@radix-ui/react-select": "2.1.1",
  "@radix-ui/react-separator": "1.1.0",
  "@radix-ui/react-slider": "1.2.0",
  "@radix-ui/react-slot": "1.1.0",
  "@radix-ui/react-switch": "1.1.0",
  "@radix-ui/react-tabs": "1.1.0",
  "@radix-ui/react-toast": "1.2.1",
  "@radix-ui/react-toggle": "1.1.0",
  "@radix-ui/react-toggle-group": "1.1.0",
  "@radix-ui/react-tooltip": "1.1.2",
  "class-variance-authority": "0.7.0",
  clsx: "2.1.1",
  "date-fns": "3.6.0",
  "embla-carousel-react": "8.1.8",
  "react-day-picker": "8.10.1",
  "tailwind-merge": "2.4.0",
  "tailwindcss-animate": "1.0.7",
  "framer-motion": "11.15.0",
  vaul: "0.9.1",
};

export function buildImportMapObject(
  deps: Record<string, string> = PREVIEW_DEPS,
) {
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${deps.react}`,
    "react/jsx-runtime": `https://esm.sh/react@${deps.react}/jsx-runtime`,
    "react-dom": `https://esm.sh/react-dom@${deps["react-dom"]}`,
    "react-dom/client": `https://esm.sh/react-dom@${deps["react-dom"]}/client`,
  };

  for (const [name, version] of Object.entries(deps)) {
    if (name === "react" || name === "react-dom") continue;

    imports[name] =
      `https://esm.sh/${name}@${version}?external=react,react-dom`;
    // Import-map prefix entries cannot carry esm.sh query params, so React
    // packages should be imported from their root specifier in generated apps.
    imports[`${name}/`] = `https://esm.sh/${name}@${version}/`;
  }

  if (deps["@base-ui/react"]) {
    for (const subpath of BASE_UI_SUBPATHS) {
      imports[`@base-ui/react/${subpath}`] =
        `https://esm.sh/@base-ui/react@${deps["@base-ui/react"]}/${subpath}?external=react,react-dom`;
    }
  }

  if (deps["@shadcn/react"]) {
    imports["@shadcn/react/message-scroller"] =
      `https://esm.sh/@shadcn/react@${deps["@shadcn/react"]}/message-scroller?external=react,react-dom`;
  }

  return { imports };
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
  "textarea",
  "toggle",
  "toggle-group",
  "tooltip",
  "use-render",
];

export function buildImportMap(deps?: Record<string, string>): string {
  return JSON.stringify(buildImportMapObject(deps));
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
