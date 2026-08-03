import nacl from "tweetnacl"
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY_STORE_KEY = "e2ee:keypair"
const DEVICE_ID_KEY = "e2ee:deviceId"
const CONVERSATION_KEYS_KEY = "e2ee:conv-keys"
const MAX_CONVERSATION_KEYS = 100
const LEGACY_USER = "default"

let cachedKeyPair: { publicKey: string; secretKey: string } | null = null
let cachedDeviceId: string | null = null

interface ConvKeyEntry {
  key: string
  peer: string
}

export interface KeyPair {
  publicKey: string
  secretKey: string
}

function userScope(userId?: string): string {
  return userId && userId.length > 0 ? userId : LEGACY_USER
}

function keypairStoreKey(userId?: string): string {
  return `${KEY_STORE_KEY}:${userScope(userId)}`
}

function deviceIdStoreKey(userId?: string): string {
  return `${DEVICE_ID_KEY}:${userScope(userId)}`
}

function convKeyStorageKey(conversationId: string, userId?: string): string {
  return `${CONVERSATION_KEYS_KEY}:${userScope(userId)}:${conversationId}`
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
}

async function storeKeypair(kp: KeyPair, userId?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(keypairStoreKey(userId), JSON.stringify(kp))
  } catch {}
  cachedKeyPair = kp
}

async function loadKeypair(userId?: string): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair
  try {
    const json = await SecureStore.getItemAsync(keypairStoreKey(userId))
    if (json) {
      cachedKeyPair = JSON.parse(json)
      return cachedKeyPair
    }
    // Legacy migration: keypair stored without user scoping by older clients.
    const legacy = await SecureStore.getItemAsync(KEY_STORE_KEY)
    if (legacy) {
      try {
        await SecureStore.setItemAsync(keypairStoreKey(userId), legacy)
      } catch {}
      cachedKeyPair = JSON.parse(legacy)
      return cachedKeyPair
    }
  } catch {
    return null
  }
  return null
}

export async function getOrCreateKeyPair(userId?: string): Promise<KeyPair> {
  const existing = await loadKeypair(userId)
  if (existing) return existing
  const kp = generateKeyPair()
  await storeKeypair(kp, userId)
  return kp
}

export async function getLocalKeyPair(userId?: string): Promise<KeyPair | null> {
  return loadKeypair(userId)
}

// Stable per-user device identifier, used as the e2ee message keyId.
// Persists across logouts so re-login keeps old messages decryptable.
export async function getOrCreateDeviceId(userId?: string): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  try {
    const scoped = await SecureStore.getItemAsync(deviceIdStoreKey(userId))
    if (scoped) {
      cachedDeviceId = scoped
      return scoped
    }
    const legacy = await SecureStore.getItemAsync(DEVICE_ID_KEY)
    if (legacy) {
      try {
        await SecureStore.setItemAsync(deviceIdStoreKey(userId), legacy)
      } catch {}
      cachedDeviceId = legacy
      return legacy
    }
  } catch {}
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
  try {
    await SecureStore.setItemAsync(deviceIdStoreKey(userId), id)
  } catch {}
  cachedDeviceId = id
  return id
}

export async function computeSharedSecret(theirPublicKey: string, userId?: string): Promise<Uint8Array | null> {
  const pair = await getLocalKeyPair(userId)
  if (!pair) return null
  try {
    return nacl.box.before(decodeBase64(theirPublicKey), decodeBase64(pair.secretKey))
  } catch {
    return null
  }
}

async function getConvKeys(conversationId: string, userId?: string): Promise<ConvKeyEntry[]> {
  try {
    const scoped = await AsyncStorage.getItem(convKeyStorageKey(conversationId, userId))
    if (scoped !== null) {
      try {
        const parsed = JSON.parse(scoped)
        if (Array.isArray(parsed)) {
          return parsed.filter((e) => e && typeof e.key === "string" && typeof e.peer === "string")
        }
      } catch {}
      return [{ key: scoped, peer: "" }]
    }
    // Legacy migration: conversation keys stored without user scoping.
    const legacy = await AsyncStorage.getItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
    if (legacy !== null) {
      let entries: ConvKeyEntry[]
      try {
        const parsed = JSON.parse(legacy)
        entries = Array.isArray(parsed)
          ? parsed.filter((e) => e && typeof e.key === "string" && typeof e.peer === "string")
          : [{ key: legacy, peer: "" }]
      } catch {
        entries = [{ key: legacy, peer: "" }]
      }
      if (entries.length > 0) {
        try {
          await AsyncStorage.setItem(convKeyStorageKey(conversationId, userId), JSON.stringify(entries))
        } catch {}
      }
      return entries
    }
    return []
  } catch {
    return []
  }
}

async function setConvKeys(conversationId: string, entries: ConvKeyEntry[], userId?: string) {
  try {
    await AsyncStorage.setItem(convKeyStorageKey(conversationId, userId), JSON.stringify(entries.slice(0, MAX_CONVERSATION_KEYS)))
  } catch {}
}

async function deriveConvKey(conversationId: string, theirPublicKey: string, userId?: string): Promise<Uint8Array | null> {
  const secret = await computeSharedSecret(theirPublicKey, userId)
  if (!secret) return null
  const keys = (await getConvKeys(conversationId, userId)).filter((k) => k.peer !== theirPublicKey)
  await setConvKeys(conversationId, [{ key: encodeBase64(secret), peer: theirPublicKey }, ...keys], userId)
  return secret
}

export async function encryptMessage(
  conversationId: string,
  content: string,
  theirPublicKey?: string,
  userId?: string,
): Promise<string | null> {
  if (!theirPublicKey) return null
  const keys = await getConvKeys(conversationId, userId)
  const match = keys.find((k) => k.peer === theirPublicKey)
  const sharedKey: Uint8Array | null = match
    ? decodeBase64(match.key)
    : await deriveConvKey(conversationId, theirPublicKey, userId)
  if (!sharedKey) return null
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const encrypted = nacl.secretbox(decodeUTF8(content), nonce, sharedKey)
  if (!encrypted) return null
  return encodeBase64(nonce) + "." + encodeBase64(encrypted)
}

export async function decryptMessage(
  conversationId: string,
  ciphertext: string,
  theirPublicKey?: string,
  userId?: string,
): Promise<string | null> {
  const parts = ciphertext.split(".")
  if (parts.length !== 2) return null
  const tryKey = (key: string): string | null => {
    try {
      const nonce = decodeBase64(parts[0])
      const encrypted = decodeBase64(parts[1])
      const decrypted = nacl.secretbox.open(encrypted, nonce, decodeBase64(key))
      if (!decrypted) return null
      return encodeUTF8(decrypted)
    } catch {
      return null
    }
  }
  const keys = await getConvKeys(conversationId, userId)
  for (const entry of keys) {
    const plain = tryKey(entry.key)
    if (plain !== null) return plain
  }
  if (theirPublicKey) {
    const fresh = await deriveConvKey(conversationId, theirPublicKey, userId)
    if (fresh) {
      const plain = tryKey(encodeBase64(fresh))
      if (plain !== null) return plain
    }
  }
  return null
}

export function isEncrypted(content: string): boolean {
  return content.startsWith("e2ee:")
}

export function stripEncryptionPrefix(content: string): string {
  return content.startsWith("e2ee:") ? content.slice(5) : content
}

export async function resetConversationKey(conversationId: string, userId?: string) {
  await AsyncStorage.removeItem(convKeyStorageKey(conversationId, userId))
}

export async function deleteKeyPair(userId?: string) {
  cachedKeyPair = null
  cachedDeviceId = null
  await SecureStore.deleteItemAsync(keypairStoreKey(userId))
  await SecureStore.deleteItemAsync(deviceIdStoreKey(userId))
  const allKeys = await AsyncStorage.getAllKeys()
  const prefix = `${CONVERSATION_KEYS_KEY}:${userScope(userId)}:`
  const keysToRemove = allKeys.filter((k) => k.startsWith(prefix))
  await Promise.all(keysToRemove.map((k) => AsyncStorage.removeItem(k)))
}
