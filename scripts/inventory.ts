import { Pool } from "pg";
if (!process.env.DATABASE_URL) throw new Error("必须显式指定 DATABASE_URL");
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const c = await p.connect();
try {
  await c.query("BEGIN READ ONLY");
  const tables = (
    await c.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    )
  ).rows;
  const output: unknown[] = [];
  for (const { tablename } of tables) {
    const quoted = '"' + tablename.replaceAll('"', '""') + '"';
    const count = (
      await c.query(`SELECT count(*)::int AS count FROM public.${quoted}`)
    ).rows[0].count;
    const columns = (
      await c.query(
        "SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
        [tablename],
      )
    ).rows;
    output.push({ table: tablename, count, columns });
  }
  console.log(JSON.stringify(output, null, 2));
  await c.query("ROLLBACK");
} finally {
  c.release();
  await p.end();
}
