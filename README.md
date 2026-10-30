# Nexus

面向计算机专业学生的赛事目录。收录黑客松、开发挑战、AI / 数据、CTF 与算法竞赛。

## 本地运行

需要 Node.js 24+ 和 PostgreSQL 16。复制 `.env.example` 为 `.env.local`，配置数据库地址和随机 `AUTH_SECRET`。

```sh
npm ci
node --env-file=.env.local --import tsx scripts/migrate.ts
node --env-file=.env.local --import tsx scripts/admin.ts
npm run dev -- --hostname 127.0.0.1 --port 3040
```

管理员初始化需要 `ADMIN_EMAIL` 与 `ADMIN_INIT_PASSWORD`。本地使用 `AUTH_PROVIDER=local`；正式站使用博客账号，关闭本地登录和注册。迁移脚本必须显式提供数据库地址，新增表，不删除旧表。

## 推荐

默认排序：正在报名优先；同一报名状态下，规则允许中国大陆学生直接参加的线上活动优先，其次国内活动，再次其他线上活动，降低国外线下活动的权重。地区、参与门槛、地区资格和报名费均为有官方依据的结构化字段；未知值保留未知，不根据中文名称或域名猜测。

免费、黑客松与开发挑战、适当准备时间及近期核验会加分；申请录取、预选、收费及资格不明会减分。报名已截止的活动排在后面；默认推荐不包含明确不允许中国大陆学生参加或待复核的活动。用户仍可选择按截止日期或更新时间排序。排序在数据库分页前完成。

规则位于 `src/modules/events/recommendation.ts`，不是个性化画像或机器学习模型。

## 统一登录（暂停接入博客）

正式地址约定 `https://nexus.mavicer.cc`，博客为 `https://mavicer.cc`。

- 博客导航进入 Nexus，已有博客会话时自动登录；未登录时可以继续公开浏览。
- Nexus 登录跳回博客，由博客处理登录、注册与密码管理。
- 短时授权码、S256 PKCE、浏览器绑定 state；授权码单次使用。令牌通过服务端交换，保存在 Nexus 的 HttpOnly Cookie 中，不放进 localStorage。
- 每次服务端读取身份时向博客校验，复用博客会话生命周期。两站退出及密码重置会使对应会话失效；回到页面时刷新状态。
- 本地账号和博客身份通过 issuer + subject 显式映射，不按邮箱自动合并。收藏保存在 Nexus。博主在 Nexus 获得管理权限；本地身份不自动继承博客身份。

按当前要求，功能完善前不将 Nexus 加入博客；本地博客导航入口已撤下，线上博客没有修改。以下为暂存方案，不表示已经启用。

博客配套实现位于同级 `../blog-integration`。上线前两端需要配置同一个随机服务端密钥（至少 32 字节），禁止使用前端 `VITE_*` / `NEXT_PUBLIC_*` 变量：

| Nexus           | 值                       |
| --------------- | ------------------------ |
| AUTH_PROVIDER   | blog                     |
| APP_ORIGIN      | https://nexus.mavicer.cc |
| BLOG_ORIGIN     | https://mavicer.cc       |
| BLOG_SSO_SECRET | 服务端共享密钥           |
| AUTH_SECRET     | Nexus 独立随机密钥       |

| 博客 Cloudflare 环境变量 | 值                       |
| ------------------------ | ------------------------ |
| NEXUS_ORIGIN             | https://nexus.mavicer.cc |
| NEXUS_SSO_SECRET         | 与 BLOG_SSO_SECRET 相同  |

博客端通过现有 D1 binding 新增 SSO 表，不共享原始 Cookie 或复制密码库。域名 DNS、HTTPS、正式部署和生产账号联调尚未执行。当前本地预览保留本地管理员，避免依赖尚未上线的博客接口。

## 数据与旧库

`data/curated/` 当前包含 25 条 AI 辅助整理的预览数据，含 5 条数学建模赛事；`data/pending/` 为未进入推荐的待核实线索。尚未完成人工复核。默认导入草稿；`--reviewed --publish` 才发布。未知时间不推断；报名与提交分开记录。

旧库先备份、运行 `db:inventory` 和 `legacy:plan`，逐项审核映射，再以 `--adopt-legacy --backup-confirmed` 接入迁移。`legacy:apply 映射.json --backup-confirmed` 只映射已审核活动并复制对应收藏，未映射历史仍保留在旧表。正式旧库迁移尚未执行。

## 定向验证

- `npm run typecheck`：类型检查。
- `npx vitest run src/modules/events/__tests__/blog-sso.test.ts`：Nexus 登录回调边界。
- `DATABASE_URL=..._integration npm run test:recommendation`：隔离数据库内检查排序与分页。
- 博客 `frontend` 内运行 `node --test tests/nexus-sso.test.mjs`：真实 SQLite 测试授权与会话撤销。

只运行与改动相关的检查；生产构建和全量回归留在发布阶段，不因文案修改反复执行。
