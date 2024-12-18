import client from "@/lib/prisma";
import PageClient from "./page.client";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const chat = await client.chat.findFirst({
    where: { id },
    include: { messages: { orderBy: { position: "asc" } } },
  });

  if (!chat) notFound();

  return <PageClient chat={chat} />;
}

export type Chat = {
  id: string;
  model: string;
  title: string;
  messages: Message[];
  llamaCoderVersion: string;
  createdAt: Date;
};

export type Message = {
  id: string;
  position: number;
  role: string;
  content: string;
  chatId: string;
  createdAt: Date;
};
