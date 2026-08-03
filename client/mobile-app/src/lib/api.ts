import AsyncStorage from "@react-native-async-storage/async-storage"
import { getServerUrl } from "./server-config"

const KEYS = { accessToken: "@accessToken", refreshToken: "@refreshToken" }

async function getTokens() {
  const [at, rt] = await Promise.all([AsyncStorage.getItem(KEYS.accessToken), AsyncStorage.getItem(KEYS.refreshToken)])
  return { accessToken: at, refreshToken: rt }
}

async function setTokens(access: string, refresh: string) {
  await Promise.all([AsyncStorage.setItem(KEYS.accessToken, access), AsyncStorage.setItem(KEYS.refreshToken, refresh)])
}

async function clearTokens() {
  await Promise.all([AsyncStorage.removeItem(KEYS.accessToken), AsyncStorage.removeItem(KEYS.refreshToken)])
}

let refreshPromise: Promise<string | null> | null = null

export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message)
    this.name = "NetworkError"
  }
}

export async function refreshAccess(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = doRefresh()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function doRefresh(): Promise<string | null> {
  const { refreshToken } = await getTokens()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${await getServerUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      await clearTokens()
      return null
    }
    const data = await res.json()
    await setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = await getTokens()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  const baseUrl = await getServerUrl()
  let res: Response
  try {
    res = await fetch(`${baseUrl}${path}`, { ...options, headers })
  } catch {
    throw new NetworkError()
  }
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccess()
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`
      try {
        res = await fetch(`${baseUrl}${path}`, { ...options, headers })
      } catch {
        throw new NetworkError()
      }
    } else if ((await getTokens()).accessToken) {
      throw new NetworkError()
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface UploadFileInput {
  uri: string
  name: string
  type?: string
  conversationId?: string
  path?: string
  fieldName?: string
}

export interface UploadFileResult {
  url: string
  filename: string
  mimeType: string
  size: number
}

// Multipart upload via React Native's built-in XHR (OkHttp-backed). This avoids
// expo-file-system's native uploadAsync entirely, which is broken in some
// release builds when the prebuilt AAR and expo-modules-core disagree.
function xhrUpload(url: string, formData: FormData, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value)
    }
    xhr.timeout = 120000
    xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText || "" })
    xhr.onerror = () => reject(new NetworkError())
    xhr.ontimeout = () => reject(new Error("Upload timed out"))
    xhr.send(formData)
  })
}

export async function uploadFile<T = UploadFileResult>(input: UploadFileInput): Promise<T> {
  const { accessToken } = await getTokens()
  const formData = new FormData()
  if (input.conversationId) formData.append("conversationId", input.conversationId)
  formData.append(input.fieldName ?? "file", {
    uri: input.uri,
    name: input.name,
    type: input.type || "application/octet-stream",
  } as any)
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  const res = await xhrUpload(`${await getServerUrl()}${input.path ?? "/api/uploads"}`, formData, headers)
  if (res.status < 200 || res.status >= 300) {
    let detail = `Upload failed: ${res.status}`
    try {
      const body = JSON.parse(res.body)
      if (body?.error) detail = `${detail} (${body.error})`
    } catch {}
    throw new Error(detail)
  }
  try {
    return JSON.parse(res.body) as T
  } catch {
    throw new Error(`Upload failed: invalid server response (${res.status})`)
  }
}

export { setTokens, clearTokens, getTokens }
