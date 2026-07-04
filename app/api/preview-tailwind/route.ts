import { NextRequest, NextResponse } from "next/server";
import { precompilePreviewTailwindCss } from "@/lib/preview/server-tailwind";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    cacheKey?: unknown;
    candidates?: unknown;
  } | null;
  const cacheKey = typeof body?.cacheKey === "string" ? body.cacheKey : "";
  const result = await precompilePreviewTailwindCss(cacheKey, body?.candidates);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    css: result.css,
    cacheHit: result.cacheHit,
    durationMs: result.durationMs,
  });
}
