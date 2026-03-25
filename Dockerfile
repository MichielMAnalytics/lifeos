# ── Stage 1: Build ────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json bun.lock pnpm-workspace.yaml turbo.json ./
COPY web/package.json web/
COPY packages/shared/package.json packages/shared/
COPY packages/cli/package.json packages/cli/
COPY convex/tsconfig.json convex/
COPY infra/package.json infra/
COPY ai-gateway/package.json ai-gateway/

RUN bun install --frozen-lockfile

# Copy source (only what the web app build needs)
COPY packages/shared/ packages/shared/
COPY web/ web/
COPY convex/ convex/

# Build args for public env vars baked into the client bundle
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_LIFEOS_DOMAIN
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_LIFEOS_DOMAIN=$NEXT_PUBLIC_LIFEOS_DOMAIN

# Build Next.js — next is hoisted to root node_modules by bun
WORKDIR /app/web
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN next build

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
