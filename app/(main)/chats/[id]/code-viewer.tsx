"use client";

import CloseIcon from "@/components/icons/close-icon";
import RefreshIcon from "@/components/icons/refresh";
import { DownloadIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  extractAllCodeBlocks,
  generateIntelligentFilename,
  toTitleCase,
} from "@/lib/utils";
import { useState, useEffect } from "react";
import type { Chat, Message } from "./page";
import { Share } from "./share";
import { StickToBottom } from "use-stick-to-bottom";
import JSZip from "jszip";
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

  // Helper: extract the latest (possibly partial) code fence from the stream text
  function extractLatestStreamBlock(
    input: string,
  ): { code: string; language: string; path: string } | undefined {
    if (!input) return undefined;
    const lines = input.split("\n");
    const codeFenceRegex = /^```([^\n]*)$/;

    let openTag: string | null = null;
    let codeBuffer: string[] = [];
    let latestComplete:
      | { code: string; language: string; path: string }
      | undefined;

    const parseTag = (tag: string) => {
      const raw = tag || "";
      const langMatch = raw.match(/^([A-Za-z0-9]+)/);
      const language = langMatch ? langMatch[1] : "text";
      const pathMatch = raw.match(/\{\s*path\s*=\s*([^}]+)\s*\}/);
      const path = pathMatch
        ? pathMatch[1]
        : `file.${language === "typescript" || language === "tsx" ? "tsx" : language}`;
      return { language, path };
    };

    for (const line of lines) {
      const match = line.match(codeFenceRegex);
      if (match && !openTag) {
        // Opening a fence
        openTag = match[1] || "";
        codeBuffer = [];
      } else if (match && openTag) {
        // Closing the fence
        const { language, path } = parseTag(openTag);
        latestComplete = { code: codeBuffer.join("\n"), language, path };
        openTag = null;
        codeBuffer = [];
      } else if (openTag) {
        codeBuffer.push(line);
      }
    }

    // If an open fence remains at end, return it as partial; else return latest complete
    if (openTag) {
      const { language, path } = parseTag(openTag);
      return { code: codeBuffer.join("\n"), language, path };
    }
    return latestComplete;
  }

  const latestStreamBlock = extractLatestStreamBlock(streamText);

  // Merge stream files with latest partial if necessary
  let mergedStreamFiles = [...streamAllFiles];
  if (latestStreamBlock) {
    const existingIdx = mergedStreamFiles.findIndex(
      (f) => f.path === latestStreamBlock.path,
    );
    if (existingIdx !== -1) {
      mergedStreamFiles[existingIdx] = {
        code: latestStreamBlock.code,
        language: latestStreamBlock.language,
        path: latestStreamBlock.path,
        fullMatch: "",
      };
    } else {
      mergedStreamFiles.push({
        code: latestStreamBlock.code,
        language: latestStreamBlock.language,
        path: latestStreamBlock.path,
        fullMatch: "",
      });
    }
  }

  // Utility to merge base files with overlay files (overlay wins on conflicts)
  function mergeFiles(
    base: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
    overlay: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
  ) {
    const map = new Map<
      string,
      { code: string; language: string; path: string; fullMatch: string }
    >();
    base.forEach((f) => map.set(f.path, f));
    overlay.forEach((f) => map.set(f.path, f));
    return Array.from(map.values());
  }

  // Determine base files from previous assistant message
  const assistantMessages = chat.messages.filter(
    (m) => m.role === "assistant" && extractAllCodeBlocks(m.content).length > 0,
  );
  const lastAssistant = assistantMessages.at(-1);
  const previousFiles = lastAssistant
    ? extractAllCodeBlocks(lastAssistant.content)
    : [];

  // Effective files:
  // - While streaming: previous files overlaid with streamed/current partials
  // - After streaming: previous version files overlaid with current message files
  const files = streamText
    ? mergeFiles(previousFiles, mergedStreamFiles)
    : message
      ? mergeFiles(
          // previous of current message
          (() => {
            const idx = assistantMessages.map((m) => m.id).indexOf(message.id);
            const prevMsg = idx > 0 ? assistantMessages[idx - 1] : undefined;
            return prevMsg ? extractAllCodeBlocks(prevMsg.content) : [];
          })(),
          allFiles,
        )
      : allFiles;
  const isGenerating =
    streamText.includes("```") && !streamText.includes("\n```");

  // Prefer the latest streamed file while streaming; otherwise, App.tsx or first tsx
  const mainFile =
    latestStreamBlock && streamText
      ? files.find((f) => f.path === latestStreamBlock.path) || files.at(-1)
      : files.find((f) => f.path === "App.tsx") ||
        files.find((f) => f.path.endsWith(".tsx")) ||
        files[0];
  const code = mainFile ? mainFile.code : "";
  const language = mainFile ? mainFile.language : "";
  const rawFilename = mainFile ? mainFile.path : "";

  // Generate app title for display
  const generateAppTitle = (fileList: typeof files) => {
    if (fileList.length === 1) {
      return generateIntelligentFilename(fileList[0].code, fileList[0].language)
        .name;
    }

    // For multiple files, look for App.tsx or main component
    const appFile = fileList.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (appFile) {
      const appMatch = appFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }

    // Fallback: use the first file's name
    const firstFile = fileList[0];
    if (firstFile) {
      const name =
        firstFile.path
          .split("/")
          .pop()
          ?.replace(/\.\w+$/, "") || "App";
      return toTitleCase(name.replace(/(App|Component)$/, ""));
    }

    return "App";
  };

  const appTitle = generateAppTitle(files);

  // Generate intelligent filename if none provided or if it's empty
  const title = rawFilename || generateIntelligentFilename(code, language).name;

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

  // Helper to get the main file for a message
  const getMainFileForMessage = (message: Message) => {
    const messageFiles = extractAllCodeBlocks(message.content);
    return (
      messageFiles.find((f) => f.path === "App.tsx") ||
      messageFiles.find((f) => f.path.endsWith(".tsx")) ||
      messageFiles[0]
    );
  };

  const handleDownloadFiles = async () => {
    if (files.length === 0) return;

    const zip = new JSZip();

    // Add each file to the zip
    files.forEach((file) => {
      zip.file(file.path, file.code);
    });

    // Generate the zip file
    const content = await zip.generateAsync({ type: "blob" });

    // Generate app title for filename
    const appTitle = generateAppTitle(files);
    const filename = `${appTitle.replace(/[^a-zA-Z0-9]/g, "-")}-llamacoder.zip`;

    // Create a download link and trigger the download
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Files downloaded!",
      description: `${files.length} files downloaded as ${filename}`,
      variant: "default",
    });
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
          <span>{appTitle}</span>
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
            disabled={disabledControls}
            className="inline-flex h-7 w-16 items-center justify-center rounded text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-blue-500 data-[active]:text-white"
          >
            Code
          </button>
          <button
            onClick={() => onTabChange("preview")}
            data-active={activeTab === "preview" ? true : undefined}
            disabled={disabledControls}
            className="inline-flex h-7 w-16 items-center justify-center rounded text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-blue-500 data-[active]:text-white"
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
            initial={false}
          >
            <StickToBottom.Content>
              <SyntaxHighlighter
                files={files.map((f) => ({
                  path: f.path,
                  content: f.code,
                  language: f.language,
                }))}
                activePath={
                  streamText
                    ? latestStreamBlock?.path || files.at(-1)?.path
                    : undefined
                }
                disableSelection={!!streamText}
                isStreaming={!!streamText}
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
            onClick={handleDownloadFiles}
            disabled={disabledControls}
            title="Download files"
          >
            <DownloadIcon className="size-3" />
            Download
          </button>
        </div>
      </div>
    </>
  );
}
