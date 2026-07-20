import express, { type Express } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { config } from "./config.js"

import authRoutes from "./routes/auth.js"
import userRoutes from "./routes/users.js"
import conversationRoutes from "./routes/conversations.js"
import friendRoutes from "./routes/friends.js"
import uploadRoutes from "./routes/uploads.js"

const app: Express = express()

app.use(helmet())
app.use(cors({ origin: config.cors.origin, credentials: true }))
app.use(morgan("dev"))
app.use(express.json())

const __dirname = dirname(fileURLToPath(import.meta.url))
app.use("/uploads", express.static(resolve(__dirname, "..", config.uploads.dir)))

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() })
})

app.use(`${config.apiPrefix}/auth`, authRoutes)
app.use(`${config.apiPrefix}/users`, userRoutes)
app.use(`${config.apiPrefix}/conversations`, conversationRoutes)
app.use(`${config.apiPrefix}/friends`, friendRoutes)
app.use(`${config.apiPrefix}/uploads`, uploadRoutes)

export default app
