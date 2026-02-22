"use client";

import LogoSmall from "@/components/icons/logo-small";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  saveChat,
} from "@/lib/utils";
import { memo, startTransition, use, useEffect, useRef, useState } from "react";
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

export default function PageClient({ chat: initialChat }: { chat: Chat }) {
  const context = use(Context);
  const [chat, setChat] = useState<Chat>(initialChat);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [isShowingCodeViewer, setIsShowingCodeViewer] = useState(
    chat.messages.some((m) => m.role === "assistant"),
  );
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
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

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let partialLine = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = (partialLine + chunk).split("\n");
          partialLine = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") break;
              try {
                const json = JSON.parse(data);
                const delta = json.choices[0].delta.content;
                if (delta) {
                  fullContent += delta;
                  setStreamText(fullContent);

                  if (
                    !didPushToCode &&
                    parseReplySegments(fullContent).some((seg) => seg.type === "file")
                  ) {
                    didPushToCode = true;
                    setIsShowingCodeViewer(true);
                    setActiveTab("code");
                  }

                  if (
                    !didPushToPreview &&
                    parseReplySegments(fullContent).some(
                      (seg) => seg.type === "file" && !seg.isPartial,
                    )
                  ) {
                    didPushToPreview = true;
                    setIsShowingCodeViewer(true);
                  }
                }
              } catch (e) {
                // Ignore incomplete JSON chunks
              }
            }
          }
        }
      } finally {
        const finalText = fullContent;
        // Get all previous assistant messages with files
        const previousAssistantMessages = chat.messages.filter(
          (m) =>
            m.role === "assistant" &&
            extractAllCodeBlocks(m.content).length > 0,
        );

        // Extract all files from previous messages
        const previousFiles = previousAssistantMessages.flatMap((msg) =>
          extractAllCodeBlocks(msg.content),
        );

        // Extract files from current AI response
        const currentFiles = extractAllCodeBlocks(finalText);

        // Merge files (current overrides previous for same paths)
        const fileMap = new Map();
        previousFiles.forEach((file) => fileMap.set(file.path, file));
        currentFiles.forEach((file) => fileMap.set(file.path, file));
        const allFiles = Array.from(fileMap.values());

        const newMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: finalText,
          files: allFiles,
          position: chat.messages.length,
          createdAt: new Date().toISOString(),
        };

        const updatedChat = {
          ...chat,
          messages: [...chat.messages, newMessage],
        };

        // Save to local storage
        saveChat(updatedChat);

        startTransition(() => {
          setChat(updatedChat);
          isHandlingStreamRef.current = false;
          setStreamText("");
          setStreamPromise(undefined);
          setActiveMessage(newMessage);
          setIsShowingCodeViewer(true);
          setActiveTab("preview");
        });
      }
    }

    f();
  }, [chat, streamPromise, context]);

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
            onNewStreamPromise={(promise, updatedMessages) => {
              const updatedChat = { ...chat, messages: updatedMessages };
              setChat(updatedChat);
              setStreamPromise(promise);

              // Save the user message to local storage immediately
              saveChat(updatedChat);
            }}
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

                  const newUserMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "user",
                    content: newMessageText,
                    position: chat.messages.length,
                    createdAt: new Date().toISOString(),
                  };

                  const updatedChat = {
                    ...chat,
                    messages: [...chat.messages, newUserMessage],
                  };

                  // Save to local storage
                  saveChat(updatedChat);
                  setChat(updatedChat);

                  const promise = fetch(
                    "/api/get-next-completion-stream-promise",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        messages: updatedChat.messages,
                        model: chat.model,
                      }),
                    },
                  ).then((res) => {
                    if (!res.body) {
                      throw new Error("No body on response");
                    }
                    return res.body;
                  });
                  setStreamPromise(promise);
                });
              }}
              onRestore={async (
                message: Message | undefined,
                oldVersion: number,
                newVersion: number,
              ) => {
                startTransition(async () => {
                  if (!message) return;

                  const getFilesFromMessage = (msg: Message) => {
                    return (
                      (msg.files as any[]) || extractAllCodeBlocks(msg.content)
                    );
                  };

                  const restoredFiles = getFilesFromMessage(message);
                  if (restoredFiles.length === 0) return;

                  const explanation = `Version ${newVersion} was created by restoring version ${oldVersion}.`;
                  const newContent =
                    explanation +
                    "\n\n" +
                    restoredFiles
                      .map(
                        (file) =>
                          `\`\`\`${file.language}{path=${file.path}}\n${file.code}\n\`\`\``,
                      )
                      .join("\n\n");

                  const newMessage: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: newContent,
                    files: restoredFiles,
                    position: chat.messages.length,
                    createdAt: new Date().toISOString(),
                  };

                  const updatedChat = {
                    ...chat,
                    messages: [...chat.messages, newMessage],
                  };

                  // Save to local storage
                  saveChat(updatedChat);

                  setChat(updatedChat);
                  setActiveMessage(newMessage);
                });
              }}
            />
          )}
        </CodeViewerLayout>
      </div>
    </div>
  );
}
