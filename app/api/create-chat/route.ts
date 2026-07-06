import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { screenshotToCodePrompt } from "@/lib/prompts";
import { buildProductionCodingPrompt } from "@/lib/prompt-config";
import Together from "together-ai";
import { resolveModel } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, screenshotUrl } = await request.json();
    const resolvedModel = resolveModel(model);

    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: {
        model: resolvedModel,
        // The High-quality toggle was removed (benchmark: worse reliability, no
        // quality gain). All generations use the single minimal-v1 × inline path.
        quality: "low",
        prompt,
        title: "",
        shadcn: true,
      },
    });

    let options: ConstructorParameters<typeof Together>[0] = {};
    if (process.env.HELICONE_API_KEY) {
      options.baseURL = "https://together.helicone.ai/v1";
      options.defaultHeaders = {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-appname": "LlamaCoder",
        "Helicone-Session-Id": chat.id,
        "Helicone-Session-Name": "LlamaCoder Chat",
      };
    }

    const together = new Together(options);

    async function fetchTitle() {
      const responseForChatTitle = await together.chat.completions.create({
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });
      const title = responseForChatTitle.choices[0].message?.content || prompt;
      return title;
    }

    const title = await fetchTitle();

    let fullScreenshotDescription;
    if (screenshotUrl) {
      try {
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

    let newChat = await prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        title,
        messages: {
          createMany: {
            data: [
              {
                role: "system",
                content: buildProductionCodingPrompt(),
                position: 0,
              },
              { role: "user", content: userMessage, position: 1 },
            ],
          },
        },
      },
      include: {
        messages: true,
      },
    });

    const lastMessage = newChat.messages
      .sort((a, b) => a.position - b.position)
      .at(-1);
    if (!lastMessage) throw new Error("No new message");

    return NextResponse.json({
      chatId: chat.id,
      lastMessageId: lastMessage.id,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
