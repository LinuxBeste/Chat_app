import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  nativeImage,
  safeStorage,
  shell,
} from "electron"
import { join } from "path"
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "fs"

let saveTimeout: ReturnType<typeof setTimeout> | null = null

const WEB_DIST = join(__dirname, "..", "..", "web", "dist")

const isDev = !app.isPackaged
const isMac = process.platform === "darwin"
const APP_NAME = "Chat App"

app.name = APP_NAME

let mainWindow: BrowserWindow | null = null

function loadWindowState(): { width: number; height: number; x?: number; y?: number } {
  try {
    const statePath = join(app.getPath("userData"), "window-state.json")
    if (existsSync(statePath)) return JSON.parse(readFileSync(statePath, "utf-8"))
  } catch {
    /* ignore */
  }
  return { width: 1200, height: 800 }
}

function saveWindowState() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (!mainWindow) return
    try {
      const bounds = mainWindow.getBounds()
      const statePath = join(app.getPath("userData"), "window-state.json")
      writeFileSync(statePath, JSON.stringify({ width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y }))
    } catch {
      /* ignore */
    }
  }, 300)
}

function menuAction(action: string) {
  mainWindow?.webContents.send("menu:action", action)
}

function buildMenu() {
  const isMacOrLinux = ["darwin", "linux"].includes(process.platform)
  const chatSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "New Conversation",
      accelerator: "CmdOrCtrl+N",
      click: () => menuAction("new-conversation"),
    },
    { type: "separator" },
    {
      label: "Mark as Read",
      accelerator: "CmdOrCtrl+Shift+R",
      click: () => menuAction("mark-read"),
    },
    {
      label: "Mark as Unread",
      accelerator: "CmdOrCtrl+Shift+U",
      click: () => menuAction("mark-unread"),
    },
    {
      label: "Archive",
      accelerator: "CmdOrCtrl+E",
      click: () => menuAction("archive"),
    },
    {
      label: "Mute",
      accelerator: "CmdOrCtrl+Shift+M",
      click: () => menuAction("mute"),
    },
    { type: "separator" },
    {
      label: "Search",
      accelerator: "CmdOrCtrl+K",
      click: () => menuAction("search"),
    },
  ]
  const navigateSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "Friends",
      accelerator: "CmdOrCtrl+1",
      click: () => menuAction("go-friends"),
    },
    {
      label: "Groups",
      accelerator: "CmdOrCtrl+2",
      click: () => menuAction("go-groups"),
    },
    {
      label: "Communities",
      accelerator: "CmdOrCtrl+3",
      click: () => menuAction("go-communities"),
    },
    {
      label: "Events",
      accelerator: "CmdOrCtrl+4",
      click: () => menuAction("go-events"),
    },
    {
      label: "Notifications",
      accelerator: "CmdOrCtrl+5",
      click: () => menuAction("go-notifications"),
    },
    {
      label: "Files",
      accelerator: "CmdOrCtrl+6",
      click: () => menuAction("go-files"),
    },
    { type: "separator" },
    {
      label: "Settings",
      accelerator: "CmdOrCtrl+,",
      click: () => menuAction("go-settings"),
    },
  ]
  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: "reload" as const },
    { role: "forceReload" as const },
    { type: "separator" as const },
    { role: "resetZoom" as const },
    { role: "zoomIn" as const },
    { role: "zoomOut" as const },
    { type: "separator" as const },
    { role: "togglefullscreen" as const },
    { type: "separator" as const },
    ...(isDev ? [{ role: "toggleDevTools" as const }, { type: "separator" as const }] : []),
    {
      label: "Toggle Sidebar",
      accelerator: "CmdOrCtrl+B",
      click: () => menuAction("toggle-sidebar"),
    },
    {
      label: "Toggle Dark Mode",
      accelerator: "CmdOrCtrl+D",
      click: () => menuAction("toggle-dark-mode"),
    },
  ]
  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: "About",
      click: () => menuAction("about"),
    },
    { type: "separator" },
    {
      label: "Documentation",
      click: () => shell.openExternal("https://github.com/LinuxBeste/Chat_app/"),
    },
    {
      label: "Report Issue",
      click: () => shell.openExternal("https://github.com/LinuxBeste/Chat_app/issues"),
    },
  ]
  return Menu.buildFromTemplate([
    ...(isMacOrLinux
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "Chat",
      submenu: chatSubmenu,
    },
    {
      label: "Navigate",
      submenu: navigateSubmenu,
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        { role: "selectAll" as const },
      ],
    },
    {
      label: "View",
      submenu: viewSubmenu,
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac ? [{ type: "separator" as const }, { role: "front" as const }] : [{ role: "close" as const }]),
      ],
    },
    {
      label: "Help",
      submenu: helpSubmenu,
    },
  ])
}

function createWindow() {
  const state = loadWindowState()

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(state.x !== undefined && state.y !== undefined ? { x: state.x, y: state.y } : {}),
    minWidth: 400,
    minHeight: 600,
    title: "Chat App",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.setMenu(buildMenu())
  mainWindow.once("ready-to-show", () => mainWindow?.show())

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
  } else {
    mainWindow.loadFile(join(WEB_DIST, "index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
  mainWindow.on("resize", saveWindowState)
  mainWindow.on("move", saveWindowState)
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

ipcMain.handle("get-user-data-path", () => app.getPath("userData"))
ipcMain.handle("get-app-version", () => app.getVersion())

const KEY_FILE = "e2ee-keypair.enc"
const CONV_KEYS_FILE = "e2ee-conv-keys.enc"

ipcMain.handle("e2ee:is-available", () => safeStorage.isEncryptionAvailable())

ipcMain.handle("e2ee:store-keypair", async (_event, keypairJson: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false
    const encrypted = safeStorage.encryptString(keypairJson)
    writeFileSync(join(app.getPath("userData"), KEY_FILE), encrypted)
    return true
  } catch { return false }
})

ipcMain.handle("e2ee:get-keypair", async () => {
  try {
    const path = join(app.getPath("userData"), KEY_FILE)
    if (!existsSync(path)) return null
    const encrypted = readFileSync(path)
    return safeStorage.decryptString(encrypted)
  } catch { return null }
})

ipcMain.handle("e2ee:delete-keypair", async () => {
  try {
    const path = join(app.getPath("userData"), KEY_FILE)
    if (existsSync(path)) unlinkSync(path)
  } catch { /* ignore */ }
})

ipcMain.handle("e2ee:store-conv-keys", async (_event, dataJson: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false
    const encrypted = safeStorage.encryptString(dataJson)
    writeFileSync(join(app.getPath("userData"), CONV_KEYS_FILE), encrypted)
    return true
  } catch { return false }
})

ipcMain.handle("e2ee:get-conv-keys", async () => {
  try {
    const path = join(app.getPath("userData"), CONV_KEYS_FILE)
    if (!existsSync(path)) return null
    const encrypted = readFileSync(path)
    return safeStorage.decryptString(encrypted)
  } catch { return null }
})

ipcMain.handle("e2ee:delete-conv-keys", async () => {
  try {
    const path = join(app.getPath("userData"), CONV_KEYS_FILE)
    if (existsSync(path)) unlinkSync(path)
  } catch { /* ignore */ }
})
