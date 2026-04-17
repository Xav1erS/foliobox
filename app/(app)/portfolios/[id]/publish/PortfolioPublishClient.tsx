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
      const response = await fetch(`/api/portfolios/${portfolioId}/export-pdf`, { method: "POST" });
      if (!response.ok) {
        const data = await parseJsonResponse(response, "export");
        setMessage((data.message as string) ?? "导出失败");
        return;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("服务端没有返回 PDF 文件，请稍后重试。");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "portfolio.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("正式 PDF 已开始下载。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="app-panel px-4 py-4">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Status
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {slug ? "Online" : "Draft"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {slug ? "当前公开链接已经可访问，再次发布会更新同一条链接。" : "还没有公开链接，发布后会基于当前 Portfolio 生成公开页。"}
          </p>
        </div>
        <div className="app-panel px-4 py-4">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Public URL
          </p>
          <p className="mt-2 truncate text-sm font-medium text-foreground">
            {publicUrl ?? "等待发布"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            发布后可直接复制、分享并回看公开版本。
          </p>
        </div>
        <div className="app-panel-highlight px-4 py-4 text-white">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/40">
            Export
          </p>
          <p className="mt-2 text-base font-medium leading-7">
            {hasPackaging
              ? "当前已经具备导出条件，可以直接生成正式 PDF。"
              : "先回编辑器生成作品集包装，再来发布公开链接或导出 PDF。"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-panel p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Process
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">发布与导出流程</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-foreground">1. 确认包装</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                当前发布与导出都直接读取 Portfolio 上的包装结果。
              </p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-foreground">2. 发布公开页</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                生成后可以反复更新同一条公开链接。
              </p>
            </div>
            <div className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-sm font-medium text-foreground">3. 导出正式 PDF</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                当前使用正式 PDF 输出，而不是仅打开打印页。
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
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
        </div>

        <div className="app-panel-highlight p-5 text-white">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/42">
            Current State
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
              <p className="text-sm font-medium text-white">公开链接</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {slug ? "已生成并可继续更新。" : "尚未发布。"}
              </p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
              <p className="text-sm font-medium text-white">PDF 导出</p>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {hasPackaging ? "已满足导出条件。" : "等待作品集包装结果。"}
              </p>
            </div>
            {publicUrl ? (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
                <p className="text-sm font-medium text-white">当前链接</p>
                <p className="mt-2 break-all text-xs font-mono text-white/62">{publicUrl}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!hasPackaging ? (
        <div className="rounded-[24px] border border-amber-400/18 bg-amber-500/[0.08] px-4 py-4 text-sm text-amber-100">
          <p className="font-medium">当前还没有作品集包装结果。</p>
          <p className="mt-1 leading-6 text-amber-100/78">先回编辑器生成作品集包装，再来发布或导出。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[18px] border border-amber-400/16 bg-black/12 px-4 py-3">
              <p className="font-medium text-amber-50">1. 选项目</p>
              <p className="mt-1 leading-6 text-amber-100/74">先挑 2-4 个最能代表能力面的项目。</p>
            </div>
            <div className="rounded-[18px] border border-amber-400/16 bg-black/12 px-4 py-3">
              <p className="font-medium text-amber-50">2. 生成包装</p>
              <p className="mt-1 leading-6 text-amber-100/74">让系统先给出整份作品集的节奏与固定页建议。</p>
            </div>
            <div className="rounded-[18px] border border-amber-400/16 bg-black/12 px-4 py-3">
              <p className="font-medium text-amber-50">3. 再来输出</p>
              <p className="mt-1 leading-6 text-amber-100/74">包装稳定后，再发布公开链接和正式 PDF。</p>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="app-inline-tip px-4 py-3 text-sm text-white/72">
          {message}
        </div>
      ) : null}
    </div>
  );
}
