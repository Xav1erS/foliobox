"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Link as LinkIcon, ImageIcon, Loader2 } from "lucide-react";

const MAX_SCORE_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 20;

type Tab = "link" | "pdf" | "images";

const PROCESSING_STEPS: Record<Tab, string[]> = {
  link: ["校验链接", "理解站点结构", "生成评分结果"],
  pdf: ["校验文件", "扫描整份 PDF", "生成评分结果"],
  images: ["校验截图", "理解整体顺序", "生成评分结果"],
};

export function ScoreClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState("");
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);

  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const previewUrls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls(previewUrls);

    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    if (!loading) {
      setProcessingStep(0);
      return;
    }

    setProcessingStep(1);
    let currentStep = 1;
    const steps = PROCESSING_STEPS[tab];
    const timer = window.setInterval(() => {
      currentStep = Math.min(currentStep + 1, steps.length);
      setProcessingStep(currentStep);
      if (currentStep >= steps.length) {
        window.clearInterval(timer);
      }
    }, 1600);

    return () => window.clearInterval(timer);
  }, [loading, tab]);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
  }

  function setPdfSelection(file: File | null) {
    if (file && file.size > MAX_SCORE_UPLOAD_SIZE) {
      setError("评分入口当前仅支持 20MB 以内的 PDF，请压缩后重试");
      setPdfFile(null);
      return;
    }
    setError("");
    setPdfFile(file);
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPdfSelection(file);
  }

  function setImageSelection(files: File[]) {
    if (files.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      setImageFiles([]);
      return;
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_SCORE_UPLOAD_SIZE) {
      setError("评分入口当前仅支持总大小 20MB 以内的截图，请压缩后重试");
      setImageFiles([]);
      return;
    }
    setError("");
    setImageFiles(files);
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setImageSelection(files);
  }

  function handlePdfDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(true);
  }

  function handlePdfDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);
  }

  function handlePdfDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPdf(false);

    const file = Array.from(e.dataTransfer.files).find(
      (item) => item.type === "application/pdf" || item.name.toLowerCase().endsWith(".pdf")
    );
    if (!file) {
      setError("请拖入 PDF 文件");
      return;
    }

    if (pdfInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      pdfInputRef.current.files = dataTransfer.files;
    }

    setPdfSelection(file);
  }

  function handleImagesDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(true);
  }

  function handleImagesDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);
  }

  function handleImagesDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length === 0) {
      setError("请拖入 JPG / PNG / WebP 图片");
      return;
    }

    if (imageInputRef.current) {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      imageInputRef.current.files = dataTransfer.files;
    }

    setImageSelection(files);
  }

  async function handleSubmit() {
    if (tab === "link" && !url.trim()) {
      setError("请输入作品集链接");
      return;
    }
    if (tab === "pdf" && !pdfFile) {
      setError("请上传 PDF 文件");
      return;
    }
    if (tab === "images" && imageFiles.length === 0) {
      setError("请上传至少一张截图");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("inputType", tab);
      if (tab === "link") {
        formData.append("inputUrl", url.trim());
      } else if (tab === "pdf" && pdfFile) {
        formData.append("file", pdfFile);
      } else {
        imageFiles.forEach((f) => formData.append("files", f));
      }

      const res = await fetch("/api/scores", { method: "POST", body: formData });
      if (!res.ok) {
        if (res.status === 413) {
          setError("上传内容过大。评分入口当前仅支持 20MB 以内的 PDF 或截图总大小");
          return;
        }
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
  const activeSteps = PROCESSING_STEPS[tab];
  const inputSummary =
    tab === "link"
      ? "当前会优先扫描同域页面结构"
      : tab === "pdf"
        ? pdfFile
          ? `${pdfFile.name} · 将先扫描整份 PDF，再补充关键视觉页`
          : "当前会先扫描整份 PDF，再补充关键视觉页"
        : imageFiles.length > 0
          ? `共 ${imageFiles.length} 张截图 · 将按上传顺序整体理解`
          : "当前会按上传顺序整体理解所有截图";
  const processingDescription =
    tab === "pdf"
      ? "页数较多的 PDF 会稍慢一些，但系统不会默认只判断前几页。"
      : tab === "link"
        ? "我们会先理解整站结构，再整理成可评分的摘要。"
        : "我们会先理解整体顺序，再按 8 个维度生成评分结果。";

  return (
    <>
      <main className="flex min-h-screen flex-col items-center px-6 pb-20 pt-28">
        <div className="mb-10 text-center" style={{ maxWidth: 560 }}>
          <p className="mb-3 text-xs uppercase tracking-widest text-white/35">
            作品集评分
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
            给我的作品集打分
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/55">
            上传现有作品集，系统会先理解整份输入结构，再按 8 个维度出具评分报告，
            <br className="hidden sm:block" />
            不默认只判断前几页内容。
          </p>
        </div>

        <div
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03]"
          style={{ maxWidth: 560 }}
        >
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
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.06]"
                />
                <p className="text-xs text-white/35">
                  支持 Notion、Behance、个人网站、飞书文档等公开链接；系统会优先理解整站结构，而不是只抓首页。
                </p>
              </div>
            )}

            {tab === "pdf" && (
              <div className="space-y-3">
                <label className="block text-xs text-white/45">上传 PDF 文件</label>
                <label
                  onDragOver={handlePdfDragOver}
                  onDragLeave={handlePdfDragLeave}
                  onDrop={handlePdfDrop}
                  className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white/[0.02] transition-colors ${
                    isDraggingPdf
                      ? "border-white/45 bg-white/[0.08]"
                      : "border-white/15 hover:border-white/25 hover:bg-white/[0.04]"
                  }`}
                >
                  <Upload className="h-5 w-5 text-white/30" />
                  <span className="text-sm text-white/50">
                    {pdfFile ? pdfFile.name : "点击或拖拽上传 PDF"}
                  </span>
                  <span className="text-xs text-white/25">支持最大 20MB</span>
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handlePdfChange}
                  />
                </label>
                <p className="text-xs text-white/30">
                  上传成功后会先扫描整份 PDF 的结构，再生成评分结果，不默认只看前几页。
                </p>
              </div>
            )}

            {tab === "images" && (
              <div className="space-y-3">
                <label className="block text-xs text-white/45">上传作品集截图</label>
                <label
                  onDragOver={handleImagesDragOver}
                  onDragLeave={handleImagesDragLeave}
                  onDrop={handleImagesDrop}
                  className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-white/[0.02] transition-colors ${
                    isDraggingImages
                      ? "border-white/45 bg-white/[0.08]"
                      : "border-white/15 hover:border-white/25 hover:bg-white/[0.04]"
                  }`}
                >
                  <ImageIcon className="h-5 w-5 text-white/30" />
                  <span className="text-sm text-white/50">
                    {imageFiles.length > 0
                      ? `已选择 ${imageFiles.length} 张图片`
                      : "点击或拖拽上传截图"}
                  </span>
                  <span className="text-xs text-white/25">
                    支持 JPG / PNG，建议 3–10 张，最多 20 张，总大小 20MB 以内
                  </span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImagesChange}
                  />
                </label>
                {imagePreviewUrls.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {imagePreviewUrls.map((previewUrl, index) => (
                      <div
                        key={`${previewUrl}-${index}`}
                        className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]"
                      >
                        <div className="aspect-[3/4] bg-white/[0.04]">
                          <img
                            src={previewUrl}
                            alt={`作品集截图 ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="border-t border-white/10 px-2 py-1 text-[10px] text-white/45">
                          第 {index + 1} 张
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-white/30">
                  截图会按上传顺序整体理解；如果总大小超过 20MB，建议先压缩后再评分。
                </p>
              </div>
            )}

            {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {activeSteps[Math.max(processingStep - 1, 0)]}…
                </>
              ) : (
                "开始评分"
              )}
            </button>
          </div>
        </div>

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
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
              <p className="text-xs text-white/40">{inputSummary}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${(processingStep / activeSteps.length) * 100}%` }}
                />
              </div>
              <div className="mt-4 space-y-3">
                {activeSteps.map((step, index) => {
                  const state =
                    index + 1 < processingStep
                      ? "done"
                      : index + 1 === processingStep
                        ? "active"
                        : "pending";
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                          state === "done"
                            ? "bg-white text-black"
                            : state === "active"
                              ? "border border-white/30 bg-white/10 text-white"
                              : "border border-white/10 bg-white/[0.03] text-white/35"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`text-sm ${
                          state === "pending" ? "text-white/35" : "text-white/75"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/40">{processingDescription}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
