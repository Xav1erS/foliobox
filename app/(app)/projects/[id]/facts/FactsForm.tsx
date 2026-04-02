"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2, Check } from "lucide-react";

interface FactsData {
  projectType?: string | null;
  industry?: string | null;
  timeline?: string | null;
  hasLaunched?: boolean | null;
  background?: string | null;
  targetUsers?: string | null;
  businessGoal?: string | null;
  roleTitle?: string | null;
  involvementLevel?: string | null;
  keyContribution?: string | null;
  biggestChallenge?: string | null;
  resultSummary?: string | null;
  measurableImpact?: string | null;
  targetJob?: string | null;
  targetCompanyType?: string | null;
}

const PROJECT_TYPES = ["B 端 / 中后台", "C 端 / App", "G 端 / 政务", "数字产品体验优化", "其他"];
const INVOLVEMENT_LEVELS = [
  { value: "LEAD", label: "主导（Lead Designer）" },
  { value: "CORE", label: "核心成员（Core Member）" },
  { value: "SUPPORT", label: "参与协作（Supporting Role）" },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-neutral-400">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-500">{label}</Label>
      {hint && <p className="text-xs text-neutral-400">{hint}</p>}
      {children}
    </div>
  );
}

export function FactsForm({
  projectId,
  initialFacts,
}: {
  projectId: string;
  initialFacts: FactsData | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FactsData>({
    projectType: initialFacts?.projectType ?? "",
    industry: initialFacts?.industry ?? "",
    timeline: initialFacts?.timeline ?? "",
    hasLaunched: initialFacts?.hasLaunched ?? null,
    background: initialFacts?.background ?? "",
    targetUsers: initialFacts?.targetUsers ?? "",
    businessGoal: initialFacts?.businessGoal ?? "",
    roleTitle: initialFacts?.roleTitle ?? "",
    involvementLevel: initialFacts?.involvementLevel ?? "",
    keyContribution: initialFacts?.keyContribution ?? "",
    biggestChallenge: initialFacts?.biggestChallenge ?? "",
    resultSummary: initialFacts?.resultSummary ?? "",
    measurableImpact: initialFacts?.measurableImpact ?? "",
    targetJob: initialFacts?.targetJob ?? "",
    targetCompanyType: initialFacts?.targetCompanyType ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof FactsData>(key: K, value: FactsData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }

  async function save(): Promise<boolean> {
    try {
      const res = await fetch(`/api/projects/${projectId}/facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleSaveDraft() {
    setSaving(true);
    setError("");
    const ok = await save();
    setSaving(false);
    if (ok) setSavedAt(new Date());
    else setError("保存失败，请重试");
  }

  async function handleSubmit() {
    if (!form.background?.trim()) { setError("请填写项目背景（必填）"); return; }
    if (!form.roleTitle?.trim()) { setError("请填写你的职位头衔（必填）"); return; }

    setSubmitting(true);
    setError("");
    const ok = await save();
    if (!ok) {
      setError("保存失败，请重试");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/outline`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "大纲生成失败，请重试");
        setSubmitting(false);
        return;
      }
      const { outlineId } = await res.json();
      router.push(`/projects/${projectId}/outline?oid=${outlineId}`);
    } catch {
      setError("网络错误，请重试");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ① Basic info */}
      <Section title="① 项目基本信息">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="项目类型">
            <Select
              value={form.projectType ?? ""}
              onValueChange={(v) => set("projectType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="所属行业">
            <Input
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="如：金融科技、医疗健康、企业 SaaS"
            />
          </Field>

          <Field label="项目时间线">
            <Input
              value={form.timeline ?? ""}
              onChange={(e) => set("timeline", e.target.value)}
              placeholder="如：2023.06 – 2023.12（6 个月）"
            />
          </Field>

          <Field label="是否已上线">
            <div className="flex gap-2 pt-1">
              {[{ val: true, label: "已上线" }, { val: false, label: "未上线 / 内部项目" }].map(({ val, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set("hasLaunched", val)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                    form.hasLaunched === val
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Section>

      {/* ② Background */}
      <Section
        title="② 背景与目标"
        hint="帮助 AI 理解项目的来龙去脉，生成有说服力的背景叙述。"
      >
        <Field label="项目背景 *" hint="这个项目是为了解决什么问题、在什么业务背景下启动的？（3–5 句）">
          <Textarea
            value={form.background ?? ""}
            onChange={(e) => set("background", e.target.value)}
            placeholder="如：用户投诉账单页面信息混乱，流失率较高。产品决定对账单模块进行体验重构，优化用户对账单内容的理解与操作效率。"
            className="min-h-[88px] resize-none"
          />
        </Field>

        <Field label="目标用户">
          <Input
            value={form.targetUsers ?? ""}
            onChange={(e) => set("targetUsers", e.target.value)}
            placeholder="如：面向 30–45 岁的月光族用户，主要使用场景是每月还款前查账"
          />
        </Field>

        <Field label="业务目标">
          <Input
            value={form.businessGoal ?? ""}
            onChange={(e) => set("businessGoal", e.target.value)}
            placeholder="如：提升账单页 7 日留存率，减少客服咨询量"
          />
        </Field>
      </Section>

      {/* ③ Role */}
      <Section
        title="③ 个人角色"
        hint="招聘方最关注你在项目中做了什么。角色越清晰，作品集说服力越强。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="职位头衔 *">
            <Input
              value={form.roleTitle ?? ""}
              onChange={(e) => set("roleTitle", e.target.value)}
              placeholder="如：产品设计师、高级 UI 设计师"
            />
          </Field>

          <Field label="参与深度">
            <Select
              value={form.involvementLevel ?? ""}
              onValueChange={(v) => set("involvementLevel", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择参与深度" />
              </SelectTrigger>
              <SelectContent>
                {INVOLVEMENT_LEVELS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="最核心贡献" hint="你在项目里最重要的一件事是什么？">
          <Textarea
            value={form.keyContribution ?? ""}
            onChange={(e) => set("keyContribution", e.target.value)}
            placeholder="如：主导重构了账单信息架构，将原有 11 个层级的信息折叠为 3 个主视图，提升扫描效率。"
            className="min-h-[80px] resize-none"
          />
        </Field>

        <Field label="最大挑战">
          <Textarea
            value={form.biggestChallenge ?? ""}
            onChange={(e) => set("biggestChallenge", e.target.value)}
            placeholder="如：需要在不改变底层数据结构的前提下优化展示层，且要兼容 iOS / Android 两端规范。"
            className="min-h-[80px] resize-none"
          />
        </Field>
      </Section>

      {/* ④ Results */}
      <Section title="④ 结果与投递方向">
        <Field label="结果概述" hint="项目最终达成了什么？哪怕没有数据，也可以描述质性结果。">
          <Textarea
            value={form.resultSummary ?? ""}
            onChange={(e) => set("resultSummary", e.target.value)}
            placeholder="如：新版账单页上线后用户满意度评分从 3.2 提升至 4.1，客服投诉量下降约 18%。"
            className="min-h-[80px] resize-none"
          />
        </Field>

        <Field label="量化影响（选填）" hint="DAU 提升 / 转化率 / 时长变化等，没有可留空">
          <Input
            value={form.measurableImpact ?? ""}
            onChange={(e) => set("measurableImpact", e.target.value)}
            placeholder="如：留存率 +12%，首屏加载时间 -40%"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="目标岗位方向">
            <Input
              value={form.targetJob ?? ""}
              onChange={(e) => set("targetJob", e.target.value)}
              placeholder="如：大厂产品设计师、C 端增长设计"
            />
          </Field>

          <Field label="目标公司类型">
            <Input
              value={form.targetCompanyType ?? ""}
              onChange={(e) => set("targetCompanyType", e.target.value)}
              placeholder="如：一线大厂、B 轮及以上创业公司"
            />
          </Field>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
            className="h-10"
          >
            {saving ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />保存中</> : "保存草稿"}
          </Button>
          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" />
              已保存
            </span>
          )}
          {error && <span className="text-xs text-red-500">{error}</span>}
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="h-10 px-6">
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 生成中，请稍候…</>
          ) : (
            <>AI 生成作品集大纲 <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
