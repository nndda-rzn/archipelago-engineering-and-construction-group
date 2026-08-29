# Stage 1: Build — install semua deps, generate prisma, build
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Konfigurasi workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/ apps/
COPY packages/ packages/

# Install semua deps (incl. devDeps utk build) + prisma generate + build
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @aec/api exec prisma generate \
  && pnpm build

# Stage 2: Production runtime
# Copy seluruh workspace dari builder agar prisma client, prisma CLI, tsx & deps prod lengkap.
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app ./

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 3000

# Prisma migrate deploy + start (tsx handle @/* path alias)
CMD ["sh", "-c", "npx prisma migrate deploy && tsx dist/main.js"]