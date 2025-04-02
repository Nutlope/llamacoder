import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool } from "@neondatabase/serverless";
import { z } from "zod";
import Together from "together-ai";

// Helper function to determine if we should use Ollama API
function isOllamaModel() {
  return !!process.env.OLLAMA_BASE_URL;
}

// Function to create a streaming response from Ollama API
async function createOllamaStream(model: string, messages: any[], options: any = {}) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature || 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  // Transform Ollama's streaming format to match Together.ai's format
  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      
      // Ollama sends each chunk as a JSON object
      if (text.trim()) {
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Format similar to Together.ai's streaming format
            const formattedChunk = {
              choices: [{
                delta: {
                  content: data.message?.content || '',
                },
                index: 0,
                finish_reason: data.done ? 'stop' : null
              }]
            };
            
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(formattedChunk)}\n\n`));
            
            if (data.done) {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            }
          } catch (e) {
            console.error('Error parsing Ollama stream chunk:', e);
          }
        }
      }
    }
  });

  return response.body?.pipeThrough(transformStream);
}

export async function POST(req: Request) {
  const neon = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(neon);
  const prisma = new PrismaClient({ adapter });
  const { messageId, model } = await req.json();

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

  // Check if we're using an Ollama model
  if (isOllamaModel()) {
    try {
      const stream = await createOllamaStream(model, messages.map((m) => ({ role: m.role, content: m.content })), {
        temperature: 0.2
      });
      
      return new Response(stream);
    } catch (error) {
      console.error('Ollama API error:', error);
      return new Response(JSON.stringify({ error: 'Failed to connect to Ollama API' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    // Use Together API for non-Ollama models
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
