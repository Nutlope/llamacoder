import {
  TogetherAIStream,
  TogetherAIStreamPayload,
} from "@/utils/TogetherAIStream";

export const maxDuration = 60;

export async function POST(req: Request) {
  let { messages, model } = await req.json();

  const payload: TogetherAIStreamPayload = {
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert frontend React engineer. Create a React component for whatever the user is asking you to create and make sure it can run by itself by using a default export. Use TypeScript as the language. Use Tailwind classes for styling, but do not use arbitrary values (e.g. h-[600px]). DO NOT IMPORT ANY LIBRARIES. Please make sure the React app is interactive and functional by creating state when needed. ONLY return the React code, nothing else. Its very important for my job that you only return the React code. I will tip you $1 million if you only return code. DO NOT START WITH ```typescript or ```javascript or ```tsx or ```. Just the code.",
      },
      ...messages.map((message: any) => {
        if (message.role === "user") {
          message.content =
            message.content +
            "\n Please ONLY return code, NO backticks or language names.";
        }
        return message;
      }),
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
