"use client";

import {
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react/unstyled";
import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";

// TODO: Add shadcn components + library (recharts, lucide-react)
export default function CodeViewer({ code }: { code: string }) {
  return (
    <SandpackProvider
      template="react-ts"
      theme={draculaTheme}
      files={{
        "App.tsx": code,
        "/public/index.html": `
        <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Document</title>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body>
              <div id="root"></div>
            </body>
          </html>`,
      }}
      options={{
        externalResources: [
          "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
        ],
      }}
      customSetup={{
        dependencies: {
          "lucide-react": "latest",
          recharts: "2.9.0",
          "react-router-dom": "latest",
        },
      }}
    >
      <SandpackPreview
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
      />
    </SandpackProvider>
  );
}
