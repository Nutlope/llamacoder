import { useMemo } from "react";
import { extractAllCodeBlocks, calculateVersionInfo } from "@/lib/utils";
import type { Message } from "@/app/(main)/chats/[id]/page";

export function useMessageVersions(
  messages: Message[],
  activeMessage: Message | undefined,
  streamText: string,
) {
  return useMemo(() => {
    const versionInfo = calculateVersionInfo(
      messages,
      activeMessage,
      streamText,
    );

    const assistantMessages = messages.filter(
      (m) =>
        m.role === "assistant" && extractAllCodeBlocks(m.content).length > 0,
    );

    const getVersionForMessage = (messageId: string): number => {
      if (versionInfo.isStreaming && messageId === "streaming") {
        return versionInfo.currentVersion;
      }
      const index = assistantMessages.findIndex((m) => m.id === messageId);
      return index + 1;
    };

    const getAssistantMessages = (): Message[] => {
      return assistantMessages;
    };

    const getAllAssistantMessages = (currentMessage?: Message): Message[] => {
      return assistantMessages.some((m) => m.id === currentMessage?.id)
        ? assistantMessages
        : currentMessage
          ? [...assistantMessages, currentMessage]
          : assistantMessages;
    };

    return {
      ...versionInfo,
      getVersionForMessage,
      getAssistantMessages,
      getAllAssistantMessages,
    };
  }, [messages, activeMessage, streamText]);
}
