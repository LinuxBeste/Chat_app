import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-2xl border border-border bg-surface px-4 py-2 text-sm text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
