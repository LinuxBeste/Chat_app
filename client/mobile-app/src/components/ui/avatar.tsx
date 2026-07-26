import { View, Text, StyleSheet } from "react-native"

interface AvatarProps {
  name?: string
  size?: number
}

export function Avatar({ name = "?", size = 44 }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  avatar: { backgroundColor: "#181825", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538" },
  text: { color: "#E8E8F0", fontWeight: "600" },
})
