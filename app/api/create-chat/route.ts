import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import Together from "together-ai";
import { resolveModel, MODELS, MODEL_ALIASES } from "@/lib/constants";

const VALID_MODEL_VALUES = new Set([
  ...MODELS.map((m) => m.value),
  ...Object.keys(MODEL_ALIASES),
]);

const ALLOWED_SCREENSHOT_HOSTS = (() => {
  const bucket = process.env.S3_UPLOAD_BUCKET;
  const region = process.env.S3_UPLOAD_REGION;
  const hosts: string[] = [];
  if (bucket) {
    hosts.push(`${bucket}.s3.amazonaws.com`);
    if (region) hosts.push(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return hosts;
})();

function isValidScreenshotUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_SCREENSHOT_HOSTS.some((h) => parsed.hostname === h);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, quality, screenshotUrl } = await request.json();

    if (!VALID_MODEL_VALUES.has(model)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    if (screenshotUrl !== undefined && !isValidScreenshotUrl(screenshotUrl)) {
      return NextResponse.json(
        { error: "Invalid screenshotUrl" },
        { status: 400 },
      );
    }
    const resolvedModel = resolveModel(model);

    const prisma = getPrisma();
    const chat = await prisma.chat.create({
      data: {
        model: resolvedModel,
        quality,
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
          model: "moonshotai/Kimi-K2.5",
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
    if (quality === "high") {
      let initialRes = await together.chat.completions.create({
        model: "Qwen/Qwen3-Coder-Next-FP8",
        messages: [
          {
            role: "system",
            content: softwareArchitectPrompt,
          },
          {
            role: "user",
            content: fullScreenshotDescription
              ? fullScreenshotDescription + prompt
              : prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      });

      userMessage = initialRes.choices[0].message?.content ?? prompt;
    } else if (fullScreenshotDescription) {
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
                content: getMainCodingPrompt(),
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
