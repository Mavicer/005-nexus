import { defineConfig } from "drizzle-kit";

/**
 * Drizzle 配置
 * - schema 源：src/db/schema.ts
 * - 迁移输出：drizzle/（0001_enable_extensions 由 SQL 文件直接管理，见 drizzle/）
 * - 数据库连接：DATABASE_URL 环境变量
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/daxuexi",
  },
  verbose: true,
  strict: true,
});
