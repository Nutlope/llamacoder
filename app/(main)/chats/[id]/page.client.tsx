"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  getFilesFromMessage,
} from "@/lib/utils";
import { FIX_REQUEST_PREFIX, shouldAllowAutoFix } from "@/lib/chat-auto-fix";
import { createLocalChatTitle } from "@/lib/chat-title";
import { useRouter } from "next/navigation";
import {
  memo,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer from "./code-viewer";
import CodeViewerLayout from "./code-viewer-layout";
import type { Chat, Message } from "./page";
import { Context } from "../../providers";

const HeaderChat = memo(({ title }: { title: string }) => (
  <div className="flex items-center gap-4 px-4 py-4">
    <a href="/" target="_blank">
      <LogoSmall />
    </a>
    <p className="italic text-gray-500">{title}</p>
  </div>
));

HeaderChat.displayName = "HeaderChat";

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const [chatTitle, setChatTitle] = useState(chat.title);
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
  const isUpdatingTitleRef = useRef(false);
  const [activeMessage, setActiveMessage] = useState(
    chat.messages
      .filter((m) => m.role === "assistant" && extractFirstCodeBlock(m.content))
      .at(-1),
  );

  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [isFixPending, setIsFixPending] = useState(false);
  const autoFixMessageIdsRef = useRef<Set<string>>(new Set());

  const allowAutoFix = useMemo(() => {
    return shouldAllowAutoFix({
      messages: chat.messages,
      activeMessage,
      streamText,
      autoFixMessageIds: autoFixMessageIdsRef.current,
    });
  }, [chat, activeMessage, streamText]);

  useEffect(() => {
    if (isUpdatingTitleRef.current) return;
    if (chat.title !== createLocalChatTitle(chat.prompt)) return;

    isUpdatingTitleRef.current = true;
    const controller = new AbortController();

    fetch("/api/generate-chat-title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: chat.id }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : undefined))
      .then((data) => {
        if (typeof data?.title === "string") {
          setChatTitle(data.title);
        }
      })
      .catch(() => {
        isUpdatingTitleRef.current = false;
      });

    return () => controller.abort();
  }, [chat.id, chat.prompt, chat.title]);

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
            parseReplySegments(content).some((seg) => seg.type === "file")
          ) {
            didPushToCode = true;
            setIsShowingCodeViewer(true);
            setActiveTab("code");
          }

          if (
            !didPushToPreview &&
            parseReplySegments(content).some(
              (seg) => seg.type === "file" && !seg.isPartial,
            )
          ) {
            didPushToPreview = true;
            setIsShowingCodeViewer(true);
          }
        })
        .on("finalContent", async (finalText) => {
          startTransition(async () => {
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

            const message = await createMessage(
              chat.id,
              finalText, // Store original AI response content (only changed files)
              "assistant",
              allFiles, // Store cumulative files
            );

            startTransition(() => {
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              setActiveMessage(message);
              // When streaming finishes, switch to preview mode and keep the viewer open
              setIsShowingCodeViewer(true);
              setActiveTab("preview");
              router.refresh();
            });
          });
        });
    }

    f();
  }, [chat.id, router, streamPromise, context]);

  const submitFix = useCallback(
    async (error: string) => {
      if (isFixPending) return;

      setIsFixPending(true);
      const newMessageText = `${FIX_REQUEST_PREFIX}\n\n${error.trimStart()}`;
      const optimistic: Message = {
        id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: "user",
        content: newMessageText,
        createdAt: new Date(),
        updatedAt: new Date(),
        chatId: chat.id,
        position: Number.MAX_SAFE_INTEGER,
        files: null,
      } as Message;
      setOptimisticMessages((prev) => [...prev, optimistic]);

      startTransition(async () => {
        const message = await createMessage(chat.id, newMessageText, "user");
        autoFixMessageIdsRef.current.add(message.id);
        setOptimisticMessages((prev) =>
          prev.filter((m) => m.id !== optimistic.id),
        );

        const nextStreamPromise = fetch(
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

        setStreamPromise(nextStreamPromise);
        router.refresh();
      });
    },
    [chat, isFixPending, router],
  );

  useEffect(() => {
    if (!streamPromise) {
      setIsFixPending(false);
      setOptimisticMessages([]);
    }
  }, [streamPromise]);

  const chatForChatLog = useMemo<Chat>(() => {
    const existingUserContents = new Set(
      chat.messages.filter((m) => m.role === "user").map((m) => m.content),
    );
    const missingOptimistic = optimisticMessages.filter(
      (m) => !existingUserContents.has(m.content),
    );
    return {
      ...chat,
      messages: [...chat.messages, ...missingOptimistic],
    } as Chat;
  }, [chat, optimisticMessages]);

  return (
    <div className="h-dvh">
      <div className="flex h-full">
        <div
          className={`flex w-full shrink-0 flex-col overflow-hidden ${isShowingCodeViewer ? "lg:w-[30%]" : "lg:w-full"}`}
        >
          <HeaderChat title={chatTitle} />

          <ChatLog
            chat={chatForChatLog}
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
              onRequestFix={submitFix}
              isFixPending={isFixPending}
              allowAutoFix={allowAutoFix}
              onRestore={async (
                message: Message | undefined,
                oldVersion: number,
                newVersion: number,
              ) => {
                startTransition(async () => {
                  if (!message) return;

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

                  const newMessage = await createMessage(
                    chat.id,
                    newContent,
                    "assistant",
                    restoredFiles,
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
