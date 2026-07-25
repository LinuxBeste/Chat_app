interface ElectronAPI {
  getUserDataPath: () => Promise<string>
  e2ee: {
    isAvailable: () => Promise<boolean>
    storeKeypair: (json: string) => Promise<boolean>
    getKeypair: () => Promise<string | null>
    deleteKeypair: () => Promise<void>
    storeConvKeys: (json: string) => Promise<boolean>
    getConvKeys: () => Promise<string | null>
    deleteConvKeys: () => Promise<void>
  }
}

interface Window {
  electronAPI?: ElectronAPI
}
