import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import { includeIgnoreFile } from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// 读取 .gitignore 用作 ESLint 忽略基线（绝对路径）
const gitignorePath = resolve(__dirname, ".gitignore");

/**
 * ESLint flat config
 * 基于 eslint-config-next（Next.js 15.5 推荐 flat config 形态）
 */
const eslintConfig = [
  includeIgnoreFile(gitignorePath),
  {
    ignores: [
      "next-env.d.ts",
      "drizzle/**",
      "*.config.mjs",
      "*.config.ts",
      ".prettierrc.mjs",
      "vitest.config.ts",
      "项目蓝图（reference）/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 禁止 console（生产代码），开发期可用 lint disable 临时放行
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // 未使用变量必须以 _ 前缀
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // 推荐用类型导入
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  {
    // 脚本文件（seed 等 CLI）允许 console
    files: ["src/db/seed.ts", "src/db/ensure-admin.ts", "src/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;
