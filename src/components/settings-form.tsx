"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MajorDirection, GoalGrade } from "@/db/schema-enums";

const MAJOR_DIRECTIONS: { value: MajorDirection; label: string }[] = [
  { value: "ai_general", label: "人工智能" },
  { value: "cs_general", label: "计算机 / 软件" },
  { value: "ee_general", label: "电子 / 通信 / 自动化" },
  { value: "business_general", label: "经管 / 商科" },
  { value: "medicine", label: "医学 / 生命科学" },
  { value: "art", label: "艺术 / 设计" },
  { value: "humanities", label: "人文 / 外语" },
  { value: "other", label: "其他" },
];

const GRADES: { value: GoalGrade; label: string }[] = [
  { value: "freshman", label: "大一" },
  { value: "sophomore", label: "大二" },
  { value: "junior", label: "大三" },
  { value: "senior", label: "大四" },
];

export function SettingsForm({
  initial,
}: {
  initial: {
    major?: string | null;
    majorDirection?: string | null;
    grade?: string | null;
  };
}) {
  const router = useRouter();
  const [major, setMajor] = useState(initial.major ?? "");
  const [majorDirection, setMajorDirection] = useState<MajorDirection | null>(
    (initial.majorDirection as MajorDirection) ?? null,
  );
  const [grade, setGrade] = useState<GoalGrade | null>((initial.grade as GoalGrade) ?? null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major: major || null, majorDirection, grade }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">专业名称</label>
        <input
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          placeholder="如 人工智能 / 金融学"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">专业方向</label>
        <div className="grid grid-cols-2 gap-2">
          {MAJOR_DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setMajorDirection(d.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                majorDirection === d.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">年级</label>
        <div className="flex gap-2">
          {GRADES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGrade(g.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                grade === g.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "保存中…" : "保存"}
        </button>
        {saved && <span className="text-xs text-green-600">已保存</span>}
      </div>
    </div>
  );
}
