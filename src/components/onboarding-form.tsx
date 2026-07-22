"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MajorDirection, GoalGrade } from "@/db/schema-enums";

/**
 * Onboarding 简化版（专业资源库转型）
 * 只采集：专业 + 专业方向 + 年级（3 步→1 步单页）
 * 删除：学校层次/培养模式/能力自评/硬约束/目标方向/岗位/兴趣
 */

const MAJOR_DIRECTIONS: { value: MajorDirection; label: string; desc: string }[] = [
  { value: "ai_general", label: "人工智能", desc: "AI / 机器学习 / 深度学习" },
  { value: "cs_general", label: "计算机 / 软件", desc: "编程 / 系统 / 数据" },
  { value: "ee_general", label: "电子 / 通信 / 自动化", desc: "EE / 自动化 / 信号" },
  { value: "business_general", label: "经管 / 商科", desc: "经济 / 管理 / 金融" },
  { value: "medicine", label: "医学 / 生命科学", desc: "临床 / 康复 / 药学" },
  { value: "art", label: "艺术 / 设计", desc: "视觉 / 数字媒体 / 设计" },
  { value: "humanities", label: "人文 / 外语", desc: "文学 / 语言 / 教育" },
  { value: "other", label: "其他", desc: "未覆盖方向" },
];

const GRADES: { value: GoalGrade; label: string }[] = [
  { value: "freshman", label: "大一" },
  { value: "sophomore", label: "大二" },
  { value: "junior", label: "大三" },
  { value: "senior", label: "大四" },
];

export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [major, setMajor] = useState("");
  const [majorDirection, setMajorDirection] = useState<MajorDirection | null>(null);
  const [grade, setGrade] = useState<GoalGrade | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          major: major || null,
          majorDirection,
          grade,
          onboardingCompleted: true,
        }),
      });
      if (!res.ok) {
        setError("保存失败，请重试");
        return;
      }
      router.push(next || "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs text-neutral-500">专业名称（可选）</label>
        <input
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          placeholder="如 人工智能 / 金融学 / 康复医学"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs text-neutral-500">专业方向（选择后展示相关资源）</label>
        <div className="grid grid-cols-2 gap-2">
          {MAJOR_DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setMajorDirection(d.value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                majorDirection === d.value
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <p className="text-sm font-medium">{d.label}</p>
              <p className={`text-xs ${majorDirection === d.value ? "text-neutral-300" : "text-neutral-400"}`}>
                {d.desc}
              </p>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={loading || !majorDirection}
        className="inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
      >
        {loading ? "保存中…" : "完成，查看资源"}
      </button>
    </div>
  );
}
