"use server";

import { memoryDB } from "@/lib/memory-db";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { notFound } from "next/navigation";
import OpenAI from "openai";

export async function createChat(
  prompt: string,
  model: string,
  quality: "high" | "low",
  screenshotUrl: string | undefined,
) {
  const chat = await memoryDB.createChat({
    model,
    quality,
    prompt,
    title: "",
    llamaCoderVersion: "v2",
    shadcn: true,
  });

  // Add Helicone headers if HELICONE_API_KEY is present
  const defaultHeaders = process.env.HELICONE_API_KEY ? {
    "HTTP-Referer": "https://llamacoder.io",
    "X-Title": "LlamaCoder",
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    "Helicone-Property-appname": "LlamaCoder",
    "Helicone-Session-Id": chat.id,
    "Helicone-Session-Name": "LlamaCoder Chat",
  } : {};

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders,
  });

  async function fetchTitle() {
    const responseForChatTitle = await openai.chat.completions.create({
      model: "moonshotai/kimi-k2:free",
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

  async function fetchTopExample() {
    const findSimilarExamples = await openai.chat.completions.create({
      model: "moonshotai/kimi-k2:free",
      messages: [
        {
          role: "system",
          content: `You are a helpful bot. Given a request for building an app, you match it to the most similar example provided. If the request is NOT similar to any of the provided examples, return "none". Here is the list of examples, ONLY reply with one of them OR "none":

          - landing page
          - blog app
          - quiz app
          - pomodoro timer
          `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const mostSimilarExample =
      findSimilarExamples.choices[0].message?.content || "none";
    return mostSimilarExample;
  }

  const [title, mostSimilarExample] = await Promise.all([
    fetchTitle(),
    fetchTopExample(),
  ]);

  let fullScreenshotDescription;
  if (screenshotUrl) {
    const screenshotResponse = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-405b-instruct:free",
      temperature: 0.2,
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

    fullScreenshotDescription = screenshotResponse.choices[0].message?.content;
  }

  let userMessage: string;
  if (quality === "high") {
    let initialRes = await openai.chat.completions.create({
      model: "qwen/qwen3-coder:free",
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
      temperature: 0.2,
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

  await memoryDB.createMessage({
    role: "system",
    content: getMainCodingPrompt(mostSimilarExample),
    position: 0,
    chatId: chat.id,
  });
  
  const lastMessage = await memoryDB.createMessage({
    role: "user",
    content: userMessage,
    position: 1,
    chatId: chat.id,
  });
  
  console.log('Created message with ID:', lastMessage.id);
  
  const newChat = await memoryDB.updateChat(chat.id, { title });

  if (!lastMessage) throw new Error("No new message");

  return {
    chatId: chat.id,
    lastMessageId: lastMessage.id,
  };
}

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
) {
  const chat = await memoryDB.findChatById(chatId);
  if (!chat) notFound();

  const maxPosition = Math.max(...chat.messages.map((m: { position: number }) => m.position), -1);

  const newMessage = await memoryDB.createMessage({
    role,
    content: text,
    position: maxPosition + 1,
    chatId,
  });

  return newMessage;
}
