/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import client from "@/lib/prisma";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { messageId: string };
}) {
  let messageId = params.messageId;
  let message = await client.message.findUnique({
    where: {
      id: messageId,
    },
    include: {
      chat: true,
    },
  });

  const backgroundData = await readFile(
    join(process.cwd(), "./public/dynamic-og.png"),
  );
  const backgroundSrc = Uint8Array.from(backgroundData).buffer;

  let title = message
    ? message.chat.title
    : "An app generated on LlamaCoder.io";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* @ts-expect-error */}
        <img src={backgroundSrc} height="100%" alt="" />
        <div
          style={{
            position: "absolute",
            fontSize: 50,
            color: "black",
            padding: "50px 200px",
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
