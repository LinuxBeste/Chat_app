import { View, Text, StyleSheet } from "react-native";

interface AvatarProps {
  name?: string;
  size?: number;
}

const avatarPalette = ["#5B8DEF", "#38B7DE", "#E542A3", "#1FA855", "#C484FF", "#F27F2F", "#3FC8B4", "#E5A13C"];

const avatarColor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
};

export function Avatar({ name = "?", size = 44 }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(name) }]}>
      <Text style={[s.text, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: { color: "#FFFFFF", fontWeight: "700" },
});
