import { NextRequest, NextResponse } from "next/server";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { prompt, model, quality, screenshotUrl } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    async function fetchTitle() {
      const responseForChatTitle = await geminiModel.generateContent(
        `You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt: "${prompt}". Please return only the title.`,
      );
      const title = responseForChatTitle.response.text() || prompt;
      return title;
    }

    async function fetchTopExample() {
      const findSimilarExamples = await geminiModel.generateContent(
        `You are a helpful bot. Given a request for building an app, you match it to the most similar example provided. If the request is NOT similar to any of the provided examples, return "none". Here is the list of examples, ONLY reply with one of them OR "none":

            - landing page
            - blog app
            - quiz app
            - pomodoro timer

            Request: ${prompt}`,
      );

      const mostSimilarExample = findSimilarExamples.response.text() || "none";
      return mostSimilarExample.trim().toLowerCase();
    }

    const [title, mostSimilarExample] = await Promise.all([
      fetchTitle(),
      fetchTopExample(),
    ]);

    let fullScreenshotDescription;
    if (screenshotUrl) {
      let base64Data = "";
      let mimeType = "image/png";
      if (screenshotUrl.startsWith("data:")) {
        const match = screenshotUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      if (base64Data) {
        const screenshotResponse = await geminiModel.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          { text: screenshotToCodePrompt },
        ]);

        fullScreenshotDescription = screenshotResponse.response.text();
      }
    }

    let userMessage: string;
    if (quality === "high") {
      const architectModel = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
      });
      let initialRes = await architectModel.generateContent([
        { text: softwareArchitectPrompt },
        {
          text: fullScreenshotDescription
            ? fullScreenshotDescription + prompt
            : prompt,
        },
      ]);

      userMessage = initialRes.response.text() ?? prompt;
    } else if (fullScreenshotDescription) {
      userMessage =
        prompt +
        "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
        fullScreenshotDescription;
    } else {
      userMessage = prompt;
    }

    const chatId = crypto.randomUUID();

    const messages = [
      {
        id: crypto.randomUUID(),
        role: "system",
        content: getMainCodingPrompt(mostSimilarExample),
        position: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage,
        position: 1,
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      chatId,
      messages,
      title,
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
