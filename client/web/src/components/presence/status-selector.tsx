import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { wsClient } from "../../lib/ws";
import { useTheme } from "../../lib/theme-context";
import { Circle, Check } from "lucide-react";

const statuses = [
  { value: "online", label: "Online", color: "text-online" },
  { value: "away", label: "Away", color: "text-away" },
  { value: "busy", label: "Busy", color: "text-busy" },
  { value: "offline", label: "Offline", color: "text-text-muted" },
] as const;

export function StatusSelector() {
  const { themeConfig } = useTheme();
  const [open, setOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("online");
  const [displayStatus, setDisplayStatus] = useState("Online");

  const statusEmoji = themeConfig?.statusEmoji;

  useEffect(() => {
    api<{ status: string; customStatus: string | null }>("/api/users/me")
      .then((u) => {
        setCurrentStatus(u.status);
        setCustomStatus(u.customStatus ?? "");
        setDisplayStatus(u.customStatus || (statuses.find((s) => s.value === u.status)?.label ?? "Online"));
      })
      .catch(() => {});
  }, []);

  const setStatus = async (value: string) => {
    setCurrentStatus(value);
    const s = statuses.find((s) => s.value === value);
    setDisplayStatus(s?.label ?? value);
    await api("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ status: value, customStatus: "" }),
    }).catch(() => {});
    wsClient.send("presence:status", { status: value });
    setOpen(false);
  };

  const saveCustomStatus = async () => {
    setSaving(true);
    setDisplayStatus(customStatus);
    await api("/api/users/me", {
      method: "PUT",
      body: JSON.stringify({ customStatus }),
    }).catch(() => {});
    setSaving(false);
    setOpen(false);
  };

  const activeStatus = statuses.find((s) => s.value === currentStatus) ?? statuses[3];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        aria-label="Change status"
      >
        {statusEmoji ? (
          <span className="text-sm">{statusEmoji}</span>
        ) : (
          <Circle className={`h-2.5 w-2.5 fill-current ${activeStatus.color}`} />
        )}
        {displayStatus}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-20 w-56 rounded-2xl border border-border bg-surface p-2 shadow-xl">
            <p className="text-xs text-text-muted px-3 py-1.5">Set status</p>
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
              >
                {statusEmoji ? (
                  <span className="text-sm w-3 h-3 flex items-center justify-center">{statusEmoji}</span>
                ) : (
                  <Circle className={`h-3 w-3 fill-current ${s.color}`} />
                )}
                {s.label}
                {currentStatus === s.value && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
              </button>
            ))}
            <div className="border-t border-border mt-2 pt-2 px-3">
              <p className="text-xs text-text-muted mb-1.5">Custom status</p>
              <div className="flex gap-2">
                <input
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  placeholder="What's on your mind?"
                  maxLength={80}
                  className="flex-1 h-8 rounded-xl border border-border bg-bg-primary px-2.5 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50"
                />
                <button
                  onClick={saveCustomStatus}
                  disabled={saving || !customStatus.trim()}
                  className="h-8 rounded-xl bg-accent text-white text-xs px-3 font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-40"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
