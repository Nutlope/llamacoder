"use server";

import client from "@/lib/prisma";
import { redirect } from "next/navigation";

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
