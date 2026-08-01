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

export async function apiFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  const { accessToken } = await getTokens()
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`
  const res = await fetch(`${await getServerUrl()}${path}`, { method: "POST", headers, body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  return res.json()
}

export { setTokens, clearTokens, getTokens }
