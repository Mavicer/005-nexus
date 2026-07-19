import { eq } from "drizzle-orm";
import { db, pool } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";

async function main() {
  const hash = await hashPassword("change-me-now");
  const res = await db
    .update(users)
    .set({ passwordHash: hash })
    .where(eq(users.email, "admin@example.com"))
    .returning({ id: users.id });
  console.log(res.length ? "[reset] OK admin password reset to change-me-now" : "[reset] NOT FOUND");
  await pool.end();
}
main().catch((e) => {
  console.error("ERR", e);
  pool.end();
  process.exit(1);
});
