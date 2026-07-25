import { app, BrowserWindow, ipcMain, Menu, nativeImage } from "electron"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { readFileSync, existsSync, writeFileSync } from "fs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_DIST = join(__dirname, "..", "..", "web", "dist")

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

function loadWindowState(): { width: number; height: number; x?: number; y?: number } {
  try {
    const statePath = join(app.getPath("userData"), "window-state.json")
    if (existsSync(statePath)) return JSON.parse(readFileSync(statePath, "utf-8"))
  } catch { /* ignore */ }
  return { width: 1200, height: 800 }
}

function saveWindowState() {
  if (!mainWindow) return
  try {
    const bounds = mainWindow.getBounds()
    const statePath = join(app.getPath("userData"), "window-state.json")
    writeFileSync(statePath, JSON.stringify({ width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y }))
  } catch { /* ignore */ }
}

function createMenu() {
  const isMac = process.platform === "darwin"
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{
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
    }] : []),
    {
      label: "File",
      submenu: [
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
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
      submenu: [
        { role: "reload" as const },
        { role: "forceReload" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
        ...(isDev ? [{ type: "separator" as const }, { role: "toggleDevTools" as const }] : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac ? [
          { type: "separator" as const },
          { role: "front" as const },
        ] : [{ role: "close" as const }]),
      ],
    },
  ]))
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

  mainWindow.once("ready-to-show", () => mainWindow?.show())

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
  } else {
    mainWindow.loadFile(join(WEB_DIST, "index.html"))
  }

  mainWindow.on("closed", () => { mainWindow = null })
  mainWindow.on("resize", saveWindowState)
  mainWindow.on("move", saveWindowState)
}

app.whenReady().then(() => {
  createMenu()
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
