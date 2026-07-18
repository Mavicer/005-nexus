import Link from "next/link";

/**
 * 分页器
 */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const base = basePath.startsWith("?") ? basePath : `?${basePath}`;
  const url = (p: number) => {
    const params = new URLSearchParams(base.replace(/^\?/, ""));
    params.set("page", String(p));
    return `/?${params.toString()}`;
  };
  void base;

  return (
    <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
      {page > 1 ? (
        <Link
          href={url(page - 1)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
        >
          上一页
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-md border border-neutral-100 px-3 py-1.5 text-neutral-300">
          上一页
        </span>
      )}
      <span className="px-2 text-neutral-500">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={url(page + 1)}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
        >
          下一页
        </Link>
      ) : (
        <span className="cursor-not-allowed rounded-md border border-neutral-100 px-3 py-1.5 text-neutral-300">
          下一页
        </span>
      )}
    </nav>
  );
}
