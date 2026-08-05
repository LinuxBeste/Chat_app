import { View, Text, StyleSheet } from "react-native";

interface BadgeProps {
  count: number;
  size?: "sm" | "md";
}

export function Badge({ count, size = "sm" }: BadgeProps) {
  if (count <= 0) return null;
  return (
    <View style={[s.badge, size === "md" && s.md]}>
      <Text style={[s.text, size === "md" && s.textMd]}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  md: { minWidth: 22, height: 22, borderRadius: 11 },
  text: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  textMd: { fontSize: 12 },
});
