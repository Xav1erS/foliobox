"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Link2, Printer, Check } from "lucide-react";
import type { Block, Page, DraftContentJson } from "./page";
import { useEntitlement } from "@/hooks/useEntitlement";
import { PaywallModal } from "@/components/billing/PaywallModal";

interface Asset {
  id: string;
  imageUrl: string;
  title: string;
}

interface Props {
  draftId: string;
  projectId: string;
  projectName: string;
  initialContentJson: DraftContentJson;
  assets: Asset[];
}

// Build a lookup map for assets
function useAssetMap(assets: Asset[]) {
  const map: Record<string, Asset> = {};
  for (const a of assets) map[a.id] = a;
  return map;
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  as: Tag = "p",
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  as?: "p" | "h1" | "h2" | "h3" | "span";
  className?: string;
  placeholder?: string;
}) {
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onChange(e.currentTarget.textContent ?? "")}
      className={`-mx-1 px-1 outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-1 empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300 ${className ?? ""}`}
      data-placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function HeroBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-2 border border-neutral-900 bg-neutral-900 px-8 py-10 text-white">
      <EditableText
        as="h1"
        value={String(data.title ?? "")}
        onChange={(v) => onChange({ ...data, title: v })}
        className="text-2xl font-bold text-white"
        placeholder="项目标题"
      />
      <EditableText
        value={String(data.subtitle ?? "")}
        onChange={(v) => onChange({ ...data, subtitle: v })}
        className="text-sm text-white/60"
        placeholder="副标题"
      />
    </div>
  );
}

function SectionHeadingBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <EditableText
      as="h2"
      value={String(data.text ?? "")}
      onChange={(v) => onChange({ ...data, text: v })}
      className="text-lg font-semibold text-neutral-900 border-b border-neutral-200 pb-2"
      placeholder="章节标题"
    />
  );
}

function RichTextBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <EditableText
      value={String(data.text ?? "")}
      onChange={(v) => onChange({ ...data, text: v })}
      className="text-sm leading-relaxed text-neutral-700"
      placeholder="正文内容…"
    />
  );
}

function BulletListBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const items = (data.items as string[]) ?? [];
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-neutral-400" />
          <EditableText
            value={item}
            onChange={(v) => {
              const next = [...items];
              next[i] = v;
              onChange({ ...data, items: next });
            }}
            className="text-sm text-neutral-700"
            placeholder="条目"
          />
        </li>
      ))}
    </ul>
  );
}

function StatGroupBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  const stats = (data.stats as { value: string; label: string }[]) ?? [];
  return (
    <div className="flex flex-wrap gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="text-center">
          <EditableText
            as="h3"
            value={stat.value}
            onChange={(v) => {
              const next = [...stats];
              next[i] = { ...next[i], value: v };
              onChange({ ...data, stats: next });
            }}
            className="text-2xl font-bold text-neutral-900"
            placeholder="数值"
          />
          <EditableText
            value={stat.label}
            onChange={(v) => {
              const next = [...stats];
              next[i] = { ...next[i], label: v };
              onChange({ ...data, stats: next });
            }}
            className="text-xs text-neutral-500"
            placeholder="标签"
          />
        </div>
      ))}
    </div>
  );
}

function ImageSingleBlock({ data, assetMap }: { data: Record<string, unknown>; assetMap: Record<string, Asset> }) {
  const asset = assetMap[String(data.assetId ?? "")];
  if (!asset) return <div className="flex h-48 items-center justify-center border border-neutral-300 bg-neutral-100 text-xs text-neutral-400">图片未找到</div>;
  return (
    <div className="relative overflow-hidden border border-neutral-300">
      <Image src={asset.imageUrl} alt={String(data.alt ?? asset.title)} width={800} height={500} className="w-full object-cover" />
    </div>
  );
}

function ImageGridBlock({ data, assetMap }: { data: Record<string, unknown>; assetMap: Record<string, Asset> }) {
  const ids = (data.assetIds as string[]) ?? [];
  const cols = data.layout === "3-col" ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={`grid gap-2 ${cols}`}>
      {ids.map((assetId) => {
        const asset = assetMap[assetId];
        if (!asset) return <div key={assetId} className="h-32 border border-neutral-300 bg-neutral-100" />;
        return (
          <div key={assetId} className="relative overflow-hidden border border-neutral-300">
            <Image src={asset.imageUrl} alt={asset.title} width={400} height={250} className="w-full object-cover" />
          </div>
        );
      })}
    </div>
  );
}

function CaptionBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <EditableText
      value={String(data.text ?? "")}
      onChange={(v) => onChange({ ...data, text: v })}
      className="text-center text-xs text-neutral-400 italic"
      placeholder="图注"
    />
  );
}

function QuoteBlock({ data, onChange }: { data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void }) {
  return (
    <blockquote className="border-l-4 border-neutral-300 pl-4">
      <EditableText
        value={String(data.text ?? "")}
        onChange={(v) => onChange({ ...data, text: v })}
        className="text-sm italic text-neutral-600"
        placeholder="引用内容"
      />
      {data.author !== undefined && (
        <EditableText
          value={String(data.author ?? "")}
          onChange={(v) => onChange({ ...data, author: v })}
          className="mt-1 text-xs text-neutral-400"
          placeholder="来源"
        />
      )}
    </blockquote>
  );
}

function BlockRenderer({
  block,
  assetMap,
  onChange,
}: {
  block: Block;
  assetMap: Record<string, Asset>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const { type, data } = block;
  switch (type) {
    case "hero": return <HeroBlock data={data} onChange={onChange} />;
    case "section_heading": return <SectionHeadingBlock data={data} onChange={onChange} />;
    case "rich_text": return <RichTextBlock data={data} onChange={onChange} />;
    case "bullet_list": return <BulletListBlock data={data} onChange={onChange} />;
    case "stat_group": return <StatGroupBlock data={data} onChange={onChange} />;
    case "image_single": return <ImageSingleBlock data={data} assetMap={assetMap} />;
    case "image_grid": return <ImageGridBlock data={data} assetMap={assetMap} />;
    case "caption": return <CaptionBlock data={data} onChange={onChange} />;
    case "quote": return <QuoteBlock data={data} onChange={onChange} />;
    case "divider": return <hr className="border-neutral-200" />;
    case "closing": return <p className="text-center text-sm text-neutral-400">— 感谢阅读 —</p>;
    default: return <div className="text-xs text-neutral-400">未知 block 类型：{type}</div>;
  }
}

// ─── Publish Modal ────────────────────────────────────────────────────────────

function PublishModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`;
  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm border border-neutral-300 bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-neutral-900">作品集已发布</h2>
        <p className="mb-4 text-xs text-neutral-500">分享以下链接给招聘方，无需登录即可查看。</p>
        <div className="mb-4 flex items-center gap-2 border border-neutral-300 bg-neutral-50 px-3 py-2.5">
          <span className="flex-1 truncate text-xs text-neutral-700">{url}</span>
          <button
            onClick={copy}
            className="shrink-0 text-xs font-medium text-neutral-900 hover:text-neutral-600"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : "复制"}
          </button>
        </div>
        <Button onClick={onClose} variant="outline" className="h-9 w-full rounded-none border-neutral-300 bg-white hover:bg-neutral-100">关闭</Button>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function EditorClient({ draftId, projectId, projectName, initialContentJson, assets }: Props) {
  const router = useRef(null);
  const assetMap = useAssetMap(assets);
  const [pages, setPages] = useState<Page[]>(initialContentJson?.pages ?? []);
  const [activePage, setActivePage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const [paywallScene, setPaywallScene] = useState<"pdf_export" | "publish_link" | null>(null);
  const { planType } = useEntitlement();

  const updateBlock = useCallback((pageIdx: number, blockIdx: number, newData: Record<string, unknown>) => {
    setPages((prev) => {
      const next = prev.map((p, pi) =>
        pi !== pageIdx ? p : {
          ...p,
          blocks: p.blocks.map((b, bi) => bi !== blockIdx ? b : { ...b, data: newData }),
        }
      );
      return next;
    });
    setSavedAt(null);
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/drafts/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: { pages } }),
      });
      if (!res.ok) throw new Error("保存失败");
      setSavedAt(new Date());
    } catch {
      setSaveError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (planType === "FREE") {
      setPaywallScene("publish_link");
      return;
    }
    setPublishing(true);
    try {
      // Save first
      await fetch(`/api/drafts/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: { pages } }),
      });
      const res = await fetch(`/api/drafts/${draftId}/publish`, { method: "POST" });
      if (!res.ok) throw new Error("发布失败");
      const { slug } = await res.json();
      setPublishedSlug(slug);
    } catch {
      setSaveError("发布失败，请重试");
    } finally {
      setPublishing(false);
    }
  }

  function handlePrint() {
    if (planType === "FREE") {
      setPaywallScene("pdf_export");
      return;
    }
    window.open(`/projects/${projectId}/print?did=${draftId}`, "_blank");
  }

  const currentPage = pages[activePage];

  return (
    <div className="flex h-screen flex-col bg-neutral-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-300 bg-white/92 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-900">{projectName}</span>
          <span className="text-neutral-300">·</span>
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          {savedAt && !saveError && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" />已保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving} className="h-8 rounded-none border-neutral-300 bg-white px-3 text-xs hover:bg-neutral-100">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1.5">{saving ? "保存中…" : "保存"}</span>
          </Button>
          <Button variant="outline" onClick={handlePublish} disabled={publishing} className="h-8 rounded-none border-neutral-300 bg-white px-3 text-xs hover:bg-neutral-100">
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            <span className="ml-1.5">{publishing ? "发布中…" : "发布在线链接"}</span>
          </Button>
          <Button variant="outline" onClick={handlePrint} className="h-8 rounded-none border-neutral-300 bg-white px-3 text-xs hover:bg-neutral-100">
            <Printer className="h-3.5 w-3.5" />
            <span className="ml-1.5">导出 PDF</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-neutral-300 bg-white/92 backdrop-blur-sm">
          <div className="p-3">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">页面</p>
            <div className="space-y-0.5">
              {pages.map((page, i) => (
                <button
                  key={page.id}
                  onClick={() => setActivePage(i)}
                  className={`w-full border px-3 py-2 text-left text-xs transition-colors ${
                    activePage === i
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-transparent bg-transparent text-neutral-600 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <span className="mr-2 font-mono text-[10px] opacity-50">{String(i + 1).padStart(2, "0")}</span>
                  {page.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {currentPage ? (
            <div className="mx-auto max-w-2xl">
              <p className="mb-4 text-xs font-medium text-neutral-400">{currentPage.title}</p>
              <div className="space-y-4">
                {currentPage.blocks.map((block, bi) => (
                  <div key={block.id} className="border border-neutral-300 bg-white/9 p-5 backdrop-blur-sm">
                    <BlockRenderer
                      block={block}
                      assetMap={assetMap}
                      onChange={(newData) => updateBlock(activePage, bi, newData)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              请从左侧选择一个页面
            </div>
          )}
        </main>
      </div>

      {publishedSlug && (
        <PublishModal slug={publishedSlug} onClose={() => setPublishedSlug(null)} />
      )}
      {paywallScene && (
        <PaywallModal
          open
          onClose={() => setPaywallScene(null)}
          scene={paywallScene}
          projectId={projectId}
          draftId={draftId}
          onSuccess={() => {
            setPaywallScene(null);
            if (paywallScene === "pdf_export") {
              window.open(`/projects/${projectId}/print?did=${draftId}`, "_blank");
            } else {
              handlePublish();
            }
          }}
        />
      )}
    </div>
  );
}
