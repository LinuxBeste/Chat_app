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
    storeKeypair: (json: string, id?: string) => ipcRenderer.invoke("e2ee:store-keypair", json, id),
    getKeypair: (id?: string) => ipcRenderer.invoke("e2ee:get-keypair", id),
    deleteKeypair: (id?: string) => ipcRenderer.invoke("e2ee:delete-keypair", id),
    storeDeviceId: (id: string, deviceId: string) => ipcRenderer.invoke("e2ee:store-device-id", id, deviceId),
    getDeviceId: (id?: string) => ipcRenderer.invoke("e2ee:get-device-id", id),
    storeConvKeys: (json: string, id?: string) => ipcRenderer.invoke("e2ee:store-conv-keys", json, id),
    getConvKeys: (id?: string) => ipcRenderer.invoke("e2ee:get-conv-keys", id),
    deleteConvKeys: (id?: string) => ipcRenderer.invoke("e2ee:delete-conv-keys", id),
  },
  onMenuAction: (callback: (action: MenuAction) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: MenuAction) => callback(action)
    ipcRenderer.on("menu:action", handler)
    return () => ipcRenderer.removeListener("menu:action", handler)
  },
})
