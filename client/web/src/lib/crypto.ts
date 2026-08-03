import nacl from "tweetnacl"
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util"
import { isDesktop } from "./utils"

export interface KeyPair {
  publicKey: string
  secretKey: string
}

let cachedKeyPair: KeyPair | null = null

const KEY_STORE_KEY = "e2ee:keypair"
const CONVERSATION_KEYS_KEY = "e2ee:conv-keys"
const MAX_CONVERSATION_KEYS = 3

interface ConvKeyEntry {
  key: string
  peer: string
}

async function storeKeypair(keypair: KeyPair): Promise<void> {
  const json = JSON.stringify(keypair)
  if (isDesktop()) {
    await window.electronAPI!.e2ee.storeKeypair(json)
  } else {
    localStorage.setItem(KEY_STORE_KEY, json)
  }
}

async function loadKeypair(): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair
  if (isDesktop()) {
    const json = await window.electronAPI!.e2ee.getKeypair()
    if (json) {
      cachedKeyPair = JSON.parse(json)
      return cachedKeyPair
    }
    return null
  }
  const stored = localStorage.getItem(KEY_STORE_KEY)
  if (stored) {
    cachedKeyPair = JSON.parse(stored)
    return cachedKeyPair
  }
  return null
}

async function removeKeypair(): Promise<void> {
  cachedKeyPair = null
  if (isDesktop()) {
    await window.electronAPI!.e2ee.deleteKeypair()
  } else {
    localStorage.removeItem(KEY_STORE_KEY)
  }
}

export async function getOrCreateKeyPair(): Promise<KeyPair> {
  const existing = await loadKeypair()
  if (existing) return existing
  const kp = generateKeyPair()
  await storeKeypair(kp)
  cachedKeyPair = kp
  return kp
}

export async function resetKeypairOnServer(): Promise<KeyPair> {
  await removeKeypair()
  const kp = generateKeyPair()
  await storeKeypair(kp)
  cachedKeyPair = kp
  return kp
}

export async function getLocalKeyPair(): Promise<KeyPair | null> {
  return loadKeypair()
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
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

function getConvKeys(conversationId: string): ConvKeyEntry[] {
  const raw = localStorage.getItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => e && typeof e.key === "string" && typeof e.peer === "string")
    }
  } catch {}
  return [{ key: raw, peer: "" }]
}

function setConvKeys(conversationId: string, entries: ConvKeyEntry[]) {
  localStorage.setItem(
    `${CONVERSATION_KEYS_KEY}:${conversationId}`,
    JSON.stringify(entries.slice(0, MAX_CONVERSATION_KEYS)),
  )
}

async function deriveConvKey(conversationId: string, theirPublicKey: string): Promise<Uint8Array | null> {
  const secret = await computeSharedSecret(theirPublicKey)
  if (!secret) return null
  const keys = getConvKeys(conversationId).filter((k) => k.peer !== theirPublicKey)
  setConvKeys(conversationId, [{ key: encodeBase64(secret), peer: theirPublicKey }, ...keys])
  return secret
}

export async function encryptMessage(
  conversationId: string,
  content: string,
  theirPublicKey?: string,
): Promise<string | null> {
  const keys = getConvKeys(conversationId)
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

  const keys = getConvKeys(conversationId)
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

export function encryptForStorage(content: string): string {
  return "e2ee:" + content
}

export function stripEncryptionPrefix(content: string): string {
  return content.startsWith("e2ee:") ? content.slice(5) : content
}

export function resetConversationKey(conversationId: string) {
  localStorage.removeItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`)
}

export async function deleteKeyPair() {
  await removeKeypair()
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(CONVERSATION_KEYS_KEY)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}
