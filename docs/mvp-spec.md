# 集盒FolioBox MVP Spec
##把零散项目整理成更能投的作品集

## 0. 文档目标

这是一份给 Codex / Claude code 工程实现用的 MVP 规格说明。

目标不是完整描述长期产品，而是明确：

- MVP 版本到底做什么
- 哪些功能必须做，哪些明确不做
- 前后端需要有哪些页面、数据模型、接口与状态流转
- 如何以最小范围验证核心商业假设

这份文档默认面向 **单人 / 小团队快速实现**，强调：

- Web-first
- 先做通路，再做精细化
- 先验证“评分 → 重制”闭环，再做高级能力

---

## 1. MVP 一句话定义

一个面向国内设计师求职场景的 Web 产品：

用户可以上传已有作品集获取基础评分，或导入设计稿与简历信息，在平台内生成并编辑一份更适合投递的作品集初稿，并导出链接 / PDF。

---

## 2. MVP 目标

### 2.1 用户目标

帮助用户完成以下闭环：

1. 上传现有作品集并获得基础评分
2. 导入一个真实项目
3. 补充最小必要项目事实
4. 先生成并确认作品集大纲、主题与缩略图选择
5. 再渲染 2–3 个候选作品集版本
6. 编辑并导出一份可投递初稿

### 2.2 业务目标

验证以下 4 个核心假设：

1. 用户愿意使用“免费评分”作为产品入口
2. 用户愿意从评分结果进入“重制作品集”链路
3. 用户愿意补充必要事实，而不是只要全自动
4. 用户认可生成结果具备投递价值

### 2.3 成功标准（MVP 阶段）

建议最低观察指标：

- 评分上传完成率 > 20%
- 评分结果页到注册转化率 > 20%
- 注册用户中完成首个项目生成的比例 > 25%
- 首次生成到导出比例 > 20%
- 首次生成后主观反馈“敢拿去投递” >= 60%

---

## 3. MVP 范围

## 3.1 P0：必须实现

### A. 评分入口

- 上传作品集链接 / PDF / 图片
- 输出基础总分
- 输出 8 个维度的简版分数
- 输出 3–5 条高层级问题摘要
- 提供 CTA：注册并重制这份作品集

### A2. 案例展示与信任入口

- Landing Page 提供显性的案例展示入口
- 支持展示 3–6 个示例案例卡片
- 支持展示“重制前 / 重制后”对比
- 支持进入示例详情页查看完整结构
- 示例案例需覆盖至少两类典型方向：
  - B 端 / 企业系统
  - C 端 / 视觉表达型

### B. 用户系统

- 邮箱登录 / Magic Link 或验证码登录
- 基础用户资料
- 项目列表

### C. 设计师档案

- 手动填写
- 简历 PDF / DOCX 上传
- 基础简历解析
- 设计师档案生成

### D. 项目导入

- Figma 链接导入（MVP 推荐入口）
- 图片上传辅助导入
- 候选页面列表生成
- 用户手动勾选 / 排序展示页

### E. 项目事实表单

- 基础项目信息
- 项目背景 / 用户 / 目标
- 个人角色 / 负责范围 / 参与深度
- 核心挑战 / 设计亮点
- 投递方向

### F. 大纲确认与作品集生成

- 先生成作品集大纲（outline）
- 支持用户确认：板块结构、项目顺序、主题风格、缩略图选择
- 确认后再生成 case study 初稿
- 默认输出 2–3 个候选版本
- 支持 3 条风格轨道：
  - 专业克制版
  - 通用平衡版
  - 视觉表达版
- 默认按 PDF 投递场景控制页数与信息密度

### G. 编辑器

- 文案编辑
- 图片替换 / 删除
- 模块顺序调整（有限范围）
- 候选版本切换

### H. 导出

- 在线链接
- PDF 导出

---

## 3.2 P1：建议预留但不阻塞首发

- 简历与作品集一致性检查面板
- 一键局部改写
- 敏感信息隐藏 / 打码
- 多项目合并成一个作品集
- 更多模板与风格轨道
- 分享图导出

---

## 3.3 P2：明确不进首发

- 插件端
- 多平台深度接入（即时设计 / Pixso / MasterGo）
- 高级自由排版
- 自定义域名
- 多人协作
- 面试讲述提纲
- 岗位知识库
- 企业版 / 私有化
- 专家点评系统

## 3.4 首发范围说明

为避免 MVP 首发范围在开发过程中继续膨胀，现补充以下冻结规则：

### 3.4.1 首发主闭环

MVP 首发必须围绕以下主闭环展开：

评分入口 → 注册 → 项目导入 → 项目事实补充 → 大纲确认 → 候选版本渲染 → 编辑 → 导出

首发目标不是做完整求职平台，而是优先验证：

用户是否愿意先用免费评分进入产品

用户是否愿意从评分结果进入重制链路

用户是否愿意补充必要事实，而不是只要全自动

用户是否认可最终生成结果具备投递价值

### 3.4.2 范围控制原则

任何不直接服务于首发主闭环的功能，不进入 P0

任何需要新建复杂子系统才能成立的能力，不进入 P0

任何会显著增加状态复杂度、渲染复杂度、编辑复杂度的能力，默认不进首发

---

## 4. 用户主流程

## 4.1 路径 A：评分入口路径

1. 用户进入 Landing Page
2. 点击「先给我的作品集打分」
3. 上传链接 / PDF / 图片
4. 系统返回评分结果页
5. 用户点击「注册并重制这份作品集」
6. 创建账号
7. 进入项目创建流程
8. 导入项目 / 补充资料 / 生成作品集

## 4.2 路径 B：直接生成路径

1. 用户进入 Landing Page
2. 点击「直接开始生成作品集」
3. 登录 / 注册
4. 填写或导入设计师档案
5. 导入项目
6. 勾选展示页
7. 填写项目事实表单
8. 生成并确认作品集大纲
9. 渲染候选版本
10. 编辑
11. 导出

---

## 5. 页面清单

## 5.1 P0 页面

### 1）Landing Page

目标：承接流量、引导评分或直接生成，并通过案例展示建立初始信任。

视觉方向：

- 外围营销页采用 **强设计感品牌壳层**
- 参考 UXfolio 这类高对比、大标题、强节奏、深色背景 + 网格/结构线的表达
- 首屏必须具备“够酷、够专业、不是模板站”的第一印象
- 视觉风格服务于吸引和建立信任，但不能牺牲信息清晰度

模块：

- Hero 区
- 双 CTA
- 案例展示入口（显性）
- 精选案例卡片区
- 重制前 / 后对比区
- 痛点说明
- 评分能力说明
- 重制能力说明
- 适用人群
- 方案概览
- FAQ / 隐私与保密说明
- Footer

### 2）登录 / 注册页

目标：完成用户进入

视觉方向：

- 仍属于外围品牌壳层的一部分
- 保持 Landing 的视觉气质连续性：深色背景、高对比、大留白、品牌感强
- 但交互上要更克制，突出输入框、CTA、状态反馈

模块：

- 邮箱输入
- 获取验证码 / Magic Link
- 登录状态说明

### 3）评分上传页

目标：让用户输入现有作品集

模块：

- 作品集链接输入
- PDF 上传
- 图片上传
- 格式与说明
- 提交按钮

### 4）评分结果页

目标：让用户看到问题，并进入重制链路

模块：

- 总分
- 等级标签
- 8 维度分数
- 3–5 条高层级问题摘要
- 对应的改进方向提示
- CTA：注册并重制

### 5）设计师档案页

目标：建立基础用户画像

模块：

- 当前职位
- 工作年限
- 擅长方向
- 目标岗位
- 优势标签
- 简历上传入口

### 6）简历解析确认页

目标：确认解析出的关键字段

模块：

- 原始简历预览（可选）
- 结构化字段确认
- 缺失项提示
- 应用到档案按钮

### 7）项目列表页

目标：项目管理

模块：

- 项目列表
- 新建项目按钮
- 编辑 / 删除 / 继续生成

### 8）项目导入页

目标：导入 Figma 链接或图片

模块：

- Figma URL 输入
- 图片上传
- 导入结果预览

### 9）展示页确认页

目标：用户选择展示页

模块：

- 页面缩略图列表
- 勾选 / 取消
- 拖拽排序
- 封面页标记

### 10）项目事实表单页

目标：收集作品集生成最小事实

模块：

- 分步表单
- 示例提示
- 缺失字段提示
- 保存草稿

### 11）大纲确认页

目标：在高成本成品渲染前，先让用户确认整份作品集的结构与素材选择。

模块：

- 作品集整体板块结构预览
- 默认板块建议：
  - 封面
  - 个人信息
  - 目录
  - 项目 1
  - 项目 2
  - 项目 3（可选）
  - 其他 / 补充信息（可选）
  - 封底
- 每个项目的页数建议
- 项目顺序调整
- 主题风格选择
- 缩略图 / 封面图确认
- 预计页数与预计生成成本提示
- 确认并开始渲染按钮

### 12）生成结果页 / 编辑页

目标：展示候选版本并进行编辑

视觉方向：

- 登录后的平台内部统一采用 **工作台 / 操作系统式 UI**
- 参考 Canva 这类“内容画布 + 工具侧栏 + 顶部操作条”的结构
- 设计语言以稳定、轻量、丝滑为主，不延续外围页面那种强营销表达
- 内部组件统一使用 shadcn/ui 风格体系，优先保证操作效率与信息密度控制

模块：

- 版本切换 Tab（2–3 个候选版本）
- 页面预览
- 文案编辑
- 图片替换
- 模块顺序调整
- 导出按钮

### 13）导出页 / 发布确认页

目标：输出可投递结果

模块：

- 在线链接
- PDF 导出
- 基础检查提示

### 14）案例详情页（公开示例）

目标：让潜在用户查看平台能产出的案例质量，建立信任。

视觉方向：

- 继续使用外围品牌壳层
- 案例页允许比工作台更强的视觉表达，用于建立“审美可信度”
- 但案例内容区仍要保证可扫描性与结构清楚

模块：

- 案例封面
- 项目类型标签（B 端 / C 端 / 运营向等）
- 重制前 / 后对比（可选）
- 关键结构展示
- 页面缩略图预览
- CTA：上传我的作品集打分 / 开始重制

---

## 5.2 终端支持策略（MVP）

MVP 阶段采用 桌面优先、移动兼容 的终端策略。

### 5.3.1 桌面端

桌面端为完整主工作流承载端，需支持：

- 项目导入
- 展示页勾选与排序
- 项目事实表单填写
- 作品集大纲确认
- 候选版本切换
- 文案编辑
- 图片替换 / 删除
- 模块顺序调整
- 在线链接发布
- PDF 导出

### 5.3.2 移动端

移动端不作为完整编辑端，主要承担轻量访问与查看职责，需保证以下能力可用：

- Landing Page 浏览
- 评分入口提交
- 评分结果查看
- 登录 / 注册
- 项目列表查看
- 生成结果预览
- 在线链接浏览
- 少量基础信息补充（如简单文字修改或继续流程）

### 5.3.3 MVP 不在移动端实现的能力

以下能力不纳入移动端首发支持范围：

- 完整画布式编辑
- 复杂拖拽排序
- 批量图片管理
- 深度模块调整
- 精细版式编辑
- 完整导出主操作

### 5.3.4 交互原则

当用户在移动端进入需要复杂编辑的页面时，系统应允许其查看当前内容与进度，但明确提示：
> **为获得更稳定和高效的编辑体验，请在桌面端继续完成作品集编辑与导出。**

---

## 6. 数据模型

以下是建议的 MVP 数据模型，不要求一次到位，但字段和关系要为后续扩展留空间。

## 6.1 User

```ts
User {
  id: string
  email: string
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.2 DesignerProfile

```ts
DesignerProfile {
  id: string
  userId: string
  currentTitle: string | null
  yearsOfExperience: string | null
  industry: string | null
  specialties: string[]
  targetRole: string | null
  strengths: string[]
  tonePreference: string | null
  source: 'manual' | 'resume_parse'
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.3 Resume

```ts
Resume {
  id: string
  userId: string
  fileUrl: string
  fileType: 'pdf' | 'docx'
  parseStatus: 'pending' | 'done' | 'failed'
  rawText: text | null
  parsedJson: json | null
  createdAt: datetime
}
```

## 6.4 Project

```ts
Project {
  id: string
  userId: string
  name: string
  sourceType: 'figma' | 'images' | 'manual'
  sourceUrl: string | null
  importStatus: 'draft' | 'imported' | 'failed'
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.5 ProjectAsset

```ts
ProjectAsset {
  id: string
  projectId: string
  assetType: 'page' | 'frame' | 'image'
  title: string | null
  imageUrl: string
  sortOrder: number
  selected: boolean
  isCover: boolean
  metaJson: json | null
}
```

## 6.6 ProjectFact

```ts
ProjectFact {
  id: string
  projectId: string
  projectType: string | null
  industry: string | null
  timeline: string | null
  stage: string | null
  hasLaunched: boolean | null
  background: text | null
  targetUsers: text | null
  businessGoal: text | null
  constraints: text | null
  roleTitle: string | null
  involvementLevel: 'lead' | 'core' | 'support' | null
  responsibilities: string[]
  collaborators: string[]
  keyContribution: text | null
  biggestChallenge: text | null
  keyHighlights: string[]
  designRationale: text | null
  tradeoffs: text | null
  resultSummary: text | null
  measurableImpact: text | null
  substituteEvidence: text | null
  targetJob: string | null
  targetCompanyType: string | null
  emphasis: string[]
  tonePreference: string | null
  updatedAt: datetime
}
```

## 6.7 PortfolioScore

```ts
PortfolioScore {
  id: string
  userId: string | null
  inputType: 'link' | 'pdf' | 'images'
  inputUrl: string | null
  totalScore: number
  level: 'ready' | 'needs_improvement' | 'not_ready'
  dimensionScores: json
  summaryPoints: string[]
  recommendedActions: string[]
  createdAt: datetime
}
```

## 6.8 PortfolioOutline

```ts
PortfolioOutline {
  id: string
  userId: string
  projectIds: string[]
  status: 'draft' | 'confirmed' | 'rendering' | 'failed'
  overallTheme: 'professional' | 'balanced' | 'expressive'
  totalEstimatedPages: number
  estimatedTokenCost: number | null
  sectionsJson: json
  // example sections:
  // cover / profile / toc / project_1 / project_2 / extras / closing
  selectedThumbnailMap: json
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.9 PortfolioDraft

```ts
PortfolioDraft {
  id: string
  userId: string
  projectId: string
  variantType: 'professional' | 'balanced' | 'expressive'
  status: 'pending' | 'done' | 'failed'
  title: string | null
  contentJson: json
  previewHtml: text | null
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.10 PublishedPortfolio

```ts
PublishedPortfolio {
  id: string
  draftId: string
  userId: string
  slug: string
  publishedHtml: text
  pdfUrl: string | null
  isPublished: boolean
  createdAt: datetime
  updatedAt: datetime
}
```

## 6.11 内容 Schema v1（冻结补充）

MVP 阶段必须掌握自己的内容结构，不把作品集内容完全绑定到某个编辑器内部格式。

系统内部统一使用：

- `sectionsJson`：描述作品集整体结构
- `contentJson`：描述单个 draft 的 block 内容

### 6.11.1 Outline Schema v1 示例

```json
{
  "theme": "professional",
  "totalEstimatedPages": 18,
  "projects": [
    {
      "projectId": "proj_1",
      "displayName": "企业数据平台改版",
      "estimatedPages": 8,
      "coverAssetId": "asset_3"
    }
  ],
  "sections": [
    {
      "id": "cover",
      "type": "cover",
      "enabled": true
    },
    {
      "id": "profile",
      "type": "profile",
      "enabled": true
    },
    {
      "id": "toc",
      "type": "toc",
      "enabled": true
    },
    {
      "id": "project_proj_1",
      "type": "project_case",
      "projectId": "proj_1",
      "enabled": true,
      "estimatedPages": 8,
      "focus": ["role", "complexity", "outcome"]
    },
    {
      "id": "closing",
      "type": "closing",
      "enabled": true
    }
  ]
}
```

### 6.11.2 Draft Content Schema v1 示例

```json
{
  "draftId": "draft_1",
  "variantType": "professional",
  "pages": [
    {
      "id": "page_1",
      "title": "封面",
      "blocks": [
        {
          "id": "block_1",
          "type": "hero",
          "editable": true,
          "data": {
            "title": "企业数据平台改版",
            "subtitle": "让复杂业务系统更易理解与协作",
            "imageAssetId": "asset_3"
          }
        }
      ]
    },
    {
      "id": "page_2",
      "title": "项目背景",
      "blocks": [
        {
          "id": "block_2",
          "type": "section_heading",
          "editable": true,
          "data": {
            "text": "项目背景"
          }
        },
        {
          "id": "block_3",
          "type": "rich_text",
          "editable": true,
          "data": {
            "text": "原有平台信息架构复杂，业务协作成本高。"
          }
        },
        {
          "id": "block_4",
          "type": "image_grid",
          "editable": true,
          "data": {
            "assetIds": ["asset_5", "asset_6"],
            "layout": "2-col"
          }
        }
      ]
    }
  ]
}
```

### 6.11.3 MVP 支持的 block 类型

首发建议仅支持以下 block：

- `hero`
- `section_heading`
- `rich_text`
- `bullet_list`
- `stat_group`
- `image_single`
- `image_grid`
- `caption`
- `quote`
- `divider`
- `closing`

### 6.11.4 可编辑规则

#### 允许用户直接编辑

- 标题
- 正文文案
- 图注
- 图片替换 / 删除
- block 顺序（有限范围）

#### 不允许用户在 MVP 阶段自由编辑

- 任意新增自定义 block 类型
- 自定义复杂多栏布局
- 任意改变整个模板骨架
- 拖出无限自由排版能力

### 6.11.5 结构约束

- 每个项目 case 必须包含：背景、角色、问题 / 挑战、设计判断、结果 / 价值
- 若无可量化结果，必须输出替代证据表达块
- 若角色信息不清楚，必须在生成前提示用户补充，而不是自动猜测

---

## 7. 后端能力与接口建议

以下为建议接口，不要求完全照搬，但建议保持清晰分层。

## 7.1 Auth

- `POST /api/auth/send-login-code`
- `POST /api/auth/verify-login-code`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## 7.2 Resume

- `POST /api/resumes/upload`
- `POST /api/resumes/:id/parse`
- `GET /api/resumes/:id`
- `POST /api/profiles/from-resume/:resumeId`

## 7.3 Profile

- `GET /api/profile`
- `PUT /api/profile`

## 7.4 Score

- `POST /api/scores/create`
  - 输入：link / pdf / images
- `GET /api/scores/:id`

## 7.5 Projects

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`

## 7.6 Project Import

- `POST /api/projects/import/figma`
- `POST /api/projects/import/images`
- `PUT /api/projects/:id/assets/select`
- `PUT /api/projects/:id/assets/reorder`

## 7.7 Project Facts

- `GET /api/projects/:id/facts`
- `PUT /api/projects/:id/facts`

## 7.8 Portfolio Outline & Generation

- `POST /api/projects/:id/outline`
  - 输入：project facts + selected assets + target job
  - 输出：作品集大纲、板块建议、预估页数、预估 token 成本
- `PUT /api/outlines/:id`
  - 用户修改大纲、顺序、主题、缩略图选择
- `POST /api/outlines/:id/confirm`
  - 确认大纲并进入渲染
- `POST /api/outlines/:id/render`
  - 根据已确认大纲生成候选版本
- `GET /api/projects/:id/drafts`
- `GET /api/drafts/:id`
- `PUT /api/drafts/:id`

## 7.9 Publish / Export

- `POST /api/drafts/:id/publish`
- `POST /api/drafts/:id/export-pdf`
- `GET /api/published/:slug`

## 7.10 状态流转冻结补充

### Project.importStatus

- `draft`
- `importing`
- `imported`
- `failed`

### Resume.parseStatus

- `pending`
- `done`
- `failed`

### PortfolioOutline.status

- `draft`
- `confirmed`
- `rendering`
- `done`
- `failed`

### PortfolioDraft.status

- `pending`
- `done`
- `failed`

## 7.11 状态约束

- 大纲未确认前，不允许进入正式 render
- 图片替换、模块排序、文案修改，不触发整份重新生成
- 主题切换优先复用现有内容，只做样式与版式级切换；若必须重生成，需要明确提示成本和等待
- 导出 PDF 优先复用最近一次 `done` 状态的 draft

## 7.12 LLM API 选型建议（MVP）

MVP 阶段建议不要一开始就做多供应商混用，而是：

- **先选 1 家主供应商跑通主链路**
- 在代码层预留 provider 抽象
- 等评分、生成、导出链路稳定后，再评估是否接第二家

### 推荐主方案：OpenAI

建议原因：

- 适合快速落地 Web 产品 MVP
- 文本生成、改写、结构化输出、图文理解都能覆盖主链路
- 适合把“评分、解析、生成、改写”先放在一套接口体系里完成
- 后续若要扩展网页搜索、批处理、实时语音等能力，路径也比较清晰

### MVP 模型分工建议

#### A. 主生成模型

建议：`gpt-5.4-mini`

用途：

- 作品集大纲生成
- 项目 case study 初稿生成
- 候选版本渲染
- 文案改写
- 导出前语气优化

使用原则：

- 只用于“直接影响用户感知质量”的任务
- 尽量避免在高频表单保存、每次微调时重复调用

#### B. 轻量任务模型

建议：`gpt-5.4-nano`

用途：

- 表单预填
- 简历基础字段抽取
- 基础评分摘要
- 规则校验前的轻量分类
- 页面标题归纳、标签提取
- 预计页数与成本估算辅助

使用原则：

- 能用轻量模型解决的任务，不占用主生成模型
- 用于高频、低风险、对文风要求不高的任务

#### C. 后续可选增强

可视需要再考虑：

- `gpt-5.4`：用于更高质量重制或高客单服务版本
- Web search：用于后续岗位要求知识库增强
- Batch：用于异步评分、批量改写、低成本离线任务

### 备选成本方案：Google Gemini

如果前期对成本极度敏感，可考虑：

- `gemini-2.5-flash` 作为主生成模型
- `gemini-2.5-flash-lite` 作为轻量评分 / 提取模型

适合场景：

- 更看重高频任务成本
- 评分、抽取、分类任务占比很高
- 团队本身更熟悉 Google Cloud / Gemini 生态

但 MVP 阶段不建议因为“便宜”就上多家模型，否则会增加：

- Prompt 调参成本
- 测试成本
- 回归验证成本
- 线上不稳定性排查成本

### 不建议的首发策略

- 不建议一上来同时接 OpenAI + Anthropic + Gemini
- 不建议评分、生成、改写分别用三家模型
- 不建议把“供应商选择”当作当前最优先优化点

对当前 MVP 来说，更重要的是：

- 跑通评分 → 大纲确认 → 重制渲染 → 导出链路
- 把生成质量和用户转化先验证清楚

### 工程实现建议

- 抽象 `LLMProvider` 接口
- 所有 prompt 输入输出都走统一 service
- 生成任务记录模型名、版本、token 用量、耗时
- 前期默认只启用 1 家 provider
- 保留 feature flag，方便后续切换或灰度测试

### 当前推荐结论

如果现在就要开做，推荐：

- **主方案：OpenAI**
  - `gpt-5.4-mini`：大纲生成 + 成品渲染
  - `gpt-5.4-nano`：轻量抽取 / 基础评分 / 成本估算
- **备选方案：Gemini**
  - `gemini-2.5-flash`：大纲生成 + 成品渲染
  - `gemini-2.5-flash-lite`：轻量抽取 / 基础评分

前期不建议把 Claude 作为首发主线路由，而更适合在后续需要对比高质量生成效果时，作为 benchmark 或特定高价值链路候选。

## 7.13 成本控制与模型路由策略（MVP）

由于国内求职场景里，作品集常以 PDF 形式投递，一份完整作品集通常不只是单个项目页面，而包含：

- 封面
- 个人信息
- 目录
- 项目 1
- 项目 2
- 项目 3（可选）
- 其他 / 补充信息（可选）
- 封底

如果每个项目展开后为 20–30 页，那么直接从原始资料一次性生成整份成品，会导致：

- token 成本偏高
- 调试成本偏高
- 一次失败重试的浪费很大
- 用户等待时间过长

因此，MVP 必须采用 **两阶段生成策略**：

### 阶段 1：低成本大纲阶段

先生成：

- 作品集板块结构
- 项目顺序
- 每个项目的页数建议
- 每个项目的主题与展示重点
- 缩略图 / 封面图候选
- 预估总页数
- 预估 token 成本

这一阶段优先：

- 规则引擎 + 轻量模型
- 输出结构化 JSON
- 不直接渲染完整正文与完整版式

### 阶段 2：确认后成品渲染阶段

仅在用户确认以下内容后再执行高成本渲染：

- 作品集整体大纲
- 主题风格
- 选用的项目
- 每个项目的缩略图 / 封面图
- 是否保留个人信息、目录、补充信息等板块

这一阶段才调用主生成模型，生成：

- case study 正文
- 各候选版本内容
- PDF / 网页预览

### 必须遵守的成本控制规则

- 表单每次保存不触发完整生成
- 主题切换优先只触发样式级重排，不重跑整份正文生成
- 图片替换不重跑全文生成
- 导出 PDF 前优先复用最近一次 render 结果
- 大纲未确认前禁止进入完整渲染
- 对超出推荐页数的作品集给出提醒，而不是直接无上限生成

### MVP 推荐页数策略

为控制成本和提升可投递性，MVP 默认建议：

- 整份作品集页数建议区间：**12–24 页**
- 单个重点项目建议页数：**6–10 页**
- 超过阈值时提示用户压缩项目数量或信息密度

### 开发测试阶段的成本控制建议

- 本地联调优先使用 mock 数据和静态 JSON
- 评分页、表单页、编辑器开发阶段不依赖真实 LLM
- 只在“生成大纲”和“确认后渲染”两个节点调用模型
- 记录每次 outline / render 的 token 与耗时
- 为 outline 生成和 render 生成分别统计成本，避免混算

### 产品交互上的必要限制

用户看到的流程必须明确是：

1. 导入资料
2. 确认大纲
3. 确认主题与缩略图
4. 再开始成品渲染

而不是：

1. 导入资料
2. 直接等待整份成品生成

这样既降低成本，也更符合设计师对“结果可控”的预期。

---

## 8. 评分逻辑（MVP 简化版）

MVP 不要求做高精度智能评分，但必须保证：

- 结果看起来合理
- 反馈足够具体
- 能推动用户进入下一步

## 8.1 8 个评分维度

- 首屏专业感
- 可扫描性
- 项目选择质量
- 角色清晰度
- 问题定义与设计判断
- 结果与价值证明
- 真实性与可信度
- 投递适配度

## 8.2 免费版输出

- 总分
- 等级标签
- 各维度分数
- 3–5 条问题摘要
- 一个推荐动作 CTA
- 可跳转查看平台示例案例，帮助用户理解“更好的结果长什么样”

## 8.3 评分结果页 CTA

MVP 先测试这三个 CTA：

- 解锁详细建议
- 在平台内重制这份作品集
- 生成更适合大厂投递的版本

## 8.4 评分规则冻结补充

MVP 评分不追求“评得像资深专家一模一样”，但必须做到：

- 看起来合理
- 不明显乱评
- 能解释为什么扣分
- 能把用户推到下一步

## 8.5 等级阈值

- `85–100`：可直接投递
- `70–84`：具备投递价值，但建议局部优化
- `50–69`：可作为草稿，不建议直接投递
- `< 50`：不建议直接投递

## 8.6 评分输出结构

```json
{
  "totalScore": 72,
  "level": "needs_improvement",
  "dimensionScores": {
    "first_impression": 12,
    "scanability": 10,
    "project_selection": 7,
    "role_clarity": 9,
    "problem_solving": 15,
    "impact_evidence": 8,
    "authenticity": 5,
    "job_fit": 6
  },
  "summaryPoints": [
    "项目角色描述偏弱，招聘方难以快速判断你的负责范围",
    "结果证明不足，当前案例更像过程展示而不是价值展示",
    "整体结构可读性一般，信息层级不够清楚"
  ],
  "recommendedActions": [
    "补全角色与负责范围",
    "补充结果数据或替代证据",
    "进入平台内重制当前案例"
  ]
}
```

## 8.7 各维度简化判定规则

### 首屏专业感

看是否具备：

- 明确标题
- 项目名称或角色定位
- 封面视觉是否稳定
- 是否明显像练习页 / 模板页 / 拼贴页

### 可扫描性

看是否具备：

- 标题层级清楚
- 模块分段明显
- 是否能快速找到背景、角色、结果
- 是否长段堆叠、难以扫读

### 项目选择质量

看是否具备：

- 项目数量是否失控
- 是否有 1–3 个重点案例
- 是否出现大量重复页面或无效展示

### 角色清晰度

看是否具备：

- 是否写明角色
- 是否写明负责范围
- 是否能区分主导 / 参与 / 配合

### 问题定义与设计判断

看是否具备：

- 项目背景
- 用户或业务目标
- 核心挑战
- 为什么这样设计
- 是否只有结果图没有推理过程

### 结果与价值证明

看是否具备：

- 数据结果
- 业务反馈
- 用户反馈
- 替代证据
- 是否完全没有结果表达

### 真实性与可信度

看是否具备：

- 是否出现夸张空话
- 是否明显堆砌套话
- 是否有与角色不匹配的过度表述

### 投递适配度

看是否具备：

- 是否贴近目标岗位表达
- 是否更像泛展示而不是求职材料

## 8.8 评分实现建议

- 免费版评分采用 **规则引擎 + 轻量模型摘要** 的混合方案
- 维度给分优先由规则和结构判断完成
- 3–5 条摘要可由轻量模型生成，但必须绑定可解释的扣分点
- 不允许输出无法落地的空洞建议

## 8.9 结果页 CTA 冻结

MVP 首发统一保留以下 CTA：

- 在平台内重制这份作品集
- 生成更适合投递的版本
- 查看示例案例

“解锁详细建议”可保留文案测试位，但不要求首发必须形成单独复杂能力。

---

## 9. 生成逻辑（MVP）

## 9.1 输入源

生成时统一使用以下输入：

- DesignerProfile
- Resume（若有）
- Project + ProjectAssets
- ProjectFact
- Target job / emphasis
- User-confirmed portfolio outline

## 9.2 生成流程（两阶段）

### 阶段 A：Outline 生成

先生成结构化大纲，包括：

- 整份作品集板块
- 默认板块顺序
- 项目顺序
- 每个项目建议页数
- 推荐封面图 / 缩略图
- 风格轨道建议
- 预计总页数
- 预计 token 成本

### 阶段 B：Outline 确认后再渲染

用户确认大纲后，系统才生成：

- 各项目 case study 正文
- 封面 / 目录 / 封底等标准板块
- 2–3 个候选版本预览
- 可编辑 block 结构

## 9.3 生成约束

- 固定 case study 结构
- 禁止捏造数据结果
- 若无数据，使用替代证据表达
- 明确角色边界
- 输出为可编辑 block 结构，而不是一整段纯文本

## 9.4 候选版本

必须返回 2–3 个版本：

- `professional`
- `balanced`
- `expressive`

版本差异主要在：

- 首屏布局
- 图文比例
- 标题层级
- 风格强度

版本不应该在信息结构上完全失控。

---

## 9.5 作品集编辑方式（MVP 决策）

### 9.5.1 结论

MVP 阶段采用：

> **手动可视化编辑为主，AI 辅助改写为辅。**

不采用纯对话式 AI 编辑作为主交互。

### 9.5.2 为什么这样定

原因：

- 作品集属于高审美、高可控要求的内容产物
- 设计师对版式、图文顺序、封面图、缩略图、文案语气都很敏感
- 纯聊天式修改虽然灵活，但不利于用户建立“结果可控”的信任感
- MVP 阶段如果把编辑主链路做成对话式，会显著增加实现复杂度与调试成本

### 9.5.3 MVP 编辑交互

编辑器主交互采用：

- 直接点击 block 编辑标题 / 正文 / 图注
- 直接替换或删除图片
- 模块顺序在有限范围内拖拽调整
- 版本切换查看 2–3 个候选版本

AI 只作为辅助动作出现，例如：

- 改写这一段
- 更适合大厂语气
- 更突出我的角色
- 压缩成更短版本
- 把这段写得更专业一些

### 9.5.4 不做的交互（MVP）

- 不做整份作品集的聊天式连续编辑
- 不做“和 AI 来回对话完成整份作品集”的主流程
- 不做复杂的多轮 agent 协作式编辑

### 9.5.5 后续可扩展方向

后续可在编辑器右侧增加轻量 AI Side Panel，而不是把主编辑体验完全聊天化。

---

## 9.6 后端平台选择（MVP 决策）

### 9.6.1 结论

MVP 推荐采用：

> **Supabase 作为主后端底座，Vercel 作为默认部署平台。**

#### 方案 A（最推荐）

- **Supabase**：Postgres / Auth / Storage
- **Vercel**：Next.js 前端 + API Routes / Server Actions + 部分异步任务

这个方案适合：

- 单人或小团队
- 希望减少基础设施搭建时间
- 优先跑通产品链路，而不是先搭独立 worker 服务

#### 方案 B（后续增强）

- **Supabase**：Postgres / Auth / Storage
- **Vercel**：前端 + 轻 API
- **Railway**：仅在后续需要独立 worker、重型 PDF 渲染、长耗时后台任务时再补充

### 9.6.2 为什么推荐 Vercel

原因：

- 当前产品前端是 Next.js，Vercel 适配度最高
- 更适合首发阶段的轻 API 与页面一体部署
- 能减少额外服务编排和部署心智负担
- 更符合单人 / 小团队快速验证的节奏

### 9.6.3 需要注意的限制

- 不要把所有重任务都压到一次函数调用里
- 长耗时或重 CPU 任务（例如大批量 PDF 渲染）后续仍可能需要拆出去
- 因此首发应坚持“先大纲，后渲染”的成本控制策略
- 首发阶段不要依赖高频定时任务驱动核心业务

### 9.6.4 平台分工建议

#### Supabase 负责：

- 用户登录
- 用户资料
- Postgres 数据库存储
- 文件存储（简历、图片、导出文件元数据）
- 基础权限与行级访问控制
- 文件访问可通过 signed URL 控制

#### Vercel 负责：

- Next.js 前端部署
- API Routes / Server Actions
- 评分、Outline 生成、成品渲染等首发主链路
- 轻量后台逻辑

#### Railway 负责（后续按需接入）：

- 重型异步任务 worker
- 更重的 PDF 渲染服务
- 大批量 Figma 导入处理
- 明显超出 Vercel 轻部署模型的后台任务

### 9.6.5 MVP 默认建议

MVP 首发按以下组合实现：

- **Supabase + Vercel**
- 暂不拆 Railway
- 当异步任务、PDF 渲染、长任务明显变重时，再补 Railway

### 9.6.6 工程建议

- API 层尽量保持无状态，方便后续从 Vercel 平滑拆分到独立 worker
- PDF 导出优先做“少量、按需、复用最近 render 结果”的策略
- 不要在首发阶段为未来复杂度过早设计

---

## 9.7 OSS-first 原则（不要重复造轮子）

### 9.7.1 结论

MVP 实现必须遵守：

> **能用成熟开源方案解决的，不重复造轮子。**

### 9.7.2 适用范围

优先寻找开源方案的模块包括：

- 富文本 / Block 编辑器
- PDF 渲染或导出
- 文件上传
- 表单校验
- 拖拽排序
- 队列与后台任务
- Markdown / HTML / JSON 转换
- 鉴权与存储

### 9.7.3 当前推荐的开源优先策略

#### 编辑器

优先考虑：

- **BlockNote**：更接近 block-based 编辑，适合 Notion-like 内容编辑
- **Tiptap**：更成熟、更灵活，适合自定义扩展较多的富文本场景

MVP 判断建议：

- 如果追求“快速有块编辑体验”，优先 BlockNote
- 如果追求“更强可定制能力”，优先 Tiptap

#### 表单与校验

- React Hook Form
- Zod

#### 拖拽排序

- 选成熟 React DnD 方案，不自写底层拖拽逻辑

#### PDF / 页面导出

- 优先采用成熟 HTML → PDF 渲染链路
- 不自己实现 PDF 排版引擎

#### 后端底座

- Supabase 优先替代自建 Auth / DB / Storage

### 9.7.4 Codex 实现原则

Codex 在实现前，每个功能模块先问 3 个问题：

1. 有没有成熟的开源方案可以直接接？
2. 有没有只需轻度封装，而不必从 0 写？
3. 当前需求是否真的需要自定义到不能复用开源？

如果前两个答案为“有”，默认不自研。

### 9.7.5 允许自研的部分

以下模块更适合自己实现：

- 评分规则编排
- 大纲生成与确认流程
- 作品集 JSON schema
- 渲染管线的业务逻辑
- 与岗位方向、项目事实相关的 prompt 组织

也就是说：

- **基础设施与通用交互尽量复用**
- **产品核心逻辑自己掌握**

## 9.8 失败态与重试策略

MVP 必须定义失败态，不允许所有失败都落成一句“请稍后再试”。

### 9.8.1 Figma 导入失败态

#### 输入校验失败

- 链接格式不合法
- 不是可识别的 Figma 文件链接

提示：

- 请检查链接格式
- 请确认粘贴的是文件链接而不是其他页面链接

#### 权限失败

- 链接有效，但当前服务无法访问

提示：

- 请确认文件已开放可读取权限，或改用图片上传

#### 内容读取失败

- 文件存在，但页面 / frame 获取失败

提示：

- 当前文件读取不完整，请重试或改用图片上传

#### 文件过大

- 页面数量或 frame 数量超过系统阈值

提示：

- 当前文件内容过多，请只导入本次要做作品集的核心页面

### 9.8.2 简历解析失败态

- 文件格式不支持
- 文本抽取失败
- 解析结果为空

提示策略：

- 支持重新上传
- 支持跳过解析改手动填写

### 9.8.3 大纲生成失败态

- 项目事实缺失严重
- 未选择足够展示素材
- 模型调用失败

提示策略：

- 明确指出缺失项
- 支持继续补全后重试
- 模型错误时允许重试，不丢失当前表单内容

### 9.8.4 渲染失败态

- 某个 draft 渲染失败
- 多个 draft 全部失败

提示策略：

- 单个版本失败时，其余成功版本仍可继续编辑
- 全部失败时保留 outline，允许重新渲染
- 不清空用户已确认的大纲与素材选择

### 9.8.5 PDF 导出失败态

- 渲染超时
- 图片资源失效
- HTML 转 PDF 失败

提示策略：

- 提供重新导出
- 若最近一次草稿存在可用预览，则优先复用该预览
- 明确提示导出失败不影响在线链接版本

### 9.8.6 重试规则

- 同一失败任务允许手动重试
- 表单保存不应因生成失败而丢失
- 失败原因必须落日志
- outline / render / export 三类任务必须记录耗时、token、错误类型

---

## 10. 前端实现建议

## 10.1 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui（内部工作台默认组件体系）
- Zustand 或 React Context（轻量状态管理）
- React Hook Form + Zod（表单）

## 10.2 编辑器实现建议

MVP 不需要复杂富文本编辑器。

建议采用：

- block-based JSON 数据结构
- 每个 block 单独编辑
- 支持：
  - 标题
  - 正文
  - 图片
  - 图注
  - 列表
  - section

交互上以“直接编辑 block”为主，并在 block 级别提供轻量 AI 操作按钮，例如：

- 改写这一段
- 压缩为更短版本
- 更专业
- 更强调角色贡献

这样更稳定，也更便于后续导出和模板切换。

## 10.3 界面风格实现原则

前端实现采用 **双层视觉系统**：

### A. 外围品牌壳层（面子）

适用范围：

- Landing Page
- 案例页
- 定价页（后续）
- 登录 / 注册页

实现原则：

- 强设计感
- 高对比
- 大标题
- 深色背景为主
- 可使用网格、结构线、渐变光效等强化品牌辨识度
- 目标是吸引、建立审美信任、提升点击意愿

### B. 内部工作台壳层（里子）

适用范围：

- 项目列表
- 导入流程
- 大纲确认
- 编辑器
- 导出页

实现原则：

- 稳定
- 可控
- 高效率
- 类操作系统式工作台
- 使用 shadcn/ui 统一组件体系
- 借鉴 Canva 这类“左侧工具、中央画布、顶部操作、右侧辅助”的信息组织思路
- 目标是减少学习成本，提升操作流畅度与完成率

### 设计实施约束

- 外围与内部允许风格明显不同，但品牌颜色、字体和基础 token 要保持一致
- 不要把 Landing 的强视觉风格直接带入编辑器内部
- 不要把工作台的朴素风格直接套到首页和案例页
- 外围负责“吸引人”，内部负责“留住人”

---

## 11. 异步任务建议

以下任务建议走异步队列：

- 简历解析
- Figma 导入处理
- 图片处理
- AI 生成
- PDF 导出
- 评分分析

建议每个异步任务都包含状态：

- pending
- running
- done
- failed

前端需轮询或订阅状态变化。

---

## 12. 验收标准

## 12.1 P0 功能验收

### 评分入口

- 用户可成功提交链接 / PDF / 图片任一输入
- 可返回总分 + 分维度分数 + 问题摘要
- 结果页有明确 CTA

### 项目导入

- 用户可通过 Figma 链接创建项目
- 用户可通过图片创建项目
- 可生成候选页面列表
- 用户可勾选、排序并继续下一步

### 项目事实表单

- 用户可保存草稿
- 必填项缺失时不可进入生成

### 大纲确认与作品集生成

- 系统可先返回结构化大纲、页数建议、缩略图建议与成本估算
- 用户确认大纲后，系统才返回 2–3 个候选版本
- 每个版本均有完整结构
- 内容可编辑

### 导出

- 用户可获得可访问链接
- 用户可导出 PDF

---

## 12.2 非功能验收

- 核心页面移动端可用，桌面端体验优先
- 大纲生成时间目标：< 20s（理想）
- 确认后单次成品渲染时间目标：< 60s（理想）
- 评分生成时间目标：< 30s（理想）
- 错误态有用户可理解的提示
- 上传失败 / 解析失败 / 生成失败均可重试

---

## 13. 开发顺序建议

## 第一阶段

- Landing
- 登录
- 评分上传 + 评分结果
- 案例详情页（至少 2 个静态示例）

## 第二阶段

- 设计师档案
- 项目导入
- 展示页确认
- 项目事实表单
- 大纲确认页

## 第三阶段

- Outline 生成
- 候选版本渲染
- 编辑器
- 导出

## 第四阶段

- 指标埋点
- 评分结果页 CTA 优化
- 付费墙与方案页

---

## 14. Codex / Claude code  执行建议

Codex / Claude code 实现时建议按以下原则：

1. 先搭建数据模型与路由骨架
2. 所有 AI 能力先走 mock / placeholder 接口，再逐步接真实模型
3. 所有评分逻辑先做规则版，再逐步加智能分析
4. 编辑器先做稳定的 block 模型，不做复杂自由编辑
5. 所有“后续阶段”能力不要混入首发代码路径
6. Landing Page 必须包含案例展示与信任入口，不要只展示功能文案
7. 前端必须采用“双层视觉系统”：外围品牌壳层负责吸引，内部工作台壳层负责效率，不要混用两种界面目标

---

## 15. 本 spec 的最终边界

这份 spec 只服务于一个目标：

> **尽快做出一个能验证“免费评分 → 作品集重制 → 导出可投递初稿”闭环的 MVP。**

如果实现过程中出现 scope 膨胀，优先级判断规则是：

- 能否提升评分入口转化？
- 能否提升首次生成完成率？
- 能否提升导出率？

如果不能，默认不进 MVP。