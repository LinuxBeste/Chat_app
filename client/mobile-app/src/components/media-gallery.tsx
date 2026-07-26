import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from "react-native"

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
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Shared Media</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={s.close}>Close</Text>
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
              <View style={s.filePlaceholder}>
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
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#252538" },
  title: { color: "#E8E8F0", fontSize: 18, fontWeight: "600" },
  close: { color: "#6C8CFF", fontSize: 15 },
  item: { flex: 1, aspectRatio: 1, padding: 2 },
  image: { flex: 1, borderRadius: 8 },
  filePlaceholder: { flex: 1, backgroundColor: "#101016", borderRadius: 8, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#252538" },
  fileIcon: { fontSize: 28 },
})
