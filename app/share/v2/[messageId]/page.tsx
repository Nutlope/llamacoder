import CodeRunner from "@/components/code-runner";
import client from "@/lib/prisma";
import { extractFirstCodeBlock } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function SharePage({
  params,
}: {
  params: Promise<{ messageId: string }>;
}) {
  const { messageId } = await params;

  const message = await client.message.findUnique({ where: { id: messageId } });
  if (!message) {
    notFound();
  }

  const app = extractFirstCodeBlock(message.content);
  if (!app || !app.language) {
    notFound();
  }

  return (
    <div className="flex h-full items-center justify-center">
      <CodeRunner language={app.language} code={app.code} />
    </div>
  );
}
