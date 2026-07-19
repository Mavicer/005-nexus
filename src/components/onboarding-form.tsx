"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { GoalGrade, Goal } from "@/db/schema-enums";

const GRADES: { value: GoalGrade; label: string }[] = [
  { value: "freshman", label: "大一" },
  { value: "sophomore", label: "大二" },
  { value: "junior", label: "大三" },
  { value: "senior", label: "大四" },
];

const GOALS: { value: Goal; label: string; desc: string }[] = [
  { value: "baoyan", label: "保研", desc: "争取推免读研" },
  { value: "employment", label: "就业", desc: "毕业直接工作" },
  { value: "civilService", label: "考公", desc: "公务员/事业编" },
  { value: "abroad", label: "出国", desc: "海外深造" },
  { value: "entrepreneurship", label: "创业", desc: "自主创业" },
];

const INTERESTS = [
  "AI / 人工智能",
  "计算机 / 软件",
  "电子 / 通信",
  "金融 / 经济",
  "科研 / 学术",
  "医学 / 生命科学",
  "人文 / 社科",
  "法学",
  "艺术 / 设计",
  "教育",
  "管理 / 商科",
];

interface ProfileData {
  school: string;
  major: string;
  grade: GoalGrade | null;
  goal: Goal | null;
  interests: string[];
}

/**
 * Onboarding 多步表单（client state 分步，单页）
 * 步骤 1/2/3/4，跳过→onboardingCompleted=false，完成→true
 */
export function OnboardingForm({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProfileData>({
    school: "",
    major: "",
    grade: null,
    goal: null,
    interests: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(completed: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school: data.school || null,
          major: data.major || null,
          grade: data.grade,
          goal: data.goal,
          interests: data.interests,
          onboardingCompleted: completed,
        }),
      });
      const r = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(r.error ?? "保存失败");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(i: string) {
    setData((d) => ({
      ...d,
      interests: d.interests.includes(i)
        ? d.interests.filter((x) => x !== i)
        : [...d.interests, i],
    }));
  }

  return (
    <Card className="p-5">
      {/* 进度指示 */}
      <div className="mb-5 flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-neutral-900" : "bg-neutral-200"
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-neutral-400">{step}/4</span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-neutral-900">
            你的学校与专业
          </h2>
          <p className="text-xs text-neutral-400">可选，便于推荐更精准的机会</p>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">学校</label>
            <input
              value={data.school}
              onChange={(e) => setData({ ...data, school: e.target.value })}
              placeholder="如 清华大学"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">专业</label>
            <input
              value={data.major}
              onChange={(e) => setData({ ...data, major: e.target.value })}
              placeholder="如 计算机科学与技术"
              className={inputCls}
            />
          </div>
          <NavRow
            onSkip={() => submit(false)}
            onNext={() => setStep(2)}
            saving={saving}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-neutral-900">你的年级</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setData({ ...data, grade: g.value })}
                className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                  data.grade === g.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <NavRow
            onBack={() => setStep(1)}
            onSkip={() => submit(false)}
            onNext={() => setStep(3)}
            saving={saving}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-neutral-900">
            你的主目标
          </h2>
          <p className="text-xs text-neutral-400">单选，决定你的成长路线推荐</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setData({ ...data, goal: g.value })}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  data.goal === g.value
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <p className="text-sm font-medium text-neutral-900">{g.label}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{g.desc}</p>
              </button>
            ))}
          </div>
          <NavRow
            onBack={() => setStep(2)}
            onSkip={() => submit(false)}
            onNext={() => setStep(4)}
            saving={saving}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-base font-medium text-neutral-900">
            你的兴趣方向
          </h2>
          <p className="text-xs text-neutral-400">多选，帮助推荐匹配的机会</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  data.interests.includes(i)
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(3)}
              disabled={saving}
            >
              上一步
            </Button>
            <Button
              type="button"
              onClick={() => submit(false)}
              disabled={saving}
              variant="ghost"
            >
              跳过
            </Button>
            <Button
              type="button"
              onClick={() => submit(true)}
              disabled={saving}
            >
              {saving ? "保存中…" : "完成"}
            </Button>
          </div>
        </div>
      )}

      {error && step !== 4 && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300";

function NavRow({
  onBack,
  onSkip,
  onNext,
  saving,
}: {
  onBack?: () => void;
  onSkip: () => void;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <Button type="button" variant="secondary" onClick={onBack} disabled={saving}>
          上一步
        </Button>
      )}
      <Button type="button" onClick={onSkip} disabled={saving} variant="ghost">
        跳过
      </Button>
      <Button type="button" onClick={onNext} disabled={saving}>
        下一步
      </Button>
    </div>
  );
}

export { inputCls };
export type { ProfileData };
export { GRADES, GOALS, INTERESTS };
