"use client";

import { useEffect, useState, use } from "react";
import PageClient from "./page.client";
import { notFound } from "next/navigation";
import { getSavedChats } from "@/lib/utils";

export interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  position: number;
  files?: any[];
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  totalMessages: number;
  assistantMessagesCountBefore: number;
  prompt?: string;
}

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chats = getSavedChats();
    const foundChat = chats.find((c: any) => c.id === id);
    if (foundChat) {
      setChat({
        ...foundChat,
        totalMessages: foundChat.messages.length,
        assistantMessagesCountBefore: 0,
      });
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!chat) {
    notFound();
  }

  return <PageClient chat={chat} />;
}

export const runtime = "edge";
