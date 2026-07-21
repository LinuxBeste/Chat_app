FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@11
WORKDIR /app
COPY server/package.json pnpm-workspace.yaml ./
RUN pnpm install --no-frozen-lockfile --ignore-scripts && pnpm rebuild bcrypt
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN pnpm run build

FROM node:22-alpine AS runner
RUN addgroup -S chat && adduser -S chat -G chat
WORKDIR /app
COPY server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN mkdir -p /app/data/uploads /app/logs && chown -R chat:chat /app/data /app/logs
USER chat
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "dist/index.js"]
