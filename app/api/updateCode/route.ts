import { z } from "zod";
import Together from "together-ai";
import { ShadcnCategory } from "@/utils/shadcn-categories";
import dedent from "dedent";

let options: ConstructorParameters<typeof Together>[0] = {};
if (process.env.HELICONE_API_KEY) {
  options.baseURL = "https://together.helicone.ai/v1";
  options.defaultHeaders = {
    "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
  };
}

let together = new Together(options);

export async function POST(req: Request) {
  let json = await req.json();
  let result = z
    .object({
      model: z.string(),
      shadcn: z.boolean(),
      currentCode: z.string(),
      modification: z.string(),
      enabledCategories: z.array(z.string()).optional(),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  let { model, currentCode, modification, shadcn, enabledCategories } = result.data;
  let systemPrompt = getSystemPrompt(shadcn, enabledCategories);

  let res = await together.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "assistant",
        content: currentCode,
      },
      {
        role: "user",
        content:
          modification +
          "\nPlease ONLY return code, NO backticks or language names.",
      },
    ],
    stream: true,
    temperature: 0.2,
  });

  let textStream = res
    .toReadableStream()
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk) {
            try {
              let text = JSON.parse(chunk).choices[0].text;
              controller.enqueue(text);
            } catch (error) {
              console.error(error);
            }
          }
        },
      }),
    )
    .pipeThrough(new TextEncoderStream());

  return new Response(textStream, {
    headers: new Headers({
      "Cache-Control": "no-cache",
    }),
  });
}

function getSystemPrompt(shadcn: boolean, enabledCategories?: string[]) {
  let systemPrompt = `
    You are an expert frontend React engineer who is also a great UI/UX designer. Follow the instructions carefully:

    - You will be given the current React component code and a modification request
    - Update the code according to the modification while preserving the existing functionality
    - Make sure the React app remains interactive and functional
    - Use TypeScript and maintain type safety
    - Use Tailwind classes for styling consistently
    - Please ONLY return the full React code starting with the imports, nothing else
    - DO NOT START WITH \`\`\`typescript or \`\`\`javascript or \`\`\`tsx
  `;

  if (shadcn && enabledCategories?.length) {
    systemPrompt += `
    There are prestyled shadcn components available from these categories: ${enabledCategories.join(", ")}.
    Use them when appropriate for the modification request.
    `;
  }

  return dedent(systemPrompt);
}

export const runtime = "edge"; 