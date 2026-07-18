"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * 搜索筛选栏（客户端组件，URL 同步状态）
 * 筛选：level / recognition / suitableGrade
 * 排序：relevance / credibility / closing
 */
const LEVELS = [
  { value: "", label: "全部级别" },
  { value: "school", label: "校级" },
  { value: "provincial", label: "省级" },
  { value: "national", label: "国家级" },
  { value: "international", label: "国际" },
];

const RECOGNITIONS = [
  { value: "", label: "全部认可度" },
  { value: "official_A", label: "A 类（官方）" },
  { value: "leaderboard_listed", label: "榜单收录" },
  { value: "normal", label: "普通" },
];

const GRADES = [
  { value: "", label: "全部年级" },
  { value: "大一", label: "大一" },
  { value: "大二", label: "大二" },
  { value: "大三", label: "大三" },
  { value: "大四", label: "大四" },
];

const SORTS = [
  { value: "relevance", label: "相关度" },
  { value: "credibility", label: "可信度" },
  { value: "closing", label: "即将截止" },
];

export function SearchFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        label="级别"
        value={sp.get("level") ?? ""}
        options={LEVELS}
        onChange={(v) => update("level", v)}
      />
      <Select
        label="认可度"
        value={sp.get("recognition") ?? ""}
        options={RECOGNITIONS}
        onChange={(v) => update("recognition", v)}
      />
      <Select
        label="年级"
        value={sp.get("suitableGrade") ?? ""}
        options={GRADES}
        onChange={(v) => update("suitableGrade", v)}
      />
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-neutral-400">排序</span>
        <Select
          label=""
          value={sp.get("sort") ?? "relevance"}
          options={SORTS}
          onChange={(v) => update("sort", v)}
        />
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-neutral-600">
      {label && <span className="text-neutral-400">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
