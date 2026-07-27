import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

const asyncStorage = new Map<string, string>()
vi.mock("@react-native-async-storage/async-storage", () => {
  return {
    default: {
      getItem: vi.fn((key: string) => Promise.resolve(asyncStorage.get(key) ?? null)),
      setItem: vi.fn((key: string, value: string) => {
        asyncStorage.set(key, value)
        return Promise.resolve()
      }),
      removeItem: vi.fn((key: string) => {
        asyncStorage.delete(key)
        return Promise.resolve()
      }),
      clear: vi.fn(() => {
        asyncStorage.clear()
        return Promise.resolve()
      }),
      getAllKeys: vi.fn(() => Promise.resolve(Array.from(asyncStorage.keys()))),
      multiRemove: vi.fn((keys: string[]) => {
        for (const key of keys) asyncStorage.delete(key)
        return Promise.resolve()
      }),
    },
  }
})

vi.mock("expo-secure-store", () => {
  return {
    default: {
      getItemAsync: vi.fn(() => Promise.resolve(null)),
      setItemAsync: vi.fn(() => Promise.resolve()),
      deleteItemAsync: vi.fn(() => Promise.resolve()),
    },
    getItemAsync: vi.fn(() => Promise.resolve(null)),
    setItemAsync: vi.fn(() => Promise.resolve()),
    deleteItemAsync: vi.fn(() => Promise.resolve()),
  }
})

vi.mock("expo-clipboard", () => {
  return { default: { setStringAsync: vi.fn() }, setStringAsync: vi.fn(), getStringAsync: vi.fn() }
})

vi.mock("expo-document-picker", () => {
  return {
    default: { getDocumentAsync: vi.fn() },
    getDocumentAsync: vi.fn(() => Promise.resolve({ canceled: true })),
  }
})

vi.mock("expo-image-picker", () => {
  return {
    default: { launchImageLibraryAsync: vi.fn(), requestMediaLibraryPermissionsAsync: vi.fn() },
    launchImageLibraryAsync: vi.fn(() => Promise.resolve({ canceled: true, assets: [] })),
    requestMediaLibraryPermissionsAsync: vi.fn(() => Promise.resolve({ granted: true })),
  }
})

vi.mock("expo-file-system", () => {
  return {
    default: { documentDirectory: "/mock/documents/", readAsStringAsync: vi.fn(), writeAsStringAsync: vi.fn() },
    documentDirectory: "/mock/documents/",
    readAsStringAsync: vi.fn(() => Promise.resolve("")),
    writeAsStringAsync: vi.fn(() => Promise.resolve()),
  }
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "app.name": "Chats",
        "auth.emailOrUsername": "Email or username",
        "auth.password": "Password",
        "auth.username": "Username",
        "auth.email": "Email",
        "auth.signIn": "Sign In",
        "auth.register": "Register",
        "auth.networkError": "Network error",
        "auth.createAccount": "Create Account",
        "auth.create": "Create",
        "auth.hasAccount": "Already have an account?",
        "auth.hidePassword": "Hide password",
        "auth.showPassword": "Show password",
        "auth.invalidCredentials": "Invalid credentials",
        "auth.login": "Login",
        "auth.noAccount": "Don't have an account?",
        "auth.registerToStart": "Register to start",
        "auth.signInToContinue": "Sign in to continue",
        "auth.somethingWentWrong": "Something went wrong",
        "auth.welcomeBack": "Welcome back",
        "common.required": "required",
        "settings.dark": "Dark",
        "settings.light": "Light",
        "settings.language": "Language",
        "status.online": "Online",
        "status.away": "Away",
        "status.busy": "Busy",
        "status.offline": "Offline",
        "status.idle": "Idle",
        "status.doNotDisturb": "Do Not Disturb",
        "status.setCustom": "Set custom status...",
        "status.customStatus": "Custom status",
        "status.title": "Status",
        "calls.title": "Calls",
        "calls.noCalls": "No call history",
        "profile.title": "Profile",
        "setup.welcome": "Welcome",
        "setup.language": "Language",
        "setup.theme": "Theme",
        "setup.displayName": "Display Name",
        "setup.skip": "Skip",
        "setup.next": "Next",
      }
      return map[key] ?? key
    },
    i18n: { language: "en", changeLanguage: () => {} },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}))

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

vi.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  Gesture: { Tap: () => {}, Pan: () => {}, Pinch: () => {}, Kick: () => {} },
  State: {},
  PanGestureHandler: ({ children }: any) => children,
  TapGestureHandler: ({ children }: any) => children,
  LongPressGestureHandler: ({ children }: any) => children,
}))

vi.mock("react-native-gesture-handler", async () => {
  const React = await import("react")
  const ce = (type: string, props: any, ...children: any[]) =>
    ((React as any).default || React).createElement(type, props, ...children)
  const MockView = ({ children, ...props }: any) => ce("div", props, children)
  MockView.displayName = "GestureHandlerRootView"
  return {
    GestureHandlerRootView: MockView,
    Gesture: { Tap: () => {}, Pan: () => {}, Pinch: () => {}, Rotation: () => {} },
    State: {},
    PanGestureHandler: MockView,
    TapGestureHandler: MockView,
    LongPressGestureHandler: MockView,
  }
})
