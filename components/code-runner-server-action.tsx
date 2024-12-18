"use client";

import PlayIcon from "@/components/icons/play-icon";
import Spinner from "@/components/spinner";
import { useActionState } from "react";

export default function CodeRunnerServerAction({
  code,
  runCodeAction,
}: {
  code: string;
  runCodeAction: (v: string) => Promise<string>;
}) {
  const [state, action, isPending] = useActionState(async () => {
    return runCodeAction(code);
  }, null);

  return (
    <div>
      {state === null ? (
        <div className="flex flex-col items-center justify-center">
          <p>Run the code to generate an output</p>

          <form action={action} className="mt-4">
            <button
              disabled={isPending}
              className="inline-flex rounded border border-gray-300 px-2.5 py-1 text-sm text-gray-600 transition enabled:hover:bg-gray-100 disabled:opacity-75"
            >
              <Spinner loading={isPending}>
                <span className="inline-flex items-center gap-1">
                  <PlayIcon className="size-4" />
                  Run Code
                </span>
              </Spinner>
            </button>
          </form>
        </div>
      ) : (
        <div>{state}</div>
      )}
    </div>
  );
}
