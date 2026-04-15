# FolioBox — 工程交接文档

本文件只保留项目级、长期稳定、需要在开始实现前快速建立共识的规则。

当前状态与交接信息请看：

- `private-docs/active/CURRENT_STATE.md`
- `private-docs/active/PROJECT_EDITOR_HANDOFF.md`

以上 `active/` 文档只用于提供当前上下文，不覆盖正式规范。

---

## 1. 文档优先级与 Source of Truth

当前唯一有效的产品规范入口：

- `private-docs/CURRENT_SPEC.md`
- `private-docs/spec-system-v3/00_README_Document_Map_v3.md`

当前默认实现依据：

- `private-docs/spec-system-v3/`

硬规则：

- `private-docs/spec-system-v3/` 之外的旧文档，不作为当前默认实现依据
- 若 `archive`、旧注释、旧交接内容与 v3 冲突，一律以 v3 为准
- `Project Editor` 与 `Portfolio Editor` 的行为判断，优先看 `09 / 10 / 11`
- 用户可见页面的体验判断，优先看 `08_Experience_Baseline_v3.md`
- `private-docs/active/` 只记录当前进展、默认实现和交接信息，不覆盖正式 spec

---

## 2. 改代码前必须确认什么

凡是涉及产品实现，开始前至少先读：

1. `private-docs/CURRENT_SPEC.md`
2. `private-docs/spec-system-v3/00_README_Document_Map_v3.md`
3. 按任务命中范围补读对应专题文档

命中范围默认这样判断：

- 生成、配额、重试、成本：读 `04`
- 支付、套餐、权限：读 `05`
- 工作台 IA 与流程：读 `06`
- 回归、质量、验收：读 `07`
- 页面体验、文案、视觉：读 `08`
- `Project Editor`：读 `09`、`11`
- `Portfolio Editor`：读 `10`、`11`

开始改代码前必须先说明：

- 本次命中的文档清单
- 本次实现以哪份文档为主依据
- 是否发现文档冲突

如果变更会改动产品规则、默认行为、主流程、IA、权限边界或多人协作判断边界，先改正式文档，再改实现。

---

## 3. 高频工程命令 / 禁忌

常用命令：

```bash
npm run dev
npm run build
npm run db:push
npm run db:studio
npm run db:generate
```

工程禁忌：

- 数据库变更只用 `npm run db:push`
- 不要用 `prisma migrate dev`
- GitHub 操作优先用 `gh`
- Vercel 操作优先用 `vercel`
- 搜索优先用 `rg`
- 文件查找优先用 `fd`

实现约定：

- Server Components 优先
- 交互逻辑放对应 `*Client.tsx`
- Route Handler 只导出 HTTP 方法
- 业务常量放 `lib/`
- LLM 调用只在服务端
- UI 优先复用 `components/ui/`
- Tailwind 用 `cn()` 合并 class

---

## 4. 关键产品边界红线

壳层边界：

- `MarketingShell` 可有营销导航和营销 CTA
- `FocusShell` 不允许出现无关 CTA
- `AppShell` 只放工作台相关入口
- `PublicViewerShell` 不出现工作台 UI

Editor 红线：

- FolioBox 要做的是垂直类、AI-native 的 Canva / Figma，不是后台页或功能样机
- 中间主舞台不能退化成表单页、检查清单页、大段说明页或后台管理页
- 每个按钮至少要考虑默认、hover、active、focus、disabled、loading
- 高频交互必须有明确反馈：选中、拖拽、放置、排序、缩放、切页、保存中、保存失败、AI 处理中
- 看起来像后台、不像创作工具，或 AI 没有明显利用当前画板 / 对象 / 素材 / 文本结构，均视为未达标
