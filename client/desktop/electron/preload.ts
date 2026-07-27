import { contextBridge, ipcRenderer } from "electron"

export type MenuAction =
  | "new-conversation"
  | "mark-read"
  | "mark-unread"
  | "archive"
  | "mute"
  | "search"
  | "go-friends"
  | "go-settings"
  | "go-communities"
  | "go-notifications"
  | "go-files"
  | "go-groups"
  | "go-events"
  | "toggle-sidebar"
  | "toggle-dark-mode"
  | "about"

contextBridge.exposeInMainWorld("electronAPI", {
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
  e2ee: {
    isAvailable: () => ipcRenderer.invoke("e2ee:is-available"),
    storeKeypair: (json: string) => ipcRenderer.invoke("e2ee:store-keypair", json),
    getKeypair: () => ipcRenderer.invoke("e2ee:get-keypair"),
    deleteKeypair: () => ipcRenderer.invoke("e2ee:delete-keypair"),
    storeConvKeys: (json: string) => ipcRenderer.invoke("e2ee:store-conv-keys", json),
    getConvKeys: () => ipcRenderer.invoke("e2ee:get-conv-keys"),
    deleteConvKeys: () => ipcRenderer.invoke("e2ee:delete-conv-keys"),
  },
  onMenuAction: (callback: (action: MenuAction) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: MenuAction) => callback(action)
    ipcRenderer.on("menu:action", handler)
    return () => ipcRenderer.removeListener("menu:action", handler)
  },
})
