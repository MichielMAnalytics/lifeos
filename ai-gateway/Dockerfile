FROM oven/bun:1 AS builder
WORKDIR /app
COPY bun.lock package.json ./
COPY ai-gateway/package.json ./ai-gateway/
RUN cd ai-gateway && bun install --frozen-lockfile
COPY ai-gateway/tsconfig.json ./ai-gateway/
COPY ai-gateway/src ./ai-gateway/src
RUN cd ai-gateway && bun run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/ai-gateway/dist ./dist
COPY --from=builder /app/ai-gateway/node_modules ./node_modules
COPY --from=builder /app/ai-gateway/package.json ./
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
