import { forwardRef } from "react"
import { cn } from "../../lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: "sm" | "md" | "lg"
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full border border-border bg-surface overflow-hidden shrink-0",
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium text-text-secondary">{fallback}</span>
      )}
    </div>
  ),
)
Avatar.displayName = "Avatar"

export { Avatar }
