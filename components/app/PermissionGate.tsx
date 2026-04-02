"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PaywallModal } from "@/components/billing/PaywallModal";

type PaywallScene =
  | "score_detail"
  | "full_rewrite"
  | "multi_variant"
  | "pdf_export"
  | "publish_link"
  | "sprint_upgrade";

export function PermissionGate({
  allowed,
  loginHref,
  scene,
  title,
  description,
  actionLabel,
  children,
  projectId,
  draftId,
}: {
  allowed: boolean;
  loginHref?: string;
  scene: PaywallScene;
  title: string;
  description: string;
  actionLabel?: string;
  children: React.ReactNode;
  projectId?: string;
  draftId?: string;
}) {
  const [open, setOpen] = useState(false);

  if (allowed) return <>{children}</>;

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/55">{description}</p>
        <div className="mt-5">
          {loginHref ? (
            <Button asChild className="h-11 rounded-xl bg-white px-5 text-black hover:bg-white/90">
              <Link href={loginHref}>{actionLabel ?? "登录后继续"}</Link>
            </Button>
          ) : (
            <Button
              onClick={() => setOpen(true)}
              className="h-11 rounded-xl bg-white px-5 text-black hover:bg-white/90"
            >
              {actionLabel ?? "立即解锁"}
            </Button>
          )}
        </div>
      </div>

      {!loginHref ? (
        <PaywallModal
          open={open}
          onClose={() => setOpen(false)}
          scene={scene}
          allowDismiss
          projectId={projectId}
          draftId={draftId}
        />
      ) : null}
    </>
  );
}
