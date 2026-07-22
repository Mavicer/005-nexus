import Link from "next/link";

/**
 * Footer — Apple 风格简约 Footer
 * 品牌名 Nexus，作者 Leon。
 */
export function Footer() {
  const icpNumber = process.env.ICP_NUMBER;

  return (
    <footer className="mt-20 border-t border-neutral-100 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* 品牌区 */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-block transition-opacity hover:opacity-70"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Nexus
            </h2>
          </Link>
          <p className="mt-2 text-sm text-neutral-400">
            探索大学成长资源，连接每一次可能。
          </p>
          <p className="mt-0.5 text-xs text-neutral-300">
            Discover opportunities for students.
          </p>
        </div>

        {/* 导航区 + 信息区 */}
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
            <div>
              <p className="mb-3 text-xs font-medium text-neutral-500">资源</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/dashboard" className="text-xs text-neutral-400 transition-colors hover:text-neutral-700">
                    专业资源库
                  </Link>
                </li>
                <li>
                  <Link href="/calendar" className="text-xs text-neutral-400 transition-colors hover:text-neutral-700">
                    资源日历
                  </Link>
                </li>
                <li>
                  <Link href="/explore" className="text-xs text-neutral-400 transition-colors hover:text-neutral-700">
                    搜索
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <p className="mb-3 text-xs font-medium text-neutral-500">关于</p>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-xs text-neutral-400 transition-colors hover:text-neutral-700">
                    使用说明
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-xs text-neutral-300">© 2026 Nexus</p>
            <p className="text-xs text-neutral-300">Built with curiosity and technology.</p>
            <p className="text-xs text-neutral-300">Resources collected from public sources.</p>
            <p className="mt-1 text-xs text-neutral-300">
              Crafted by <span className="text-neutral-400">Leon</span>
            </p>
            {icpNumber && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 text-xs text-neutral-300 transition-colors hover:text-neutral-500"
              >
                {icpNumber}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
