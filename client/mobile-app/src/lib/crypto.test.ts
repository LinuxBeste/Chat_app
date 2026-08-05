import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encodeBase64 } from "tweetnacl-util";
import AsyncStorage from "@react-native-async-storage/async-storage";
import nacl from "tweetnacl";
import {
  generateKeyPair,
  getOrCreateKeyPair,
  getLocalKeyPair,
  computeSharedSecret,
  encryptMessage,
  decryptMessage,
  isEncrypted,
  stripEncryptionPrefix,
  resetConversationKey,
  deleteKeyPair,
} from "./crypto";

const nonce = new Uint8Array(24);

vi.mock("tweetnacl", () => {
  const nacl = {
    box: {
      keyPair: vi.fn(() => ({
        publicKey: new Uint8Array([1, 2, 3]),
        secretKey: new Uint8Array([4, 5, 6]),
      })),
      before: vi.fn(() => new Uint8Array(32)),
    },
    secretbox: {
      nonceLength: 24,
    },
    randomBytes: vi.fn(() => nonce),
  };
  (nacl.secretbox as any) = vi.fn(() => new Uint8Array([1, 2, 3]));
  (nacl.secretbox as any).nonceLength = 24;
  (nacl.secretbox as any).open = vi.fn(() => new Uint8Array([104, 101, 108, 108, 111]));
  return { default: nacl };
});

describe("crypto", () => {
  beforeEach(async () => {
    await deleteKeyPair();
  });

  describe("generateKeyPair", () => {
    it("returns an object with publicKey and secretKey", () => {
      const kp = generateKeyPair();
      expect(kp).toHaveProperty("publicKey");
      expect(kp).toHaveProperty("secretKey");
      expect(typeof kp.publicKey).toBe("string");
      expect(typeof kp.secretKey).toBe("string");
    });
  });

  describe("getOrCreateKeyPair", () => {
    it("creates and returns a new keypair on first call", async () => {
      const kp = await getOrCreateKeyPair();
      expect(kp.publicKey).toBeTruthy();
      expect(kp.secretKey).toBeTruthy();
    });

    it("returns the same keypair on subsequent calls", async () => {
      const first = await getOrCreateKeyPair();
      const second = await getOrCreateKeyPair();
      expect(first).toEqual(second);
    });
  });

  describe("getLocalKeyPair", () => {
    it("returns null when no keypair exists", async () => {
      expect(await getLocalKeyPair()).toBeNull();
    });

    it("returns the stored keypair", async () => {
      await getOrCreateKeyPair();
      const loaded = await getLocalKeyPair();
      expect(loaded).not.toBeNull();
      expect(loaded!.publicKey).toBeTruthy();
    });
  });

  describe("computeSharedSecret", () => {
    it("returns null when no local keypair exists", async () => {
      const secret = await computeSharedSecret("some-public-key");
      expect(secret).toBeNull();
    });

    it("returns a shared secret when a keypair exists", async () => {
      await getOrCreateKeyPair();
      const secret = await computeSharedSecret("dGVzdC1wdWJsaWMta2V5");
      expect(secret).toBeInstanceOf(Uint8Array);
    });
  });

  describe("encryptMessage / decryptMessage", () => {
    it("returns null when no shared key and no theirPublicKey", async () => {
      await getOrCreateKeyPair();
      const result = await encryptMessage("conv1", "hello");
      expect(result).toBeNull();
    });

    it("returns ciphertext when theirPublicKey is provided", async () => {
      await getOrCreateKeyPair();
      const result = await encryptMessage("conv1", "hello", "dGhlaXItcHVibGljLWtleQ==");
      expect(result).not.toBeNull();
      expect(typeof result).toBe("string");
      expect(result).toContain(".");
    });

    it("decrypt fails when conversation key does not exist", async () => {
      await getOrCreateKeyPair();
      const plain = await decryptMessage("conv-unknown", "bm9uY2U=.Y2lwaGVydGV4dA==");
      expect(plain).toBeNull();
    });
  });

  describe("key rotation self-healing", () => {
    const before = vi.mocked(nacl.box.before);
    const open = vi.mocked((nacl as any).secretbox.open as (...args: any[]) => Uint8Array | null);

    const hello = new Uint8Array([104, 101, 108, 108, 111]);

    const cipherWith = (payload: Uint8Array = new Uint8Array([9, 9, 9])) =>
      encodeBase64(new Uint8Array(24).fill(1)) + "." + encodeBase64(payload);

    afterEach(() => {
      open.mockImplementation(() => hello);
    });

    beforeEach(async () => {
      await getOrCreateKeyPair();
      await resetConversationKey("conv1");
      before.mockImplementation((their: Uint8Array) => new Uint8Array(32).fill(their[0] || 7));
    });

    it("derives a fresh conversation key when the peer public key changes", async () => {
      before.mockClear();
      await encryptMessage("conv1", "hi", "YWFhYQ==");
      expect(before).toHaveBeenCalledTimes(1);
      await encryptMessage("conv1", "hi", "enp6eg==");
      expect(before).toHaveBeenCalledTimes(2);
      await encryptMessage("conv1", "hi", "enp6eg==");
      expect(before).toHaveBeenCalledTimes(2);
    });

    it("keeps legacy conversation keys and falls back to them", async () => {
      open.mockImplementation((enc: Uint8Array, nonce: Uint8Array, key: Uint8Array) => (key[0] === 122 ? hello : null));
      await encryptMessage("conv1", "x", "YWFhYQ==");
      const cipher = cipherWith();
      expect(await decryptMessage("conv1", cipher, "enp6eg==")).toBe("hello");
      before.mockClear();
      expect(await decryptMessage("conv1", cipher, "enp6eg==")).toBe("hello");
      expect(before).toHaveBeenCalledTimes(0);
    });

    it("re-derives from the current peer key when all cached keys fail", async () => {
      open.mockImplementation((enc: Uint8Array, nonce: Uint8Array, key: Uint8Array) => (key[0] === 122 ? hello : null));
      await encryptMessage("conv1", "x", "YWFhYQ==");
      const plain = await decryptMessage("conv1", cipherWith(), "enp6eg==");
      expect(plain).toBe("hello");
      const stored = await AsyncStorage.getItem("e2ee:conv-keys:default:conv1");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)[0].peer).toBe("enp6eg==");
    });

    it("returns null when re-derivation still fails to decrypt", async () => {
      open.mockImplementation(() => null);
      await encryptMessage("conv1", "x", "YWFhYQ==");
      expect(await decryptMessage("conv1", cipherWith(), "enp6eg==")).toBeNull();
    });

    it("supports the legacy single-key storage format", async () => {
      open.mockImplementation((enc: Uint8Array, nonce: Uint8Array, key: Uint8Array) => (key[0] === 7 ? hello : null));
      await AsyncStorage.setItem("e2ee:conv-keys:conv1", encodeBase64(new Uint8Array(32).fill(7)));
      expect(await decryptMessage("conv1", cipherWith())).toBe("hello");
    });

    it("caps stored conversation keys at 100 entries, newest first", async () => {
      for (let i = 1; i <= 101; i++) {
        const peer = encodeBase64(new Uint8Array([i]));
        await encryptMessage("conv1", String(i), peer);
      }
      const stored = JSON.parse((await AsyncStorage.getItem("e2ee:conv-keys:default:conv1"))!);
      expect(stored.length).toBe(100);
      expect(stored[0].peer).toBe(encodeBase64(new Uint8Array([101])));
    });
  });

  describe("isEncrypted", () => {
    it("returns true for e2ee: prefixed content", () => {
      expect(isEncrypted("e2ee:some-content")).toBe(true);
    });

    it("returns false for plain content", () => {
      expect(isEncrypted("hello")).toBe(false);
    });
  });

  describe("stripEncryptionPrefix", () => {
    it("strips the e2ee: prefix", () => {
      expect(stripEncryptionPrefix("e2ee:content")).toBe("content");
    });

    it("returns the original string when no prefix", () => {
      expect(stripEncryptionPrefix("content")).toBe("content");
    });
  });

  describe("resetConversationKey", () => {
    it("does not throw", async () => {
      await expect(resetConversationKey("conv1")).resolves.toBeUndefined();
    });
  });

  describe("deleteKeyPair", () => {
    it("clears the keypair and conversation keys", async () => {
      await getOrCreateKeyPair();
      await deleteKeyPair();
      const loaded = await getLocalKeyPair();
      expect(loaded).toBeNull();
    });
  });
});
