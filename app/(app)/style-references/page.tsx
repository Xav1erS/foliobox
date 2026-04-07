import { ImageIcon } from "lucide-react";
import { getRequiredSession } from "@/lib/required-session";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";

export default async function StyleReferencesPage() {
  await getRequiredSession("/style-references");

  return (
    <div className="px-6 py-10">
      <PageHeader
        eyebrow="Style References"
        title="风格参考"
        description="上传你参考的排版风格图，在生成项目排版或整份作品集包装时作为样式约束输入。"
      />

      <div className="mt-6 -mx-6 border-t-2 border-black" />

      <div className="mt-6">
        <EmptyState
          icon={<ImageIcon className="h-6 w-6 text-neutral-400" />}
          title="风格参考库（即将上线）"
          description="这里将用于管理你上传的风格参考图，并在项目排版与作品集包装生成前调用。功能正在开发中。"
        />
      </div>
    </div>
  );
}
