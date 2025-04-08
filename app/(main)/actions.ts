"use server";

import { getPrisma } from "@/lib/prisma";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { notFound } from "next/navigation";
import Together from "together-ai";

// Helper function to determine if a model is an Ollama model
function isOllamaModel() {
  return !!process.env.OLLAMA_BASE_URL;//model.includes(':') || model.startsWith('gemma');
}

// Function to call Ollama API
async function callOllamaAPI(model: string, messages: any[], options: any = {}) {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Ollama response to match Together.ai format
    return {
      choices: [
        {
          message: {
            content: data.message?.content || '',
            role: data.message?.role || 'assistant',
          },
        },
      ],
    };
  } catch (error) {
    console.error('Error calling Ollama API:', error);
    throw error;
  }
}

export async function createChat(
  prompt: string,
  model: string,
  quality: "high" | "low",
  screenshotUrl: string | undefined,
) {
  const prisma = getPrisma();
  const chat = await prisma.chat.create({
    data: {
      model,
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

  // Use a fallback model for title generation if using Ollama
  const titleModel = isOllamaModel() ? 
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" : 
    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

  async function fetchTitle() {
    const titleMessages = [
      {
        role: "system",
        content:
          "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    let titleResponse;
    if (isOllamaModel()) {
      titleResponse = await callOllamaAPI(titleModel, titleMessages);
    } else {
      titleResponse = await together.chat.completions.create({
        model: titleModel,
        messages: titleMessages,
      });
    }
    
    const title = titleResponse.choices[0].message?.content || prompt;
    return title;
  }

  async function fetchTopExample() {
    const exampleMessages = [
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
    ];

    let exampleResponse;
    if (isOllamaModel()) {
      exampleResponse = await callOllamaAPI(titleModel, exampleMessages);
    } else {
      exampleResponse = await together.chat.completions.create({
        model: titleModel,
        messages: exampleMessages,
      });
    }

    const mostSimilarExample =
      exampleResponse.choices[0].message?.content || "none";
    return mostSimilarExample;
  }

  const [title, mostSimilarExample] = await Promise.all([
    fetchTitle(),
    fetchTopExample(),
  ]);

  let fullScreenshotDescription;
  if (screenshotUrl) {
    // For screenshots, always use Together.ai as Ollama may not support vision
    const screenshotResponse = await together.chat.completions.create({
      model: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
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
    const highQualityModel = isOllamaModel() ? model : "Qwen/Qwen2.5-Coder-32B-Instruct";
    const highQualityMessages = [
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
    ];

    let initialRes;
    if (isOllamaModel()) {
      initialRes = await callOllamaAPI(highQualityModel, highQualityMessages, {
        temperature: 0.2,
        max_tokens: 3000,
      });
    } else {
      initialRes = await together.chat.completions.create({
        model: highQualityModel,
        messages: highQualityMessages,
        temperature: 0.2,
        max_tokens: 3000,
      });
    }

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
              content: getMainCodingPrompt(mostSimilarExample),
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
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true },
  });
  if (!chat) notFound();

  const maxPosition = Math.max(...chat.messages.map((m) => m.position));

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      position: maxPosition + 1,
      chatId,
    },
  });

  return newMessage;
}
