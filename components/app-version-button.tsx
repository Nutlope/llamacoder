import ArrowLeftIcon from "@/components/icons/arrow-left";
import { toTitleCase } from "@/lib/utils";

export function AppVersionButton({
  version,
  filename,
  fileCount,
  appTitle,
  generating,
  disabled,
  onClick,
  isActive,
}: {
  version: number;
  filename?: { name: string; extension: string };
  fileCount?: number;
  appTitle?: string;
  generating?: boolean;
  disabled: boolean;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div className="my-4">
      <button
        disabled={disabled}
        className={`inline-flex w-full items-center gap-2 rounded-lg border-4 border-gray-300 p-1.5 ${
          generating
            ? "animate-pulse"
            : isActive !== undefined
              ? isActive
                ? "bg-white"
                : "bg-gray-300 hover:border-gray-400 hover:bg-gray-400"
              : ""
        }`}
        onClick={onClick}
      >
        <div
          className={`flex size-8 items-center justify-center rounded font-bold ${
            isActive !== undefined
              ? isActive
                ? "bg-gray-300"
                : "bg-gray-200"
              : "bg-gray-300"
          }`}
        >
          V{version}
        </div>
        <div className="flex flex-col gap-0.5 text-left leading-none">
          {generating ? (
            <div className="text-sm font-medium leading-none">
              Generating...
            </div>
          ) : fileCount ? (
            <>
              <div className="text-sm font-medium leading-none">
                Version {version}
                {appTitle ? ` - ${appTitle}` : ""}
              </div>
              <div className="text-xs leading-none text-gray-500">
                {fileCount} file{fileCount !== 1 ? "s" : ""} edited
              </div>
            </>
          ) : filename ? (
            <>
              <div className="text-sm font-medium leading-none">
                {toTitleCase(filename.name)} {version !== 1 && `v${version}`}
              </div>
              <div className="text-xs leading-none text-gray-500">
                {filename.name}
                {version !== 1 && `-v${version}`}
                {"."}
                {filename.extension}
              </div>
            </>
          ) : null}
        </div>
        {!generating && (
          <div className="ml-auto">
            {isActive ? (
              <ArrowLeftIcon />
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 0.5L11 11M5.16667 2.25L8.66667 5.75M8.66667 5.75L5.16667 9.25M8.66667 5.75L0.5 5.75"
                  stroke="black"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
