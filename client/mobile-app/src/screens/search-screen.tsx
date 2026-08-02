import { useState, useCallback, useRef } from "react"
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native"
import { api } from "../lib/api"
import { useTranslation } from "react-i18next"
import { useSafeAreaInsets } from "react-native-safe-area-context"

interface SearchResult {
  id: string
  content: string
  conversationId: string
  senderUsername: string
  createdAt: string
}

export function SearchScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (convId: string) => void }) {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const data = await api<SearchResult[]>(`/api/productivity/search?q=${encodeURIComponent(q)}`)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!v.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => search(v), 300)
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.back}>
            {"<"} {t("common.back")}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={s.searchInput}
          placeholder={t("chat.searchPlaceholder")}
          placeholderTextColor="#585870"
          value={query}
          onChangeText={handleChange}
          autoFocus
        />
      </View>
      {searching && <Text style={s.status}>{t("common.loading")}</Text>}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => onSelect(item.conversationId)}>
            <Text style={s.sender}>{item.senderUsername}</Text>
            <Text style={s.content} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={s.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={query ? <Text style={s.empty}>{t("common.noResults")}</Text> : null}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0F" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A28",
    gap: 12,
  },
  back: { color: "#6C8CFF", fontSize: 15, fontWeight: "500" },
  backBtn: { padding: 4 },
  searchInput: {
    flex: 1,
    backgroundColor: "#101016",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#E8E8F0",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#1A1A28",
  },
  status: { color: "#585870", textAlign: "center", padding: 12, fontSize: 13 },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A28" },
  sender: { color: "#6C8CFF", fontSize: 13, fontWeight: "500" },
  content: { color: "#E8E8F0", fontSize: 15, marginTop: 2 },
  date: { color: "#585870", fontSize: 11, marginTop: 4 },
  empty: { color: "#585870", textAlign: "center", marginTop: 60, fontSize: 15 },
})
