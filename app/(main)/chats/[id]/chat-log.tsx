"use client";

import type { Chat, Message } from "./page";
import {
  splitByFirstCodeFence,
  generateIntelligentFilename,
  extractFirstCodeBlock,
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
    (m) => m.role === "assistant" && extractFirstCodeBlock(m.content),
  );

  return (
    <StickToBottom
      className="relative grow overflow-hidden"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="mx-auto flex w-full max-w-prose flex-col gap-8 px-6 py-8">
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
      <div className="overflow-hidden whitespace-pre-wrap rounded bg-white px-4 py-2 text-gray-600 shadow">
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
  const parts = splitByFirstCodeFence(content);

  // Generate better filenames for display
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
            <Markdown className="prose">{part.content}</Markdown>
          ) : (
            <AppVersionButton
              version={version}
              filename={part.filename}
              generating={part.type === "first-code-fence-generating"}
              disabled={!message || part.type === "first-code-fence-generating"}
              onClick={message ? () => onMessageClick(message) : undefined}
              isActive={isActive}
            />
          )}
        </div>
      ))}
    </div>
  );
}
