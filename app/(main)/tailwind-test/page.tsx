import CodeRunner from "@/components/code-runner";
import Link from "next/link";

type TailwindTestParams = {
  preview?: string;
  debug?: string;
};

const tailwindProbeFiles = [
  {
    path: "src/App.tsx",
    content: `import React from "react";

const checks = [
  {
    id: "arbitrary-color",
    label: "bg-[#123456]",
    className: "h-16 w-64 rounded-lg bg-[#123456] text-white",
  },
  {
    id: "arbitrary-size",
    label: "w-[123px] h-[47px]",
    className: "h-[47px] w-[123px] rounded-lg bg-emerald-600 text-white",
  },
  {
    id: "arbitrary-text",
    label: "text-[14px]",
    className: "rounded-lg bg-zinc-900 p-4 text-[14px] text-white",
  },
  {
    id: "arbitrary-shadow",
    label: "shadow-[0_0_0_4px_rgba(59,130,246,0.35)]",
    className:
      "rounded-lg bg-white p-4 text-zinc-950 shadow-[0_0_0_4px_rgba(59,130,246,0.35)]",
  },
  {
    id: "data-variant",
    label: "data-[state=open]:bg-[#ef4444]",
    props: { "data-state": "open" },
    className:
      "rounded-lg bg-zinc-200 p-4 text-white data-[state=open]:bg-[#ef4444]",
  },
  {
    id: "aria-variant",
    label: "aria-[expanded=true]:text-[#22c55e]",
    props: { "aria-expanded": "true" },
    className:
      "rounded-lg bg-zinc-950 p-4 text-white aria-[expanded=true]:text-[#22c55e]",
  },
];

export default function App() {
  return (
    <main className="min-h-screen bg-white p-8 text-zinc-950">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Tailwind arbitrary value probe</h1>
        <p className="mt-2 text-zinc-600">
          These boxes intentionally use arbitrary values and arbitrary variants.
        </p>

        <section className="mt-8 grid gap-4">
          {checks.map((check) => (
            <div key={check.id} className="rounded-lg border border-zinc-200 p-4">
              <div
                id={check.id}
                data-probe-id={check.id}
                className={check.className}
                {...check.props}
              >
                {check.label}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
`,
  },
];

export default async function TailwindTestPage({
  searchParams,
}: {
  searchParams: Promise<TailwindTestParams>;
}) {
  const params = await searchParams;
  const activePreview = params.preview === "sandpack" ? "sandpack" : "wasm";

  return (
    <div className="h-screen w-screen">
      <nav className="fixed right-4 top-4 z-[60] flex overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm">
        {(["wasm", "sandpack"] as const).map((preview) => (
          <Link
            key={preview}
            href={buildHref(params, preview)}
            className={`px-3 py-2 text-xs font-medium ${
              activePreview === preview
                ? "bg-zinc-900 text-white"
                : "text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            {preview === "wasm" ? "WASM" : "Sandpack"}
          </Link>
        ))}
      </nav>
      <CodeRunner files={tailwindProbeFiles} />
    </div>
  );
}

function buildHref(params: TailwindTestParams, preview: string) {
  const query = new URLSearchParams();
  query.set("preview", preview);
  if (params.debug) query.set("debug", params.debug);
  return `/tailwind-test?${query.toString()}`;
}
