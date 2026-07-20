import { Redis } from "ioredis"
import { config } from "../config.js"

let redis: Redis | null = null

if (config.redis.url) {
  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
  })

  redis.on("connect", () => console.log("Redis connected"))
  redis.on("error", (err) => console.error("Redis error:", err.message))
}

export function getRedis() {
  return redis
}
