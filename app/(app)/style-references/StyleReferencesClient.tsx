"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { STYLE_PRESETS } from "@/lib/style-reference-presets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            My Sets
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{sets.length}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            你自己的图组会在项目排版和作品集包装前作为样式约束被选择。
          </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Presets
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {STYLE_PRESETS.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            系统预制风格更适合快速定调，先判断整份节奏是否合适。
          </p>
          </CardContent>
        </Card>
        <Card className="app-panel-highlight text-white shadow-xs">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/42">
            Usage
          </p>
          <p className="mt-2 text-base font-medium leading-7 text-white">
            风格参考只影响视觉语言、标题层级和版面密度，不会改动项目边界和讲述顺序。
          </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-card/95 shadow-xs">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-border/70 bg-muted/35 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
            Upload Set
            </Badge>
          </div>
          <p className="mt-2 text-lg font-semibold text-foreground">上传参考图组</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-sm font-medium text-foreground">建议数量</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">3-8 张，风格尽量统一。</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-sm font-medium text-foreground">适合内容</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">封面、目录、内容页和结尾页参考。</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background px-4 py-3">
              <p className="text-sm font-medium text-foreground">不会影响</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">项目顺序、页面结构与事实判断。</p>
            </div>
          </div>
        </div>

        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/25 px-5 py-5 text-center transition-colors hover:border-foreground/30 hover:bg-background">
          {uploading || saving ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
          <p className="mt-3 text-sm font-medium text-foreground">
            上传参考图组
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
          </CardContent>
        </Card>
      </section>

      {message ? (
        <div className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <section>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          系统预制风格
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {STYLE_PRESETS.map((preset) => (
            <Card
              key={preset.key}
              className="overflow-hidden border-border/70 bg-card/95 shadow-xs"
            >
              <div
                className="h-28 border-b"
                style={{
                  background: `linear-gradient(135deg, ${preset.titleTone} 0%, ${preset.accentColor} 100%)`,
                  borderColor: preset.border,
                }}
              />
              <CardContent className="px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{preset.label}</p>
                  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.16em]">
                    preset
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{preset.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">更偏向：{preset.emphasis}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
          我的参考图组
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {sets.length > 0 ? (
            sets.map((set) => (
              <Card
                key={set.id}
                className="border-border/70 bg-card/95 shadow-xs"
              >
                <CardHeader className="gap-3 pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{set.name}</CardTitle>
                    {set.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{set.description}</p>
                    ) : null}
                    <Badge variant="outline" className="mt-2 rounded-md px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.16em]">
                      {set.imageUrls.length} images
                    </Badge>
                  </div>
                  <Button variant="outline" className="h-9 px-3" onClick={() => handleDelete(set.id)}>
                    <Trash2 className="h-4 w-4" />
                    删除
                  </Button>
                </div>
                </CardHeader>
                <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-3">
                  {set.imageUrls.slice(0, 6).map((url) => (
                    <div key={url} className="relative aspect-4/3 overflow-hidden rounded-lg border border-border bg-muted">
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
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/95 px-5 py-10 text-sm text-muted-foreground lg:col-span-2">
              你还没有自己的参考图组。先上传一组，这些图会在生成排版或作品集包装前作为样式约束被选择；如果只是想快速试风格，也可以先用上面的系统预制风格。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
