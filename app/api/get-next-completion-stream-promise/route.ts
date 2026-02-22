import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

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
      return {
        ...msg,
        content: msg.content.replace(/```[\s\S]*?```/g, "").trim(),
      };
    }
    return msg;
  });
}

export async function POST(req: Request) {
  const { messages: rawMessages, model } = await req.json();

  let messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(rawMessages);

  messages = optimizeMessagesForTokens(messages);

  if (messages.length > 10) {
    messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  // Validate model or default to flash
  const geminiModelName = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"].includes(model)
    ? model
    : "gemini-1.5-flash";

  const geminiModel = genAI.getGenerativeModel({
    model: geminiModelName,
  });

  // Gemini expects 'model' instead of 'assistant', and system messages are handled separately or in history
  const systemMessage = messages.find((m) => m.role === "system")?.content;
  const history = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Remove the last message from history as it's the one we're sending
  const lastMessage = history.pop();

  const chat = geminiModel.startChat({
    history: history,
    systemInstruction: systemMessage,
  });

  const result = await chat.sendMessageStream(lastMessage?.parts[0].text || "");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            const payload = {
              choices: [
                {
                  delta: {
                    content: chunkText,
                  },
                },
              ],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream error:", e);
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const runtime = "edge";
export const maxDuration = 300;
