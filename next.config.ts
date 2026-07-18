import type { NextConfig } from "next";

/**
 * Next.js 配置
 * 国内访问性能（R4）：
 * - 图片优化默认关闭跨域外部 loader（避免依赖海外服务）
 * - 生产构建开启压缩
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 国内适配：禁止依赖 Google Fonts / Vercel 海外优化源
  // next/font 使用本地或系统字体（见 src/app/layout.tsx）
  poweredByHeader: false,
  // 生产压缩
  compress: true,
  // 图片：MVP 不接外部 optimizer，避免海外依赖；如需 CDN 后续替换为国内 loader
  images: {
    unoptimized: true,
  },
  // 实验性特性保持关闭，保证稳定性优先
  experimental: {},
};

export default nextConfig;
