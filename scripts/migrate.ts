import { readdir } from "node:fs/promises";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("必须显式设置 DATABASE_URL，迁移不会使用默认地址");
const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(68413026)");
  const existing = (
    await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public'",
    )
  ).rows.map((r) => r.tablename);
  const hasLedger = existing.includes("nexus_migration_history");
  const adopting = existing.includes("users") && !hasLedger;
  if (existing.length && !hasLedger && !adopting)
    throw new Error("发现未知旧表，拒绝自动初始化，请先核对库存");
  if (adopting) {
    if (
      !process.argv.includes("--adopt-legacy") ||
      !process.argv.includes("--backup-confirmed")
    )
      throw new Error(
        "旧库需先备份并检查，再显式传入 --adopt-legacy --backup-confirmed；不会改写旧表",
      );
    const columns = (
      await client.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>(
        "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users'",
      )
    ).rows;
    const expected: Record<string, string> = {
      id: "uuid",
      email: "text",
      password_hash: "text",
      name: "text",
      is_admin: "boolean",
      created_at: "timestamp with time zone",
      updated_at: "timestamp with time zone",
    };
    for (const [name, type] of Object.entries(expected))
      if (
        !columns.some(
          (c) =>
            c.column_name === name &&
            c.data_type === type &&
            (name === "name" || c.is_nullable === "NO"),
        )
      )
        throw new Error(`旧 users.${name} 与已审计结构不符，停止迁移`);
    const keys = (
      await client.query<{ type: string; names: string[] }>(
        `SELECT c.contype AS type,array_agg(a.attname::text ORDER BY k.ordinality) AS names FROM pg_constraint c JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ordinality) ON true JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum WHERE c.conrelid='public.users'::regclass GROUP BY c.oid,c.contype`,
      )
    ).rows;
    if (
      !keys.some((k) => k.type === "p" && k.names.join() === "id") ||
      !keys.some((k) => k.type === "u" && k.names.join() === "email")
    )
      throw new Error("旧 users 缺少已审计的主键或邮箱唯一约束");
    if (existing.some((t) => t.startsWith("nexus_")))
      throw new Error("存在未登记的新版本表，请人工核对，不自动覆盖");
  }
  await client.query(
    "CREATE TABLE IF NOT EXISTS nexus_migration_history (hash text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = new Set(
    (
      await client.query<{ hash: string }>(
        "SELECT hash FROM nexus_migration_history",
      )
    ).rows.map((r) => r.hash),
  );
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle" });
  if (
    (await readdir("drizzle")).filter((f) => f.endsWith(".sql")).length !==
    migrations.length
  )
    throw new Error("发现未登记的迁移 SQL，停止以避免遗漏");
  for (const hash of applied)
    if (!migrations.some((m) => m.hash === hash))
      throw new Error("已执行迁移被改写或丢失，请恢复历史文件");
  let count = 0;
  for (const migration of migrations) {
    if (applied.has(migration.hash)) continue;
    for (const statement of migration.sql) {
      if (adopting && /^\s*CREATE TABLE "users"/.test(statement)) continue;
      await client.query(statement);
    }
    await client.query("INSERT INTO nexus_migration_history(hash) VALUES($1)", [
      migration.hash,
    ]);
    count++;
  }
  await client.query("COMMIT");
  console.log(`迁移完成：${count} 个批次；旧数据未删除。`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
