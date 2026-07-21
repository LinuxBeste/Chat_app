import { Redis } from "ioredis"
import { config } from "../config.js"
import { logger } from "./logger.js"

let redis: Redis | null = null

if (config.redis.url) {
  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null
      return Math.min(times * 200, 2000)
    },
  })

  redis.on("connect", () => logger.info("Redis connected"))
  redis.on("error", (err) => logger.error({ err }, "Redis error"))
}

export function getRedis() {
  return redis
}
