import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY = "@serverUrl"

const DEFAULT_HTTP = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"

let cached: string | null = null

export function defaultServerUrl(): string {
  return DEFAULT_HTTP
}

function normalize(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "")
  if (!trimmed) return DEFAULT_HTTP
  return trimmed.includes("://") ? trimmed : `http://${trimmed}`
}

export async function getServerUrl(): Promise<string> {
  if (cached) return cached
  const stored = await AsyncStorage.getItem(KEY)
  cached = stored ? normalize(stored) : DEFAULT_HTTP
  return cached ?? DEFAULT_HTTP
}

export async function getServerWsUrl(): Promise<string> {
  const url = await getServerUrl()
  return url.replace(/^https?:\/\//, (m) => (m === "https://" ? "wss://" : "ws://"))
}

export async function setServerUrl(url: string): Promise<void> {
  const clean = normalize(url)
  await AsyncStorage.setItem(KEY, clean)
  cached = clean
}

export async function resetServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
  cached = null
}
