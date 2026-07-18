# ============================================================
# 大学学习通网站 — Dockerfile（Next.js 自托管）
# 国内适配（R4）：使用多阶段构建减小镜像，基础镜像用国内仓库可达的官方标签
# ============================================================

FROM node:20-alpine AS deps
WORKDIR /app

# 国内 npm 源（npmmirror）
RUN npm config set registry https://registry.npmmirror.com/

# 仅复制依赖清单，利用层缓存
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- 构建阶段 ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com/
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 运行阶段 ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 非 root 运行（安全）
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
