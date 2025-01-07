import { ComponentProps } from "react";

export default function XIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.717 10L4.302 6.405 1.279 10H0l3.734-4.44L0 0h3.283L5.56 3.389 8.411 0H9.69L6.129 4.235 10 10H6.717zM8.14 8.986H7.28L1.83 1.014h.861l2.182 3.192.378.554L8.14 8.986z"
        fill="currentColor"
      />
    </svg>
  );
}
