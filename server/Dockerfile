FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@11
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY server/package.json server/
RUN pnpm install --no-frozen-lockfile 2>&1 | tail -3 && \
    pnpm approve-builds --all 2>&1 | tail -3 && \
    pnpm install --no-frozen-lockfile 2>&1 | tail -3

COPY server/tsconfig.json server/
COPY server/src/ server/src/
RUN pnpm --filter server run build

# Assemble deploy: preserve structure so pnpm symlinks resolve correctly
RUN mkdir -p /app/deploy/server && \
    cp server/package.json /app/deploy/server/ && \
    cp -r server/dist /app/deploy/server/dist && \
    cp -r node_modules /app/deploy/ && \
    cp -r server/node_modules/. /app/deploy/server/node_modules/

FROM node:22-alpine AS runner
RUN addgroup -S chat && adduser -S chat -G chat
WORKDIR /app
COPY --from=builder /app/deploy ./
RUN mkdir -p /app/server/data/uploads /app/server/logs && chown -R chat:chat /app/server/data /app/server/logs
USER chat
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "server/dist/index.js"]
