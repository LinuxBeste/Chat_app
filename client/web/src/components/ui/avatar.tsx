import { forwardRef, useState } from "react"
import { cn } from "../../lib/utils"
import { BASE_URL } from "../../lib/api"

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

function resolveSrc(src?: string): string | undefined {
  if (!src) return undefined
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src
  return `${BASE_URL}${src}`
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "md", ...props }, ref) => {
    const [error, setError] = useState(false)
    const resolved = resolveSrc(src)
    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full border border-border bg-surface overflow-hidden shrink-0",
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {resolved && !error ? (
          <img src={resolved} alt={alt} className="h-full w-full object-cover" onError={() => setError(true)} />
        ) : (
          <span className="font-medium text-text-secondary">{fallback}</span>
        )}
      </div>
    )
  },
)
Avatar.displayName = "Avatar"

export { Avatar }
