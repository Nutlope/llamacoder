import { ImageResponse } from "next/og";
import { domain } from "@/lib/domain";
import { MAX_OG_PROMPT_CHARS } from "@/lib/input-limits";
import { enforceRateLimit } from "@/lib/server-rate-limit";

export async function GET(request: Request) {
  const limited = await enforceRateLimit("ogImage", request.headers);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const rawPrompt = searchParams.get("prompt");
  const prompt =
    rawPrompt && rawPrompt.length > MAX_OG_PROMPT_CHARS
      ? rawPrompt.slice(0, MAX_OG_PROMPT_CHARS - 3) + "..."
      : rawPrompt;

  return new ImageResponse(
    (
      <div
        style={{
          backgroundImage: `url(${domain}/dynamic-og.png)`,
          backgroundSize: "1200px 630px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          fontSize: 50,
          color: "black",
          background: "white",
          width: "100%",
          height: "100%",
          padding: "50px 200px",
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {prompt}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    },
  );
}
