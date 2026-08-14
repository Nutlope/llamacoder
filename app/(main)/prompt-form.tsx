"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import UploadIcon from "@/components/icons/upload-icon";
import LoadingButton from "@/components/loading-button";
import ScreenshotAttachment from "@/components/screenshot-attachment";
import Spinner from "@/components/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadImage } from "@/lib/client-image-upload";
import { MODELS, SUGGESTED_PROMPTS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Context } from "./providers";

export default function PromptForm() {
  const { setStreamPromise } = use(Context);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    MODELS.find((candidate) => !candidate.hidden)?.value || MODELS[0].value,
  );
  const [screenshotToken, setScreenshotToken] = useState<string>();
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string>();
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const screenshotUploadIdRef = useRef(0);
  const screenshotUploadAbortRef = useRef<AbortController | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const selectedModel = useMemo(
    () => MODELS.find((candidate) => candidate.value === model),
    [model],
  );

  const handleScreenshotUpload = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    screenshotUploadAbortRef.current?.abort();
    const uploadId = ++screenshotUploadIdRef.current;
    const abortController = new AbortController();
    screenshotUploadAbortRef.current = abortController;

    if (prompt.length === 0) setPrompt("Build this");
    setScreenshotLoading(true);
    setScreenshotError(undefined);
    setScreenshotToken(undefined);
    setScreenshotPreviewUrl(URL.createObjectURL(file));

    try {
      const { token } = await uploadImage(file, abortController.signal);
      if (uploadId === screenshotUploadIdRef.current) {
        setScreenshotToken(token);
      }
    } catch (error) {
      if (
        abortController.signal.aborted ||
        uploadId !== screenshotUploadIdRef.current
      ) {
        return;
      }
      setScreenshotPreviewUrl(undefined);
      setScreenshotError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      if (uploadId === screenshotUploadIdRef.current) {
        setScreenshotLoading(false);
        screenshotUploadAbortRef.current = null;
      }
    }
  };

  const clearScreenshot = () => {
    screenshotUploadIdRef.current += 1;
    screenshotUploadAbortRef.current?.abort();
    screenshotUploadAbortRef.current = null;
    setScreenshotLoading(false);
    setScreenshotToken(undefined);
    setScreenshotPreviewUrl(undefined);
    setScreenshotError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    return () => screenshotUploadAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      if (screenshotPreviewUrl) URL.revokeObjectURL(screenshotPreviewUrl);
    };
  }, [screenshotPreviewUrl]);

  const textareaResizePrompt = useMemo(
    () =>
      prompt
        .split("\n")
        .map((text) => (text === "" ? "a" : text))
        .join("\n"),
    [prompt],
  );

  return (
    <form
      className="relative w-full max-w-2xl pt-6 lg:pt-12"
      action={async (formData) => {
        startTransition(async () => {
          const promptValue = formData.get("prompt");
          const modelValue = formData.get("model");

          if (
            typeof promptValue !== "string" ||
            typeof modelValue !== "string"
          ) {
            throw new Error("Prompt and model are required");
          }

          const response = await fetch("/api/create-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: promptValue,
              model: modelValue,
              screenshotToken,
            }),
          });

          if (!response.ok) throw new Error("Failed to create chat");

          const { chatId, lastMessageId } = await response.json();
          const streamPromise = fetch(
            "/api/get-next-completion-stream-promise",
            {
              method: "POST",
              body: JSON.stringify({
                messageId: lastMessageId,
                model: modelValue,
              }),
            },
          ).then((streamResponse) => {
            if (!streamResponse.ok) {
              throw new Error(
                `Generation request failed (${streamResponse.status})`,
              );
            }
            if (!streamResponse.body) throw new Error("No body on response");
            return streamResponse.body;
          });

          startTransition(() => {
            setStreamPromise(streamPromise);
            router.push(`/chats/${chatId}`);
          });
        });
      }}
    >
      <Fieldset>
        <div
          className={`relative flex w-full max-w-2xl rounded-xl border border-gray-300 bg-white pb-10 transition-[height] ${isPending ? "h-28 overflow-hidden" : ""}`}
        >
          <div className="w-full">
            <ScreenshotAttachment
              hidden={isPending}
              loading={screenshotLoading}
              onRemove={clearScreenshot}
              previewUrl={screenshotPreviewUrl}
            />
            {screenshotError && (
              <p className="mx-3 mt-2 text-xs text-red-600">
                {screenshotError}
              </p>
            )}
            <div className="relative max-h-48 overflow-hidden">
              <div className="p-3">
                <p className="invisible max-h-48 w-full overflow-hidden whitespace-pre-wrap">
                  {textareaResizePrompt}
                </p>
              </div>
              <textarea
                ref={textareaRef}
                placeholder="Build me a budgeting app..."
                required
                name="prompt"
                rows={2}
                className="peer absolute bottom-1 left-0 right-1 top-1 resize-none overflow-y-auto bg-transparent px-4 py-2 placeholder-gray-500 focus-visible:outline-none disabled:opacity-50"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onPaste={(event) => {
                  event.preventDefault();
                  const pastedText = event.clipboardData.getData("text");
                  const cleanedText = pastedText
                    .replace(/\r\n/g, "\n")
                    .replace(/\r/g, "\n")
                    .replace(/\n{3,}/g, "\n\n")
                    .trim();
                  const textarea = event.target as HTMLTextAreaElement;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  setPrompt(
                    prompt.slice(0, start) + cleanedText + prompt.slice(end),
                  );
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.selectionStart =
                        start + cleanedText.length;
                      textareaRef.current.selectionEnd =
                        start + cleanedText.length;
                    }
                  }, 0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    const target = event.target;
                    if (!(target instanceof HTMLTextAreaElement)) return;
                    target.closest("form")?.requestSubmit();
                  }
                }}
              />
            </div>
          </div>

          <div className="absolute bottom-2 left-3 right-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select
                name="model"
                value={model}
                onValueChange={(value) => {
                  if (value !== null) setModel(value);
                }}
              >
                <SelectTrigger
                  aria-label="Choose a model"
                  className="h-7 w-fit border-0 px-1 py-1 text-sm text-gray-600 shadow-none ring-0 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
                >
                  <SelectValue>{selectedModel?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent className="space-y-1 bg-white p-2">
                  {MODELS.filter((candidate) => !candidate.hidden).map(
                    (candidate) => (
                      <SelectItem
                        key={candidate.value}
                        value={candidate.value}
                        className="gap-2 text-gray-600"
                      >
                        <span>{candidate.label}</span>
                        {candidate.note && (
                          <span className="text-xs text-gray-600">
                            {candidate.note}
                          </span>
                        )}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              <div className="h-4 w-px bg-gray-200 max-sm:hidden" />
              <div>
                <label
                  htmlFor="screenshot"
                  className="flex cursor-pointer gap-2 text-sm text-gray-600 hover:underline"
                >
                  <span className="flex size-6 items-center justify-center rounded bg-black hover:bg-gray-700">
                    <UploadIcon className="size-4" />
                  </span>
                  <span className="flex items-center justify-center transition-colors hover:text-gray-800">
                    Attach
                  </span>
                </label>
                <input
                  id="screenshot"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleScreenshotUpload}
                  disabled={screenshotLoading}
                  className="hidden"
                  ref={fileInputRef}
                />
              </div>
            </div>

            <div className="relative flex shrink-0 has-[:disabled]:opacity-50">
              <div className="pointer-events-none absolute inset-0 -bottom-px rounded bg-blue-500" />
              <LoadingButton
                aria-label="Create app"
                className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-90"
                type="submit"
                disabled={screenshotLoading || prompt.length === 0}
              >
                <ArrowRightIcon />
              </LoadingButton>
            </div>
          </div>

          {isPending && (
            <LoadingMessage hasScreenshot={Boolean(screenshotToken)} />
          )}
        </div>

        <div className="mt-4 flex w-full flex-wrap justify-between gap-2.5">
          {SUGGESTED_PROMPTS.map((suggestion) => (
            <button
              key={suggestion.title}
              type="button"
              onClick={() => {
                setPrompt(suggestion.description);
                setTimeout(() => {
                  textareaRef.current?.focus();
                  if (textareaRef.current) {
                    textareaRef.current.selectionStart =
                      textareaRef.current.value.length;
                    textareaRef.current.selectionEnd =
                      textareaRef.current.value.length;
                  }
                }, 0);
              }}
              className="rounded bg-[#E5E9EF] px-2.5 py-1.5 text-xs tracking-[0%] transition-colors hover:bg-[#cccfd5]"
            >
              {suggestion.title}
            </button>
          ))}
        </div>
      </Fieldset>
    </form>
  );
}

function LoadingMessage({ hasScreenshot }: { hasScreenshot: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white px-1 py-3 md:px-3">
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
        <span className="animate-pulse text-balance text-center text-sm md:text-base">
          {hasScreenshot
            ? "Analyzing your screenshot..."
            : "Creating your app..."}
        </span>
        <Spinner />
      </div>
    </div>
  );
}
