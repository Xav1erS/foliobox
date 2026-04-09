"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CreateProjectDialogProps = {
  children?: ReactNode;
  defaultOpen?: boolean;
  title?: string;
  description?: string;
  initialName?: string;
  onOpenChange?: (open: boolean) => void;
};

export function CreateProjectDialog({
  children,
  defaultOpen = false,
  title = "新建项目",
  description = "先创建一个空白项目，进入编辑器后再补素材、风格参考和项目事实。",
  initialName = "",
  onOpenChange,
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError("");
      setSubmitting(false);
    }
    onOpenChange?.(nextOpen);
  }

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入项目名称");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          sourceType: "MANUAL",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "创建失败，请重试");
        return;
      }

      const { project } = await response.json();
      handleOpenChange(false);
      router.push(`/projects/${project.id}/editor`);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="h-11 px-5">
            <PlusCircle className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="project-name">项目名称</Label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：增长设计改版 / 品牌官网重构"
            disabled={submitting}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:space-x-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void handleCreate()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中
              </>
            ) : (
              "创建并进入编辑器"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
