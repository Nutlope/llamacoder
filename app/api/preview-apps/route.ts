import { getPrisma } from "@/lib/prisma";
import { parseReplySegments } from "@/lib/utils";
import { NextResponse } from "next/server";

type PreviewFile = { path: string; content: string };

export const dynamic = "force-dynamic";

const CHAT_SCAN_LIMIT = 120;
const MESSAGES_PER_CHAT_LIMIT = 20;
const GENERATED_APP_LIMIT = 100;

export async function GET() {
  try {
    const prisma = getPrisma();

    const [chats, generatedApps] = await Promise.all([
      prisma.chat.findMany({
        include: {
          messages: {
            orderBy: { position: "desc" },
            select: {
              content: true,
              createdAt: true,
              files: true,
              id: true,
              position: true,
            },
            take: MESSAGES_PER_CHAT_LIMIT,
            where: { role: "assistant" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: CHAT_SCAN_LIMIT,
      }),
      prisma.generatedApp.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          id: true,
          model: true,
          prompt: true,
        },
        take: GENERATED_APP_LIMIT,
      }),
    ]);

    const chatEntriesByChatId = new Map<string, PreviewAppEntry>();

    for (const chat of chats) {
      const message = chat.messages.find(
        (candidate) => filesFromMessage(candidate).length > 0,
      );
      if (!message) continue;

      const files = filesFromMessage(message);
      if (files.length === 0) continue;

      chatEntriesByChatId.set(chat.id, {
        chatId: chat.id,
        createdAt: message.createdAt.toISOString(),
        fileCount: files.length,
        id: message.id,
        source: "message",
        subtitle: `${chat.model} · message position ${message.position}`,
        title: chat.title || chat.prompt || message.id,
        type: "chat",
      });
    }

    const generatedAppEntries: Array<PreviewAppEntry> = generatedApps.map(
      (app) => ({
        createdAt: app.createdAt.toISOString(),
        fileCount: 1,
        id: app.id,
        source: "generated-app",
        subtitle: `${app.model} · legacy GeneratedApp`,
        title: app.prompt || app.id,
        type: "generated-app",
      }),
    );

    const entries = [
      ...Array.from(chatEntriesByChatId.values()),
      ...generatedAppEntries,
    ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return NextResponse.json({
      ok: true,
      entries,
      stats: {
        chatEntries: chatEntriesByChatId.size,
        generatedAppEntries: generatedAppEntries.length,
        chatScanLimit: CHAT_SCAN_LIMIT,
        messagesPerChatLimit: MESSAGES_PER_CHAT_LIMIT,
        scannedGeneratedApps: generatedApps.length,
        scannedMessages: chats.reduce(
          (count, chat) => count + chat.messages.length,
          0,
        ),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

type PreviewAppEntry = {
  chatId?: string;
  createdAt: string;
  fileCount: number;
  id: string;
  source: "generated-app" | "message";
  subtitle: string;
  title: string;
  type: "chat" | "generated-app";
};

function filesFromMessage(message: { content: string; files: unknown }) {
  const fencedFiles = parseReplySegments(message.content).flatMap((segment) =>
    segment.type === "file"
      ? [{ path: segment.path, content: segment.code }]
      : [],
  );

  if (Array.isArray(message.files)) {
    return mergeFiles([
      ...message.files.flatMap((file) => {
        if (!isMessageFile(file)) return [];
        const content = file.content ?? file.code;
        if (typeof content !== "string") return [];
        return [{ path: file.path, content }];
      }),
      ...fencedFiles,
    ]);
  }

  return fencedFiles;
}

function isMessageFile(
  file: unknown,
): file is { code?: string; content?: string; path: string } {
  if (!file || typeof file !== "object") return false;
  const candidate = file as {
    code?: unknown;
    content?: unknown;
    path?: unknown;
  };
  return (
    typeof candidate.path === "string" &&
    (typeof candidate.code === "string" ||
      typeof candidate.content === "string")
  );
}

function mergeFiles(files: Array<PreviewFile>) {
  const byPath = new Map<string, PreviewFile>();
  for (const file of files) {
    byPath.set(file.path, file);
  }
  return Array.from(byPath.values());
}
