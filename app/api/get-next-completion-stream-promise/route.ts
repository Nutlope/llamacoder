import prisma from "@/lib/prisma";
// import { z } from "zod";
// import Together from "together-ai";

export async function POST(req: Request) {
  const { messageId, model } = await req.json();

  console.log("begin: ", messageId, model);

  const message = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
  });

  console.log("got message: ", message.id);

  return Response.json({ ok: true });

  // if (!message) {
  //   new Response(null, { status: 404 });
  // }

  // const messagesRes = await prisma.message.findMany({
  //   where: { chatId: message.chatId, position: { lte: message.position } },
  //   orderBy: { position: "asc" },
  // });

  // let messages = z
  //   .array(
  //     z.object({
  //       role: z.enum(["system", "user", "assistant"]),
  //       content: z.string(),
  //     }),
  //   )
  //   .parse(messagesRes);

  // if (messages.length > 10) {
  //   messages = [messages[0], messages[1], messages[2], ...messages.slice(-7)];
  // }

  // let options: ConstructorParameters<typeof Together>[0] = {};
  // if (process.env.HELICONE_API_KEY) {
  //   options.baseURL = "https://together.helicone.ai/v1";
  //   options.defaultHeaders = {
  //     "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  //     "Helicone-Property-appname": "LlamaCoder",
  //     "Helicone-Session-Id": message.chatId,
  //     "Helicone-Session-Name": "LlamaCoder Chat",
  //   };
  // }

  // const together = new Together(options);

  // const res = await together.chat.completions.create({
  //   model,
  //   messages: messages.map((m) => ({ role: m.role, content: m.content })),
  //   stream: true,
  //   temperature: 0.2,
  //   max_tokens: 9000,
  // });

  // return {
  //   streamPromise: new Promise<ReadableStream>(async (resolve) => {
  //     console.log("getNextCompletionStreamPromise: querying together");
  //     const res = await together.chat.completions.create({
  //       model,
  //       messages: messages.map((m) => ({ role: m.role, content: m.content })),
  //       stream: true,
  //       temperature: 0.2,
  //       max_tokens: 9000,
  //     });

  //     console.log("getNextCompletionStreamPromise: resolving promise");
  //     resolve(res.toReadableStream());
  //   }),
  // };
}

export const runtime = "edge";
