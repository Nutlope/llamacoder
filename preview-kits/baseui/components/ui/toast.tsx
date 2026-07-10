import * as React from "react"

import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive"
}

type ToastActionElement = React.ReactElement<typeof ToastAction>

function Toast({ className, variant = "default", ...props }: ToastProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border bg-background p-4 text-sm shadow-lg",
        variant === "destructive" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        className
      )}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-medium", className)} {...props} />
}

function ToastDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-muted-foreground text-sm", className)} {...props} />
  )
}

function ToastAction(props: ButtonProps) {
  return <Button size="sm" variant="outline" {...props} />
}

function ToastClose(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      {...props}
    />
  )
}

function ToastViewport(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2"
      {...props}
    />
  )
}

const ToastProvider = React.Fragment

export {
  Toast,
  ToastAction,
  type ToastActionElement,
  ToastClose,
  ToastDescription,
  ToastProvider,
  type ToastProps,
  ToastTitle,
  ToastViewport,
}
