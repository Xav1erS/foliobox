"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Link as LinkIcon,
  ImageIcon,
  Loader2,
  X,
  Plus,
  FileText,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CloudUpload,
} from "lucide-react";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";

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
  const [loadingStage, setLoadingStage] = useState<"uploading" | "processing" | "redirecting">("processing");
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState("");
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

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
    if (!loading) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [loading]);

  useEffect(() => {
    if (!loading || loadingStage !== "processing") {
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
  }, [loading, loadingStage, tab]);

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

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPdfSelection(file);
  }

  function dedupeFiles(files: File[]) {
    const seen = new Set<string>();
    return files.filter((file) => {
      const key = `${file.name}-${file.size}-${file.lastModified}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function setImageSelection(files: File[]) {
    if (files.length > MAX_IMAGES) {
      setError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_SCORE_UPLOAD_SIZE) {
      setError("评分入口当前仅支持总大小 20MB 以内的截图，请压缩后重试");
      return;
    }
    setError("");
    setImageFiles(files);
  }

  function appendImageSelection(files: File[]) {
    setImageSelection(dedupeFiles([...imageFiles, ...files]));
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    appendImageSelection(files);
    e.target.value = "";
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
      dedupeFiles([...imageFiles, ...files]).forEach((file) => dataTransfer.items.add(file));
      imageInputRef.current.files = dataTransfer.files;
    }

    appendImageSelection(files);
  }

  function removePdfSelection() {
    setPdfFile(null);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  function removeImageSelection(indexToRemove: number) {
    const nextFiles = imageFiles.filter((_, index) => index !== indexToRemove);
    setImageSelection(nextFiles);
    if (imageInputRef.current) {
      const dataTransfer = new DataTransfer();
      nextFiles.forEach((file) => dataTransfer.items.add(file));
      imageInputRef.current.files = dataTransfer.files;
    }
  }

  function syncImageInput(files: File[]) {
    if (!imageInputRef.current) return;
    const dataTransfer = new DataTransfer();
    files.forEach((file) => dataTransfer.items.add(file));
    imageInputRef.current.files = dataTransfer.files;
  }

  function moveImage(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const nextFiles = [...imageFiles];
    const [movedFile] = nextFiles.splice(fromIndex, 1);
    nextFiles.splice(toIndex, 0, movedFile);
    setImageSelection(nextFiles);
    syncImageInput(nextFiles);
  }

  function handlePreviewDragStart(index: number) {
    setDraggedImageIndex(index);
    setDragOverImageIndex(index);
  }

  function handlePreviewDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    if (dragOverImageIndex !== index) {
      setDragOverImageIndex(index);
    }
  }

  function handlePreviewDrop(index: number) {
    if (draggedImageIndex === null) return;
    moveImage(draggedImageIndex, index);
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
  }

  function clearPreviewDragState() {
    setDraggedImageIndex(null);
    setDragOverImageIndex(null);
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
    setLoadingStage(tab === "link" ? "processing" : "uploading");
    setError("");
    let shouldResetLoading = true;

    try {
      if (tab === "link") {
        const formData = new FormData();
        formData.append("inputType", "link");
        formData.append("inputUrl", url.trim());
        const res = await fetch("/api/scores", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "评分失败，请稍后重试");
          return;
        }
        const data = await res.json();
        shouldResetLoading = false;
        setLoadingStage("redirecting");
        router.prefetch(`/score/${data.id}`);
        router.push(`/score/${data.id}`);
        return;
      }

      if (tab === "pdf" && pdfFile) {
        setLoadingStage("uploading");
        const [uploadedFile] = await uploadFilesFromBrowser({
          files: [pdfFile],
          folder: "score-inputs",
          kind: "score-pdf",
        });

        setLoadingStage("processing");
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputType: "pdf",
            file: uploadedFile,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "评分失败，请稍后重试");
          return;
        }
        const data = await res.json();
        shouldResetLoading = false;
        setLoadingStage("redirecting");
        router.prefetch(`/score/${data.id}`);
        router.push(`/score/${data.id}`);
        return;
      }

      setLoadingStage("uploading");
      const uploadedFiles = await uploadFilesFromBrowser({
        files: imageFiles,
        folder: "score-inputs",
        kind: "score-image",
      });

      setLoadingStage("processing");
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "images",
          files: uploadedFiles,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "评分失败，请稍后重试");
        return;
      }
      const data = await res.json();
      shouldResetLoading = false;
      setLoadingStage("redirecting");
      router.prefetch(`/score/${data.id}`);
      router.push(`/score/${data.id}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("client token")) {
        setError("上传初始化失败，请稍后重试。如果持续失败，说明线上上传配置还未生效。");
      } else {
        setError("上传或评分失败，请稍后重试");
      }
    } finally {
      if (shouldResetLoading) {
        setLoading(false);
        setLoadingStage("processing");
      }
    }
  }

  const canSubmit =
    !loading &&
    ((tab === "link" && url.trim()) ||
      (tab === "pdf" && pdfFile) ||
      (tab === "images" && imageFiles.length > 0));
  const isRedirecting = loading && loadingStage === "redirecting";
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
  const loadingTitle =
    loadingStage === "uploading" ? "正在上传评分材料" : "正在生成评分结果";
  const resolvedLoadingTitle =
    loadingStage === "redirecting" ? "正在打开评分结果" : loadingTitle;
  const loadingDescription =
    loadingStage === "uploading"
      ? "我们正在把文件上传到安全存储。10MB 左右的 PDF 或多张截图通常需要 10–30 秒。"
      : "我们正在按 8 个维度整理这份作品集的简版评分结果，完成后会直接进入聚焦结果页继续下一步。";
  const resolvedLoadingDescription =
    loadingStage === "redirecting"
      ? "评分结果已经生成，正在进入结果页。请保持当前页面，不需要再次点击。"
      : loadingDescription;
  const loadingHint =
    loadingStage === "uploading"
      ? "如果等待超过 30 秒仍无进展，可以关闭后重试。若持续失败，通常是线上上传配置未生效。"
      : processingDescription;
  const resolvedLoadingHint =
    loadingStage === "redirecting"
      ? "如果超过几秒仍未跳转，通常是网络较慢或结果页正在加载。"
      : loadingHint;
  const resolvedInputSummary =
    loadingStage === "redirecting"
      ? "评分结果已生成，正在切换到结果页"
      : inputSummary;
  const loadingStageToneClassName =
    loadingStage === "uploading"
      ? "border-sky-400/15 bg-sky-400/8 text-sky-100/85"
      : loadingStage === "redirecting"
        ? "border-emerald-400/15 bg-emerald-400/8 text-emerald-100/85"
        : "border-amber-400/15 bg-amber-400/8 text-amber-100/85";
  const loadingStageLabel =
    loadingStage === "uploading"
      ? "文件传输中"
      : loadingStage === "redirecting"
        ? "结果已完成"
        : "结构分析中";
  const loadingStageAccentClassName =
    loadingStage === "uploading"
      ? "bg-sky-300"
      : loadingStage === "redirecting"
        ? "bg-emerald-300"
        : "bg-amber-300";
  const totalImageSize = imageFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <>
      <main
        className={`flex min-h-screen flex-col items-center px-6 pb-20 pt-28 transition-all duration-300 ${
          loadingStage === "redirecting" ? "scale-[0.99] opacity-40" : loading ? "opacity-60" : "opacity-100"
        }`}
      >
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
                  disabled={loading}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
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
                    {pdfFile ? "已选择 1 个 PDF 文件" : "点击或拖拽上传 PDF"}
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
                {pdfFile ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                          <FileText className="h-4 w-4 text-white/50" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white/75">{pdfFile.name}</p>
                          <p className="mt-1 text-xs text-white/35">{formatBytes(pdfFile.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removePdfSelection}
                        disabled={loading}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition-colors hover:border-white/20 hover:text-white/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
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
                    {imageFiles.length > 0 ? `已选择 ${imageFiles.length} 张图片` : "点击或拖拽上传截图"}
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-white/35">
                        共 {imageFiles.length} 张，当前总大小 {formatBytes(totalImageSize)}
                      </p>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        继续添加
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {imagePreviewUrls.map((previewUrl, index) => (
                        <div
                          key={`${previewUrl}-${index}`}
                          draggable
                          onDragStart={() => handlePreviewDragStart(index)}
                          onDragOver={(e) => handlePreviewDragOver(e, index)}
                          onDrop={() => handlePreviewDrop(index)}
                          onDragEnd={clearPreviewDragState}
                          className={`min-w-[180px] overflow-hidden rounded-xl border bg-white/[0.03] transition-all ${
                            dragOverImageIndex === index
                              ? "border-white/35 ring-1 ring-white/20"
                              : "border-white/10"
                          } ${draggedImageIndex === index ? "opacity-70" : ""}`}
                        >
                          <div className="aspect-[4/3] bg-white/[0.04]">
                            <img
                              src={previewUrl}
                              alt={`作品集截图 ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="border-t border-white/10 px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs text-white/70">
                                  第 {index + 1} 张 · {imageFiles[index]?.name}
                                </p>
                                <p className="mt-1 text-[11px] text-white/35">
                                  {formatBytes(imageFiles[index]?.size ?? 0)}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImageSelection(index)}
                                disabled={loading}
                                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-white/45 transition-colors hover:border-white/20 hover:text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/30">
                      可直接拖拽缩略图调整顺序，系统会按当前顺序理解整组截图。
                    </p>
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
                  {isRedirecting ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isRedirecting
                    ? "评分结果已生成"
                    : `${activeSteps[Math.max(processingStep - 1, 0)]}…`}
                </>
              ) : (
                "开始评分"
              )}
            </button>
            {isRedirecting ? (
              <p className="mt-3 text-center text-xs text-emerald-200/75">
                正在自动跳转到结果页，请勿重复提交。
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-white/25" style={{ maxWidth: 440 }}>
          上传内容仅用于本次评分，不会用于训练或展示给其他用户。
          敏感内容建议截图前手动打码处理。
        </p>
      </main>

      {loading ? (
        <div
          className={`fixed inset-0 z-[70] flex items-center justify-center px-6 backdrop-blur-sm transition-colors duration-300 ${
            loadingStage === "redirecting" ? "bg-black/92" : "bg-black/85"
          }`}
        >
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${loadingStageToneClassName}`}>
              {loadingStage === "uploading" ? (
                <CloudUpload className="h-7 w-7 text-sky-100" />
              ) : loadingStage === "redirecting" ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-100" />
              ) : (
                <Sparkles className="h-7 w-7 text-amber-100" />
              )}
            </div>
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/35">Focus</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{resolvedLoadingTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">{resolvedLoadingDescription}</p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs text-white/40">{resolvedInputSummary}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium ${loadingStageToneClassName}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${loadingStageAccentClassName}`} />
                  {loadingStageLabel}
                </span>
              </div>
              {loadingStage === "uploading" ? (
                <div className="mt-4 space-y-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-sky-300" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-sky-300/40 bg-sky-300/10 text-[11px] text-sky-100">
                      1
                    </span>
                    <span className="text-sm text-white/75">上传评分材料</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[11px] text-white/35">
                      2
                    </span>
                    <span className="text-sm text-white/35">上传完成后开始正式评分</span>
                  </div>
                </div>
              ) : loadingStage === "redirecting" ? (
                <div className="mt-4 space-y-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-full rounded-full bg-emerald-300" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300 text-black">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-white/75">评分结果已生成</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-300/10 text-[11px] text-emerald-100">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm text-white/75">正在进入结果页</span>
                  </div>
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/8 px-3 py-2 text-xs leading-5 text-emerald-100/85">
                    不需要再次点击按钮，页面会自动进入这次评分结果。
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">接下来</p>
                    <p className="mt-2 text-sm text-white/75">我们会先打开评分结果页，再从结果里引导你进入下一步整理。</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-300 transition-all"
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
                </>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/40">{resolvedLoadingHint}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
