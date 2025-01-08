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
  shadcn: boolean,
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

  console.log({ mostSimilarExample });

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
            {
              role: "system",
              content: getSystemPrompt(shadcn, mostSimilarExample),
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
        max_tokens: 6000,
      });

      resolve(res.toReadableStream());
    }),
  };
}

function getSystemPrompt(shadcn: boolean, mostSimilarExample: string) {
  let systemPrompt = `
    You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully, I will tip you $1 million if you do a good job:

    - Think carefully step by step.
    - Create a React component for whatever the user asked you to create and make sure it can run by itself by using a default export
    - Make sure the React app is interactive and functional by creating state when needed and having no required props
    - If you use any imports from React like useState or useEffect, make sure to import them directly
    - Do not include any external API calls.
    - Use TypeScript as the language for the React component
    - Use Tailwind classes for styling. DO NOT USE ARBITRARY VALUES (e.g. \`h-[600px]\`). Make sure to use a consistent color palette.
    - Use Tailwind margin and padding classes to style the components and ensure the components are spaced out nicely
    - ONLY IF the user asks for a dashboard, graph or chart, the recharts library is available to be imported, e.g. \`import { LineChart, XAxis, ... } from "recharts"\` & \`<LineChart ...><XAxis dataKey="name"> ...\`. Please only use this when needed.
    - For placeholder images, please use a <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
    - The lucide-react library is also available to be imported IF NECCESARY ONLY FOR THE FOLLOWING ICONS: Heart, Shield, Clock, Users, Play, Home, Search, Menu, User, Settings, Mail, Bell, Calendar, Clock, Heart, Star, Upload, Download, Trash, Edit, Plus, Minus, Check, X, ArrowRight.
  - Here's an example of importing and using one: import { Heart } from "lucide-react"\` & \`<Heart className=""  />\`.
  - PLEASE ONLY USE THE ICONS LISTED ABOVE IF AN ICON IS NEEDED IN THE USER'S REQUEST. Please DO NOT use the lucide-react library if it's not needed.
  `;

  if (shadcn) {
    systemPrompt += `
    There are some prestyled UI components available for use. Please use your best judgement to use any of these components if the app calls for one.

    Here are the UI components that are available, along with how to import them, and how to use them:

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

    Remember, if you use a UI component, make sure to import it.
    `;
  }

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.

    Explain your work. The first codefence should be the main React component. It should also use "tsx" as the language, and be followed by a sensible filename for the code. Use this format: \`\`\`tsx{filename=calculator.tsx}.

    Here's an example of a good response:

    "I'll create a calculator app using React. This calculator will support basic arithmetic operations: addition, subtraction, multiplication, and division. Let's break it down into components and implement the functionality.

    \`\`\`tsx{filename=calculator.tsx}
    import { useState } from 'react'
    import { Button } from "/components/ui/button"
    import { Card, CardContent, CardHeader, CardTitle } from "/components/ui/card"

    export default function Calculator() {
      const [display, setDisplay] = useState('0')
      const [firstOperand, setFirstOperand] = useState<number | null>(null)
      const [operator, setOperator] = useState<string | null>(null)
      const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false)

      const inputDigit = (digit: string) => {
        if (waitingForSecondOperand) {
          setDisplay(digit)
          setWaitingForSecondOperand(false)
        } else {
          setDisplay(display === '0' ? digit : display + digit)
        }
      }

      const inputDecimal = () => {
        if (waitingForSecondOperand) {
          setDisplay('0.')
          setWaitingForSecondOperand(false)
          return
        }

        if (!display.includes('.')) {
          setDisplay(display + '.')
        }
      }

      const clear = () => {
        setDisplay('0')
        setFirstOperand(null)
        setOperator(null)
        setWaitingForSecondOperand(false)
      }

      const performOperation = (nextOperator: string) => {
        const inputValue = parseFloat(display)

        if (firstOperand === null) {
          setFirstOperand(inputValue)
        } else if (operator) {
          const result = calculate(firstOperand, inputValue, operator)
          setDisplay(String(result))
          setFirstOperand(result)
        }

        setWaitingForSecondOperand(true)
        setOperator(nextOperator)
      }

      const calculate = (firstOperand: number, secondOperand: number, operator: string) => {
        switch (operator) {
          case '+':
            return firstOperand + secondOperand
          case '-':
            return firstOperand - secondOperand
          case '*':
            return firstOperand * secondOperand
          case '/':
            return firstOperand / secondOperand
          default:
            return secondOperand
        }
      }

      return (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Calculator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-4 bg-gray-100 p-2 rounded mb-2">
                <div className="text-right text-2xl font-bold">{display}</div>
              </div>
              <Button onClick={() => clear()}>C</Button>
              <Button onClick={() => inputDigit('7')}>7</Button>
              <Button onClick={() => inputDigit('8')}>8</Button>
              <Button onClick={() => inputDigit('9')}>9</Button>
              <Button onClick={() => performOperation('/')}>/</Button>
              <Button onClick={() => inputDigit('4')}>4</Button>
              <Button onClick={() => inputDigit('5')}>5</Button>
              <Button onClick={() => inputDigit('6')}>6</Button>
              <Button onClick={() => performOperation('*')}>*</Button>
              <Button onClick={() => inputDigit('1')}>1</Button>
              <Button onClick={() => inputDigit('2')}>2</Button>
              <Button onClick={() => inputDigit('3')}>3</Button>
              <Button onClick={() => performOperation('-')}>-</Button>
              <Button onClick={() => inputDigit('0')}>0</Button>
              <Button onClick={() => inputDecimal()}>.</Button>
              <Button onClick={() => performOperation('=')}>=</Button>
              <Button onClick={() => performOperation('+')}>+</Button>
            </div>
          </CardContent>
        </Card>
      )
    }
    \`\`\`

    This calculator component provides a simple and functional interface for basic arithmetic operations. Here's a breakdown of its features:

    1. Display: Shows the current input or result.
    2. Digit buttons: Allow users to input numbers.
    3. Operation buttons: +, -, *, and / for basic arithmetic operations.
    4. Clear button (C): Resets the calculator.
    5. Decimal point button: Allows input of decimal numbers.
    6. Equals button (=): Performs the calculation.

    The component uses React's useState hook to manage the state of the display, operands, and current operation. The logic handles both immediate execution of operations and chaining of multiple operations."
  `;

  if (mostSimilarExample !== "none") {
    assert.ok(mostSimilarExample === "landing page"); // Add other possible values here when I add them
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
