import { describe, it, expect } from "vitest"
import { supportedLanguages } from "./index"
import i18n from "./index"

describe("i18n setup", () => {
  it("initializes with English as default", () => {
    expect(i18n.language).toBe("en")
  })

  it("supports 16 languages", () => {
    expect(supportedLanguages.length).toBe(16)
  })

  it("includes all required languages", () => {
    const codes = supportedLanguages.map((l) => l.code)
    expect(codes).toContain("en")
    expect(codes).toContain("de")
    expect(codes).toContain("fr")
    expect(codes).toContain("es")
    expect(codes).toContain("ja")
    expect(codes).toContain("it")
    expect(codes).toContain("pt")
    expect(codes).toContain("nl")
    expect(codes).toContain("pl")
    expect(codes).toContain("ru")
    expect(codes).toContain("ko")
    expect(codes).toContain("zh")
    expect(codes).toContain("ar")
    expect(codes).toContain("hi")
    expect(codes).toContain("tr")
    expect(codes).toContain("sv")
  })

  it("each language has code, name, and native fields", () => {
    for (const lang of supportedLanguages) {
      expect(lang.code).toBeTruthy()
      expect(lang.name).toBeTruthy()
      expect(lang.native).toBeTruthy()
    }
  })

  it("falls back to English for unsupported languages", () => {
    expect(i18n.options.fallbackLng).toEqual(["en"])
  })

  it("has interpolation escaping disabled", () => {
    expect(i18n.options.interpolation?.escapeValue).toBe(false)
  })
})
