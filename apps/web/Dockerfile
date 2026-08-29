# Stage 1: Build Vite SPA
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Konfigurasi workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/ apps/
COPY packages/ packages/

# Install semua deps + build workspace (ui dll)
RUN pnpm install --frozen-lockfile \
  && pnpm --filter @aec/web build

# Stage 2: Serve static via nginx
FROM nginx:alpine AS runner

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]