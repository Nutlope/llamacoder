"use client";

import { createMessage, getNextCompletionStreamPromise } from "../../actions";
import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import assert from "assert";
import { useRouter } from "next/navigation";
import TextareaAutosize from "react-textarea-autosize";
import { type Chat } from "./page";
import { useTransition } from "react";

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

  return (
    <div className="mx-auto mb-8 flex w-full max-w-prose shrink-0 px-8">
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
          <div className="relative flex rounded-lg border-4 border-gray-300 bg-white pb-8">
            <TextareaAutosize
              placeholder="Follow up"
              required
              name="prompt"
              rows={1}
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

            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-end">
              <div className="relative flex has-[:disabled]:opacity-50">
                <div className="pointer-events-none absolute inset-0 -bottom-[1px] rounded bg-blue-700" />

                <button
                  className="relative inline-flex size-6 items-center justify-center rounded bg-blue-500 font-medium text-white shadow-lg outline-blue-300 focus:outline focus:outline-2 focus:outline-offset-2"
                  type="submit"
                >
                  <Spinner loading={disabled}>
                    <ArrowRightIcon />
                  </Spinner>
                </button>
              </div>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
