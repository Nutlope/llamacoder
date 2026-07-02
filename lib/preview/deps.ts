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

export function buildImportMapObject() {
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${PREVIEW_DEPS.react}`,
    "react/jsx-runtime": `https://esm.sh/react@${PREVIEW_DEPS.react}/jsx-runtime`,
    "react-dom": `https://esm.sh/react-dom@${PREVIEW_DEPS["react-dom"]}`,
    "react-dom/client": `https://esm.sh/react-dom@${PREVIEW_DEPS["react-dom"]}/client`,
  };

  for (const [name, version] of Object.entries(PREVIEW_DEPS)) {
    if (name === "react" || name === "react-dom") continue;

    imports[name] =
      `https://esm.sh/${name}@${version}?external=react,react-dom`;
    imports[`${name}/`] = `https://esm.sh/${name}@${version}/`;
  }

  return { imports };
}

export function buildImportMap(): string {
  return JSON.stringify(buildImportMapObject());
}

export function buildPreviewPackageJson(): string {
  return JSON.stringify(
    {
      private: true,
      type: "module",
      previewResolution:
        "The browser preview resolves these dependencies via import-map.json, not node_modules.",
      dependencies: PREVIEW_DEPS,
    },
    null,
    2,
  );
}
