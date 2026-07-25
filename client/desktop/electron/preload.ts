import { contextBridge, ipcRenderer } from "electron"

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
})
