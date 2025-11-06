"use client";

import CloseIcon from "@/components/icons/close-icon";
import RefreshIcon from "@/components/icons/refresh";
import CopyIcon from "@/components/icons/copy-icon";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  extractFirstCodeBlock,
  splitByFirstCodeFence,
  generateIntelligentFilename,
} from "@/lib/utils";
import { useState, useEffect } from "react";
import type { Chat, Message } from "./page";
import { Share } from "./share";
import { StickToBottom } from "use-stick-to-bottom";
import dynamic from "next/dynamic";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});
const SyntaxHighlighter = dynamic(
  () => import("@/components/syntax-highlighter"),
  {
    ssr: false,
  },
);

export default function CodeViewer({
  chat,
  streamText,
  message,
  onMessageChange,
  activeTab,
  onTabChange,
  onClose,
  onRequestFix,
  onRestore,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  onMessageChange: (v: Message) => void;
  activeTab: string;
  onTabChange: (v: "code" | "preview") => void;
  onClose: () => void;
  onRequestFix: (e: string) => void;
  onRestore: (
    message: Message | undefined,
    oldVersion: number,
    newVersion: number,
  ) => void;
}) {
  const app = message ? extractFirstCodeBlock(message.content) : undefined;
  const streamAppParts = splitByFirstCodeFence(streamText);
  const streamApp = streamAppParts.find(
    (p) =>
      p.type === "first-code-fence-generating" || p.type === "first-code-fence",
  );
  const streamAppIsGenerating = streamAppParts.some(
    (p) => p.type === "first-code-fence-generating",
  );

  const code = streamApp ? streamApp.content : app?.code || "";
  const language = streamApp ? streamApp.language : app?.language || "";
  const rawFilename = streamApp
    ? streamApp.filename.name
    : app?.filename?.name || "";

  // Generate intelligent filename if none provided or if it's empty
  const title = rawFilename || generateIntelligentFilename(code, language).name;

  const assistantMessages = chat.messages.filter(
    (m) => m.role === "assistant" && extractFirstCodeBlock(m.content),
  );
  const allAssistantMessages = assistantMessages.some(
    (m) => m.id === message?.id,
  )
    ? assistantMessages
    : message
      ? [...assistantMessages, message]
      : assistantMessages;
  const currentVersion = streamApp
    ? allAssistantMessages.length - 1
    : message
      ? allAssistantMessages.map((m) => m.id).indexOf(message.id)
      : 1;

  const [refresh, setRefresh] = useState(0);
  const disabledControls = !!streamText || !code;

  const timeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);

      toast({
        title: "Code copied!",
        description: "Code copied to clipboard",
        variant: "default",
      });
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-300 px-4">
        <div className="inline-flex items-center gap-4">
          <span>{title}</span>
          <Select
            value={currentVersion.toString()}
            onValueChange={(value) =>
              onMessageChange(allAssistantMessages[parseInt(value)])
            }
            disabled={disabledControls}
          >
            <SelectTrigger className="h-[38px] w-16 text-sm font-semibold">
              <SelectValue>{`v${currentVersion + 1}`}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allAssistantMessages.map((msg, i) => (
                <SelectItem key={i} value={i.toString()}>
                  <div className="flex flex-col">
                    <span className="font-semibold">v{i + 1}</span>
                    <span className="text-xs text-gray-500">
                      {timeAgo(msg.createdAt)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentVersion < allAssistantMessages.length - 1 && message && (
            <button
              onClick={() =>
                onRestore(
                  message,
                  currentVersion + 1,
                  allAssistantMessages.length + 1,
                )
              }
              className="inline-flex h-[38px] items-center justify-center rounded bg-blue-500 px-2 text-xs font-medium text-white hover:bg-blue-600"
            >
              Restore
            </button>
          )}
        </div>
        <div className="rounded-lg border-2 border-gray-300 p-1">
          <button
            onClick={() => onTabChange("code")}
            data-active={activeTab === "code" ? true : undefined}
            className="inline-flex h-7 w-16 items-center justify-center rounded text-xs font-medium data-[active]:bg-blue-500 data-[active]:text-white"
          >
            Code
          </button>
          <button
            onClick={() => onTabChange("preview")}
            data-active={activeTab === "preview" ? true : undefined}
            className="inline-flex h-7 w-16 items-center justify-center rounded text-xs font-medium data-[active]:bg-blue-500 data-[active]:text-white"
          >
            Preview
          </button>
        </div>
      </div>

      <div className="flex grow flex-col overflow-y-auto bg-white">
        {activeTab === "code" ? (
          <StickToBottom
            className="relative grow overflow-hidden"
            resize="smooth"
            initial={streamAppIsGenerating ? "smooth" : false}
          >
            <StickToBottom.Content>
              <SyntaxHighlighter
                files={[{ name: "code", content: code, language }]}
              />
            </StickToBottom.Content>
          </StickToBottom>
        ) : (
          <>
            {language && (
              <div className="flex h-full items-center justify-center">
                <CodeRunner
                  onRequestFix={onRequestFix}
                  language={language}
                  code={code}
                  key={refresh}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-start border-t border-gray-300 px-4 py-4">
        <div className="inline-flex items-center gap-2.5 text-sm">
          <Share
            message={
              disabledControls
                ? undefined
                : message && !streamApp
                  ? message
                  : undefined
            }
          />
          <button
            className="inline-flex items-center gap-1 rounded border border-gray-300 px-1.5 py-0.5 text-sm text-gray-600 transition enabled:hover:bg-white disabled:opacity-50"
            onClick={() => setRefresh((r) => r + 1)}
            disabled={disabledControls}
          >
            <RefreshIcon className="size-3" />
            Refresh
          </button>
          <button
            className="hidden items-center gap-1 rounded border border-gray-300 px-1.5 py-0.5 text-sm text-gray-600 transition hover:bg-white disabled:opacity-50 md:inline-flex"
            onClick={handleCopyCode}
            disabled={disabledControls}
            title="Copy code"
          >
            <CopyIcon className="size-3" />
            Copy
          </button>
        </div>
      </div>
    </>
  );
}
