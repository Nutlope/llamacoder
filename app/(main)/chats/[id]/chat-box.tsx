"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import assert from "assert";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { createMessage, getNextCompletionStreamPromise } from "../../actions";
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
        action={async (formData) => {
          startTransition(async () => {
            const prompt = formData.get("prompt");
            assert.ok(typeof prompt === "string");

            const message = await createMessage(chat.id, prompt, "user");
            const { streamPromise } = await getNextCompletionStreamPromise(
              message.id,
              chat.model,
            );
            onNewStreamPromise(streamPromise);

            router.refresh();
          });
        }}
      >
        <fieldset className="w-full" disabled={disabled}>
          <div className="relative flex rounded-lg border-4 border-gray-300 bg-white">
            <TextareaAutosize
              ref={textareaRef}
              placeholder="Follow up"
              autoFocus={!disabled}
              required
              name="prompt"
              rows={2}
              minRows={2}
              className="peer relative w-full resize-none bg-transparent p-2 placeholder-gray-500 focus:outline-none disabled:opacity-50"
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
