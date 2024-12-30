"use client";

import CodeViewer from "@/components/code-viewer";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { domain } from "@/utils/domain";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowLongRightIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";
import * as Select from "@radix-ui/react-select";
import * as Switch from "@radix-ui/react-switch";
import * as Tooltip from "@radix-ui/react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import LoadingDots from "../../components/loading-dots";
import { shareApp } from "./actions";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import LightbulbIcon from "@/components/icons/lightbulb";

export default function Home() {
  let [status, setStatus] = useState<
    "initial" | "creating" | "created" | "updating" | "updated"
  >("initial");
  let [prompt, setPrompt] = useState("");
  let models = [
    {
      label: "Llama 3.1 405B",
      value: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    },
    {
      label: "Qwen 2.5 Coder 32B",
      value: "Qwen/Qwen2.5-Coder-32B-Instruct",
    },
    {
      label: "Llama 3.3 70B",
      value: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    },
    {
      label: "Gemma 2 27B",
      value: "google/gemma-2-27b-it",
    },
  ];
  let [model, setModel] = useState(models[0].value);
  let [quality, setQuality] = useState("low");
  let [shadcn, setShadcn] = useState(false);
  let [modification, setModification] = useState("");
  let [generatedCode, setGeneratedCode] = useState("");
  let [initialAppConfig, setInitialAppConfig] = useState({
    model: "",
    quality: "",
    shadcn: true,
  });
  let [ref, scrollTo] = useScrollTo();
  let [messages, setMessages] = useState<{ role: string; content: string }[]>(
    [],
  );
  let [isPublishing, setIsPublishing] = useState(false);

  let loading = status === "creating" || status === "updating";

  async function createApp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (status !== "initial") {
      scrollTo({ delay: 0.5 });
    }

    setStatus("creating");
    setGeneratedCode("");

    let res = await fetch("/api/generateCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        quality,
        shadcn,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    ChatCompletionStream.fromReadableStream(res.body)
      .on("content", (delta) => setGeneratedCode((prev) => prev + delta))
      .on("end", () => {
        setMessages([{ role: "user", content: prompt }]);
        setInitialAppConfig({ model, quality, shadcn });
        setStatus("created");
      });
  }

  async function updateApp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setStatus("updating");

    let codeMessage = { role: "assistant", content: generatedCode };
    let modificationMessage = { role: "user", content: modification };

    setGeneratedCode("");

    const res = await fetch("/api/generateCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [...messages, codeMessage, modificationMessage],
        model: initialAppConfig.model,
        quality: initialAppConfig.quality,
        shadcn: initialAppConfig.shadcn,
      }),
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }

    if (!res.body) {
      throw new Error("No response body");
    }

    ChatCompletionStream.fromReadableStream(res.body)
      .on("content", (delta) => setGeneratedCode((prev) => prev + delta))
      .on("end", () => {
        setMessages((m) => [...m, codeMessage, modificationMessage]);
        setStatus("updated");
      });
  }

  useEffect(() => {
    let el = document.querySelector(".cm-scroller");
    if (el && loading) {
      let end = el.scrollHeight - el.clientHeight;
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
          Powered by <span className="font-semibold">Together AI</span>. Used by
          <span className="font-semibold"> 600k+ users. </span>
        </span>
      </a>
      <h1 className="my-6 max-w-3xl text-4xl font-bold text-gray-800 sm:text-6xl">
        Turn your <span className="text-blue-600">idea</span>
        <br /> into an <span className="text-blue-600">app</span>
      </h1>

      <form className="w-full max-w-xl" onSubmit={createApp}>
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
          <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center justify-between gap-3 sm:grow sm:flex-col sm:items-start sm:justify-center sm:gap-2">
              <p className="text-gray-500 sm:text-sm">Model</p>
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
                    <Select.ScrollDownButton />
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex h-full items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-center sm:gap-2">
              <label className="text-gray-500 sm:text-sm" htmlFor="shadcn">
                Quality
              </label>
              <Select.Root
                name="quality"
                disabled={loading}
                value={quality}
                onValueChange={setQuality}
              >
                <Select.Trigger className="group flex w-56 max-w-xs items-center rounded-2xl border-[6px] border-gray-300 bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Select.Value />
                  <Select.Icon className="ml-auto">
                    <ChevronDownIcon className="size-6 text-gray-300 group-focus-visible:text-gray-500 group-enabled:group-hover:text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md bg-white shadow-lg">
                    <Select.Viewport className="p-2">
                      <Select.Item
                        value="low"
                        className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                      >
                        <Select.ItemText asChild>
                          <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <LightningBoltIcon className="size-3 text-blue-500" />
                            Low-quality (faster)
                          </span>
                        </Select.ItemText>
                        <Select.ItemIndicator className="ml-auto">
                          <CheckIcon className="size-5 text-blue-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                      <Select.Item
                        value="high"
                        className="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                      >
                        <Select.ItemText asChild>
                          <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <LightbulbIcon className="size-3 text-yellow-500" />
                            High-quality (slower)
                          </span>
                        </Select.ItemText>
                        <Select.ItemIndicator className="ml-auto">
                          <CheckIcon className="size-5 text-blue-600" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    </Select.Viewport>
                    <Select.ScrollDownButton />
                    <Select.Arrow />
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            <div className="flex h-full items-center justify-between gap-3 sm:flex-col sm:items-start sm:justify-center sm:gap-2">
              <label className="text-gray-500 sm:text-sm" htmlFor="shadcn">
                shadcn/ui
              </label>
              <Switch.Root
                className="group flex w-20 max-w-xs items-center rounded-2xl border-[6px] border-gray-300 bg-white p-1.5 text-sm shadow-inner transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 data-[state=checked]:bg-blue-500"
                id="shadcn"
                name="shadcn"
                checked={shadcn}
                onCheckedChange={(value) => setShadcn(value)}
              >
                <Switch.Thumb className="size-7 rounded-lg bg-gray-200 shadow-[0_1px_2px] shadow-gray-400 transition data-[state=checked]:translate-x-7 data-[state=checked]:bg-white data-[state=checked]:shadow-gray-600" />
              </Switch.Root>
            </div>
          </div>
        </fieldset>
      </form>

      <hr className="border-1 mb-20 h-px bg-gray-700 dark:bg-gray-700" />

      {status !== "initial" && (
        <motion.div
          initial={{ height: 0 }}
          animate={{
            height: "auto",
            overflow: "hidden",
            transitionEnd: { overflow: "visible" },
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          className="w-full pb-[25vh] pt-10"
          onAnimationComplete={() => scrollTo()}
          ref={ref}
        >
          <div className="mt-5 flex gap-4">
            <form className="w-full" onSubmit={updateApp}>
              <fieldset disabled={loading} className="group">
                <div className="relative">
                  <div className="relative flex rounded-3xl bg-white shadow-sm group-disabled:bg-gray-50">
                    <div className="relative flex flex-grow items-stretch focus-within:z-10">
                      <input
                        required
                        name="modification"
                        value={modification}
                        onChange={(e) => setModification(e.target.value)}
                        className="w-full rounded-l-3xl bg-transparent px-6 py-5 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"
                        placeholder="Make changes to your app here"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-3xl px-3 py-2 text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900"
                    >
                      {loading ? (
                        <LoadingDots color="black" style="large" />
                      ) : (
                        <ArrowLongRightIcon className="-ml-0.5 size-6" />
                      )}
                    </button>
                  </div>
                </div>
              </fieldset>
            </form>
            <div>
              <Toaster invert={true} />
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      disabled={loading || isPublishing}
                      onClick={async () => {
                        setIsPublishing(true);
                        let userMessages = messages.filter(
                          (message) => message.role === "user",
                        );
                        let prompt =
                          userMessages[userMessages.length - 1].content;

                        const appId = await minDelay(
                          shareApp({
                            generatedCode,
                            prompt,
                            model: initialAppConfig.model,
                          }),
                          1000,
                        );
                        setIsPublishing(false);
                        toast.success(
                          `Your app has been published & copied to your clipboard! llamacoder.io/share/${appId}`,
                        );
                        navigator.clipboard.writeText(
                          `${domain}/share/${appId}`,
                        );
                      }}
                      className="inline-flex h-[68px] w-40 items-center justify-center gap-2 rounded-3xl bg-blue-500 transition enabled:hover:bg-blue-600 disabled:grayscale"
                    >
                      <span className="relative">
                        {isPublishing && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <LoadingDots color="white" style="large" />
                          </span>
                        )}

                        <ArrowUpOnSquareIcon
                          className={`${isPublishing ? "invisible" : ""} size-5 text-xl text-white`}
                        />
                      </span>

                      <p className="text-lg font-medium text-white">
                        Publish app
                      </p>
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="select-none rounded bg-white px-4 py-2.5 text-sm leading-none shadow-md shadow-black/20"
                      sideOffset={5}
                    >
                      Publish your app to the internet.
                      <Tooltip.Arrow className="fill-white" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          </div>
          <div className="relative mt-8 w-full overflow-hidden">
            <div className="isolate">
              <CodeViewer code={generatedCode} showEditor />
            </div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={status === "updating" ? { x: "100%" } : undefined}
                  animate={status === "updating" ? { x: "0%" } : undefined}
                  exit={{ x: "100%" }}
                  transition={{
                    type: "spring",
                    bounce: 0,
                    duration: 0.85,
                    delay: 0.5,
                  }}
                  className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center rounded-r border border-gray-400 bg-gradient-to-br from-gray-100 to-gray-300 md:inset-y-0 md:left-1/2 md:right-0"
                >
                  <p className="animate-pulse text-3xl font-bold">
                    {status === "creating"
                      ? "Building your app..."
                      : "Updating your app..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </main>
  );
}

async function minDelay<T>(promise: Promise<T>, ms: number) {
  let delay = new Promise((resolve) => setTimeout(resolve, ms));
  let [p] = await Promise.all([promise, delay]);

  return p;
}
