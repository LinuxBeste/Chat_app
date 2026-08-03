import nacl from "tweetnacl"
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util"
import { isDesktop } from "./utils"

export interface KeyPair {
  publicKey: string
  secretKey: string
}

let cachedKeyPair: KeyPair | null = null
let cachedDeviceId: string | null = null

const KEY_STORE_KEY = "e2ee:keypair"
const DEVICE_ID_KEY = "e2ee:deviceId"
const CONVERSATION_KEYS_KEY = "e2ee:conv-keys"
const MAX_CONVERSATION_KEYS = 100
const LEGACY_USER = "default"

interface ConvKeyEntry {
  key: string
  peer: string
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

async function storeKeypair(keypair: KeyPair, userId?: string): Promise<void> {
  const json = JSON.stringify(keypair)
  if (isDesktop()) {
    await window.electronAPI!.e2ee.storeKeypair(json, userScope(userId))
  } else {
    localStorage.setItem(keypairStoreKey(userId), json)
  }
}

async function loadKeypair(userId?: string): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair
  if (isDesktop()) {
    const json = await window.electronAPI!.e2ee.getKeypair(userScope(userId))
    if (json) {
      cachedKeyPair = JSON.parse(json)
      return cachedKeyPair
    }
    const legacy = await window.electronAPI!.e2ee.getKeypair("legacy")
    if (legacy) {
      const kp = JSON.parse(legacy) as KeyPair
      cachedKeyPair = kp
      await storeKeypair(kp, userId)
      return kp
    }
    return null
  }
  const stored = localStorage.getItem(keypairStoreKey(userId))
  if (stored) {
    cachedKeyPair = JSON.parse(stored)
    return cachedKeyPair
  }
  const legacy = localStorage.getItem(KEY_STORE_KEY)
  if (legacy) {
    cachedKeyPair = JSON.parse(legacy)
    localStorage.setItem(keypairStoreKey(userId), legacy)
    return cachedKeyPair
  }
  return null
}

async function removeKeypair(userId?: string): Promise<void> {
  cachedKeyPair = null
  if (isDesktop()) {
    await window.electronAPI!.e2ee.deleteKeypair(userScope(userId))
  } else {
    localStorage.removeItem(keypairStoreKey(userId))
  }
}

export async function getOrCreateKeyPair(userId?: string): Promise<KeyPair> {
  const existing = await loadKeypair(userId)
  if (existing) return existing
  const kp = generateKeyPair()
  await storeKeypair(kp, userId)
  cachedKeyPair = kp
  return kp
}

// Stable per-user device identifier, used as the e2ee message keyId.
// Persists across logouts so re-login keeps old messages decryptable.
export async function getOrCreateDeviceId(userId?: string): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId
  const scope = userScope(userId)
  if (isDesktop()) {
    const existing = await window.electronAPI!.e2ee.getDeviceId(scope)
    if (existing) {
      cachedDeviceId = existing
      return existing
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
      .toString(36)
      .slice(2, 12)}`
    await window.electronAPI!.e2ee.storeDeviceId(scope, id)
    cachedDeviceId = id
    return id
  }
  const stored = localStorage.getItem(deviceIdStoreKey(scope))
  if (stored) {
    cachedDeviceId = stored
    return stored
  }
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random()
    .toString(36)
    .slice(2, 12)}`
  localStorage.setItem(deviceIdStoreKey(scope), id)
  cachedDeviceId = id
  return id
}

export async function resetKeypairOnServer(userId?: string): Promise<KeyPair> {
  await removeKeypair(userId)
  const kp = generateKeyPair()
  await storeKeypair(kp, userId)
  cachedKeyPair = kp
  return kp
}

export async function getLocalKeyPair(userId?: string): Promise<KeyPair | null> {
  return loadKeypair(userId)
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
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

function getConvKeys(conversationId: string, userId?: string): ConvKeyEntry[] {
  const parse = (raw: string): ConvKeyEntry[] => {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((e) => e && typeof e.key === "string" && typeof e.peer === "string")
      }
    } catch {
      // fall through to legacy single-key format
    }
    return [{ key: raw, peer: "" }]
  }
  const scoped = localStorage.getItem(convKeyStorageKey(conversationId, userId))
  if (scoped !== null) return parse(scoped)
  const legacy = localStorage.getItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
  if (legacy !== null) {
    const entries = parse(legacy)
    if (entries.length > 0) {
      localStorage.setItem(convKeyStorageKey(conversationId, userId), JSON.stringify(entries))
    }
    return entries
  }
  return []
}

function setConvKeys(conversationId: string, entries: ConvKeyEntry[], userId?: string) {
  localStorage.setItem(
    convKeyStorageKey(conversationId, userId),
    JSON.stringify(entries.slice(0, MAX_CONVERSATION_KEYS)),
  )
}

async function deriveConvKey(conversationId: string, theirPublicKey: string, userId?: string): Promise<Uint8Array | null> {
  const secret = await computeSharedSecret(theirPublicKey, userId)
  if (!secret) return null
  const keys = getConvKeys(conversationId, userId).filter((k) => k.peer !== theirPublicKey)
  setConvKeys(conversationId, [{ key: encodeBase64(secret), peer: theirPublicKey }, ...keys], userId)
  return secret
}

export async function encryptMessage(
  conversationId: string,
  content: string,
  theirPublicKey?: string,
  userId?: string,
): Promise<string | null> {
  // Never fall back to a cached secret when the peer key is missing:
  // that would encrypt to a key nobody can derive again.
  if (!theirPublicKey) return null
  const keys = getConvKeys(conversationId, userId)
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

  const keys = getConvKeys(conversationId, userId)
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

export function encryptForStorage(content: string): string {
  return "e2ee:" + content
}

export function stripEncryptionPrefix(content: string): string {
  return content.startsWith("e2ee:") ? content.slice(5) : content
}

export function resetConversationKey(conversationId: string, userId?: string) {
  localStorage.removeItem(convKeyStorageKey(conversationId, userId))
}

export async function deleteKeyPair(userId?: string) {
  await removeKeypair(userId)
  const scope = userScope(userId)
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${CONVERSATION_KEYS_KEY}:${scope}:`)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
