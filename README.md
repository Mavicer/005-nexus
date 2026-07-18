# 大学学习通网站 (daxuexi-info-platform)

> 面向国内大学生的一站式信息平台 — 整合竞赛、科研、考试、奖学金、保研、发展机会等大学阶段重要信息，建立可靠、高效的信息检索系统，降低信息差。

## 项目阶段

当前处于 **MVP（P1）阶段**：聚焦「竞赛」一类信息打透，schema 预留 6 类（竞赛/科研/考试/奖学金/保研/发展机会）。

设计优先级（不可妥协）：**访问稳定性 > 信息可信度 > 搜索效率 > 页面性能 > 信息可读性 > 视觉表现**。

## 技术栈

| 层级 | 选型 |
|---|---|
| 前端 + API | Next.js 15（App Router + Route Handlers，TS strict） |
| 语言 | TypeScript（全栈） |
| 样式 | Tailwind CSS（系统字体，不依赖 Google Fonts） |
| 数据库 | PostgreSQL 16 |
| ORM | Drizzle ORM + node-postgres |
| 搜索 | PostgreSQL 中文全文检索（tsvector + GIN）；演进 Meilisearch → ES |
| 部署 | 国内云（默认阿里云）+ 备案域名 + CDN + HTTPS；单 VM + Docker Compose |

## 国内访问适配（R4）

为达成「无需 VPN 稳定访问」：

- npm 源 → npmmirror（见 `.npmrc`）
- 字体 → 系统字体栈（PingFang / 微软雅黑），禁用 Google Fonts
- 三方资源 → 国内源或自托管（iconfont.cn / 百度统计 / 高德地图）
- CDN → 阿里云 / 腾讯云国内节点
- 构建 → Docker 镜像可用阿里云加速器

## 目录结构

```
.
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── layout.tsx   # 根布局
│   │   ├── page.tsx     # 首页（占位）
│   │   └── globals.css  # 全局样式 + 系统字体
│   ├── db/
│   │   ├── client.ts    # pg pool + drizzle 单例
│   │   ├── schema.ts    # P1 竞赛 schema（7 表）
│   │   ├── schema-enums.ts # 枚举字面量类型
│   │   └── seed.ts      # 种子数据（3 个全国通用竞赛）
│   └── lib/
│       ├── site.ts          # 站点常量
│       ├── source-weights.ts # 来源权重映射
│       ├── credibility.ts   # 可信度计算（纯函数）
│       └── search/index.ts  # 搜索模块（唯一调用点，护栏2）
├── drizzle/
│   ├── 0000_enable_extensions.sql # PG 扩展（pgcrypto/pg_trgm，pg_jieba 尝试）
│   └── 0000_steady_menace.sql     # drizzle 生成的表结构
├── docker/
│   ├── postgres-init/
│   │   └── 01-extensions.sql  # 容器启动扩展
│   └── nginx.conf.example     # nginx 反代占位
├── 项目蓝图（reference）/       # 原始设计文档（.docx，参考用）
├── AGENT_COMMUNICATION.md       # Agent A / B 沟通记录
├── .env.example                 # 环境变量示例
├── docker-compose.yml           # app + postgres（+ 未来 meilisearch）
├── Dockerfile                   # Next.js 自托管多阶段构建
├── drizzle.config.ts
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── eslint.config.mjs
└── .prettierrc.mjs
```

## 本地开发

```bash
# 1. 安装依赖（已配置 npmmirror 国内源）
npm install

# 2. 复制环境变量
cp .env.example .env.local

# 3. 启动数据库
docker compose up -d postgres

# 4. 推送 schema 到数据库
npm run db:push

# 5. 录入种子数据
npm run db:seed

# 6. 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务（需先 build） |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run format` | Prettier 格式化 |
| `npm run db:generate` | 生成 Drizzle migration |
| `npm run db:push` | 推送 schema 到数据库（开发用） |
| `npm run db:migrate` | 执行 migration |
| `npm run db:seed` | 录入种子数据（3 个全国通用竞赛） |
| `npm run db:studio` | Drizzle Studio 可视化 |

## 协作模型

本项目采用双 Agent 协作：

- **Agent A（开发者）**：负责实际开发与工程实现，不擅自改变核心架构。
- **Agent B（架构师/审核）**：负责需求拆解、架构决策、代码验收。

沟通记录见 `AGENT_COMMUNICATION.md`。开发者发现架构问题须先记录、待 Agent B 评估，不自行修改核心设计。

## 状态

- ✅ 工程化基线（Git / Lint / Format / TS strict / Tailwind / Next.js 脚手架 / Docker Compose）
- ✅ P1 竞赛 schema（7 表，Drizzle）+ migration + 种子数据脚本
- ✅ 可信度计算纯函数 + 来源权重映射
- ✅ 搜索模块骨架（唯一调用点，护栏2）
- ⏳ P1 录入界面 + 搜索 API + 详情页（待 Agent B review 后推进）

## 已知卡点

- **pg_jieba 不可用**：本地/官方 `postgres:16-alpine` 镜像不含 pg_jieba/zhparser，首版用 `pg_trgm` + `'simple'` ts_config 兜底。部署到自建含 pg_jieba 镜像后切换为 pg_jieba 配置。已上报 Agent B（见 AGENT_COMMUNICATION.md Developer Update）。
