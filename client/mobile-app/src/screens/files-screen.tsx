import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native"
import { api, apiFormData } from "../lib/api"
import * as DocumentPicker from "expo-document-picker"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as Clipboard from "expo-clipboard"
import * as WebBrowser from "expo-web-browser"
import { resolveFileUrl } from "../lib/file-url"
import { isTextFile } from "../lib/file-types"
import { FileText, Folder, X, Film, Music, Archive, Download, Users, Copy } from "lucide-react-native"
import { Linking } from "react-native"
import { useTheme } from "../lib/theme-context"

interface FileEntry {
  id: string
  name?: string
  filename?: string
  type?: string
  mimeType?: string
  size: number
  url?: string
  folderId?: string
  createdAt?: string
}

interface FolderEntry {
  id: string
  name: string
}

export function FilesScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { c } = useTheme()

  const [files, setFiles] = useState<FileEntry[]>([])
  const [folders, setFolders] = useState<FolderEntry[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null)
  const [renameName, setRenameName] = useState("")
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [previewTextLoading, setPreviewTextLoading] = useState(false)
  const [previewTextError, setPreviewTextError] = useState(false)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [moveTarget, setMoveTarget] = useState<FileEntry | null>(null)
  const [showMoveModal, setShowMoveModal] = useState(false)

  const load = useCallback(() => {
    api<FileEntry[]>("/api/files/list")
      .then((data) =>
        setFiles(
          data.map((f) => ({
            ...f,
            name: f.name ?? f.filename ?? "Unknown file",
            type: f.type ?? f.mimeType ?? "application/octet-stream",
          })),
        ),
      )
      .catch(() => {})
    api<FolderEntry[]>("/api/files/folders")
      .then(setFolders)
      .catch(() => {})
  }, [])

  const filteredFiles = activeFolder ? files.filter((f) => f.folderId === activeFolder) : files

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const missing = files.filter((f) => f.url && !resolvedUrls[f.id])
    if (missing.length === 0) return
    Promise.all(missing.map(async (f) => ({ id: f.id, url: (await resolveFileUrl(f.url)) || "" }))).then((pairs) => {
      setResolvedUrls((prev) => {
        const next = { ...prev }
        for (const p of pairs) if (p.url) next[p.id] = p.url
        return next
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const uploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0]
        const formData = new FormData()
        formData.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as any)
        await apiFormData("/api/uploads", formData)
        load()
      }
    } catch {}
  }

  const deleteFolder = (id: string) => {
    Alert.alert("Delete Folder", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          api(`/api/files/folders/${id}`, { method: "DELETE" })
            .then(load)
            .catch(() => {})
        },
      },
    ])
  }

  const createFolder = async () => {
    if (!folderName.trim()) return
    try {
      await api("/api/files/folders", { method: "POST", body: JSON.stringify({ name: folderName.trim() }) })
      setFolderName("")
      setFolderModal(false)
      load()
    } catch {}
  }

  const deleteFile = (id: string) => {
    Alert.alert(t("common.delete"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          api(`/api/files/${id}`, { method: "DELETE" })
            .then(load)
            .catch(() => {})
        },
      },
    ])
  }

  const renameFile = async () => {
    if (!renameTarget || !renameName.trim()) return
    try {
      await api(`/api/files/${renameTarget.id}/rename`, {
        method: "PUT",
        body: JSON.stringify({ filename: renameName.trim() }),
      })
      setRenameTarget(null)
      load()
    } catch {}
  }

  const moveFile = async (folderId: string | null) => {
    if (!moveTarget) return
    try {
      await api(`/api/files/${moveTarget.id}/move`, { method: "PUT", body: JSON.stringify({ folderId }) })
      setMoveTarget(null)
      setShowMoveModal(false)
      load()
    } catch {}
  }

  const [folderMembers, setFolderMembers] = useState<{ userId: string; permission: string }[]>([])
  const [showFolderMembers, setShowFolderMembers] = useState<string | null>(null)
  const [addMemberId, setAddMemberId] = useState("")

  const loadFolderMembers = async (folderId: string) => {
    try {
      const members = await api<{ userId: string; permission: string }[]>(`/api/files/folders/${folderId}/members`)
      setFolderMembers(members)
    } catch {}
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
    } catch {}
  }

  const removeFolderMember = async (userId: string) => {
    if (!showFolderMembers) return
    try {
      await api(`/api/files/folders/${showFolderMembers}/members/${userId}`, { method: "DELETE" })
      setFolderMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch {}
  }

  const openPreview = (item: FileEntry) => {
    setPreviewFile(item)
    setPreviewText(null)
    setPreviewTextError(false)
    if (!isTextFile(item.type, item.name)) return
    setPreviewTextLoading(true)
    resolveFileUrl(item.url)
      .then((abs) => {
        if (!abs) {
          setPreviewTextLoading(false)
          setPreviewTextError(true)
          return null
        }
        return fetch(abs)
          .then((r) => {
            if (!r.ok) throw new Error(String(r.status))
            return r.text()
          })
          .then((text) => {
            setPreviewText(text)
            setPreviewTextLoading(false)
          })
      })
      .catch(() => {
        setPreviewTextLoading(false)
        setPreviewTextError(true)
      })
  }

  const openPdf = async (item: FileEntry) => {
    const abs = await resolveFileUrl(item.url)
    if (abs) await WebBrowser.openBrowserAsync(abs)
  }

  const openExternal = async (item: FileEntry) => {
    const abs = await resolveFileUrl(item.url)
    if (abs) await Linking.openURL(abs)
  }

  const handleFileLongPress = (item: FileEntry) => {
    Alert.alert(item.name, "", [
      {
        text: "Rename",
        onPress: () => {
          setRenameTarget(item)
          setRenameName(item.name)
        },
      },
      {
        text: "Move to folder",
        onPress: () => {
          setMoveTarget(item)
          setShowMoveModal(true)
        },
      },
      { text: "Delete", style: "destructive", onPress: () => deleteFile(item.id) },
      { text: "Cancel", style: "cancel" },
    ])
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <Text style={[s.title, { color: c.text }]}>{t("files.title")}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.accent }]} onPress={uploadFile}>
            <Text style={s.actionText}>{t("files.upload")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: c.accent }]} onPress={() => setFolderModal(true)}>
            <Text style={s.actionText}>{t("files.newFolder")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {folders.length > 0 && (
        <>
          <ScrollView
            horizontal
            style={[s.folderRow, { borderBottomColor: c.borderLight }]}
            showsHorizontalScrollIndicator={false}
          >
            {activeFolder && (
              <TouchableOpacity
                style={[s.folderChip, s.folderChipActive, { backgroundColor: c.accent }]}
                onPress={() => setActiveFolder(null)}
              >
                <Text style={s.folderChipText}>All</Text>
              </TouchableOpacity>
            )}
            {folders.map((f) => (
              <View
                key={f.id}
                style={[
                  s.folderChip,
                  { backgroundColor: c.surfaceAlt },
                  activeFolder === f.id && [s.folderChipActive, { backgroundColor: c.accent }],
                ]}
              >
                <TouchableOpacity
                  onPress={() => setActiveFolder(activeFolder === f.id ? null : f.id)}
                  onLongPress={() => deleteFolder(f.id)}
                >
                  <Text style={[s.folderChipText, { color: c.text }]}>{f.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginLeft: 4 }}
                  onPress={() => {
                    setShowFolderMembers(showFolderMembers === f.id ? null : f.id)
                    loadFolderMembers(f.id)
                  }}
                >
                  <Users size={14} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </>
      )}
      <FlatList
        data={filteredFiles}
        keyExtractor={(f) => f.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        renderItem={({ item }) => {
          const isImage = item.type?.startsWith("image/")
          const isVideo = item.type?.startsWith("video/")
          const isAudio = item.type?.startsWith("audio/")
          const isArchive =
            item.type?.includes("zip") ||
            item.type?.includes("tar") ||
            item.type?.includes("rar") ||
            item.type?.includes("7z")
          const FileTypeIcon = isVideo ? Film : isAudio ? Music : isArchive ? Archive : FileText
          return (
            <TouchableOpacity
              style={[s.item, { borderBottomColor: c.borderLight }]}
              onPress={() => openPreview(item)}
              onLongPress={() => handleFileLongPress(item)}
            >
              {isImage && item.url ? (
                <Image source={{ uri: resolvedUrls[item.id] }} style={s.fileThumb} />
              ) : (
                <View style={[s.fileIconWrap, { backgroundColor: c.surfaceAlt }]}>
                  <FileTypeIcon size={24} color={c.textMuted} />
                </View>
              )}
              <View style={s.itemContent}>
                <Text style={[s.name, { color: c.text }]}>{item.name}</Text>
                <Text style={[s.meta, { color: c.textMuted }]}>
                  {item.type} · {formatSize(item.size)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteFile(item.id)} style={s.deleteBtn}>
                <X size={16} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={<Text style={[s.empty, { color: c.textMuted }]}>{t("files.noFiles")}</Text>}
      />
      <Modal visible={folderModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>{t("files.newFolder")}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="Folder name"
              placeholderTextColor={c.textMuted}
              value={folderName}
              onChangeText={setFolderName}
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setFolderModal(false)} style={s.cancelBtn}>
                <Text style={[s.cancelText, { color: c.textSecondary }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createFolder} style={[s.confirmBtn, { backgroundColor: c.accent }]}>
                <Text style={s.confirmText}>{t("common.create")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {showFolderMembers && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowFolderMembers(null)}>
          <View style={s.overlay}>
            <View style={[s.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
              <Text style={[s.modalTitle, { color: c.text }]}>Folder Members</Text>
              <View style={{ maxHeight: 200, marginBottom: 12 }}>
                {folderMembers.length === 0 && (
                  <Text style={{ color: c.textMuted, fontSize: 13, marginBottom: 8 }}>No members</Text>
                )}
                {folderMembers.map((m) => (
                  <View
                    key={m.userId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: c.text, fontSize: 13, fontFamily: "monospace" }}>
                      {m.userId.slice(0, 8)}...
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: c.textMuted, fontSize: 12, textTransform: "capitalize" }}>
                        {m.permission}
                      </Text>
                      <TouchableOpacity onPress={() => removeFolderMember(m.userId)}>
                        <X size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                <TextInput
                  style={[
                    s.modalInput,
                    { flex: 1, marginBottom: 0, backgroundColor: c.bg, color: c.text, borderColor: c.border },
                  ]}
                  placeholder="User ID"
                  placeholderTextColor={c.textMuted}
                  value={addMemberId}
                  onChangeText={setAddMemberId}
                />
                <TouchableOpacity onPress={addFolderMember} style={[s.confirmBtn, { backgroundColor: c.accent }]}>
                  <Text style={s.confirmText}>Add</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowFolderMembers(null)}>
                <Text style={[s.cancelText, { color: c.textSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      <Modal visible={!!previewFile} transparent animationType="fade" onRequestClose={() => setPreviewFile(null)}>
        <View style={s.previewOverlay}>
          <TouchableOpacity style={s.previewClose} onPress={() => setPreviewFile(null)}>
            <Text style={s.previewCloseText}>✕</Text>
          </TouchableOpacity>
          {previewFile && (
            <View style={s.previewBody}>
              <Text style={[s.previewName, { color: c.text }]} numberOfLines={1}>
                {previewFile.name}
              </Text>
              {previewFile.type?.startsWith("image/") && resolvedUrls[previewFile.id] ? (
                <Image source={{ uri: resolvedUrls[previewFile.id] }} style={s.previewImage} resizeMode="contain" />
              ) : isTextFile(previewFile.type, previewFile.name) ? (
                previewTextLoading ? (
                  <View style={s.previewEmpty}>
                    <ActivityIndicator color={c.accent} />
                  </View>
                ) : previewTextError ? (
                  <View style={s.previewEmpty}>
                    <Text style={[s.previewError, { color: c.textSecondary }]}>Could not load text preview</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={[s.previewTextWrap, { backgroundColor: c.sheetBg }]}
                    contentContainerStyle={s.previewTextContent}
                  >
                    <Text style={[s.previewText, { color: c.textSecondary }]}>{previewText}</Text>
                  </ScrollView>
                )
              ) : previewFile.type === "application/pdf" ? (
                <View style={[s.previewFile, { backgroundColor: c.surfaceAlt }]}>
                  <FileText size={48} color={c.text} />
                  <Text style={[s.previewFileText, { color: c.text }]}>{previewFile.name}</Text>
                  <TouchableOpacity
                    style={[s.downloadBtn, { backgroundColor: c.accent }]}
                    onPress={() => openPdf(previewFile)}
                  >
                    <Text style={s.downloadBtnText}>Open PDF</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[s.previewFile, { backgroundColor: c.surfaceAlt }]}>
                  <FileText size={48} color={c.text} />
                  <Text style={[s.previewFileText, { color: c.text }]}>{previewFile.name}</Text>
                </View>
              )}
              {previewFile.url && (
                <View style={s.previewActions}>
                  <TouchableOpacity
                    style={[s.downloadBtn, { backgroundColor: c.accent }]}
                    onPress={() => Clipboard.setStringAsync(resolvedUrls[previewFile.id] || previewFile.url!)}
                  >
                    <Copy size={16} color="#FFFFFF" />
                    <Text style={s.downloadBtnText}> Copy URL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.downloadBtn, { backgroundColor: c.accent }]}
                    onPress={() => openExternal(previewFile)}
                  >
                    <Download size={16} color="#FFFFFF" />
                    <Text style={s.downloadBtnText}> Download</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
      <Modal visible={!!renameTarget} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>{t("files.rename")}</Text>
            <TextInput
              style={[s.modalInput, { backgroundColor: c.bg, color: c.text, borderColor: c.border }]}
              placeholder="New name"
              placeholderTextColor={c.textMuted}
              value={renameName}
              onChangeText={setRenameName}
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setRenameTarget(null)} style={s.cancelBtn}>
                <Text style={[s.cancelText, { color: c.textSecondary }]}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={renameFile} style={[s.confirmBtn, { backgroundColor: c.accent }]}>
                <Text style={s.confirmText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showMoveModal} transparent animationType="fade" onRequestClose={() => setShowMoveModal(false)}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
            <Text style={[s.modalTitle, { color: c.text }]}>Move to folder</Text>
            <TouchableOpacity style={s.moveItem} onPress={() => moveFile(null)}>
              <Folder size={18} color={c.text} />
              <Text style={[s.moveItemText, { color: c.text }]}>Root (no folder)</Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity key={f.id} style={s.moveItem} onPress={() => moveFile(f.id)}>
                <Folder size={18} color={c.accent} />
                <Text style={[s.moveItemText, { color: c.text }]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowMoveModal(false)}>
              <Text style={[s.cancelText, { color: c.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 24, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 8 },
  actionBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center", alignItems: "center" },
  previewClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  previewBody: { width: "90%", maxWidth: 420, alignItems: "center" },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    maxWidth: "100%",
  },
  previewImage: { width: "100%", height: "70%", borderRadius: 12 },
  previewTextWrap: { width: "100%", maxHeight: "70%", borderRadius: 12 },
  previewTextContent: { padding: 16 },
  previewText: { fontSize: 13, fontFamily: "monospace" },
  previewEmpty: { padding: 48, alignItems: "center", justifyContent: "center" },
  previewError: { fontSize: 14 },
  previewActions: { flexDirection: "row", gap: 12 },
  previewFile: { padding: 40, borderRadius: 20, alignItems: "center" },
  previewFileText: { fontSize: 16 },
  folderRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  folderChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  folderChipActive: {},
  folderChipText: { color: "#E8E8F0", fontSize: 13, fontWeight: "500" },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  fileIcon: { fontSize: 22, marginRight: 14 },
  fileThumb: { width: 40, height: 40, borderRadius: 8, marginRight: 14 },
  itemContent: { flex: 1 },
  name: { fontSize: 15, fontWeight: "500" },
  meta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#EF4444", fontSize: 16 },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  modalInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, alignItems: "center" },
  cancelText: { fontSize: 15 },
  confirmBtn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  moveItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  moveItemText: { fontSize: 14 },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  downloadBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 20,
  },
  downloadBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})
