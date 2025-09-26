import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import Together from "together-ai";

export async function POST(req: Request) {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });
  const { messageId, model, provider } = await req.json();

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    return new Response(null, { status: 404 });
  }

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  let messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  if (provider === "ollama") {
    const ollama = (await import("ollama")).default;
    const ollamaStream = await ollama.chat({
      model: "llama3", // Hardcoding for now
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for await (const chunk of ollamaStream) {
          const payload = {
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: chunk.model,
            choices: [
              {
                index: 0,
                delta: {
                  content: chunk.message.content || "",
                },
                finish_reason: chunk.done ? "stop" : null,
              },
            ],
          };
          const sse = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(sse));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } else {
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

    const res = await together.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.2,
      max_tokens: 9000,
    });

    return new Response(res.toReadableStream());
  }
}

export const runtime = "edge";
export const maxDuration = 45;
