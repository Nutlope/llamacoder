import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Toast,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { dismiss, useToast } from "@/components/ui/use-toast"

function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastViewport>
      {toasts.map(({ id, title, description, action, variant }) => (
        <Toast key={id} variant={variant}>
          <div className="grid gap-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </div>
          {action}
          <Button
            aria-label="Dismiss toast"
            className="ml-auto size-7"
            size="icon-sm"
            variant="ghost"
            onClick={() => dismiss(id)}
          >
            <XIcon className="size-4" />
          </Button>
        </Toast>
      ))}
    </ToastViewport>
  )
}

export { Toaster }
