"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { StickyActionBar } from "@/components/app/StickyActionBar";

export default function NewPortfolioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "创建失败，请稍后重试");
      }

      const { id } = await res.json();
      router.push(`/portfolios/${id}/editor`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-24">
      <PageHeader
        eyebrow="新建作品集"
        title="开始整理这份作品集"
        description="先给作品集起一个名字，创建后直接进入作品集编辑器继续整理。"
      />

      <div className="mt-8">
        <SectionCard>
          <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center gap-3 border-b border-neutral-200 pb-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-neutral-200 bg-neutral-50">
                <BookOpen className="h-5 w-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">作品集</p>
                <p className="text-xs text-neutral-400">可以为一次求职目标单独创建一份</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-name" className="text-sm font-medium text-neutral-700">
                作品集名称
              </Label>
              <Input
                id="portfolio-name"
                placeholder="例如：2026 UX 求职 / 互联网大厂投递版"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleCreate();
                }}
                className="h-11 rounded-none border-neutral-300"
                autoFocus
              />
              <p className="text-xs text-neutral-400">
                名称只是你自己看到的标识，不会出现在作品集正文里。
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        </SectionCard>
      </div>

      <StickyActionBar>
        <Button
          variant="outline"
          className="h-11 rounded-none px-5"
          onClick={() => router.back()}
          disabled={loading}
        >
          取消
        </Button>
        <Button
          className="h-11 rounded-none px-6"
          onClick={handleCreate}
          disabled={!name.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中
            </>
          ) : (
            "创建并继续"
          )}
        </Button>
      </StickyActionBar>
    </div>
  );
}
