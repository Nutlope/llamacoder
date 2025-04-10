"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import TextareaAutosize from "@/components/textarea-autosize";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";

export default function ChatBox({
  chat,
  onNewStreamPromise,
  isStreaming,
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>) => void;
  isStreaming: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const disabled = isPending || isStreaming;
  const didFocusOnce = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");

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
    <div className="mx-auto mb-5 flex w-full max-w-prose shrink-0 px-8">
      <form
        className="relative flex w-full"
        action={async () => {
          startTransition(async () => {
            const message = await createMessage(chat.id, prompt, "user");
            const streamPromise = fetch(
              "/api/get-next-completion-stream-promise",
              {
                method: "POST",
                body: JSON.stringify({
                  messageId: message.id,
                  model: chat.model,
                }),
              },
            ).then((res) => {
              if (!res.body) {
                throw new Error("No body on response");
              }
              return res.body;
            });

            onNewStreamPromise(streamPromise);
            startTransition(() => {
              router.refresh();
              setPrompt("");
            });
          });
        }}
      >
        <fieldset className="w-full" disabled={disabled}>
          <div className="relative flex rounded-lg border-4 border-gray-300 bg-white">
            <TextareaAutosize
              ref={textareaRef}
              placeholder="Follow up"
              autoFocus={!disabled}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
              name="prompt"
              className="w-full bg-transparent p-2 placeholder-gray-500 focus:outline-none disabled:opacity-50"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.closest("form")?.requestSubmit();
                }
              }}
            />

            <div className="absolute bottom-1.5 right-1.5 flex has-[:disabled]:opacity-50">
              <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-700" />

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
