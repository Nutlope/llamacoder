import * as React from "react"

import { cn } from "@/lib/utils"

const TypographyH1 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1
    className={cn("scroll-m-20 text-4xl font-bold tracking-tight", className)}
    {...props}
  />
)

const TypographyH2 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn(
      "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight",
      className
    )}
    {...props}
  />
)

const TypographyH3 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}
    {...props}
  />
)

const TypographyH4 = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h4
    className={cn("scroll-m-20 text-xl font-semibold tracking-tight", className)}
    {...props}
  />
)

const TypographyP = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("leading-7", className)} {...props} />
)

const TypographyBlockquote = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote
    className={cn("mt-6 border-l-2 pl-6 italic", className)}
    {...props}
  />
)

const TypographyLead = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-xl text-muted-foreground", className)} {...props} />
)

const TypographyLarge = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("text-lg font-semibold", className)} {...props} />
)

const TypographySmall = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <small className={cn("text-sm font-medium leading-none", className)} {...props} />
)

const TypographyMuted = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground", className)} {...props} />
)

export {
  TypographyBlockquote,
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyLarge,
  TypographyLead,
  TypographyMuted,
  TypographyP,
  TypographySmall,
}
