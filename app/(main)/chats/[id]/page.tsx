import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";
import { Metadata } from "next";

type Props = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const chat = await getChatById(params.id);

  if (!chat) {
    return {
      title: "Chat not found",
      description: "The requested chat could not be found.",
    };
  }

  const messagePreview = chat.title;

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
  return await prisma.chat.findFirst({
    where: { id },
    include: { messages: { orderBy: { position: "asc" } } },
  });
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const runtime = "edge";
export const maxDuration = 45;
