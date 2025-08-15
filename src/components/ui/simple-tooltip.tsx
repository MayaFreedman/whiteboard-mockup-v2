import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

interface SimpleTooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  delayDuration?: number
}

export const SimpleTooltip: React.FC<SimpleTooltipProps> = ({
  children,
  content,
  side = "top",
  sideOffset = 4,
  delayDuration = 500
}) => {
  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "z-50 overflow-hidden rounded-md bg-gray-900 dark:bg-gray-100 px-2 py-1.5 text-xs text-white dark:text-gray-900 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        )}
      >
        {content}
        <TooltipPrimitive.Arrow className="fill-gray-900 dark:fill-gray-100" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Root>
  )
}