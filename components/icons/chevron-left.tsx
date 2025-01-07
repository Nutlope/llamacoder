import { ComponentProps } from "react";

export default function ChevronLeftIcon(props: ComponentProps<"svg">) {
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
        d="M8.75 10.5L5.25 7l3.5-3.5"
        stroke="currentColor"
        strokeWidth={0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
