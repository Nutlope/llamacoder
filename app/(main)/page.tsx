"use client";

import bgImg from "@/public/halo.png";
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
import { startTransition, use, useState } from "react";
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
      <div className="absolute inset-x-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="w-full max-w-[1200px] mix-blend-screen"
          priority
        />
      </div>

      <div className="isolate flex h-full flex-col">
        <header className="shrink-0 py-5">
          <Image src={logo} alt="" className="mx-auto h-6 w-auto" priority />
        </header>

        <div className="mt-16 flex grow flex-col items-center px-4 lg:mt-24">
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
              startTransition(() => {
                setStreamPromise(streamPromise);
                router.push(`/chats/${chatId}`);
              });
            }}
          >
            <Fieldset>
              <div className="relative flex rounded-lg border-4 border-gray-300 bg-white pb-10">
                <TextareaAutosize
                  placeholder="Build me a budgeting app..."
                  required
                  name="prompt"
                  rows={1}
                  className="peer relative w-full resize-none bg-transparent p-2 placeholder-gray-500 focus:outline-none disabled:opacity-50"
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

        <footer className="mb-3 mt-5 flex h-16 w-full flex-col items-center justify-between space-y-3 px-3 pt-4 text-center sm:mb-0 sm:h-20 sm:flex-row sm:pt-2">
          <div>
            <div className="font-medium">
              Built with{" "}
              <a
                href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
                className="font-semibold text-blue-600 underline-offset-4 transition hover:text-gray-700 hover:underline"
              >
                Llama 3.1 405B
              </a>{" "}
              and{" "}
              <a
                href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
                className="font-semibold text-blue-600 underline-offset-4 transition hover:text-gray-700 hover:underline"
              >
                Together AI
              </a>
              .
            </div>
          </div>
          <div className="flex space-x-4 pb-4 sm:pb-0">
            <Link
              href="https://twitter.com/nutlope"
              className="group"
              aria-label=""
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6 fill-gray-500 group-hover:fill-gray-700"
              >
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0 0 22 5.92a8.19 8.19 0 0 1-2.357.646 4.118 4.118 0 0 0 1.804-2.27 8.224 8.224 0 0 1-2.605.996 4.107 4.107 0 0 0-6.993 3.743 11.65 11.65 0 0 1-8.457-4.287 4.106 4.106 0 0 0 1.27 5.477A4.073 4.073 0 0 1 2.8 9.713v.052a4.105 4.105 0 0 0 3.292 4.022 4.093 4.093 0 0 1-1.853.07 4.108 4.108 0 0 0 3.834 2.85A8.233 8.233 0 0 1 2 18.407a11.615 11.615 0 0 0 6.29 1.84" />
              </svg>
            </Link>
            <Link
              href="https://github.com/Nutlope/llamacoder"
              className="group"
              aria-label=""
            >
              <svg
                aria-hidden="true"
                className="h-6 w-6 fill-slate-500 group-hover:fill-slate-700"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}
