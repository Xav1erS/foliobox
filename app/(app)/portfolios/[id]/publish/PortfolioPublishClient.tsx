"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, FileDown, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortfolioPublishClient({
  portfolioId,
  hasPackaging,
  initialSlug,
}: {
  portfolioId: string;
  hasPackaging: boolean;
  initialSlug: string | null;
}) {
  const [slug, setSlug] = useState(initialSlug);
  const [publishing, setPublishing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const publicUrl = slug ? `/p/${slug}` : null;

  async function parseJsonResponse(
    response: Response,
    action: "publish" | "export"
  ) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = (data as { error?: string }).error;
      if (error === "quota_exceeded") {
        throw new Error("当前发布链接次数已用完，请先前往权益页查看剩余次数。");
      }
      if (error === "upgrade_required") {
        throw new Error(
          action === "publish"
            ? "当前套餐还不能发布公开链接，请先升级后再继续。"
            : "当前套餐还不能导出 PDF，请先升级后再继续。"
        );
      }
      throw new Error(error ?? "请求失败，请稍后重试");
    }
    return data;
  }

  async function handlePublish() {
    setPublishing(true);
    setMessage("");
    try {
      const data = await parseJsonResponse(await fetch(`/api/portfolios/${portfolioId}/publish`, {
        method: "POST",
      }), "publish");
      setSlug(data.slug as string);
      setMessage("作品集已发布，可以直接打开公开链接。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  async function handleCopy() {
    if (!publicUrl || typeof window === "undefined") return;
    const absoluteUrl = `${window.location.origin}${publicUrl}`;
    await navigator.clipboard.writeText(absoluteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setMessage("");
    try {
      const data = await parseJsonResponse(
        await fetch(`/api/portfolios/${portfolioId}/export-pdf`, { method: "POST" }),
        "export"
      );
      if (typeof window !== "undefined") {
        window.open(data.printUrl as string, "_blank", "noopener,noreferrer");
      }
      setMessage((data.message as string) ?? "已打开打印页。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-neutral-200 bg-white px-4 py-4">
        <p className="text-sm font-medium text-neutral-900">当前发布状态</p>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          {slug
            ? "当前作品集已经有可访问的公开链接；再次发布会更新同一份内容。"
            : "当前还没有公开链接。发布后会基于 Portfolio 对象生成公开页。"}
        </p>
        {publicUrl ? (
          <p className="mt-2 text-xs font-mono text-neutral-400">{publicUrl}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handlePublish} disabled={publishing || !hasPackaging}>
          {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          发布公开链接
        </Button>
        <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf || !hasPackaging}>
          {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          导出 PDF
        </Button>
        {publicUrl ? (
          <>
            <Button variant="outline" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              复制链接
            </Button>
            <Button asChild variant="outline">
              <Link href={publicUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
                打开公开页
              </Link>
            </Button>
          </>
        ) : null}
      </div>

      {!hasPackaging ? (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          当前还没有作品集包装结果。先回编辑器生成作品集包装，再来发布或导出。
        </div>
      ) : null}

      {message ? (
        <div className="border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          {message}
        </div>
      ) : null}
    </div>
  );
}
