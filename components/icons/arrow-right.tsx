import { ComponentProps } from "react";

export default function ArrowRightIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width={12}
      height={6}
      viewBox="0 0 12 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M1 2.519a.5.5 0 000 1v-1zm11 .5L7.003.13v5.777L12 3.02zm-11 .5h6.503v-1H1v1z"
        fill="#fff"
      />
    </svg>
  );
}
