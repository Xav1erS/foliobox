import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";
import { PageHeader } from "@/components/app/PageHeader";
import { ResumeContextBanner } from "@/components/app/ResumeContextBanner";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getRequiredSession } from "@/lib/required-session";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getRequiredSession("/profile");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const fromScore = resolvedSearchParams?.from === "score";

  const [profile] = await Promise.all([
    db.designerProfile.findUnique({
      where: { userId: session.user.id },
    }),
  ]);
  const profileReadiness = [
    profile?.currentTitle,
    profile?.yearsOfExperience,
    profile?.industry,
    profile?.targetRole,
    profile?.tonePreference,
    ...(profile?.specialties ?? []),
    ...(profile?.strengths ?? []),
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 px-6 py-10">
      <PageHeader
        eyebrow="PROFILE"
        title="设计师档案"
        description="这里专注维护你的个人背景、定位和表达偏好。这些信息会作为 AI 输入，影响作品集中的自我定位、强调重点和整体叙述语气。"
      />

      <Separator className="-mx-6 w-auto" />

      {fromScore && (
        <Card className="app-panel">
          <CardContent className="p-5">
          <ResumeContextBanner>
            你是从评分结果回到这里的。先补充当前职位、经验年限、擅长方向与目标岗位，再去整理项目，会让后续生成结果更贴近你的求职方向。
          </ResumeContextBanner>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="app-panel">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Profile Readiness
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {profileReadiness}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            当前已写入的定位、方向和表达偏好数量。
          </p>
          </CardContent>
        </Card>
        <Card className="app-panel-highlight text-white shadow-xs">
          <CardContent className="p-5">
          <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/42">
            Why It Matters
          </p>
          <p className="mt-2 text-base font-medium leading-7 text-white">
            档案越清楚，后续项目和作品集生成就越贴近你真实的投递方向。
          </p>
          </CardContent>
        </Card>
      </div>

      <ProfileForm initialData={profile} />
    </div>
  );
}
