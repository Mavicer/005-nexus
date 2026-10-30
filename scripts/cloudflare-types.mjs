import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
execFileSync(
  "npx",
  [
    "wrangler",
    "types",
    "--env-interface",
    "CloudflareEnv",
    "--include-runtime=false",
    "--strict-vars=false",
    "worker-configuration.d.ts",
  ],
  { stdio: "inherit" },
);
const generated = readFileSync("worker-configuration.d.ts", "utf8").replaceAll(
  "declare namespace",
  "namespace",
);
writeFileSync(
  "worker-configuration.d.ts",
  `import type { D1Database, Fetcher } from "@cloudflare/workers-types";\ndeclare global {\n${generated}\n}\nexport {};\n`,
);
