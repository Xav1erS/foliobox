"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUp, ArrowDown, ImageIcon, Loader2 } from "lucide-react";

interface Asset {
  id: string;
  imageUrl: string;
  title: string;
  selected: boolean;
  sortOrder: number;
  isCover: boolean;
}

interface Props {
  projectId: string;
  sourceType: string;
  initialAssets: Asset[];
}

// Empty state for Figma projects with no assets yet
function FigmaEmptyState({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length > 20) { setError("最多上传 20 张"); return; }
    setError("");
    setFiles(picked);
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      // Re-use the project — we need a different endpoint to add assets to existing project
      formData.append("projectId", projectId);
      files.forEach((f) => formData.append("files", f));

      const res = await fetch(`/api/projects/${projectId}/assets/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "上传失败");
        return;
      }
      router.push(`/projects/${projectId}/assets`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
        <ImageIcon className="h-6 w-6 text-neutral-400" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-neutral-700">
        已记录 Figma 链接，请上传设计稿截图
      </h3>
      <p className="mb-6 text-xs text-neutral-400">
        MVP 阶段暂不自动拉取 Figma 帧，请手动截图上传（JPG/PNG，最多 20 张）
      </p>

      <label className="mx-auto flex h-28 max-w-sm cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-neutral-400">
        <ImageIcon className="h-5 w-5 text-neutral-300" />
        <span className="text-sm text-neutral-400">
          {files.length > 0 ? `已选择 ${files.length} 张` : "点击选择截图"}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleChange}
        />
      </label>

      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

      <Button
        className="mt-4"
        disabled={uploading || files.length === 0}
        onClick={handleUpload}
      >
        {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />上传中…</> : `上传 ${files.length > 0 ? files.length + " 张" : "截图"}`}
      </Button>
    </div>
  );
}

export function AssetsClient({ projectId, sourceType, initialAssets }: Props) {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // No assets yet (Figma project just created)
  if (assets.length === 0) {
    if (sourceType === "FIGMA") {
      return <FigmaEmptyState projectId={projectId} />;
    }
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm text-neutral-500">暂无素材，请返回重新导入。</p>
      </div>
    );
  }

  function toggleSelected(id: string) {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a))
    );
  }

  function setCover(id: string) {
    setAssets((prev) =>
      prev.map((a) => ({ ...a, isCover: a.id === id }))
    );
  }

  function moveUp(index: number) {
    if (index === 0) return;
    setAssets((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((a, i) => ({ ...a, sortOrder: i }));
    });
  }

  function moveDown(index: number) {
    setAssets((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((a, i) => ({ ...a, sortOrder: i }));
    });
  }

  async function handleConfirm() {
    const selected = assets.filter((a) => a.selected);
    if (selected.length === 0) {
      setError("请至少选择一张页面");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assets: assets.map((a) => ({
            id: a.id,
            selected: a.selected,
            sortOrder: a.sortOrder,
            isCover: a.isCover,
          })),
        }),
      });
      if (!res.ok) {
        setError("保存失败，请重试");
        return;
      }
      router.push(`/projects/${projectId}/facts`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = assets.filter((a) => a.selected).length;

  return (
    <div>
      {/* Selection hint */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-neutral-400">
          已选 <span className="font-medium text-neutral-700">{selectedCount}</span> / {assets.length} 张
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setAssets((prev) => prev.map((a) => ({ ...a, selected: true })))}
            className="text-xs text-neutral-500 hover:text-neutral-800"
          >
            全选
          </button>
          <span className="text-neutral-200">|</span>
          <button
            onClick={() => setAssets((prev) => prev.map((a) => ({ ...a, selected: false })))}
            className="text-xs text-neutral-500 hover:text-neutral-800"
          >
            全不选
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className={`group relative overflow-hidden rounded-xl border transition-all ${
              asset.selected
                ? "border-neutral-900 ring-1 ring-neutral-900"
                : "border-neutral-200 opacity-60"
            }`}
          >
            {/* Image */}
            <div className="relative aspect-[4/3] bg-neutral-100">
              <Image
                src={asset.imageUrl}
                alt={asset.title || `页面 ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />

              {/* Checkbox overlay */}
              <button
                onClick={() => toggleSelected(asset.id)}
                className="absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border border-white/80 bg-white/90 shadow-sm backdrop-blur-sm transition-colors"
              >
                {asset.selected && (
                  <svg className="h-3 w-3 text-neutral-900" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Cover badge */}
              {asset.isCover && (
                <span className="absolute bottom-2 left-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
                  封面
                </span>
              )}

              {/* Order number */}
              {asset.selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                  {assets.filter((a) => a.selected).indexOf(asset) + 1}
                </span>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between border-t border-neutral-100 bg-white px-3 py-2">
              <p className="truncate text-xs text-neutral-500">
                {asset.title || `页面 ${index + 1}`}
              </p>
              <div className="flex shrink-0 items-center gap-1">
                {asset.selected && !asset.isCover && (
                  <button
                    onClick={() => setCover(asset.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    设为封面
                  </button>
                )}
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-25"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === assets.length - 1}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-25"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <p className="text-xs text-neutral-400">
            已选 {selectedCount} 张页面将进入作品集
          </p>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={saving || selectedCount === 0}
          className="h-11 px-8"
        >
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中…</>
          ) : (
            <>确认并继续 <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
