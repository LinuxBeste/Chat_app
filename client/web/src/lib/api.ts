const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"

function getTokens() {
  const at = localStorage.getItem("accessToken")
  const rt = localStorage.getItem("refreshToken")
  return { accessToken: at, refreshToken: rt }
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("accessToken", access)
  localStorage.setItem("refreshToken", refresh)
}

function clearTokens() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
}

export async function refreshAccess(): Promise<string | null> {
  const { refreshToken } = getTokens()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const data = await res.json()
    setTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = getTokens()
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

export function apiFormData<T = unknown>(path: string, formData: FormData): Promise<T> {
  const { accessToken } = getTokens()
  const headers: Record<string, string> = {}
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`

  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  }).then((r) => {
    if (!r.ok) throw new Error(`Upload failed: ${r.status}`)
    return r.json()
  })
}

export { setTokens, clearTokens, getTokens, BASE_URL }
