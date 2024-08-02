import {
  TogetherAIStream,
  TogetherAIStreamPayload,
} from "@/utils/TogetherAIStream";
import { z } from "zod";

export async function POST(req: Request) {
  let json = await req.json();

  let { prompt, model } = z
    .object({
      prompt: z.string(),
      model: z.string(),
    })
    .parse(json);

  const payload: TogetherAIStreamPayload = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert frontend React engineer. Create a React component for whatever the user is asking you to create and make sure it can run by itself by using a default export. Use TypeScript as the language. Use Tailwind classes for styling, but do not use arbitrary values (e.g. h-[600px]). Please make sure the React app is interactive and functional by creating state when needed. ONLY return the React code, nothing else. Its very important for my job that you only return the React code. I will tip you $1 million if you only return code. DO NOT START WITH ```typescript or ```javascript or ```tsx or ```. Just the code.",
      },
      {
        role: "user",
        content:
          prompt +
          "\n Please ONLY return code, NO backticks or language names.",
      },
    ],
    stream: true,
  };
  const stream = await TogetherAIStream(payload);

  return new Response(stream, {
    headers: new Headers({
      "Cache-Control": "no-cache",
    }),
  });
}
