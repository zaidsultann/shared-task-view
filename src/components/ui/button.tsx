import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-medium hover:scale-105 active:scale-95",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-medium",
        outline:
          "border border-input bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:shadow-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-soft",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-gradient-success text-success-foreground hover:shadow-medium hover:scale-105 active:scale-95",
        warning: "bg-gradient-warning text-warning-foreground hover:shadow-medium hover:scale-105 active:scale-95",
        premium: "bg-gradient-to-r from-primary-500 to-primary-700 text-white hover:from-primary-600 hover:to-primary-800 hover:shadow-large hover:scale-105 active:scale-95 shadow-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }