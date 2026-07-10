import { notFound } from "next/navigation";
import EvalHarnessClient from "./eval-harness-client";

export default function EvalHarnessPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_EVAL_HARNESS !== "1"
  ) {
    notFound();
  }

  return <EvalHarnessClient />;
}
