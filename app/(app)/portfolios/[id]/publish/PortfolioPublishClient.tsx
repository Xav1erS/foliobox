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
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Status
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            {slug ? "Online" : "Draft"}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            {slug ? "当前公开链接已经可访问，再次发布会更新同一条链接。" : "还没有公开链接，发布后会基于当前 Portfolio 生成公开页。"}
          </p>
        </div>
        <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Public URL
          </p>
          <p className="mt-2 truncate text-sm font-medium text-neutral-900">
            {publicUrl ?? "等待发布"}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            发布后可直接复制、分享并回看公开版本。
          </p>
        </div>
        <div className="border border-neutral-300 bg-neutral-950 px-4 py-4 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.65)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
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
        <div className="border border-neutral-300 bg-white p-5 shadow-[0_26px_70px_-58px_rgba(15,23,42,0.42)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Process
          </p>
          <p className="mt-2 text-lg font-semibold text-neutral-900">发布与导出流程</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">1. 确认包装</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                当前发布与导出都直接读取 Portfolio 上的包装结果。
              </p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">2. 发布公开页</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                生成后可以反复更新同一条公开链接。
              </p>
            </div>
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">3. 导出正式 PDF</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
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

        <div className="border border-neutral-300 bg-[linear-gradient(180deg,_rgba(250,250,249,0.96),_rgba(245,245,244,0.88))] p-5 shadow-[0_26px_70px_-58px_rgba(15,23,42,0.42)]">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
            Current State
          </p>
          <div className="mt-3 space-y-3">
            <div className="border border-neutral-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">公开链接</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {slug ? "已生成并可继续更新。" : "尚未发布。"}
              </p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-4">
              <p className="text-sm font-medium text-neutral-900">PDF 导出</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                {hasPackaging ? "已满足导出条件。" : "等待作品集包装结果。"}
              </p>
            </div>
            {publicUrl ? (
              <div className="border border-neutral-200 bg-white px-4 py-4">
                <p className="text-sm font-medium text-neutral-900">当前链接</p>
                <p className="mt-2 break-all text-xs font-mono text-neutral-500">{publicUrl}</p>
              </div>
            ) : null}
          </div>
        </div>
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
