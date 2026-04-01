import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Clock } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  IMPORTING: { label: "导入中", variant: "outline" },
  IMPORTED: { label: "已导入", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { assets: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">我的项目</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            {projects.length > 0
              ? `共 ${projects.length} 个项目`
              : "还没有项目，从导入第一个开始"}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            新建项目
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
            <FileText className="h-6 w-6 text-neutral-400" />
          </div>
          <h3 className="text-sm font-medium text-neutral-700">还没有项目</h3>
          <p className="mt-1 text-sm text-neutral-400">
            导入 Figma 链接或上传图片，开始生成你的作品集
          </p>
          <Button asChild className="mt-6">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              导入第一个项目
            </Link>
          </Button>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = STATUS_LABEL[project.importStatus] ?? STATUS_LABEL.DRAFT;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                {/* Thumbnail placeholder */}
                <div className="flex h-32 items-center justify-center rounded-xl bg-neutral-50 group-hover:bg-neutral-100 transition-colors">
                  <FileText className="h-8 w-8 text-neutral-300" />
                </div>

                {/* Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {project.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <Badge variant={status.variant} className="shrink-0 text-xs">
                    {status.label}
                  </Badge>
                </div>

                {/* Asset count */}
                {project._count.assets > 0 && (
                  <p className="text-xs text-neutral-400">
                    {project._count.assets} 张页面
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
