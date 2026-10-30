import { parse } from "comment-json";
import { execFileSync } from "node:child_process";
import { readFileSync, renameSync, existsSync, writeFileSync } from "node:fs";
writeFileSync(
  "public/_publication.json",
  JSON.stringify({
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  }),
);
const local = existsSync(".env.local");
const vars = parse(readFileSync("wrangler.jsonc", "utf8")).vars;
if (local) renameSync(".env.local", ".env.local.preview-backup");
try {
  execFileSync("npx", ["opennextjs-cloudflare", "build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ...vars,
      NEXUS_CLOUDFLARE_BUILD: "1",
      BLOG_APPEARANCE_ORIGIN: vars.BLOG_ORIGIN,
    },
  });
} finally {
  if (local) renameSync(".env.local.preview-backup", ".env.local");
}
