#!/usr/bin/env node
/**
 * Syncs i18n locale files with keys actually used in the source.
 * - en.json is the source of truth; missing keys are added (using the
 *   inline fallback value from t("key", "fallback") calls, else the key).
 * - All other locales get the same key set, filled with the English value
 *   when a key is missing (marked for manual translation later).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const CLIENTS = ["client/web", "client/mobile-app"]
const LOCALE_DIR = "src/lib/i18n/locales"
const LOCALES = ["en", "de", "fr", "es", "ja"]
const KEY_RE = /\bt\(\s*"([^"]+)"(?:\s*,\s*"([^"]*)")?/g

function collectKeys(dir, out) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "build") continue
      collectKeys(full, out)
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) {
      const src = readFileSync(full, "utf8")
      for (const m of src.matchAll(KEY_RE)) {
        if (!out.has(m[1])) out.set(m[1], m[2])
      }
    }
  }
}

function getNested(obj, key) {
  return key.split(".").reduce((o, p) => (o == null ? undefined : o[p]), obj)
}

function setNested(obj, key, value) {
  const parts = key.split(".")
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {}
    cur = cur[p]
  }
  cur[parts[parts.length - 1]] = value
}

function countLeaf(obj) {
  let n = 0
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") n += countLeaf(v)
    else if (typeof v === "string") n += 1
  }
  return n
}

for (const client of CLIENTS) {
  const localeDir = join(root, client, LOCALE_DIR)
  const used = new Map()
  collectKeys(join(root, client, "src"), used)

  const docs = {}
  for (const loc of LOCALES) {
    docs[loc] = JSON.parse(readFileSync(join(localeDir, `${loc}.json`), "utf8"))
  }

  let added = 0
  for (const [key, fallback] of used) {
    if (getNested(docs.en, key) === undefined) {
      setNested(docs.en, key, fallback || key)
      added++
    }
  }

  // Ensure every non-English locale has exactly the same key set as en.
  let backfilled = 0
  const enLeafKeys = []
  ;(function walk(obj, prefix) {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === "object") walk(v, path)
      else if (typeof v === "string") enLeafKeys.push(path)
    }
  })(docs.en, "")
  const enKeySet = new Set(enLeafKeys)
  for (const loc of LOCALES.filter((l) => l !== "en")) {
    for (const key of enLeafKeys) {
      if (getNested(docs[loc], key) === undefined) {
        setNested(docs[loc], key, getNested(docs.en, key))
        backfilled++
      }
    }
    // Drop orphan keys that no longer exist in en (unused anywhere).
    const prune = []
    ;(function collect(obj, prefix) {
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === "object") collect(v, path)
        else if (typeof v === "string" && !enKeySet.has(path)) prune.push(path)
      }
    })(docs[loc], "")
    for (const key of prune) {
      const parts = key.split(".")
      const parent = parts.slice(0, -1).reduce((o, p) => o[p], docs[loc])
      delete parent[parts[parts.length - 1]]
    }
  }

  for (const loc of LOCALES) {
    writeFileSync(join(localeDir, `${loc}.json`), JSON.stringify(docs[loc], null, 2) + "\n")
  }

  const counts = LOCALES.map((l) => `${l}:${countLeaf(docs[l])}`).join(" ")
  console.log(`${client}: +${added} keys added to en, ${backfilled} values backfilled into de/fr/es/ja [${counts}]`)
}
