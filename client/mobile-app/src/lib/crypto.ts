import nacl from "tweetnacl"
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util"
import * as SecureStore from "expo-secure-store"
import AsyncStorage from "@react-native-async-storage/async-storage"

const KEY_STORE_KEY = "e2ee:keypair"
const CONVERSATION_KEYS_KEY = "e2ee:conv-keys"
const MAX_CONVERSATION_KEYS = 3

let cachedKeyPair: { publicKey: string; secretKey: string } | null = null

interface ConvKeyEntry {
  key: string
  peer: string
}

export interface KeyPair {
  publicKey: string
  secretKey: string
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
}

async function storeKeypair(kp: KeyPair): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_STORE_KEY, JSON.stringify(kp))
  } catch {}
  cachedKeyPair = kp
}

async function loadKeypair(): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair
  try {
    const json = await SecureStore.getItemAsync(KEY_STORE_KEY)
    if (json) {
      cachedKeyPair = JSON.parse(json)
      return cachedKeyPair
    }
  } catch {
    return null
  }
  return null
}

async function removeKeypair(): Promise<void> {
  cachedKeyPair = null
  await SecureStore.deleteItemAsync(KEY_STORE_KEY)
}

export async function getOrCreateKeyPair(): Promise<KeyPair> {
  const existing = await loadKeypair()
  if (existing) return existing
  const kp = generateKeyPair()
  await storeKeypair(kp)
  return kp
}

export async function getLocalKeyPair(): Promise<KeyPair | null> {
  return loadKeypair()
}

export async function computeSharedSecret(theirPublicKey: string): Promise<Uint8Array | null> {
  const pair = await getLocalKeyPair()
  if (!pair) return null
  try {
    return nacl.box.before(decodeBase64(theirPublicKey), decodeBase64(pair.secretKey))
  } catch {
    return null
  }
}

async function getConvKeys(conversationId: string): Promise<ConvKeyEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((e) => e && typeof e.key === "string" && typeof e.peer === "string")
      }
    } catch {}
    return [{ key: raw, peer: "" }]
  } catch {
    return []
  }
}

async function setConvKeys(conversationId: string, entries: ConvKeyEntry[]) {
  try {
    await AsyncStorage.setItem(
      `${CONVERSATION_KEYS_KEY}:${conversationId}`,
      JSON.stringify(entries.slice(0, MAX_CONVERSATION_KEYS)),
    )
  } catch {}
}

async function deriveConvKey(conversationId: string, theirPublicKey: string): Promise<Uint8Array | null> {
  const secret = await computeSharedSecret(theirPublicKey)
  if (!secret) return null
  const keys = (await getConvKeys(conversationId)).filter((k) => k.peer !== theirPublicKey)
  await setConvKeys(conversationId, [{ key: encodeBase64(secret), peer: theirPublicKey }, ...keys])
  return secret
}

export async function encryptMessage(
  conversationId: string,
  content: string,
  theirPublicKey?: string,
): Promise<string | null> {
  const keys = await getConvKeys(conversationId)
  let sharedKey: Uint8Array | null = null
  if (theirPublicKey) {
    const match = keys.find((k) => k.peer === theirPublicKey)
    sharedKey = match ? decodeBase64(match.key) : await deriveConvKey(conversationId, theirPublicKey)
  } else if (keys.length > 0) {
    sharedKey = decodeBase64(keys[0].key)
  }
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
  const keys = await getConvKeys(conversationId)
  for (const entry of keys) {
    const plain = tryKey(entry.key)
    if (plain !== null) return plain
  }
  if (theirPublicKey) {
    const fresh = await deriveConvKey(conversationId, theirPublicKey)
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

export async function resetConversationKey(conversationId: string) {
  await AsyncStorage.removeItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
}

export async function deleteKeyPair() {
  await removeKeypair()
  const allKeys = await AsyncStorage.getAllKeys()
  const keysToRemove = allKeys.filter((k) => k.startsWith(CONVERSATION_KEYS_KEY))
  await AsyncStorage.multiRemove(keysToRemove)
}
