/**
 * Prettier 配置
 * 与 ESLint 配合，保证代码风格一致
 */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 80,
  tabWidth: 2,
  // Tailwind class 自动排序
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["cn", "clsx", "cva"],
};
