"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Plus, X } from "lucide-react";

const MAX_FILES_DEFAULT = 20;

function dedupeFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ImageUploadZoneTheme = "light" | "dark";

interface ImageUploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxTotalBytes?: number;
  disabled?: boolean;
  theme?: ImageUploadZoneTheme;
  onError?: (message: string) => void;
}

export function ImageUploadZone({
  files,
  onFilesChange,
  maxFiles = MAX_FILES_DEFAULT,
  maxTotalBytes,
  disabled = false,
  theme = "light",
  onError,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const dark = theme === "dark";

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function syncInput(nextFiles: File[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    nextFiles.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }

  function setSelection(nextFiles: File[]) {
    if (nextFiles.length > maxFiles) {
      onError?.(`最多上传 ${maxFiles} 张图片`);
      return;
    }
    if (maxTotalBytes) {
      const total = nextFiles.reduce((s, f) => s + f.size, 0);
      if (total > maxTotalBytes) {
        onError?.(`图片总大小不能超过 ${formatBytes(maxTotalBytes)}`);
        return;
      }
    }
    onFilesChange(nextFiles);
    syncInput(nextFiles);
  }

  function append(incoming: File[]) {
    setSelection(dedupeFiles([...files, ...incoming]));
  }

  function remove(index: number) {
    const next = files.filter((_, i) => i !== index);
    setSelection(next);
  }

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSelection(next);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    append(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleDropZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDropZoneDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    if (dropped.length === 0) {
      onError?.("请拖入 JPG / PNG / WebP 图片");
      return;
    }
    append(dropped);
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  // Theme tokens
  const dropzoneBorder = dark
    ? isDragging ? "border-white/45 bg-white/[0.08]" : "border-white/15 hover:border-white/25 hover:bg-white/[0.04]"
    : isDragging ? "border-neutral-500 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400 hover:bg-white";
  const dropzoneBg = dark ? "bg-white/[0.02]" : "bg-neutral-100/85";
  const iconColor = dark ? "text-white/30" : "text-neutral-300";
  const labelColor = dark ? "text-white/50" : "text-neutral-500";
  const hintColor = dark ? "text-white/25" : "text-neutral-400";
  const metaColor = dark ? "text-white/35" : "text-neutral-400";
  const addBtnClass = dark
    ? "border-white/10 text-white/60 hover:border-white/20 hover:text-white"
    : "border-neutral-300 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900";
  const cardBorder = dark ? "border-white/10" : "border-neutral-200";
  const cardBg = dark ? "bg-white/[0.03]" : "bg-white";
  const cardFooterBorder = dark ? "border-white/10" : "border-neutral-100";
  const fileNameColor = dark ? "text-white/70" : "text-neutral-700";
  const fileSizeColor = dark ? "text-white/35" : "text-neutral-400";
  const removeBtnClass = dark
    ? "border-white/10 text-white/45 hover:border-white/20 hover:text-white/80"
    : "border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-700";
  const dragHintColor = dark ? "text-white/30" : "text-neutral-400";

  return (
    <div className="space-y-3">
      {/* Drop zone — always visible for adding more */}
      <label
        className={`flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed transition-colors ${dropzoneBorder} ${dropzoneBg}`}
        onDragOver={handleDropZoneDragOver}
        onDragLeave={handleDropZoneDragLeave}
        onDrop={handleDropZoneDrop}
      >
        <ImageIcon className={`h-5 w-5 ${iconColor}`} />
        <span className={`text-sm ${labelColor}`}>
          {files.length > 0 ? "点击或拖拽继续添加" : "点击或拖拽上传截图"}
        </span>
        <span className={`text-xs ${hintColor}`}>
          支持 JPG / PNG / WebP，最多 {maxFiles} 张
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={handleInputChange}
        />
      </label>

      {/* Thumbnail strip */}
      {previewUrls.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-xs ${metaColor}`}>
              共 {files.length} 张 · {formatBytes(totalSize)}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className={`inline-flex items-center gap-1 border px-2.5 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${addBtnClass}`}
            >
              <Plus className="h-3.5 w-3.5" />
              继续添加
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {previewUrls.map((url, i) => (
              <div
                key={`${url}-${i}`}
                draggable
                onDragStart={() => { setDraggedIndex(i); setDragOverIndex(i); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                onDrop={() => { if (draggedIndex !== null) move(draggedIndex, i); setDraggedIndex(null); setDragOverIndex(null); }}
                onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                className={`min-w-[140px] shrink-0 overflow-hidden border transition-all ${cardBorder} ${cardBg} ${
                  dragOverIndex === i ? "ring-1 ring-neutral-400" : ""
                } ${draggedIndex === i ? "opacity-60" : ""}`}
              >
                {/* Image — object-contain, preserves natural aspect ratio */}
                <div className={`flex h-28 items-center justify-center ${dark ? "bg-white/[0.04]" : "bg-neutral-50"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`截图 ${i + 1}`}
                    className="max-h-28 w-full object-contain"
                  />
                </div>
                {/* Footer */}
                <div className={`border-t px-2.5 py-2 ${cardFooterBorder}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`truncate text-[11px] ${fileNameColor}`}>
                        第 {i + 1} 张
                      </p>
                      <p className={`text-[10px] ${fileSizeColor}`}>
                        {formatBytes(files[i]?.size ?? 0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={disabled}
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${removeBtnClass}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className={`text-[11px] ${dragHintColor}`}>
            可拖拽缩略图调整顺序，系统会按当前顺序理解截图
          </p>
        </div>
      )}
    </div>
  );
}
