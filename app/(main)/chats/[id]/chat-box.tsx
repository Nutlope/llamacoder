"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import { useEffect, useRef, useState, useTransition } from "react";
import { type Chat, type Message } from "./page";
import { MODELS } from "@/lib/constants";

export default function ChatBox({
  chat,
  onNewStreamPromise,
  isStreaming,
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>, updatedMessages: Message[]) => void;
  isStreaming: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || isStreaming;
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const textareaResizePrompt = prompt
    .split("\n")
    .map((text) => (text === "" ? "a" : text))
    .join("\n");

  const modelLabel =
    MODELS.find((m) => m.value === chat.model)?.label || chat.model;

  useEffect(() => {
    if (!textareaRef.current) return;

    if (!disabled && !didFocusOnce.current) {
      textareaRef.current.focus();
      didFocusOnce.current = true;
    } else {
      didFocusOnce.current = false;
    }
  }, [disabled]);

  return (
    <div className="mx-auto mb-5 flex w-full max-w-prose shrink-0 px-4">
      <form
        className="relative flex w-full"
        action={async () => {
          startTransition(async () => {
            const newUserMessage: Message = {
              id: crypto.randomUUID(),
              role: "user",
              content: prompt,
              position: chat.messages.length,
              createdAt: new Date().toISOString(),
            };

            const updatedMessages = [...chat.messages, newUserMessage];

            const streamPromise = fetch(
              "/api/get-next-completion-stream-promise",
              {
                method: "POST",
                body: JSON.stringify({
                  messages: updatedMessages,
                  model: chat.model,
                }),
              },
            ).then(async (res) => {
              if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to start stream");
              }
              if (!res.body) {
                throw new Error("No body on response");
              }
              return res.body;
            });

            onNewStreamPromise(streamPromise, updatedMessages);
            setPrompt("");
          });
        }}
      >
        <fieldset className="w-full" disabled={disabled}>
          <div className="relative flex flex-col rounded-lg border border-gray-300 bg-white">
            <div className="relative w-full">
              <div className="w-full p-2.5">
                <p className="invisible min-h-[48px] w-full whitespace-pre-wrap">
                  {textareaResizePrompt}
                </p>
              </div>
              <textarea
                ref={textareaRef}
                placeholder="Ask a follow up..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
                name="prompt"
                className="peer absolute inset-0 w-full resize-none bg-transparent p-2.5 placeholder-gray-500 focus:outline-none disabled:opacity-50"
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

            <div className="flex w-full justify-between p-1.5 pl-2.5 has-[:disabled]:opacity-50">
              <div
                className="max-w-[200px] items-center truncate font-mono text-xs text-gray-500"
                title={chat.model}
              >
                {modelLabel}
              </div>

              <button
                className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 hover:bg-blue-500/75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                type="submit"
              >
                <Spinner loading={disabled}>
                  <ArrowRightIcon />
                </Spinner>
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
