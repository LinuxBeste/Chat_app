import { createServer } from "http"
import app from "./app.js"
import { config } from "./config.js"
import { testConnection } from "./lib/db.js"
import { createWSServer } from "./ws/index.js"

async function main() {
  await testConnection()

  const server = createServer(app)

  createWSServer(server)

  server.listen(config.port, config.host, () => {
    console.log(`Server running on http://${config.host}:${config.port}`)
    console.log(`WebSocket ready on ws://${config.host}:${config.port}`)
  })

  const shutdown = () => {
    console.log("\nShutting down...")
    server.close(() => process.exit(0))
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})
