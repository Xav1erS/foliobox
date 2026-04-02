"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/marketing/Navbar";
import { Upload, Link as LinkIcon, ImageIcon, Loader2 } from "lucide-react";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 20;

type Tab = "link" | "pdf" | "images";

export default function ScorePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_PDF_SIZE) {
      setError("文件不能超过 20MB");
      return;
    }
    setError("");
    setPdfFile(file);
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

  async function handleSubmit() {
    if (tab === "link" && !url.trim()) { setError("请输入作品集链接"); return; }
    if (tab === "pdf" && !pdfFile) { setError("请上传 PDF 文件"); return; }
    if (tab === "images" && imageFiles.length === 0) { setError("请上传至少一张截图"); return; }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("inputType", tab);
      if (tab === "link") formData.append("inputUrl", url.trim());
      else if (tab === "pdf") formData.append("file", pdfFile!);
      else imageFiles.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/scores", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "评分失败，请稍后重试");
        return;
      }
      const data = await res.json();
      router.push(`/score/${data.id}`);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    ((tab === "link" && url.trim()) ||
      (tab === "pdf" && pdfFile) ||
      (tab === "images" && imageFiles.length > 0));

  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center px-6 pb-20 pt-28">
        {/* Header */}
        <div className="mb-10 text-center" style={{ maxWidth: 560 }}>
          <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
            作品集评分
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            给我的作品集打分
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            上传现有作品集，AI 按 8 个维度出具评分报告，
            <br className="hidden sm:block" />
            60 秒内看到问题所在与改进建议。
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03]"
          style={{ maxWidth: 560 }}
        >
          {/* Tabs */}
          <div className="flex border-b border-white/[0.08]">
            {(
              [
                { key: "link" as Tab, icon: LinkIcon, label: "链接" },
                { key: "pdf" as Tab, icon: Upload, label: "PDF" },
                { key: "images" as Tab, icon: ImageIcon, label: "截图" },
              ] as const
            ).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? "border-b-2 border-white text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
                style={{ marginBottom: tab === key ? -1 : 0 }}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === "link" && (
              <div className="space-y-3">
                <label className="block text-xs text-white/45">作品集链接</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="https://your-portfolio.notion.site/..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25 focus:bg-white/[0.06] transition-colors"
                />
                <p className="text-xs text-white/35">
                  支持 Notion、Behance、个人网站、飞书文档等公开链接
                </p>
              </div>
            )}

            {tab === "pdf" && (
              <div className="space-y-3">
                <label className="block text-xs text-white/45">上传 PDF 文件</label>
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] transition-colors hover:border-white/25 hover:bg-white/[0.04]">
                  <Upload className="h-5 w-5 text-white/30" />
                  <span className="text-sm text-white/50">
                    {pdfFile ? pdfFile.name : "点击或拖拽上传 PDF"}
                  </span>
                  <span className="text-xs text-white/25">最大 20MB</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={handlePdfChange} />
                </label>
              </div>
            )}

            {tab === "images" && (
              <div className="space-y-3">
                <label className="block text-xs text-white/45">上传作品集截图</label>
                <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] transition-colors hover:border-white/25 hover:bg-white/[0.04]">
                  <ImageIcon className="h-5 w-5 text-white/30" />
                  <span className="text-sm text-white/50">
                    {imageFiles.length > 0
                      ? `已选择 ${imageFiles.length} 张图片`
                      : "点击或拖拽上传截图"}
                  </span>
                  <span className="text-xs text-white/25">
                    支持 JPG / PNG，建议 3–10 张（最多 {MAX_IMAGES} 张）
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImagesChange}
                  />
                </label>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AI 评分中，请稍候…
                </>
              ) : (
                "开始评分"
              )}
            </button>
          </div>
        </div>

        {/* Privacy note */}
      <p className="mt-6 text-center text-xs text-white/25" style={{ maxWidth: 440 }}>
          上传内容仅用于本次评分，不会用于训练或展示给其他用户。
          敏感内容建议截图前手动打码处理。
        </p>
      </main>

      {loading ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/35">Focus</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">正在生成评分结果</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              我们正在按 8 个维度整理这份作品集的简版评分结果，完成后会直接进入聚焦结果页继续下一步。
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
