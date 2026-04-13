import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

/**
 * 测试专用登录接口 — 只在设置了 PLAYWRIGHT_TEST_SECRET 环境变量时生效。
 * 直接在数据库创建 session，绕过邮件 Magic Link。
 * 生产环境不设此变量，路由自动 403。
 */
export async function POST(req: Request) {
  const secret = process.env.PLAYWRIGHT_TEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  let body: { secret?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const email = "playwright-test@foliobox.dev";

  // 确保测试用户存在
  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: "Playwright Test User",
        emailVerified: new Date(),
      },
    });
  }

  // 确保测试用户有 FREE Plan（避免权限检查拦截）
  const existingPlan = await db.userPlan.findFirst({ where: { userId: user.id } });
  if (!existingPlan) {
    await db.userPlan.create({
      data: {
        userId: user.id,
        planType: "FREE",
        status: "ACTIVE",
      },
    });
  }

  // 创建 session（30 天）
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  // 写入 session cookie（与 NextAuth v5 database strategy 一致）
  const response = NextResponse.json({ ok: true, userId: user.id });
  response.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    secure: false, // 本地 http 测试，不用 secure
    sameSite: "lax",
    expires,
    path: "/",
  });

  return response;
}
