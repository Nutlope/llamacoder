import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import Together from "together-ai";
import {
  FALLBACK_MODEL,
  isNonServerlessModelError,
  resolveModel,
} from "@/lib/constants";
import {
  flushBraintrustSpan,
  logBraintrustFailure,
  serializeBraintrustError,
  startBraintrustSpan,
} from "@/lib/braintrust";

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

const requestSchema = z.object({
  messageId: z.string().min(1),
  model: z.string().min(1),
});

export async function POST(req: Request) {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
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
  const { messageId, model } = parsed.data;

  let message;
  try {
    message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        chat: {
          select: {
            braintrustParent: true,
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
    throw error;
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
    throw error;
  }

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  let options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
      "Helicone-Session-Id": message.chatId,
      "Helicone-Session-Name": "LlamaCoder Chat",
    };
  }

  const together = new Together(options);
  const resolvedModel = resolveModel(model);
  const temperature = 0.4;
  // 20000, up from the benchmarked 13000: chat USzt_maT7friospM hit the 13k
  // cap mid-file on a detailed prompt, truncating the last fence — the file
  // was dropped and the preview failed with "Cannot resolve". A cap is not a
  // target, so typical generations are unaffected; only would-be truncations
  // keep streaming (still well under the 300s maxDuration).
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
        requestedModel: model,
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
    stream = together.chat.completions.stream({
      model: resolvedModel,
      reasoning: { enabled: false },
      messages: inputMessages,
      temperature,
      max_tokens: maxTokens,
    });
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
    throw error;
  }

  const attachContentListener = (
    currentStream: typeof stream,
    currentModel: string,
  ) => {
    currentStream.on("content", (delta) => {
      if (!firstTokenMs && delta.length > 0) {
        firstTokenMs = performance.now() - startedAt;
        span?.log({
          metrics: {
            first_token_ms: firstTokenMs,
          },
          metadata: { model: currentModel },
        });
      }
    });
  };

  attachContentListener(stream, resolvedModel);

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emittedOutput = false;
      let activeModel = resolvedModel;
      let activeStream = stream;

      while (true) {
        try {
          const reader = activeStream.toReadableStream().getReader();
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            emittedOutput = true;
            controller.enqueue(chunk.value);
          }
          controller.close();
          return;
        } catch (error) {
          if (
            emittedOutput ||
            activeModel === FALLBACK_MODEL ||
            !isNonServerlessModelError(error)
          ) {
            controller.error(error);
            return;
          }

          activeModel = FALLBACK_MODEL;
          activeStream = together.chat.completions.stream({
            model: activeModel,
            reasoning: { enabled: false },
            messages: inputMessages,
            temperature,
            max_tokens: maxTokens,
          });
          attachContentListener(activeStream, activeModel);
        }
      }
    },
  });

  stream
    .finalContent()
    .then(async (finalText) => {
      const usage = await stream.totalUsage().catch(() => undefined);
      span?.log({
        output: finalText,
        metadata: {
          completed: true,
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
        metrics: {
          first_token_ms: firstTokenMs,
          total_generation_ms: performance.now() - startedAt,
        },
      });
      span?.end();
      await flushBraintrustSpan(span);
    });

  return new Response(responseStream);
}

export const runtime = "edge";
export const maxDuration = 300;
