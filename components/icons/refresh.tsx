import { ComponentProps } from "react";

export default function RefreshIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width={10}
      height={11}
      viewBox="0 0 10 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9.226 5.947A4.25 4.25 0 011.32 7.626l-.125-.217m-.42-2.356A4.25 4.25 0 018.68 3.374l.124.217M.747 8.533l.366-1.366 1.366.366M7.52 3.467l1.366.366.366-1.366"
        stroke="currentColor"
        strokeWidth={0.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
