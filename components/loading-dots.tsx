"use client";

import { useTheme } from "next-themes";
import styles from "./loading-dots.module.css";

export default function LoadingDots({
  color = "#000",
  style = "small",
}: {
  color: string;
  style: string;
}) {
  const { theme } = useTheme();
  const dotColor = theme === "dark" ? "#F3F4F6" : color;

  return (
    <span className={style == "small" ? styles.loading2 : styles.loading}>
      <span style={{ backgroundColor: dotColor }} />
      <span style={{ backgroundColor: dotColor }} />
      <span style={{ backgroundColor: dotColor }} />
    </span>
  );
}
