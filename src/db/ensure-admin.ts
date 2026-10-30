/**
 * 管理员账号创建/确保存在（必改2，Agent B 第 10 条）
 *
 * 用法：
 *   - 首次 db:seed 时自动调用 ensureAdmin()
 *   - 或单独：npm run admin:create（tsx src/db/ensure-admin.ts）
 *
 * 从环境变量读 ADMIN_EMAIL / ADMIN_INIT_PASSWORD：
 *   - 仅首次 seed / 创建时用，建立 admin 账号
 *   - 若该 email 已存在：更新其 is_admin=true（幂等），不改密码
 *   - 若不存在：创建，is_admin=true，argon2id 哈希密码
 *
 * 部署后应改密码（登录后走改密，P2；MVP 直接 DB 重置也可）。
 */
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { hashPassword, isEmailValid, isPasswordValid } from "@/lib/password";

export async function ensureAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_INIT_PASSWORD ?? "";

  if (!email || !isEmailValid(email)) {
    console.warn(
      "[ensure-admin] 未设置有效的 ADMIN_EMAIL，跳过管理员创建。",
      "请在 .env 设置 ADMIN_EMAIL / ADMIN_INIT_PASSWORD 后重新运行。",
    );
    return;
  }

  // 查是否已存在
  const [existing] = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    if (!existing.isAdmin) {
      await db
        .update(users)
        .set({ isAdmin: true })
        .where(eq(users.id, existing.id));
      console.log(`[ensure-admin] 已将现有用户 ${email} 提升为管理员`);
    } else {
      console.log(`[ensure-admin] 管理员 ${email} 已存在，跳过`);
    }
    return;
  }

  // 新建
  if (!isPasswordValid(password)) {
    console.warn(
      `[ensure-admin] ADMIN_INIT_PASSWORD 未设置或不足 8 位，无法创建管理员 ${email}。`,
      "请设置后重新运行。",
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(users).values({ email, passwordHash, isAdmin: true });
  console.log(`[ensure-admin] ✓ 已创建管理员 ${email}（请尽快修改初始密码）`);
}
