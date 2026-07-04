"use client";

export default function NativeBaseuiDemo() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
      <div className="mx-auto max-w-3xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-zinc-500">Native comparison</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Needs a Tailwind v4 shadcn app context
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The Base UI kit now uses the official shadcn Base/Nova registry files.
          Those files intentionally import <code>@/components/ui/*</code> and
          require the shadcn Tailwind v4 theme layer. The wasm renderer provides
          that virtual filesystem. A true native comparison should run from a
          separate Tailwind v4 app rooted at <code>preview-kits/baseui</code>, not
          through this repo&apos;s legacy Tailwind v3 app aliases.
        </p>
        <a
          href="/preview-baseui?debug=1"
          className="mt-4 inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50"
        >
          Open wasm gauntlet
        </a>
      </div>
    </main>
  );
}
