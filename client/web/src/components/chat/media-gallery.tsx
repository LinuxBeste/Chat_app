import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { api, BASE_URL } from "../../lib/api"
import { Card, CardHeader, CardTitle } from "../ui/card"

interface MediaItem {
  id: string
  content: string
  type: string
  createdAt: string
  sender: { username: string }
  conversationId: string
  encrypted?: string
}

export function MediaGallery() {
  const { t } = useTranslation()
  const [items, setItems] = useState<MediaItem[]>([])

  useEffect(() => {
    api<{ id: string }[]>("/api/conversations")
      .then(async (convs) => {
        const results = await Promise.all(
          convs.map((conv) => api<MediaItem[]>(`/api/conversations/${conv.id}/messages?limit=50`)),
        )
        const all = results
          .flat()
          .filter((m) => m.type === "image" && m.encrypted !== "true")
        setItems(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      })
      .catch(() => {})
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chat.mediaGallery")}</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted px-6 pb-6">{t("chat.noMediaShared")}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-2">
          {items.map((item) => {
            const src = item.content.startsWith("http") ? item.content : `${BASE_URL}${item.content}`
            return (
              <a
                key={item.id}
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-2xl overflow-hidden border border-border hover:scale-[1.02] transition-all"
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </a>
            )
          })}
        </div>
      )}
    </Card>
  )
}
