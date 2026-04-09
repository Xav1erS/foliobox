import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
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
    <div className="px-6 py-10">
      <PageHeader
        eyebrow="Style References"
        title="风格参考"
        description="这里管理你自己的参考图组，也能查看系统预制风格。高频使用发生在点击生成之后，而不是平时编辑之前。"
      />

      <div className="mt-6 -mx-6 border-t-2 border-black" />

      <div className="pt-6">
        <StyleReferencesClient initialSets={sets} />
      </div>
    </div>
  );
}
