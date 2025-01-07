"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import LoadingButton from "@/components/loading-button";
import Spinner from "@/components/spinner";
import { Switch } from "@/components/ui/switch";
import bgImg from "@/public/halo.png";
import * as Select from "@radix-ui/react-select";
import assert from "assert";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, use, useState } from "react";
import { useFormStatus } from "react-dom";
import TextareaAutosize from "react-textarea-autosize";
import { createChat, getNextCompletionStreamPromise } from "./actions";
import { Context } from "./providers";
import Header from "@/components/header";

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
  {
    label: "DeepSeek V3",
    value: "deepseek-ai/DeepSeek-V3",
  },
];

const SUGGESTED_PROMPTS = [
  {
    title: "Quiz app",
    description:
      "Make me a quiz app about American history. Make sure to give the user an explanation on each question whether they got it right or wrong and keep a score going",
  },
  {
    title: "SaaS Landing page",
    description:
      "A landing page for a SaaS business that includes a clear value proposition in a prominent hero section, concise feature overviews, testimonials, pricing, and a clear call-to-action button leading to a free trial or demo.",
  },
  {
    title: "Pomodoro Timer",
    description:
      "Make a beautiful pomodoro timer where I can adjust the lengths of the focus time and the break and it will beep when done.",
  },
  {
    title: "Recipe site",
    description:
      "Make me a site that has easy to make recipes in a grid that you can click into and see the full recipe. Also make it possible for me to add my own",
  },
  {
    title: "Flashcard app",
    description:
      "Build me a flashcard app about llamas. Have some flash cards and also have the ability for users to add their own. Show one side of a card at first and reveal the answer on button click, keeping track of correct guesses to measure progress.",
  },
  {
    title: "Timezone dashboard",
    description:
      "Make me a time zone dashboard that shows me the time zone in the top 6 most popular time zones and gives me a dropdown to add others",
  },
];

export default function Home() {
  const { setStreamPromise } = use(Context);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [quality, setQuality] = useState("high");

  const selectedModel = MODELS.find((m) => m.value === model);

  return (
    <div className="relative flex grow flex-col">
      <div className="absolute inset-0 flex justify-center">
        <Image
          src={bgImg}
          alt=""
          className="max-h-[953px] w-full max-w-[1200px] object-cover object-top mix-blend-screen"
          priority
        />
      </div>

      <div className="isolate flex h-full grow flex-col">
        <Header />

        <div className="mt-10 flex grow flex-col items-center px-4 lg:mt-16">
          <a
            className="mb-4 inline-flex shrink-0 items-center rounded-full border-[0.5px] bg-white px-7 py-2 text-xs text-gray-800 shadow-[0px_1px_1px_0px_rgba(0,0,0,0.25)] md:text-base"
            href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
            target="_blank"
          >
            <span className="text-center">
              Powered by <span className="font-semibold">Together AI</span>.
              Used by
              <span className="font-semibold"> 600k+ users. </span>
            </span>
          </a>

          <h1 className="mt-4 text-balance text-center text-4xl leading-none text-gray-700 md:text-[64px] lg:mt-8">
            Turn your <span className="text-blue-500">idea</span>
            <br className="hidden md:block" /> into an{" "}
            <span className="text-blue-500">app</span>
          </h1>

          <form
            className="relative pt-6 lg:pt-12"
            action={async (formData) => {
              const { prompt, model, quality, shadcn } =
                Object.fromEntries(formData);

              assert.ok(typeof prompt === "string");
              assert.ok(typeof model === "string");
              assert.ok(quality === "high" || quality === "low");

              const { chatId, lastMessageId } = await createChat(
                prompt,
                model,
                quality,
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
              <div className="relative flex rounded-xl border-4 border-gray-300 bg-white pb-10">
                <TextareaAutosize
                  placeholder="Build me a budgeting app..."
                  required
                  name="prompt"
                  rows={1}
                  className="peer relative w-full resize-none bg-transparent p-3 placeholder-gray-500 focus-visible:outline-none disabled:opacity-50"
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

                <div className="pointer-events-none absolute inset-0 rounded-lg peer-focus:outline peer-focus:outline-2 peer-focus:outline-offset-0 peer-focus:outline-blue-500" />

                <div className="absolute bottom-2 left-2 right-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Select.Root
                      name="model"
                      value={model}
                      onValueChange={setModel}
                    >
                      <Select.Trigger className="inline-flex items-center gap-1 rounded-md p-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">
                        <Select.Value aria-label={model}>
                          <span>{selectedModel?.label}</span>
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDownIcon className="size-3" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md bg-white shadow ring-1 ring-black/5">
                          <Select.Viewport className="space-y-1 p-2">
                            {MODELS.map((m) => (
                              <Select.Item
                                key={m.value}
                                value={m.value}
                                className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                              >
                                <Select.ItemText className="inline-flex items-center gap-2 text-gray-500">
                                  {m.label}
                                </Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon className="size-3 text-blue-600" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                          <Select.ScrollDownButton />
                          <Select.Arrow />
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    <div className="h-4 w-px bg-gray-200 max-sm:hidden" />

                    <label className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <span className="sm:hidden">shad</span>
                      <span className="max-sm:hidden">
                        shadcn<span className="font-medium">/</span>ui
                      </span>
                      <Switch className="mt-0.5" name="shadcn">
                        shadcn/ui
                      </Switch>
                    </label>

                    <div className="h-4 w-px bg-gray-200 max-sm:hidden" />

                    <Select.Root
                      name="quality"
                      value={quality}
                      onValueChange={setQuality}
                    >
                      <Select.Trigger className="inline-flex items-center gap-1 rounded p-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300">
                        <Select.Value aria-label={quality}>
                          <span className="max-sm:hidden">
                            {quality === "low"
                              ? "Low quality [faster]"
                              : "High quality [slower]"}
                          </span>
                          <span className="sm:hidden">
                            <LightningBoltIcon className="size-3" />
                          </span>
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDownIcon className="size-3" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md bg-white shadow ring-1 ring-black/5">
                          <Select.Viewport className="space-y-1 p-2">
                            {[
                              { value: "low", label: "Low quality [faster]" },
                              { value: "high", label: "High quality [slower]" },
                            ].map((q) => (
                              <Select.Item
                                key={q.value}
                                value={q.value}
                                className="flex cursor-pointer items-center gap-1 rounded-md p-1 text-sm data-[highlighted]:bg-gray-100 data-[highlighted]:outline-none"
                              >
                                <Select.ItemText className="inline-flex items-center gap-2 text-gray-500">
                                  {q.label}
                                </Select.ItemText>
                                <Select.ItemIndicator>
                                  <CheckIcon className="size-3 text-blue-600" />
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

                  <div className="relative flex shrink-0 has-[:disabled]:opacity-50">
                    <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-700" />
                    <LoadingButton
                      className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      type="submit"
                    >
                      <ArrowRightIcon />
                    </LoadingButton>
                  </div>
                </div>

                <LoadingMessage />
              </div>
              <div className="mt-4 flex w-full flex-wrap justify-center gap-3">
                {SUGGESTED_PROMPTS.map((v) => (
                  <button
                    key={v.title}
                    type="button"
                    onClick={() => setPrompt(v.description)}
                    className="rounded bg-gray-200 px-2.5 py-1.5 text-xs hover:bg-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </Fieldset>
          </form>
        </div>

        <footer className="flex w-full flex-col items-center justify-between space-y-3 px-3 pb-3 pt-5 text-center sm:flex-row sm:pt-2">
          <div>
            <div className="font-medium">
              Built with{" "}
              <a
                href="https://dub.sh/together-ai/?utm_source=example-app&utm_medium=llamacoder&utm_campaign=llamacoder-app-signup"
                className="font-semibold text-blue-600 underline-offset-4 transition hover:text-gray-700 hover:underline"
              >
                Llama 3.1
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
    </div>
  );
}

function LoadingMessage() {
  const { pending, data } = useFormStatus();

  if (!pending || !data || !(data instanceof FormData)) {
    return null;
  }

  let isHighQuality = data.get("quality") === "high";

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white px-1 py-3 md:px-3">
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
        <span className="animate-pulse text-balance text-center text-sm md:text-base">
          {isHighQuality
            ? `Coming up with project plan, may take 15 seconds...`
            : `Creating your app...`}
        </span>

        <Spinner />
      </div>
    </div>
  );
}

export const maxDuration = 45;
