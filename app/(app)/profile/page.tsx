import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/app/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  const profile = await db.designerProfile.findUnique({
    where: { userId: session!.user!.id },
  });

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-neutral-900">设计师档案</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          这些信息会用于生成更贴合你背景的作品集文案。
        </p>
      </div>
      <ProfileForm initialData={profile} />
    </div>
  );
}
