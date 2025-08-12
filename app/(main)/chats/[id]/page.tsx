import { memoryDB } from "@/lib/memory-db";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const chat = await getChatById(id);

  if (!chat) notFound();

  return <PageClient chat={chat} />;
}

const getChatById = cache(async (id: string) => {
  return await memoryDB.findChatById(id);
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const maxDuration = 45;
