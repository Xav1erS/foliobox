"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link2, ImageIcon, Loader2, Info } from "lucide-react";

const MAX_IMAGES = 20;

type Tab = "figma" | "images";

function isFigmaUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "www.figma.com" || u.hostname === "figma.com";
  } catch {
    return false;
  }
}

export default function NewProjectPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("figma");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Figma
  const [figmaName, setFigmaName] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");

  // Images
  const [imagesName, setImagesName] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setLoading(false);
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    setError("");
    setImageFiles(files);
  }

  async function handleFigmaSubmit() {
    if (!figmaName.trim()) { setError("请输入项目名称"); return; }
    if (!isFigmaUrl(figmaUrl.trim())) { setError("请输入有效的 Figma 链接（https://www.figma.com/...）"); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: figmaName.trim(), sourceType: "FIGMA", sourceUrl: figmaUrl.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "创建失败，请重试");
        return;
      }
      const { project } = await res.json();
      router.push(`/projects/${project.id}/assets`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleImagesSubmit() {
    if (!imagesName.trim()) { setError("请输入项目名称"); return; }
    if (imageFiles.length === 0) { setError("请上传至少一张图片"); return; }

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", imagesName.trim());
      imageFiles.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/projects/import/images", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "上传失败，请重试");
        return;
      }
      const { projectId } = await res.json();
      router.push(`/projects/${projectId}/assets`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">导入项目</h1>
        <p className="mt-1 text-sm text-neutral-500">
          从 Figma 链接或本地截图开始，补充事实后 AI 生成作品集初稿。
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
        {(
          [
            { key: "figma" as Tab, icon: Link2, label: "Figma 链接" },
            { key: "images" as Tab, icon: ImageIcon, label: "上传截图" },
          ] as const
        ).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Figma tab */}
      {tab === "figma" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">项目名称</Label>
              <Input
                value={figmaName}
                onChange={(e) => setFigmaName(e.target.value)}
                placeholder="如：企业数据中台改版"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Figma 文件链接</Label>
              <Input
                type="url"
                value={figmaUrl}
                onChange={(e) => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
              />
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-neutral-50 p-3.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
              <p className="text-xs leading-relaxed text-neutral-400">
                MVP 阶段暂不自动拉取 Figma 帧。下一步会引导你上传设计稿截图，再补充项目事实。
              </p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button
              onClick={handleFigmaSubmit}
              disabled={loading || !figmaName.trim() || !figmaUrl.trim()}
              className="h-11 w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />创建中…</> : "创建项目，下一步 →"}
            </Button>
          </div>
        </div>
      )}

      {/* Images tab */}
      {tab === "images" && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">项目名称</Label>
              <Input
                value={imagesName}
                onChange={(e) => setImagesName(e.target.value)}
                placeholder="如：消费金融 App 账单体验优化"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">上传设计稿截图</Label>
              <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-neutral-400 hover:bg-neutral-100">
                <ImageIcon className="h-6 w-6 text-neutral-300" />
                <span className="text-sm text-neutral-500">
                  {imageFiles.length > 0
                    ? `已选择 ${imageFiles.length} 张图片`
                    : "点击或拖拽上传截图"}
                </span>
                <span className="text-xs text-neutral-400">
                  支持 JPG / PNG，建议 3–15 张（最多 {MAX_IMAGES} 张）
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImagesChange}
                />
              </label>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Button
              onClick={handleImagesSubmit}
              disabled={loading || !imagesName.trim() || imageFiles.length === 0}
              className="h-11 w-full"
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />上传中…</> : `上传 ${imageFiles.length > 0 ? imageFiles.length + " 张图片，" : ""}下一步 →`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
