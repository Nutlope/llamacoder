"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import LoadingDots from "../../components/loading-dots";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowLongRightIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { domain } from "@/utils/domain";
import CodeViewer from "@/components/code-viewer";
import { shareApp } from "./actions";

export default function Home() {
  const [status, setStatus] = useState<"initial" | "creating" | "created" | "updating" | "updated">("initial");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo");
  const [shadcn, setShadcn] = useState(false);
  const [modification, setModification] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [initialAppConfig, setInitialAppConfig] = useState({
    model: "",
    shadcn: true,
  });
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const loading = status === "creating" || status === "updating";
  const [ref, scrollTo] = useScrollTo();

  const models = [
    { label: "Llama 3.1 405B", value: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo" },
    { label: "Llama 3.3 70B", value: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
    { label: "Qwen 2.5 Coder 32B", value: "Qwen/Qwen2.5-Coder-32B-Instruct" },
    { label: "Gemma 2 27B", value: "google/gemma-2-27b-it" },
  ];

  const handleSubmit = async (e: FormEvent<HTMLFormElement>, action: 'create' | 'update') => {
    e.preventDefault();
    if (status !== "initial") scrollTo({ delay: 0.5 });

    setStatus(action === 'create' ? "creating" : "updating");
    setGeneratedCode("");

    const body = action === 'create'
      ? { model, shadcn, messages: [{ role: "user", content: prompt }] }
      : { messages: [...messages, { role: "assistant", content: generatedCode }, { role: "user", content: modification }], model: initialAppConfig.model, shadcn: initialAppConfig.shadcn };

    const res = await fetch("/api/generateCode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`Error ${res.status}: ${res.statusText}`);
      throw new Error(`HTTP Error! Status: ${res.status}`);
    }

    if (!res.body) throw new Error("No response body");

    ChatCompletionStream.fromReadableStream(res.body)
      .on("content", (delta) => setGeneratedCode((prev) => prev + delta))
      .on("end", () => {
        setMessages(action === 'create' ? [{ role: "user", content: prompt }] : [...messages, { role: "assistant", content: generatedCode }, { role: "user", content: modification }]);
        setInitialAppConfig({ model, shadcn });
        setStatus(action === 'create' ? "created" : "updated");
      });
  };

  useEffect(() => {
    const el = document.querySelector(".cm-scroller");
    if (el && loading) {
      const end = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: end });
    }
  }, [loading, generatedCode]);

  return (
    <main className="mt-12 flex w-full flex-1 flex-col items-center px-4 text-center sm:mt-20">
      <a
        className="mb-4 inline-flex h-7 shrink-0 items-center gap-[9px] rounded-[50px] border-[0.5px] border-solid border-[#E6E6E6] bg-[rgba(234,238,255,0.65)] bg-gray-100 px-7 py-5 shadow-[0px_1px_1px_0px_rgba(0,0,0,0.25)]"
        href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
        target="_blank"
      >
        <span className="text-center">
          Powered by <span className="font-medium">Llama 3.1</span> and <span className="font-medium">Together AI</span>
        </span>
      </a>

      <h1 className="my-6 max-w-3xl text-4xl font-bold text-gray-800 sm:text-6xl">
        Turn your <span className="text-blue-600">idea</span>
        <br /> into an <span className="text-blue-600">app</span>
      </h1>

      <form className="w-full max-w-xl" onSubmit={(e) => handleSubmit(e, "create")}>
        <fieldset disabled={loading} className="disabled:opacity-75">
          <div className="relative mt-5">
            <div className="absolute -inset-2 rounded-[32px] bg-gray-300/50" />
            <div className="relative flex rounded-3xl bg-white shadow-sm">
              <div className="relative flex flex-grow items-stretch focus-within:z-10">
                <textarea
                  rows={3}
                  required
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  name="prompt"
                  className="w-full resize-none rounded-l-3xl bg-transparent px-6 py-5 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                  placeholder="Build me a calculator app..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-3xl px-3 py-2 text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900"
              >
                {status === "creating" ? (
                  <LoadingDots color="black" style="large" />
                ) : (
                  <ArrowLongRightIcon className="-ml-0.5 size-6" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center justify-between gap-3 sm:justify-center">
              <p className="text-gray-500 sm:text-xs">Model:</p>
              <Select.Root
                name="model"
                disabled={loading}
                value={model}
                onValueChange={(value) => setModel(value)}
              >
                <Select.Trigger className="group flex w-60 max-w-xs items-center rounded-2xl border-[6px] border-gray-300 bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Select.Value />
                  <Select.Icon className="ml-auto">
                    <ChevronDownIcon className="size-6 text-gray-300 group-focus-visible:text-gray-500 group-enabled:group-hover:text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md bg-white shadow-lg">
                    <Select.Viewport className="p-2">
                      {models.map((model) => (
                        <Select.Item
                          key={model.value}
                          value={model.value}
                          className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                        >
                          <Select.ItemText asChild>
                            <span className="inline-flex items-center gap-2 text-gray-500">
                              <div className="size-2 rounded-full bg-green-500" />
                              {model.label}
                            </span>
                          </Select.ItemText>
                          <Select.ItemIndicator className="ml-auto">
                            <CheckIcon className="size-5 text-blue-600" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
            <div className="flex items-center gap-3 sm:justify-center">
              <p className="text-gray-500 sm:text-xs">ShadCN UI</p>
              <Switch.Root
                disabled={loading}
                checked={shadcn}
                onCheckedChange={() => setShadcn((prev) => !prev)}
                className="data-[state=checked]:bg-blue-500 size-5 rounded-full bg-gray-500"
              >
                <Switch.Thumb className="h-full w-full rounded-full bg-white" />
              </Switch.Root>
            </div>
          </div>
        </fieldset>
      </form>
      <div className="max-w-xl mt-12 space-y-12">
        <AnimatePresence initial={false}>
          {status === "created" || status === "updated" ? (
            <motion.div
              key="code-result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="space-y-3">
                <h3 className="text-center text-lg font-semibold text-gray-700">Resulting Code</h3>
                <div className="space-y-5">
                  <CodeViewer code={generatedCode} />
                </div>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setStatus("initial")}
                  className="w-full max-w-xs rounded-md py-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-200"
                >
                  Start New
                </button>
                <button
                  onClick={() => shareApp(generatedCode)}
                  className="w-full max-w-xs rounded-md bg-blue-600 py-3 text-xs font-semibold text-white ring-1 ring-gray-200"
                >
                  Share App
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <Toaster position="top-center" />
    </main>
  );
}
