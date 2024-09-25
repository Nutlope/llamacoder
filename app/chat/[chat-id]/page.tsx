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
import LoadingDots from "@/components/loading-dots";
// import { shareApp } from "./actions";
import Image from "next/image";
import SheetSide from "@/components/chat/LeftSide";
import FileCard from "@/components/chat/FileCard";
import PromptResponse from "@/components/chat/PromptResponse";
import { cn } from "@/lib/utils";
import {
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react/unstyled";
import { Sandpack } from "@codesandbox/sandpack-react";
import { ecoLight as ecoLightTheme } from "@codesandbox/sandpack-themes";
import dedent from "dedent";
import "@/components/code-viewer.css";
import { shadcnComponents } from "@/utils/shadcn";
import { code } from "@/constant/code-example";

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
  const [isFileViewOpen, setIsFileViewOpen] = useState(false);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
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
    <div className="flex w-full flex-col md:flex-row">
      <div
        className={cn(
          "order-2 flex h-screen w-full flex-col items-center justify-between px-4 py-2 pt-10 transition-[margin,max-width] duration-300 md:order-1 md:pt-20",
          isFileViewOpen ? "mx-0 md:max-w-[50%]" : "mx-auto max-w-7xl",
        )}
      >
        <div className="flex h-fit w-full max-w-xl flex-1 flex-col items-start gap-14 pb-5">
          <PromptResponse setIsFileViewOpen={setIsFileViewOpen} />
        </div>
        <form className="mb-2 w-full max-w-xl md:mb-4" onSubmit={createApp}>
          <fieldset disabled={loading} className="disabled:opacity-75">
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
      <div className="absolute bottom-5 left-5 top-6 h-fit w-full flex-col justify-between sm:flex md:h-auto md:w-auto">
        <SheetSide>
          <div className="flex w-full items-center justify-between gap-5 md:w-fit md:justify-start">
            <Image
              src="/logo.svg"
              alt="together-logo"
              width={20}
              height={20}
              className="hidden h-5 w-5 cursor-pointer md:inline"
            />
            {/* menu icon for mobile devices */}
            <Image
              src="/menu.svg"
              alt="menu"
              width={24}
              height={24}
              className="h-6 w-6 cursor-pointer md:hidden"
            />
            <p className="text-sm font-bold italic text-midnight-100 md:font-normal">
              Calculator App
            </p>
            <div className="min-w-[50px] md:hidden"></div>
          </div>
        </SheetSide>
        <SheetSide>
          <Image
            src="/user.png"
            alt="together-logo"
            width={24}
            height={24}
            className="hidden h-6 w-6 cursor-pointer md:inline"
          />
        </SheetSide>
      </div>
      {/* file view container */}
      <div
        className={cn(
          "border-black-300 shadow-container order-1 mt-16 h-0 w-[0%] overflow-hidden rounded-xl border-[0.3px] opacity-0 transition-all duration-300 md:order-2 md:my-5 md:h-auto md:rounded-l-xl md:opacity-100 flex flex-col",
          isFileViewOpen && "mx-auto h-full w-[95%] opacity-100 md:w-[50%]",
        )}
      >
        {/* head part */}
        <div className="border-black-300 flex w-full items-center justify-between border-b-[0.3px] bg-off-white px-4 py-3 max-h-14">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFileViewOpen(false)}>
              {" "}
              <Image
                src="/cross.svg"
                alt="cancel"
                width={20}
                height={20}
                className="h-5 w-5"
              />
            </button>
            <p className="text-sm font-normal italic text-midnight-100">
              Calculator v2
            </p>
          </div>
          <div className="grid w-fit grid-cols-2 gap-1 rounded bg-white p-1 shadow-input">
            <button
              onClick={() => setIsFilePreviewOpen(false)}
              className={cn(
                "shadow-btnSM w-16 rounded bg-primary-blue px-3 py-2 text-xs text-white",
                isFilePreviewOpen &&
                  "bg-transparent text-center text-xs text-midnight shadow-none",
              )}
            >
              Code
            </button>
            <button
              onClick={() => setIsFilePreviewOpen(true)}
              className={cn(
                "shadow-btnSM w-16 rounded bg-primary-blue px-3 py-2 text-xs text-white",
                !isFilePreviewOpen &&
                  "bg-transparent text-center text-xs text-midnight shadow-none",
              )}
            >
              Preview
            </button>
          </div>
        </div>
        {/* code content */}
        <div className="w-full flex-1">
          {isFilePreviewOpen ? (
            <SandpackProvider
              files={{
                "App.tsx": code,
                ...sharedFiles,
              }}
              className="flex h-auto w-full grow flex-col justify-center"
              options={{ ...sharedOptions }}
              {...sharedProps}
            >
              <SandpackPreview
                className="flex h-auto w-full grow flex-col justify-center p-4 md:pt-16"
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                
              />
            </SandpackProvider>
          ) : (
            <Sandpack
              options={{
                editorHeight: "80vh",
                layout: "console",
                showTabs: false,
                ...sharedOptions,
              }}
              files={{
                "App.tsx": code,
                ...sharedFiles,
              }}
              {...sharedProps}
              theme="light"
            />
          )}
        </div>
        {/* bottom part */}
        <div className="border-black-300 flex w-full items-center justify-between border-t-[0.3px] bg-off-white px-4 py-3 max-h-14">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 rounded border-[0.7px] border-gray-100 bg-white px-2 py-1 text-xs text-midnight-100">
              <Image
                src="/share.svg"
                alt="share"
                width={12}
                height={12}
                className="h-3 w-3"
              />
              <span>Share</span>
            </button>
            <button className="flex items-center gap-1 rounded border-[0.7px] border-gray-100 px-2 py-1 text-xs text-midnight-100">
              <Image
                src="/refresh.svg"
                alt="refresh"
                width={12}
                height={12}
                className="h-3 w-3"
              />
              <span>Refresh</span>
            </button>
            <button className="flex items-center gap-1 rounded border-[0.7px] border-gray-100 px-2 py-1 text-xs text-midnight-100">
              <Image
                src="/copy.svg"
                alt="copy"
                width={12}
                height={12}
                className="h-3 w-3"
              />
              <span>Copy</span>
            </button>
          </div>
          <div className="flex w-fit items-center gap-2">
            <button className="rotate-180 opacity-50">
              <Image
                src="/forward.svg"
                alt="forward"
                width={14}
                height={14}
                className="h-4 w-4"
              />
            </button>
            <p className="text-xs">
              Version 1 <span className="font-[300]">of</span> 3
            </p>
            <button className="">
              <Image
                src="/forward.svg"
                alt="forward"
                width={14}
                height={14}
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
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

let sharedProps = {
  template: "react-ts",
  theme: ecoLightTheme,
  customSetup: {
    dependencies: {
      "lucide-react": "latest",
      recharts: "2.9.0",
      "react-router-dom": "latest",
      "@radix-ui/react-accordion": "^1.2.0",
      "@radix-ui/react-alert-dialog": "^1.1.1",
      "@radix-ui/react-aspect-ratio": "^1.1.0",
      "@radix-ui/react-avatar": "^1.1.0",
      "@radix-ui/react-checkbox": "^1.1.1",
      "@radix-ui/react-collapsible": "^1.1.0",
      "@radix-ui/react-dialog": "^1.1.1",
      "@radix-ui/react-dropdown-menu": "^2.1.1",
      "@radix-ui/react-hover-card": "^1.1.1",
      "@radix-ui/react-label": "^2.1.0",
      "@radix-ui/react-menubar": "^1.1.1",
      "@radix-ui/react-navigation-menu": "^1.2.0",
      "@radix-ui/react-popover": "^1.1.1",
      "@radix-ui/react-progress": "^1.1.0",
      "@radix-ui/react-radio-group": "^1.2.0",
      "@radix-ui/react-select": "^2.1.1",
      "@radix-ui/react-separator": "^1.1.0",
      "@radix-ui/react-slider": "^1.2.0",
      "@radix-ui/react-slot": "^1.1.0",
      "@radix-ui/react-switch": "^1.1.0",
      "@radix-ui/react-tabs": "^1.1.0",
      "@radix-ui/react-toast": "^1.2.1",
      "@radix-ui/react-toggle": "^1.1.0",
      "@radix-ui/react-toggle-group": "^1.1.0",
      "@radix-ui/react-tooltip": "^1.1.2",
      "class-variance-authority": "^0.7.0",
      clsx: "^2.1.1",
      "date-fns": "^3.6.0",
      "embla-carousel-react": "^8.1.8",
      "react-day-picker": "^8.10.1",
      "tailwind-merge": "^2.4.0",
      "tailwindcss-animate": "^1.0.7",
      vaul: "^0.9.1",
    },
  },
} as const;

let sharedOptions = {
  externalResources: [
    "https://unpkg.com/@tailwindcss/ui/dist/tailwind-ui.min.css",
  ],
};

let sharedFiles = {
  "/lib/utils.ts": shadcnComponents.utils,
  "/components/ui/accordion.tsx": shadcnComponents.accordian,
  "/components/ui/alert-dialog.tsx": shadcnComponents.alertDialog,
  "/components/ui/alert.tsx": shadcnComponents.alert,
  "/components/ui/avatar.tsx": shadcnComponents.avatar,
  "/components/ui/badge.tsx": shadcnComponents.badge,
  "/components/ui/breadcrumb.tsx": shadcnComponents.breadcrumb,
  "/components/ui/button.tsx": shadcnComponents.button,
  "/components/ui/calendar.tsx": shadcnComponents.calendar,
  "/components/ui/card.tsx": shadcnComponents.card,
  "/components/ui/carousel.tsx": shadcnComponents.carousel,
  "/components/ui/checkbox.tsx": shadcnComponents.checkbox,
  "/components/ui/collapsible.tsx": shadcnComponents.collapsible,
  "/components/ui/dialog.tsx": shadcnComponents.dialog,
  "/components/ui/drawer.tsx": shadcnComponents.drawer,
  "/components/ui/dropdown-menu.tsx": shadcnComponents.dropdownMenu,
  "/components/ui/input.tsx": shadcnComponents.input,
  "/components/ui/label.tsx": shadcnComponents.label,
  "/components/ui/menubar.tsx": shadcnComponents.menuBar,
  "/components/ui/navigation-menu.tsx": shadcnComponents.navigationMenu,
  "/components/ui/pagination.tsx": shadcnComponents.pagination,
  "/components/ui/popover.tsx": shadcnComponents.popover,
  "/components/ui/progress.tsx": shadcnComponents.progress,
  "/components/ui/radio-group.tsx": shadcnComponents.radioGroup,
  "/components/ui/select.tsx": shadcnComponents.select,
  "/components/ui/separator.tsx": shadcnComponents.separator,
  "/components/ui/skeleton.tsx": shadcnComponents.skeleton,
  "/components/ui/slider.tsx": shadcnComponents.slider,
  "/components/ui/switch.tsx": shadcnComponents.switchComponent,
  "/components/ui/table.tsx": shadcnComponents.table,
  "/components/ui/tabs.tsx": shadcnComponents.tabs,
  "/components/ui/textarea.tsx": shadcnComponents.textarea,
  "/components/ui/toast.tsx": shadcnComponents.toast,
  "/components/ui/toaster.tsx": shadcnComponents.toaster,
  "/components/ui/toggle-group.tsx": shadcnComponents.toggleGroup,
  "/components/ui/toggle.tsx": shadcnComponents.toggle,
  "/components/ui/tooltip.tsx": shadcnComponents.tooltip,
  "/components/ui/use-toast.tsx": shadcnComponents.useToast,
  "/public/index.html": dedent`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `,
};
