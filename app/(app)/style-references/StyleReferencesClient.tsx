"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { STYLE_PRESETS } from "@/lib/style-reference-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type StyleReferenceSetRecord = {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
};

export function StyleReferencesClient({
  initialSets,
}: {
  initialSets: StyleReferenceSetRecord[];
}) {
  const [sets, setSets] = useState(initialSets);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreate(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setMessage("");

    try {
      const uploaded = await uploadFilesFromBrowser({
        files,
        folder: "style-references",
        kind: "style-reference-image",
      });

      setSaving(true);
      const response = await fetch("/api/style-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || `风格参考 ${sets.length + 1}`,
          description: description.trim() || null,
          imageUrls: uploaded.map((item) => item.url),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((data as { error?: string }).error ?? "保存风格参考失败");
      }

      setSets((current) => [data.set as StyleReferenceSetRecord, ...current]);
      setName("");
      setDescription("");
      setMessage("新的风格参考图组已保存，可在项目排版和作品集包装前选择。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setUploading(false);
      setSaving(false);
      event.target.value = "";
    }
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/style-references/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("删除失败，请稍后重试。");
      return;
    }
    setSets((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            My Sets
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{sets.length}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            你自己的图组会在项目排版和作品集包装前作为样式约束被选择。
          </p>
        </div>
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Presets
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {STYLE_PRESETS.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            系统预制风格更适合快速定调，先判断整份节奏是否合适。
          </p>
        </div>
        <div className="border border-neutral-300 bg-neutral-950 px-4 py-4 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.65)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
            Usage
          </p>
          <p className="mt-2 text-base font-medium leading-7">
            风格参考只影响视觉语言、标题层级和版面密度，不会改动项目边界和讲述顺序。
          </p>
        </div>
      </section>

      <section className="grid gap-4 border border-neutral-300 bg-white p-5 shadow-[0_26px_70px_-58px_rgba(15,23,42,0.42)] lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border border-neutral-300 bg-[linear-gradient(135deg,_rgba(250,250,249,0.98),_rgba(244,244,245,0.92))] px-5 py-5">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Upload Set
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">上传参考图组</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            一次上传一组风格图。推荐把排版气质接近、颜色和版面密度一致的图片放在同一组里，这样生成时更稳定。
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="图组名称，如：B 端深色案例"
            />
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句描述这组参考更像什么风格"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-neutral-900">建议数量</p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">3-8 张，风格尽量统一。</p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-neutral-900">适合内容</p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">封面、目录、内容页和结尾页参考。</p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p className="text-sm font-medium text-neutral-900">不会影响</p>
              <p className="mt-1 text-sm leading-6 text-neutral-500">项目顺序、页面结构与事实判断。</p>
            </div>
          </div>
        </div>

        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center border border-dashed border-neutral-300 bg-neutral-50 px-5 py-5 text-center transition-colors hover:border-neutral-500 hover:bg-white">
          {uploading || saving ? (
            <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
          ) : (
            <ImagePlus className="h-5 w-5 text-neutral-500" />
          )}
          <p className="mt-3 text-sm font-medium text-neutral-900">
            上传参考图组
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            支持 JPG / PNG / WebP，建议一次上传 3–8 张
          </p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleCreate}
          />
        </label>
      </section>

      {message ? (
        <div className="border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          {message}
        </div>
      ) : null}

      <section>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
          系统预制风格
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {STYLE_PRESETS.map((preset) => (
            <div
              key={preset.key}
              className="overflow-hidden border border-neutral-300 bg-white shadow-[0_24px_60px_-54px_rgba(15,23,42,0.32)]"
            >
              <div
                className="h-28 border-b"
                style={{
                  background: `linear-gradient(135deg, ${preset.titleTone} 0%, ${preset.accentColor} 100%)`,
                  borderColor: preset.border,
                }}
              />
              <div className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">{preset.label}</p>
                  <span className="border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-500">
                    preset
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-neutral-500">{preset.description}</p>
                <p className="mt-3 text-xs text-neutral-400">更偏向：{preset.emphasis}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
          我的参考图组
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sets.length > 0 ? (
            sets.map((set) => (
              <div
                key={set.id}
                className="border border-neutral-300 bg-white p-4 shadow-[0_24px_60px_-54px_rgba(15,23,42,0.32)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{set.name}</p>
                    {set.description ? (
                      <p className="mt-1 text-sm leading-6 text-neutral-500">{set.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                      {set.imageUrls.length} images
                    </p>
                  </div>
                  <Button variant="outline" className="h-9 px-3" onClick={() => handleDelete(set.id)}>
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {set.imageUrls.slice(0, 6).map((url) => (
                    <div key={url} className="relative aspect-[4/3] overflow-hidden border border-neutral-200 bg-neutral-100">
                      <Image
                        src={buildPrivateBlobProxyUrl(url)}
                        alt={set.name}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-neutral-300 bg-white px-5 py-10 text-sm text-neutral-500 lg:col-span-2">
              你还没有自己的参考图组。先上传一组，这些图会在生成排版或作品集包装前作为样式约束被选择；如果只是想快速试风格，也可以先用上面的系统预制风格。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
