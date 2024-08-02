"use client";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useScrollTo } from "@/hooks/use-scroll-to";
import { Sandpack } from "@codesandbox/sandpack-react";
import { dracula as draculaTheme } from "@codesandbox/sandpack-themes";
import { CheckIcon } from "@heroicons/react/16/solid";
import { ArrowRightIcon, ChevronDownIcon } from "@heroicons/react/20/solid";
import * as Select from "@radix-ui/react-select";
import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from "eventsource-parser";
import { animate, AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import LoadingDots from "../components/loading-dots";

export default function Home() {
  let [loading, setLoading] = useState(false);
  let [generatedCode, setGeneratedCode] = useState("");
  let [ref, scrollTo] = useScrollTo();

  async function generateCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let formData = new FormData(e.currentTarget);
    let prompt = formData.get("prompt");
    let model = formData.get("model");

    setGeneratedCode("");
    setLoading(true);
    const chatRes = await fetch("/api/generateCode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model,
      }),
    });
    console.log("Edge function returned.");
    if (!chatRes.ok) {
      throw new Error(chatRes.statusText);
    }

    // This data is a ReadableStream
    const data = chatRes.body;
    if (!data) {
      return;
    }
    const onParse = (event: ParsedEvent | ReconnectInterval) => {
      if (event.type === "event") {
        const data = event.data;
        try {
          const text = JSON.parse(data).text ?? "";
          setGeneratedCode((prev) => prev + text);
        } catch (e) {
          console.error(e);
        }
      }
    };

    // https://web.dev/streams/#the-getreader-and-read-methods
    const reader = data.getReader();
    const decoder = new TextDecoder();
    const parser = createParser(onParse);
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      parser.feed(chunkValue);
    }
    setLoading(false);
  }

  // let [bufferedGeneratedCode, setBufferedGeneratedCode] = useState("");
  // let [index, setIndex] = useState(0);
  // let charsPerUpdate = 4;

  // useEffect(() => {
  //   if (index < generatedCode.length) {
  //     const timeout = setTimeout(() => {
  //       setBufferedGeneratedCode(
  //         (prev) => prev + generatedCode.slice(index, index + charsPerUpdate),
  //       );
  //       setIndex((prev) => prev + charsPerUpdate);
  //     }, 1);

  //     return () => clearTimeout(timeout);
  //   }
  // }, [index, generatedCode]);

  // let previousEnd = useRef(0);
  useEffect(() => {
    let el = document.querySelector(".cm-scroller");
    if (el && loading) {
      // Not animated
      let end = el.scrollHeight - el.clientHeight;
      el.scrollTo({ top: end });

      // Animated
      // let start = el.scrollTop;
      // let end = el.scrollHeight - el.clientHeight;
      // let controls = animate(start, end, {
      //   onUpdate: (latest) => el.scrollTo({ top: latest }),
      // });

      // return () => {
      //   controls.cancel();
      // };
    }
  }, [generatedCode]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center py-2">
      <Header />

      <main className="mt-12 flex w-full flex-1 flex-col items-center px-4 text-center sm:mt-20">
        <a
          className="mb-4 inline-flex h-7 shrink-0 items-center gap-[9px] rounded-[50px] border-[0.5px] border-solid border-[#E6E6E6] bg-[rgba(234,238,255,0.65)] bg-white px-5 py-4 shadow-[0px_1px_1px_0px_rgba(0,0,0,0.25)]"
          href="https://dub.sh/together-ai"
          target="_blank"
        >
          <span className="text-center font-normal">
            Powered by <b>Llama 3.1</b> and <b>Together AI</b>
          </span>
        </a>
        <h1 className="my-6 max-w-3xl text-4xl font-bold text-gray-800 sm:text-6xl">
          Turn your <span className="text-blue-600">idea</span>
          <br /> into an <span className="text-blue-600">app</span>
        </h1>

        <form className="w-full max-w-xl" onSubmit={generateCode}>
          <fieldset disabled={loading} className="disabled:opacity-75">
            <div className="relative mt-5">
              <div className="absolute -inset-2 rounded-[32px] bg-gray-300/50" />
              <div className="relative flex rounded-3xl bg-white shadow-sm">
                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                  <input
                    name="prompt"
                    className="w-full rounded-l-3xl bg-transparent px-6 py-5 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                    defaultValue="Build a calculator app"
                    placeholder="Build me a calculator app..."
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
                    <ArrowRightIcon className="-ml-0.5 h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <p className="text-xs text-gray-500">Model:</p>
              <Select.Root
                name="model"
                defaultValue="meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo"
                disabled={loading}
              >
                <Select.Trigger className="group flex w-full max-w-xs items-center rounded-2xl border-[6px] border-gray-300 bg-white px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Select.Value />
                  <Select.Icon className="ml-auto">
                    <ChevronDownIcon className="size-6 text-gray-300 group-hover:text-gray-500 group-focus-visible:text-gray-500" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="overflow-hidden rounded-md bg-white shadow-lg">
                    <Select.Viewport className="p-2">
                      {[
                        {
                          label: "Llama 3.1 405B",
                          value:
                            "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
                        },
                        {
                          label: "Llama 3.1 70B",
                          value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
                        },
                        {
                          label: "Gemma 2 27B",
                          value: "google/gemma-2-27b-it",
                        },
                        // {
                        //   label: "Qwen 72B Instruct",
                        //   value: "Qwen/Qwen2-72B-Instruct",
                        // },
                      ].map((model) => (
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
          </fieldset>
        </form>

        <hr className="border-1 mb-20 h-px bg-gray-700 dark:bg-gray-700" />

        {generatedCode && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="w-full overflow-hidden pb-[25vh] pt-10"
            onAnimationComplete={scrollTo}
            ref={ref}
          >
            <div className="relative mt-8 w-full">
              <div className="isolate">
                <Sandpack
                  theme={draculaTheme}
                  options={{
                    showNavigator: true,
                    externalResources: [
                      "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
                    ],
                    editorHeight: "80vh",
                    wrapContent: true,
                  }}
                  files={{
                    "App.tsx": generatedCode,
                  }}
                  template="react-ts"
                />
              </div>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    exit={{ x: "100%" }}
                    transition={{
                      type: "spring",
                      bounce: 0,
                      duration: 0.85,
                      delay: 0.5,
                    }}
                    className="absolute inset-x-0 bottom-0 top-1/2 flex items-center justify-center rounded-r border border-gray-800 bg-gradient-to-br from-gray-100 to-gray-300 md:inset-y-0 md:left-1/2 md:right-0"
                  >
                    <p className="animate-pulse text-3xl font-bold">
                      Building your app...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
