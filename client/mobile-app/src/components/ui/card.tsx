import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export function Card({ children, style }: CardProps) {
  return <View style={[s.card, style]}>{children}</View>
}

const s = StyleSheet.create({
  card: { backgroundColor: "#101016", borderRadius: 20, borderWidth: 1, borderColor: "#252538", padding: 20 },
})
