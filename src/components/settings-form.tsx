"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GRADES,
  GOALS,
  INTERESTS,
  inputCls,
  type ProfileData,
} from "@/components/onboarding-form";
import type { GoalGrade, Goal } from "@/db/schema-enums";

/**
 * Settings 单页表单（预填，复用 onboarding 字段组件常量）
 * 保存回 /api/profile
 */
export function SettingsForm({ initial }: { initial: ProfileData }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileData>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    setSaved(false);
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
          onboardingCompleted: true,
        }),
      });
      const r = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(r.error ?? "保存失败");
        return;
      }
      setSaved(true);
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
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">学校</label>
            <input
              value={data.school}
              onChange={(e) => setData({ ...data, school: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">专业</label>
            <input
              value={data.major}
              onChange={(e) => setData({ ...data, major: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">年级</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setData({ ...data, grade: g.value as GoalGrade })}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  data.grade === g.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">主目标</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setData({ ...data, goal: g.value as Goal })}
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
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            兴趣方向（多选）
          </label>
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
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-green-600">已保存</p>
        )}

        <div className="flex gap-3">
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
