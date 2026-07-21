import { useState, useEffect } from "react"
import { api } from "../../lib/api"
import { FileText, Image, Film, Music, Archive, Download } from "lucide-react"

interface FileItem {
  id: string
  content: string
  createdAt: string
  sender: { username: string }
  attachment: { url: string; filename: string; mimeType: string; size: number }
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return <Image className="h-5 w-5" />
  if (mime.startsWith("video/")) return <Film className="h-5 w-5" />
  if (mime.startsWith("audio/")) return <Music className="h-5 w-5" />
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar")) return <Archive className="h-5 w-5" />
  return <FileText className="h-5 w-5" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])

  useEffect(() => {
    api<{ id: string }[]>("/api/conversations")
      .then((convs) => {
        if (convs.length > 0) {
          api<FileItem[]>(`/api/conversations/${convs[0].id}/files`)
            .then(setFiles)
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h1 className="text-lg font-semibold text-text-primary mb-4">Shared Files</h1>
      {files.length === 0 ? (
        <p className="text-sm text-text-muted">No files shared yet</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                {fileIcon(f.attachment.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{f.attachment.filename}</p>
                <p className="text-xs text-text-muted">
                  {f.sender.username} · {formatSize(f.attachment.size)}
                </p>
              </div>
              <a
                href={f.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
                aria-label="Download file"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
