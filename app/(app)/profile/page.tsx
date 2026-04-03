import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";
import { PageHeader } from "@/components/app/PageHeader";
import { ResumeContextBanner } from "@/components/app/ResumeContextBanner";
import { getRequiredSession } from "@/lib/required-session";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/profile");
  const profile = await db.designerProfile.findUnique({
    where: { userId: session.user.id },
  });
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromScore = resolvedSearchParams?.from === "score";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow="Profile"
        title="设计师档案"
        description="这些信息会作为 AI 输入，影响作品集中的自我定位、强调重点和整体叙述语气。"
      />
      <div className="mt-6">
        <ResumeContextBanner>
          {fromScore
            ? "你是从评分结果回到这里的。先补充当前职位、经验年限、擅长方向与目标岗位，再去整理项目，会让后续生成结果更贴近你的求职方向。"
            : "建议先补充当前职位、经验年限、擅长方向与目标岗位，再去生成第一版作品集。这样 AI 给出的项目表达会更贴合你的求职背景。"}
        </ResumeContextBanner>
      </div>
      <div className="mt-8">
        <ProfileForm initialData={profile} />
      </div>
    </div>
  );
}
