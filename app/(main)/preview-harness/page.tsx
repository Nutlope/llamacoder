import { notFound } from "next/navigation";
import PreviewHarnessClient from "./preview-harness-client";

export default function PreviewHarnessPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_PREVIEW_HARNESS !== "1"
  ) {
    notFound();
  }

  return <PreviewHarnessClient />;
}
