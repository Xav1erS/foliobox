# FolioBox — 工程交接文档

面向 Claude Code / Codex 的工程上下文说明。产品需求见 `private-docs/mvp-spec.md`。

---

## 项目简介

FolioBox 是一个面向国内设计师求职场景的 Web 产品。用户上传设计稿与简历信息，平台通过 AI 生成并帮助整理一份可投递的作品集初稿，支持在线预览链接和 PDF 导出。

**技术栈：** Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL (Supabase) · NextAuth v5 · OpenAI · Vercel Blob · Tailwind CSS · shadcn/ui

---

## 常用命令

```bash
npm run dev          # 本地开发
npm run build        # 构建（交付前必跑，确保无报错）
npm run db:push      # 同步 schema 到数据库（见下方说明）
npm run db:studio    # 打开 Prisma Studio
npm run db:generate  # 重新生成 Prisma Client（schema 改完后运行）
```

### 数据库操作注意事项

**必须用 `npm run db:push`，不要用 `prisma migrate dev`。**

原因：数据库已有数据且无完整 migration 历史，`migrate dev` 会因 drift 报错。`db:push` 直接将 schema 同步到 DB，适合当前阶段。

---

## 目录结构

```
app/
  (app)/              # 需登录的应用页面（layout 含 auth 校验）
    dashboard/        # 项目列表
    payment/result/   # 支付结果页
    profile/          # 用户资料
    projects/[id]/
      assets/         # 素材导入
      facts/          # 项目关键信息表单
      outline/        # 大纲确认页（含 OutlineClient.tsx）
      editor/         # Block 编辑器（含 EditorClient.tsx）
  (auth)/             # 登录 / 验证页（无 app layout）
  (marketing)/        # 公开页面
    page.tsx          # Landing Page
    pricing/          # 价格页
    score/            # 免费评分入口
    p/[slug]/         # 已发布作品集展示页
  (print)/            # 打印视图（独立 layout，无导航，用于 PDF 导出）
    projects/[id]/print/

api/
  auth/               # NextAuth 回调
  billing/            # plans（公开）、me（需登录）
  orders/             # create、[id]、[id]/pay、[id]/refresh
  payments/           # wechat/notify、alipay/notify（支付回调 stub）
  outlines/[id]/      # GET/PUT、confirm、render
  drafts/[id]/        # GET/PUT、publish
  projects/[id]/      # facts、outline、assets 等
  published/[slug]/   # 已发布作品集数据
  scores/             # 评分相关

lib/
  auth.ts             # NextAuth 配置（Magic Link 邮件登录）
  db.ts               # Prisma Client 单例
  entitlement.ts      # 权限校验：getUserPlan / canDo / requirePlan + PLAN_DEFINITIONS
  storage.ts          # Vercel Blob 封装
  utils.ts            # cn() 等工具
  llm/
    provider.ts       # LLMProvider 接口
    openai.ts         # OpenAI 实现（gpt-4o primary，gpt-4o-mini lite）
    index.ts          # 导出 llm 实例
  payment/
    index.ts          # PaymentProvider 接口 + getProvider() 工厂
    wechat.ts         # 微信支付 stub（待接真实 SDK）
    alipay.ts         # 支付宝 stub（待接真实 SDK）

components/
  ui/                 # shadcn/ui 基础组件
  app/                # 应用内通用组件
  marketing/          # 营销页组件
  billing/
    PaywallModal.tsx  # 付费拦截弹窗（scene 驱动，6 种场景）

hooks/
  useEntitlement.ts   # 客户端权限状态（调用 /api/billing/me）
```

---

## 已完成阶段（Phase 1–4）

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目创建、素材导入（图片/PDF/Figma链接）、事实表单 | 完成 |
| Phase 2 | AI 大纲生成 + 确认页（主题/封面图选择） | 完成 |
| Phase 3 | AI 草稿渲染 + Block 编辑器 + PDF 打印视图 + 在线链接发布 | 完成 |
| Phase 4 | 支付系统（Order/UserPlan/BillingEvent）+ 权限校验 + Paywall 拦截 + 价格页 | 完成 |

`npm run build` 当前无报错。

---

## Stub 说明（生产前需替换）

### 支付 Provider（`lib/payment/wechat.ts` / `lib/payment/alipay.ts`）

当前为 stub 实现，`createOrder` 返回占位数据，`queryOrder` 始终返回 `pending`。
真实 SDK 接入需要商户证书，接入点已预留，替换对应文件中标注 `TODO` 的部分即可。

支付回调路由（`/api/payments/wechat/notify`、`/api/payments/alipay/notify`）也是 stub，验签逻辑需替换。

### LLM 调用（`lib/llm/openai.ts`）

真实调用，需要有效的 `OPENAI_API_KEY`。本地开发如无 key，AI 生成大纲和渲染草稿会报错（属预期行为）。

---

## 支付系统关键设计

**三层模型：**
- `Order` — 每次支付意图，含来源上下文（`sourceScene` / `projectId` / `draftId`）
- `UserPlan` — 权益状态唯一来源，`requirePlan()` 直接查此表
- `BillingEvent` — 审计日志，不参与业务逻辑

**权限校验：**
- 服务端：`requirePlan(userId, action)` → 403 `{ error: "upgrade_required" }`
- 客户端：`useEntitlement()` hook → `planType` → 触发 `<PaywallModal>`

**支付流程（两步）：**
1. `POST /api/orders/create` — 仅创建 DB 记录，返回 `{ orderId }`
2. `POST /api/orders/:id/pay` — 调用 provider，返回 `{ paymentParams }`
3. 前端轮询 `POST /api/orders/:id/refresh` → status === "PAID" 后刷新权益

**返回上下文（7.15C）：**
支付结果页从 `Order` 记录读取 `sourceScene/projectId/draftId` 还原流程，不信任 URL 参数。

---

## 环境变量

```
DATABASE_URL          # Supabase Transaction Pooler（pgbouncer=true，端口 6543）
DIRECT_URL            # Supabase Direct Connection（端口 5432，供 Prisma migrate 使用）
NEXTAUTH_URL          # 本地: http://localhost:3000
AUTH_SECRET           # openssl rand -base64 32 生成
EMAIL_SERVER_HOST     # SMTP host
EMAIL_SERVER_PORT     # SMTP port
EMAIL_SERVER_USER     # SMTP user
EMAIL_SERVER_PASSWORD # SMTP password
EMAIL_FROM            # 发件人地址
OPENAI_API_KEY        # OpenAI API key
BLOB_READ_WRITE_TOKEN # Vercel Blob token
LLM_PROVIDER          # 固定填 "openai"
```

---

## 代码约定

- **Server Components 优先**，数据拉取在 Server Component，交互逻辑在对应 `*Client.tsx`
- **Route Handler 只导出 HTTP 方法**（GET/POST/PUT/DELETE），不导出其他 named export（Next.js 限制）
- **业务常量放 `lib/`**，不放 route 文件（如 `PLAN_AMOUNTS` 在 `lib/entitlement.ts`）
- **LLM 调用只在服务端**（API route），不在客户端
- **shadcn/ui** 组件已安装，新增 UI 优先复用，路径 `components/ui/`
- **Tailwind** 用 `cn()` 合并 class（来自 `lib/utils.ts`）
