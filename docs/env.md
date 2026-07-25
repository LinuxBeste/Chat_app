# Environment Variables

See [`server/.env.example`](../server/.env.example) for a template with default values.

## Server (`server/.env`)

### Server
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `HOST` | Bind address | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `API_PREFIX` | API route prefix | `/api` |

### CORS
| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed origins | `*` |

### Security
| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `change-me-to-a-random-secret` |
| `JWT_ACCESS_TTL` | Access token lifetime | `15m` |
| `JWT_REFRESH_TTL` | Refresh token lifetime | `7d` |
| `BCRYPT_ROUNDS` | bcrypt salt rounds | `12` |

### Database (PostgreSQL)
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://chat:chat@localhost:5432/chat` |
| `DB_POOL_MAX` | Max pool connections | `20` |

### Redis (optional)
| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | (disabled) |

### Rate Limiting
| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `IP_RATE_LIMIT_MAX` | Max requests per IP per window | `20` |
| `REG_RATE_LIMIT_MAX` | Max registrations per window | `5` |

### WebSocket
| Variable | Description | Default |
|----------|-------------|---------|
| `WS_HEARTBEAT_INTERVAL` | Ping interval (ms) | `30000` |
| `WS_MAX_CONNECTIONS_PER_IP` | Max WS connections per IP | `10` |

### Uploads
| Variable | Description | Default |
|----------|-------------|---------|
| `UPLOAD_DIR` | File upload directory | `data/uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `10485760` |

### Admin
| Variable | Description | Default |
|----------|-------------|---------|
| `OWNER_USER_ID` | UUID of the owner user (super-admin) | (not set) |
| `ADMIN_USER_IDS` | Comma-separated UUIDs of admin users | (not set) |

### Logging
| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Log level (trace/debug/info/warn/error/fatal) | `info` |

## Web Client (`client/web/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:3000` |
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:3000` |

## Mobile Client (`client/mobile/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3000` |
| `EXPO_PUBLIC_WS_URL` | WebSocket server URL | `ws://localhost:3000` |
