# Chat App

Full-stack chat application with real-time messaging, calls, communities, events, and more.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────┐
│  Web (Vite/React) │────▶│  Server (Express) │────▶│PostgreSQL│
│  Mobile (Expo)    │     │  + WebSocket     │     │ + Redis  │
└─────────────────┘     └──────────────────┘     └──────────┘
```

- **Server**: Express + ws + Drizzle ORM + PostgreSQL (+ optional Redis)
- **Web**: Vite + React + Tailwind CSS v4
- **Mobile**: Expo (React Native)
- **Shared**: TypeScript types shared via workspace

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Express, ws, Drizzle ORM, PostgreSQL, Redis |
| Frontend (web) | Vite, React, Tailwind CSS v4, shadcn/ui |
| Frontend (mobile) | Expo, React Native |
| Auth | JWT (access + refresh tokens), TOTP 2FA |
| Real-time | WebSocket, Redis pub/sub |
| Validation | Zod |
| Logging | pino + pino-pretty |
| Testing | Vitest (203 server + 131 web tests) |
| DevOps | Docker, Docker Compose, GitHub Actions |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start in dev mode (server + web)
cd server && bash start.sh --dev

# Or start with Docker
cd server && bash start.sh

# With Redis
cd server && bash start.sh --redis
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm test` | Run all tests across workspaces |
| `pnpm format` | Format all files with Prettier |
| `pnpm lint` | Lint server and web source files |
| `pnpm build` | Build server (TypeScript) |
| `pnpm --filter web build` | Build web client |

### start.sh Options

| Flag | Description |
|------|-------------|
| `--native` / `-n` | Run natively (pnpm dev) instead of Docker |
| `--web` / `-w` | Start web client alongside (Vite) |
| `--mobile` / `-m` | Start Expo mobile client alongside |
| `--all` / `-a` | Start server + web + mobile |
| `--dev` / `-d` | Shortcut for `--native --web` |
| `--redis` | Enable Redis |
| `--migrate` | Run database migrations before starting |
| `--seed` | Run seed data |
| `--logs` / `-l` | Follow Docker logs |
| `--rebuild` / `-r` | Force full rebuild |
| `--port` | Server port (default: 3000) |

## Project Structure

```
├── server/                 # Express + WebSocket server
│   ├── src/
│   │   ├── db/            # Drizzle schema + migrations
│   │   ├── lib/           # DB, JWT, password, logger, redis
│   │   ├── middleware/    # Auth, validation, error handler
│   │   ├── routes/        # REST API routes
│   │   ├── ws/            # WebSocket handlers
│   │   ├── app.ts         # Express app setup
│   │   └── index.ts       # Entry point
│   ├── Dockerfile
│   └── docker-compose.yml
├── client/
│   ├── web/               # Vite + React web client
│   │   └── src/
│   │       ├── components/ # UI components by feature
│   │       ├── lib/        # API client, WS, contexts
│   │       └── ...
│   └── mobile/            # Expo mobile client
└── README.md
```

## Features

- **Messaging**: Real-time 1-on-1 and group messaging with typing indicators
- **Communities**: Nested channels, invite codes, member roles
- **Events**: Create, RSVP, recurring events
- **Calls**: WebRTC voice/video calls with screen sharing
- **Presence**: Online/away/busy status with custom status text
- **Notifications**: Real-time notification badge with digest mode
- **Security**: JWT auth, TOTP 2FA, session management, login history
- **Privacy**: Block users, read receipts, E2EE-ready
- **Moderation**: Reports, bans, mutes with auto-moderation rules
- **Customization**: Light/dark theme, custom themes (colors, bubble style, border radius, status emoji)
- **Files**: File uploads with gallery, trash, shared files
- **Search**: Full-text search with PostgreSQL
- **Developer**: Webhooks with event logs, rate limit analytics

## Docker

```bash
# Start only server
docker compose up --build -d

# Start with Redis
docker compose --profile redis up --build -d

# Rebuild from scratch
docker compose build --no-cache
```

## Testing

```bash
cd server && pnpm test   # 203 server tests
cd client/web && pnpm test  # 131 web tests
```

## Database

Migrations are managed with Drizzle Kit:

```bash
cd server
pnpm db:generate   # Generate migration from schema
pnpm db:migrate    # Apply migrations
pnpm db:studio     # Open Drizzle Studio
```

## License

MIT
