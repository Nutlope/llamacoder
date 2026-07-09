import { getFilesFromMessage } from "./utils";

export const FIX_REQUEST_PREFIX =
  "The code is not working. Can you fix it? Here's the error:";

type AutoFixMessage = {
  id: string;
  role: string;
  content: string;
};

type AutoFixOptions<T extends AutoFixMessage> = {
  messages: T[];
  activeMessage?: T;
  streamText?: string;
  autoFixMessageIds: Set<string>;
};

export function shouldAllowAutoFix<T extends AutoFixMessage>({
  messages,
  activeMessage,
  streamText,
  autoFixMessageIds,
}: AutoFixOptions<T>) {
  if (streamText) return false;
  if (!activeMessage) return false;
  if (activeMessage.role !== "assistant") return false;

  const latest = latestAssistantFileMessage(messages, activeMessage);
  if (latest?.id !== activeMessage.id) return false;

  const prev = previousUserMessageFor(messages, activeMessage);
  if (!prev) return false;
  if (autoFixMessageIds.has(prev.id)) return false;
  if (prev.content.trimStart().startsWith(FIX_REQUEST_PREFIX)) return false;
  return true;
}

function latestAssistantFileMessage<T extends AutoFixMessage>(
  messages: T[],
  activeMessage: T,
) {
  const assistantMessages = messages.filter(hasAssistantFiles);
  if (
    hasAssistantFiles(activeMessage) &&
    !assistantMessages.some((message) => message.id === activeMessage.id)
  ) {
    assistantMessages.push(activeMessage);
  }
  return assistantMessages.at(-1);
}

function previousUserMessageFor<T extends AutoFixMessage>(
  messages: T[],
  message: T,
) {
  const idx = messages.findIndex((m) => m.id === message.id);
  const start = idx >= 0 ? idx - 1 : messages.length - 1;
  for (let i = start; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i];
  }
  return undefined;
}

function hasAssistantFiles(message: AutoFixMessage) {
  return message.role === "assistant" && getFilesFromMessage(message).length > 0;
}
