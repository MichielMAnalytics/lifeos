FROM node:22-bookworm-slim AS builder
RUN npm install -g bun
WORKDIR /app
COPY package.json tsconfig.json ./
RUN bun install
COPY src ./src
RUN bun run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
