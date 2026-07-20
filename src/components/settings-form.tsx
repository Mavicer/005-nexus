"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GRADES,
  GOALS,
  INTERESTS,
  SCHOOL_TIERS,
  MAJOR_DIRECTIONS,
  PROGRAM_MODES,
  GPA_TIERS,
  RESEARCH_LEVELS,
  COMPETITION_LEVELS,
  ENGLISH_LEVELS,
  INTERNSHIP_LEVELS,
  inputCls,
  type ProfileData,
} from "@/components/onboarding-form";
import type {
  GoalGrade,
  Goal,
  SchoolTier,
  MajorDirection,
  ProgramMode,
  GpaTier,
  ResearchLevel,
  CompetitionCapability,
  EnglishLevel,
  InternshipLevel,
} from "@/db/schema-enums";

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
          schoolTier: data.schoolTier,
          majorDirection: data.majorDirection,
          programMode: data.programMode,
          isGoAbroad: data.isGoAbroad,
          gpaTier: data.gpaTier,
          researchLevel: data.researchLevel,
          competitionCapability: data.competitionCapability,
          englishLevel: data.englishLevel,
          internshipLevel: data.internshipLevel,
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
          <label className="mb-1 block text-xs text-neutral-500">
            学校层次（经验参考，影响机会门槛适配）
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {SCHOOL_TIERS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() =>
                  setData({ ...data, schoolTier: t.value as SchoolTier })
                }
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  data.schoolTier === t.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">
            专业方向（决定推荐侧重点）
          </label>
          <select
            value={data.majorDirection ?? ""}
            onChange={(e) =>
              setData({
                ...data,
                majorDirection: (e.target.value || null) as MajorDirection | null,
              })
            }
            className={inputCls}
          >
            <option value="">选择专业方向（可跳过）</option>
            {MAJOR_DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} — {d.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Phase A 4.5：培养模式 + 能力画像 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">培养模式</label>
            <select
              value={data.programMode ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  programMode: (e.target.value || null) as ProgramMode | null,
                })
              }
              className={inputCls}
            >
              <option value="">未选</option>
              {PROGRAM_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {data.programMode === "sino_foreign" && (
              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={data.isGoAbroad === true}
                  onChange={(e) =>
                    setData({ ...data, isGoAbroad: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-neutral-300"
                />
                4+0 不出国
              </label>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CapabilitySelectSet
            label="GPA 档位"
            value={data.gpaTier}
            options={GPA_TIERS}
            onChange={(v) => setData({ ...data, gpaTier: v as GpaTier | null })}
          />
          <CapabilitySelectSet
            label="科研经历"
            value={data.researchLevel}
            options={RESEARCH_LEVELS}
            onChange={(v) =>
              setData({ ...data, researchLevel: v as ResearchLevel | null })
            }
          />
          <CapabilitySelectSet
            label="竞赛水平"
            value={data.competitionCapability}
            options={COMPETITION_LEVELS}
            onChange={(v) =>
              setData({
                ...data,
                competitionCapability: v as CompetitionCapability | null,
              })
            }
          />
          <CapabilitySelectSet
            label="英语水平"
            value={data.englishLevel}
            options={ENGLISH_LEVELS}
            onChange={(v) =>
              setData({ ...data, englishLevel: v as EnglishLevel | null })
            }
          />
          <CapabilitySelectSet
            label="实习经历"
            value={data.internshipLevel}
            options={INTERNSHIP_LEVELS}
            onChange={(v) =>
              setData({
                ...data,
                internshipLevel: v as InternshipLevel | null,
              })
            }
          />
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

/** 能力自评下拉（紧凑，复用 onboarding 样式） */
function CapabilitySelectSet<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-neutral-500">{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange((e.target.value || null) as T | null)}
        className={inputCls}
      >
        <option value="">未选</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
