FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm run build

FROM node:22-alpine AS runner
RUN addgroup -S chat && adduser -S chat -G chat
RUN apk add --no-cache su-exec curl
WORKDIR /app
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN mkdir -p /app/data/uploads /app/logs && chown chat:chat /app/data /app/logs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
ENTRYPOINT ["/docker-entrypoint.sh"]
