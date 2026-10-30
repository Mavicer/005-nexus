import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
if (
  !process.env.DATABASE_URL ||
  Buffer.byteLength(process.env.AUTH_SECRET ?? "") < 32
) {
  console.error(
    "Production requires DATABASE_URL and AUTH_SECRET >= 32 bytes.",
  );
  process.exit(1);
}
if (
  process.env.AUTH_PROVIDER === "blog" &&
  (!process.env.APP_ORIGIN ||
    !process.env.BLOG_ORIGIN ||
    Buffer.byteLength(process.env.BLOG_SSO_SECRET ?? "") < 32)
) {
  console.error(
    "Blog login requires APP_ORIGIN, BLOG_ORIGIN and BLOG_SSO_SECRET >= 32 bytes.",
  );
  process.exit(1);
}
const args = existsSync("server.js")
  ? ["server.js"]
  : ["node_modules/next/dist/bin/next", "start", ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
