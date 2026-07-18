"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { CompetitionInput } from "@/lib/admin/competitions";

/**
 * 竞赛录入表单（新建/编辑共用）
 * 字段对齐 schema 全字段：
 *   info_items 核心 + competitions 明细 + sources/rounds/experiences 子表单
 *
 * 可信度录入时不手填（服务端 computeCredibilityScore 算）。
 */
export function CompetitionForm({
  initial,
  editId,
}: {
  initial?: Partial<CompetitionInput>;
  editId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<CompetitionInput>({
    title: "",
    summary: "",
    applicableScopeType: "national",
    level: "national",
    recognition: "normal",
    frequency: "annual",
    teamOrSolo: "both",
    difficulty: 3,
    ...initial,
    // 数组类型保证非空（initial 可能是 undefined）
    aliases: initial?.aliases ?? [],
    suitableGrades: initial?.suitableGrades ?? [],
    suitableMajors: initial?.suitableMajors ?? [],
    valueTags: initial?.valueTags ?? [],
    helps: initial?.helps ?? [],
    sources: initial?.sources ?? [],
    rounds: initial?.rounds ?? [],
    experiences: initial?.experiences ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!editId;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/admin/competitions/${editId}`
        : "/api/admin/competitions";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setError(data.error ?? "保存失败");
        return;
      }
      router.push("/admin/competitions");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // 通用字段更新
  function set<K extends keyof CompetitionInput>(
    key: K,
    value: CompetitionInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // 数组字段（逗号分隔输入）
  function setArrayFromCSV(key: keyof CompetitionInput, csv: string) {
    set(
      key,
      csv
        .split(/[，,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="基本信息">
        <Field label="标题 *">
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="别名（逗号分隔）">
          <input
            value={(form.aliases ?? []).join("，")}
            onChange={(e) => setArrayFromCSV("aliases", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="一句话概述" full>
          <textarea
            value={form.summary ?? ""}
            onChange={(e) => set("summary", e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="适用范围">
          <select
            value={form.applicableScopeType}
            onChange={(e) =>
              set("applicableScopeType", e.target.value as CompetitionInput["applicableScopeType"])
            }
            className={inputCls}
          >
            <option value="national">全国</option>
            <option value="province">某省</option>
            <option value="school">某校</option>
          </select>
        </Field>
        <Field label="范围值（省/校名，全国留空）">
          <input
            value={form.applicableScopeValue ?? ""}
            onChange={(e) => set("applicableScopeValue", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="报名截止时间">
          <input
            type="datetime-local"
            value={toLocalInput(form.signUpEnd)}
            onChange={(e) => set("signUpEnd", fromLocalInput(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="最后核验时间">
          <input
            type="datetime-local"
            value={toLocalInput(form.lastVerifiedAt)}
            onChange={(e) => set("lastVerifiedAt", fromLocalInput(e.target.value))}
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="竞赛明细">
        <Field label="主办方">
          <input
            value={form.organizer ?? ""}
            onChange={(e) => set("organizer", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="级别 *">
          <select
            value={form.level}
            onChange={(e) => set("level", e.target.value as CompetitionInput["level"])}
            className={inputCls}
          >
            <option value="school">校级</option>
            <option value="provincial">省级</option>
            <option value="national">国家级</option>
            <option value="international">国际</option>
          </select>
        </Field>
        <Field label="认可度">
          <select
            value={form.recognition}
            onChange={(e) =>
              set("recognition", e.target.value as CompetitionInput["recognition"])
            }
            className={inputCls}
          >
            <option value="official_A">A 类（官方认定）</option>
            <option value="leaderboard_listed">榜单收录</option>
            <option value="normal">普通</option>
          </select>
        </Field>
        <Field label="举办频率">
          <select
            value={form.frequency}
            onChange={(e) => set("frequency", e.target.value as CompetitionInput["frequency"])}
            className={inputCls}
          >
            <option value="annual">每年一届</option>
            <option value="biennial">两年一届</option>
            <option value="irregular">不定期</option>
            <option value="once">一次性</option>
          </select>
        </Field>
        <Field label="本届年度">
          <input
            type="number"
            value={form.validYear ?? ""}
            onChange={(e) => set("validYear", Number(e.target.value) || undefined)}
            className={inputCls}
          />
        </Field>
        <Field label="参赛形式">
          <select
            value={form.teamOrSolo}
            onChange={(e) => set("teamOrSolo", e.target.value as CompetitionInput["teamOrSolo"])}
            className={inputCls}
          >
            <option value="team">组队</option>
            <option value="solo">个人</option>
            <option value="both">组队/个人均可</option>
          </select>
        </Field>
        <Field label="队伍规模">
          <input
            value={form.teamSize ?? ""}
            onChange={(e) => set("teamSize", e.target.value)}
            placeholder="如 1-3"
            className={inputCls}
          />
        </Field>
        <Field label="难度（1-5）">
          <input
            type="number"
            min={1}
            max={5}
            value={form.difficulty ?? 3}
            onChange={(e) => set("difficulty", Number(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="预计投入">
          <input
            value={form.effortEstimate ?? ""}
            onChange={(e) => set("effortEstimate", e.target.value)}
            placeholder="如 约 80 小时"
            className={inputCls}
          />
        </Field>
        <Field label="官网 URL" full>
          <input
            value={form.officialUrl ?? ""}
            onChange={(e) => set("officialUrl", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="报名开始时间">
          <input
            type="datetime-local"
            value={toLocalInput(form.signUpStart)}
            onChange={(e) => set("signUpStart", fromLocalInput(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="出结果时间">
          <input
            type="datetime-local"
            value={toLocalInput(form.resultDate)}
            onChange={(e) => set("resultDate", fromLocalInput(e.target.value))}
            className={inputCls}
          />
        </Field>
        <Field label="适合年级（逗号分隔）">
          <input
            value={(form.suitableGrades ?? []).join("，")}
            onChange={(e) => setArrayFromCSV("suitableGrades", e.target.value)}
            placeholder="大一，大二"
            className={inputCls}
          />
        </Field>
        <Field label="适合学科（逗号分隔）">
          <input
            value={(form.suitableMajors ?? []).join("，")}
            onChange={(e) => setArrayFromCSV("suitableMajors", e.target.value)}
            placeholder="理工，经管"
            className={inputCls}
          />
        </Field>
        <Field label="基础要求" full>
          <input
            value={form.prereq ?? ""}
            onChange={(e) => set("prereq", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="加分项（逗号分隔）">
          <input
            value={(form.valueTags ?? []).join("，")}
            onChange={(e) => setArrayFromCSV("valueTags", e.target.value)}
            placeholder="保研加分，综测加分"
            className={inputCls}
          />
        </Field>
        <Field label="有助于（逗号分隔）">
          <input
            value={(form.helps ?? []).join("，")}
            onChange={(e) => setArrayFromCSV("helps", e.target.value)}
            placeholder="保研，考研，就业"
            className={inputCls}
          />
        </Field>
      </Section>

      <Section title="信息来源（至少 1 个）">
        <p className="text-xs text-neutral-400">
          来源类型决定 authority_weight（服务端派生）；可信度评分由服务端自动计算，无需手填。
        </p>
        <SubList
          items={form.sources ?? []}
          onChange={(sources) => set("sources", sources)}
          render={(item, setItem) => (
            <>
              <Field label="来源类型">
                <select
                  value={item.sourceType}
                  onChange={(e) => setItem({ ...item, sourceType: e.target.value as never })}
                  className={inputCls}
                >
                  <option value="official_doc">官方文件 (1.0)</option>
                  <option value="inst_notice">机构通知 (0.8)</option>
                  <option value="authority_list">权威榜单 (0.7)</option>
                  <option value="official_site">官方网站 (0.8)</option>
                  <option value="student_exp">学生经验 (0.4)</option>
                  <option value="community">社区内容 (0.2)</option>
                </select>
              </Field>
              <Field label="标题">
                <input
                  value={item.title ?? ""}
                  onChange={(e) => setItem({ ...item, title: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="URL" full>
                <input
                  value={item.url ?? ""}
                  onChange={(e) => setItem({ ...item, url: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="主来源">
                <input
                  type="checkbox"
                  checked={item.isPrimary ?? false}
                  onChange={(e) => setItem({ ...item, isPrimary: e.target.checked })}
                />
              </Field>
            </>
          )}
          empty={{ sourceType: "official_doc", isPrimary: false }}
        />
      </Section>

      <Section title="赛程轮次（可选）">
        <SubList
          items={form.rounds ?? []}
          onChange={(rounds) => set("rounds", rounds)}
          render={(item, setItem) => (
            <>
              <Field label="轮次名">
                <input
                  value={item.name}
                  onChange={(e) => setItem({ ...item, name: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="开始">
                <input
                  type="datetime-local"
                  value={toLocalInput(item.startAt)}
                  onChange={(e) => setItem({ ...item, startAt: fromLocalInput(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="结束">
                <input
                  type="datetime-local"
                  value={toLocalInput(item.endAt)}
                  onChange={(e) => setItem({ ...item, endAt: fromLocalInput(e.target.value) })}
                  className={inputCls}
                />
              </Field>
              <Field label="顺序">
                <input
                  type="number"
                  value={item.sortOrder ?? 0}
                  onChange={(e) => setItem({ ...item, sortOrder: Number(e.target.value) })}
                  className={inputCls}
                />
              </Field>
            </>
          )}
          empty={{ name: "", sortOrder: 0 }}
        />
      </Section>

      <Section title="学生经验（可选）">
        <SubList
          items={form.experiences ?? []}
          onChange={(experiences) => set("experiences", experiences)}
          render={(item, setItem) => (
            <>
              <Field label="内容" full>
                <textarea
                  value={item.content}
                  onChange={(e) => setItem({ ...item, content: e.target.value })}
                  rows={2}
                  className={inputCls}
                />
              </Field>
              <Field label="作者">
                <input
                  value={item.author ?? ""}
                  onChange={(e) => setItem({ ...item, author: e.target.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="来源 URL">
                <input
                  value={item.sourceUrl ?? ""}
                  onChange={(e) => setItem({ ...item, sourceUrl: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </>
          )}
          empty={{ content: "" }}
        />
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : isEdit ? "保存修改" : "创建草稿"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/competitions")}
          className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}

// ---------- 子表单列表（可重复增删） ----------

function SubList<T extends object>({
  items,
  onChange,
  render,
  empty,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, setItem: (item: T) => void) => React.ReactNode;
  empty: T;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-3">
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-xs text-neutral-400 hover:text-red-600"
            >
              删除
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {render(item, (newItem) =>
              onChange(items.map((it, j) => (j === i ? newItem : it))),
            )}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, empty])}
        className="text-sm text-blue-600 hover:underline"
      >
        + 添加
      </button>
    </div>
  );
}

// ---------- 表单原子 ----------

const inputCls =
  "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-neutral-400 focus:outline-none";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-100 p-4">
      <h2 className="mb-3 text-sm font-medium text-neutral-900">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={full ? "block sm:col-span-2" : "block"}>
      <span className="mb-1 block text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

// datetime-local 转换工具
function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | undefined {
  if (!local) return undefined;
  return new Date(local).toISOString();
}
