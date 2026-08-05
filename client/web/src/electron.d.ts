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
  | "about";

interface ElectronAPI {
  getUserDataPath: () => Promise<string>;
  e2ee: {
    isAvailable: () => Promise<boolean>;
    storeKeypair: (json: string, id?: string) => Promise<boolean>;
    getKeypair: (id?: string) => Promise<string | null>;
    deleteKeypair: (id?: string) => Promise<void>;
    storeDeviceId: (id: string, deviceId: string) => Promise<boolean>;
    getDeviceId: (id?: string) => Promise<string | null>;
    storeConvKeys: (json: string, id?: string) => Promise<boolean>;
    getConvKeys: (id?: string) => Promise<string | null>;
    deleteConvKeys: (id?: string) => Promise<void>;
  };
  onMenuAction: (callback: (action: MenuAction) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
