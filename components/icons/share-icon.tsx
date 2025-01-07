import { ComponentProps } from "react";

export default function ShareIcon(props: ComponentProps<"svg">) {
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
        d="M9.5 2.5H7.9c-.84 0-1.26 0-1.581.163a1.5 1.5 0 00-.656.656c-.163.32-.163.74-.163 1.581v.6m4-3L8 1m1.5 1.5L8 4M4 1H2.9c-.84 0-1.26 0-1.581.163a1.5 1.5 0 00-.656.656C.5 2.139.5 2.559.5 3.4v4.2c0 .84 0 1.26.163 1.581a1.5 1.5 0 00.656.656c.32.163.74.163 1.581.163h4.2c.84 0 1.26 0 1.581-.163a1.5 1.5 0 00.656-.656c.163-.32.163-.74.163-1.581V6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
