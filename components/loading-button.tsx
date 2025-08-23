import Spinner from "@/components/spinner";
import { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export default function LoadingButton({
  children,
  ...rest
}: ComponentProps<"button">) {
  const { pending } = useFormStatus();

  return (
    <button {...rest} disabled={pending || rest.disabled}>
      <Spinner loading={pending}>{children}</Spinner>
    </button>
  );
}
