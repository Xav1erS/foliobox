"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Link as LinkIcon, ImageIcon } from "lucide-react";

const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGES = 20;

type InputType = "link" | "pdf" | "images";

export default function ScorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [url, setUrl] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  function clearError() {
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

  async function handleSubmit(inputType: InputType) {
    // Validate before setting loading
    if (inputType === "link" && !url.trim()) {
      setError("请输入作品集链接");
      return;
    }
    if (inputType === "pdf" && !pdfFile) {
      setError("请上传 PDF 文件");
      return;
    }
    if (inputType === "images" && imageFiles.length === 0) {
      setError("请上传至少一张截图");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("inputType", inputType);

      if (inputType === "link") {
        formData.append("inputUrl", url.trim());
      } else if (inputType === "pdf") {
        formData.append("file", pdfFile!);
      } else if (inputType === "images") {
        imageFiles.forEach((f) => formData.append("files", f));
      }

      const res = await fetch("/api/scores", { method: "POST", body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "评分失败，请稍后重试");
        return;
      }

      const data = await res.json();
      router.push(`/score/${data.id}`);
    } catch {
      setError("评分失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold">给我的作品集打分</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          上传现有作品集，60 秒获得 8 维度评分报告与改进建议。
        </p>
      </div>

      {/* onValueChange clears error when switching tabs */}
      <Tabs defaultValue="link" onValueChange={clearError}>
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="link">
            <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
            链接
          </TabsTrigger>
          <TabsTrigger value="pdf">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
            截图
          </TabsTrigger>
        </TabsList>

        {/* Link tab */}
        <TabsContent value="link" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">作品集链接</Label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-portfolio.notion.site/..."
              className="h-12"
            />
            <p className="text-xs text-muted-foreground">
              支持 Notion、Behance、个人网站、飞书文档等公开链接
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            onClick={() => handleSubmit("link")}
            disabled={loading || !url.trim()}
            className="h-12 w-full"
          >
            {loading ? "评分中..." : "开始评分"}
          </Button>
        </TabsContent>

        {/* PDF tab */}
        <TabsContent value="pdf" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">上传 PDF 文件</Label>
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 transition-colors hover:bg-muted/40">
              <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {pdfFile ? pdfFile.name : "点击或拖拽上传 PDF"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground/60">最大 20MB</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfChange}
              />
            </label>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            onClick={() => handleSubmit("pdf")}
            disabled={loading || !pdfFile}
            className="h-12 w-full"
          >
            {loading ? "评分中..." : "开始评分"}
          </Button>
        </TabsContent>

        {/* Images tab */}
        <TabsContent value="images" className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">上传作品集截图</Label>
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 transition-colors hover:bg-muted/40">
              <ImageIcon className="mb-2 h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {imageFiles.length > 0
                  ? `已选择 ${imageFiles.length} 张图片`
                  : "点击或拖拽上传截图"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground/60">
                支持 JPG / PNG，建议上传 3–10 张（最多 {MAX_IMAGES} 张）
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
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            onClick={() => handleSubmit("images")}
            disabled={loading || imageFiles.length === 0}
            className="h-12 w-full"
          >
            {loading ? "评分中..." : "开始评分"}
          </Button>
        </TabsContent>
      </Tabs>

      <div className="mt-8 rounded-xl border border-border bg-muted/10 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          🔒 上传内容仅用于本次评分，不会被用于训练或展示给其他用户。
          敏感页面建议在截图前手动打码处理。
        </p>
      </div>
    </div>
  );
}
