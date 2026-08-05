import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "../ui/avatar";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast-context";
import { cacheConversations, getCachedConversations } from "../../lib/offline-db";
import { isOnline } from "../../lib/offline";
import { Plus, X, UserPlus, Loader2, AlertCircle } from "lucide-react";

interface Conversation {
  id: string;
  type: "dm" | "group" | "channel";
  name: string | null;
  avatar: string | null;
  createdAt: string;
  otherUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    customStatus: string | null;
  } | null;
}

interface ConversationListProps {
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [showNewConv, setShowNewConv] = useState(false);
  const [input, setInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOnline()) {
      getCachedConversations().then((cached) => {
        if (cached.length > 0) setConvs(cached.filter((c: any) => c.type === "dm"));
      });
      return;
    }
    api<Conversation[]>("/api/conversations")
      .then((convs) => {
        const filtered = convs.filter((c) => c.type === "dm");
        setConvs(filtered);
        cacheConversations(filtered);
      })
      .catch(() => {
        getCachedConversations().then((cached) => {
          if (cached.length > 0) setConvs(cached.filter((c: any) => c.type === "dm"));
          else showToast(t("chat.loadError"));
        });
      });
  }, []);

  const createConversation = async () => {
    const q = input.trim();
    if (!q) return;

    setCreating(true);
    setError("");

    try {
      let userId = q;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        const lookup = await api<{ id: string }>("/api/friends/lookup?q=" + encodeURIComponent(q));
        userId = lookup.id;
      }

      const conv = await api<Conversation>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "dm", participantIds: [userId] }),
      });
      setConvs((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
      onSelect(conv.id);
      setShowNewConv(false);
      setInput("");
    } catch (err: any) {
      setError(err?.message || t("chat.userNotFound"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">{t("chat.conversations")}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {convs.length} {t("chat.total")}
          </p>
        </div>
        <button
          onClick={() => setShowNewConv(true)}
          aria-label={t("chat.newConversation")}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-accent hover:bg-accent/10 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" role="listbox" aria-label={t("chat.conversations")}>
        {convs.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            role="option"
            aria-selected={activeId === conv.id}
            aria-label={`${t("chat.openConversation")} ${conv.name ?? conv.type}`}
            className={`flex w-full items-start gap-3 px-4 py-3.5 transition-all duration-200 cursor-pointer text-left border-b border-border last:border-0 hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${activeId === conv.id ? "bg-accent/[0.03]" : ""}`}
          >
            <div className="relative shrink-0 mt-0.5">
              <Avatar
                src={conv.type === "dm" ? (conv.otherUser?.avatar ?? undefined) : (conv.avatar ?? undefined)}
                fallback={
                  conv.type === "dm"
                    ? (conv.otherUser?.displayName?.[0] ?? conv.otherUser?.username?.[0] ?? "?")
                    : (conv.name?.[0] ?? "?")
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {conv.type === "dm" && conv.otherUser
                    ? (conv.otherUser.displayName ?? conv.otherUser.username)
                    : (conv.name ?? conv.type)}
                </span>
              </div>
              <p className="text-sm text-text-secondary truncate mt-0.5">
                {conv.type === "dm"
                  ? conv.otherUser?.customStatus || t("chat.dmConversation")
                  : t(`chat.${conv.type}Conversation`)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* New Conversation Modal */}
      {showNewConv && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40"
          onClick={() => setShowNewConv(false)}
        >
          <div
            className="w-full max-w-sm rounded-[32px] border border-border bg-surface shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-accent" />
                {t("chat.addByUsernameOrId")}
              </h3>
              <button
                onClick={() => setShowNewConv(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 pb-4 space-y-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.usernameOrIdPlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && createConversation()}
                className="w-full h-12 rounded-2xl border border-border bg-bg-primary px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                autoFocus
                disabled={creating}
              />
              {error && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}
              <button
                onClick={createConversation}
                disabled={!input.trim() || creating}
                className="w-full h-11 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("chat.adding")}
                  </>
                ) : (
                  t("chat.startConversation")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
