import { notFound } from "next/navigation";
import CodeViewer from "@/components/code-viewer";
import client from "@/lib/prisma";
import type { Metadata } from "next";
import { cache } from "react";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const generatedApp = await getGeneratedAppByID(params.id);

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
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  // if process.env.DATABASE_URL is not set, throw an error
  if (typeof params.id !== "string") {
    notFound();
  }

  const generatedApp = await getGeneratedAppByID(params.id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  return <CodeViewer code={generatedApp.code} />;
}

const getGeneratedAppByID = cache(async (id: string) => {
  return client.generatedApp.findUnique({
    where: {
      id,
    },
  });
});
