"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageIcon, Info, Link2, Loader2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InlineTip } from "@/components/app/InlineTip";
import { PageHeader } from "@/components/app/PageHeader";
import { ProgressHint } from "@/components/app/ProgressHint";
import { SectionCard } from "@/components/app/SectionCard";
import { StickyActionBar } from "@/components/app/StickyActionBar";

const MAX_IMAGES = 20;
const STEP_TOTAL = 3;
const TAG_OPTIONS = ["B 端", "C 端", "Web", "App"];

type Method = "figma" | "images";

function isFigmaUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "www.figma.com" || parsed.hostname === "figma.com";
  } catch {
    return false;
  }
}

export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method>("figma");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [projectName, setProjectName] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const canGoStep2 = !!method;
  const canGoStep3 =
    projectName.trim().length > 0 &&
    (method === "figma" ? isFigmaUrl(figmaUrl.trim()) : imageFiles.length > 0);

  const summary = useMemo(() => {
    return {
      methodLabel: method === "figma" ? "Figma 链接导入" : "截图上传导入",
      sourceText:
        method === "figma"
          ? figmaUrl.trim() || "未填写"
          : imageFiles.length > 0
          ? `已选择 ${imageFiles.length} 张图片`
          : "未上传",
    };
  }, [method, figmaUrl, imageFiles.length]);
  const fromScore = searchParams.get("from") === "score";
  const scoreId = searchParams.get("sid");

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
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
    if (!projectName.trim()) {
      setError("请输入项目名称");
      return;
    }

    if (method === "figma" && !isFigmaUrl(figmaUrl.trim())) {
      setError("请输入有效的 Figma 链接（https://www.figma.com/...）");
      return;
    }

    if (method === "images" && imageFiles.length === 0) {
      setError("请上传至少一张图片");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (method === "figma") {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: projectName.trim(),
            sourceType: "FIGMA",
            sourceUrl: figmaUrl.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "创建失败，请重试");
          return;
        }

        const { project } = await res.json();
        router.push(`/projects/${project.id}/assets`);
        return;
      }

      const formData = new FormData();
      formData.append("name", projectName.trim());
      imageFiles.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/projects/import/images", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "上传失败，请重试");
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
    <div className="mx-auto max-w-5xl px-6 py-10">
      <PageHeader
        eyebrow="Import"
        title="导入项目"
        description="先选择导入方式，再补充最小项目信息，最后进入素材确认页继续整理作品集。"
      />

      {fromScore ? (
        <div className="mt-6">
          <InlineTip>
            你是从评分结果进入这里的。下一步建议先导入一个真实项目，再把这次评分里提到的问题带入后续整理流程。
            {scoreId ? " 当前评分结果会保留在工作台里，后面可以随时回看。" : ""}
          </InlineTip>
        </div>
      ) : null}

      <div className="mt-6">
        <ProgressHint current={step} total={STEP_TOTAL} label="导入向导" />
      </div>

      <div className="mt-8 space-y-6 pb-28">
        {step === 1 ? (
          <SectionCard
            title="Step 1 · 选择导入方式"
            description="先确认你是从 Figma 链接开始，还是已经准备好了本地截图。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("figma")}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  method === "figma"
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <Link2 className="h-5 w-5 text-neutral-900" />
                <p className="mt-4 text-base font-semibold text-neutral-900">Figma 链接</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  适合项目还在 Figma 里，先保存链接，再进入素材确认页补充关键截图。
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMethod("images")}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  method === "images"
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <ImageIcon className="h-5 w-5 text-neutral-900" />
                <p className="mt-4 text-base font-semibold text-neutral-900">上传截图</p>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  适合你已经有项目截图，上传后可以更快进入素材确认与页面选择流程。
                </p>
              </button>
            </div>
          </SectionCard>
        ) : null}

        {step === 2 ? (
          <SectionCard
            title="Step 2 · 填写最小项目信息"
            description="这里只收集当前版本最必要的信息，目的是让你顺利进入后续整理流程，而不是一次填完全部资料。"
          >
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-500">项目名称</Label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="如：企业数据中台改版"
                />
              </div>

              {method === "figma" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-500">Figma 文件链接</Label>
                  <Input
                    type="url"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                    placeholder="https://www.figma.com/file/..."
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-neutral-500">上传设计稿截图</Label>
                  <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-neutral-400 hover:bg-neutral-100">
                    <ImageIcon className="h-6 w-6 text-neutral-300" />
                    <span className="text-sm text-neutral-500">
                      {imageFiles.length > 0 ? `已选择 ${imageFiles.length} 张图片` : "点击或拖拽上传截图"}
                    </span>
                    <span className="text-xs text-neutral-400">
                      支持 JPG / PNG / WebP，建议 3–15 张（最多 {MAX_IMAGES} 张）
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
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-neutral-400" />
                  <p className="text-xs text-neutral-500">可选标签（仅用于当前向导理解，不会写入数据模型）</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        tags.includes(tag)
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {method === "figma" ? (
                <InlineTip>
                  MVP 阶段暂不自动拉取 Figma 帧。创建项目后会进入素材确认页，由你手动补充关键截图并选择展示页面。
                </InlineTip>
              ) : (
                <InlineTip>
                  上传完成后仍会进入素材确认页，你可以继续删减、排序并选择哪些页面进入后续作品集生成。
                </InlineTip>
              )}
            </div>
          </SectionCard>
        ) : null}

        {step === 3 ? (
          <SectionCard
            title="Step 3 · 确认并继续进入素材确认"
            description="创建项目后会进入素材确认 / 页面选择页，下一步再补项目事实并生成第一版。"
          >
            <div className="space-y-5">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">导入方式</p>
                <p className="mt-2 text-sm font-medium text-neutral-900">{summary.methodLabel}</p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">项目名称</p>
                <p className="mt-2 text-sm font-medium text-neutral-900">{projectName || "未填写"}</p>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                  {method === "figma" ? "来源链接" : "上传素材"}
                </p>
                <p className="mt-2 break-all text-sm font-medium text-neutral-900">{summary.sourceText}</p>
              </div>

              {tags.length > 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-400">当前理解标签</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <InlineTip>
                这一步只是在确认创建项目前的信息。真正的素材筛选和页面选择，会在下一页继续完成。
              </InlineTip>
            </div>
          </SectionCard>
        ) : null}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-500">{error}</p>
      ) : null}

      <StickyActionBar className="-mx-6">
        <div className="text-xs text-neutral-500">
          {step === 1 && "先确认导入方式，后面再填写最小项目信息。"}
          {step === 2 && "这一页只需要能让你进入下一步，不需要一次把所有内容填满。"}
          {step === 3 && "确认后立即创建项目，并进入素材确认 / 页面选择页。"}
        </div>
        <div className="flex items-center gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl px-5"
              onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              disabled={loading}
            >
              上一步
            </Button>
          ) : null}

          {step < 3 ? (
            <Button
              type="button"
              className="h-11 rounded-xl px-5"
              onClick={() => {
                if (step === 1 && canGoStep2) setStep(2);
                if (step === 2 && canGoStep3) setStep(3);
              }}
              disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
            >
              下一步
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 rounded-xl px-5"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中…
                </>
              ) : (
                "创建项目并进入素材确认"
              )}
            </Button>
          )}
        </div>
      </StickyActionBar>
    </div>
  );
}
