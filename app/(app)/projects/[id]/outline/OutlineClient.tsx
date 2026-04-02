"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronRight } from "lucide-react";
import type { OutlineSection, OutlineSectionsJson } from "./page";
import { useEntitlement } from "@/hooks/useEntitlement";
import { PaywallModal } from "@/components/billing/PaywallModal";

interface Asset {
  id: string;
  imageUrl: string;
  title: string;
  isCover: boolean;
}

interface Props {
  outlineId: string;
  projectId: string;
  initialSectionsJson: OutlineSectionsJson;
  initialTheme: string;
  totalEstimatedPages: number;
  assets: Asset[];
}

const THEMES = [
  {
    value: "PROFESSIONAL",
    label: "专业克制版",
    desc: "排版简洁，信息密度高，适合大厂",
    accent: "border-neutral-800 bg-neutral-900 text-white",
    accentActive: "ring-2 ring-neutral-900",
  },
  {
    value: "BALANCED",
    label: "通用平衡版",
    desc: "图文结合，叙述清晰，适用范围最广",
    accent: "border-blue-200 bg-blue-50 text-blue-900",
    accentActive: "ring-2 ring-blue-500",
  },
  {
    value: "EXPRESSIVE",
    label: "视觉表达版",
    desc: "强视觉冲击，适合创意公司",
    accent: "border-violet-200 bg-violet-50 text-violet-900",
    accentActive: "ring-2 ring-violet-500",
  },
];

const SECTION_TYPE_LABEL: Record<string, string> = {
  cover: "封面",
  profile: "个人简介",
  toc: "目录",
  project_case: "项目案例",
  extras: "附加内容",
  closing: "结语",
};

export function OutlineClient({
  outlineId,
  projectId,
  initialSectionsJson,
  initialTheme,
  totalEstimatedPages,
  assets,
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<OutlineSection[]>(initialSectionsJson.sections ?? []);
  const [theme, setTheme] = useState(initialTheme);
  const [coverId, setCoverId] = useState<string>(() => assets.find((a) => a.isCover)?.id ?? assets[0]?.id ?? "");
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);
  const { planType } = useEntitlement();

  const estimatedPages = sections.filter((s) => s.enabled).reduce((sum, s) => sum + s.estimatedPages, 0);

  function toggleSection(sectionId: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, enabled: !s.enabled } : s))
    );
  }

  async function handleConfirmAndRender() {
    if (planType === "FREE") {
      setPaywallOpen(true);
      return;
    }
    setRendering(true);
    setError("");

    const updatedSectionsJson = { ...initialSectionsJson, sections };

    try {
      // 1. Save outline changes
      const putRes = await fetch(`/api/outlines/${outlineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallTheme: theme,
          sectionsJson: updatedSectionsJson,
          selectedThumbnailMap: coverId ? { cover: coverId } : {},
        }),
      });
      if (!putRes.ok) throw new Error("保存大纲失败");

      // 2. Confirm outline
      const confirmRes = await fetch(`/api/outlines/${outlineId}/confirm`, { method: "POST" });
      if (!confirmRes.ok) throw new Error("确认大纲失败");

      // 3. Render draft (this is the slow AI call, ~15-20s)
      const renderRes = await fetch(`/api/outlines/${outlineId}/render`, { method: "POST" });
      if (!renderRes.ok) {
        const d = await renderRes.json().catch(() => ({}));
        throw new Error(d.error ?? "初稿生成失败，请重试");
      }
      const { draftId } = await renderRes.json();
      router.push(`/projects/${projectId}/editor?did=${draftId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
      setRendering(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Sections */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-neutral-700">① 板块结构</h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            可关闭不需要的板块；预计 {estimatedPages} 页（共 {totalEstimatedPages} 页）
          </p>
        </div>
        <div className="space-y-2">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                section.enabled ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`h-5 w-5 shrink-0 rounded border-2 transition-colors ${
                    section.enabled
                      ? "border-neutral-900 bg-neutral-900"
                      : "border-neutral-300 bg-white"
                  }`}
                >
                  {section.enabled && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-0.5">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div>
                  <span className={`text-sm font-medium ${section.enabled ? "text-neutral-900" : "text-neutral-400"}`}>
                    {section.title}
                  </span>
                  <span className="ml-2 text-xs text-neutral-400">
                    {SECTION_TYPE_LABEL[section.type] ?? section.type}
                  </span>
                </div>
              </div>
              <span className="text-xs text-neutral-400">{section.estimatedPages} 页</span>
            </div>
          ))}
        </div>
      </section>

      {/* Theme */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-neutral-700">② 风格方向</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTheme(t.value)}
              className={`rounded-xl border p-4 text-left transition-all ${t.accent} ${theme === t.value ? t.accentActive : "opacity-70 hover:opacity-100"}`}
            >
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="mt-1 text-xs opacity-70">{t.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Cover image */}
      {assets.length > 0 && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-neutral-700">③ 封面图</h2>
            <p className="mt-0.5 text-xs text-neutral-400">从已选设计稿中选择一张作为作品集封面</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setCoverId(asset.id)}
                className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                  coverId === asset.id ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400"
                }`}
                style={{ width: 120, height: 80 }}
              >
                <Image
                  src={asset.imageUrl}
                  alt={asset.title}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
                {coverId === asset.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-900">封面</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-neutral-400">
          确认后 AI 将生成约 {estimatedPages} 页的作品集初稿，预计 15–20 秒
        </p>
        <Button onClick={handleConfirmAndRender} disabled={rendering} className="h-10 px-6">
          {rendering ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 生成中，请稍候…</>
          ) : (
            <>确认并开始生成 <ChevronRight className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        scene="full_rewrite"
        projectId={projectId}
        onSuccess={() => {
          setPaywallOpen(false);
          handleConfirmAndRender();
        }}
      />
    </div>
  );
}
