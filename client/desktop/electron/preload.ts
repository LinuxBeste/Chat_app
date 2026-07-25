import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  getUserDataPath: () => ipcRenderer.invoke("get-user-data-path"),
})
