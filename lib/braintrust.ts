import {
  initLogger,
  type Logger,
  type Span,
  type StartSpanArgs,
} from "braintrust";

let logger: Logger<true> | null | undefined;

export function getBraintrustLogger() {
  if (!process.env.BRAINTRUST_API_KEY) return undefined;

  if (logger !== undefined) {
    return logger ?? undefined;
  }

  try {
    logger = initLogger({
      apiKey: process.env.BRAINTRUST_API_KEY,
      projectName: process.env.BRAINTRUST_PROJECT ?? "llamacoder",
      asyncFlush: true,
    });
  } catch (error) {
    logger = null;
    console.warn("Braintrust logger initialization failed:", error);
  }

  return logger ?? undefined;
}

export function startBraintrustSpan(args: StartSpanArgs) {
  try {
    return getBraintrustLogger()?.startSpan(args);
  } catch (error) {
    console.warn("Braintrust span initialization failed:", error);
    return undefined;
  }
}

export async function flushBraintrust() {
  try {
    await logger?.flush();
  } catch (error) {
    console.warn("Braintrust flush failed:", error);
  }
}

export async function flushBraintrustSpan(span: Span | undefined) {
  try {
    await span?.flush();
  } catch (error) {
    console.warn("Braintrust span flush failed:", error);
  }
}

export function serializeBraintrustError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return { message: String(error) };
}
