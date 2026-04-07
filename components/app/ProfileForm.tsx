"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { InlineTip } from "@/components/app/InlineTip";
import { SectionCard } from "@/components/app/SectionCard";
import { StickyActionBar } from "@/components/app/StickyActionBar";

interface ProfileData {
  currentTitle?: string | null;
  yearsOfExperience?: string | null;
  industry?: string | null;
  specialties?: string[];
  targetRole?: string | null;
  strengths?: string[];
  tonePreference?: string | null;
}

const SPECIALTY_OPTIONS = [
  "产品设计", "UI 设计", "UX 设计", "交互设计",
  "视觉设计", "品牌设计", "运营设计", "B 端设计", "C 端设计",
];

const STRENGTH_OPTIONS = [
  "用户研究", "信息架构", "交互逻辑", "视觉表达",
  "系统设计", "业务理解", "跨团队协作", "数据分析",
];

const YEARS_OPTIONS = [
  "1 年以下", "1–2 年", "2–3 年", "3–5 年", "5–8 年", "8 年以上",
];

const TONE_OPTIONS = [
  { value: "professional", label: "专业克制" },
  { value: "balanced", label: "平衡通用" },
  { value: "expressive", label: "表达鲜明" },
];

function TagSelector({
  options,
  selected,
  onChange,
  max = 5,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  max?: number;
}) {
  function toggle(opt: string) {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else if (selected.length < max) {
      onChange([...selected, opt]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-none border px-3 py-1 text-xs transition-colors ${
              active
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400"
            }`}
          >
            {active && <X className="mr-1 inline h-2.5 w-2.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function ProfileForm({ initialData }: { initialData: ProfileData | null }) {
  const [form, setForm] = useState<ProfileData>({
    currentTitle: initialData?.currentTitle ?? "",
    yearsOfExperience: initialData?.yearsOfExperience ?? "",
    industry: initialData?.industry ?? "",
    specialties: initialData?.specialties ?? [],
    targetRole: initialData?.targetRole ?? "",
    strengths: initialData?.strengths ?? [],
    tonePreference: initialData?.tonePreference ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        setError("保存失败，请稍后重试");
        return;
      }

      setSaved(true);
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <SectionCard
        title="基本信息"
        description="当前职位、年限和行业会影响作品集中的自我定位、语气和背景可信度。"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-500">你现在的职位</Label>
            <Input
              value={form.currentTitle ?? ""}
              onChange={(e) => set("currentTitle", e.target.value)}
              placeholder="如：产品设计师、高级 UI 设计师"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-500">你有几年相关经验</Label>
            <Select
              value={form.yearsOfExperience ?? ""}
              onValueChange={(v) => set("yearsOfExperience", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择年限" />
              </SelectTrigger>
              <SelectContent>
                {YEARS_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-neutral-500">你主要做过什么行业或业务</Label>
            <Input
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="如：金融科技、医疗健康、企业 SaaS、消费品电商"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="擅长方向与优势"
        description="这些标签会一起影响 AI 在项目里更偏向突出你的方法、视觉表达、业务理解和个人优势。"
      >
        <div className="space-y-6">
          <div>
            <p className="mb-4 text-xs text-neutral-400">选几个最能代表你当前方向的标签，最多 5 个</p>
            <TagSelector
              options={SPECIALTY_OPTIONS}
              selected={form.specialties ?? []}
              onChange={(v) => set("specialties", v)}
              max={5}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-neutral-500">你最想被看到的优势</Label>
            <p className="text-xs text-neutral-400">
              最多选 4 个，这会影响作品集里更强调的方法、能力和判断
            </p>
            <TagSelector
              options={STRENGTH_OPTIONS}
              selected={form.strengths ?? []}
              onChange={(v) => set("strengths", v)}
              max={4}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="求职目标"
        description="目标岗位会影响项目强调重点，帮助作品集更贴近你当前想投的方向。"
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-500">你现在主要想投什么岗位</Label>
            <Input
              value={form.targetRole ?? ""}
              onChange={(e) => set("targetRole", e.target.value)}
              placeholder="如：大厂产品设计师、创业公司全栈设计、C 端增长设计"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="文案风格偏好"
        description="风格偏好会影响 AI 生成第一版时的叙述方式，但不会改变你的真实项目事实。"
      >
        <p className="mb-4 text-xs text-neutral-400">选一个更接近你目标投递场景的表达语气</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {TONE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => set("tonePreference", value)}
              className={`rounded-none border p-4 text-left transition-colors ${
                form.tonePreference === value
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <p className="text-sm font-medium text-neutral-800">{label}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {value === "professional" && "适合大厂投递、B 端 / G 端项目"}
                {value === "balanced" && "通用场景，兼顾专业感与可读性"}
                {value === "expressive" && "适合 C 端、品牌感强的表达风格"}
              </p>
            </button>
          ))}
        </div>
      </SectionCard>

      <InlineTip>
        档案信息并不是越多越好。优先保证真实、清楚、和你的当前求职方向一致，通常会比堆很多标签更有效。
      </InlineTip>

      <StickyActionBar className="-mx-6">
        <div className="text-xs text-neutral-500">
          保存后会在后续生成作品集时作为默认档案上下文使用。
        </div>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-sm text-emerald-600">已保存 ✓</span> : null}
          {error ? <span className="text-sm text-red-500">{error}</span> : null}
          <Button onClick={handleSave} disabled={saving} className="h-11 rounded-none px-8">
            {saving ? "保存中..." : "保存档案"}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}
