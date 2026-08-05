import { describe, it, expect, vi, beforeEach } from "vitest";
import i18n from "./index";

vi.mock("react-i18next", () => ({
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

describe("i18n configuration", () => {
  it("initializes with English as default", () => {
    expect(i18n.language).toBe("en");
  });

  it("has en and de resources loaded", () => {
    expect(i18n.getResourceBundle("en", "translation")).toBeDefined();
    expect(i18n.getResourceBundle("de", "translation")).toBeDefined();
  });

  it("has fr, es, ja resources loaded", () => {
    expect(i18n.getResourceBundle("fr", "translation")).toBeDefined();
    expect(i18n.getResourceBundle("es", "translation")).toBeDefined();
    expect(i18n.getResourceBundle("ja", "translation")).toBeDefined();
  });
});

describe("English translations", () => {
  beforeEach(() => {
    i18n.changeLanguage("en");
  });

  it("resolves nav keys correctly", () => {
    expect(i18n.t("nav.messages")).toBe("Messages");
    expect(i18n.t("nav.settings")).toBe("Settings");
    expect(i18n.t("nav.logout")).toBe("Logout");
  });

  it("resolves auth keys correctly", () => {
    expect(i18n.t("auth.welcomeBack")).toBe("Welcome back");
    expect(i18n.t("auth.signIn")).toBe("Sign In");
    expect(i18n.t("auth.password")).toBe("Password");
  });

  it("resolves chat keys correctly", () => {
    expect(i18n.t("chat.sendMessage")).toBe("Send a message...");
    expect(i18n.t("chat.typing")).toBe("typing...");
    expect(i18n.t("chat.conversations")).toBe("Conversations");
  });

  it("resolves settings keys correctly", () => {
    expect(i18n.t("settings.title")).toBe("Settings");
    expect(i18n.t("settings.tabs.language")).toBe("Language & Region");
    expect(i18n.t("settings.language.appLanguage")).toBe("App Language");
  });

  it("resolves common keys correctly", () => {
    expect(i18n.t("common.loading")).toBe("Loading...");
    expect(i18n.t("common.save")).toBe("Save");
    expect(i18n.t("common.cancel")).toBe("Cancel");
  });

  it("resolves theme editor keys correctly", () => {
    expect(i18n.t("themeEditor.customThemes")).toBe("Custom Themes");
    expect(i18n.t("themeEditor.createTheme")).toBe("Create Theme");
  });
});

describe("German translations", () => {
  beforeEach(() => {
    i18n.changeLanguage("de");
  });

  it("resolves nav keys in German", () => {
    expect(i18n.t("nav.messages")).toBe("Nachrichten");
    expect(i18n.t("nav.settings")).toBe("Einstellungen");
    expect(i18n.t("nav.logout")).toBe("Abmelden");
  });

  it("resolves chat keys in German", () => {
    expect(i18n.t("chat.sendMessage")).toBe("Nachricht senden...");
    expect(i18n.t("chat.typing")).toBe("schreibt...");
    expect(i18n.t("chat.conversations")).toBe("Unterhaltungen");
  });

  it("resolves settings keys in German", () => {
    expect(i18n.t("settings.title")).toBe("Einstellungen");
    expect(i18n.t("settings.tabs.language")).toBe("Sprache & Region");
    expect(i18n.t("settings.language.appLanguage")).toBe("App-Sprache");
  });

  it("resolves common keys in German", () => {
    expect(i18n.t("common.loading")).toBe("Laden...");
    expect(i18n.t("common.save")).toBe("Speichern");
  });
});

describe("language switching", () => {
  it("switches from English to German", async () => {
    i18n.changeLanguage("en");
    expect(i18n.t("nav.messages")).toBe("Messages");
    await i18n.changeLanguage("de");
    expect(i18n.t("nav.messages")).toBe("Nachrichten");
  });

  it("switches from German to English", async () => {
    await i18n.changeLanguage("de");
    expect(i18n.t("nav.messages")).toBe("Nachrichten");
    await i18n.changeLanguage("en");
    expect(i18n.t("nav.messages")).toBe("Messages");
  });

  it("falls back to English for unsupported languages", async () => {
    await i18n.changeLanguage("eo");
    expect(i18n.t("nav.messages")).toBe("Messages");
  });

  it("toggles between multiple languages", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("common.cancel")).toBe("Cancel");
    await i18n.changeLanguage("de");
    expect(i18n.t("common.cancel")).toBe("Abbrechen");
    await i18n.changeLanguage("en");
    expect(i18n.t("common.cancel")).toBe("Cancel");
  });
});
