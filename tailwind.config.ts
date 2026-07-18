import type { Config } from "tailwindcss";

/**
 * Tailwind CSS 配置
 * R4 国内适配：不引入 Google Fonts；字体走系统栈（见 globals.css）
 */
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,md}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // 系统字体栈：macOS PingFang / Windows 微软雅黑 / 跨平台回退
        // 不依赖任何外部字体 CDN，保证国内免 VPN 速度
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Microsoft YaHei",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
