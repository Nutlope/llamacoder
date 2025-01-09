"use server";

import assert from "assert";
import prisma from "@/lib/prisma";
import shadcnDocs from "@/lib/shadcn-docs";
import dedent from "dedent";
import { notFound } from "next/navigation";
import Together from "together-ai";
import { z } from "zod";
import { examples } from "@/lib/shadcn-examples";

export async function createChat(
  prompt: string,
  model: string,
  quality: "high" | "low",
  screenshotUrl: string | undefined,
) {
  let options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
    };
  }

  const together = new Together(options);

  async function fetchTitle() {
    const responseForChatTitle = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
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
    const findSimilarExamples = await together.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful bot. Given a request for building an app, you match it to the most similar example provided. If the request is NOT similar to any of the provided examples, return "none". Here is the list of examples, ONLY reply with one of them OR "none":

          - landing page
          - blog app
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
    let getDescriptionPrompt = `Describe the attached screenshot in detail. I will send what you give me to a developer to recreate the original screenshot of a website that I sent you. Please listen very carefully. It's very important for my job that you follow these instructions:

- Think step by step and describe the UI in great detail.
- Make sure to describe where everything is in the UI so the developer can recreate it and if how elements are aligned
- Pay close attention to background color, text color, font size, font family, padding, margin, border, etc. Match the colors and sizes exactly.
- Make sure to mention every part of the screenshot including any headers, footers, sidebars, etc.
- Make sure to use the exact text from the screenshot.
`;

    const screenshotResponse = await together.chat.completions.create({
      model: "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          // @ts-expect-error Need to fix the TypeScript library type
          content: [
            { type: "text", text: getDescriptionPrompt },
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
    const highQualitySystemPrompt = dedent`
      You are an expert software architect and product lead responsible for taking an idea of an app, analyzing it, and producing an implementation plan for a single page React frontend app. You are describing a plan for a React + Tailwind CSS + TypeScript app with the ability to use Lucide React for icons, Recharts for charts, and Shadcn UI for components.

      Guidelines:
      - Focus on MVP - Describe the Minimum Viable Product, which are the essential set of features needed to launch the app. Identify and prioritize the top 2-3 critical features.
      - Detail the High-Level Overview - Begin with a broad overview of the app’s purpose and core functionality, then detail specific features. Break down tasks into two levels of depth (Features → Tasks → Subtasks).
      - Be concise, clear, and straight forward. Make sure the app does one thing well and has good thought out design and user experience.
      - Skip code examples and commentary. Do not include any external API calls either.
      - Make sure the implementation can fit into one big React component
      - You CANNOT use any other libraries or frameworks besides those specified above (such as React router)
      If given a description of a screenshot, produce an implementation plan based on trying to replicate it as closely as possible.
    `;

    let initialRes = await together.chat.completions.create({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [
        {
          role: "system",
          content: highQualitySystemPrompt,
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
  } else {
    userMessage =
      prompt +
      "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
      fullScreenshotDescription;
  }

  const chat = await prisma.chat.create({
    data: {
      model,
      quality,
      prompt,
      title,
      shadcn: true,
      messages: {
        createMany: {
          data: [
            {
              role: "system",
              content: getSystemPrompt(mostSimilarExample),
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

  const lastMessage = chat.messages
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

export async function getNextCompletionStreamPromise(
  messageId: string,
  model: string,
) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) notFound();

  const messagesRes = await prisma.message.findMany({
    where: { chatId: message.chatId, position: { lte: message.position } },
    orderBy: { position: "asc" },
  });

  const messages = z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .parse(messagesRes);

  let options: ConstructorParameters<typeof Together>[0] = {};
  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
      "Helicone-Property-chatId": message.chatId,
    };
  }

  const together = new Together(options);

  return {
    streamPromise: new Promise<ReadableStream>(async (resolve) => {
      const res = await together.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: 0.2,
        max_tokens: 9000,
      });

      resolve(res.toReadableStream());
    }),
  };
}

function getSystemPrompt(mostSimilarExample: string) {
  let systemPrompt = `
  # LlamaCoder Instructions

  You are LlamaCoder, an expert frontend React engineer who is also a great UI/UX designer created by Together AI. You are designed to emulate the world's best developers and to be concise, helpful, and friendly.

  # General Instructions

  Follow the following instructions very carefully:
    - Before generating a React project, think through the right requirements, structure, styling, images, and formatting
    - Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
    - Make sure the React app is interactive and functional by creating state when needed and having no required props
    - If you use any imports from React like useState or useEffect, make sure to import them directly
    - Do not include any external API calls
    - Use TypeScript as the language for the React component
    - Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`).
    - Use Tailwind margin and padding classes to make sure components are spaced out nicely and follow good design principles
    - Write complete code that can be copied/pasted directly. Do not write partial code or include comments for users to finish the code
    - Generate responsive designs that work well on mobile + desktop
    - Default to using a white background unless a user asks for another one. If they do, use a wrapper element with a tailwind background color
    - ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
    - For placeholder images, please use a <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
    - Use the Lucide React library if icons are needed, but ONLY the following icons: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Clock, Heart, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, ArrowRight.
    - Here's an example of importing and using an Icon: import { Heart } from "lucide-react"\` & \`<Heart className=""  />\`.
    - ONLY USE THE ICONS LISTED ABOVE IF AN ICON IS NEEDED. Please DO NOT use the lucide-react library if it's not needed.


  # Shadcn UI Instructions

  Here are some prestyled UI components available for use from shadcn. Try to always default to using this library of components. Here are the UI components that are available, along with how to import them, and how to use them:

  ${shadcnDocs
    .map(
      (component) => `
        <component>
        <name>
        ${component.name}
        </name>
        <import-instructions>
        ${component.importDocs}
        </import-instructions>
        <usage-instructions>
        ${component.usageDocs}
        </usage-instructions>
        </component>
      `,
    )
    .join("\n")}

  Remember, if you use a shadcn UI component from the above available components, make sure to import it FROM THE CORRECT PATH. Double check that imports are correct, each is imported in it's own path, and all components that are used in the code are imported. Here's a list of imports again for your reference:

  ${shadcnDocs.map((component) => component.importDocs).join("\n")}


  # Formatting Instructions

  NO OTHER LIBRARIES ARE INSTALLED OR ABLE TO BE IMPORTED (such as zod, hookform, react-router) BESIDES THOSE SPECIFIED ABOVE.

  Explain your work. The first codefence should be the main React component. It should also use "tsx" as the language, and be followed by a sensible filename for the code (please use kebab-case for file names). Use this format: \`\`\`tsx{filename=calculator.tsx}.

  # Examples

  Here's a good example:

  Prompt:
  ${examples["calculator app"].prompt}

  Response:
  ${examples["calculator app"].response}
  `;

  if (mostSimilarExample !== "none") {
    assert.ok(
      mostSimilarExample === "landing page" ||
        mostSimilarExample === "blog app",
    );
    systemPrompt += `
    Here another example (thats missing explanations and is just code):

    Prompt:
    ${examples[mostSimilarExample].prompt}

    Response:
    ${examples[mostSimilarExample].response}
    `;
  }

  return dedent(systemPrompt);
}
