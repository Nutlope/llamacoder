import { getFilesFromMessage, stripThinkingBlocks } from "./utils";

export const FIX_REQUEST_PREFIX =
  "The code is not working. Can you fix it? Here's the error:";

// GLM (chat LCGsL-FlYg-1bRB-) sometimes emits a multi-file app as bare
// fences with no {path=...} anywhere. The files land at fallback names that
// can't satisfy each other's imports, and the bundler reports a misleading
// `Cannot resolve "@/lib/data"` — which sends the model chasing a code bug
// it doesn't have (it re-sent byte-identical code twice in that chat). When
// the previewed response has this shape, describe the actual problem instead
// of forwarding the symptom.
export function describePathlessFenceProblem(content: string): string | null {
  const stripped = stripThinkingBlocks(content);
  if (stripped.includes("{path=")) return null;

  let fences = 0;
  for (const line of stripped.split("\n")) {
    if (line.startsWith("```")) fences += 1;
  }
  if (Math.floor(fences / 2) < 2) return null;

  return [
    "Your previous response emitted multiple code fences without a {path=...} attribute, so the files could not be placed at their correct paths and their imports cannot resolve.",
    "Re-send the COMPLETE app — every file with its full contents — and open every fence with the language and path, exactly like:",
    "```tsx{path=src/App.tsx}",
  ].join("\n");
}

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
