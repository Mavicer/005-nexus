import type { SearchHit } from "@/lib/search";
import {
  CredibilityBadge,
  DeadlineTag,
  LevelTag,
} from "@/components/competition-card";
import { Link } from "@/components/competition-card";

/**
 * 搜索结果卡片
 */
export function SearchCard({ hit }: { hit: SearchHit }) {
  return (
    <Link
      href={`/competitions/${hit.id}`}
      className="block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium text-neutral-900">{hit.title}</h3>
        <LevelTag level={hit.level} />
      </div>
      {hit.summary && (
        <p className="mt-1.5 line-clamp-2 text-sm text-neutral-600">
          {hit.summary}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CredibilityBadge score={hit.credibilityScore} />
        <DeadlineTag date={hit.signUpEnd} />
      </div>
    </Link>
  );
}
