const PENDING_KEY = "offline:pending";
const CACHE_PREFIX = "offline:messages:";
const CURRENT_USER_KEY = "offline:current-user";

export interface QueuedMessage {
  id: string;
  conversationId: string;
  type: "message:send";
  payload: Record<string, unknown>;
  createdAt: string;
}

export function getPendingMessages(): QueuedMessage[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPendingMessage(msg: QueuedMessage) {
  try {
    const queue = getPendingMessages();
    queue.push(msg);
    localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
  } catch {
    /* storage full */
  }
}

export function removePendingMessage(id: string) {
  try {
    const queue = getPendingMessages().filter((m) => m.id !== id);
    localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

export function clearPendingMessages() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function getCachedMessages(conversationId: string): any[] {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + conversationId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheMessages(conversationId: string, messages: any[]) {
  try {
    localStorage.setItem(CACHE_PREFIX + conversationId, JSON.stringify(messages.slice(-200)));
  } catch {
    /* ignore */
  }
}

export function clearConversationCache(conversationId: string) {
  try {
    localStorage.removeItem(CACHE_PREFIX + conversationId);
  } catch {
    /* ignore */
  }
}

export function cacheCurrentUser(user: unknown) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch {
    /* storage full */
  }
}

export function getCachedCurrentUser(): unknown | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCachedCurrentUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    /* ignore */
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function subscribeToOnlineStatus(onOnline: () => void, onOffline: () => void): () => void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
