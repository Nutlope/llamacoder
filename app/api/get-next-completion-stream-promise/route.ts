import { z } from "zod";
import Together from "together-ai";
import { FALLBACK_MODEL, resolveModel } from "@/lib/constants";
import {
  GENERATION_DEADLINE_MS,
  superviseCompletionStream,
} from "@/lib/completion-stream-lifecycle";
import {
  flushBraintrustSpan,
  logBraintrustFailure,
  serializeBraintrustError,
  startBraintrustSpan,
} from "@/lib/braintrust";
import { getPrisma } from "@/lib/prisma";
import { completionRequestSchema } from "@/lib/input-limits";
import {
  claimOnce,
  enforceRateLimit,
  generationClaimKey,
} from "@/lib/server-rate-limit";

function optimizeMessagesForTokens(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
): { role: "system" | "user" | "assistant"; content: string }[] {
  // Strip code blocks from assistant messages except the last 2 to save tokens
  const assistantIndices: number[] = [];
  for (
    let i = messages.length - 1;
    i >= 0 && assistantIndices.length < 2;
    i--
  ) {
    if (messages[i].role === "assistant") {
      assistantIndices.push(i);
    }
  }
  return messages.map((msg, index) => {
    if (msg.role === "assistant" && !assistantIndices.includes(index)) {
      const stripped = msg.content.replace(/```[\s\S]*?```/g, "").trim();
      return {
        ...msg,
        content: stripped || "[code omitted]",
      };
    }
    return msg;
  });
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit("generation", req.headers);
  if (limited) return limited;

  const parsed = completionRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    await logBraintrustFailure(
      {
        name: "llamacoder.stream-generation",
        type: "llm",
        event: {
          metadata: {
            route: "/api/get-next-completion-stream-promise",
            phase: "request-validation",
          },
        },
      },
      new Error("Invalid request"),
    );
    return new Response("Invalid request", { status: 400 });
  }
  const { messageId } = parsed.data;
  const prisma = getPrisma();

  let message;
  try {
    message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: {
            braintrustParent: true,
            model: true,
          },
        },
      },
    });
  } catch (error) {
    await logBraintrustFailure(
      {
        name: "llamacoder.stream-generation",
        type: "llm",
        event: {
          input: { messageId },
          metadata: {
            route: "/api/get-next-completion-stream-promise",
            phase: "message-lookup",
          },
        },
      },
      error,
    );
    return new Response("Internal error", { status: 500 });
  }

  if (!message) {
    await logBraintrustFailure(
      {
        name: "llamacoder.stream-generation",
        type: "llm",
        event: {
          input: { messageId },
          metadata: {
            route: "/api/get-next-completion-stream-promise",
            phase: "message-lookup",
          },
        },
      },
      new Error("Message not found"),
    );
    return new Response(null, { status: 404 });
  }

  // Generations only answer the newest user message, once. This stops replays
  // of old or shared message ids from starting more paid generations.
  if (message.role !== "user") {
    return new Response("Invalid message", { status: 400 });
  }
  try {
    const newerMessages = await prisma.message.count({
      where: { chatId: message.chatId, position: { gt: message.position } },
    });
    if (newerMessages > 0) {
      return new Response("Message already answered", { status: 409 });
    }
  } catch (error) {
    console.error("Failed to check message position:", error);
    return new Response("Internal error", { status: 500 });
  }
  if (!(await claimOnce(generationClaimKey(message.id)))) {
    return new Response("Generation already started", { status: 409 });
  }

  let messages;
  try {
    const messagesRes = await prisma.message.findMany({
      where: { chatId: message.chatId, position: { lte: message.position } },
      orderBy: { position: "asc" },
    });

    messages = z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        }),
      )
      .parse(messagesRes);
  } catch (error) {
    await logBraintrustFailure(
      {
        parent: message.chat.braintrustParent ?? undefined,
        name: "llamacoder.stream-generation",
        type: "llm",
        event: {
          input: { messageId },
          metadata: {
            route: "/api/get-next-completion-stream-promise",
            chatId: message.chatId,
            phase: "message-loading",
          },
        },
      },
      error,
    );
    return new Response("Internal error", { status: 500 });
  }

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  const together = new Together();
  // Chats created before the allowlist may store arbitrary model ids.
  const storedModel = resolveModel(message.chat.model);
  if (!storedModel) {
    console.warn(
      `Chat ${message.chatId} has unapproved model; using ${FALLBACK_MODEL}`,
    );
  }
  const resolvedModel = storedModel ?? FALLBACK_MODEL;
  const temperature = 0.4;
  // 20000, up from the benchmarked 13000: chat USzt_maT7friospM hit the 13k
  // cap mid-file on a detailed prompt, truncating the last fence — the file
  // was dropped and the preview failed with "Cannot resolve". A cap is not a
  // target, so typical generations are unaffected; only would-be truncations
  // keep streaming. The lifecycle deadline below stops unusually long runs
  // before Vercel's hard timeout and lets the client retain completed files.
  const maxTokens = 20000;
  const inputMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const startedAt = performance.now();
  let firstTokenMs = 0;
  const promptChars = inputMessages.reduce(
    (sum, item) => sum + item.content.length,
    0,
  );

  const span = startBraintrustSpan({
    parent: message.chat.braintrustParent ?? undefined,
    name: "llamacoder.stream-generation",
    type: "llm",
    event: {
      input: {
        messages: inputMessages,
      },
      metadata: {
        route: "/api/get-next-completion-stream-promise",
        chatId: message.chatId,
        messageId,
        requestedModel: message.chat.model,
        resolvedModel,
        model: resolvedModel,
        provider: "together",
        messageCount: inputMessages.length,
        promptChars,
        temperature,
        maxTokens,
      },
    },
  });

  let stream: ReturnType<typeof together.chat.completions.stream>;
  try {
    stream = together.chat.completions.stream(
      {
        model: resolvedModel,
        reasoning: { enabled: false },
        messages: inputMessages,
        temperature,
        max_tokens: maxTokens,
      },
      { signal: req.signal },
    );
  } catch (error) {
    span?.log({
      error: serializeBraintrustError(error),
      metrics: {
        first_token_ms: firstTokenMs,
        total_generation_ms: performance.now() - startedAt,
      },
    });
    span?.end();
    await flushBraintrustSpan(span);
    console.error("Failed to start generation:", error);
    return new Response("Generation failed", { status: 502 });
  }

  stream.on("content", (delta) => {
    if (!firstTokenMs && delta.length > 0) {
      firstTokenMs = performance.now() - startedAt;
      span?.log({
        metrics: {
          first_token_ms: firstTokenMs,
        },
      });
    }
  });

  let didHitGenerationDeadline = false;
  superviseCompletionStream(stream, {
    timeoutMs: GENERATION_DEADLINE_MS,
    onTimeout: () => {
      didHitGenerationDeadline = true;
    },
  })
    .then(async (finalText) => {
      const usage = await stream.totalUsage().catch(() => undefined);
      const completion = await stream.finalChatCompletion().catch(() => undefined);
      const finishReason = completion?.choices?.[0]?.finish_reason ?? null;
      span?.log({
        output: finalText,
        metadata: {
          completed: finishReason !== "length",
          finish_reason: finishReason,
          truncated: finishReason === "length",
          outputChars: finalText?.length ?? 0,
        },
        metrics: {
          first_token_ms: firstTokenMs,
          total_generation_ms: performance.now() - startedAt,
          prompt_tokens: usage?.prompt_tokens ?? 0,
          completion_tokens: usage?.completion_tokens ?? 0,
          tokens: usage?.total_tokens ?? 0,
        },
      });
      span?.end();
      await flushBraintrustSpan(span);
    })
    .catch(async (error) => {
      span?.log({
        error: serializeBraintrustError(error),
        metadata: {
          generationDeadlineMs: GENERATION_DEADLINE_MS,
          timedOut: didHitGenerationDeadline,
        },
        metrics: {
          first_token_ms: firstTokenMs,
          total_generation_ms: performance.now() - startedAt,
        },
      });
      span?.end();
      await flushBraintrustSpan(span);
    });

  return new Response(stream.toReadableStream());
}

export const maxDuration = 300;
