import CodeRunner from "@/components/code-runner";
import { baseuiDemoFiles } from "../page";
import NativeBaseuiDemo from "../native-demo";

export const dynamic = "force-dynamic";

export default function PreviewBaseuiComparePage() {
  return (
    <main className="grid h-screen w-screen grid-cols-1 bg-zinc-100 text-zinc-950 xl:grid-cols-2">
      <section className="flex min-h-0 flex-col border-b border-zinc-300 xl:border-b-0 xl:border-r">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-300 bg-white px-3 text-sm">
          <span className="font-semibold">Wasm renderer</span>
          <a className="text-zinc-500 underline-offset-4 hover:underline" href="/preview-baseui?debug=1">
            open full
          </a>
        </header>
        <div className="min-h-0 flex-1">
          <CodeRunner files={baseuiDemoFiles} previewKit="baseui" />
        </div>
      </section>

      <section className="min-h-0 overflow-auto">
        <header className="sticky top-0 z-20 flex h-11 items-center border-b border-zinc-300 bg-white px-3 text-sm font-semibold">
          Native Next renderer
        </header>
        <NativeBaseuiDemo />
      </section>
    </main>
  );
}
