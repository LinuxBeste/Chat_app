import { useState, useEffect, useRef, useCallback } from "react"
import { api, apiFormData, BASE_URL } from "../../lib/api"
import { useTranslation } from "react-i18next"
import { useToast } from "../../lib/toast-context"
import {
  FileText, Image, Film, Music, Archive, Download, Upload, FolderPlus,
  Folder, X, Loader2, Trash2, Users,
} from "lucide-react"

interface FileItem {
  id: string
  url: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
  messageId: string | null
  folderId: string | null
}

interface FolderData {
  id: string
  userId: string
  name: string
  parentId: string | null
  createdAt: string
}

interface FolderMember {
  userId: string
  permission: string
  createdAt: string
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
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderData[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [parentFolderId, setParentFolderId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filePreview, setFilePreview] = useState<FileItem | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [folderMembers, setFolderMembers] = useState<FolderMember[]>([])
  const [showFolderMembers, setShowFolderMembers] = useState<string | null>(null)
  const [addMemberId, setAddMemberId] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api<FileItem[]>("/api/files/list").then(setFiles).catch(() => {})
    api<FolderData[]>("/api/files/folders").then(setFolders).catch(() => {})
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const result = await apiFormData<FileItem>("/api/uploads", formData)
      setFiles((prev) => [result, ...prev.filter((f) => f.id !== result.id)])
      showToast(t("files.uploadSuccess"), "success")
    } catch (err: any) {
      showToast(err?.message || t("files.uploadError"))
    }
    setUploading(false)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const folder = await api<FolderData>("/api/files/folders", {
        method: "POST",
        body: JSON.stringify({ name: newFolderName.trim(), parentId: parentFolderId }),
      })
      setFolders((prev) => prev.some((f) => f.id === folder.id) ? prev : [...prev, folder])
      setNewFolderName("")
      setShowNewFolder(false)
      setParentFolderId(null)
    } catch (err: any) {
      showToast(err?.message ?? t("files.folderCreateError"))
    }
  }

  const deleteFolder = async (id: string) => {
    if (!confirm(t("files.deleteFolderConfirm"))) return
    try {
      await api(`/api/files/folders/${id}`, { method: "DELETE" })
      setFolders((prev) => prev.filter((f) => f.id !== id))
    } catch (err: any) {
      showToast(err?.message ?? t("files.folderDeleteError"))
    }
  }

  const openPreview = async (file: FileItem) => {
    setFilePreview(file)
    if (file.mimeType.startsWith("text/") || file.mimeType === "application/pdf") {
      try {
        const res = await fetch(`${BASE_URL}${file.url}`)
        const text = await res.text()
        setPreviewText(text)
      } catch {
        setPreviewText(t("files.cannotPreview"))
      }
    } else {
      setPreviewText(null)
    }
  }

  const loadFolderMembers = async (folderId: string) => {
    try {
      const members = await api<FolderMember[]>(`/api/files/folders/${folderId}/members`)
      setFolderMembers(members)
    } catch (err: any) {
      showToast(err?.message ?? t("files.membersLoadError"))
    }
  }

  const addFolderMember = async () => {
    if (!addMemberId.trim() || !showFolderMembers) return
    try {
      await api(`/api/files/folders/${showFolderMembers}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: addMemberId.trim(), permission: "read" }),
      })
      setAddMemberId("")
      loadFolderMembers(showFolderMembers)
    } catch (err: any) {
      showToast(err?.message ?? t("files.memberAddError"))
    }
  }

  const removeFolderMember = async (userId: string) => {
    if (!showFolderMembers) return
    try {
      await api(`/api/files/folders/${showFolderMembers}/members/${userId}`, { method: "DELETE" })
      setFolderMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch (err: any) {
      showToast(err?.message ?? t("files.memberRemoveError"))
    }
  }

  const getFolderFiles = () => {
    return selectedFolderId ? files.filter((f) => f.folderId === selectedFolderId) : files.filter((f) => !f.folderId)
  }

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData("text/plain", fileId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleFolderDrop = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    const fileId = e.dataTransfer.getData("text/plain")
    if (!fileId) return
    try {
      const updated = await api<FileItem>(`/api/files/${fileId}/move`, {
        method: "PUT",
        body: JSON.stringify({ folderId }),
      })
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, folderId: updated.folderId } : f)))
    } catch (err: any) {
      showToast(err?.message ?? t("files.moveError"))
    }
  }

  const rootFolders = folders.filter((f) => f.parentId === null)
  const currentFiles = getFolderFiles()

  return (
    <div
      className="flex h-full flex-col overflow-y-auto p-6 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-accent/10 rounded-[32px]">
          <div className="flex flex-col items-center gap-3 text-accent">
            <Upload className="h-12 w-12" />
            <p className="text-lg font-medium">{t("files.dropToUpload")}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-text-primary">{t("files.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 h-9 px-4 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t("files.upload")}
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-2xl border border-border text-text-secondary text-sm font-medium hover:bg-white/5 transition-all cursor-pointer"
          >
            <FolderPlus className="h-4 w-4" />
            {t("files.newFolder")}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadFile(file)
            if (fileInputRef.current) fileInputRef.current.value = ""
          }} />
        </div>
      </div>

      {/* Folders */}
      {rootFolders.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-text-muted mb-2">{t("files.folders")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {rootFolders.map((folder) => (
              <div
                key={folder.id}
                onDragOver={handleFolderDragOver}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                className={`relative group rounded-2xl border p-3 cursor-pointer transition-all ${
                  selectedFolderId === folder.id ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/50"
                }`}
                onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
              >
                <Folder className={`h-8 w-8 mb-1 ${selectedFolderId === folder.id ? "text-accent" : "text-text-muted"}`} />
                <p className="text-sm text-text-primary truncate">{folder.name}</p>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowFolderMembers(showFolderMembers === folder.id ? null : folder.id); loadFolderMembers(folder.id) }}
                    className="p-1 rounded-lg text-text-muted hover:text-accent bg-surface/80 hover:bg-surface"
                    title={t("files.manageAccess")}
                  >
                    <Users className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id) }}
                    className="p-1 rounded-lg text-text-muted hover:text-danger bg-surface/80 hover:bg-surface"
                    title={t("files.deleteFolder")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="rounded-2xl border border-border bg-surface p-4 mb-4 flex items-center gap-3">
          <input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t("files.folderNamePlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
            className="flex-1 h-10 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
            autoFocus
          />
          <button
            onClick={createFolder}
            disabled={!newFolderName.trim()}
            className="h-10 px-4 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
          >
            {t("common.create")}
          </button>
          <button
            onClick={() => { setShowNewFolder(false); setNewFolderName("") }}
            className="h-10 w-10 flex items-center justify-center rounded-2xl text-text-muted hover:text-text-primary cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Folder Members Sidebar */}
      {showFolderMembers && (
        <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text-primary">{t("files.folderAccess")}</p>
            <button onClick={() => setShowFolderMembers(null)} className="text-text-muted hover:text-text-primary cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 mb-3">
            {folderMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-between text-sm">
                <span className="text-text-primary font-mono text-xs">{m.userId.slice(0, 8)}...</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted capitalize">{m.permission}</span>
                  <button onClick={() => removeFolderMember(m.userId)} className="text-text-muted hover:text-danger cursor-pointer">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={addMemberId}
              onChange={(e) => setAddMemberId(e.target.value)}
              placeholder={t("files.userIdPlaceholder")}
              className="flex-1 h-9 rounded-2xl border border-border bg-bg-primary px-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
            />
            <button onClick={addFolderMember} className="h-9 px-3 rounded-2xl bg-accent text-white text-sm cursor-pointer">
              {t("common.add")}
            </button>
          </div>
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        {currentFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Upload className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{t("files.noFiles")}</p>
            <p className="text-xs mt-1">{t("files.dropOrUpload")}</p>
          </div>
        ) : (
          currentFiles.map((f) => (
            <div
              key={f.id}
              draggable
              onDragStart={(e) => handleDragStart(e, f.id)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:bg-white/[0.02] transition-all cursor-pointer"
              onClick={() => openPreview(f)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                {fileIcon(f.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{f.filename}</p>
                <p className="text-xs text-text-muted">
                  {formatSize(f.size)} · {f.mimeType}
                </p>
              </div>
              <a
                href={`${BASE_URL}${f.url}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
                aria-label={t("files.download")}
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </div>

      {/* File Preview Modal */}
      {filePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setFilePreview(null); setPreviewText(null) }}>
          <div
            className="w-full max-w-2xl max-h-[80vh] rounded-[32px] border border-border bg-surface shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-text-primary truncate">{filePreview.filename}</h3>
              <button onClick={() => { setFilePreview(null); setPreviewText(null) }} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 pb-5 max-h-[60vh] overflow-y-auto">
              {filePreview.mimeType.startsWith("image/") ? (
                <img src={`${BASE_URL}${filePreview.url}`} alt={filePreview.filename} className="max-w-full rounded-2xl" />
              ) : filePreview.mimeType.startsWith("text/") ? (
                <pre className="text-sm text-text-primary bg-bg-primary rounded-2xl p-4 overflow-x-auto whitespace-pre-wrap font-mono">
                  {previewText ?? t("common.loading")}
                </pre>
              ) : filePreview.mimeType === "application/pdf" ? (
                <iframe src={`${BASE_URL}${filePreview.url}`} className="w-full h-[60vh] rounded-2xl" title={filePreview.filename} />
              ) : (
                <div className="flex flex-col items-center gap-4 py-8 text-text-muted">
                  {fileIcon(filePreview.mimeType)}
                  <p className="text-sm">{t("files.cannotPreview")}</p>
                  <a
                    href={`${BASE_URL}${filePreview.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    {t("files.download")}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
