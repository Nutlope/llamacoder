import Spinner from "@/components/spinner";

type ScreenshotAttachmentProps = {
  hidden: boolean;
  loading: boolean;
  onRemove: () => void;
  previewUrl?: string;
};

export default function ScreenshotAttachment({
  hidden,
  loading,
  onRemove,
  previewUrl,
}: ScreenshotAttachmentProps) {
  if (!loading && !previewUrl) {
    return null;
  }

  return (
    <div
      data-testid="screenshot-attachment"
      className={`${hidden ? "invisible" : ""} relative mx-3 mt-3`}
    >
      <div className="relative mb-2 h-16 w-[68px] overflow-hidden rounded bg-gray-200 outline outline-1 -outline-offset-1 outline-black/10">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt="screenshot"
            src={previewUrl}
            data-testid="screenshot-preview"
            className={`h-full w-full object-cover transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
          />
        )}
        {loading && (
          <div
            data-testid="screenshot-upload-progress"
            className="absolute inset-0 flex items-center justify-center rounded bg-white/60 backdrop-blur-[1px]"
          >
            <Spinner />
          </div>
        )}
      </div>
      {previewUrl && (
        <button
          type="button"
          id="x-circle-icon"
          aria-label="Remove screenshot"
          className="absolute -right-3 -top-4 left-14 z-10 size-5 rounded-full bg-white text-gray-900 hover:text-gray-500"
          onClick={onRemove}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
