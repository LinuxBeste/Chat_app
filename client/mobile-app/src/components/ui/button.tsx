import { TouchableOpacity, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../lib/theme-context"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ title, onPress, variant = "primary", disabled, style }: ButtonProps) {
  const { c } = useTheme()
  const bg =
    variant === "primary"
      ? { backgroundColor: c.accent }
      : variant === "danger"
        ? { backgroundColor: c.danger }
        : { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }
  const textColor = variant === "secondary" ? { color: c.text } : { color: "#FFFFFF" }
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[s.btn, bg, disabled && s.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.text, textColor]}>{title}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  btn: {
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  disabled: { opacity: 0.4 },
  text: { fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
})
