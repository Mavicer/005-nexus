# ARCHITECTURE.md

> 项目：一站式大学信息平台（005 - 大学学习通网站）
> 维护：Agent B（架构负责人）。架构变更需 Agent B 批准 + 经 `AGENT_COMMUNICATION.md` 同步 Agent A。
> 最后更新：2026-07-19

本文档是项目架构的**权威记录**。沟通与决策过程见 `AGENT_COMMUNICATION.md`，数据模型见 `DATABASE.md`，精确 DDL 见 `src/db/schema.ts`。

---

## 1. 核心定位

面向国内大学生的**信息检索基础设施**，降低大学成长信息差。MVP 聚焦**竞赛信息打透**（schema 预留 6 类）。不是 AI 聊天助手、不是功能堆叠、不追求视觉。

**设计优先级判据**（一切取舍的最高判据）：
访问稳定性 > 信息可信度 > 搜索效率 > 页面性能 > 信息可读性 > 视觉表现

任何开发决策须回答：「这个功能是否让大学生更快、更准确地找到有价值的信息？」不能明确提升核心价值的，降优先级。

## 2. 技术栈

| 层 | 选型 | 关键理由 |
|---|---|---|
| 前端+后端 | **Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind** | 前后端同仓库同语言，Route Handlers 作 API；SSR 利于 SEO 与国内弱网首屏；单部署单元契合稳定性 #1 |
| 数据库 | **PostgreSQL 16 + Drizzle ORM** | 关系型 + tsvector 全文 + 数组 GIN + 未来 pgvector；Drizzle 轻量类型安全（沿用兄弟项目验证），非 Prisma |
| 搜索 | **Phase1: PG 全文（search_vector + ILIKE 兜底）** | 见 §4 演进路径 |
| 认证 | **JWT（jose）+ httpOnly cookie + argon2id** | 无状态、MVP 无 Redis；不引 Passport/next-auth/bcrypt |
| 部署 | **国内云（默认阿里云）+ 备案域名 + 国内 CDN + HTTPS + Docker Compose** | 免 VPN 稳定访问（#1 优先级）；Next.js 自托管 `next start` + nginx + PM2 |
| AI 预留 | **P3 抽离独立 Python 微服务做 RAG，经 HTTP 被主服务调用** | 不污染 Node 主栈；DB 留 pgvector 扩展位 |

**不采用**：Cloudflare 全家桶（D1/R2/Pages）——Cloudflare 无大陆节点，违背稳定性 #1（与兄弟项目 004 的取舍不同，本项目以备案域名+国内云为前提）。

## 3. 关键架构决策记录

| 决策 | 选择 | 拒绝项 | 理由摘要 |
|---|---|---|---|
| 后端语言 | Node + TS | FastAPI | owner 拍板；全栈 TS 类型贯穿；少运行时单元=RAG 留 P3 Python 微服务旁路 |
| 前后端形态 | Next.js 全栈同仓库 | 前后端分离+独立后端 | SSR/SEO/弱网；CORS+双部署+类型同步是过度设计 |
| ORM | Drizzle | Prisma | 轻量、类型安全、已验证 |
| 搜索起步 | PG tsvector + ILIKE | 直接上 Meilisearch/ES | 不引高维护成本组件；平滑升级 |
| 中文分词 | pg_jieba（部署含则切，否则 simple+ILIKE） | zhparser | 分词更贴合搜索、词典可扩展 |
| 部署 | 国内云+备案 | Cloudflare/Vercel 海外 | 国内访问稳定性 #1 |
| 数据获取 | 策展式人工整理 | 爬虫/UGC | 合规边界（owner 拍板）；不建采集管道 |
| 可信度 | 启发式评分体系 | 真值裁决 | UI 措辞「信息可信度评分」；预留人工审核与用户反馈扩展位 |

## 4. 搜索演进路径（护栏 2）

```
Phase1 当前：search_vector(tsvector,'simple') @@ plainto_tsquery  +  ILIKE 兜底中文召回
     ↓ 部署环境含 pg_jieba：切 ts_config = 一次重建 generated column 的 migration（DROP+RECREATE+重建 GIN+全表重 tokenize）
Phase2（遇相关度/分面瓶颈）：Meilisearch（轻、中文友好、国内可自托管）
     ↓ 大规模
Phase3：Elasticsearch
```

**强制约束**：搜索逻辑只许在 `src/lib/search/`（`searchItems()`）。API（`src/app/api/search/route.ts`）与页面（`src/app/page.tsx`、详情页）**只调 `searchItems()`，不写 SQL**。换 Meilisearch 只改该模块。

## 5. 目录结构

```
src/
├── app/                 layout.tsx / page.tsx(首页SSR) / globals.css
│   ├── api/search/      搜索 Route Handler（薄包装 searchItems）
│   └── competitions/[id]/  详情页 SSR
├── components/          search-box / search-filters / search-card / competition-card / pagination
├── db/                  client.ts / schema.ts(权威DDL) / schema-enums.ts / seed.ts
└── lib/                 site.ts / source-weights.ts / credibility.ts(+test) / search/index.ts / competition.ts
drizzle/                 0000_enable_extensions.sql / 0000_confused_multiple_man.sql / meta/
docker/                  postgres-init/01-extensions.sql / nginx.conf.example
+ Dockerfile / docker-compose.yml / drizzle.config.ts / 配置文件
```

## 6. 护栏（owner 2026-07-18，不可违背）

1. **MVP 不扩大范围**——只做竞赛完整链路，不碰其余 5 类。
2. **搜索可演进**——封装单一模块，平滑升级。
3. **可信度是评分体系非真值裁决**——UI 措辞「信息可信度评分」，禁用「真实性/准确度」；预留人工审核（`status=pending`）与用户反馈因子（公式可加项，`// EXTENSION POINT`）扩展位，MVP 不实现。
4. **schema 确认即推进**——不停留设计阶段。

## 7. 扩展点（MVP 不实现，仅预留，避免日后误判为可删）

- `pgvector` → P3 RAG 向量检索
- `info_status` 的 `pending` → P2 人工审核后台界面
- 可信度公式 `feedback` 因子 → P2 用户反馈信号
- 其余 5 类明细表（research/exam/scholarship/baoyan/opportunity）→ P2
- OAuth / RBAC / 课表 / 个人成长 / 评测历史 → P2/P4
- Meilisearch / ES → 搜索瓶颈时

## 8. 开发路线

- **P1 MVP（当前）**：竞赛数据库 + 搜索 + 详情页 + 可信度模型 + 基础用户（注册/收藏）+ 录入界面与管理员守卫。
- **P2 数据完善**：扩展其余 5 类；官方采集 + 人工审核流程；本校化；过期检测自动化；数据后台。
- **P3 AI 增强**：RAG 搜索（基于真实数据回答而非凭空生成）+ 智能推荐 + 信息抽取辅助；独立 Python RAG 微服务。
- **P4 个人成长系统**：个人档案 + 课表/任务 + 成长 Dashboard + AI 成长路线规划。
