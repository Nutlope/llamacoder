import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";
import { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params before accessing its properties
  const resolvedParams = await params;
  const chat = await getChatById(resolvedParams.id);

  if (!chat) {
    return {
      title: "Chat not found",
      description: "The requested chat could not be found.",
    };
  }

  return {
    title: `App: ${chat.title}`,
    description: `Building an app for ${chat.title} with ${chat.model}`,
    openGraph: {
      title: `App: ${chat.title}`,
      description: `Building an app for ${chat.title} with ${chat.model}`,
      type: "website",
    },
  };
}

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
  const prisma = getPrisma();
  const chat = await prisma.chat.findFirst({
    where: { id },
  });

  if (!chat) return null;

  // Get total message count
  const totalMessages = await prisma.message.count({
    where: { chatId: id },
  });

  // Always fetch system message (position 0) and initial user message (position 1)
  const initialMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { in: [0, 1] },
    },
    orderBy: { position: "asc" },
  });

  // Fetch the last 100 messages from position 2 onwards
  const recentMessages = await prisma.message.findMany({
    where: {
      chatId: id,
      position: { gte: 2 },
    },
    orderBy: { position: "desc" },
    take: 100,
  });

  // Combine and sort all messages
  const allMessages = [...initialMessages, ...recentMessages].sort(
    (a, b) => a.position - b.position,
  );

  // Calculate assistant messages count before the loaded range for correct versioning
  const assistantMessagesInLoaded = allMessages.filter(
    (m) => m.role === "assistant",
  );
  let assistantMessagesCountBefore = 0;
  if (assistantMessagesInLoaded.length > 0) {
    const minPosition = Math.min(
      ...assistantMessagesInLoaded.map((m) => m.position),
    );
    assistantMessagesCountBefore = await prisma.message.count({
      where: {
        chatId: id,
        role: "assistant",
        position: { lt: minPosition },
      },
    });
  }

  return {
    ...chat,
    messages: allMessages,
    totalMessages,
    assistantMessagesCountBefore,
  };
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const runtime = "edge";
export const maxDuration = 45;
