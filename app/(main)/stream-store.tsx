"use client";

import { useSyncExternalStore } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";

type Data = {
  stream: ReadableStream | undefined;
  content: string | undefined;
  state: "pending" | "reading" | "complete";
};

type Listener = () => void;

let streamMap = new Map<string, Data>();
let listeners: Listener[] = [];

export async function addStream(
  name: string,
  streamOrPromise: Promise<ReadableStream> | ReadableStream,
) {
  // we should put a placeholder here while we are resolving the stream
  const newMap1 = new Map(streamMap);
  newMap1.set(name, {
    stream: undefined,
    content: undefined,
    state: "pending",
  });
  streamMap = newMap1;
  emitChange();

  const stream =
    streamOrPromise instanceof Promise
      ? await streamOrPromise
      : streamOrPromise;

  const newMap2 = new Map(streamMap);
  newMap2.set(name, {
    stream,
    content: undefined,
    state: "reading",
  });
  streamMap = newMap2;
  emitChange();

  ChatCompletionStream.fromReadableStream(stream)
    .on("content", (delta, content) => {
      const newMap = new Map(streamMap);
      const data = newMap.get(name);
      if (data) {
        newMap.set(name, {
          ...data,
          content: data.content ? data.content + delta : delta,
        });
        streamMap = newMap;
        emitChange();
      }
    })
    .on("end", () => {
      const newMap = new Map(streamMap);
      const data = newMap.get(name);
      if (data) {
        newMap.set(name, {
          ...data,
          state: "complete",
        });
        streamMap = newMap;
        emitChange();
      }
    });
}

function subscribe(listener: Listener) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return streamMap;
}

function emitChange() {
  for (let listener of listeners) {
    listener();
  }
}

function useStreamStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useStream(name: string) {
  let map = useStreamStore();
  let record = map.get(name);

  return {
    content: record?.content,
    state: record?.state ?? "not_found",
    exists: !!record,
  };
}
