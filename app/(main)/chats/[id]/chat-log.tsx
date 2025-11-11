"use client";

import type { Chat, Message } from "./page";
import {
  parseReplySegments,
  generateIntelligentFilename,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
  getExtensionForLanguage,
} from "@/lib/utils";
import { Fragment } from "react";
import Markdown from "react-markdown";
import { StickToBottom } from "use-stick-to-bottom";
import { AppVersionButton } from "@/components/app-version-button";

export default function ChatLog({
  chat,
  activeMessage,
  streamText,
  onMessageClick,
}: {
  chat: Chat;
  activeMessage?: Message;
  streamText: string;
  onMessageClick: (v: Message) => void;
}) {
  const assistantMessages = chat.messages.filter(
    (m) =>
      m.role === "assistant" &&
      (extractFirstCodeBlock(m.content) ||
        extractAllCodeBlocks(m.content).length > 0),
  );

  return (
    <StickToBottom
      className="relative grow overflow-hidden"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="mx-auto flex w-full max-w-prose flex-col gap-8 py-8 pl-4 pr-2">
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(to bottom, #F4F4F5 0%, rgba(244,244,245,0) 20px, rgba(244,244,245,0) calc(100% - 20px), #F4F4F5 100%)",
          }}
        />
        <UserMessage content={chat.prompt} />

        {chat.messages.slice(2).map((message) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : (
              <AssistantMessage
                content={message.content}
                version={
                  assistantMessages.map((m) => m.id).indexOf(message.id) + 1
                }
                message={message}
                previousMessage={(() => {
                  const idx = assistantMessages
                    .map((m) => m.id)
                    .indexOf(message.id);
                  return idx > 0 ? assistantMessages[idx - 1] : undefined;
                })()}
                isActive={!streamText && activeMessage?.id === message.id}
                onMessageClick={onMessageClick}
              />
            )}
          </Fragment>
        ))}

        {streamText && (
          <AssistantMessage
            content={streamText}
            version={assistantMessages.length + 1}
            isActive={true}
            previousMessage={assistantMessages.at(-1)}
          />
        )}
      </StickToBottom.Content>
    </StickToBottom>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="relative inline-flex max-w-[80%] items-end gap-3 self-end">
      <div className="whitespace-pre-wrap break-words rounded bg-white px-4 py-2 text-gray-600 shadow">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  version,
  message,
  isActive,
  onMessageClick = () => {},
  previousMessage,
}: {
  content: string;
  version: number;
  message?: Message;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
  previousMessage?: Message;
}) {
  const allFiles = extractAllCodeBlocks(content);
  const segments = parseReplySegments(content);
  const fileSegments = segments.filter((s) => s.type === "file");

  // Generate app title for multiple files
  const generateAppTitle = (files: typeof allFiles) => {
    // Look for App.tsx or main component
    const mainFile = files.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (mainFile) {
      // Try to extract app name from content
      const appMatch = mainFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }

    // Fallback: use the first file's name
    const firstFile = files[0];
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

  const appTitle = generateAppTitle(
    allFiles.length > 0
      ? allFiles
      : (fileSegments.map((f) => ({
          code: f.code,
          language: f.language,
          path: f.path,
          fullMatch: "",
        })) as any),
  );

  const displayFileCount = fileSegments.length;

  if (displayFileCount > 0) {
    // Handle single-file replies with interleaved text and one file
    return (
      <div className="">
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <div key={i}>
                <Markdown className="prose break-words">{seg.content}</Markdown>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="m-0.5 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-gray-600"
              >
                <path
                  d="M10.5 3.5L11.5 2.5L12.5 3.5L11.5 4.5L10.5 3.5ZM2.5 9.5V11.5H4.5L9.5 6.5L7.5 4.5L2.5 9.5ZM0.5 12.5H13.5V14.5H0.5V12.5Z"
                  fill="currentColor"
                />
              </svg>
              <span className="font-medium text-gray-700">{seg.path}</span>
            </div>
          );
        })}
        <AppVersionButton
          version={version}
          fileCount={displayFileCount}
          appTitle={appTitle}
          generating={false}
          disabled={!message}
          onClick={message ? () => onMessageClick(message) : undefined}
          isActive={isActive}
        />
      </div>
    );
  } else {
    // No code blocks, just show text
    return <Markdown className="prose break-words">{content}</Markdown>;
  }
}
