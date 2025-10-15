import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as React from "react";
import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardPortal = HoverCardPrimitive.Portal;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", side = "top", ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    side={side}
    className={cn(
      "z-50 w-64 rounded-xl border border-primary/20 bg-background/95 p-4 text-sm text-foreground shadow-xl backdrop-blur transition animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      className
    )}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardPortal, HoverCardContent };
