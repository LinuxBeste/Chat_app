interface ElectronAPI {
  getUserDataPath: () => Promise<string>
}

interface Window {
  electronAPI?: ElectronAPI
}
