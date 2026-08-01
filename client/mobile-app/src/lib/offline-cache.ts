import AsyncStorage from "@react-native-async-storage/async-storage"

const CACHE_VERSION = 1

const keys = {
  user: "@cache/user",
  conversations: "@cache/conversations",
  convInfo: (id: string) => `@cache/conv-info/${id}`,
  messages: (id: string) => `@cache/messages/${id}`,
} as const

export const offlineKeys = keys

async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ v: CACHE_VERSION, data: value }))
  } catch {}
}

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.v !== CACHE_VERSION) return null
    return parsed.data as T
  } catch {
    return null
  }
}

async function cacheRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch {}
}

export { cacheGet, cacheSet, cacheRemove }
