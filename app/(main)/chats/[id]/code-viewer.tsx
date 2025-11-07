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
import { extractAllCodeBlocks, generateIntelligentFilename } from "@/lib/utils";
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
  const allFiles = message ? extractAllCodeBlocks(message.content) : [];
  const streamAllFiles = extractAllCodeBlocks(streamText);

  const files = streamAllFiles.length > 0 ? streamAllFiles : allFiles;
  const isGenerating =
    streamText.includes("```") && !streamText.includes("\n```");

  // Find the main App.tsx file or the first tsx file
  const mainFile =
    files.find((f) => f.path === "App.tsx") ||
    files.find((f) => f.path.endsWith(".tsx")) ||
    files[0];

  console.log("CodeViewer: processing files", {
    messageFiles: allFiles.length,
    streamFiles: streamAllFiles.length,
    finalFiles: files.length,
    isStreaming: streamText.length > 0,
    mainFile: mainFile?.path,
  });
  const code = mainFile ? mainFile.code : "";
  const language = mainFile ? mainFile.language : "";
  const rawFilename = mainFile ? mainFile.path : "";

  // Generate intelligent filename if none provided or if it's empty
  const title = rawFilename || generateIntelligentFilename(code, language).name;

  const assistantMessages = chat.messages.filter(
    (m) => m.role === "assistant" && extractAllCodeBlocks(m.content).length > 0,
  );
  const allAssistantMessages = assistantMessages.some(
    (m) => m.id === message?.id,
  )
    ? assistantMessages
    : message
      ? [...assistantMessages, message]
      : assistantMessages;
  const currentVersion =
    streamAllFiles.length > 0
      ? allAssistantMessages.length - 1
      : message
        ? allAssistantMessages.map((m) => m.id).indexOf(message.id)
        : 1;

  const [refresh, setRefresh] = useState(0);
  const disabledControls = !!streamText || files.length === 0;

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
    if (!mainFile) return;
    try {
      await navigator.clipboard.writeText(mainFile.code);

      toast({
        title: "Code copied!",
        description: `${mainFile.path} copied to clipboard`,
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
          <button
            className="text-gray-400 hover:text-gray-700"
            onClick={onClose}
          >
            <CloseIcon className="size-5" />
          </button>
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
            className="relative grow overflow-hidden *:!h-[inherit]"
            resize="smooth"
            initial={isGenerating ? "smooth" : false}
          >
            <StickToBottom.Content>
              <SyntaxHighlighter
                files={files.map((f) => ({
                  path: f.path,
                  content: f.code,
                  language: f.language,
                }))}
              />
            </StickToBottom.Content>
          </StickToBottom>
        ) : (
          <>
            {files.length > 0 && (
              <div className="flex h-full items-center justify-center">
                <CodeRunner
                  onRequestFix={onRequestFix}
                  language={language}
                  files={files.map((f) => ({ path: f.path, content: f.code }))}
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
                : message && streamAllFiles.length === 0
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
