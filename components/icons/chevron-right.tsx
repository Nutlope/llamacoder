import { ComponentProps } from "react";

export default function ChevronRightIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5.25 10.5L8.75 7l-3.5-3.5"
        stroke="currentColor"
        strokeWidth={0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
