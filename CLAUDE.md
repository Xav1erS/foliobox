# FolioBox — 工程交接文档

面向 Claude Code / Codex 的工程上下文说明。当前有效规范稳定入口见 `private-docs/CURRENT_SPEC.md`。

---

## 产品规范入口（v2）

从现在开始，产品规范以 `private-docs/CURRENT_SPEC.md` 为稳定入口，并以 `private-docs/spec-system-v2/` 下文档为唯一有效依据。

文档权威顺序：
- 稳定入口：`private-docs/CURRENT_SPEC.md`
- 总入口与读取顺序：`private-docs/spec-system-v2/00_README_Document_Map_v2.md`
- 产品范围与页面地图：`private-docs/spec-system-v2/01_FolioBox_MVP_Spec_Core_v2.md`
- 当前版本页面归属、文案、CTA、壳层与行为冻结：`private-docs/spec-system-v2/02_Current_Freeze_v2.md`
- 评分策略：`private-docs/spec-system-v2/03_Scoring_Strategy_v2.md`
- 生成、配额、重试与成本控制：`private-docs/spec-system-v2/04_Generation_and_Cost_Control_v2.md`
- 支付、套餐、权限与回跳：`private-docs/spec-system-v2/05_Billing_and_Entitlement_v2.md`
- 工作台 IA、项目管理与状态流：`private-docs/spec-system-v2/06_Workspace_IA_v2.md`
- 质量目标、回归、样本集与评审机制：`private-docs/spec-system-v2/07_Quality_Engineering_v1.md`
- 文档维护规则与冲突处理：`private-docs/spec-system-v2/99_Document_Maintenance_Rules.md`

使用规则：
- 主 spec `01_FolioBox_MVP_Spec_Core_v2.md` 只用于确认产品范围、主闭环与页面地图
- Freeze `02_Current_Freeze_v2.md` 用于当前版本页面归属、文案、CTA、壳层与行为冻结
- 专题规则分别以对应专题文档为准，不回到主 spec 重复判断
- 质量目标、评审机制、黄金样本集与回归规则统一以 `07_Quality_Engineering_v1.md` 为准
- 文档归属、替换优先于追加、冲突处理统一以 `99_Document_Maintenance_Rules.md` 为准
- `private-docs/archive-legacy/` 下的旧文档仅作历史参考，不作为当前实现依据
- 如果旧文档、旧备注或本文其他段落与 v2 文档冲突，一律以 `private-docs/spec-system-v2/` 下文档为准

执行要求：
- 开始任何产品相关代码修改前，先阅读 `private-docs/CURRENT_SPEC.md`
- 再阅读 `00_README_Document_Map_v2.md`
- 再按任务命中范围读取 `01` 到 `07` 和 `99` 中对应文档；若任务涉及产品范围、当前版本 UI、评分、生成、支付、工作台 IA、质量工程或文档维护规则，必须读取对应文档
- 在开始修改代码前，先输出本次任务命中的文档清单
- 在开始修改代码前，先明确说明：
  - 本次任务涉及哪几份文档
  - 本次实现将以哪份文档作为主依据
  - 是否发现文档冲突
- 如果还没有列出命中文档清单，不要开始改代码

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
    dashboard/        # 工作台首页
    profile/          # 用户资料
    projects/[id]/
      assets/         # 素材导入
      facts/          # 项目关键信息表单
      outline/        # 大纲确认页（含 OutlineClient.tsx）
      editor/         # Block 编辑器（含 EditorClient.tsx）
  (focus)/            # 聚焦流程页面（无营销导航、无工作台侧栏）
    login/            # 登录 / 验证
    payment/result/   # 支付结果页
    score/[id]/       # 评分结果页（免费简版 / 付费完整版）
  (marketing)/        # 公开页面
    page.tsx          # Landing Page
    pricing/          # 价格页
    score/            # 免费评分入口
  (viewer)/           # 公开浏览壳
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
    openai.ts         # OpenAI 实现（具体模型与 task routing 以 04_Generation_and_Cost_Control_v2.md 和环境变量为准）
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

核心闭环（评分 → 注册 → 导入 → 事实表单 → 生成大纲 → 渲染草稿 → 编辑 → 发布/PDF）已完整打通。

另已完成当前版本一致性收口的基础结构：

- 新增 `(focus)` route group，用于评分结果、登录解锁、支付结果等聚焦页面
- 新增公开浏览壳，公开作品集不再复用营销壳
- Dashboard 改为工作台首页，不再跳转到不存在的 `/projects/[id]`
- 导入页改为三步向导，但继续沿用现有 `POST /api/projects` 与 `POST /api/projects/import/images`
- 评分结果页支持“免费简版结果 / 付费完整版结果”两态
- 共享页面骨架组件已冻结：`PageHeader`、`SectionCard`、`EmptyState`、`StepHeader`、`StickyActionBar`、`InlineTip`、`ProgressHint`、`PermissionGate`、`ResumeContextBanner`

`npm run build` 当前无报错。

---

## 未完成 / 待实现（对照 Spec）

以下缺口均已在代码库中有骨架或占位，尚未真实实现：

### P0 优先（影响商业化或付费墙完整性）

**1. 支付真实接入**
`lib/payment/wechat.ts` / `lib/payment/alipay.ts` 为 stub，`createOrder` 返回占位数据，`queryOrder` 始终返回 `pending`，无法真实收款。回调路由验签逻辑同为 stub。真实 SDK 接入需商户证书，替换对应文件中 `TODO` 标注部分即可。

### P0 但可延后

**2. 简历上传与解析**
`app/api/resumes/route.ts` 为 stub（仅返回 `TODO` 字符串），Vercel Blob 上传、解析逻辑、`POST /api/profiles/from-resume/:id` 均未实现。设计师档案页有入口但上传后无实际效果。

**3. 案例详情页（`/cases/[slug]`）**
Landing Page 案例卡片可点击，但 `app/(marketing)/cases/[slug]/page.tsx` 仅为占位文字。Spec §A2 要求完整 Before/After 对比，覆盖 B2B / C 端各一个。

### P1 级别

**4. Figma 自动拉帧**
导入页保存了 Figma URL 并有提示"MVP 阶段暂不自动拉取"，但无 Figma API 集成，用户仍需手动上传截图。

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

## 当前 IA / Shell 约定

当前版本必须按以下页面壳层组织：

- `MarketingShell`
  - `/`
  - `/pricing`
  - `/score`
  - `/cases/[slug]`
- `FocusShell`
  - `/score/[id]`
  - `/login`
  - `/login/verify`
  - `/payment/result`
- `AppShell`
  - `/dashboard`
  - `/profile`
  - `/projects/*`
- `PublicViewerShell`
  - `/p/[slug]`
- `Print`
  - `/projects/[id]/print`

硬规则：

- `MarketingShell` 可以出现营销导航和营销 CTA
- `FocusShell` 不允许出现营销导航，不允许出现与当前任务无关的 CTA
- `AppShell` 只放工作台相关入口
- `PublicViewerShell` 不出现营销导航，也不出现工作台 UI

---

## 当前一致性改造目标

后续开发默认遵循以下当前版本基线：

- Dashboard 是工作台首页，不是项目纯列表页
- 项目卡必须跳转到真实可继续步骤，不允许链接到不存在的 `/projects/[id]`
- 项目继续路径优先级固定为：`editor > outline > facts > assets`
- 评分结果页必须区分：
  - 免费简版结果
  - 付费完整版结果
- 导入页必须维持三步向导：
  - 选择导入方式
  - 填写最小项目信息
  - 确认并进入素材确认
- 设计师档案页要明确说明各字段“会影响什么生成结果”
- 设计系统收口以共享 token 为目标：
  - 官网深色，工作台浅色
  - 共享字体、圆角、描边、主按钮与 icon 风格
  - 不要为 Marketing / Focus / App 再各造一套 UI 语言

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
