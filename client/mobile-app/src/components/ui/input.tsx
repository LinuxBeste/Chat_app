import { TextInput, StyleSheet, type TextInputProps } from "react-native"

export function Input(props: TextInputProps) {
  return <TextInput style={[s.input, props.style]} placeholderTextColor="#585870" {...props} />
}

const s = StyleSheet.create({
  input: {
    backgroundColor: "#0A0A0F",
    borderRadius: 12,
    padding: 14,
    color: "#E8E8F0",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#252538",
  },
})
