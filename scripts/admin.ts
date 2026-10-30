import { ensureAdmin } from "@/db/ensure-admin";
import { pool } from "@/db/client";
try {
  await ensureAdmin();
} finally {
  await pool.end();
}
