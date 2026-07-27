import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native"

type ToastType = "error" | "success" | "info"

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={s.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <TouchableOpacity
            key={toast.id}
            style={[
              s.toast,
              toast.type === "error" && s.error,
              toast.type === "success" && s.success,
              toast.type === "info" && s.info,
            ]}
            onPress={() => dismiss(toast.id)}
          >
            <Text style={s.text}>{toast.message}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

const s = StyleSheet.create({
  container: { position: "absolute", bottom: 100, left: 16, right: 16, zIndex: 9999 },
  toast: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  error: { backgroundColor: "#EF4444" },
  success: { backgroundColor: "#22C55E" },
  info: { backgroundColor: "#4850BB" },
  text: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
})
