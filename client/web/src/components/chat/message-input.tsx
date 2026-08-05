import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Send, Paperclip, Smile, Loader2, Upload, WifiOff } from "lucide-react";
import { apiFormData } from "../../lib/api";
import { useToast } from "../../lib/toast-context";
import { EmojiPicker } from "./emoji-picker";
import { subscribeToOnlineStatus, isOnline as checkOnline, getPendingMessages } from "../../lib/offline";

export interface AttachmentData {
  id?: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string, messageType?: string, attachment?: AttachmentData) => void;
}

export function MessageInput({ conversationId: _conversationId, onSend }: MessageInputProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [offline, setOffline] = useState(!checkOnline());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToOnlineStatus(
      () => setOffline(false),
      () => setOffline(true),
    );
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (!input) {
      setValue((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart ?? value.length;
    const end = input.selectionStart ?? value.length;
    const newValue = value.slice(0, start) + emoji + value.slice(end);
    setValue(newValue);
    requestAnimationFrame(() => {
      input.selectionStart = input.selectionEnd = start + emoji.length;
      input.focus();
    });
  };

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await apiFormData<AttachmentData>("/api/uploads", formData);
        onSend(result.url, file.type.startsWith("image/") ? "image" : "file", result);
      } catch {
        showToast(t("chat.uploadError"));
      } finally {
        setUploading(false);
      }
    },
    [onSend],
  );

  const handleSend = () => {
    if (!value.trim() || uploading) return;
    onSend(value.trim());
    setValue("");
  };

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className="relative" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-accent/20 border-2 border-dashed border-accent">
          <div className="flex flex-col items-center gap-2 text-accent">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">{t("chat.dropFile")}</span>
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-3 border-t border-border px-4 py-3"
        role="form"
        aria-label={t("chat.messageInput")}
      >
        {offline &&
          (() => {
            const pendingCount = getPendingMessages().length;
            return (
              <div className="flex items-center gap-1.5 text-yellow-400 text-xs shrink-0" title={t("chat.offline")}>
                <WifiOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("chat.offline")}</span>
                {pendingCount > 0 && (
                  <span className="ml-0.5 bg-yellow-400/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </div>
            );
          })()}
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          onClick={handleFilePick}
          disabled={uploading}
          aria-label={t("chat.attachFile")}
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            aria-label={t("chat.insertEmoji")}
            className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-muted hover:text-text-secondary hover:bg-white/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Smile className="h-4 w-4" aria-hidden="true" />
          </button>
          {showEmojiPicker && (
            <EmojiPicker onEmojiSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />
          )}
        </div>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("chat.typeMessage")}
          aria-label={t("chat.messageText")}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
        <button
          onClick={handleSend}
          aria-label={t("chat.sendMessageBtn")}
          disabled={!value.trim() || uploading}
          className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent text-white hover:bg-accent-hover transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
