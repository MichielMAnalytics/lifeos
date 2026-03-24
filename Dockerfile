# ── Stage 1: Build ────────────────────────────────────
FROM node:22-bookworm-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json bun.lock pnpm-workspace.yaml turbo.json ./
COPY packages/dashboard/package.json packages/dashboard/
COPY packages/shared/package.json packages/shared/
COPY packages/cli/package.json packages/cli/
COPY convex/tsconfig.json convex/
COPY infra/package.json infra/
COPY ai-gateway/package.json ai-gateway/

RUN bun install --frozen-lockfile

# Copy source (only what the dashboard build needs)
COPY packages/shared/ packages/shared/
COPY packages/dashboard/ packages/dashboard/
COPY convex/ convex/

# Build args for public env vars baked into the client bundle
ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_LIFEOS_DOMAIN
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_LIFEOS_DOMAIN=$NEXT_PUBLIC_LIFEOS_DOMAIN

# Build Next.js — next is hoisted to root node_modules by bun
# Skip type checking in Docker (handled in CI separately)
WORKDIR /app/packages/dashboard
ENV PATH="/app/node_modules/.bin:${PATH}"
RUN next build

# ── Stage 2: Runtime ──────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy standalone output
COPY --from=builder /app/packages/dashboard/.next/standalone ./
COPY --from=builder /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=builder /app/packages/dashboard/public ./packages/dashboard/public

EXPOSE 3000

CMD ["node", "packages/dashboard/server.js"]
