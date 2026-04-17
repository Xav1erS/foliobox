import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StyleReferencesClient } from "./StyleReferencesClient";

export default async function StyleReferencesPage() {
  const session = await getRequiredSession("/style-references");
  const sets = await db.styleReferenceSet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      imageUrls: true,
    },
  });

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-10">
      <PageHeader
        eyebrow="Style References"
        title="风格参考"
        description="这里管理你自己的参考图组，也能查看系统预制风格。高频使用发生在点击生成之后，而不是平时编辑之前。"
      />

      <Separator className="-mx-6 w-auto" />

      <Card className="border-border/70 bg-card/95 shadow-xs">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-xs">
                视觉样本库
              </Badge>
              <span className="text-sm text-muted-foreground">{sets.length} 组个人参考图</span>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              这里存的是“视觉语言参考”，不是项目素材本身。它会在排版和作品集包装前被选择，用来约束版式气质和层级密度。
            </p>
          </div>
        </CardContent>
      </Card>

      <StyleReferencesClient initialSets={sets} />
    </div>
  );
}
