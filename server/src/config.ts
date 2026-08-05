import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: resolve(__dirname, "..", ".env") });

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  host: process.env.HOST ?? "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  apiPrefix: process.env.API_PREFIX ?? "/api",

  cors: {
    origin: process.env.CORS_ORIGIN ?? "*",
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "7d",
  },

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10),
  },

  db: {
    url: process.env.DATABASE_URL ?? "postgresql://chat:chat@localhost:5432/chat",
    poolMax: parseInt(process.env.DB_POOL_MAX ?? "20", 10),
  },

  redis: {
    url: process.env.REDIS_URL ?? "",
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
    ipMax: parseInt(process.env.IP_RATE_LIMIT_MAX ?? "20", 10),
    regMax: parseInt(process.env.REG_RATE_LIMIT_MAX ?? "5", 10),
  },

  ws: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL ?? "30000", 10),
    maxConnectionsPerIp: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP ?? "10", 10),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? resolve(__dirname, "..", "data", "uploads"),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE ?? "26214400", 10),
  },

  admin: {
    userIds: (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean),
    ownerUserId: process.env.OWNER_USER_ID ?? "",
  },
} as const;
