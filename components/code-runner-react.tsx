"use client";

import {
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react/unstyled";

export default function ReactCodeRunner({ code }: { code: string }) {
  return (
    <SandpackProvider
      key={code}
      files={{ "App.tsx": { code } }}
      template="react-ts"
      options={{
        externalResources: [
          "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
        ],
      }}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showRestartButton={false}
        showOpenNewtab={false}
        className="aspect-square w-full"
      />
    </SandpackProvider>
  );
}
