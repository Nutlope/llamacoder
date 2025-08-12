import { memoryDB } from "@/lib/memory-db";
import OpenAI from "openai";

export async function POST(req: Request) {
  const { messageId, model, chatId } = await req.json();

  // Skip message lookup and get all messages for the chat
  const messagesRes = await memoryDB.findMessagesByChat(chatId);
  let messages = messagesRes.slice(-10);

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const res = await openai.chat.completions.create({
    model,
    messages: messages.map((m) => ({ 
      role: m.role as "system" | "user" | "assistant", 
      content: m.content 
    })),
    stream: true,
    temperature: 0.2,
    max_tokens: 9000,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of res) {
          const chunkData = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(chunkData));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 45;
