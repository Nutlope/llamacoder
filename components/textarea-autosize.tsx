"use client";

import { ComponentProps, useEffect, useRef, useState } from "react";

export default function TextareaAutosize({
  value,
  defaultValue,
  onChange,
  ref,
  ...rest
}: ComponentProps<"textarea">) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue || "");

  const activeValue = value ?? internalValue;
  const activeRef = ref && typeof ref !== "function" ? ref : internalRef;

  useEffect(() => {
    if (activeRef.current) {
      // Reset height to auto to get the correct scrollHeight
      activeRef.current.style.height = "auto";
      // Set the height to the scrollHeight
      activeRef.current.style.height = `${activeRef.current.scrollHeight}px`;
    }
  }, [activeRef, activeValue]);

  return (
    <textarea
      value={activeValue}
      onChange={
        typeof value === "undefined"
          ? (e) => {
              setInternalValue(e.target.value);
            }
          : onChange
      }
      ref={activeRef}
      style={{ resize: "none" }}
      {...rest}
    />
  );
}
