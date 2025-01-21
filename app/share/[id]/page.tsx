import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import CodeRunner from "@/components/code-runner";
import { getPrisma } from "@/lib/prisma";

/*
  This is the Share page for v1 apps, before the chat interface was added.

  It's here to preserve existing URLs.
*/
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const generatedApp = await getGeneratedAppByID((await params).id);

  let prompt = generatedApp?.prompt;
  if (typeof prompt !== "string") {
    notFound();
  }

  let searchParams = new URLSearchParams();
  searchParams.set("prompt", prompt);

  return {
    title: "An app generated on LlamaCoder.io",
    description: `Prompt: ${generatedApp?.prompt}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
    twitter: {
      title: "An app generated on LlamaCoder.io",
      card: "summary_large_image",
      images: [`/api/og?${searchParams}`],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // if process.env.DATABASE_URL is not set, throw an error
  if (typeof id !== "string") {
    notFound();
  }

  const generatedApp = await getGeneratedAppByID(id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  return (
    <div className="flex h-full w-full grow items-center justify-center">
      <CodeRunner language="tsx" code={generatedApp.code} />
    </div>
  );
}

const getGeneratedAppByID = cache(async (id: string) => {
  const prisma = getPrisma();
  return prisma.generatedApp.findUnique({
    where: {
      id,
    },
  });
});
