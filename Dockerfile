# ── Stage 1: Build ────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy web app package manifest + lockfile
COPY web/package.json web/bun.lock web/

# Copy convex types (needed for build)
COPY convex/ convex/

# Install web deps independently
WORKDIR /app/web
RUN bun install --frozen-lockfile

# Copy web source
COPY web/ .

# Build args for public env vars baked into the client bundle
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_LIFEOS_DOMAIN
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_LIFEOS_DOMAIN=$NEXT_PUBLIC_LIFEOS_DOMAIN

RUN npx next build

# ── Stage 2: Runtime ──────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
COPY --from=builder /app/web/public ./web/public

EXPOSE 3000

CMD ["node", "web/server.js"]
