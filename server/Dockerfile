FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@11
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY server/package.json server/
# Approve native module builds for pnpm 11
RUN pnpm approve-builds --all 2>/dev/null; \
    pnpm install --no-frozen-lockfile 2>/dev/null || \
    (echo "Retrying with ignore-scripts" && \
     pnpm install --no-frozen-lockfile --ignore-scripts && \
     pnpm rebuild)

COPY server/tsconfig.json server/
COPY server/src/ server/src/
RUN pnpm --filter server run build

FROM node:22-alpine AS runner
RUN addgroup -S chat && adduser -S chat -G chat
WORKDIR /app
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./dist
RUN mkdir -p /app/data/uploads /app/logs && chown -R chat:chat /app/data /app/logs
USER chat
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "dist/index.js"]
