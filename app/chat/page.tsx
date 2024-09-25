"use client";

import CodeViewer from "@/components/code-viewer";
import Header from "@/components/chat/Header";
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
import LoadingDots from "../../components/loading-dots";
// import { shareApp } from "./actions";
import Image from "next/image";
import SheetSide from "@/components/chat/LeftSide";

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
      label: "Llama 3.1 70B",
      value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    },
    {
      label: "Gemma 2 27B",
      value: "google/gemma-2-27b-it",
    },
  ];
  let [model, setModel] = useState(models[0].value);
  let [shadcn, setShadcn] = useState(false);
  let [modification, setModification] = useState("");
  let [generatedCode, setGeneratedCode] = useState("");
  let [initialAppConfig, setInitialAppConfig] = useState({
    model: "",
    shadcn: false,
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

    for await (let chunk of readStream(res.body)) {
      setGeneratedCode((prev) => prev + chunk);
    }

    setMessages([{ role: "user", content: prompt }]);
    setInitialAppConfig({ model, shadcn });
    setStatus("created");
  }

  return (
    <>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-between py-2 px-4">
        <Header />
        <div className="flex flex-col">
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo.svg" alt="chat" width={20} height={20} />
            <h3 className="text-midnight-100 text-xl">Hello Youssef</h3>
          </div>
          <h4 className="text-center text-2xl text-midnight">
            What app can I build you today?
          </h4>
        </div>
        <form className="w-full max-w-xl" onSubmit={createApp}>
          <fieldset disabled={loading} className="disabled:opacity-75">
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-5">
              {[
                "Daily quotes",
                "Calculator app",
                "Recipe finder",
                "Expense tracker",
                "Time zone dashboard",
              ].map((item, index) => (
                <button
                  type="button"
                  onClick={() => setPrompt(item)}
                  key={index}
                  className="bg-light-frost flex items-center justify-center gap-2.5 rounded px-2.5 py-1.5"
                >
                  <p className="text-xs text-midnight">{item}</p>
                </button>
              ))}
            </div>

            <div className="relative mt-3">
              <div className="absolute -inset-1 rounded-1.5 bg-gray-300/50" />
              <div className="relative flex flex-col rounded-1.5 bg-white shadow-input">
                <div className="relative flex flex-grow items-stretch focus-within:z-10">
                  <input
                    required
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    name="prompt"
                    className="w-full rounded-t-1.5 bg-transparent px-2.5 py-2 text-sm font-normal text-midnight placeholder:text-midnight/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                    placeholder="Build me a calculator app..."
                  />
                </div>
                <div className="flex items-center justify-between p-1.5 pl-2.5">
                  <div className="">
                    <Select.Root
                      name="model"
                      disabled={loading}
                      value={model}
                      onValueChange={(value) => setModel(value)}
                    >
                      <Select.Trigger className="group flex w-24 max-w-xs items-center bg-white text-xs italic text-midnight/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                        <Select.Value />
                        <Select.Icon className="ml-auto">
                          <ChevronDownIcon className="size-4 text-gray-300 group-focus-visible:text-gray-500 group-enabled:group-hover:text-gray-500" />
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
                                    {/* <div className="size-2 rounded-full bg-green-500" /> */}
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
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="relative -ml-px flex h-6 w-6 items-center justify-center gap-x-1.5 rounded border border-cloud-gray bg-white text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900"
                    >
                      <Image
                        src="/image-plus.svg"
                        width={8}
                        height={8}
                        className="-ml-0.5 h-4 w-4"
                        alt="right-arrow"
                      />
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="relative -ml-px flex h-6 w-6 items-center justify-center gap-x-1.5 rounded bg-primary-blue text-sm font-semibold text-blue-500 hover:text-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:text-gray-900"
                    >
                      {status === "creating" ? (
                        <LoadingDots color="black" style="large" />
                      ) : (
                        <Image
                          src="/right-arrow.svg"
                          width={8}
                          height={8}
                          className="-ml-0.5 h-4 w-4"
                          alt="right-arrow"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
      <div className="absolute bottom-5 left-5 top-6 hidden sm:flex flex-col justify-between ">
        <SheetSide>
          <Image src="/logo.svg" alt="together-logo" width={20} height={20} className="h-5 w-5 cursor-pointer" />
        </SheetSide>
        <SheetSide>
          <Image src="/user.png" alt="together-logo" width={24} height={24} className="h-6 w-6 cursor-pointer" />
        </SheetSide>
      </div>
    </>
  );
}

async function* readStream(response: ReadableStream) {
  let reader = response.pipeThrough(new TextDecoderStream()).getReader();
  let done = false;

  while (!done) {
    let { value, done: streamDone } = await reader.read();
    done = streamDone;

    if (value) yield value;
  }

  reader.releaseLock();
}
