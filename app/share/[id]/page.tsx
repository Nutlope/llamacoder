import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";
import { notFound } from "next/navigation";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
} from "@codesandbox/sandpack-react";

async function getCode(id: string) {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return `export default function Component() { return <p className='text-blue-500'>Hi!</p> };`;
}

/*
  Database schemahttp://localhost:3000/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fhalo.c1bc0835.png&w=3840&q=75

  id (@uuid) | prompt (TEXT)  | code (TEXT) |                
  ----------------------------------------------------- 
  abkens     | Build me a.... | export default function....
  islkns     | Build me a.... | export default function....

  Index on ID
*/

export default async function Page({ params }: { params: { id: string } }) {
  if (typeof params.id !== "string") {
    notFound();
  }

  let code = await getCode(params.id);

  return (
    <SandpackProvider
      template="react-ts"
      theme={draculaTheme}
      files={{
        "App.tsx": code,
      }}
      options={{
        externalResources: [
          "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
        ],
      }}
    >
      <SandpackLayout>
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}
