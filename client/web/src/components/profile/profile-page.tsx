import { useState, useEffect, useRef } from "react";
import { api, apiFormData, resolveAssetUrl } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { useTranslation } from "react-i18next";
import { useToast } from "../../lib/toast-context";
import { Camera, Copy, Loader2 } from "lucide-react";

export function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ displayName: string | null; bio?: string; avatar?: string | null }>("/api/users/me")
      .then((u) => {
        setDisplayName(u.displayName ?? "");
        setBio(u.bio ?? "");
        setAvatar(u.avatar ?? null);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({ displayName, bio }),
      });
      showToast(t("profile.saveSuccess"), "success");
    } catch (err: any) {
      showToast(err?.message ?? t("profile.saveError"));
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await apiFormData<{ avatar: string }>("/api/users/avatar", formData);
      setAvatar(res.avatar);
      showToast(t("profile.avatarSuccess"), "success");
    } catch (err: any) {
      showToast(err?.message ?? t("profile.avatarError"));
    }
    setUploading(false);
  };

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-8">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-lg font-semibold text-text-primary">{t("profile.title")}</h1>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white text-xl font-bold shrink-0 overflow-hidden">
              {avatar ? (
                <img src={resolveAssetUrl(avatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                ((displayName || user?.username)?.[0]?.toUpperCase() ?? "?")
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={t("profile.changeAvatar")}
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{user?.username}</p>
            <p className="text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-text-muted mb-0.5">{t("profile.userId")}</p>
            <p className="text-sm text-text-primary font-mono truncate">{user?.id}</p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(user?.id ?? "");
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-medium text-text-muted hover:text-accent hover:bg-accent/10 transition-all cursor-pointer shrink-0"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? t("common.copied") : t("common.copy")}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted block mb-1">{t("profile.displayName")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("profile.displayNamePlaceholder")}
              className="w-full h-10 rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">{t("profile.bio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("profile.bioPlaceholder")}
              rows={3}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? t("common.saving") : t("profile.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
