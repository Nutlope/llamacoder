"use server";

import client from "@/lib/prisma";
import Together from "together-ai";
import { z } from "zod";
import { parseWithZod } from "@conform-to/zod";

const together = new Together();

export async function shareApp({
  generatedCode,
  prompt,
  model,
}: {
  generatedCode: string;
  prompt: string;
  model: string;
}) {
  let newApp = await client.generatedApp.create({
    data: {
      code: generatedCode,
      model: model,
      prompt: prompt,
    },
  });

  return newApp.id;
}

export async function generateApp(formData: FormData) {
  let submission = parseWithZod(formData, {
    schema: z.object({
      model: z.string(),
      prompt: z.string(),
    }),
  });

  if (submission.status !== "success") {
    throw new Error("Bad submission");
  }

  let { model, prompt } = submission.value;

  let res = await together.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
    temperature: 0.2,
  });

  return res;

  // return res.toReadableStream();
  return 444;
}
