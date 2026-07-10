import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { screenshotToCodePrompt } from "@/lib/prompts";
import { buildProductionCodingPrompt } from "@/lib/prompt-config";
import Together from "together-ai";
import { resolveModel } from "@/lib/constants";
import { createLocalChatTitle } from "@/lib/chat-title";
import {
  flushBraintrust,
  getBraintrustLogger,
  logBraintrustFailure,
  serializeBraintrustError,
} from "@/lib/braintrust";
import type { Span } from "braintrust";

export async function POST(request: NextRequest) {
  const logger = getBraintrustLogger();
  let traceStarted = false;

  try {
    const body = await request.json();
    const { prompt, model, screenshotUrl } = body;
    const resolvedModel = resolveModel(model);
    const chatId = createId();

    const createChat = async (rootSpan?: Span) => {
      let fullScreenshotDescription;
      if (screenshotUrl) {
        try {
          const describeScreenshot = async (span?: Span) => {
            const startedAt = performance.now();
            const screenshotModel = "moonshotai/Kimi-K2.7-Code";
            let options: ConstructorParameters<typeof Together>[0] = {};
            if (process.env.HELICONE_API_KEY) {
              options.baseURL = "https://together.helicone.ai/v1";
              options.defaultHeaders = {
                "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
                "Helicone-Property-appname": "LlamaCoder",
                "Helicone-Session-Id": chatId,
                "Helicone-Session-Name": "LlamaCoder Chat",
              };
            }

            const together = new Together(options);
            const screenshotResponse = await together.chat.completions.create({
              model: screenshotModel,
              reasoning: { enabled: false },
              temperature: 0.4,
              max_tokens: 1000,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: screenshotToCodePrompt },
                    {
                      type: "image_url",
                      image_url: {
                        url: screenshotUrl,
                      },
                    },
                  ],
                },
              ],
            });

            const description = screenshotResponse.choices[0].message?.content;
            const usage = screenshotResponse.usage ?? undefined;
            span?.log({
              output: description,
              metadata: {
                model: screenshotModel,
                provider: "together",
              },
              metrics: {
                duration_ms: performance.now() - startedAt,
                prompt_tokens: usage?.prompt_tokens ?? 0,
                completion_tokens: usage?.completion_tokens ?? 0,
                tokens: usage?.total_tokens ?? 0,
              },
            });
            return description;
          };

          fullScreenshotDescription = rootSpan
            ? await rootSpan.traced((span) => describeScreenshot(span), {
                name: "llamacoder.describe-screenshot",
                type: "llm",
                event: {
                  input: {
                    prompt,
                    hasScreenshot: true,
                  },
                  metadata: {
                    chatId,
                    route: "/api/create-chat",
                    provider: "together",
                  },
                },
              })
            : await describeScreenshot();
        } catch (err) {
          rootSpan?.log({
            error: serializeBraintrustError(err),
            metadata: {
              chatId,
              screenshotProcessingFailed: true,
            },
          });
          console.warn(
            "Screenshot processing failed, continuing without it:",
            err,
          );
        }
      }

      let userMessage: string;
      if (fullScreenshotDescription) {
        userMessage =
          prompt +
          "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
          fullScreenshotDescription;
      } else {
        userMessage = prompt;
      }

      const prisma = getPrisma();
      const lastMessageId = createId();
      const braintrustParent = await rootSpan?.export();
      await prisma.chat.create({
        data: {
          id: chatId,
          model: resolvedModel,
          // The High-quality toggle was removed (benchmark: worse reliability, no
          // quality gain). All generations use the single minimal-v1 × inline path.
          quality: "low",
          prompt,
          title: createLocalChatTitle(prompt),
          braintrustParent,
          shadcn: true,
          messages: {
            create: [
              {
                id: createId(),
                role: "system",
                content: buildProductionCodingPrompt(),
                position: 0,
              },
              {
                id: lastMessageId,
                role: "user",
                content: userMessage,
                position: 1,
              },
            ],
          },
        },
      });

      rootSpan?.log({
        output: {
          chatId,
          lastMessageId,
        },
        metadata: {
          completed: true,
        },
      });

      return NextResponse.json({
        chatId,
        lastMessageId,
      });
    };

    if (!logger) return await createChat();

    traceStarted = true;
    const response = await logger.traced((span) => createChat(span), {
      name: "llamacoder.create-chat",
      type: "task",
      event: {
        input: {
          prompt,
          requestedModel: model,
          hasScreenshot: Boolean(screenshotUrl),
        },
        metadata: {
          chatId,
          resolvedModel,
          route: "/api/create-chat",
        },
      },
    });
    await flushBraintrust();
    return response;
  } catch (error) {
    console.error("Error creating chat:", error);
    if (!traceStarted) {
      await logBraintrustFailure(
        {
          name: "llamacoder.create-chat",
          type: "task",
          event: {
            metadata: {
              route: "/api/create-chat",
              phase: "request-validation",
            },
          },
        },
        error,
      );
    }
    await flushBraintrust();
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}

function createId(size = 16) {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => alphabet[byte & 63]).join("");
}
