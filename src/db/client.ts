/**
 * 数据库连接（PostgreSQL，node-postgres + Drizzle）
 * 单例 pool，避免 serverless 冷启动创建多个连接
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  dbPool: Pool | undefined;
};

export const pool =
  globalForDb.dbPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/daxuexi",
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = pool;
}

export const db = drizzle(pool, { schema });
