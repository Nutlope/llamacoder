import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const { messageId, model } = await req.json();
  console.log("api route: ", messageId, model);

  const message = await prisma.message.findUniqueOrThrow({
    where: { id: messageId },
  });

  console.log("found message: ", message.id);

  return Response.json({ ok: true });
  //
}
