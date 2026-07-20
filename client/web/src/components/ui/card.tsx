import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-border bg-surface p-6",
        hover && "transition-all duration-200 hover:scale-[1.01] hover:border-text-muted/30",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
Card.displayName = "Card"

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("mb-5 flex items-center justify-between", className)} {...props} />
  ),
)
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-semibold text-text-primary", className)} {...props} />
  ),
)
CardTitle.displayName = "CardTitle"

export { Card, CardHeader, CardTitle }
export type { CardProps }
