"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ComponentProps } from "react";

type NewLinkProps = {
  newQuery?: Record<string, string | number | null>;
  href?: string;
};

export default function NewLink({
  href,
  newQuery,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & NewLinkProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  let finalHref = href || pathname;

  if (newQuery) {
    const params = new URLSearchParams(searchParams.toString());

    // Then, add new params from newQuery
    Object.entries(newQuery).forEach(([key, value]) => {
      if (value) {
        params.set(key, value.toString());
      } else if (value === null) {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    finalHref = `${finalHref}${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <Link href={finalHref} {...props}>
      {children}
    </Link>
  );
}
