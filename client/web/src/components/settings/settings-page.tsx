import { useState, useEffect, useCallback } from "react"
import { api } from "../../lib/api"
import { useAuth } from "../../lib/auth-context"
import { useTheme } from "../../lib/theme-context"
import { ThemeEditor } from "./theme-editor"
import { Avatar } from "../ui/avatar"
import { getPendingMessages, clearPendingMessages, clearConversationCache } from "../../lib/offline"
import { supportedLanguages } from "../../lib/i18n"
import i18n from "../../lib/i18n"
import { useTranslation } from "react-i18next"
import {
  User,
  Shield,
  Palette,
  Bell,
  Lock,
  Info,
  History,
  Key,
  Check,
  Copy,
  Smartphone,
  Moon,
  Sun,
  Eye,
  LogOut,
  Mail,
  Globe,
  MessageSquare,
  Volume2,
  Send,
  Monitor,
  Music,
  Camera,
  Mic,
  Video,
  Terminal,
  MessageCircle,
  BookOpen,
  Sliders,
  Cloud,
  Zap,
  Type,
  Image,
  FileText,
  Hash,
  Clock,
  Calendar,
  Ruler,
  Layers,
  Headphones,
  Mic2,
  Phone,
  Trash2,
  Square,
  Grid3X3,
  Search,
  Sparkles,
  Wifi,
  RefreshCw,
  Keyboard,
} from "lucide-react"

interface TOTPStatus {
  enabled: boolean
}
interface LoginEntry {
  id: string
  ip: string | null
  userAgent: string | null
  success: string
  createdAt: string
}
interface Session {
  id: string
  createdAt: string
  expiresAt: string
}

interface Preferences {
  // Notifications
  messageNotifications?: boolean
  groupInvites?: boolean
  communityUpdates?: boolean
  eventReminders?: boolean
  callAlerts?: boolean
  notificationSound?: boolean
  desktopNotifications?: boolean
  pushNotifications?: boolean
  mentionOnly?: boolean
  notificationPreview?: boolean
  dndEnabled?: boolean
  dndStart?: string
  dndEnd?: string
  badgeCount?: boolean
  messagePreview?: boolean
  keywordAlerts?: string
  notificationSoundName?: string
  notificationVolume?: number
  // Privacy
  readReceipts?: boolean
  showOnlineStatus?: boolean
  allowFriendRequests?: boolean
  dmFrom?: "everyone" | "friends" | "off"
  explicitFilter?: boolean
  safetyAlerts?: boolean
  shareActivity?: boolean
  showPresence?: boolean
  // Chat
  enterToSend?: boolean
  showTypingIndicators?: boolean
  autoPlayMedia?: boolean
  imagePreviews?: boolean
  linkPreviews?: boolean
  emojiSuggestions?: boolean
  markdownPreview?: boolean
  spellCheck?: boolean
  autoCorrect?: boolean
  messageGrouping?: boolean
  replyPreview?: boolean
  autoDownloadFiles?: boolean
  imageQuality?: "low" | "medium" | "high"
  gifAutoplay?: boolean
  videoAutoplay?: boolean
  stickerSuggestions?: boolean
  inlineCodePreview?: boolean
  // Appearance
  compactMode?: boolean
  fontSize?: "small" | "medium" | "large" | "xlarge"
  timeFormat?: "12h" | "24h"
  fontFamily?: string
  monospaceFont?: string
  showTimestamps?: "always" | "hover" | "off"
  avatarStyle?: "circle" | "square"
  avatarSize?: "small" | "medium" | "large"
  avatarChatSize?: "small" | "medium" | "large"
  animatedEmoji?: boolean
  reduceMotion?: boolean
  reduceTransparency?: boolean
  chatBubbleStyle?: "rounded" | "flat" | "minimal"
  sidebarWidth?: "narrow" | "default" | "wide"
  accentColor?: string
  secondaryColor?: string
  surfaceColor?: string
  backgroundColor?: string
  textColor?: string
  linkColor?: string
  borderColor?: string
  successColor?: string
  dangerColor?: string
  warningColor?: string
  glassMorphism?: boolean
  saturation?: number
  contrast?: number
  brightness?: number
  // Corners
  borderRadius?: "none" | "small" | "medium" | "large" | "full"
  buttonRadius?: "none" | "small" | "medium" | "large" | "full"
  inputRadius?: "none" | "small" | "medium" | "large" | "full"
  chatBubbleRadius?: "none" | "small" | "medium" | "large" | "full"
  avatarRadius?: "none" | "small" | "medium" | "full"
  modalRadius?: "none" | "small" | "medium" | "large" | "full"
  cardRadius?: "none" | "small" | "medium" | "large" | "full"
  // Shadows & Effects
  shadowIntensity?: "none" | "light" | "medium" | "strong"
  borderWidth?: "none" | "thin" | "normal" | "thick"
  hoverScale?: number
  transitionDuration?: "fast" | "normal" | "slow"
  animationSpeed?: "slow" | "normal" | "fast" | "none"
  backgroundPattern?: "none" | "dots" | "grid" | "waves"
  backgroundBlur?: number
  // Layout
  messageSpacing?: "compact" | "normal" | "relaxed"
  sectionSpacing?: "compact" | "normal" | "relaxed"
  elementGap?: "compact" | "normal" | "wide"
  listDensity?: "compact" | "normal" | "relaxed"
  channelListDensity?: "compact" | "normal" | "relaxed"
  memberListWidth?: "narrow" | "default" | "wide"
  sidebarPosition?: "left" | "right"
  showHeader?: boolean
  showFooter?: boolean
  scrollbarStyle?: "default" | "thin" | "hidden"
  scrollbarWidth?: number
  scrollBehavior?: "smooth" | "instant"
  // Messages
  dateSeparator?: "full" | "short" | "none"
  dateSeparatorStyle?: "line" | "pill" | "minimal"
  senderNameFormat?: "full" | "first" | "none"
  badgeStyle?: "dot" | "pill" | "number"
  notificationDotSize?: "small" | "medium" | "large"
  typingIndicatorStyle?: "dots" | "pulse" | "text"
  loadingStyle?: "spinner" | "skeleton" | "dots"
  codeBlockTheme?: "light" | "dark" | "auto"
  codeFontSize?: "small" | "medium" | "large"
  codeBackground?: string
  linkStyle?: "underline" | "colored" | "both"
  mentionStyle?: "highlight" | "bold" | "both"
  spoilerStyle?: "blur" | "hidden" | "reveal"
  blockquoteStyle?: "line" | "accent" | "modern"
  headingStyle?: "default" | "accent" | "underlined"
  // Animations
  pageTransition?: "fade" | "slide" | "scale" | "none"
  messageAnimation?: "fade" | "slide" | "scale" | "none"
  modalAnimation?: "fade" | "scale" | "slide" | "none"
  hoverAnimation?: "scale" | "glow" | "lift" | "none"
  reactionAnimation?: "bounce" | "pop" | "fade" | "none"
  skeletonStyle?: "shimmer" | "pulse" | "none"
  stickyHeader?: boolean
  // Chat
  avatarPresenceSize?: "small" | "medium" | "large"
  imagePreviewSize?: "small" | "medium" | "large"
  inlineCodeStyle?: "modern" | "classic" | "minimal"
  selectionColor?: string
  highlightColor?: string
  // Language
  language?: string
  dateFormat?: "MDY" | "DMY" | "YMD"
  firstDayOfWeek?: "mon" | "sun"
  timezone?: string
  temperatureUnit?: "c" | "f"
  measurementSystem?: "metric" | "imperial"
  // Accessibility
  highContrast?: boolean
  screenReader?: boolean
  stickyHeaders?: boolean
  focusIndicators?: boolean
  colorBlindMode?: string
  lineHeight?: number
  letterSpacing?: number
  chatBubbleDir?: "auto" | "left" | "right"
  // Calls
  defaultMic?: string
  defaultSpeaker?: string
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
  videoQuality?: "480p" | "720p" | "1080p"
  pictureInPicture?: boolean
  pushToTalk?: boolean
  voiceActivityThreshold?: number
  callRecording?: boolean
  ringtone?: string
  // Audio/Video
  inputDevice?: string
  outputDevice?: string
  camera?: string
  micSensitivity?: number
  videoBackgroundBlur?: boolean
  videoResolution?: string
  frameRate?: number
  // Advanced
  developerMode?: boolean
  experimentalFeatures?: boolean
  hardwareAcceleration?: boolean
  loggingLevel?: "error" | "warn" | "info" | "debug"
  autoUpdate?: boolean
  crashReporting?: boolean
  diagnostics?: boolean
  cacheEnabled?: boolean
  sessionTimeout?: string
  securityAlerts?: boolean
  // Media
  voiceMessageQuality?: "low" | "medium" | "high"
  maxFileSize?: number
  downloadLocation?: string
  imageSaveQuality?: number
  // Reader
  readerMode?: boolean
  fontSizeReader?: number
  lineSpacing?: number
  // Shortcuts
  shortcutNavigateUp?: string
  shortcutNavigateDown?: string
  shortcutNewChat?: string
  shortcutSearch?: string
  shortcutToggleSidebar?: string
  shortcutJumpToDm?: string
  shortcutMarkRead?: string
  shortcutQuickReply?: string
  shortcutToggleMute?: string
  shortcutToggleTheme?: string
  shortcutQuickSwitch?: string
  shortcutCreateGroup?: string
}

const defaultPrefs: Preferences = {
  messageNotifications: true,
  groupInvites: true,
  communityUpdates: true,
  eventReminders: true,
  callAlerts: true,
  notificationSound: true,
  desktopNotifications: true,
  pushNotifications: true,
  mentionOnly: false,
  notificationPreview: true,
  dndEnabled: false,
  badgeCount: true,
  messagePreview: true,
  keywordAlerts: "",
  notificationSoundName: "default",
  notificationVolume: 80,
  readReceipts: true,
  showOnlineStatus: true,
  allowFriendRequests: true,
  dmFrom: "everyone",
  explicitFilter: true,
  safetyAlerts: true,
  shareActivity: true,
  showPresence: true,
  enterToSend: true,
  showTypingIndicators: true,
  autoPlayMedia: true,
  imagePreviews: true,
  linkPreviews: true,
  emojiSuggestions: true,
  markdownPreview: true,
  spellCheck: true,
  autoCorrect: false,
  messageGrouping: true,
  replyPreview: true,
  autoDownloadFiles: false,
  imageQuality: "high",
  gifAutoplay: true,
  videoAutoplay: true,
  stickerSuggestions: true,
  inlineCodePreview: true,
  compactMode: false,
  fontSize: "medium",
  timeFormat: "12h",
  fontFamily: "system",
  monospaceFont: "monospace",
  showTimestamps: "always",
  avatarStyle: "circle",
  avatarSize: "medium",
  avatarChatSize: "medium",
  animatedEmoji: true,
  reduceMotion: false,
  reduceTransparency: false,
  chatBubbleStyle: "rounded",
  sidebarWidth: "default",
  accentColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  glassMorphism: false,
  saturation: 100,
  contrast: 100,
  brightness: 100,
  borderRadius: "medium",
  buttonRadius: "medium",
  inputRadius: "medium",
  chatBubbleRadius: "large",
  avatarRadius: "full",
  modalRadius: "large",
  cardRadius: "medium",
  shadowIntensity: "medium",
  borderWidth: "normal",
  hoverScale: 1.05,
  transitionDuration: "normal",
  animationSpeed: "normal",
  backgroundPattern: "none",
  backgroundBlur: 0,
  messageSpacing: "normal",
  sectionSpacing: "normal",
  elementGap: "normal",
  listDensity: "normal",
  channelListDensity: "normal",
  memberListWidth: "default",
  sidebarPosition: "left",
  showHeader: true,
  showFooter: false,
  scrollbarStyle: "default",
  scrollbarWidth: 8,
  scrollBehavior: "smooth",
  dateSeparator: "full",
  dateSeparatorStyle: "pill",
  senderNameFormat: "full",
  badgeStyle: "pill",
  notificationDotSize: "medium",
  typingIndicatorStyle: "dots",
  loadingStyle: "spinner",
  codeBlockTheme: "dark",
  codeFontSize: "medium",
  codeBackground: "#1e1e2e",
  linkStyle: "both",
  mentionStyle: "highlight",
  spoilerStyle: "blur",
  blockquoteStyle: "line",
  headingStyle: "default",
  pageTransition: "fade",
  messageAnimation: "fade",
  modalAnimation: "scale",
  hoverAnimation: "lift",
  reactionAnimation: "pop",
  skeletonStyle: "shimmer",
  stickyHeader: true,
  avatarPresenceSize: "small",
  imagePreviewSize: "medium",
  inlineCodeStyle: "modern",
  language: "en",
  dateFormat: "MDY",
  firstDayOfWeek: "sun",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  temperatureUnit: "c",
  measurementSystem: "metric",
  highContrast: false,
  screenReader: false,
  stickyHeaders: true,
  focusIndicators: true,
  colorBlindMode: "off",
  lineHeight: 1.5,
  letterSpacing: 0,
  chatBubbleDir: "auto",
  defaultMic: "default",
  defaultSpeaker: "default",
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  videoQuality: "720p",
  pictureInPicture: true,
  pushToTalk: false,
  voiceActivityThreshold: 50,
  callRecording: false,
  ringtone: "default",
  inputDevice: "default",
  outputDevice: "default",
  camera: "default",
  micSensitivity: 80,
  videoBackgroundBlur: false,
  videoResolution: "1280x720",
  frameRate: 30,
  developerMode: false,
  experimentalFeatures: false,
  hardwareAcceleration: true,
  loggingLevel: "info",
  autoUpdate: true,
  crashReporting: true,
  diagnostics: false,
  cacheEnabled: true,
  voiceMessageQuality: "medium",
  maxFileSize: 25,
  downloadLocation: "default",
  imageSaveQuality: 90,
  readerMode: false,
  fontSizeReader: 16,
  lineSpacing: 1.6,
  shortcutNavigateUp: "ArrowUp",
  shortcutNavigateDown: "ArrowDown",
  shortcutNewChat: "Ctrl+N",
  shortcutSearch: "Ctrl+K",
  shortcutToggleSidebar: "Ctrl+B",
  shortcutJumpToDm: "Ctrl+Shift+K",
  shortcutMarkRead: "Escape",
  shortcutQuickReply: "R",
  shortcutToggleMute: "Ctrl+Shift+M",
  shortcutToggleTheme: "Ctrl+Shift+T",
  shortcutQuickSwitch: "Ctrl+Tab",
  shortcutCreateGroup: "Ctrl+Shift+N",
}

type SettingsTab =
  | "account"
  | "security"
  | "appearance"
  | "notifications"
  | "privacy"
  | "chat"
  | "accessibility"
  | "language"
  | "calls"
  | "media"
  | "audio-video"
  | "advanced"
  | "shortcuts"
  | "about"

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-10 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? "bg-accent" : "bg-border"}`}
      aria-label={label}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`}
      />
    </button>
  )
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary outline-none focus:border-accent/50 cursor-pointer max-w-[160px]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function SliderControl({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 rounded-full bg-border appearance-none cursor-pointer accent-accent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow"
        aria-label={label}
      />
      <span className="text-xs text-text-muted w-8 text-right">
        {value}
        {step && step < 1 ? "" : ""}
      </span>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-muted shrink-0" />
        {title}
      </h2>
      <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">{children}</div>
    </section>
  )
}

function Row({ label, desc, control, id }: { label: string; desc: string; control: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-center justify-between gap-4" id={id}>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary truncate">{label}</p>
        <p className="text-xs text-text-muted truncate">{desc}</p>
      </div>
      {control}
    </div>
  )
}

function OfflineCacheInfo() {
  const { t } = useTranslation()
  const [queueCount, setQueueCount] = useState(getPendingMessages().length)
  const [msg, setMsg] = useState("")

  const refreshQueue = () => setQueueCount(getPendingMessages().length)

  const handleClearQueue = () => {
    clearPendingMessages()
    setQueueCount(0)
    setMsg(t("settings.offline.queueCleared"))
    setTimeout(() => setMsg(""), 2000)
  }

  const handleClearCache = () => {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("offline:messages:")) keys.push(key)
    }
    keys.forEach((k) => clearConversationCache(k.replace("offline:messages:", "")))
    setMsg(t("settings.offline.cacheCleared"))
    setTimeout(() => setMsg(""), 2000)
  }

  return (
    <div className="space-y-3" role="group">
      <Row
        id="settings.offline.pendingQueue"
        label={t("settings.offline.pendingQueue")}
        desc={t("settings.offline.pendingQueueDesc")}
        control={
          <button
            onClick={refreshQueue}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-all"
            aria-label={t("settings.offline.refresh")}
          >
            <RefreshCw className="h-3 w-3" />
            <span>{queueCount}</span>
          </button>
        }
      />
      <div className="flex gap-2">
        <button
          onClick={handleClearQueue}
          disabled={queueCount === 0}
          className="flex-1 h-8 rounded-2xl bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {t("settings.offline.clearQueue")}
        </button>
        <button
          onClick={handleClearCache}
          className="flex-1 h-8 rounded-2xl bg-warning/10 text-warning text-xs font-medium hover:bg-warning/20 transition-all cursor-pointer"
        >
          {t("settings.offline.clearCache")}
        </button>
      </div>
      {msg && <p className="text-xs text-text-muted">{msg}</p>}
    </div>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const tabs: { id: SettingsTab; label: string; icon: any; group?: string }[] = [
    { id: "account", label: t("settings.tabs.account"), icon: User },
    { id: "security", label: t("settings.tabs.security"), icon: Shield },
    { id: "appearance", label: t("settings.tabs.appearance"), icon: Palette },
    { id: "notifications", label: t("settings.tabs.notifications"), icon: Bell },
    { id: "privacy", label: t("settings.tabs.privacy"), icon: Lock },
    { id: "chat", label: t("settings.tabs.chat"), icon: MessageSquare, group: t("settings.groups.communication") },
    { id: "calls", label: t("settings.tabs.calls"), icon: Phone, group: t("settings.groups.communication") },
    { id: "media", label: t("settings.tabs.media"), icon: Image, group: t("settings.groups.communication") },
    { id: "audio-video", label: t("settings.tabs.audio-video"), icon: Mic2, group: t("settings.groups.communication") },
    { id: "accessibility", label: t("settings.tabs.accessibility"), icon: Eye, group: t("settings.groups.experience") },
    { id: "shortcuts", label: t("settings.tabs.shortcuts"), icon: Keyboard, group: t("settings.groups.experience") },
    { id: "language", label: t("settings.tabs.language"), icon: Globe, group: t("settings.groups.experience") },
    { id: "advanced", label: t("settings.tabs.advanced"), icon: Terminal, group: t("settings.groups.system") },
    { id: "about", label: t("settings.tabs.about"), icon: Info },
  ]
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [tab, setTab] = useState<SettingsTab>("account")
  const [searchQuery, setSearchQuery] = useState("")
  const [totpStatus, setTotpStatus] = useState<TOTPStatus | null>(null)
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [secret, setSecret] = useState("")
  const [setupUri, setSetupUri] = useState("")
  const [verifyCode, setVerifyCode] = useState("")
  const [showVerify, setShowVerify] = useState(false)
  const [copied, setCopied] = useState(false)
  const [verifyMsg, setVerifyMsg] = useState("")
  const [sendingVerification, setSendingVerification] = useState(false)
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs)
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!highlightedKey) return
    const el = document.getElementById(highlightedKey)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-accent/50", "rounded-2xl", "transition-all", "duration-1000")
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-accent/50", "rounded-2xl")
        setHighlightedKey(null)
      }, 2500)
    }
  }, [tab, highlightedKey])

  useEffect(() => {
    api<Preferences>("/api/users/preferences")
      .then((p) => setPrefs({ ...defaultPrefs, ...p }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "L") {
        e.preventDefault()
        setTab("language")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const updatePref = useCallback(
    async (key: keyof Preferences, value: any) => {
      const next = { ...prefs, [key]: value }
      setPrefs(next)
      if (key === "language") {
        i18n.changeLanguage(value)
      }
      try {
        await api("/api/users/preferences", { method: "PUT", body: JSON.stringify(next) })
      } catch {
        /* */
      }
    },
    [prefs],
  )

  const [statusEmojiLocal, setStatusEmojiLocal] = useState("")
  const [statusEmojiSaveMsg, setStatusEmojiSaveMsg] = useState("")
  const [customStatusText, setCustomStatusText] = useState("")
  const [savingCustomStatus, setSavingCustomStatus] = useState(false)
  const [customStatusMsg, setCustomStatusMsg] = useState("")

  useEffect(() => {
    api<{ customStatus: string | null }>("/api/users/me")
      .then((u) => setCustomStatusText(u.customStatus ?? ""))
      .catch(() => {})
  }, [])

  const saveCustomStatus = async () => {
    setSavingCustomStatus(true)
    try {
      await api("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ customStatus: customStatusText }),
      })
      setCustomStatusMsg(t("settings.status.saved"))
      setTimeout(() => setCustomStatusMsg(""), 2000)
    } catch {
      /* */
    }
    setSavingCustomStatus(false)
  }

  useEffect(() => {
    const activeTheme = localStorage.getItem("customThemeId")
    if (activeTheme) {
      const stored = localStorage.getItem("customTheme")
      if (stored) {
        try {
          const config = JSON.parse(stored)
          setStatusEmojiLocal(config.statusEmoji ?? "")
        } catch {
          /* */
        }
      }
    }
  }, [])

  const saveStatusEmoji = async (emoji: string) => {
    try {
      const active = await api<{ id: string; theme: string; name?: string } | null>("/api/themes/active")
      if (active) {
        const themeConfig = JSON.parse(active.theme)
        themeConfig.statusEmoji = emoji
        await api(`/api/themes/${active.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: active.name || "Custom Theme", theme: themeConfig }),
        })
        localStorage.setItem("customTheme", JSON.stringify(themeConfig))
        setStatusEmojiSaveMsg(t("settings.status.saved"))
        setTimeout(() => setStatusEmojiSaveMsg(""), 2000)
      }
    } catch {
      /* */
    }
  }

  const clearStatusEmoji = () => {
    setStatusEmojiLocal("")
    saveStatusEmoji("")
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      saveStatusEmoji(statusEmojiLocal)
    }, 500)
    return () => clearTimeout(timer)
  }, [statusEmojiLocal])

  const [blockedUsers, setBlockedUsers] = useState<
    { blockedUserId: string; createdAt: string; username: string; displayName: string | null; avatar: string | null }[]
  >([])

  const fetchBlocked = useCallback(async () => {
    try {
      const list = await api<typeof blockedUsers>("/api/privacy/blocks")
      setBlockedUsers(list)
    } catch {
      /* */
    }
  }, [])

  const unblockUser = async (userId: string) => {
    try {
      await api(`/api/privacy/blocks/${userId}`, { method: "DELETE" })
      setBlockedUsers((prev) => prev.filter((b) => b.blockedUserId !== userId))
    } catch {
      /* */
    }
  }

  useEffect(() => {
    if (tab === "privacy") {
      fetchBlocked()
    }
  }, [tab, fetchBlocked])

  useEffect(() => {
    if (tab === "security") {
      api<TOTPStatus>("/api/security/totp/status")
        .then(setTotpStatus)
        .catch(() => {})
      api<LoginEntry[]>("/api/security/history")
        .then(setLoginHistory)
        .catch(() => {})
      api<Session[]>("/api/auth/sessions")
        .then(setSessions)
        .catch(() => {})
    }
  }, [tab])

  const setupTOTP = async () => {
    const data = await api<{ secret: string; uri: string }>("/api/security/totp/setup", { method: "POST" }).catch(
      () => null,
    )
    if (data) {
      setSecret(data.secret)
      setSetupUri(data.uri)
      setShowVerify(true)
    }
  }
  const verifyTOTP = async () => {
    if (!verifyCode.trim()) return
    await api("/api/security/totp/verify", { method: "POST", body: JSON.stringify({ code: verifyCode.trim() }) }).catch(
      () => null,
    )
    setTotpStatus({ enabled: true })
    setShowVerify(false)
    setVerifyCode("")
  }
  const disableTOTP = async () => {
    await api("/api/security/totp/disable", { method: "POST" }).catch(() => {})
    setTotpStatus({ enabled: false })
    setSecret("")
    setSetupUri("")
  }
  const revokeSession = async (id: string) => {
    await api(`/api/auth/sessions/${id}`, { method: "DELETE" }).catch(() => {})
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }
  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const formatDate = (iso: string) => new Date(iso).toLocaleString()
  const formatUA = (ua: string | null) => {
    if (!ua) return t("common.unknown")
    if (ua.includes("Chrome")) return "Chrome"
    if (ua.includes("Firefox")) return "Firefox"
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"
    if (ua.includes("Expo")) return "Mobile App"
    return ua.slice(0, 30)
  }

  const settingsSearchIndex = [
    // Account
    { key: "settings.account.username", tab: "account" as SettingsTab, label: t("settings.account.username") },
    { key: "settings.account.displayName", tab: "account" as SettingsTab, label: t("settings.account.displayName") },
    { key: "settings.account.email", tab: "account" as SettingsTab, label: t("settings.account.email") },
    {
      key: "settings.account.emailVerification",
      tab: "account" as SettingsTab,
      label: t("settings.account.emailVerification"),
    },
    {
      key: "settings.account.activeSessions",
      tab: "account" as SettingsTab,
      label: t("settings.account.activeSessions"),
    },
    { key: "settings.account.dangerZone", tab: "account" as SettingsTab, label: t("settings.account.dangerZone") },
    { key: "settings.account.memberSince", tab: "account" as SettingsTab, label: t("settings.account.memberSince") },
    // Security
    { key: "settings.security.twoFactor", tab: "security" as SettingsTab, label: t("settings.security.twoFactor") },
    {
      key: "settings.security.loginHistory",
      tab: "security" as SettingsTab,
      label: t("settings.security.loginHistory"),
    },
    {
      key: "settings.security.sessionTimeout",
      tab: "security" as SettingsTab,
      label: t("settings.security.sessionTimeout"),
    },
    {
      key: "settings.security.securityAlerts",
      tab: "security" as SettingsTab,
      label: t("settings.security.securityAlerts"),
    },
    {
      key: "settings.security.twoFactor",
      tab: "security" as SettingsTab,
      label: t("settings.security.twoFactor"),
      keywords: ["2fa", "totp"],
    },
    // Status
    {
      key: "settings.status.customStatus",
      tab: "appearance" as SettingsTab,
      label: t("settings.status.oneliner"),
      keywords: ["status", "oneliner", "custom", "bio", "about"],
    },
    {
      key: "settings.status.statusEmoji",
      tab: "appearance" as SettingsTab,
      label: t("themeEditor.statusEmoji"),
      keywords: ["status", "emoji", "dot", "presence", "looks"],
    },
    // Appearance
    { key: "settings.appearance.darkMode", tab: "appearance" as SettingsTab, label: t("settings.appearance.darkMode") },
    {
      key: "settings.appearance.themeMode",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.themeMode"),
    },
    {
      key: "settings.appearance.accentColor",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.accentColor"),
    },
    {
      key: "settings.appearance.secondaryColor",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.secondaryColor"),
    },
    {
      key: "settings.appearance.glassMorphism",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.glassMorphism"),
    },
    {
      key: "settings.appearance.backgroundPattern",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.backgroundPattern"),
    },
    {
      key: "settings.appearance.backgroundBlur",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.backgroundBlur"),
    },
    {
      key: "settings.appearance.saturation",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.saturation"),
    },
    { key: "settings.appearance.contrast", tab: "appearance" as SettingsTab, label: t("settings.appearance.contrast") },
    {
      key: "settings.appearance.brightness",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.brightness"),
    },
    {
      key: "settings.appearance.fontFamily",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.fontFamily"),
    },
    {
      key: "settings.appearance.monospaceFont",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.monospaceFont"),
    },
    { key: "settings.appearance.fontSize", tab: "appearance" as SettingsTab, label: t("settings.appearance.fontSize") },
    {
      key: "settings.appearance.codeFontSize",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.codeFontSize"),
    },
    {
      key: "settings.appearance.codeBackground",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.codeBackground"),
    },
    {
      key: "settings.appearance.defaultRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.defaultRadius"),
    },
    {
      key: "settings.appearance.buttonRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.buttonRadius"),
    },
    {
      key: "settings.appearance.inputRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.inputRadius"),
    },
    {
      key: "settings.appearance.chatBubbleRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.chatBubbleRadius"),
    },
    {
      key: "settings.appearance.avatarRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.avatarRadius"),
    },
    {
      key: "settings.appearance.modalRadius",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.modalRadius"),
    },
    {
      key: "settings.appearance.sidebarWidth",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.sidebarWidth"),
    },
    {
      key: "settings.appearance.compactMode",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.compactMode"),
    },
    {
      key: "settings.appearance.showTimestamps",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.showTimestamps"),
    },
    {
      key: "settings.appearance.chatBubbleStyle",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.chatBubbleStyle"),
    },
    {
      key: "settings.appearance.avatarStyle",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.avatarStyle"),
    },
    {
      key: "settings.appearance.avatarSize",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.avatarSize"),
    },
    {
      key: "settings.appearance.animatedEmoji",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.animatedEmoji"),
    },
    {
      key: "settings.appearance.reduceMotion",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.reduceMotion"),
    },
    {
      key: "settings.appearance.reduceTransparency",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.reduceTransparency"),
    },
    {
      key: "settings.appearance.accentColor",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.accentColor"),
      keywords: ["color"],
    },
    {
      key: "settings.appearance.typography",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.typography"),
      keywords: ["font"],
    },
    {
      key: "settings.appearance.corners",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.corners"),
      keywords: ["radius"],
    },
    {
      key: "settings.appearance.layout",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.layout"),
      keywords: ["sidebar", "spacing"],
    },
    {
      key: "settings.appearance.messageDisplay",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.messageDisplay"),
      keywords: ["bubble", "timestamps"],
    },
    {
      key: "settings.appearance.animations",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.animations"),
      keywords: ["motion", "animation"],
    },
    {
      key: "settings.appearance.loadingStyle",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.loadingStyle"),
    },
    {
      key: "settings.appearance.notificationDotSize",
      tab: "appearance" as SettingsTab,
      label: t("settings.appearance.notificationDotSize"),
    },
    {
      key: "themeEditor.statusEmoji",
      tab: "appearance" as SettingsTab,
      label: t("themeEditor.statusEmoji"),
      keywords: ["status", "looks", "presence", "emoji", "dot", "online", "away", "busy"],
    },
    // Notifications
    {
      key: "settings.notifications.messages",
      tab: "notifications" as SettingsTab,
      label: t("settings.notifications.messages"),
    },
    {
      key: "settings.notifications.pushNotifications",
      tab: "notifications" as SettingsTab,
      label: t("settings.notifications.pushNotifications"),
    },
    {
      key: "settings.notifications.desktopNotifications",
      tab: "notifications" as SettingsTab,
      label: t("settings.notifications.desktopNotifications"),
    },
    {
      key: "settings.notifications.notificationSound",
      tab: "notifications" as SettingsTab,
      label: t("settings.notifications.notificationSound"),
    },
    {
      key: "settings.notifications.dnd",
      tab: "notifications" as SettingsTab,
      label: t("settings.notifications.dnd"),
      keywords: ["do not disturb"],
    },
    // Privacy
    { key: "settings.privacy.readReceipts", tab: "privacy" as SettingsTab, label: t("settings.privacy.readReceipts") },
    {
      key: "settings.privacy.showOnlineStatus",
      tab: "privacy" as SettingsTab,
      label: t("settings.privacy.showOnlineStatus"),
    },
    {
      key: "settings.privacy.blockedMuted",
      tab: "privacy" as SettingsTab,
      label: t("settings.privacy.blockedMuted"),
      keywords: ["block", "mute"],
    },
    { key: "settings.privacy.safetyAlerts", tab: "privacy" as SettingsTab, label: t("settings.privacy.safetyAlerts") },
    {
      key: "settings.privacy.directMessages",
      tab: "privacy" as SettingsTab,
      label: t("settings.privacy.directMessages"),
      keywords: ["dm"],
    },
    // Chat
    { key: "settings.chat.enterToSend", tab: "chat" as SettingsTab, label: t("settings.chat.enterToSend") },
    {
      key: "settings.chat.showTypingIndicators",
      tab: "chat" as SettingsTab,
      label: t("settings.chat.showTypingIndicators"),
    },
    { key: "settings.chat.autoPlayMedia", tab: "chat" as SettingsTab, label: t("settings.chat.autoPlayMedia") },
    { key: "settings.chat.imagePreviews", tab: "chat" as SettingsTab, label: t("settings.chat.imagePreviews") },
    { key: "settings.chat.linkPreviews", tab: "chat" as SettingsTab, label: t("settings.chat.linkPreviews") },
    { key: "settings.chat.emojiSuggestions", tab: "chat" as SettingsTab, label: t("settings.chat.emojiSuggestions") },
    { key: "settings.chat.spellCheck", tab: "chat" as SettingsTab, label: t("settings.chat.spellCheck") },
    // Calls
    { key: "settings.calls.ringtone", tab: "calls" as SettingsTab, label: t("settings.calls.ringtone") },
    { key: "settings.calls.videoQuality", tab: "calls" as SettingsTab, label: t("settings.calls.videoQuality") },
    {
      key: "settings.calls.audioInput",
      tab: "calls" as SettingsTab,
      label: t("settings.calls.audioInput"),
      keywords: ["microphone"],
    },
    {
      key: "settings.calls.audioOutput",
      tab: "calls" as SettingsTab,
      label: t("settings.calls.audioOutput"),
      keywords: ["speaker"],
    },
    {
      key: "settings.calls.videoInput",
      tab: "calls" as SettingsTab,
      label: t("settings.calls.videoInput"),
      keywords: ["camera"],
    },
    // Media
    { key: "settings.media.imageQuality", tab: "media" as SettingsTab, label: t("settings.media.imageQuality") },
    { key: "settings.media.videoAutoplay", tab: "media" as SettingsTab, label: t("settings.media.videoAutoplay") },
    { key: "settings.media.gifAutoplay", tab: "media" as SettingsTab, label: t("settings.media.gifAutoplay") },
    {
      key: "settings.media.stickerSuggestions",
      tab: "media" as SettingsTab,
      label: t("settings.media.stickerSuggestions"),
    },
    // Audio & Video
    {
      key: "settings.audio-video.noiseSuppression",
      tab: "audio-video" as SettingsTab,
      label: t("settings.audio-video.noiseSuppression"),
      keywords: ["noise"],
    },
    {
      key: "settings.audio-video.echoCancellation",
      tab: "audio-video" as SettingsTab,
      label: t("settings.audio-video.echoCancellation"),
      keywords: ["echo"],
    },
    {
      key: "settings.audio-video.backgroundBlur",
      tab: "audio-video" as SettingsTab,
      label: t("settings.audio-video.backgroundBlur"),
      keywords: ["blur"],
    },
    {
      key: "settings.audio-video.virtualBackground",
      tab: "audio-video" as SettingsTab,
      label: t("settings.audio-video.virtualBackground"),
    },
    // Accessibility & Reader
    {
      key: "settings.accessibility.reduceMotion",
      tab: "accessibility" as SettingsTab,
      label: t("settings.accessibility.reduceMotion"),
      keywords: ["motion"],
    },
    {
      key: "settings.accessibility.reduceTransparency",
      tab: "accessibility" as SettingsTab,
      label: t("settings.accessibility.reduceTransparency"),
      keywords: ["transparency"],
    },
    {
      key: "settings.accessibility.colorBlindMode",
      tab: "accessibility" as SettingsTab,
      label: t("settings.accessibility.colorBlindMode"),
    },
    {
      key: "settings.accessibility.highContrast",
      tab: "accessibility" as SettingsTab,
      label: t("settings.accessibility.highContrast"),
      keywords: ["contrast"],
    },
    {
      key: "settings.accessibility.screenReader",
      tab: "accessibility" as SettingsTab,
      label: t("settings.accessibility.screenReader"),
      keywords: ["reader"],
    },
    { key: "settings.reader.fontSize", tab: "accessibility" as SettingsTab, label: t("settings.reader.fontSize") },
    { key: "settings.reader.lineHeight", tab: "accessibility" as SettingsTab, label: t("settings.reader.lineHeight") },
    {
      key: "settings.reader.columnWidth",
      tab: "accessibility" as SettingsTab,
      label: t("settings.reader.columnWidth"),
    },
    { key: "settings.reader.theme", tab: "accessibility" as SettingsTab, label: t("settings.reader.theme") },
    // Shortcuts
    {
      key: "settings.shortcuts.navigation",
      tab: "shortcuts" as SettingsTab,
      label: t("settings.shortcuts.navigation"),
      keywords: ["keys", "keyboard"],
    },
    {
      key: "settings.shortcuts.messaging",
      tab: "shortcuts" as SettingsTab,
      label: t("settings.shortcuts.messaging"),
      keywords: ["keys", "keyboard"],
    },
    {
      key: "settings.shortcuts.app",
      tab: "shortcuts" as SettingsTab,
      label: t("settings.shortcuts.app"),
      keywords: ["keys", "keyboard"],
    },
    // Language
    { key: "settings.language.interface", tab: "language" as SettingsTab, label: t("settings.language.interface") },
    { key: "settings.language.translation", tab: "language" as SettingsTab, label: t("settings.language.translation") },
    { key: "settings.language.timezone", tab: "language" as SettingsTab, label: t("settings.language.timezone") },
    { key: "settings.language.timeFormat", tab: "language" as SettingsTab, label: t("settings.language.timeFormat") },
    { key: "settings.language.dateFormat", tab: "language" as SettingsTab, label: t("settings.language.dateFormat") },
    // Advanced
    {
      key: "settings.advanced.developerMode",
      tab: "advanced" as SettingsTab,
      label: t("settings.advanced.developerMode"),
    },
    {
      key: "settings.advanced.experimentalFeatures",
      tab: "advanced" as SettingsTab,
      label: t("settings.advanced.experimentalFeatures"),
    },
    {
      key: "settings.advanced.cache",
      tab: "advanced" as SettingsTab,
      label: t("settings.advanced.cache"),
      keywords: ["cache"],
    },
    // About
    { key: "settings.about.version", tab: "about" as SettingsTab, label: t("settings.about.version") },
    { key: "settings.about.license", tab: "about" as SettingsTab, label: t("settings.about.license") },
    { key: "settings.about.privacyPolicy", tab: "about" as SettingsTab, label: t("settings.about.privacyPolicy") },
    { key: "settings.about.termsOfService", tab: "about" as SettingsTab, label: t("settings.about.termsOfService") },
    { key: "settings.about.credits", tab: "about" as SettingsTab, label: t("settings.about.credits") },
  ]

  const searchResults = searchQuery.trim()
    ? settingsSearchIndex.filter((item) => {
        const q = searchQuery.toLowerCase()
        if (item.label.toLowerCase().includes(q)) return true
        if (item.keywords?.some((k) => k.toLowerCase().includes(q))) return true
        return false
      })
    : []

  const grouped = tabs.reduce(
    (acc, tab) => {
      const g = tab.group ?? t("settings.groups.general")
      if (!acc[g]) acc[g] = []
      acc[g].push(tab)
      return acc
    },
    {} as Record<string, typeof tabs>,
  )

  return (
    <div className="flex h-full">
      <nav className="w-52 shrink-0 border-r border-border bg-bg-secondary p-3 space-y-1 flex flex-col overflow-y-auto">
        <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
          {t("settings.title")}
        </div>
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-2">
            <p className="px-3 py-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">{group}</p>
            {items.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    tab === t.id
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t.label}
                </button>
              )
            })}
          </div>
        ))}
        <div className="mt-auto pt-3 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-danger hover:bg-danger/5 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" /> {t("settings.logout")}
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 pb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("settings.search")}
              className="w-full h-9 rounded-2xl border border-border bg-bg-primary pl-9 pr-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
            />
          </div>
        </div>
        <div className="max-w-2xl mx-auto p-6 space-y-8">
          {searchQuery.trim() ? (
            <div className="space-y-4">
              <h1 className="text-lg font-semibold text-text-primary">
                {t("settings.searchResults")} (<span className="text-text-muted">{searchResults.length}</span>)
              </h1>
              {searchResults.length === 0 ? (
                <p className="text-sm text-text-muted">{t("settings.noResults")}</p>
              ) : (
                searchResults.map((r, i) => {
                  const tabDef = tabs.find((t) => t.id === r.tab)
                  const Icon = tabDef?.icon
                  return (
                    <button
                      key={`${r.tab}-${r.label}-${i}`}
                      onClick={() => {
                        setTab(r.tab)
                        setSearchQuery("")
                        setHighlightedKey(r.key)
                      }}
                      className="w-full flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-white/[0.02] transition-all cursor-pointer text-left"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent shrink-0">
                        {Icon && <Icon className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{r.label}</p>
                        <p className="text-xs text-text-muted">{tabDef?.label}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          ) : (
            <>
              {/* === ACCOUNT === */}
              {tab === "account" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.account.title")}</h1>
                  <Section icon={User} title={t("settings.account.profileInfo")}>
                    <Row
                      id="settings.account.username"
                      label={t("settings.account.username")}
                      desc={t("settings.account.usernameDesc")}
                      control={<span className="text-sm text-text-primary font-medium">@{user?.username}</span>}
                    />
                    <Row
                      id="settings.account.displayName"
                      label={t("settings.account.displayName")}
                      desc={t("settings.account.displayNameDesc")}
                      control={
                        <span className="text-sm text-text-primary">
                          {user?.displayName || t("settings.account.fallback")}
                        </span>
                      }
                    />
                    <Row
                      id="settings.account.email"
                      label={t("settings.account.email")}
                      desc={t("settings.account.emailDesc")}
                      control={<span className="text-sm text-text-primary">{user?.email}</span>}
                    />
                    <Row
                      id="settings.account.memberSince"
                      label={t("settings.account.memberSince")}
                      desc={t("settings.account.memberSinceDesc")}
                      control={
                        <span className="text-sm text-text-muted">
                          {user?.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : t("settings.account.fallback")}
                        </span>
                      }
                    />
                  </Section>
                  <Section icon={Mail} title={t("settings.account.emailVerification")}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-primary">{user?.email}</p>
                        <p
                          className={`text-xs ${user?.emailVerified === "true" ? "text-green-400" : "text-yellow-400"}`}
                        >
                          {user?.emailVerified === "true"
                            ? t("settings.account.verified")
                            : t("settings.account.notVerified")}
                        </p>
                      </div>
                      {user?.emailVerified !== "true" && (
                        <button
                          onClick={async () => {
                            setSendingVerification(true)
                            setVerifyMsg("")
                            try {
                              const res = await api<{ verifyUrl: string }>("/api/auth/send-verification", {
                                method: "POST",
                              })
                              setVerifyMsg(`${t("settings.account.sent")} ${res.verifyUrl}`)
                            } catch {
                              setVerifyMsg(t("settings.account.failed"))
                            }
                            setSendingVerification(false)
                          }}
                          disabled={sendingVerification}
                          className="text-xs text-accent hover:text-accent-hover cursor-pointer disabled:opacity-40"
                        >
                          {sendingVerification ? t("settings.account.sending") : t("settings.account.verifyEmail")}
                        </button>
                      )}
                    </div>
                    {verifyMsg && <p className="text-xs text-text-muted break-all">{verifyMsg}</p>}
                  </Section>
                  <Section icon={Smartphone} title={t("settings.account.activeSessions")}>
                    {sessions.length === 0 && (
                      <p className="text-sm text-text-muted">{t("settings.account.noSessions")}</p>
                    )}
                    {sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-text-primary">{t("settings.account.session")}</p>
                          <p className="text-xs text-text-muted">
                            {t("settings.account.created")} {formatDate(s.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => revokeSession(s.id)}
                          className="text-xs text-danger hover:text-danger/80 cursor-pointer"
                        >
                          {t("settings.account.revoke")}
                        </button>
                      </div>
                    ))}
                  </Section>
                  <Section icon={Trash2} title={t("settings.account.dangerZone")}>
                    <Row
                      id="settings.account.deleteAccount"
                      label={t("settings.account.deleteAccount")}
                      desc={t("settings.account.deleteDesc")}
                      control={
                        <button className="text-xs h-8 px-4 rounded-2xl bg-danger/10 text-danger font-medium hover:bg-danger/20 transition-all cursor-pointer">
                          {t("settings.account.delete")}
                        </button>
                      }
                    />
                  </Section>
                </>
              )}

              {/* === SECURITY === */}
              {tab === "security" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.security.title")}</h1>
                  <Section icon={Shield} title={t("settings.security.twoFactor")}>
                    {totpStatus === null && <p className="text-sm text-text-muted">{t("common.loading")}</p>}
                    {totpStatus && !totpStatus.enabled && !showVerify && (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">{t("settings.security.notEnabled")}</p>
                        <button
                          onClick={setupTOTP}
                          className="h-9 rounded-2xl bg-accent text-white text-xs px-4 font-medium hover:bg-accent-hover transition-all cursor-pointer"
                        >
                          <Key className="h-3.5 w-3.5 inline mr-1.5" /> {t("settings.security.enable2FA")}
                        </button>
                      </div>
                    )}
                    {totpStatus && totpStatus.enabled && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-text-primary">{t("settings.security.enabled")}</span>
                        </div>
                        <button
                          onClick={disableTOTP}
                          className="h-9 rounded-2xl border border-danger/30 text-danger text-xs px-4 font-medium hover:bg-danger/5 transition-all cursor-pointer"
                        >
                          {t("settings.security.disable2FA")}
                        </button>
                      </div>
                    )}
                    {showVerify && (
                      <div className="space-y-3 mt-3">
                        <p className="text-sm font-medium text-text-primary">{t("settings.security.enterCode")}</p>
                        <div className="flex items-center gap-2 rounded-xl bg-bg-primary p-3">
                          <code className="text-xs text-accent break-all flex-1">{secret}</code>
                          <button
                            onClick={copySecret}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-all cursor-pointer"
                          >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-text-muted">
                          {t("settings.security.uri")} <code className="text-xs text-accent">{setupUri}</code>
                        </p>
                        <input
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value)}
                          placeholder={t("settings.security.code")}
                          maxLength={6}
                          className="w-full h-9 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={verifyTOTP}
                            disabled={verifyCode.length !== 6}
                            className="h-9 rounded-2xl bg-accent text-white text-xs px-4 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                          >
                            {t("settings.security.verifyAndEnable")}
                          </button>
                          <button
                            onClick={() => setShowVerify(false)}
                            className="h-9 rounded-2xl border border-border text-text-secondary text-xs px-4 font-medium hover:bg-white/5 transition-all cursor-pointer"
                          >
                            {t("settings.security.cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </Section>
                  <Section icon={History} title={t("settings.security.loginHistory")}>
                    {loginHistory.length === 0 && (
                      <p className="text-sm text-text-muted">{t("settings.security.noLoginHistory")}</p>
                    )}
                    {loginHistory.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${entry.success === "true" ? "bg-green-500" : "bg-danger"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary">{formatUA(entry.userAgent)}</p>
                          <p className="text-xs text-text-muted">
                            {entry.ip ?? t("common.unknown")} · {formatDate(entry.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium capitalize ${entry.success === "true" ? "text-green-500" : "text-danger"}`}
                        >
                          {entry.success === "true" ? t("common.success") : t("common.failed")}
                        </span>
                      </div>
                    ))}
                  </Section>
                  <Section icon={Lock} title={t("settings.security.sessionControls")}>
                    <Row
                      id="settings.security.sessionTimeout"
                      label={t("settings.security.sessionTimeout")}
                      desc={t("settings.security.sessionTimeoutDesc")}
                      control={
                        <Select
                          value={prefs.sessionTimeout ?? "30"}
                          onChange={(v) => updatePref("sessionTimeout", v)}
                          options={[
                            { value: "15", label: t("settings.security.15min") },
                            { value: "30", label: t("settings.security.30min") },
                            { value: "60", label: t("settings.security.1hour") },
                            { value: "never", label: t("settings.security.never") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.security.securityAlerts"
                      label={t("settings.security.securityAlerts")}
                      desc={t("settings.security.securityAlertsDesc")}
                      control={
                        <Toggle
                          checked={prefs.securityAlerts ?? true}
                          onChange={(v) => updatePref("securityAlerts", v)}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === APPEARANCE === */}
              {tab === "appearance" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.appearance.title")}</h1>

                  <Section icon={theme === "dark" ? Moon : Sun} title={t("settings.appearance.themeMode")}>
                    <Row
                      id="settings.appearance.darkMode"
                      label={t("settings.appearance.darkMode")}
                      desc={t("settings.appearance.darkModeDesc")}
                      control={<Toggle checked={theme === "dark"} onChange={toggleTheme} />}
                    />
                    <Row
                      id="settings.appearance.accentColor"
                      label={t("settings.appearance.accentColor")}
                      desc={t("settings.appearance.accentColorDesc")}
                      control={
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {[
                            "#6366f1",
                            "#8b5cf6",
                            "#d946ef",
                            "#ec4899",
                            "#f43f5e",
                            "#ef4444",
                            "#f97316",
                            "#eab308",
                            "#22c55e",
                            "#14b8a6",
                            "#06b6d4",
                            "#3b82f6",
                          ].map((c) => (
                            <button
                              key={c}
                              onClick={() => updatePref("accentColor", c)}
                              className={`h-5 w-5 rounded-full border-2 transition-all cursor-pointer ${prefs.accentColor === c ? "border-white scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      }
                    />
                    <Row
                      id="settings.appearance.secondaryColor"
                      label={t("settings.appearance.secondaryColor")}
                      desc={t("settings.appearance.secondaryColorDesc")}
                      control={
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6", "#22c55e", "#eab308", "#f97316"].map(
                            (c) => (
                              <button
                                key={c}
                                onClick={() => updatePref("secondaryColor", c)}
                                className={`h-5 w-5 rounded-full border-2 transition-all cursor-pointer ${prefs.secondaryColor === c ? "border-white scale-110" : "border-transparent"}`}
                                style={{ backgroundColor: c }}
                              />
                            ),
                          )}
                        </div>
                      }
                    />
                    <Row
                      id="settings.appearance.glassMorphism"
                      label={t("settings.appearance.glassMorphism")}
                      desc={t("settings.appearance.glassMorphismDesc")}
                      control={
                        <Toggle
                          checked={prefs.glassMorphism ?? false}
                          onChange={(v) => updatePref("glassMorphism", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.backgroundPattern"
                      label={t("settings.appearance.backgroundPattern")}
                      desc={t("settings.appearance.backgroundPatternDesc")}
                      control={
                        <Select
                          value={prefs.backgroundPattern ?? "none"}
                          onChange={(v) => updatePref("backgroundPattern", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.patterns.none") },
                            { value: "dots", label: t("settings.appearance.patterns.dots") },
                            { value: "grid", label: t("settings.appearance.patterns.grid") },
                            { value: "waves", label: t("settings.appearance.patterns.waves") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.backgroundBlur"
                      label={t("settings.appearance.backgroundBlur")}
                      desc={t("settings.appearance.backgroundBlurDesc")}
                      control={
                        <SliderControl
                          value={prefs.backgroundBlur ?? 0}
                          min={0}
                          max={24}
                          step={2}
                          onChange={(v) => updatePref("backgroundBlur", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.saturation"
                      label={t("settings.appearance.saturation")}
                      desc={t("settings.appearance.saturationDesc")}
                      control={
                        <SliderControl
                          value={prefs.saturation ?? 100}
                          min={0}
                          max={200}
                          onChange={(v) => updatePref("saturation", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.contrast"
                      label={t("settings.appearance.contrast")}
                      desc={t("settings.appearance.contrastDesc")}
                      control={
                        <SliderControl
                          value={prefs.contrast ?? 100}
                          min={50}
                          max={150}
                          onChange={(v) => updatePref("contrast", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.brightness"
                      label={t("settings.appearance.brightness")}
                      desc={t("settings.appearance.brightnessDesc")}
                      control={
                        <SliderControl
                          value={prefs.brightness ?? 100}
                          min={50}
                          max={150}
                          onChange={(v) => updatePref("brightness", v)}
                        />
                      }
                    />
                  </Section>

                  <Section icon={Type} title={t("settings.appearance.typography")}>
                    <Row
                      id="settings.appearance.fontFamily"
                      label={t("settings.appearance.fontFamily")}
                      desc={t("settings.appearance.fontFamilyDesc")}
                      control={
                        <Select
                          value={prefs.fontFamily ?? "system"}
                          onChange={(v) => updatePref("fontFamily", v)}
                          options={[
                            { value: "system", label: t("settings.appearance.fonts.system") },
                            { value: "sans", label: t("settings.appearance.fonts.sansSerif") },
                            { value: "serif", label: t("settings.appearance.fonts.serif") },
                            { value: "mono", label: t("settings.appearance.fonts.monospace") },
                            { value: "inter", label: t("settings.appearance.fonts.inter") },
                            { value: "roboto", label: t("settings.appearance.fonts.roboto") },
                            { value: "poppins", label: t("settings.appearance.fonts.poppins") },
                            { value: "noto", label: t("settings.appearance.fonts.notoSans") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.monospaceFont"
                      label={t("settings.appearance.monospaceFont")}
                      desc={t("settings.appearance.monospaceFontDesc")}
                      control={
                        <Select
                          value={prefs.monospaceFont ?? "monospace"}
                          onChange={(v) => updatePref("monospaceFont", v)}
                          options={[
                            { value: "monospace", label: t("settings.appearance.fonts.defaultMono") },
                            { value: "jetbrains", label: t("settings.appearance.fonts.jetbrainsMono") },
                            { value: "fira", label: t("settings.appearance.fonts.firaCode") },
                            { value: "source", label: t("settings.appearance.fonts.sourceCodePro") },
                            { value: "cascadia", label: t("settings.appearance.fonts.cascadiaCode") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.fontSize"
                      label={t("settings.appearance.fontSize")}
                      desc={t("settings.appearance.fontSizeDesc")}
                      control={
                        <Select
                          value={prefs.fontSize ?? "medium"}
                          onChange={(v) => updatePref("fontSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "xlarge", label: t("settings.appearance.options.xlarge") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.codeFontSize"
                      label={t("settings.appearance.codeFontSize")}
                      desc={t("settings.appearance.codeFontSizeDesc")}
                      control={
                        <Select
                          value={prefs.codeFontSize ?? "medium"}
                          onChange={(v) => updatePref("codeFontSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.codeBackground"
                      label={t("settings.appearance.codeBackground")}
                      desc={t("settings.appearance.codeBackgroundDesc")}
                      control={
                        <input
                          type="color"
                          value={prefs.codeBackground ?? "#1e1e2e"}
                          onChange={(e) => updatePref("codeBackground", e.target.value)}
                          className="h-8 w-12 rounded-lg cursor-pointer bg-transparent border-0"
                        />
                      }
                    />
                  </Section>

                  <Section icon={Square} title={t("settings.appearance.corners")}>
                    <Row
                      id="settings.appearance.defaultRadius"
                      label={t("settings.appearance.defaultRadius")}
                      desc={t("settings.appearance.defaultRadiusDesc")}
                      control={
                        <Select
                          value={prefs.borderRadius ?? "medium"}
                          onChange={(v) => updatePref("borderRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.buttonRadius"
                      label={t("settings.appearance.buttonRadius")}
                      desc={t("settings.appearance.buttonRadiusDesc")}
                      control={
                        <Select
                          value={prefs.buttonRadius ?? "medium"}
                          onChange={(v) => updatePref("buttonRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.inputRadius"
                      label={t("settings.appearance.inputRadius")}
                      desc={t("settings.appearance.inputRadiusDesc")}
                      control={
                        <Select
                          value={prefs.inputRadius ?? "medium"}
                          onChange={(v) => updatePref("inputRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.chatBubbleRadius"
                      label={t("settings.appearance.chatBubbleRadius")}
                      desc={t("settings.appearance.chatBubbleRadiusDesc")}
                      control={
                        <Select
                          value={prefs.chatBubbleRadius ?? "large"}
                          onChange={(v) => updatePref("chatBubbleRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.avatarRadius"
                      label={t("settings.appearance.avatarRadius")}
                      desc={t("settings.appearance.avatarRadiusDesc")}
                      control={
                        <Select
                          value={prefs.avatarRadius ?? "full"}
                          onChange={(v) => updatePref("avatarRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.square") },
                            { value: "small", label: t("settings.appearance.options.rounded") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "full", label: t("settings.appearance.options.circle") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.modalRadius"
                      label={t("settings.appearance.modalRadius")}
                      desc={t("settings.appearance.modalRadiusDesc")}
                      control={
                        <Select
                          value={prefs.modalRadius ?? "large"}
                          onChange={(v) => updatePref("modalRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.cardRadius"
                      label={t("settings.appearance.cardRadius")}
                      desc={t("settings.appearance.cardRadiusDesc")}
                      control={
                        <Select
                          value={prefs.cardRadius ?? "medium"}
                          onChange={(v) => updatePref("cardRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.full") },
                          ]}
                        />
                      }
                    />
                  </Section>

                  <Section icon={Layers} title={t("settings.appearance.shadows")}>
                    <Row
                      id="settings.appearance.shadowIntensity"
                      label={t("settings.appearance.shadowIntensity")}
                      desc={t("settings.appearance.shadowIntensityDesc")}
                      control={
                        <Select
                          value={prefs.shadowIntensity ?? "medium"}
                          onChange={(v) => updatePref("shadowIntensity", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "light", label: t("settings.appearance.options.light") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "strong", label: t("settings.appearance.options.strong") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.borderWidth"
                      label={t("settings.appearance.borderWidth")}
                      desc={t("settings.appearance.borderWidthDesc")}
                      control={
                        <Select
                          value={prefs.borderWidth ?? "normal"}
                          onChange={(v) => updatePref("borderWidth", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.none") },
                            { value: "thin", label: t("settings.appearance.options.thin") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "thick", label: t("settings.appearance.options.thick") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.hoverScale"
                      label={t("settings.appearance.hoverScale")}
                      desc={t("settings.appearance.hoverScaleDesc")}
                      control={
                        <SliderControl
                          value={prefs.hoverScale ?? 1.05}
                          min={1}
                          max={1.2}
                          step={0.01}
                          onChange={(v) => updatePref("hoverScale", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.transitionDuration"
                      label={t("settings.appearance.transitionDuration")}
                      desc={t("settings.appearance.transitionDurationDesc")}
                      control={
                        <Select
                          value={prefs.transitionDuration ?? "normal"}
                          onChange={(v) => updatePref("transitionDuration", v)}
                          options={[
                            { value: "fast", label: t("settings.appearance.options.fast") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "slow", label: t("settings.appearance.options.slow") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.animationSpeed"
                      label={t("settings.appearance.animationSpeed")}
                      desc={t("settings.appearance.animationSpeedDesc")}
                      control={
                        <Select
                          value={prefs.animationSpeed ?? "normal"}
                          onChange={(v) => updatePref("animationSpeed", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.off") },
                            { value: "slow", label: t("settings.appearance.options.slow") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "fast", label: t("settings.appearance.options.fast") },
                          ]}
                        />
                      }
                    />
                  </Section>

                  <Section icon={Grid3X3} title={t("settings.appearance.layout")}>
                    <Row
                      id="settings.appearance.sidebarPosition"
                      label={t("settings.appearance.sidebarPosition")}
                      desc={t("settings.appearance.sidebarPositionDesc")}
                      control={
                        <Select
                          value={prefs.sidebarPosition ?? "left"}
                          onChange={(v) => updatePref("sidebarPosition", v)}
                          options={[
                            { value: "left", label: t("settings.appearance.options.small") },
                            { value: "right", label: t("settings.appearance.options.medium") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.sidebarWidth"
                      label={t("settings.appearance.sidebarWidth")}
                      desc={t("settings.appearance.sidebarWidthDesc")}
                      control={
                        <Select
                          value={prefs.sidebarWidth ?? "default"}
                          onChange={(v) => updatePref("sidebarWidth", v)}
                          options={[
                            { value: "narrow", label: t("settings.appearance.options.narrow") },
                            { value: "default", label: t("settings.appearance.options.default") },
                            { value: "wide", label: t("settings.appearance.options.wide") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.memberListWidth"
                      label={t("settings.appearance.memberListWidth")}
                      desc={t("settings.appearance.memberListWidthDesc")}
                      control={
                        <Select
                          value={prefs.memberListWidth ?? "default"}
                          onChange={(v) => updatePref("memberListWidth", v)}
                          options={[
                            { value: "narrow", label: t("settings.appearance.options.narrow") },
                            { value: "default", label: t("settings.appearance.options.default") },
                            { value: "wide", label: t("settings.appearance.options.wide") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.compactMode"
                      label={t("settings.appearance.compactMode")}
                      desc={t("settings.appearance.compactModeDesc")}
                      control={
                        <Toggle checked={prefs.compactMode ?? false} onChange={(v) => updatePref("compactMode", v)} />
                      }
                    />
                    <Row
                      id="settings.appearance.messageSpacing"
                      label={t("settings.appearance.messageSpacing")}
                      desc={t("settings.appearance.messageSpacingDesc")}
                      control={
                        <Select
                          value={prefs.messageSpacing ?? "normal"}
                          onChange={(v) => updatePref("messageSpacing", v)}
                          options={[
                            { value: "compact", label: t("settings.appearance.options.compact") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "relaxed", label: t("settings.appearance.options.relaxed") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.sectionSpacing"
                      label={t("settings.appearance.sectionSpacing")}
                      desc={t("settings.appearance.sectionSpacingDesc")}
                      control={
                        <Select
                          value={prefs.sectionSpacing ?? "normal"}
                          onChange={(v) => updatePref("sectionSpacing", v)}
                          options={[
                            { value: "compact", label: t("settings.appearance.options.compact") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "relaxed", label: t("settings.appearance.options.relaxed") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.elementGap"
                      label={t("settings.appearance.elementGap")}
                      desc={t("settings.appearance.elementGapDesc")}
                      control={
                        <Select
                          value={prefs.elementGap ?? "normal"}
                          onChange={(v) => updatePref("elementGap", v)}
                          options={[
                            { value: "compact", label: t("settings.appearance.options.compact") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "wide", label: t("settings.appearance.options.wide") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.listDensity"
                      label={t("settings.appearance.listDensity")}
                      desc={t("settings.appearance.listDensityDesc")}
                      control={
                        <Select
                          value={prefs.listDensity ?? "normal"}
                          onChange={(v) => updatePref("listDensity", v)}
                          options={[
                            { value: "compact", label: t("settings.appearance.options.compact") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "relaxed", label: t("settings.appearance.options.relaxed") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.channelListDensity"
                      label={t("settings.appearance.channelListDensity")}
                      desc={t("settings.appearance.channelListDensityDesc")}
                      control={
                        <Select
                          value={prefs.channelListDensity ?? "normal"}
                          onChange={(v) => updatePref("channelListDensity", v)}
                          options={[
                            { value: "compact", label: t("settings.appearance.options.compact") },
                            { value: "normal", label: t("settings.appearance.options.normal") },
                            { value: "relaxed", label: t("settings.appearance.options.relaxed") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.showHeader"
                      label={t("settings.appearance.showHeader")}
                      desc={t("settings.appearance.showHeaderDesc")}
                      control={
                        <Toggle checked={prefs.showHeader ?? true} onChange={(v) => updatePref("showHeader", v)} />
                      }
                    />
                    <Row
                      id="settings.appearance.showFooter"
                      label={t("settings.appearance.showFooter")}
                      desc={t("settings.appearance.showFooterDesc")}
                      control={
                        <Toggle checked={prefs.showFooter ?? false} onChange={(v) => updatePref("showFooter", v)} />
                      }
                    />
                  </Section>

                  <Section icon={MessageSquare} title={t("settings.appearance.messageDisplay")}>
                    <Row
                      id="settings.appearance.chatBubbleStyle"
                      label={t("settings.appearance.chatBubbleStyle")}
                      desc={t("settings.appearance.chatBubbleStyleDesc")}
                      control={
                        <Select
                          value={prefs.chatBubbleStyle ?? "rounded"}
                          onChange={(v) => updatePref("chatBubbleStyle", v)}
                          options={[
                            { value: "rounded", label: t("settings.appearance.options.rounded") },
                            { value: "flat", label: t("settings.appearance.options.flat") },
                            { value: "minimal", label: t("settings.appearance.options.minimal") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.chatBubbleCorner"
                      label={t("settings.appearance.chatBubbleCorner")}
                      desc={t("settings.appearance.chatBubbleCornerDesc")}
                      control={
                        <Select
                          value={prefs.chatBubbleRadius ?? "large"}
                          onChange={(v) => updatePref("chatBubbleRadius", v)}
                          options={[
                            { value: "none", label: t("settings.appearance.options.square") },
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "full", label: t("settings.appearance.options.pill") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.dateSeparator"
                      label={t("settings.appearance.dateSeparator")}
                      desc={t("settings.appearance.dateSeparatorDesc")}
                      control={
                        <Select
                          value={prefs.dateSeparator ?? "full"}
                          onChange={(v) => updatePref("dateSeparator", v)}
                          options={[
                            { value: "full", label: t("settings.appearance.options.fullDate") },
                            { value: "short", label: t("settings.appearance.options.short") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.dateStyle"
                      label={t("settings.appearance.dateStyle")}
                      desc={t("settings.appearance.dateStyleDesc")}
                      control={
                        <Select
                          value={prefs.dateSeparatorStyle ?? "pill"}
                          onChange={(v) => updatePref("dateSeparatorStyle", v)}
                          options={[
                            { value: "pill", label: t("settings.appearance.options.pill") },
                            { value: "line", label: t("settings.appearance.options.line") },
                            { value: "minimal", label: t("settings.appearance.options.minimal") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.senderName"
                      label={t("settings.appearance.senderName")}
                      desc={t("settings.appearance.senderNameDesc")}
                      control={
                        <Select
                          value={prefs.senderNameFormat ?? "full"}
                          onChange={(v) => updatePref("senderNameFormat", v)}
                          options={[
                            { value: "full", label: t("settings.appearance.options.fullName") },
                            { value: "first", label: t("settings.appearance.options.firstName") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.timeFormat"
                      label={t("settings.appearance.timeFormat")}
                      desc={t("settings.appearance.timeFormatDesc")}
                      control={
                        <Select
                          value={prefs.timeFormat ?? "12h"}
                          onChange={(v) => updatePref("timeFormat", v)}
                          options={[
                            { value: "12h", label: t("settings.appearance.options.small") },
                            { value: "24h", label: t("settings.appearance.options.medium") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.showTimestamps"
                      label={t("settings.appearance.showTimestamps")}
                      desc={t("settings.appearance.showTimestampsDesc")}
                      control={
                        <Select
                          value={prefs.showTimestamps ?? "always"}
                          onChange={(v) => updatePref("showTimestamps", v)}
                          options={[
                            { value: "always", label: t("settings.appearance.options.always") },
                            { value: "hover", label: t("settings.appearance.options.onHover") },
                            { value: "off", label: t("settings.appearance.options.off") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.animatedEmoji"
                      label={t("settings.appearance.animatedEmoji")}
                      desc={t("settings.appearance.animatedEmojiDesc")}
                      control={
                        <Toggle
                          checked={prefs.animatedEmoji ?? true}
                          onChange={(v) => updatePref("animatedEmoji", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.imagePreviewSize"
                      label={t("settings.appearance.imagePreviewSize")}
                      desc={t("settings.appearance.imagePreviewSizeDesc")}
                      control={
                        <Select
                          value={prefs.imagePreviewSize ?? "medium"}
                          onChange={(v) => updatePref("imagePreviewSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.avatarSizeList"
                      label={t("settings.appearance.avatarSizeList")}
                      desc={t("settings.appearance.avatarSizeListDesc")}
                      control={
                        <Select
                          value={prefs.avatarSize ?? "medium"}
                          onChange={(v) => updatePref("avatarSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.avatarSizeChat"
                      label={t("settings.appearance.avatarSizeChat")}
                      desc={t("settings.appearance.avatarSizeChatDesc")}
                      control={
                        <Select
                          value={prefs.avatarChatSize ?? "medium"}
                          onChange={(v) => updatePref("avatarChatSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.avatarPresenceDot"
                      label={t("settings.appearance.avatarPresenceDot")}
                      desc={t("settings.appearance.avatarPresenceDotDesc")}
                      control={
                        <Select
                          value={prefs.avatarPresenceSize ?? "small"}
                          onChange={(v) => updatePref("avatarPresenceSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                  </Section>

                  <Section icon={Hash} title={t("settings.appearance.contentStyling")}>
                    <Row
                      id="settings.appearance.codeBlockTheme"
                      label={t("settings.appearance.codeBlockTheme")}
                      desc={t("settings.appearance.codeBlockThemeDesc")}
                      control={
                        <Select
                          value={prefs.codeBlockTheme ?? "dark"}
                          onChange={(v) => updatePref("codeBlockTheme", v)}
                          options={[
                            { value: "light", label: t("settings.appearance.options.small") },
                            { value: "dark", label: t("settings.appearance.options.medium") },
                            { value: "auto", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.inlineCodeStyle"
                      label={t("settings.appearance.inlineCodeStyle")}
                      desc={t("settings.appearance.inlineCodeStyleDesc")}
                      control={
                        <Select
                          value={prefs.inlineCodeStyle ?? "modern"}
                          onChange={(v) => updatePref("inlineCodeStyle", v)}
                          options={[
                            { value: "modern", label: t("settings.appearance.options.modern") },
                            { value: "classic", label: t("settings.appearance.options.classic") },
                            { value: "minimal", label: t("settings.appearance.options.minimal") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.linkStyle"
                      label={t("settings.appearance.linkStyle")}
                      desc={t("settings.appearance.linkStyleDesc")}
                      control={
                        <Select
                          value={prefs.linkStyle ?? "both"}
                          onChange={(v) => updatePref("linkStyle", v)}
                          options={[
                            { value: "underline", label: t("settings.appearance.options.underline") },
                            { value: "colored", label: t("settings.appearance.options.colored") },
                            { value: "both", label: t("settings.appearance.options.both") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.mentionStyle"
                      label={t("settings.appearance.mentionStyle")}
                      desc={t("settings.appearance.mentionStyleDesc")}
                      control={
                        <Select
                          value={prefs.mentionStyle ?? "highlight"}
                          onChange={(v) => updatePref("mentionStyle", v)}
                          options={[
                            { value: "highlight", label: t("settings.appearance.options.highlight") },
                            { value: "bold", label: t("settings.appearance.options.bold") },
                            { value: "both", label: t("settings.appearance.options.both") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.spoilerStyle"
                      label={t("settings.appearance.spoilerStyle")}
                      desc={t("settings.appearance.spoilerStyleDesc")}
                      control={
                        <Select
                          value={prefs.spoilerStyle ?? "blur"}
                          onChange={(v) => updatePref("spoilerStyle", v)}
                          options={[
                            { value: "blur", label: t("settings.appearance.options.blur") },
                            { value: "hidden", label: t("settings.appearance.options.hidden") },
                            { value: "reveal", label: t("settings.appearance.options.revealClick") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.blockquoteStyle"
                      label={t("settings.appearance.blockquoteStyle")}
                      desc={t("settings.appearance.blockquoteStyleDesc")}
                      control={
                        <Select
                          value={prefs.blockquoteStyle ?? "line"}
                          onChange={(v) => updatePref("blockquoteStyle", v)}
                          options={[
                            { value: "line", label: t("settings.appearance.options.line") },
                            { value: "accent", label: t("settings.appearance.options.accent") },
                            { value: "modern", label: t("settings.appearance.options.modern") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.headingStyle"
                      label={t("settings.appearance.headingStyle")}
                      desc={t("settings.appearance.headingStyleDesc")}
                      control={
                        <Select
                          value={prefs.headingStyle ?? "default"}
                          onChange={(v) => updatePref("headingStyle", v)}
                          options={[
                            { value: "default", label: t("settings.appearance.options.default") },
                            { value: "accent", label: t("settings.appearance.options.accent") },
                            { value: "underlined", label: t("settings.appearance.options.underlined") },
                          ]}
                        />
                      }
                    />
                  </Section>

                  <Section icon={Sliders} title={t("settings.appearance.scrollbar")}>
                    <Row
                      id="settings.appearance.scrollbarStyle"
                      label={t("settings.appearance.scrollbarStyle")}
                      desc={t("settings.appearance.scrollbarStyleDesc")}
                      control={
                        <Select
                          value={prefs.scrollbarStyle ?? "default"}
                          onChange={(v) => updatePref("scrollbarStyle", v)}
                          options={[
                            { value: "default", label: t("settings.appearance.options.default") },
                            { value: "thin", label: t("settings.appearance.options.thin") },
                            { value: "hidden", label: t("settings.appearance.options.hidden") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.scrollbarWidth"
                      label={t("settings.appearance.scrollbarWidth")}
                      desc={t("settings.appearance.scrollbarWidthDesc")}
                      control={
                        <SliderControl
                          value={prefs.scrollbarWidth ?? 8}
                          min={4}
                          max={20}
                          onChange={(v) => updatePref("scrollbarWidth", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.scrollBehavior"
                      label={t("settings.appearance.scrollBehavior")}
                      desc={t("settings.appearance.scrollBehaviorDesc")}
                      control={
                        <Select
                          value={prefs.scrollBehavior ?? "smooth"}
                          onChange={(v) => updatePref("scrollBehavior", v)}
                          options={[
                            { value: "smooth", label: t("settings.appearance.options.small") },
                            { value: "instant", label: t("settings.appearance.options.medium") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.stickyHeader"
                      label={t("settings.appearance.stickyHeader")}
                      desc={t("settings.appearance.stickyHeaderDesc")}
                      control={
                        <Toggle checked={prefs.stickyHeader ?? true} onChange={(v) => updatePref("stickyHeader", v)} />
                      }
                    />
                  </Section>

                  <Section icon={Zap} title={t("settings.appearance.animations")}>
                    <Row
                      id="settings.appearance.reduceMotion"
                      label={t("settings.appearance.reduceMotion")}
                      desc={t("settings.appearance.reduceMotionDesc")}
                      control={
                        <Toggle checked={prefs.reduceMotion ?? false} onChange={(v) => updatePref("reduceMotion", v)} />
                      }
                    />
                    <Row
                      id="settings.appearance.reduceTransparency"
                      label={t("settings.appearance.reduceTransparency")}
                      desc={t("settings.appearance.reduceTransparencyDesc")}
                      control={
                        <Toggle
                          checked={prefs.reduceTransparency ?? false}
                          onChange={(v) => updatePref("reduceTransparency", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.pageTransition"
                      label={t("settings.appearance.pageTransition")}
                      desc={t("settings.appearance.pageTransitionDesc")}
                      control={
                        <Select
                          value={prefs.pageTransition ?? "fade"}
                          onChange={(v) => updatePref("pageTransition", v)}
                          options={[
                            { value: "fade", label: t("settings.appearance.options.fade") },
                            { value: "slide", label: t("settings.appearance.options.slide") },
                            { value: "scale", label: t("settings.appearance.options.scale") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.messageAnimation"
                      label={t("settings.appearance.messageAnimation")}
                      desc={t("settings.appearance.messageAnimationDesc")}
                      control={
                        <Select
                          value={prefs.messageAnimation ?? "fade"}
                          onChange={(v) => updatePref("messageAnimation", v)}
                          options={[
                            { value: "fade", label: t("settings.appearance.options.fade") },
                            { value: "slide", label: t("settings.appearance.options.slide") },
                            { value: "scale", label: t("settings.appearance.options.scale") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.modalAnimation"
                      label={t("settings.appearance.modalAnimation")}
                      desc={t("settings.appearance.modalAnimationDesc")}
                      control={
                        <Select
                          value={prefs.modalAnimation ?? "scale"}
                          onChange={(v) => updatePref("modalAnimation", v)}
                          options={[
                            { value: "fade", label: t("settings.appearance.options.fade") },
                            { value: "scale", label: t("settings.appearance.options.scale") },
                            { value: "slide", label: t("settings.appearance.options.slide") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.hoverEffect"
                      label={t("settings.appearance.hoverEffect")}
                      desc={t("settings.appearance.hoverEffectDesc")}
                      control={
                        <Select
                          value={prefs.hoverAnimation ?? "lift"}
                          onChange={(v) => updatePref("hoverAnimation", v)}
                          options={[
                            { value: "scale", label: t("settings.appearance.options.scale") },
                            { value: "glow", label: t("settings.appearance.options.glow") },
                            { value: "lift", label: t("settings.appearance.options.lift") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.reactionAnimation"
                      label={t("settings.appearance.reactionAnimation")}
                      desc={t("settings.appearance.reactionAnimationDesc")}
                      control={
                        <Select
                          value={prefs.reactionAnimation ?? "pop"}
                          onChange={(v) => updatePref("reactionAnimation", v)}
                          options={[
                            { value: "bounce", label: t("settings.appearance.options.bounce") },
                            { value: "pop", label: t("settings.appearance.options.pop") },
                            { value: "fade", label: t("settings.appearance.options.fade") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.skeletonStyle"
                      label={t("settings.appearance.skeletonStyle")}
                      desc={t("settings.appearance.skeletonStyleDesc")}
                      control={
                        <Select
                          value={prefs.skeletonStyle ?? "shimmer"}
                          onChange={(v) => updatePref("skeletonStyle", v)}
                          options={[
                            { value: "shimmer", label: t("settings.appearance.options.shimmer") },
                            { value: "pulse", label: t("settings.appearance.options.pulse") },
                            { value: "none", label: t("settings.appearance.options.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.loadingStyle"
                      label={t("settings.appearance.loadingStyle")}
                      desc={t("settings.appearance.loadingStyleDesc")}
                      control={
                        <Select
                          value={prefs.loadingStyle ?? "spinner"}
                          onChange={(v) => updatePref("loadingStyle", v)}
                          options={[
                            { value: "spinner", label: t("settings.appearance.options.spinner") },
                            { value: "skeleton", label: t("settings.appearance.options.skeleton") },
                            { value: "dots", label: t("settings.appearance.options.bouncingDots") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.typingIndicator"
                      label={t("settings.appearance.typingIndicator")}
                      desc={t("settings.appearance.typingIndicatorDesc")}
                      control={
                        <Select
                          value={prefs.typingIndicatorStyle ?? "dots"}
                          onChange={(v) => updatePref("typingIndicatorStyle", v)}
                          options={[
                            { value: "dots", label: t("settings.appearance.options.bouncingDots") },
                            { value: "pulse", label: t("settings.appearance.options.pulse") },
                            { value: "text", label: t("settings.appearance.options.textOnly") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.badgeStyle"
                      label={t("settings.appearance.badgeStyle")}
                      desc={t("settings.appearance.badgeStyleDesc")}
                      control={
                        <Select
                          value={prefs.badgeStyle ?? "pill"}
                          onChange={(v) => updatePref("badgeStyle", v)}
                          options={[
                            { value: "dot", label: t("settings.appearance.options.dot") },
                            { value: "pill", label: t("settings.appearance.options.pill") },
                            { value: "number", label: t("settings.appearance.options.number") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.appearance.notificationDotSize"
                      label={t("settings.appearance.notificationDotSize")}
                      desc={t("settings.appearance.notificationDotSizeDesc")}
                      control={
                        <Select
                          value={prefs.notificationDotSize ?? "medium"}
                          onChange={(v) => updatePref("notificationDotSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                          ]}
                        />
                      }
                    />
                  </Section>

                  <Section icon={MessageCircle} title={t("settings.status.oneliner")}>
                    <div className="flex items-center justify-between gap-4" id="settings.status.customStatus">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{t("settings.status.customStatus")}</p>
                        <p className="text-xs text-text-muted truncate">{t("settings.status.customStatusDesc")}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <input
                          value={customStatusText}
                          onChange={(e) => setCustomStatusText(e.target.value)}
                          placeholder={t("settings.status.customStatusPlaceholder")}
                          maxLength={80}
                          className="h-8 w-44 rounded-xl border border-border bg-bg-primary px-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                        />
                        <button
                          onClick={saveCustomStatus}
                          disabled={savingCustomStatus}
                          className="h-8 rounded-xl bg-accent text-white text-xs px-3 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                        >
                          {t("settings.status.set")}
                        </button>
                      </div>
                    </div>
                    {customStatusMsg && <p className="text-xs text-accent mt-1">{customStatusMsg}</p>}
                  </Section>

                  <Section icon={Sparkles} title={t("settings.status.statusEmoji")}>
                    <div className="flex items-center justify-between gap-4" id="settings.status.statusEmoji">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{t("themeEditor.statusEmoji")}</p>
                        <p className="text-xs text-text-muted truncate">{t("settings.status.statusEmojiDesc")}</p>
                      </div>
                      <input
                        value={statusEmojiLocal}
                        onChange={(e) => setStatusEmojiLocal(e.target.value)}
                        placeholder={t("themeEditor.statusEmojiPlaceholder")}
                        maxLength={2}
                        className="h-8 w-16 rounded-xl border border-border bg-bg-primary px-2.5 text-center text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                      />
                    </div>
                    <button
                      onClick={clearStatusEmoji}
                      className="text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                    >
                      {t("settings.status.resetToDot")}
                    </button>
                    {statusEmojiSaveMsg && <p className="text-xs text-accent mt-1">{statusEmojiSaveMsg}</p>}
                  </Section>

                  <div id="themeEditor.statusEmoji">
                    <ThemeEditor />
                  </div>
                </>
              )}

              {/* === NOTIFICATIONS === */}
              {tab === "notifications" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.notifications.title")}</h1>
                  <Section icon={Bell} title={t("settings.notifications.pushInApp")}>
                    <Row
                      id="settings.notifications.messages"
                      label={t("settings.notifications.messages")}
                      desc={t("settings.notifications.messagesDesc")}
                      control={
                        <Toggle
                          checked={prefs.messageNotifications ?? true}
                          onChange={(v) => updatePref("messageNotifications", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.groupInvites"
                      label={t("settings.notifications.groupInvites")}
                      desc={t("settings.notifications.groupInvitesDesc")}
                      control={
                        <Toggle checked={prefs.groupInvites ?? true} onChange={(v) => updatePref("groupInvites", v)} />
                      }
                    />
                    <Row
                      id="settings.notifications.communityUpdates"
                      label={t("settings.notifications.communityUpdates")}
                      desc={t("settings.notifications.communityUpdatesDesc")}
                      control={
                        <Toggle
                          checked={prefs.communityUpdates ?? true}
                          onChange={(v) => updatePref("communityUpdates", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.eventReminders"
                      label={t("settings.notifications.eventReminders")}
                      desc={t("settings.notifications.eventRemindersDesc")}
                      control={
                        <Toggle
                          checked={prefs.eventReminders ?? true}
                          onChange={(v) => updatePref("eventReminders", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.callAlerts"
                      label={t("settings.notifications.callAlerts")}
                      desc={t("settings.notifications.callAlertsDesc")}
                      control={
                        <Toggle checked={prefs.callAlerts ?? true} onChange={(v) => updatePref("callAlerts", v)} />
                      }
                    />
                  </Section>
                  <Section icon={Monitor} title={t("settings.notifications.delivery")}>
                    <Row
                      id="settings.notifications.desktopNotifications"
                      label={t("settings.notifications.desktopNotifications")}
                      desc={t("settings.notifications.desktopNotificationsDesc")}
                      control={
                        <Toggle
                          checked={prefs.desktopNotifications ?? true}
                          onChange={(v) => updatePref("desktopNotifications", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.pushNotifications"
                      label={t("settings.notifications.pushNotifications")}
                      desc={t("settings.notifications.pushNotificationsDesc")}
                      control={
                        <Toggle
                          checked={prefs.pushNotifications ?? true}
                          onChange={(v) => updatePref("pushNotifications", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.messagePreview"
                      label={t("settings.notifications.messagePreview")}
                      desc={t("settings.notifications.messagePreviewDesc")}
                      control={
                        <Toggle
                          checked={prefs.messagePreview ?? true}
                          onChange={(v) => updatePref("messagePreview", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Volume2} title={t("settings.notifications.sounds")}>
                    <Row
                      id="settings.notifications.notificationSound"
                      label={t("settings.notifications.notificationSound")}
                      desc={t("settings.notifications.notificationSoundDesc")}
                      control={
                        <Toggle
                          checked={prefs.notificationSound ?? true}
                          onChange={(v) => updatePref("notificationSound", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.sound"
                      label={t("settings.notifications.sound")}
                      desc={t("settings.notifications.soundDesc")}
                      control={
                        <Select
                          value={prefs.notificationSoundName ?? "default"}
                          onChange={(v) => updatePref("notificationSoundName", v)}
                          options={[
                            { value: "default", label: t("settings.notifications.soundOptions.default") },
                            { value: "chime", label: t("settings.notifications.soundOptions.chime") },
                            { value: "pop", label: t("settings.notifications.soundOptions.pop") },
                            { value: "bell", label: t("settings.notifications.soundOptions.bell") },
                            { value: "none", label: t("common.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.notifications.volume"
                      label={t("settings.notifications.volume")}
                      desc={t("settings.notifications.volumeDesc")}
                      control={
                        <SliderControl
                          value={prefs.notificationVolume ?? 80}
                          min={0}
                          max={100}
                          onChange={(v) => updatePref("notificationVolume", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Clock} title={t("settings.notifications.quietHours")}>
                    <Row
                      id="settings.notifications.doNotDisturb"
                      label={t("settings.notifications.doNotDisturb")}
                      desc={t("settings.notifications.doNotDisturbDesc")}
                      control={
                        <Toggle checked={prefs.dndEnabled ?? false} onChange={(v) => updatePref("dndEnabled", v)} />
                      }
                    />
                    {prefs.dndEnabled && (
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={prefs.dndStart ?? "22:00"}
                          onChange={(e) => updatePref("dndStart", e.target.value)}
                          className="h-8 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary outline-none focus:border-accent/50"
                        />
                        <span className="text-xs text-text-muted self-center">{t("settings.notifications.to")}</span>
                        <input
                          type="time"
                          value={prefs.dndEnd ?? "08:00"}
                          onChange={(e) => updatePref("dndEnd", e.target.value)}
                          className="h-8 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary outline-none focus:border-accent/50"
                        />
                      </div>
                    )}
                  </Section>
                  <Section icon={Bell} title={t("settings.notifications.advanced")}>
                    <Row
                      id="settings.notifications.mentionsOnly"
                      label={t("settings.notifications.mentionsOnly")}
                      desc={t("settings.notifications.mentionsOnlyDesc")}
                      control={
                        <Toggle checked={prefs.mentionOnly ?? false} onChange={(v) => updatePref("mentionOnly", v)} />
                      }
                    />
                    <Row
                      id="settings.notifications.badgeCount"
                      label={t("settings.notifications.badgeCount")}
                      desc={t("settings.notifications.badgeCountDesc")}
                      control={
                        <Toggle checked={prefs.badgeCount ?? true} onChange={(v) => updatePref("badgeCount", v)} />
                      }
                    />
                    <Row
                      id="settings.notifications.keywordAlerts"
                      label={t("settings.notifications.keywordAlerts")}
                      desc={t("settings.notifications.keywordAlertsDesc")}
                      control={
                        <input
                          value={prefs.keywordAlerts ?? ""}
                          onChange={(e) => updatePref("keywordAlerts", e.target.value)}
                          placeholder={t("settings.notifications.keywordsPlaceholder")}
                          className="h-8 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 max-w-[160px]"
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === PRIVACY === */}
              {tab === "privacy" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.privacy.title")}</h1>
                  <Section icon={Eye} title={t("settings.privacy.presence")}>
                    <Row
                      id="settings.privacy.showOnlineStatus"
                      label={t("settings.privacy.showOnlineStatus")}
                      desc={t("settings.privacy.showOnlineStatusDesc")}
                      control={
                        <Toggle
                          checked={prefs.showOnlineStatus ?? true}
                          onChange={(v) => updatePref("showOnlineStatus", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.privacy.showPresence"
                      label={t("settings.privacy.showPresence")}
                      desc={t("settings.privacy.showPresenceDesc")}
                      control={
                        <Toggle checked={prefs.showPresence ?? true} onChange={(v) => updatePref("showPresence", v)} />
                      }
                    />
                    <Row
                      id="settings.privacy.shareActivity"
                      label={t("settings.privacy.shareActivity")}
                      desc={t("settings.privacy.shareActivityDesc")}
                      control={
                        <Toggle
                          checked={prefs.shareActivity ?? true}
                          onChange={(v) => updatePref("shareActivity", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={MessageSquare} title={t("settings.privacy.messages")}>
                    <Row
                      id="settings.privacy.readReceipts"
                      label={t("settings.privacy.readReceipts")}
                      desc={t("settings.privacy.readReceiptsDesc")}
                      control={
                        <Toggle checked={prefs.readReceipts ?? true} onChange={(v) => updatePref("readReceipts", v)} />
                      }
                    />
                    <Row
                      id="settings.privacy.allowFriendRequests"
                      label={t("settings.privacy.allowFriendRequests")}
                      desc={t("settings.privacy.allowFriendRequestsDesc")}
                      control={
                        <Select
                          value={prefs.allowFriendRequests ? "everyone" : "off"}
                          onChange={(v) => updatePref("allowFriendRequests", v === "everyone")}
                          options={[
                            { value: "everyone", label: t("settings.privacy.everyone") },
                            { value: "friends", label: t("settings.privacy.friendsOnly") },
                            { value: "off", label: t("settings.privacy.off") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.privacy.directMessages"
                      label={t("settings.privacy.directMessages")}
                      desc={t("settings.privacy.directMessagesDesc")}
                      control={
                        <Select
                          value={prefs.dmFrom ?? "everyone"}
                          onChange={(v) => updatePref("dmFrom", v)}
                          options={[
                            { value: "everyone", label: t("settings.privacy.everyone") },
                            { value: "friends", label: t("settings.privacy.friendsOnly") },
                            { value: "off", label: t("settings.privacy.off") },
                          ]}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Shield} title={t("settings.privacy.safety")}>
                    <Row
                      id="settings.privacy.explicitFilter"
                      label={t("settings.privacy.explicitFilter")}
                      desc={t("settings.privacy.explicitFilterDesc")}
                      control={
                        <Toggle
                          checked={prefs.explicitFilter ?? true}
                          onChange={(v) => updatePref("explicitFilter", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.privacy.safetyAlerts"
                      label={t("settings.privacy.safetyAlerts")}
                      desc={t("settings.privacy.safetyAlertsDesc")}
                      control={
                        <Toggle checked={prefs.safetyAlerts ?? true} onChange={(v) => updatePref("safetyAlerts", v)} />
                      }
                    />
                  </Section>
                  <Section icon={Lock} title={t("settings.privacy.blockedMuted")}>
                    {blockedUsers.length === 0 ? (
                      <p className="text-sm text-text-muted">{t("settings.privacy.noBlocked")}</p>
                    ) : (
                      <div className="space-y-2">
                        {blockedUsers.map((b) => (
                          <div key={b.blockedUserId} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar
                                src={b.avatar ?? undefined}
                                fallback={(b.displayName ?? b.username)?.[0] ?? "?"}
                                className="h-7 w-7 shrink-0"
                              />
                              <span className="text-sm text-text-primary truncate">{b.displayName ?? b.username}</span>
                            </div>
                            <button
                              onClick={() => unblockUser(b.blockedUserId)}
                              className="text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer shrink-0"
                            >
                              {t("settings.privacy.unblock")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </>
              )}

              {/* === CHAT === */}
              {tab === "chat" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.chat.title")}</h1>
                  <Section icon={Send} title={t("settings.chat.messaging")}>
                    <Row
                      id="settings.chat.enterToSend"
                      label={t("settings.chat.enterToSend")}
                      desc={t("settings.chat.enterToSendDesc")}
                      control={
                        <Toggle checked={prefs.enterToSend ?? true} onChange={(v) => updatePref("enterToSend", v)} />
                      }
                    />
                    <Row
                      id="settings.chat.typingIndicators"
                      label={t("settings.chat.typingIndicators")}
                      desc={t("settings.chat.typingIndicatorsDesc")}
                      control={
                        <Toggle
                          checked={prefs.showTypingIndicators ?? true}
                          onChange={(v) => updatePref("showTypingIndicators", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.messageGrouping"
                      label={t("settings.chat.messageGrouping")}
                      desc={t("settings.chat.messageGroupingDesc")}
                      control={
                        <Toggle
                          checked={prefs.messageGrouping ?? true}
                          onChange={(v) => updatePref("messageGrouping", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.replyPreview"
                      label={t("settings.chat.replyPreview")}
                      desc={t("settings.chat.replyPreviewDesc")}
                      control={
                        <Toggle checked={prefs.replyPreview ?? true} onChange={(v) => updatePref("replyPreview", v)} />
                      }
                    />
                  </Section>
                  <Section icon={Hash} title={t("settings.chat.content")}>
                    <Row
                      id="settings.chat.imagePreviews"
                      label={t("settings.chat.imagePreviews")}
                      desc={t("settings.chat.imagePreviewsDesc")}
                      control={
                        <Toggle
                          checked={prefs.imagePreviews ?? true}
                          onChange={(v) => updatePref("imagePreviews", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.linkPreviews"
                      label={t("settings.chat.linkPreviews")}
                      desc={t("settings.chat.linkPreviewsDesc")}
                      control={
                        <Toggle checked={prefs.linkPreviews ?? true} onChange={(v) => updatePref("linkPreviews", v)} />
                      }
                    />
                    <Row
                      id="settings.chat.emojiSuggestions"
                      label={t("settings.chat.emojiSuggestions")}
                      desc={t("settings.chat.emojiSuggestionsDesc")}
                      control={
                        <Toggle
                          checked={prefs.emojiSuggestions ?? true}
                          onChange={(v) => updatePref("emojiSuggestions", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.stickerSuggestions"
                      label={t("settings.chat.stickerSuggestions")}
                      desc={t("settings.chat.stickerSuggestionsDesc")}
                      control={
                        <Toggle
                          checked={prefs.stickerSuggestions ?? true}
                          onChange={(v) => updatePref("stickerSuggestions", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.markdownPreview"
                      label={t("settings.chat.markdownPreview")}
                      desc={t("settings.chat.markdownPreviewDesc")}
                      control={
                        <Toggle
                          checked={prefs.markdownPreview ?? true}
                          onChange={(v) => updatePref("markdownPreview", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.chat.inlineCodePreview"
                      label={t("settings.chat.inlineCodePreview")}
                      desc={t("settings.chat.inlineCodePreviewDesc")}
                      control={
                        <Toggle
                          checked={prefs.inlineCodePreview ?? true}
                          onChange={(v) => updatePref("inlineCodePreview", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Type} title={t("settings.chat.input")}>
                    <Row
                      id="settings.chat.spellCheck"
                      label={t("settings.chat.spellCheck")}
                      desc={t("settings.chat.spellCheckDesc")}
                      control={
                        <Toggle checked={prefs.spellCheck ?? true} onChange={(v) => updatePref("spellCheck", v)} />
                      }
                    />
                    <Row
                      id="settings.chat.autoCorrect"
                      label={t("settings.chat.autoCorrect")}
                      desc={t("settings.chat.autoCorrectDesc")}
                      control={
                        <Toggle checked={prefs.autoCorrect ?? false} onChange={(v) => updatePref("autoCorrect", v)} />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === CALLS === */}
              {tab === "calls" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.calls.title")}</h1>
                  <Section icon={Phone} title={t("settings.calls.audio")}>
                    <Row
                      id="settings.calls.defaultMic"
                      label={t("settings.calls.defaultMic")}
                      desc={t("settings.calls.defaultMicDesc")}
                      control={
                        <Select
                          value={prefs.defaultMic ?? "default"}
                          onChange={(v) => updatePref("defaultMic", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "mic1", label: t("settings.calls.deviceOptions.builtinMic") },
                            { value: "mic2", label: t("settings.calls.deviceOptions.externalMic") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.defaultSpeaker"
                      label={t("settings.calls.defaultSpeaker")}
                      desc={t("settings.calls.defaultSpeakerDesc")}
                      control={
                        <Select
                          value={prefs.defaultSpeaker ?? "default"}
                          onChange={(v) => updatePref("defaultSpeaker", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "spk1", label: t("settings.calls.deviceOptions.builtinSpeakers") },
                            { value: "spk2", label: t("settings.calls.deviceOptions.headphones") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.echoCancellation"
                      label={t("settings.calls.echoCancellation")}
                      desc={t("settings.calls.echoCancellationDesc")}
                      control={
                        <Toggle
                          checked={prefs.echoCancellation ?? true}
                          onChange={(v) => updatePref("echoCancellation", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.noiseSuppression"
                      label={t("settings.calls.noiseSuppression")}
                      desc={t("settings.calls.noiseSuppressionDesc")}
                      control={
                        <Toggle
                          checked={prefs.noiseSuppression ?? true}
                          onChange={(v) => updatePref("noiseSuppression", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.autoGainControl"
                      label={t("settings.calls.autoGainControl")}
                      desc={t("settings.calls.autoGainControlDesc")}
                      control={
                        <Toggle
                          checked={prefs.autoGainControl ?? true}
                          onChange={(v) => updatePref("autoGainControl", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Video} title={t("settings.calls.video")}>
                    <Row
                      id="settings.calls.camera"
                      label={t("settings.calls.camera")}
                      desc={t("settings.calls.cameraDesc")}
                      control={
                        <Select
                          value={prefs.camera ?? "default"}
                          onChange={(v) => updatePref("camera", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "cam1", label: t("settings.calls.deviceOptions.builtinCamera") },
                            { value: "cam2", label: t("settings.calls.deviceOptions.externalCamera") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.videoQuality"
                      label={t("settings.calls.videoQuality")}
                      desc={t("settings.calls.videoQualityDesc")}
                      control={
                        <Select
                          value={prefs.videoQuality ?? "720p"}
                          onChange={(v) => updatePref("videoQuality", v)}
                          options={[
                            { value: "480p", label: t("settings.calls.videoQualityOptions.480p") },
                            { value: "720p", label: t("settings.calls.videoQualityOptions.720p") },
                            { value: "1080p", label: t("settings.calls.videoQualityOptions.1080p") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.backgroundBlur"
                      label={t("settings.calls.backgroundBlur")}
                      desc={t("settings.calls.backgroundBlurDesc")}
                      control={
                        <Toggle
                          checked={prefs.videoBackgroundBlur ?? false}
                          onChange={(v) => updatePref("videoBackgroundBlur", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.pictureInPicture"
                      label={t("settings.calls.pictureInPicture")}
                      desc={t("settings.calls.pictureInPictureDesc")}
                      control={
                        <Toggle
                          checked={prefs.pictureInPicture ?? true}
                          onChange={(v) => updatePref("pictureInPicture", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Sliders} title={t("settings.calls.advanced")}>
                    <Row
                      id="settings.calls.pushToTalk"
                      label={t("settings.calls.pushToTalk")}
                      desc={t("settings.calls.pushToTalkDesc")}
                      control={
                        <Toggle checked={prefs.pushToTalk ?? false} onChange={(v) => updatePref("pushToTalk", v)} />
                      }
                    />
                    <Row
                      id="settings.calls.voiceActivity"
                      label={t("settings.calls.voiceActivity")}
                      desc={t("settings.calls.voiceActivityDesc")}
                      control={
                        <SliderControl
                          value={prefs.voiceActivityThreshold ?? 50}
                          min={0}
                          max={100}
                          onChange={(v) => updatePref("voiceActivityThreshold", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.ringtone"
                      label={t("settings.calls.ringtone")}
                      desc={t("settings.calls.ringtoneDesc")}
                      control={
                        <Select
                          value={prefs.ringtone ?? "default"}
                          onChange={(v) => updatePref("ringtone", v)}
                          options={[
                            { value: "default", label: t("settings.calls.ringtoneOptions.default") },
                            { value: "classic", label: t("settings.calls.ringtoneOptions.classic") },
                            { value: "digital", label: t("settings.calls.ringtoneOptions.digital") },
                            { value: "none", label: t("common.none") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.calls.callRecording"
                      label={t("settings.calls.callRecording")}
                      desc={t("settings.calls.callRecordingDesc")}
                      control={
                        <Toggle
                          checked={prefs.callRecording ?? false}
                          onChange={(v) => updatePref("callRecording", v)}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === MEDIA === */}
              {tab === "media" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.media.title")}</h1>
                  <Section icon={Image} title={t("settings.media.imagesVideo")}>
                    <Row
                      id="settings.media.autoPlayMedia"
                      label={t("settings.media.autoPlayMedia")}
                      desc={t("settings.media.autoPlayMediaDesc")}
                      control={
                        <Toggle
                          checked={prefs.autoPlayMedia ?? true}
                          onChange={(v) => updatePref("autoPlayMedia", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.media.gifAutoplay"
                      label={t("settings.media.gifAutoplay")}
                      desc={t("settings.media.gifAutoplayDesc")}
                      control={
                        <Toggle checked={prefs.gifAutoplay ?? true} onChange={(v) => updatePref("gifAutoplay", v)} />
                      }
                    />
                    <Row
                      id="settings.media.videoAutoplay"
                      label={t("settings.media.videoAutoplay")}
                      desc={t("settings.media.videoAutoplayDesc")}
                      control={
                        <Toggle
                          checked={prefs.videoAutoplay ?? true}
                          onChange={(v) => updatePref("videoAutoplay", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.media.imageQuality"
                      label={t("settings.media.imageQuality")}
                      desc={t("settings.media.imageQualityDesc")}
                      control={
                        <Select
                          value={prefs.imageQuality ?? "high"}
                          onChange={(v) => updatePref("imageQuality", v)}
                          options={[
                            { value: "low", label: t("settings.media.qualityOptions.low") },
                            { value: "medium", label: t("settings.media.qualityOptions.medium") },
                            { value: "high", label: t("settings.media.qualityOptions.high") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.media.imageSaveQuality"
                      label={t("settings.media.imageSaveQuality")}
                      desc={t("settings.media.imageSaveQualityDesc")}
                      control={
                        <SliderControl
                          value={prefs.imageSaveQuality ?? 90}
                          min={10}
                          max={100}
                          step={5}
                          onChange={(v) => updatePref("imageSaveQuality", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={FileText} title={t("settings.media.files")}>
                    <Row
                      id="settings.media.autoDownload"
                      label={t("settings.media.autoDownload")}
                      desc={t("settings.media.autoDownloadDesc")}
                      control={
                        <Toggle
                          checked={prefs.autoDownloadFiles ?? false}
                          onChange={(v) => updatePref("autoDownloadFiles", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.media.maxFileSize"
                      label={t("settings.media.maxFileSize")}
                      desc={t("settings.media.maxFileSizeDesc")}
                      control={
                        <Select
                          value={String(prefs.maxFileSize ?? 25)}
                          onChange={(v) => updatePref("maxFileSize", parseInt(v))}
                          options={[
                            { value: "10", label: t("settings.media.fileSizeOptions.10") },
                            { value: "25", label: t("settings.media.fileSizeOptions.25") },
                            { value: "50", label: t("settings.media.fileSizeOptions.50") },
                            { value: "100", label: t("settings.media.fileSizeOptions.100") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.media.downloadLocation"
                      label={t("settings.media.downloadLocation")}
                      desc={t("settings.media.downloadLocationDesc")}
                      control={
                        <Select
                          value={prefs.downloadLocation ?? "default"}
                          onChange={(v) => updatePref("downloadLocation", v)}
                          options={[
                            { value: "default", label: t("common.default") },
                            { value: "custom", label: t("settings.appearance.options.small") },
                          ]}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Music} title={t("settings.media.voiceMessages")}>
                    <Row
                      id="settings.media.voiceQuality"
                      label={t("settings.media.voiceQuality")}
                      desc={t("settings.media.voiceQualityDesc")}
                      control={
                        <Select
                          value={prefs.voiceMessageQuality ?? "medium"}
                          onChange={(v) => updatePref("voiceMessageQuality", v)}
                          options={[
                            { value: "low", label: t("settings.media.qualityOptions.low") },
                            { value: "medium", label: t("settings.media.qualityOptions.medium") },
                            { value: "high", label: t("settings.media.qualityOptions.high") },
                          ]}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === AUDIO & VIDEO === */}
              {tab === "audio-video" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.audioVideo.title")}</h1>
                  <Section icon={Mic} title={t("settings.audioVideo.inputDevices")}>
                    <Row
                      id="settings.audioVideo.inputDevice"
                      label={t("settings.audioVideo.inputDevice")}
                      desc={t("settings.audioVideo.inputDeviceDesc")}
                      control={
                        <Select
                          value={prefs.inputDevice ?? "default"}
                          onChange={(v) => updatePref("inputDevice", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "mic1", label: t("settings.audioVideo.deviceOptions.builtinMic") },
                            { value: "mic2", label: t("settings.audioVideo.deviceOptions.externalMic") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.audioVideo.micSensitivity"
                      label={t("settings.audioVideo.micSensitivity")}
                      desc={t("settings.audioVideo.micSensitivityDesc")}
                      control={
                        <SliderControl
                          value={prefs.micSensitivity ?? 80}
                          min={0}
                          max={100}
                          onChange={(v) => updatePref("micSensitivity", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Headphones} title={t("settings.audioVideo.outputDevices")}>
                    <Row
                      id="settings.audioVideo.outputDevice"
                      label={t("settings.audioVideo.outputDevice")}
                      desc={t("settings.audioVideo.outputDeviceDesc")}
                      control={
                        <Select
                          value={prefs.outputDevice ?? "default"}
                          onChange={(v) => updatePref("outputDevice", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "spk1", label: t("settings.calls.deviceOptions.builtinSpeakers") },
                            { value: "spk2", label: t("settings.calls.deviceOptions.headphones") },
                          ]}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Camera} title={t("settings.audioVideo.videoDevices")}>
                    <Row
                      id="settings.audioVideo.camera"
                      label={t("settings.audioVideo.camera")}
                      desc={t("settings.audioVideo.cameraDesc")}
                      control={
                        <Select
                          value={prefs.camera ?? "default"}
                          onChange={(v) => updatePref("camera", v)}
                          options={[
                            { value: "default", label: t("settings.calls.deviceOptions.systemDefault") },
                            { value: "cam1", label: t("settings.calls.deviceOptions.builtinCamera") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.audioVideo.resolution"
                      label={t("settings.audioVideo.resolution")}
                      desc={t("settings.audioVideo.resolutionDesc")}
                      control={
                        <Select
                          value={prefs.videoResolution ?? "1280x720"}
                          onChange={(v) => updatePref("videoResolution", v)}
                          options={[
                            { value: "640x480", label: t("settings.audioVideo.resolutionOptions.640x480") },
                            { value: "1280x720", label: t("settings.audioVideo.resolutionOptions.1280x720") },
                            { value: "1920x1080", label: t("settings.audioVideo.resolutionOptions.1920x1080") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.audioVideo.frameRate"
                      label={t("settings.audioVideo.frameRate")}
                      desc={t("settings.audioVideo.frameRateDesc")}
                      control={
                        <Select
                          value={String(prefs.frameRate ?? 30)}
                          onChange={(v) => updatePref("frameRate", parseInt(v))}
                          options={[
                            { value: "15", label: t("settings.audioVideo.framerateOptions.15") },
                            { value: "24", label: t("settings.audioVideo.framerateOptions.24") },
                            { value: "30", label: t("settings.audioVideo.framerateOptions.30") },
                            { value: "60", label: t("settings.audioVideo.framerateOptions.60") },
                          ]}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === ACCESSIBILITY === */}
              {tab === "accessibility" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.accessibility.title")}</h1>
                  <Section icon={Eye} title={t("settings.accessibility.vision")}>
                    <Row
                      id="settings.accessibility.highContrast"
                      label={t("settings.accessibility.highContrast")}
                      desc={t("settings.accessibility.highContrastDesc")}
                      control={
                        <Toggle checked={prefs.highContrast ?? false} onChange={(v) => updatePref("highContrast", v)} />
                      }
                    />
                    <Row
                      id="settings.accessibility.colorBlindMode"
                      label={t("settings.accessibility.colorBlindMode")}
                      desc={t("settings.accessibility.colorBlindModeDesc")}
                      control={
                        <Select
                          value={prefs.colorBlindMode ?? "off"}
                          onChange={(v) => updatePref("colorBlindMode", v)}
                          options={[
                            { value: "off", label: t("settings.accessibility.colorBlindOptions.off") },
                            {
                              value: "deuteranopia",
                              label: t("settings.accessibility.colorBlindOptions.deuteranopia"),
                            },
                            { value: "protanopia", label: t("settings.accessibility.colorBlindOptions.protanopia") },
                            { value: "tritanopia", label: t("settings.accessibility.colorBlindOptions.tritanopia") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.accessibility.fontSize"
                      label={t("settings.accessibility.fontSize")}
                      desc={t("settings.accessibility.fontSizeDesc")}
                      control={
                        <Select
                          value={prefs.fontSize ?? "medium"}
                          onChange={(v) => updatePref("fontSize", v)}
                          options={[
                            { value: "small", label: t("settings.appearance.options.small") },
                            { value: "medium", label: t("settings.appearance.options.medium") },
                            { value: "large", label: t("settings.appearance.options.large") },
                            { value: "xlarge", label: t("settings.appearance.options.xlarge") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.accessibility.lineHeight"
                      label={t("settings.accessibility.lineHeight")}
                      desc={t("settings.accessibility.lineHeightDesc")}
                      control={
                        <SliderControl
                          value={prefs.lineHeight ?? 1.5}
                          min={1}
                          max={2.5}
                          step={0.1}
                          onChange={(v) => updatePref("lineHeight", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.accessibility.letterSpacing"
                      label={t("settings.accessibility.letterSpacing")}
                      desc={t("settings.accessibility.letterSpacingDesc")}
                      control={
                        <SliderControl
                          value={prefs.letterSpacing ?? 0}
                          min={0}
                          max={5}
                          step={0.5}
                          onChange={(v) => updatePref("letterSpacing", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Smartphone} title={t("settings.accessibility.interaction")}>
                    <Row
                      id="settings.accessibility.screenReader"
                      label={t("settings.accessibility.screenReader")}
                      desc={t("settings.accessibility.screenReaderDesc")}
                      control={
                        <Toggle checked={prefs.screenReader ?? false} onChange={(v) => updatePref("screenReader", v)} />
                      }
                    />
                    <Row
                      id="settings.accessibility.focusIndicators"
                      label={t("settings.accessibility.focusIndicators")}
                      desc={t("settings.accessibility.focusIndicatorsDesc")}
                      control={
                        <Toggle
                          checked={prefs.focusIndicators ?? true}
                          onChange={(v) => updatePref("focusIndicators", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.accessibility.reduceMotion"
                      label={t("settings.accessibility.reduceMotion")}
                      desc={t("settings.accessibility.reduceMotionDesc")}
                      control={
                        <Toggle checked={prefs.reduceMotion ?? false} onChange={(v) => updatePref("reduceMotion", v)} />
                      }
                    />
                    <Row
                      id="settings.accessibility.stickyHeaders"
                      label={t("settings.accessibility.stickyHeaders")}
                      desc={t("settings.accessibility.stickyHeadersDesc")}
                      control={
                        <Toggle
                          checked={prefs.stickyHeaders ?? true}
                          onChange={(v) => updatePref("stickyHeaders", v)}
                        />
                      }
                    />
                  </Section>
                  <Section icon={MessageSquare} title={t("settings.accessibility.chat")}>
                    <Row
                      id="settings.accessibility.chatBubbleDirection"
                      label={t("settings.accessibility.chatBubbleDirection")}
                      desc={t("settings.accessibility.chatBubbleDirectionDesc")}
                      control={
                        <Select
                          value={prefs.chatBubbleDir ?? "auto"}
                          onChange={(v) => updatePref("chatBubbleDir", v)}
                          options={[
                            { value: "auto", label: t("settings.accessibility.directionOptions.auto") },
                            { value: "left", label: t("settings.accessibility.directionOptions.left") },
                            { value: "right", label: t("settings.accessibility.directionOptions.right") },
                          ]}
                        />
                      }
                    />
                  </Section>
                  <Section icon={BookOpen} title={t("settings.reader.readingMode")}>
                    <Row
                      id="settings.reader.readerMode"
                      label={t("settings.reader.readerMode")}
                      desc={t("settings.reader.readerModeDesc")}
                      control={
                        <Toggle checked={prefs.readerMode ?? false} onChange={(v) => updatePref("readerMode", v)} />
                      }
                    />
                    <Row
                      id="settings.reader.fontSize"
                      label={t("settings.reader.fontSize")}
                      desc={t("settings.reader.fontSizeDesc")}
                      control={
                        <Select
                          value={String(prefs.fontSizeReader ?? 16)}
                          onChange={(v) => updatePref("fontSizeReader", parseInt(v))}
                          options={[
                            { value: "14", label: t("settings.reader.fontSizeOptions.14") },
                            { value: "16", label: t("settings.reader.fontSizeOptions.16") },
                            { value: "18", label: t("settings.reader.fontSizeOptions.18") },
                            { value: "20", label: t("settings.reader.fontSizeOptions.20") },
                            { value: "24", label: t("settings.reader.fontSizeOptions.24") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.reader.lineSpacing"
                      label={t("settings.reader.lineSpacing")}
                      desc={t("settings.reader.lineSpacingDesc")}
                      control={
                        <SliderControl
                          value={prefs.lineSpacing ?? 1.6}
                          min={1}
                          max={2.5}
                          step={0.1}
                          onChange={(v) => updatePref("lineSpacing", v)}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === LANGUAGE === */}
              {tab === "language" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.language.title")}</h1>
                  <Section icon={Globe} title={t("settings.language.language")}>
                    <Row
                      id="settings.language.appLanguage"
                      label={t("settings.language.appLanguage")}
                      desc={t("settings.language.appLanguageDesc")}
                      control={
                        <Select
                          value={prefs.language ?? "en"}
                          onChange={(v) => updatePref("language", v)}
                          options={supportedLanguages.map((l) => ({ value: l.code, label: `${l.native} (${l.name})` }))}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Calendar} title={t("settings.language.dateTime")}>
                    <Row
                      id="settings.language.timeFormat"
                      label={t("settings.language.timeFormat")}
                      desc={t("settings.language.timeFormatDesc")}
                      control={
                        <Select
                          value={prefs.timeFormat ?? "12h"}
                          onChange={(v) => updatePref("timeFormat", v)}
                          options={[
                            { value: "12h", label: t("settings.language.timeFormatOptions.12h") },
                            { value: "24h", label: t("settings.language.timeFormatOptions.24h") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.language.dateFormat"
                      label={t("settings.language.dateFormat")}
                      desc={t("settings.language.dateFormatDesc")}
                      control={
                        <Select
                          value={prefs.dateFormat ?? "MDY"}
                          onChange={(v) => updatePref("dateFormat", v)}
                          options={[
                            { value: "MDY", label: t("settings.language.dateFormatOptions.MDY") },
                            { value: "DMY", label: t("settings.language.dateFormatOptions.DMY") },
                            { value: "YMD", label: t("settings.language.dateFormatOptions.YMD") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.language.firstDayOfWeek"
                      label={t("settings.language.firstDayOfWeek")}
                      desc={t("settings.language.firstDayOfWeekDesc")}
                      control={
                        <Select
                          value={prefs.firstDayOfWeek ?? "sun"}
                          onChange={(v) => updatePref("firstDayOfWeek", v)}
                          options={[
                            { value: "sun", label: t("settings.language.dayOptions.sun") },
                            { value: "mon", label: t("settings.language.dayOptions.mon") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.language.timezone"
                      label={t("settings.language.timezone")}
                      desc={t("settings.language.timezoneDesc")}
                      control={
                        <select
                          value={prefs.timezone ?? "UTC"}
                          onChange={(e) => updatePref("timezone", e.target.value)}
                          className="h-8 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary outline-none max-w-[160px] cursor-pointer"
                        >
                          {[
                            "UTC",
                            "America/New_York",
                            "America/Chicago",
                            "America/Denver",
                            "America/Los_Angeles",
                            "Europe/London",
                            "Europe/Berlin",
                            "Europe/Paris",
                            "Europe/Moscow",
                            "Asia/Tokyo",
                            "Asia/Shanghai",
                            "Asia/Kolkata",
                            "Australia/Sydney",
                            "Pacific/Auckland",
                          ].map((tz) => (
                            <option key={tz} value={tz}>
                              {tz.replace(/_/g, " ")}
                            </option>
                          ))}
                        </select>
                      }
                    />
                  </Section>
                  <Section icon={Ruler} title={t("settings.language.units")}>
                    <Row
                      id="settings.language.temperature"
                      label={t("settings.language.temperature")}
                      desc={t("settings.language.temperatureDesc")}
                      control={
                        <Select
                          value={prefs.temperatureUnit ?? "c"}
                          onChange={(v) => updatePref("temperatureUnit", v)}
                          options={[
                            { value: "c", label: t("settings.language.temperatureOptions.c") },
                            { value: "f", label: t("settings.language.temperatureOptions.f") },
                          ]}
                        />
                      }
                    />
                    <Row
                      id="settings.language.measurement"
                      label={t("settings.language.measurement")}
                      desc={t("settings.language.measurementDesc")}
                      control={
                        <Select
                          value={prefs.measurementSystem ?? "metric"}
                          onChange={(v) => updatePref("measurementSystem", v)}
                          options={[
                            { value: "metric", label: t("settings.language.measurementOptions.metric") },
                            { value: "imperial", label: t("settings.language.measurementOptions.imperial") },
                          ]}
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === SHORTCUTS === */}
              {tab === "shortcuts" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.shortcuts.title")}</h1>
                  <Section icon={Keyboard} title={t("settings.shortcuts.navigation")}>
                    <Row
                      id="settings.shortcuts.navigateUp"
                      label={t("settings.shortcuts.navigateUp")}
                      desc={t("settings.shortcuts.navigateUpDesc")}
                      control={
                        <input
                          value={prefs.shortcutNavigateUp ?? "ArrowUp"}
                          onChange={(e) => updatePref("shortcutNavigateUp", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.navigateDown"
                      label={t("settings.shortcuts.navigateDown")}
                      desc={t("settings.shortcuts.navigateDownDesc")}
                      control={
                        <input
                          value={prefs.shortcutNavigateDown ?? "ArrowDown"}
                          onChange={(e) => updatePref("shortcutNavigateDown", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.quickSwitch"
                      label={t("settings.shortcuts.quickSwitch")}
                      desc={t("settings.shortcuts.quickSwitchDesc")}
                      control={
                        <input
                          value={prefs.shortcutQuickSwitch ?? "Ctrl+Tab"}
                          onChange={(e) => updatePref("shortcutQuickSwitch", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.jumpToDm"
                      label={t("settings.shortcuts.jumpToDm")}
                      desc={t("settings.shortcuts.jumpToDmDesc")}
                      control={
                        <input
                          value={prefs.shortcutJumpToDm ?? "Ctrl+Shift+K"}
                          onChange={(e) => updatePref("shortcutJumpToDm", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                  </Section>
                  <Section icon={MessageSquare} title={t("settings.shortcuts.messaging")}>
                    <Row
                      id="settings.shortcuts.newChat"
                      label={t("settings.shortcuts.newChat")}
                      desc={t("settings.shortcuts.newChatDesc")}
                      control={
                        <input
                          value={prefs.shortcutNewChat ?? "Ctrl+N"}
                          onChange={(e) => updatePref("shortcutNewChat", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.quickReply"
                      label={t("settings.shortcuts.quickReply")}
                      desc={t("settings.shortcuts.quickReplyDesc")}
                      control={
                        <input
                          value={prefs.shortcutQuickReply ?? "R"}
                          onChange={(e) => updatePref("shortcutQuickReply", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.createGroup"
                      label={t("settings.shortcuts.createGroup")}
                      desc={t("settings.shortcuts.createGroupDesc")}
                      control={
                        <input
                          value={prefs.shortcutCreateGroup ?? "Ctrl+Shift+N"}
                          onChange={(e) => updatePref("shortcutCreateGroup", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.markRead"
                      label={t("settings.shortcuts.markRead")}
                      desc={t("settings.shortcuts.markReadDesc")}
                      control={
                        <input
                          value={prefs.shortcutMarkRead ?? "Escape"}
                          onChange={(e) => updatePref("shortcutMarkRead", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                  </Section>
                  <Section icon={Sliders} title={t("settings.shortcuts.app")}>
                    <Row
                      id="settings.shortcuts.search"
                      label={t("settings.shortcuts.search")}
                      desc={t("settings.shortcuts.searchDesc")}
                      control={
                        <input
                          value={prefs.shortcutSearch ?? "Ctrl+K"}
                          onChange={(e) => updatePref("shortcutSearch", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.toggleSidebar"
                      label={t("settings.shortcuts.toggleSidebar")}
                      desc={t("settings.shortcuts.toggleSidebarDesc")}
                      control={
                        <input
                          value={prefs.shortcutToggleSidebar ?? "Ctrl+B"}
                          onChange={(e) => updatePref("shortcutToggleSidebar", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.toggleTheme"
                      label={t("settings.shortcuts.toggleTheme")}
                      desc={t("settings.shortcuts.toggleThemeDesc")}
                      control={
                        <input
                          value={prefs.shortcutToggleTheme ?? "Ctrl+Shift+T"}
                          onChange={(e) => updatePref("shortcutToggleTheme", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                    <Row
                      id="settings.shortcuts.toggleMute"
                      label={t("settings.shortcuts.toggleMute")}
                      desc={t("settings.shortcuts.toggleMuteDesc")}
                      control={
                        <input
                          value={prefs.shortcutToggleMute ?? "Ctrl+Shift+M"}
                          onChange={(e) => updatePref("shortcutToggleMute", e.target.value)}
                          className="h-8 w-28 rounded-2xl border border-border bg-bg-primary px-3 text-xs text-text-primary font-mono outline-none focus:border-accent/50 text-center"
                        />
                      }
                    />
                  </Section>
                </>
              )}

              {/* === ADVANCED === */}
              {tab === "advanced" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.advanced.title")}</h1>
                  <Section icon={Terminal} title={t("settings.advanced.developer")}>
                    <Row
                      id="settings.advanced.developerMode"
                      label={t("settings.advanced.developerMode")}
                      desc={t("settings.advanced.developerModeDesc")}
                      control={
                        <Toggle
                          checked={prefs.developerMode ?? false}
                          onChange={(v) => updatePref("developerMode", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.advanced.experimentalFeatures"
                      label={t("settings.advanced.experimentalFeatures")}
                      desc={t("settings.advanced.experimentalFeaturesDesc")}
                      control={
                        <Toggle
                          checked={prefs.experimentalFeatures ?? false}
                          onChange={(v) => updatePref("experimentalFeatures", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.advanced.loggingLevel"
                      label={t("settings.advanced.loggingLevel")}
                      desc={t("settings.advanced.loggingLevelDesc")}
                      control={
                        <Select
                          value={prefs.loggingLevel ?? "info"}
                          onChange={(v) => updatePref("loggingLevel", v)}
                          options={[
                            { value: "error", label: t("settings.advanced.loggingOptions.errorsOnly") },
                            { value: "warn", label: t("settings.advanced.loggingOptions.warnings") },
                            { value: "info", label: t("settings.advanced.loggingOptions.info") },
                            { value: "debug", label: t("settings.advanced.loggingOptions.debug") },
                          ]}
                        />
                      }
                    />
                  </Section>
                  <Section icon={Zap} title={t("settings.advanced.performance")}>
                    <Row
                      id="settings.advanced.hardwareAcceleration"
                      label={t("settings.advanced.hardwareAcceleration")}
                      desc={t("settings.advanced.hardwareAccelerationDesc")}
                      control={
                        <Toggle
                          checked={prefs.hardwareAcceleration ?? true}
                          onChange={(v) => updatePref("hardwareAcceleration", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.advanced.cacheEnabled"
                      label={t("settings.advanced.cacheEnabled")}
                      desc={t("settings.advanced.cacheEnabledDesc")}
                      control={
                        <Toggle checked={prefs.cacheEnabled ?? true} onChange={(v) => updatePref("cacheEnabled", v)} />
                      }
                    />
                    <Row
                      id="settings.advanced.autoUpdate"
                      label={t("settings.advanced.autoUpdate")}
                      desc={t("settings.advanced.autoUpdateDesc")}
                      control={
                        <Toggle checked={prefs.autoUpdate ?? true} onChange={(v) => updatePref("autoUpdate", v)} />
                      }
                    />
                  </Section>
                  <Section icon={Cloud} title={t("settings.advanced.dataPrivacy")}>
                    <Row
                      id="settings.advanced.crashReporting"
                      label={t("settings.advanced.crashReporting")}
                      desc={t("settings.advanced.crashReportingDesc")}
                      control={
                        <Toggle
                          checked={prefs.crashReporting ?? true}
                          onChange={(v) => updatePref("crashReporting", v)}
                        />
                      }
                    />
                    <Row
                      id="settings.advanced.diagnostics"
                      label={t("settings.advanced.diagnostics")}
                      desc={t("settings.advanced.diagnosticsDesc")}
                      control={
                        <Toggle checked={prefs.diagnostics ?? false} onChange={(v) => updatePref("diagnostics", v)} />
                      }
                    />
                  </Section>
                  <Section icon={Wifi} title={t("settings.offline.title")}>
                    <OfflineCacheInfo />
                  </Section>
                </>
              )}

              {/* === ABOUT === */}
              {tab === "about" && (
                <>
                  <h1 className="text-lg font-semibold text-text-primary">{t("settings.about.title")}</h1>
                  <Section icon={Info} title={t("settings.about.appInfo")}>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          ["version", "1.0.0"],
                          ["server", "Express + PostgreSQL + Redis"],
                          ["client", "React + Tailwind CSS"],
                          ["protocol", "WebSocket + REST API"],
                          ["authentication", "JWT + TOTP 2FA"],
                          ["realTime", "WebSocket + Heartbeat"],
                          ["database", "PostgreSQL 16"],
                          ["nodeJs", "20+"],
                          ["license", "MIT"],
                          ["repository", "github.com/chat-app"],
                        ] as const
                      ).map(([key, value]) => (
                        <div key={key} className="rounded-xl bg-bg-primary p-3">
                          <p className="text-[10px] text-text-muted uppercase tracking-wider">
                            {t(`settings.about.${key}`)}
                          </p>
                          <p className="text-sm text-text-primary mt-0.5 break-all">{value}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
