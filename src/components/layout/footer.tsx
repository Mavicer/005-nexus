/**
 * Footer — 页脚（ICP 占位 + 可信度说明）
 */
export function Footer() {
  const icpNumber = process.env.ICP_NUMBER;
  return (
    <footer className="mt-16 border-t border-neutral-100 py-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 text-xs text-neutral-400">
        <p>
          信息可信度评分基于来源权重、时效、多源一致性综合评估，仅供参考，非真实性裁决。
        </p>
        <p className="flex items-center gap-3">
          <span>Nexus · University Growth Navigation OS</span>
          {icpNumber && (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-600"
            >
              {icpNumber}
            </a>
          )}
        </p>
      </div>
    </footer>
  );
}
