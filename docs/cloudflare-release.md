# Cloudflare 发布

正式地址为 https://nexus.mavicer.cc，博客为 https://mavicer.cc。

Nexus 使用 OpenNext + Cloudflare Workers 和独立 D1 数据库 `nexus`。`wrangler.jsonc` 保存非敏感配置；`AUTH_SECRET`、`BLOG_SSO_SECRET` 使用 Wrangler Secret。博客 Pages 项目 `blog` 保存同一服务端密钥 `NEXUS_SSO_SECRET` 和固定的 `NEXUS_ORIGIN`。博客用户和原始会话仍保存在博客 D1 中，Nexus 仅建立身份映射与赛事收藏。

## 发布

1. `npm ci`、`npm run cf:typegen`。
2. `npx wrangler d1 migrations apply nexus --remote`。
3. `npm run build:cloudflare`。构建暂时隔离本地 `.env.local`；线上配置来自 Wrangler，本地原生 PostgreSQL/Argon2 入口在 Cloudflare 构建中被排除。
4. `npm run deploy`。
5. 检查 `/_publication.json`、`/api/health`、赛事搜索和详情，再发布博客入口。

首次发布迁入 25 场赛事、48 条版本记录；不迁入本地密码和开发账号收藏。`scripts/d1-integration.ts` 在隔离的 D1 运行时验证搜索推荐与原 PostgreSQL 的一致性、并发身份映射、草稿隔离、核验发布、版本冲突和收藏。

原 PostgreSQL 数据和开发工具保留用于迁移对照；生产不会连接本机 PostgreSQL。后续赛事维护使用博客账号进入 Nexus 管理页。不要对已初始化的 D1 重复执行首次数据 INSERT。

## 回退

先关闭博客 `VITE_NEXUS_LAUNCHED` 和 `VITE_NEXUS_ANNOUNCEMENT` 并重新发布；如需回退 Nexus，运行 `npx wrangler rollback <version-id>`。不要删除生产 D1，数据库结构变更通过追加迁移完成。
