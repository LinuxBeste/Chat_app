import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from "react-native"
import { useTheme } from "../lib/theme-context"

interface MediaItem {
  id: string
  url: string
  type: string
  fileName: string
}

interface MediaGalleryProps {
  media: MediaItem[]
  onClose: () => void
}

export function MediaGallery({ media, onClose }: MediaGalleryProps) {
  const { c } = useTheme()
  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { borderBottomColor: c.borderLight }]}>
        <Text style={[s.title, { color: c.text }]}>Shared Media</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={[s.close, { color: c.accent }]}>Close</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={media}
        numColumns={3}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={s.item}>
            {item.type.startsWith("image/") ? (
              <Image source={{ uri: item.url }} style={s.image} />
            ) : (
              <View style={[s.filePlaceholder, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={s.fileIcon}>📄</Text>
              </View>
            )}
          </View>
        )}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "600" },
  close: { fontSize: 15 },
  item: { flex: 1, aspectRatio: 1, padding: 2 },
  image: { flex: 1, borderRadius: 8 },
  filePlaceholder: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  fileIcon: { fontSize: 28 },
})
