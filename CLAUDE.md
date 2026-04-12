# FolioBox — 工程交接文档

面向 Claude Code / Codex 的仓库交接说明。  
目标不是记录所有历史，而是让接手的人快速知道：

- 什么规则长期有效
- 当前代码到底以什么为准
- `Project Editor` 现在做到哪一步
- 继续推进时优先顺序是什么

---

## 1. 规范入口与优先级

当前产品规范稳定入口：

- `private-docs/CURRENT_SPEC.md`

当前唯一有效的产品文档体系：

- `private-docs/spec-system-v3/00_README_Document_Map_v3.md`
- `private-docs/spec-system-v3/01_FolioBox_Spec_Core_v3.md`
- `private-docs/spec-system-v3/02_Current_Freeze_v3.md`
- `private-docs/spec-system-v3/03_Scoring_Strategy_v3.md`
- `private-docs/spec-system-v3/04_Generation_and_Cost_Control_v3.md`
- `private-docs/spec-system-v3/05_Billing_and_Entitlement_v3.md`
- `private-docs/spec-system-v3/06_Workspace_IA_v3.md`
- `private-docs/spec-system-v3/07_Quality_Engineering_v3.md`
- `private-docs/spec-system-v3/08_Experience_Baseline_v3.md`
- `private-docs/spec-system-v3/09_Project_Editor_Detailed_Spec_v1.md`
- `private-docs/spec-system-v3/10_Portfolio_Editor_Detailed_Spec_v1.md`
- `private-docs/spec-system-v3/11_Editor_Interaction_Principles_v1.md`
- `private-docs/active/Editor_Product_Quality_Bar_2026-04-10.md`
- `private-docs/spec-system-v3/99_Document_Maintenance_Rules_v3.md`

硬规则：

- `private-docs/spec-system-v3/` 之外的旧文档，不作为当前实现依据
- 如果旧说明、旧注释、旧交接内容和 v3 冲突，一律以 v3 为准
- `Project Editor` 与 `Portfolio Editor` 的行为判断，优先看 `09 / 10 / 11`
- 用户可见页面的体验判断，优先看 `08_Experience_Baseline_v3.md`

---

## 2. 开始任务前必须做什么

凡是涉及产品实现，开始改代码前至少先读：

1. `private-docs/CURRENT_SPEC.md`
2. `private-docs/spec-system-v3/00_README_Document_Map_v3.md`
3. 按任务命中范围再读对应专题文档

如果任务涉及：

- 生成、配额、重试、成本：读 `04`
- 支付、套餐、权限：读 `05`
- 工作台 IA 与流程：读 `06`
- 回归、质量、验收：读 `07`
- 页面体验、文案、视觉：读 `08`
- `Project Editor`：读 `09`、`11`
- `Portfolio Editor`：读 `10`、`11`

改代码前必须先说明：

- 本次命中的文档清单
- 本次实现以哪份文档为主依据
- 是否发现文档冲突

如果还没列出命中文档，不要开始改代码。

---

## 3. 文档同步边界

### 必须先改文档再改代码

满足以下任意条件，先同步 v3 文档，再继续实现：

- 会改变产品规则、默认行为、主流程、IA、权限边界
- 会改变评分、成本、支付、套餐、回跳规则
- 会影响多人协作时的判断边界

例子：

- FREE / PRO 权限边界
- 首页默认主路径
- 结果页 CTA 规则
- PDF 主链路选型

### 可以直接改代码

以下情况默认直接修实现，不要求先改文档：

- 明显的实现偏差
- 浅显的交互问题
- 不改变规则含义的文案或视觉优化

例子：

- 页面缺登录入口
- 两个同权重主 CTA 冲突
- 页面跳转闪回
- 卡片间距、圆角、字号、留白、hover、边框调整

### 判断原则

- 会反复被争议、会影响系统边界的东西，进文档
- 明显浅显的实现判断，不进文档，直接修

---

## 4. Editor 产品标准

`Project Editor` 与 `Portfolio Editor` 默认按以下标准执行：

- FolioBox 要做的是 **垂直类、AI-native 的 Canva / Figma**
- editor 是产品主战场，不是后台页，不是功能样机
- 目标不是“能用”，而是“像正式产品”

必须同时评估：

- UI 视觉质量
- 交互动作合理性
- 动效是否帮助理解
- 功能摆放是否合理
- 是否真的帮助 AI 获得更多上下文

不允许把中间主舞台退化成：

- 表单页
- 检查清单页
- 大段说明页
- 后台管理页

每个按钮至少要考虑：

- 默认
- hover
- active
- focus
- disabled
- loading

每个高频交互都要有明确反馈：

- 选中
- 拖拽
- 放置
- 排序
- 缩放
- 切页
- 保存中
- 保存失败
- AI 处理中

验收红线：

- 看起来像后台，不像创作工具：未达标
- 功能可用但状态不完整：未达标
- AI 没有明显利用当前画板 / 对象 / 素材 / 文本结构：未达标
- 为了省事牺牲产品心智：必须回退重做

---

## 5. 当前仓库事实

### 产品简介

FolioBox 是一个面向国内设计师求职场景的 Web 产品。  
用户上传设计稿与简历信息，平台通过 AI 生成并帮助整理一份可投递的作品集初稿，支持在线预览链接和 PDF 导出。

### 技术栈

- Next.js 15 App Router
- TypeScript
- Prisma
- PostgreSQL / Supabase
- NextAuth v5
- OpenAI
- Vercel Blob
- Tailwind CSS
- shadcn/ui
- Fabric.js（当前 `Project Editor` 主画布引擎）

### 当前壳层

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
  - `/portfolios/*`
- `PublicViewerShell`
  - `/p/[slug]`
- `Print`
  - `/projects/[id]/print`
  - `/portfolios/[id]/print`

硬规则：

- `MarketingShell` 可有营销导航和营销 CTA
- `FocusShell` 不允许出现无关 CTA
- `AppShell` 只放工作台相关入口
- `PublicViewerShell` 不出现工作台 UI

### 当前关键主文件

- `app/(app)/projects/[id]/editor/ProjectEditorFabricClient.tsx`
- `components/editor/EditorScaffold.tsx`
- `lib/project-editor-scene.ts`
- `app/api/projects/[id]/recognition/analyze/route.ts`
- `app/api/projects/[id]/recognition/incremental/route.ts`
- `app/api/projects/[id]/structure/suggest/route.ts`
- `app/api/projects/[id]/structure/route.ts`
- `app/api/projects/[id]/layout/precheck/route.ts`
- `app/api/projects/[id]/layout/generate/route.ts`

---

## 6. 当前 Project Editor 进展（截至 2026-04-11）

### 当前主实现

- `/projects/[id]/editor` 默认走 **Fabric 版 Project Editor**
- 旧 DOM editor 仅作为兼容实现保留，可通过 `?engine=legacy` 访问
- 后续新功能默认不要再加到 legacy 里

### 当前编辑器结构

- 顶部：文件级导航与项目级动作
  - 返回
  - 项目标题
  - 保存状态
  - `项目诊断`
  - `生成排版`
- 左侧：窄 icon rail + 展开面板
  - `项目`
  - `素材`
  - `结构`
  - `图层`
  - `画板`
- 中间：深色舞台 + 白色 16:9 主画板 + 浮动工具条 + 底部缩略条
- 右侧：`属性 / AI`

### 当前已完成的 P0 主流程

`Project Editor` 当前已经打通：

- 填写项目背景
- 上传项目设计图
- 执行素材轻识别
- 生成结构建议
- 手工编辑 / 确认结构建议
- 按确认后的结构一键落成画板组
- 新增素材后执行增量识别，并给出 diff / 是否建议刷新结构

### 当前已具备的编辑能力

- 文本、图片、基础形状
  - 矩形
  - 正方形
  - 圆形
  - 三角形
  - 线段
- 选中、拖拽、缩放
- 复制 / 粘贴 / 创建副本 / 删除
- 图层列表与图层拖拽排序
- 右键菜单、图层更多菜单、对象菜单已基本统一
- 右侧 Inspector 可编辑文本、图片、形状基础属性
- 右侧 AI 面板可承接诊断和生成结果
- `生成排版` 已接入 precheck / style reference / generation scope 基础链路

### 当前已经明确变更、不要回退的执行方案

- 左侧常驻结构是 `项目 / 素材 / 结构 / 图层 / 画板`
- `素材` 是常驻主面板，不再仅是临时浮层
- `插入图片` 是素材体系快捷入口，不替代素材面板
- `结构` 面板是正式主流程面板，不是附属说明区
- `结构建议` 不是只读结果，而应允许编辑、确认，并进一步落成画板
- 底部缩略条属于中间舞台系统的一部分，不应被当成整页独立 footer
- 当前方向是：悬浮工具条只保留画布级动作，对象级编辑交给右侧 Inspector

### 当前仍在持续打磨、尚未稳定的部分

- 舞台与主画板适配
  - 白色主画板的 16:9 适配
  - 舞台居中
  - 侧栏展开/收起联动
  - 底部缩略条与舞台同步重排
- 左右 rail 的统一性
  - 结构、密度、层级、文案仍在持续统一
- 编辑器文案减重
  - 原则是操作优先、说明退后
- 画布级 vs 对象级动作边界
  - 不要再把对象编辑能力塞回悬浮工具条

### 当前继续开发顺序

后续推进 `Project Editor` 时，默认按这个顺序：

1. 先保证舞台 / 主画板 / 底部缩略条的几何关系正确
2. 再统一左右 rail 的结构、文案、层级和卡片语法
3. 再补对象级交互 polish
   - 选中态
   - 控制点
   - 右键菜单
   - 图层拖拽反馈
4. 最后再继续深挖 AI 面板、结构面板和生成链路细节

### 当前交接必读文档

- `private-docs/audits/Project_Editor_Gap_Audit_2026-04-11.md`
- `private-docs/spec-system-v3/09_Project_Editor_Detailed_Spec_v1.md`
- `private-docs/spec-system-v3/11_Editor_Interaction_Principles_v1.md`
- `private-docs/active/Editor_Product_Quality_Bar_2026-04-10.md`

如果要继续补 `导入素材 -> 轻识别 -> 结构 -> 落板 -> 增量识别` 这条主流程，还要补读：

- `private-docs/spec-system-v3/04_Generation_and_Cost_Control_v3.md`
- `private-docs/spec-system-v3/07_Quality_Engineering_v3.md`

---

## 7. 当前已知未完成项

### P0

- 支付真实接入仍是 stub
  - `lib/payment/wechat.ts`
  - `lib/payment/alipay.ts`
  - `/api/payments/wechat/notify`
  - `/api/payments/alipay/notify`

### P0 但可延后

- 简历上传与解析未落地
  - `app/api/resumes/route.ts` 仍是 stub
- `/cases/[slug]` 仍不是完整案例详情页

### P1

- Figma 自动拉帧未接

---

## 8. 支付与权限的稳定事实

### 支付三层模型

- `Order`
  - 每次支付意图
  - 含来源上下文：`sourceScene / projectId / draftId`
- `UserPlan`
  - 权益状态唯一来源
  - `requirePlan()` 直接查此表
- `BillingEvent`
  - 审计日志
  - 不参与业务判断

### 权限校验

- 服务端：`requirePlan(userId, action)` → 403 `{ error: "upgrade_required" }`
- 客户端：`useEntitlement()` → 结合 `<PaywallModal>`

### 支付流程

1. `POST /api/orders/create`
2. `POST /api/orders/:id/pay`
3. 前端轮询 `POST /api/orders/:id/refresh`

支付结果页从 `Order` 中读取 `sourceScene / projectId / draftId` 还原流程，不信任 URL 参数。

---

## 9. 常用命令与工程约定

### 常用命令

```bash
npm run dev
npm run build
npm run db:push
npm run db:studio
npm run db:generate
```

### 数据库注意事项

必须用：

```bash
npm run db:push
```

不要用：

```bash
prisma migrate dev
```

原因：当前数据库已有数据且无完整 migration 历史，`migrate dev` 会因 drift 报错。

### 代码约定

- Server Components 优先
- 交互逻辑放对应 `*Client.tsx`
- Route Handler 只导出 HTTP 方法
- 业务常量放 `lib/`
- LLM 调用只在服务端
- UI 优先复用 `components/ui/`
- Tailwind 用 `cn()` 合并 class

### 工具偏好

- GitHub 操作优先用 `gh`
- Vercel 操作优先用 `vercel`
- 搜索优先用 `rg`
- 文件查找优先用 `fd`

---

## 10. Git / PR 工作方式

- 小范围、低风险、轻文案改动，可直接在当前分支处理
- 功能开发、多文件修改、部署、鉴权、支付、数据库、环境变量、路由结构变化，默认新建分支走 PR
- 如果用户要求“端到端完成”，默认包含：
  - 建分支
  - 改代码
  - 提交 commit
  - 推送分支
  - 创建 PR
- 未经用户明确要求，不主动合并 PR，不主动发生产

单人协作默认策略：

- 仓库按“单人开发 + AI 协作”模式处理
- agent 负责把 Git / GitHub 流程整理清楚
- 用户负责确认目标、验收结果、决定是否合并
- UI 页面默认同时关注功能完成度与视觉质量

---

## 11. 环境变量

```bash
DATABASE_URL
DIRECT_URL
NEXTAUTH_URL
AUTH_SECRET
EMAIL_SERVER_HOST
EMAIL_SERVER_PORT
EMAIL_SERVER_USER
EMAIL_SERVER_PASSWORD
EMAIL_FROM
OPENAI_API_KEY
BLOB_READ_WRITE_TOKEN
LLM_PROVIDER
```
