import { TouchableOpacity, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native"

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

export function Button({ title, onPress, variant = "primary", disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[s.btn, s[variant], disabled && s.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[s.text, variant === "secondary" && s.textSecondary, variant === "danger" && s.textDanger]}>
        {title}
      </Text>
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
  primary: { backgroundColor: "#6C8CFF" },
  secondary: { backgroundColor: "#181825", borderWidth: 1, borderColor: "#1A1A28" },
  danger: { backgroundColor: "#EF4444" },
  disabled: { opacity: 0.4 },
  text: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },
  textSecondary: { color: "#E8E8F0" },
  textDanger: { color: "#FFFFFF" },
})
