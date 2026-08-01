import { describe, it, expect, beforeEach } from "vitest"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  defaultServerUrl,
  getServerUrl,
  getServerWsUrl,
  setServerUrl,
  resetServerUrl,
} from "./server-config"

describe("server-config", () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it("defaults to localhost when nothing is stored", async () => {
    expect(defaultServerUrl()).toBe("http://localhost:3000")
    await expect(getServerUrl()).resolves.toBe("http://localhost:3000")
  })

  it("persists a custom URL and serves it for http and ws", async () => {
    await setServerUrl("http://192.168.1.5:3000")
    await expect(getServerUrl()).resolves.toBe("http://192.168.1.5:3000")
    await expect(getServerWsUrl()).resolves.toBe("ws://192.168.1.5:3000")
    await expect(AsyncStorage.getItem("@serverUrl")).resolves.toBe("http://192.168.1.5:3000")
  })

  it("normalizes a host without scheme and strips trailing slashes", async () => {
    await setServerUrl("192.168.1.5:3000/")
    await expect(getServerUrl()).resolves.toBe("http://192.168.1.5:3000")
  })

  it("derives wss from https", async () => {
    await setServerUrl("https://chat.example.com")
    await expect(getServerWsUrl()).resolves.toBe("wss://chat.example.com")
  })

  it("falls back to the default after reset", async () => {
    await setServerUrl("http://10.0.2.2:3000")
    await resetServerUrl()
    await expect(getServerUrl()).resolves.toBe("http://localhost:3000")
    await expect(getServerWsUrl()).resolves.toBe("ws://localhost:3000")
  })
})
