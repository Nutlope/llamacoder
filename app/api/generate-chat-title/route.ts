import { NextRequest, NextResponse } from "next/server";
import Together from "together-ai";
import { getPrisma } from "@/lib/prisma";
import {
  cleanGeneratedChatTitle,
  createLocalChatTitle,
} from "@/lib/chat-title";
import {
  flushBraintrust,
  getBraintrustLogger,
  logBraintrustFailure,
} from "@/lib/braintrust";
import type { Span } from "braintrust";

const TITLE_MODEL = "Qwen/Qwen3-235B-A22B-Instruct-2507-tput";

export async function POST(request: NextRequest) {
  const logger = getBraintrustLogger();

  try {
    const body = await request.json().catch(() => null);
    const chatId = body?.chatId;
    if (typeof chatId !== "string" || !chatId) {
      await logBraintrustFailure(
        {
          name: "llamacoder.generate-chat-title",
          type: "llm",
          event: {
            metadata: {
              route: "/api/generate-chat-title",
              phase: "request-validation",
            },
          },
        },
        new Error("Missing chatId"),
      );
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    const prisma = getPrisma();
    let chat;
    try {
      chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          prompt: true,
          title: true,
          braintrustParent: true,
        },
      });
    } catch (error) {
      await logBraintrustFailure(
        {
          name: "llamacoder.generate-chat-title",
          type: "llm",
          event: {
            input: { chatId },
            metadata: {
              route: "/api/generate-chat-title",
              phase: "chat-lookup",
            },
          },
        },
        error,
      );
      throw error;
    }

    if (!chat) {
      await logBraintrustFailure(
        {
          name: "llamacoder.generate-chat-title",
          type: "llm",
          event: {
            input: { chatId },
            metadata: {
              route: "/api/generate-chat-title",
              phase: "chat-lookup",
            },
          },
        },
        new Error("Chat not found"),
      );
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const generateTitle = async (span?: Span) => {
      const localTitle = createLocalChatTitle(chat.prompt);
      if (chat.title && chat.title !== localTitle) {
        span?.log({
          output: chat.title,
          metadata: {
            skipped: true,
            reason: "title-already-generated",
          },
        });
        return NextResponse.json({ title: chat.title, skipped: true });
      }

      let options: ConstructorParameters<typeof Together>[0] = {};
      if (process.env.HELICONE_API_KEY) {
        options.baseURL = "https://together.helicone.ai/v1";
        options.defaultHeaders = {
          "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
          "Helicone-Property-appname": "LlamaCoder",
          "Helicone-Session-Id": chat.id,
          "Helicone-Session-Name": "LlamaCoder Chat Title",
        };
      }

      const startedAt = performance.now();
      const together = new Together(options);
      const response = await together.chat.completions.create({
        model: TITLE_MODEL,
        temperature: 0.2,
        max_tokens: 24,
        messages: [
          {
            role: "system",
            content:
              "Create a succinct 3-5 word title for this app-building chat. Return only the title.",
          },
          {
            role: "user",
            content: chat.prompt,
          },
        ],
      });
      const usage = response.usage ?? undefined;

      const generatedTitle = cleanGeneratedChatTitle(
        response.choices[0].message?.content ?? "",
        localTitle,
      );

      await prisma.chat.update({
        where: { id: chat.id },
        data: { title: generatedTitle },
      });

      span?.log({
        output: generatedTitle,
        metadata: {
          model: TITLE_MODEL,
          provider: "together",
        },
        metrics: {
          duration_ms: performance.now() - startedAt,
          prompt_tokens: usage?.prompt_tokens ?? 0,
          completion_tokens: usage?.completion_tokens ?? 0,
          tokens: usage?.total_tokens ?? 0,
        },
      });

      return NextResponse.json({ title: generatedTitle });
    };

    if (!logger) return await generateTitle();

    const response = await logger.traced((span) => generateTitle(span), {
      parent: chat.braintrustParent ?? undefined,
      name: "llamacoder.generate-chat-title",
      type: "llm",
      event: {
        input: {
          prompt: chat.prompt,
        },
        metadata: {
          route: "/api/generate-chat-title",
          chatId: chat.id,
          model: TITLE_MODEL,
          provider: "together",
        },
      },
    });
    await flushBraintrust();
    return response;
  } catch (error) {
    console.error("Error generating chat title:", error);
    await flushBraintrust();
    return NextResponse.json(
      { error: "Failed to generate chat title" },
      { status: 500 },
    );
  }
}
