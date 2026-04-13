"use client";

import { useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { InlineTip } from "@/components/app/InlineTip";
import { StickyActionBar } from "@/components/app/StickyActionBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";

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
  "产品设计",
  "UI 设计",
  "UX 设计",
  "交互设计",
  "视觉设计",
  "品牌设计",
  "运营设计",
  "B 端设计",
  "C 端设计",
];

const STRENGTH_OPTIONS = [
  "用户研究",
  "信息架构",
  "交互逻辑",
  "视觉表达",
  "系统设计",
  "业务理解",
  "跨团队协作",
  "数据分析",
];

const YEARS_OPTIONS = [
  "1 年以下",
  "1–2 年",
  "2–3 年",
  "3–5 年",
  "5–8 年",
  "8 年以上",
];

const TONE_OPTIONS = [
  {
    value: "professional",
    label: "专业克制",
    description: "适合大厂投递、B 端 / G 端项目",
  },
  {
    value: "balanced",
    label: "平衡通用",
    description: "通用场景，兼顾专业感与可读性",
  },
  {
    value: "expressive",
    label: "表达鲜明",
    description: "适合 C 端、品牌感强的表达风格",
  },
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
            className={[
              "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            ].join(" ")}
          >
            {active ? <X className="mr-1 inline h-3 w-3" /> : null}
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
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeApplying, setResumeApplying] = useState(false);
  const [resumeMessage, setResumeMessage] = useState("");
  const [parsedResumeId, setParsedResumeId] = useState<string | null>(null);

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

  async function handleResumeUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeUploading(true);
    setResumeMessage("");

    try {
      const [uploaded] = await uploadFilesFromBrowser({
        files: [file],
        folder: "resumes",
        kind: "resume-pdf",
      });

      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: [uploaded] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "简历上传失败");
      }

      const profileDraft = (data as { profileDraft?: Partial<ProfileData> & { summary?: string } })
        .profileDraft;
      setParsedResumeId((data as { resume?: { id?: string } }).resume?.id ?? null);
      setResumeMessage(
        profileDraft?.summary ?? "已读取这份简历。你可以先应用到当前档案，再手动微调。"
      );
    } catch (uploadError) {
      setResumeMessage(uploadError instanceof Error ? uploadError.message : "简历上传失败");
      setParsedResumeId(null);
    } finally {
      setResumeUploading(false);
      event.target.value = "";
    }
  }

  async function handleApplyResume() {
    if (!parsedResumeId) return;

    setResumeApplying(true);
    setResumeMessage("");

    try {
      const response = await fetch(`/api/profile/from-resume/${parsedResumeId}`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "应用简历失败");
      }

      const profile = (data as { profile?: ProfileData }).profile;
      if (profile) {
        setForm({
          currentTitle: profile.currentTitle ?? "",
          yearsOfExperience: profile.yearsOfExperience ?? "",
          industry: profile.industry ?? "",
          specialties: profile.specialties ?? [],
          targetRole: profile.targetRole ?? "",
          strengths: profile.strengths ?? [],
          tonePreference: profile.tonePreference ?? "",
        });
      }

      setSaved(false);
      setResumeMessage("简历里的基础信息已经写入当前档案，你可以继续微调后再保存。");
    } catch (applyError) {
      setResumeMessage(applyError instanceof Error ? applyError.message : "应用简历失败");
    } finally {
      setResumeApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardContent className="p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Current Identity
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {form.currentTitle || "还没有写当前职位"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              这是 AI 判断你是谁、适合强调什么的第一层上下文。
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardContent className="p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Target Role
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {form.targetRole || "还没有写目标岗位"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              目标岗位会直接影响项目里更偏向强调的方法和能力。
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-foreground text-background shadow-xs">
          <CardContent className="p-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-background/45">
              Focus Tags
            </p>
            <p className="mt-2 text-sm font-medium">
              {`${form.specialties?.length ?? 0} 个方向标签 · ${form.strengths?.length ?? 0} 个优势标签`}
            </p>
            <p className="mt-2 text-sm leading-6 text-background/70">
              方向和优势的选择会共同决定作品集第一版的叙述重心。
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
              简历导入
            </Badge>
          </div>
          <CardTitle className="text-xl">从简历快速带入</CardTitle>
          <CardDescription className="text-sm leading-6">
            先上传一份 PDF 简历，我会帮你提取职位、经验年限和部分方向标签，再落到当前档案里。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-xl border border-border/70 bg-muted/35 px-5 py-5">
            <p className="text-sm leading-6 text-muted-foreground">
              这一步更适合先把基础信息带进来，不会覆盖你后续手动写的项目事实。当前版本优先支持 PDF 简历。
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { title: "1. 上传 PDF", description: "先做文本提取和结构解析。" },
                { title: "2. 预览摘要", description: "先看系统读到了什么。" },
                { title: "3. 应用到档案", description: "再手动微调成你想要的表达。" },
              ].map((step) => (
                <div key={step.title} className="rounded-xl border border-border/70 bg-background px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
            {resumeMessage ? (
              <div className="mt-4 rounded-xl border border-border/70 bg-background px-4 py-3 text-sm text-muted-foreground">
                {resumeMessage}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-4 py-4 text-center transition-colors hover:border-foreground/30 hover:bg-background">
              {resumeUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
              )}
              <p className="mt-3 text-sm font-medium text-foreground">上传 PDF 简历</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">上传后会先做一次文本提取</p>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={handleResumeUpload}
              />
            </label>
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={handleApplyResume}
              disabled={!parsedResumeId || resumeApplying}
            >
              {resumeApplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              应用到当前档案
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
              基本信息
            </Badge>
          </div>
          <CardTitle className="text-xl">当前身份与行业背景</CardTitle>
          <CardDescription className="text-sm leading-6">
            当前职位、年限和行业会影响作品集中的自我定位、语气和背景可信度。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">你现在的职位</Label>
            <Input
              value={form.currentTitle ?? ""}
              onChange={(e) => set("currentTitle", e.target.value)}
              placeholder="如：产品设计师、高级 UI 设计师"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">你有几年相关经验</Label>
            <Select value={form.yearsOfExperience ?? ""} onValueChange={(v) => set("yearsOfExperience", v)}>
              <SelectTrigger>
                <SelectValue placeholder="选择年限" />
              </SelectTrigger>
              <SelectContent>
                {YEARS_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">你主要做过什么行业或业务</Label>
            <Input
              value={form.industry ?? ""}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="如：金融科技、医疗健康、企业 SaaS、消费品电商"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
              方向与优势
            </Badge>
          </div>
          <CardTitle className="text-xl">擅长方向与优势</CardTitle>
          <CardDescription className="text-sm leading-6">
            这些标签会一起影响 AI 在项目里更偏向突出你的方法、视觉表达、业务理解和个人优势。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-[10px]">
                最多 5 个
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">选几个最能代表你当前方向的标签。</p>
            <TagSelector
              options={SPECIALTY_OPTIONS}
              selected={form.specialties ?? []}
              onChange={(v) => set("specialties", v)}
              max={5}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-md px-2 py-0.5 font-mono text-[10px]">
                最多 4 个
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              这些标签会影响作品集里更强调的方法、能力和判断。
            </p>
            <TagSelector
              options={STRENGTH_OPTIONS}
              selected={form.strengths ?? []}
              onChange={(v) => set("strengths", v)}
              max={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
              求职目标
            </Badge>
          </div>
          <CardTitle className="text-xl">目标岗位</CardTitle>
          <CardDescription className="text-sm leading-6">
            目标岗位会影响项目强调重点，帮助作品集更贴近你当前想投的方向。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">你现在主要想投什么岗位</Label>
            <Input
              value={form.targetRole ?? ""}
              onChange={(e) => set("targetRole", e.target.value)}
              placeholder="如：大厂产品设计师、创业公司全栈设计、C 端增长设计"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
              文案风格
            </Badge>
          </div>
          <CardTitle className="text-xl">文案风格偏好</CardTitle>
          <CardDescription className="text-sm leading-6">
            风格偏好会影响 AI 生成第一版时的叙述方式，但不会改变你的真实项目事实。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">选一个更接近你目标投递场景的表达语气。</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {TONE_OPTIONS.map(({ value, label, description }) => {
              const active = form.tonePreference === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("tonePreference", value)}
                  className={[
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-foreground/20 hover:bg-muted/35",
                  ].join(" ")}
                >
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <InlineTip>
        档案信息并不是越多越好。优先保证真实、清楚、和你的当前求职方向一致，通常会比堆很多标签更有效。
      </InlineTip>

      <StickyActionBar className="-mx-6">
        <div className="text-xs text-muted-foreground">
          保存后会在后续生成作品集时作为默认档案上下文使用。
        </div>
        <div className="flex items-center gap-3">
          {saved ? <span className="text-sm text-emerald-600">已保存 ✓</span> : null}
          {error ? <span className="text-sm text-red-500">{error}</span> : null}
          <Button onClick={handleSave} disabled={saving} className="h-11 px-8">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中
              </>
            ) : (
              "保存档案"
            )}
          </Button>
        </div>
      </StickyActionBar>
    </div>
  );
}
