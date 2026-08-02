import AsyncStorage from "@react-native-async-storage/async-storage"

const CACHE_VERSION = 1

const keys = {
  user: "@cache/user",
  conversations: "@cache/conversations",
  convInfo: (id: string) => `@cache/conv-info/${id}`,
  messages: (id: string) => `@cache/messages/${id}`,
} as const

export const offlineKeys = keys

const memory = new Map<string, string>()

async function cacheSet<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify({ v: CACHE_VERSION, data: value })
  memory.set(key, raw)
  try {
    await AsyncStorage.setItem(key, raw)
  } catch (err) {
    console.warn(`offline-cache: setItem failed for ${key}, using memory only`, err)
  }
}

async function cacheGet<T>(key: string): Promise<T | null> {
  if (memory.has(key)) {
    return parseRaw(memory.get(key)!)
  }
  let raw: string | null = null
  try {
    raw = await AsyncStorage.getItem(key)
  } catch (err) {
    console.warn(`offline-cache: getItem failed for ${key}`, err)
  }
  return parseRaw(raw)
}

function parseRaw<T>(raw: string | null): T | null {
  try {
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.v !== CACHE_VERSION) return null
    return parsed.data as T
  } catch {
    return null
  }
}

async function cacheRemove(key: string): Promise<void> {
  memory.delete(key)
  try {
    await AsyncStorage.removeItem(key)
  } catch (err) {
    console.warn(`offline-cache: removeItem failed for ${key}`, err)
  }
}

async function cacheClear(): Promise<void> {
  memory.clear()
  try {
    const keys = await AsyncStorage.getAllKeys()
    await Promise.all(keys.filter((k) => k.startsWith("@cache/")).map((k) => AsyncStorage.removeItem(k)))
  } catch (err) {
    console.warn(`offline-cache: clear failed`, err)
  }
}

export { cacheGet, cacheSet, cacheRemove, cacheClear }
