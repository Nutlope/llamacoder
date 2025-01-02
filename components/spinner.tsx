"use client";

import { ReactNode } from "react";

export default function Spinner({
  loading = true,
  children,
  className = "size-3",
}: {
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  if (!loading) return children;

  const spinner = (
    <>
      <span className={`relative inline-flex ${className}`}>
        {Array.from(Array(8).keys()).map((i) => (
          <span
            key={i}
            className="before:bg-current absolute left-[calc(50%-12.5%/2)] top-0 h-[100%] w-[12.5%] animate-[spinner_800ms_linear_infinite] before:block before:h-[30%] before:w-[100%] before:rounded-full"
            style={{
              transform: `rotate(${45 * i}deg)`,
              animationDelay: `calc(-${8 - i} / 8 * 800ms)`,
            }}
          />
        ))}
      </span>
    </>
  );

  if (!children) return spinner;

  return (
    <span className="relative flex h-full items-center justify-center">
      <span className="invisible flex">{children}</span>

      <span className="absolute inset-0 flex items-center justify-center">
        {spinner}
      </span>
    </span>
  );
}
