import { ComponentProps } from "react";

export default function LogoSmall(props: ComponentProps<"svg">) {
  return <img src="/logo.svg" className="size-[24px]" />;
}
