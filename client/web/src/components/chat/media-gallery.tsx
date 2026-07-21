import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { Card, CardHeader, CardTitle } from "../ui/card"

interface MediaItem {
  id: string
  content: string
  type: string
  createdAt: string
  sender: { username: string }
  conversationId: string
}

export function MediaGallery() {
  const [items, setItems] = useState<MediaItem[]>([])

  useEffect(() => {
    api<MediaItem[]>("/api/conversations")
      .then(async (convs: any[]) => {
        const all: MediaItem[] = []
        for (const conv of convs) {
          const msgs = await api<MediaItem[]>(`/api/conversations/${conv.id}/messages?limit=50`)
          all.push(...msgs.filter((m) => m.type === "image"))
        }
        setItems(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      })
      .catch(() => {})
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Gallery</CardTitle>
      </CardHeader>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted px-6 pb-6">No media shared yet</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 p-2">
          {items.map((item) => (
            <a
              key={item.id}
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-2xl overflow-hidden border border-border hover:scale-[1.02] transition-all"
            >
              <img src={item.content} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </Card>
  )
}
