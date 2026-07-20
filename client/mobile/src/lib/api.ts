import AsyncStorage from "@react-native-async-storage/async-storage"

const BASE_URL = "http://10.0.2.2:3000"

const KEYS = { accessToken: "@accessToken", refreshToken: "@refreshToken" }

async function getTokens() {
  const [at, rt] = await Promise.all([
    AsyncStorage.getItem(KEYS.accessToken),
    AsyncStorage.getItem(KEYS.refreshToken),
  ])
  return { accessToken: at, refreshToken: rt }
}

async function setTokens(access: string, refresh: string) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.accessToken, access),
    AsyncStorage.setItem(KEYS.refreshToken, refresh),
  ])
}

async function clearTokens() {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.accessToken),
    AsyncStorage.removeItem(KEYS.refreshToken),
  ])
}

export async function refreshAccess(): Promise<string | null> {
  const { refreshToken } = await getTokens()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) { await clearTokens(); return null }
    const data = await res.json()
    await setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    await clearTokens()
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

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccess()
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`
      res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export { setTokens, clearTokens, getTokens, BASE_URL }
