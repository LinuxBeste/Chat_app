const DB_NAME = "chat-app-offline"
const DB_VERSION = 1
let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("conversations")) {
        db.createObjectStore("conversations", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("messages")) {
        const store = db.createObjectStore("messages", { keyPath: "id" })
        store.createIndex("conversationId", "conversationId", { unique: false })
      }
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function cacheConversations(convs: any[]) {
  const db = await openDB()
  const tx = db.transaction("conversations", "readwrite")
  for (const c of convs) tx.objectStore("conversations").put(c)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedConversations(): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction("conversations", "readonly")
  const store = tx.objectStore("conversations")
  return new Promise((resolve, reject) => {
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheMessages(conversationId: string, msgs: any[]) {
  const db = await openDB()
  const tx = db.transaction("messages", "readwrite")
  const store = tx.objectStore("messages")
  for (const m of msgs) store.put({ ...m, conversationId })
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedMessages(conversationId: string): Promise<any[]> {
  const db = await openDB()
  const tx = db.transaction("messages", "readonly")
  const index = tx.objectStore("messages").index("conversationId")
  return new Promise((resolve, reject) => {
    const req = index.getAll(conversationId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cacheUsers(users: any[]) {
  const db = await openDB()
  const tx = db.transaction("users", "readwrite")
  for (const u of users) tx.objectStore("users").put(u)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getCachedUser(userId: string): Promise<any> {
  const db = await openDB()
  const tx = db.transaction("users", "readonly")
  return new Promise((resolve, reject) => {
    const req = tx.objectStore("users").get(userId)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
