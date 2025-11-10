"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import { splitByFirstCodeFence, extractFirstCodeBlock } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, startTransition, use, useEffect, useRef, useState } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer from "./code-viewer";
import CodeViewerLayout from "./code-viewer-layout";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";

const HeaderChat = memo(({ chat }: { chat: Chat }) => (
  <div className="flex items-center gap-4 px-4 py-4">
    <a href="/" target="_blank">
      <LogoSmall />
    </a>
    <p className="italic text-gray-500">{chat.title}</p>
  </div>
));

HeaderChat.displayName = "HeaderChat";

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const searchParams = useSearchParams();
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [isShowingCodeViewer, setIsShowingCodeViewer] = useState(
    chat.messages.some((m) => m.role === "assistant"),
  );
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const router = useRouter();
  const isHandlingStreamRef = useRef(false);
  const [activeMessage, setActiveMessage] = useState(
    chat.messages
      .filter((m) => m.role === "assistant" && extractFirstCodeBlock(m.content))
      .at(-1),
  );

  useEffect(() => {
    async function f() {
      if (!streamPromise || isHandlingStreamRef.current) return;

      isHandlingStreamRef.current = true;
      context.setStreamPromise(undefined);

      const stream = await streamPromise;
      let didPushToCode = false;
      let didPushToPreview = false;

      ChatCompletionStream.fromReadableStream(stream)
        .on("content", (delta, content) => {
          setStreamText((text) => text + delta);

          if (
            !didPushToCode &&
            splitByFirstCodeFence(content).some(
              (part) => part.type === "first-code-fence-generating",
            )
          ) {
            didPushToCode = true;
            setIsShowingCodeViewer(true);
            setActiveTab("code");
          }

          if (
            !didPushToPreview &&
            splitByFirstCodeFence(content).some(
              (part) => part.type === "first-code-fence",
            )
          ) {
            didPushToPreview = true;
            setIsShowingCodeViewer(true);
          }
        })
        .on("finalContent", async (finalText) => {
          startTransition(async () => {
            const message = await createMessage(
              chat.id,
              finalText,
              "assistant",
            );

            startTransition(() => {
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              setActiveMessage(message);
              router.refresh();
            });
          });
        });
    }

    f();
  }, [chat.id, router, streamPromise, context]);

  return (
    <div className="h-dvh">
      <div className="flex h-full">
        <div
          className={`flex w-full shrink-0 flex-col overflow-hidden ${isShowingCodeViewer ? "lg:w-[30%]" : "lg:w-full"}`}
        >
          <HeaderChat chat={chat} />

          <ChatLog
            chat={chat}
            streamText={streamText}
            activeMessage={activeMessage}
            onMessageClick={(message) => {
              if (message !== activeMessage) {
                setActiveMessage(message);
                setIsShowingCodeViewer(true);
              } else {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }
            }}
          />

          <ChatBox
            chat={chat}
            onNewStreamPromise={setStreamPromise}
            isStreaming={!!streamPromise}
          />
        </div>

        <CodeViewerLayout
          isShowing={isShowingCodeViewer}
          onClose={() => {
            setActiveMessage(undefined);
            setIsShowingCodeViewer(false);
          }}
        >
          {isShowingCodeViewer && (
            <CodeViewer
              streamText={streamText}
              chat={chat}
              message={activeMessage}
              onMessageChange={setActiveMessage}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }}
              onRequestFix={(error: string) => {
                startTransition(async () => {
                  let newMessageText = `The code is not working. Can you fix it? Here's the error:\n\n`;
                  newMessageText += error.trimStart();
                  const message = await createMessage(
                    chat.id,
                    newMessageText,
                    "user",
                  );

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
                  setStreamPromise(streamPromise);
                  router.refresh();
                });
              }}
              onRestore={async (
                message: Message | undefined,
                oldVersion: number,
                newVersion: number,
              ) => {
                startTransition(async () => {
                  if (!message) return;
                  const app = extractFirstCodeBlock(message.content);
                  if (!app) return;
                  const newContent = `Version ${newVersion} was created by restoring version ${oldVersion}. Here's the code:\n\n\`\`\`${app.language}\n${app.code}\n\`\`\``;
                  const newMessage = await createMessage(
                    chat.id,
                    newContent,
                    "assistant",
                  );
                  setActiveMessage(newMessage);
                  router.refresh();
                });
              }}
            />
          )}
        </CodeViewerLayout>
      </div>
    </div>
  );
}
