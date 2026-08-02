import { getServerUrl } from "./server-config"

export async function resolveFileUrl(url: string | undefined | null): Promise<string | null> {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) return url
  const base = await getServerUrl()
  return `${base}${url.startsWith("/") ? url : `/${url}`}`
}
