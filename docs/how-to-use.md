# How to Use the Chat App

## Desktop App (Electron)

### Prerequisites
- Server must be running (see Quick Start in README)

### Running the Desktop App

```bash
# From the project root
cd client/desktop

# Build the Electron main process
pnpm build

# Start the app
pnpm start
```

### Offline Mode

The app caches conversations and messages locally using IndexedDB:

1. **While online**: messages and conversations are automatically cached as you use the app.
2. **Offline**: cached conversations appear in the sidebar, and cached messages are shown when you open a conversation.
3. **Pending messages**: messages you send while offline are queued and delivered automatically when you reconnect.
4. **Indicators**: an offline indicator appears when the connection drops.

### Building a Distributable Package

```bash
cd client/desktop
pnpm package
```

Output appears in `client/desktop/release/`.

## Web Client

### Development

```bash
cd client/web
pnpm dev
```

Opens at `http://localhost:5173`.

### Production Build

```bash
cd client/web
pnpm build
pnpm preview
```

## Server

### Starting the Server

```bash
# Docker (recommended)
cd server
bash start.sh

# Native dev mode
bash start.sh --dev
```

### Default Admin Account

- **Username:** `admin`
- **Email:** `admin@localhost`
- **Password:** `admin`

You can log in with either the username or email.

### Environment Variables

Key variables in `server/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://chat:chat@localhost:5432/chat` |
| `JWT_SECRET` | JWT signing secret | `change-me-to-a-random-secret` |
| `OWNER_USER_ID` | UUID of the user with owner permissions | (not set) |
| `ADMIN_USER_IDS` | Comma-separated UUIDs of admin users | (not set) |

### Registering a New User

Use the web client's registration form or send a POST request:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"myuser","email":"my@email.com","password":"mypassword"}'
```

### Making a User an Admin

1. Get the user's UUID from the registration response or database.
2. Set `OWNER_USER_ID` and/or `ADMIN_USER_IDS` in `server/.env`.
3. Restart the server.
