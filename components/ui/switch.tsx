import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-[18px] w-[34px] shrink-0 items-center rounded-full border border-transparent bg-gray-300 outline-none transition-all focus-visible:ring-2 focus-visible:ring-blue-300 data-[checked]:bg-blue-500 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[14px] rounded-full bg-background shadow transition-transform group-data-[checked]/switch:translate-x-4 group-data-[unchecked]/switch:translate-x-0 group-data-[size=sm]/switch:size-3 group-data-[size=sm]/switch:group-data-[checked]/switch:translate-x-2.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
