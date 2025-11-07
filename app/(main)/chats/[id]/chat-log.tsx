"use client";

import type { Chat, Message } from "./page";
import {
  splitByFirstCodeFence,
  generateIntelligentFilename,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
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
}: {
  content: string;
  version: number;
  message?: Message;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
}) {
  const allFiles = extractAllCodeBlocks(content);
  const hasMultipleFiles = allFiles.length > 1;

  // For backward compatibility, also check for single file via splitByFirstCodeFence
  const parts = splitByFirstCodeFence(content);
  const hasSingleFile = parts.some((part) => part.type.includes("code-fence"));

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

  if (hasMultipleFiles) {
    // Show summary for multiple files
    const appTitle = generateAppTitle(allFiles);
    return (
      <div>
        <AppVersionButton
          version={version}
          fileCount={allFiles.length}
          appTitle={appTitle}
          generating={false}
          disabled={!message}
          onClick={message ? () => onMessageClick(message) : undefined}
          isActive={isActive}
        />
      </div>
    );
  } else if (hasSingleFile) {
    // Handle single file (existing logic)
    const enhancedParts = parts.map((part) => {
      if (
        part.type.includes("code-fence") &&
        (!part.filename.name || part.filename.name.trim() === "")
      ) {
        const intelligentFilename = generateIntelligentFilename(
          part.content,
          part.language,
        );
        return {
          ...part,
          filename: intelligentFilename,
        };
      }
      return part;
    });

    return (
      <div>
        {enhancedParts.map((part, i) => (
          <div key={i}>
            {part.type === "text" ? (
              <Markdown className="prose break-words">{part.content}</Markdown>
            ) : (
              <AppVersionButton
                version={version}
                filename={part.filename}
                generating={part.type === "first-code-fence-generating"}
                disabled={
                  !message || part.type === "first-code-fence-generating"
                }
                onClick={message ? () => onMessageClick(message) : undefined}
                isActive={isActive}
              />
            )}
          </div>
        ))}
      </div>
    );
  } else {
    // No code blocks, just show text
    return <Markdown className="prose break-words">{content}</Markdown>;
  }
}
