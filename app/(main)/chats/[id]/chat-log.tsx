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
  const hasMultipleFiles = allFiles.length > 1 || fileSegments.length > 1;

  // Diff current files against previous assistant message files to show only changed/new
  const previousFiles = previousMessage
    ? extractAllCodeBlocks(previousMessage.content)
    : [];
  const changedFiles = (() => {
    if (previousFiles.length === 0) return allFiles;
    const prevMap = new Map(previousFiles.map((f) => [f.path, f.code]));
    return allFiles.filter(
      (f) => !prevMap.has(f.path) || prevMap.get(f.path) !== f.code,
    );
  })();

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

  console.log("segments:", segments);

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

  const displayFileCount =
    changedFiles.length > 0 ? changedFiles.length : fileSegments.length;

  if (displayFileCount > 0) {
    // Handle single-file replies with interleaved text and one file
    return (
      <div>
        {segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <div key={i}>
                <Markdown className="prose break-words">{seg.content}</Markdown>
              </div>
            );
          }

          return <div key={i}>Editing {seg.path}</div>;
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
