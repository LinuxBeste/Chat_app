import { useState, useCallback, useRef } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { api } from "../lib/api";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../lib/theme-context";

interface SearchResult {
  id: string;
  content: string;
  conversationId: string;
  senderUsername: string;
  createdAt: string;
}

export function SearchScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (convId: string) => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await api<SearchResult[]>(`/api/productivity/search?q=${encodeURIComponent(q)}`);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(v), 300);
  };

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 12, borderBottomColor: c.borderLight }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={[s.back, { color: c.accent }]}>
            {"<"} {t("common.back")}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={[s.searchInput, { backgroundColor: c.inputBg, color: c.text, borderColor: c.border }]}
          placeholder={t("chat.searchPlaceholder")}
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={handleChange}
          autoFocus
        />
      </View>
      {searching && <Text style={[s.status, { color: c.textMuted }]}>{t("common.loading")}</Text>}
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.item, { borderBottomColor: c.borderLight }]}
            onPress={() => onSelect(item.conversationId)}
          >
            <Text style={[s.sender, { color: c.accent }]}>{item.senderUsername}</Text>
            <Text style={[s.content, { color: c.text }]} numberOfLines={2}>
              {item.content}
            </Text>
            <Text style={[s.date, { color: c.textMuted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query ? <Text style={[s.empty, { color: c.textMuted }]}>{t("common.noResults")}</Text> : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  back: { fontSize: 15, fontWeight: "500" },
  backBtn: { padding: 4 },
  searchInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  status: { textAlign: "center", padding: 12, fontSize: 13 },
  item: { padding: 14, borderBottomWidth: 1 },
  sender: { fontSize: 13, fontWeight: "500" },
  content: { fontSize: 15, marginTop: 2 },
  date: { fontSize: 11, marginTop: 4 },
  empty: { textAlign: "center", marginTop: 60, fontSize: 15 },
});
