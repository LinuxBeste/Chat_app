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
import moderationRoutes from "./routes/moderation.js"
import privacyRoutes from "./routes/privacy.js"
import productivityRoutes from "./routes/productivity.js"
import { errorHandler } from "./middleware/error-handler.js"
import developerRoutes from "./routes/developer.js"
import securityRoutes from "./routes/security.js"
import uploadRoutes from "./routes/uploads.js"
import notificationRoutes from "./routes/notifications.js"
import eventRoutes from "./routes/events.js"

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
app.use(`${config.apiPrefix}/moderation`, moderationRoutes)
app.use(`${config.apiPrefix}/privacy`, privacyRoutes)
app.use(`${config.apiPrefix}/productivity`, productivityRoutes)
app.use(`${config.apiPrefix}/developer`, developerRoutes)
app.use(`${config.apiPrefix}/notifications`, notificationRoutes)
app.use(`${config.apiPrefix}/security`, securityRoutes)
app.use(`${config.apiPrefix}/events`, eventRoutes)
app.use(`${config.apiPrefix}/uploads`, uploadRoutes)

app.use(errorHandler)

export default app
