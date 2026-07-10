import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const project = process.env.BRAINTRUST_PROJECT ?? "llamacoder";
const model = process.env.E2E_MODEL ?? "zai-org/GLM-5.2";
const marker = `BT-E2E-${randomUUID()}`;
const prompt = `Build a tiny trace verification app with a counter and reset button. Verification marker ${marker}.`;

type LogRow = {
  error: unknown;
  input: unknown;
  is_root: boolean;
  metadata: Record<string, unknown> | null;
  metrics: Record<string, number>;
  output: unknown;
  root_span_id: string;
  span_attributes: { name?: string };
  span_id: string;
  span_parents: string[] | null;
};

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `${path} returned ${response.status}: ${await response.text()}`,
    );
  }

  return response;
}

function queryRows(chatId: string): LogRow[] {
  const output = execFileSync(
    "node_modules/.bin/bt",
    [
      "view",
      "logs",
      "-p",
      project,
      "--env-file",
      ".env",
      "--no-input",
      "--quiet",
      "--json",
      "--window",
      "30m",
      "--limit",
      "20",
      "--preview-length",
      "100000",
      "--list-mode",
      "spans",
      "--search",
      chatId,
    ],
    { encoding: "utf8" },
  );

  const result = JSON.parse(output) as { items?: Array<{ row: LogRow }> };
  return result.items?.map((item) => item.row) ?? [];
}

function assertTrace(rows: LogRow[], chatId: string) {
  const expectedNames = [
    "llamacoder.create-chat",
    "llamacoder.generate-chat-title",
    "llamacoder.stream-generation",
  ];
  const names = rows
    .map((row) => row.span_attributes.name)
    .filter((name): name is string => Boolean(name))
    .sort();
  const rootIds = new Set(rows.map((row) => row.root_span_id));
  const roots = rows.filter((row) => row.is_root);
  const create = rows.find(
    (row) => row.span_attributes.name === "llamacoder.create-chat",
  );
  const generation = rows.find(
    (row) => row.span_attributes.name === "llamacoder.stream-generation",
  );
  const title = rows.find(
    (row) => row.span_attributes.name === "llamacoder.generate-chat-title",
  );

  const failures = [
    [
      JSON.stringify(names) === JSON.stringify(expectedNames),
      `span names: ${names.join(", ")}`,
    ],
    [rootIds.size === 1, `unique root spans: ${rootIds.size}`],
    [roots.length === 1 && roots[0] === create, `root rows: ${roots.length}`],
    [
      rows.every((row) => row.error == null),
      "one or more spans contain errors",
    ],
    [Boolean(create?.output), "create-chat output is missing"],
    [Boolean(generation?.output), "generation output is missing"],
    [
      generation?.metadata?.completed === true,
      "generation is not marked completed",
    ],
    [
      (generation?.metrics.tokens ?? 0) > 0,
      "generation token metrics are missing",
    ],
    [
      (generation?.metrics.estimated_cost ?? 0) > 0,
      "generation estimated cost is missing",
    ],
    [Boolean(title?.output), "title output is missing"],
    [(title?.metrics.tokens ?? 0) > 0, "title token metrics are missing"],
  ].filter(([passed]) => !passed);

  if (failures.length > 0) {
    throw new Error(
      `Braintrust trace verification failed for ${chatId}:\n${failures
        .map(([, message]) => `- ${message}`)
        .join("\n")}`,
    );
  }

  return {
    chatId,
    rootSpanId: roots[0].root_span_id,
    spans: names,
    generationTokens: generation?.metrics.tokens,
    generationEstimatedCost: generation?.metrics.estimated_cost,
  };
}

async function main() {
  const createResponse = await post("/api/create-chat", { prompt, model });
  const { chatId, lastMessageId } = (await createResponse.json()) as {
    chatId: string;
    lastMessageId: string;
  };

  const generationResponse = await post(
    "/api/get-next-completion-stream-promise",
    { messageId: lastMessageId, model },
  );
  const generatedApp = await generationResponse.text();
  if (!generatedApp.includes("```")) {
    throw new Error("Generation did not return a code block");
  }

  await post("/api/generate-chat-title", { chatId });

  let rows: LogRow[] = [];
  for (let attempt = 0; attempt < 15; attempt += 1) {
    rows = queryRows(chatId);
    if (rows.length >= 3) break;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  console.log(JSON.stringify(assertTrace(rows, chatId), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
