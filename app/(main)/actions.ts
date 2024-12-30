"use server";

import prisma from "@/lib/prisma";
import shadcnDocs from "@/lib/shadcn-docs";
import dedent from "dedent";
import { notFound } from "next/navigation";
import Together from "together-ai";
import { z } from "zod";

let options: ConstructorParameters<typeof Together>[0] = {};
if (process.env.HELICONE_API_KEY) {
  options.baseURL = "https://together.helicone.ai/v1";
  options.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  };
}

let together = new Together(options);

export async function createChat(
  prompt: string,
  model: string,
  quality: "high" | "low",
  shadcn: boolean,
) {
  const res = await together.chat.completions.create({
    model: "meta-llama/Llama-3.2-3B-Instruct-Turbo",
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
  const title = res.choices[0].message?.content || prompt;

  let userMessage: string;
  if (quality === "high") {
    const highQualitySystemPrompt = dedent`
      You are an expert software architect and product lead responsible for taking an idea of an app, analyzing it, and producing an implementation plan for a single page React frontend app.
      Guidelines:
      - Focus on MVP - Describe the Minimum Viable Product, which are the essential set of features needed to launch the app. Identify and prioritize the top 2-3 critical features.
      - Detail the High-Level Overview - Begin with a broad overview of the app’s purpose and core functionality, then detail specific features. Break down tasks into two levels of depth (Features → Tasks → Subtasks).
      - Be concise, clear, and straight forward. Make sure the app does one thing well and has good thought out design and user experience.
      - Do not include any external API calls.
      - Skip code examples and commentary.
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
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    userMessage = initialRes.choices[0].message?.content ?? prompt;
  } else {
    userMessage = prompt;
  }

  const chat = await prisma.chat.create({
    data: {
      model,
      quality,
      prompt,
      title,
      shadcn,
      messages: {
        createMany: {
          data: [
            { role: "system", content: getSystemPrompt(shadcn), position: 0 },
            { role: "user", content: userMessage, position: 1 },
          ],
        },
      },
    },
    include: {
      messages: true,
    },
  });

  const lastMessage = chat.messages.at(-1);
  if (!lastMessage) throw new Error("No new message");

  return { chatId: chat.id, lastMessageId: lastMessage.id };
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

  return {
    streamPromise: new Promise<ReadableStream>(async (resolve) => {
      const res = await together.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: 0.2,
      });

      resolve(res.toReadableStream());
    }),
  };
}

function getSystemPrompt(shadcn: boolean) {
  let systemPrompt = `
    You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully, I will tip you $1 million if you do a good job:

    - Think carefully step by step.
    - Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
    - Make sure the React app is interactive and functional by creating state when needed and having no required props
    - If you use any imports from React like useState or useEffect, make sure to import them directly
    - Use TypeScript as the language for the React component
    - Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`). Make sure to use a consistent color palette.
    - Use Tailwind margin and padding classes to style the components and ensure the components are spaced out nicely
    - ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
    - For placeholder images, please use a <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
  `;

  // - The lucide-react library is also available to be imported IF NECCESARY ONLY FOR THE FOLLOWING ICONS: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Clock, Heart, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, ArrowRight.
  // - Here's an example of importing and using one: import { Heart } from "lucide-react"\` & \`<Heart className=""  />\`.
  // - PLEASE ONLY USE THE ICONS LISTED ABOVE IF AN ICON IS NEEDED IN THE USER'S REQUEST. Please DO NOT use the lucide-react library if it's not needed.

  if (shadcn) {
    systemPrompt += `
    There are some prestyled components available for use. Please use your best judgement to use any of these components if the app calls for one.

    Here are the components that are available, along with how to import them, and how to use them:

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

    Remember, if you use a prestyled component, make sure to import it.
    `;
  }

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.

    Explain your work. The first codefence should be the main React component. It should also use "tsx" as the language, and be followed by a sensible filename for the code. Use this format: \`\`\`tsx{filename=calculator.tsx}.
  `;

  // systemPrompt += `
  //   Here are some examples of a good response:

  //   ${examples
  //     .map(
  //       (example) => `
  //         <example>
  //         <prompt>
  //         ${example.prompt}
  //         </prompt>
  //         <response>
  //         ${example.response}
  //         </response>
  //         </example>
  //       `,
  //     )
  //     .join("\n")}
  // `;

  return dedent(systemPrompt);
}

/*
This is the prompt we originaly used for the new chat interface.

const systemPrompt = dedent`
  You are an expert software developer who knows three technologies: React, Python, and Node.js.

  You will be given a prompt for a simple app, and your task is to return a single file with the code for that app.

  You should first decide what the appropriate technology is for the prompt. If the prompt sounds like a web app where a user interface would be appropiate, return a React component. Otherwise, if the prompt could be addressed with a simple script, use Python, unless Node is explicitly specified.

  Explain your work. The first codefence should include the main app. It should also include both the language (either tsx, ts, or python) followed by a sensible filename for the code. Use this format: \`\`\`tsx{filename=calculator.tsx}.

  Here are some more details:
  
  - If you're writing a React component, make sure you don't use any external dependencies, and export a single React component as the default export. Use TypeScript as the language, with "tsx" for any code fences. You can also use Tailwind classes for styling, making sure not to use arbitrary values.

  - If you're writing a Python or Node script, make sure running the script executes the code you wrote and prints some output to the console.
`;
*/
