import { useState, useEffect } from "react"
import { Image, type ImageProps } from "react-native"
import { resolveFileUrl } from "../../lib/file-url"

interface AvatarImageProps extends Omit<ImageProps, "source"> {
  uri?: string | null
}

export function AvatarImage({ uri, ...props }: AvatarImageProps) {
  const [resolved, setResolved] = useState<string | undefined>(undefined)

  useEffect(() => {
    let active = true
    setResolved(undefined)
    resolveFileUrl(uri).then((u) => {
      if (active) setResolved(u ?? undefined)
    })
    return () => {
      active = false
    }
  }, [uri])

  if (!resolved) return null
  return <Image source={{ uri: resolved }} {...props} />
}
