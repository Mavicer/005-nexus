import type { db as localDb } from "./client";
export const db = new Proxy({} as typeof localDb, {
  get() {
    throw new Error("Cloudflare 环境必须使用 D1 数据接口");
  },
});
