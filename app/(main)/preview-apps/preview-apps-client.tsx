"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type PreviewEntry = {
  chatId?: string;
  createdAt: string;
  fileCount: number;
  id: string;
  source: "generated-app" | "message";
  subtitle: string;
  title: string;
  type: "chat" | "generated-app";
};

type PreviewAppsResponse =
  | {
      ok: true;
      entries: Array<PreviewEntry>;
      stats: {
        chatScanLimit: number;
        chatEntries: number;
        generatedAppEntries: number;
        messagesPerChatLimit: number;
        scannedGeneratedApps: number;
        scannedMessages: number;
      };
    }
  | { ok: false; error: string };

export default function PreviewAppsClient() {
  const [data, setData] = useState<PreviewAppsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/preview-apps")
      .then((response) => response.json() as Promise<PreviewAppsResponse>)
      .then((nextData) => {
        if (!cancelled) setData(nextData);
      })
      .catch((error) => {
        if (!cancelled) {
          setData({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const entries = data?.ok ? data.entries : [];

  return (
    <main className="min-h-screen bg-zinc-100 px-5 py-6 text-zinc-950">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Preview Apps</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Pick a saved app and open the same content in both renderers.
            </p>
          </div>

          <div className="flex gap-2">
            <PreviewLink href="/preview-poc?preview=wasm">
              Gauntlet WASM
            </PreviewLink>
            <PreviewLink href="/preview-poc?preview=sandpack">
              Gauntlet Sandpack
            </PreviewLink>
          </div>
        </header>

        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Renderable Apps ({entries.length})
            </h2>
            {data?.ok ? (
              <p className="mt-1 text-sm text-zinc-600">
                {data.stats.chatEntries} chats, {data.stats.generatedAppEntries}{" "}
                legacy generated apps. Scanned up to {data.stats.chatScanLimit}{" "}
                recent chats, {data.stats.scannedMessages} assistant messages,
                and {data.stats.scannedGeneratedApps} generated app rows.
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-600">
                Recent DB entries with reconstructable preview files.
              </p>
            )}
          </div>

          {!data && (
            <div className="rounded-md border border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
              Loading chats from the database...
            </div>
          )}

          {data && !data.ok && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-5 text-sm text-red-900">
              Could not load chats: {data.error}
            </div>
          )}

          {data?.ok && entries.length === 0 && (
            <div className="rounded-md border border-zinc-300 bg-white px-4 py-5 text-sm text-zinc-500">
              No renderable apps found in the current scan window.
            </div>
          )}

          {entries.length > 0 && <EntryGrid entries={entries} />}
        </section>
      </div>
    </main>
  );
}

function EntryGrid({ entries }: { entries: Array<PreviewEntry> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className="rounded-lg border border-zinc-300 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{entry.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">{entry.subtitle}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {entry.fileCount} file{entry.fileCount === 1 ? "" : "s"} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </p>
            </div>
            <span className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600">
              {entry.type === "chat" ? "Chat" : "GeneratedApp"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <PreviewLink href={buildPreviewHref(entry, "wasm")}>
              WASM
            </PreviewLink>
            <PreviewLink href={buildPreviewHref(entry, "sandpack")}>
              Sandpack
            </PreviewLink>
          </div>
        </article>
      ))}
    </div>
  );
}

function PreviewLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
      href={href}
      target="_blank"
    >
      {children}
    </Link>
  );
}

function buildPreviewHref(entry: PreviewEntry, preview: "sandpack" | "wasm") {
  const params = new URLSearchParams({ preview, source: entry.source });

  if (entry.source === "message") {
    params.set("messageId", entry.id);
  } else {
    params.set("id", entry.id);
  }

  return `/preview-poc?${params}`;
}
