# DATABASE.md

> 项目：一站式大学信息平台（005 - 大学学习通网站）
> 维护：Agent B（架构负责人）。数据结构变更需 Agent B 批准 + 经 `AGENT_COMMUNICATION.md` 同步。
> 权威 DDL 以 `src/db/schema.ts` 为准；本文档是**数据模型语义与扩展性**说明，不重复完整 DDL。
> 最后更新：2026-07-19

---

## 1. 设计原则

1. **共享核心 + 分类明细表**：一张 `info_items` 共享核心（所有分类通用的可信度/来源/时效/搜索字段）+ 每类一张明细表（1:1）。P2 加保研/科研等只加明细表，核心表不动。
2. **来源独立成表**：一条信息可有多来源（多源一致性是可信度模型关键），`info_sources` 1:N，不塞主表 JSON。
3. **学生经验分层**：`experiences` 单表，与官方信息物理隔离（R6 合规：经验标源、分层展示、不与官方混排）。
4. **可信度分存不存算**：`credibility_score` 存为列（搜索排序用），由服务层在写入时计算（`src/lib/credibility.ts`），不用 DB 触发器。
5. **MVP 用户最小化**：`users` + `favorites`，不绑死单一学校，`applicable_scope` 通用结构。

## 2. 表清单（P1 共 7 张）

| 表 | 作用 | 关系 | 状态 |
|---|---|---|---|
| `info_items` | 信息共享核心（分类通用字段 + 可信度 + 搜索） | — | ✅ |
| `info_sources` | 来源/出处（多源） | N:1 → info_items | ✅ |
| `competitions` | 竞赛明细字段 | 1:1 → info_items（共享主键） | ✅ |
| `competition_rounds` | 竞赛各轮次/日期 | N:1 → competitions | ✅ |
| `experiences` | 学生经验（与官方分层） | N:1 → info_items | ✅ |
| `users` | 用户（邮箱注册） | — | ✅ |
| `favorites` | 收藏 | N:1→users, N:1→info_items | ✅ |

**未实现（P2+ 预留）**：`baoyan_policies`/`research_opportunities`/`exams`/`scholarships`/`opportunities`（明细表）、`user_reports`/`upvotes`（用户反馈因子）、`tags` 独立标签表（MVP 用 text[]）。

## 3. 关键字段语义

### info_items（共享核心）
- `category` enum(competition/research/exam/scholarship/baoyan/opportunity)：6 类，MVP 只填 competition。
- `applicable_scope_type` enum(national/province/school) + `applicable_scope_value`：通用适用范围。national 时 value 为 null；P2 本校化填充 school + 校名。
- `status` enum(draft/pending/published/archived/removed)：**`pending` 即人工审核入口**（MVP 不建审核界面，录入走 draft→pending→published）。护栏 3。
- `credibility_score` numeric(3,2)：0.00–1.00，服务层算后写入。
- `search_vector` tsvector：应用层写入时 `to_tsvector('simple', title||aliases||summary)`。**注意**：曾尝试 GENERATED 列，但 `coalesce/array_to_string` 非 immutable，PG 拒绝；改应用层写入。切 pg_jieba 时该列定义变化见 §4。
- `expire_at`：MVP seed 中 = sign_up_end（报名截止）。**语义**：年度赛事按 `valid_year` 分届，下届**新建条目**而非复用旧条目改年份（否则旧届过期会污染可信度）。

### info_sources
- `source_type` enum：official_doc / inst_notice / authority_list / official_site / student_exp / community。
- `authority_weight` numeric(2,1)：由 `source_type` 派生（映射在 `src/lib/source-weights.ts`）：official_doc=1.0 / inst_notice=0.8 / official_site=0.8 / authority_list=0.7 / student_exp=0.4 / community=0.2。
- `HIGH_WEIGHT_THRESHOLD = 0.7`：≥此值算"独立高权重"，参与 consistency 计算。

### competitions（明细）
- 索引：level、recognition、suitable_grades(GIN)、suitable_majors(GIN)、sign_up_end、valid_year。

## 4. 可信度计算（服务层，`src/lib/credibility.ts`）

```
authority   = max(sources.authority_weight)
freshness   = 1.0(≤6月) / 0.7(6-12月) / 0.4(>12月) / 0.1(超期未续 或 null)
consistency = 0.6 + 0.4 * min(independent_high_weight_count - 1, 2) / 2   // 1→0.6, 2→0.8, 3+→1.0
credibility_score = round(authority*0.5 + freshness*0.3 + consistency*0.2, 2)
```

- 权重以 `CREDIBILITY_WEIGHTS` 数组式常量表达，预留 `// EXTENSION POINT: feedback (P2)` 可加项，**MVP 不接入，不加表**（护栏 3）。
- `credibility_score` 是**评分体系**非真值裁决。UI 措辞「信息可信度评分」。

## 5. 搜索索引

- `info_items.search_vector`：GIN。
- `info_items`：btree(category,status) / btree(applicable_scope_type) / btree(expire_at)。
- `info_sources`：btree(info_item_id)。
- `competitions`：btree(level) / btree(recognition) / GIN(suitable_grades) / GIN(suitable_majors) / btree(sign_up_end) / btree(valid_year)。
- `competition_rounds`：btree(competition_id, sort_order)。
- `experiences`：btree(info_item_id)。
- `favorites`：unique btree(user_id, info_item_id)。

## 6. 扩展扩展名 / 扩展演进

- `pgcrypto`（gen_random_uuid）、`pg_trgm`（兜底子串匹配）：已启用。
- `pg_jieba` / `zhparser`：**未启用**（官方 postgres:16-alpine 与本机 brew PG 均不含）。当前 `search_vector` 用 `'simple'` ts_config，搜索模块用 ILIKE 兜底中文召回。
- **切 pg_jieba = 一次重建 generated column 的 migration**：因 search_vector 已是应用层写入的普通列，切 pg_jieba 需改写入逻辑（`to_tsvector('pg_jieba_config', ...)`）+ 重建 GIN + 全表重 tokenize。架构上仍平滑（只动 search 模块 + 一个 migration + seed 重跑），非零成本。
- **pgvector**：MVP 未启用，P3 RAG 启用。

## 7. 种子数据

`src/db/seed.ts` 录入 3 个真实全国通用竞赛：全国大学生数学建模竞赛（CUMCM）、ACM-ICPC、挑战杯。每条填满全字段 + ≥2 来源 + 轮次 + 1 学生经验 + 用 `computeCredibilityScore()` 计算 credibility。种子直接置 `published`（验收用）。

实测可信度：数模 0.96 / ICPC 0.86 / 挑战杯 0.69。
