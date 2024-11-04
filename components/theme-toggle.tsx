"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative rounded-md p-2 hover:bg-gray-100 dark:bg-dark-background-secondary dark:border dark:border-dark-border dark:hover:bg-dark-background-tertiary"
    >
      <SunIcon className="h-5 w-5 text-gray-600 transition-all dark:text-dark-primary dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-gray-600 transition-all dark:text-dark-primary rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}