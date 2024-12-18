"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import GithubIcon from "@/components/icons/github-icon";
import XIcon from "@/components/icons/x-icon";
import LoadingButton from "@/components/loading-button";
import logo from "@/public/logo.png";
import { Select } from "@headlessui/react";
import assert from "assert";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { createChat, getNextCompletionStreamPromise } from "./actions";
import { Context } from "./providers";

const MODELS = [
  {
    label: "Qwen 2.5 Coder 32B",
    value: "Qwen/Qwen2.5-Coder-32B-Instruct",
  },
  {
    label: "Llama 3.1 405B",
    value: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
  },
  {
    label: "Llama 3.3 70B",
    value: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
];

const SUGGESTED_PROMPTS = [
  "Daily quotes",
  "Calculator app",
  "Recipe finder",
  "Expense tracker",
  "Time zone dashboard",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const { setStreamPromise } = use(Context);
  const router = useRouter();

  return (
    <>
      <header className="py-5">
        <Image src={logo} alt="" className="mx-auto h-6 w-auto" priority />
      </header>

      <div className="mt-16 flex grow flex-col items-center px-4">
        <p className="w-auto rounded-full border border-gray-300 px-2 py-1.5 text-xs italic">
          Used by <strong>600k+</strong> happy users
        </p>

        <h1 className="mt-4 text-balance text-center text-4xl leading-none text-gray-700 md:text-[64px]">
          Turn your <span className="text-blue-500">idea</span>
          <br className="hidden md:block" /> into an{" "}
          <span className="text-blue-500">app</span>
        </h1>

        <form
          className="mt-6"
          action={async (formData) => {
            const { prompt, model, shadcn } = Object.fromEntries(formData);
            assert.ok(typeof prompt === "string");
            assert.ok(typeof model === "string");

            const { chatId, lastMessageId } = await createChat(
              prompt,
              model,
              !!shadcn,
            );
            const { streamPromise } = await getNextCompletionStreamPromise(
              lastMessageId,
              model,
            );
            setStreamPromise(streamPromise);

            router.push(`/chats/${chatId}`);
          }}
        >
          <Fieldset>
            <div className="relative flex rounded-lg border-4 border-gray-300 bg-white pb-10">
              <TextareaAutosize
                placeholder="Build me a budgeting app..."
                required
                name="prompt"
                rows={1}
                className="peer relative w-full resize-none bg-transparent p-2 placeholder-gray-500 focus:outline-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const target = event.target;
                    if (!(target instanceof HTMLTextAreaElement)) return;

                    target.closest("form")?.requestSubmit();
                  }
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded peer-focus:outline peer-focus:outline-offset-0 peer-focus:outline-blue-500" />

              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select
                    name="model"
                    className="rounded text-sm italic text-gray-400 focus:outline focus:outline-2 focus:outline-blue-300"
                  >
                    {MODELS.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </Select>

                  <label className="inline-flex items-center gap-1.5 text-sm italic text-gray-400">
                    shadcn/ui
                    <input
                      type="checkbox"
                      name="shadcn"
                      className="size-4 accent-blue-500 focus:outline focus:outline-2 focus:outline-blue-300"
                    />
                  </label>
                </div>

                <div className="relative flex has-[:disabled]:opacity-50">
                  <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-700" />
                  <LoadingButton
                    className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    type="submit"
                  >
                    <ArrowRightIcon />
                  </LoadingButton>
                </div>
              </div>
            </div>
            <div className="mt-4 flex w-full flex-wrap justify-center gap-3">
              {SUGGESTED_PROMPTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPrompt(v)}
                  className="rounded bg-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                >
                  {v}
                </button>
              ))}
            </div>
          </Fieldset>
        </form>
      </div>

      <footer className="flex flex-col gap-2 py-4 text-center text-xs text-gray-500">
        <div className="flex justify-center gap-2">
          <Link
            href="#"
            className="flex items-center gap-1 rounded border border-gray-300 p-1"
          >
            <XIcon className="size-2.5" /> Twitter
          </Link>
          <Link
            href="#"
            className="flex items-center gap-1 rounded border border-gray-300 p-1"
          >
            <GithubIcon className="size-2.5" /> GitHub
          </Link>
        </div>
        <p>Powered by Llama 3.1 & Together.ai</p>
      </footer>
    </>
  );
}
