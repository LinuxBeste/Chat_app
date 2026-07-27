type MenuAction =
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
  onMenuAction: (callback: (action: MenuAction) => void) => () => void
}

interface Window {
  electronAPI?: ElectronAPI
}
