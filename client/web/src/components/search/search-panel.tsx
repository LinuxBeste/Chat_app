import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Search, MessageSquare, X } from "lucide-react";

interface SearchResult {
  id: string;
  content: string;
  createdAt: string;
  senderUsername: string;
  conversationId: string;
}

interface SearchPanelProps {
  query: string;
  onChange: (query: string) => void;
  onClose: () => void;
}

export function SearchPanel({ query, onChange, onClose }: SearchPanelProps) {
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<SearchResult[]>(`/api/productivity/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-30 max-w-md">
      <div className="rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-text-muted shrink-0" />
          <p className="flex-1 text-sm text-text-primary truncate">{query}</p>
          <button
            onClick={() => {
              onChange("");
              onClose();
            }}
            className="text-text-muted hover:text-text-primary cursor-pointer"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {query.length >= 2 && results.length === 0 && (
            <p className="text-sm text-text-muted p-4 text-center">No results found</p>
          )}
          {results.map((r) => (
            <div
              key={r.id}
              className="px-4 py-3 border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-text-muted mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{r.content}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    @{r.senderUsername} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
