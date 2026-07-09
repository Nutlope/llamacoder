import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { screenshotToCodePrompt } from "@/lib/prompts";
import { buildProductionCodingPrompt } from "@/lib/prompt-config";
import Together from "together-ai";
import { resolveModel } from "@/lib/constants";
import { createLocalChatTitle } from "@/lib/chat-title";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, screenshotUrl } = await request.json();
    const resolvedModel = resolveModel(model);
    const chatId = createId();

    let fullScreenshotDescription;
    if (screenshotUrl) {
      try {
        let options: ConstructorParameters<typeof Together>[0] = {};
        if (process.env.HELICONE_API_KEY) {
          options.baseURL = "https://together.helicone.ai/v1";
          options.defaultHeaders = {
            "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
            "Helicone-Property-appname": "LlamaCoder",
            "Helicone-Session-Id": chatId,
            "Helicone-Session-Name": "LlamaCoder Chat",
          };
        }

        const together = new Together(options);
        const screenshotResponse = await together.chat.completions.create({
          model: "moonshotai/Kimi-K2.7-Code",
          reasoning: { enabled: false },
          temperature: 0.4,
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: screenshotToCodePrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: screenshotUrl,
                  },
                },
              ],
            },
          ],
        });

        fullScreenshotDescription =
          screenshotResponse.choices[0].message?.content;
      } catch (err) {
        console.warn("Screenshot processing failed, continuing without it:", err);
      }
    }

    let userMessage: string;
    if (fullScreenshotDescription) {
      userMessage =
        prompt +
        "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
        fullScreenshotDescription;
    } else {
      userMessage = prompt;
    }

    const prisma = getPrisma();
    const lastMessageId = createId();
    await prisma.chat.create({
      data: {
        id: chatId,
        model: resolvedModel,
        // The High-quality toggle was removed (benchmark: worse reliability, no
        // quality gain). All generations use the single minimal-v1 × inline path.
        quality: "low",
        prompt,
        title: createLocalChatTitle(prompt),
        shadcn: true,
        messages: {
          create: [
            {
              id: createId(),
              role: "system",
              content: buildProductionCodingPrompt(),
              position: 0,
            },
            {
              id: lastMessageId,
              role: "user",
              content: userMessage,
              position: 1,
            },
          ],
        },
      },
    });

    return NextResponse.json({
      chatId,
      lastMessageId,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}

function createId(size = 16) {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte & 63]).join("");
}
