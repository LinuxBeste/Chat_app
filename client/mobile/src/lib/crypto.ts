import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";

const KEY_STORE_KEY = "e2ee:keypair";
const CONVERSATION_KEYS_KEY = "e2ee:conv-keys";

let cachedKeyPair: { publicKey: string; secretKey: string } | null = null;

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export function generateKeyPair(): KeyPair {
  const kp = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  };
}

async function storeKeypair(kp: KeyPair): Promise<void> {
  await SecureStore.setItemAsync(KEY_STORE_KEY, JSON.stringify(kp));
  cachedKeyPair = kp;
}

async function loadKeypair(): Promise<KeyPair | null> {
  if (cachedKeyPair) return cachedKeyPair;
  const json = await SecureStore.getItemAsync(KEY_STORE_KEY);
  if (json) {
    cachedKeyPair = JSON.parse(json);
    return cachedKeyPair;
  }
  return null;
}

async function removeKeypair(): Promise<void> {
  cachedKeyPair = null;
  await SecureStore.deleteItemAsync(KEY_STORE_KEY);
}

export async function getOrCreateKeyPair(): Promise<KeyPair> {
  const existing = await loadKeypair();
  if (existing) return existing;
  const kp = generateKeyPair();
  await storeKeypair(kp);
  return kp;
}

export async function getLocalKeyPair(): Promise<KeyPair | null> {
  return loadKeypair();
}

export async function computeSharedSecret(theirPublicKey: string): Promise<Uint8Array | null> {
  const pair = await getLocalKeyPair();
  if (!pair) return null;
  try {
    return nacl.box.before(decodeBase64(theirPublicKey), decodeBase64(pair.secretKey));
  } catch {
    return null;
  }
}

function getConvKey(conversationId: string): Uint8Array | null {
  const raw = localStorage.getItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`);
  if (raw) return decodeBase64(raw);
  return null;
}

function setConvKey(conversationId: string, key: Uint8Array) {
  localStorage.setItem(`${CONVERSATION_KEYS_KEY}:${conversationId}`, encodeBase64(key));
}

export async function encryptMessage(
  conversationId: string,
  content: string,
  theirPublicKey?: string,
): Promise<string | null> {
  let sharedKey = getConvKey(conversationId);
  if (!sharedKey && theirPublicKey) {
    sharedKey = await computeSharedSecret(theirPublicKey);
    if (sharedKey) setConvKey(conversationId, sharedKey);
  }
  if (!sharedKey) return null;

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(decodeUTF8(content), nonce, sharedKey);
  if (!encrypted) return null;

  return encodeBase64(nonce) + "." + encodeBase64(encrypted);
}

export async function decryptMessage(
  conversationId: string,
  ciphertext: string,
  theirPublicKey?: string,
): Promise<string | null> {
  let sharedKey = getConvKey(conversationId);
  if (!sharedKey && theirPublicKey) {
    sharedKey = await computeSharedSecret(theirPublicKey);
    if (sharedKey) setConvKey(conversationId, sharedKey);
  }
  if (!sharedKey) return null;

  const parts = ciphertext.split(".");
  if (parts.length !== 2) return null;

  try {
    const nonce = decodeBase64(parts[0]);
    const encrypted = decodeBase64(parts[1]);
    const decrypted = nacl.secretbox.open(encrypted, nonce, sharedKey);
    if (!decrypted) return null;
    return encodeUTF8(decrypted);
  } catch {
    return null;
  }
}

export function isEncrypted(content: string): boolean {
  return content.startsWith("e2ee:");
}

export function stripEncryptionPrefix(content: string): string {
  return content.startsWith("e2ee:") ? content.slice(5) : content;
}

export async function deleteKeyPair() {
  await removeKeypair();
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CONVERSATION_KEYS_KEY)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
