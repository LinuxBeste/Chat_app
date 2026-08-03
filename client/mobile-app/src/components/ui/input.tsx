import { TextInput, StyleSheet, type TextInputProps } from "react-native"
import { useTheme } from "../../lib/theme-context"

export function Input(props: TextInputProps) {
  const { c } = useTheme()
  return (
    <TextInput
      style={[s.input, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }, props.style]}
      placeholderTextColor={c.textMuted}
      {...props}
    />
  )
}

const s = StyleSheet.create({
  input: {
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
})
