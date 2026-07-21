import { createServer } from "http"
import app from "./app.js"
import { config } from "./config.js"
import { testConnection } from "./lib/db.js"
import { createWSServer } from "./ws/index.js"
import { logger } from "./lib/logger.js"

async function main() {
  logger.info({ nodeEnv: process.env.NODE_ENV, port: config.port, host: config.host }, "Starting server")
  await testConnection()

  const server = createServer(app)

  createWSServer(server)

  server.listen(config.port, config.host, () => {
    logger.info({ port: config.port, host: config.host }, `Server listening on http://${config.host}:${config.port}`)
  })

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully")
    server.close(() => {
      logger.info("Server closed")
      process.exit(0)
    })
    setTimeout(() => {
      logger.error("Forced shutdown after timeout")
      process.exit(1)
    }, 10000)
  }

  process.on("SIGINT", () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))

  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception")
    shutdown("uncaughtException")
  })

  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled promise rejection")
    shutdown("unhandledRejection")
  })
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server")
  process.exit(1)
})
