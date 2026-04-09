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
      <section className="grid gap-4 border border-neutral-300 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="text-sm font-medium text-neutral-900">上传参考图组</p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            一次上传一组风格图。它只会影响包装样式、标题层级和版面密度，不会改动项目结构判断。
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
            <div key={preset.key} className="border border-neutral-300 bg-white p-4">
              <div
                className="h-24 border"
                style={{
                  background: `linear-gradient(135deg, ${preset.titleTone} 0%, ${preset.accentColor} 100%)`,
                  borderColor: preset.border,
                }}
              />
              <p className="mt-4 text-sm font-medium text-neutral-900">{preset.label}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{preset.description}</p>
              <p className="mt-3 text-xs text-neutral-400">更偏向：{preset.emphasis}</p>
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
              <div key={set.id} className="border border-neutral-300 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{set.name}</p>
                    {set.description ? (
                      <p className="mt-1 text-sm leading-6 text-neutral-500">{set.description}</p>
                    ) : null}
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
            <div className="border border-dashed border-neutral-300 bg-white px-5 py-10 text-sm text-neutral-500">
              你还没有自己的参考图组。先上传一组，这些图会在生成排版或作品集包装前作为样式约束被选择。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
