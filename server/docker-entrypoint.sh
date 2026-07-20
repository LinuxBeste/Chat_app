#!/bin/sh
set -e

chown -R chat:chat /app/data /app/logs 2>/dev/null || true

exec su-exec chat node dist/index.js
