export type AudienceValue = "TO_C" | "TO_B" | "TO_G" | "INTERNAL";
export type PlatformValue =
  | "WEB"
  | "MOBILE"
  | "DESKTOP"
  | "AUTOMOTIVE"
  | "LARGE_SCREEN"
  | "CROSS_PLATFORM";
export type ProjectNatureValue =
  | "NEW_BUILD"
  | "MAJOR_REDESIGN"
  | "ITERATION"
  | "DESIGN_SYSTEM"
  | "CONCEPT";
export type InvolvementValue = "LEAD" | "CORE" | "SUPPORT";

// ---------------------------------------------------------------------------
// Audience × Nature combos
// ---------------------------------------------------------------------------

type NarrativeCombo = {
  audience: AudienceValue;
  nature: ProjectNatureValue;
  narrativeArc: string;
  recommendedGroups: string[];
  emphasis: string;
  cautions: string;
};

const NARRATIVE_COMBOS: NarrativeCombo[] = [
  // ── To C ──────────────────────────────────────────────────────────────────
  {
    audience: "TO_C",
    nature: "NEW_BUILD",
    narrativeArc: "用户与场景 → 核心任务定义 → 设计策略 → 关键流程与界面 → 上线结果",
    recommendedGroups: [
      "项目概览与定位",
      "目标用户与使用场景",
      "核心任务与流程",
      "关键界面与交互",
      "上线结果与数据",
    ],
    emphasis:
      "C 端新产品要让人感到「场景真实、决策有依据」。要讲清楚用户是谁、在什么情境下用，以及你为什么做这个决策而不是别的。",
    cautions:
      "避免只展示界面截图。缺少用户洞察和决策依据的 C 端案例缺乏说服力。",
  },
  {
    audience: "TO_C",
    nature: "MAJOR_REDESIGN",
    narrativeArc: "旧版问题诊断 → 改版目标与约束 → 设计策略 → 新旧对比 → 效果验证",
    recommendedGroups: [
      "改版背景与动因",
      "旧版问题分析",
      "改版目标与策略",
      "核心改版方案",
      "新旧对比",
      "上线效果与数据",
    ],
    emphasis:
      "改版的灵魂是：为什么要改、改了什么、改后数据是否真的变好。必须有问题诊断和前后对比。",
    cautions:
      "不要只说「我让它更好看了」。缺少问题根因和量化对比的改版项目没有说服力。",
  },
  {
    audience: "TO_C",
    nature: "ITERATION",
    narrativeArc: "问题发现 → 范围界定 → 优化方案 → 迭代落地 → 数据追踪",
    recommendedGroups: [
      "项目背景与优化方向",
      "问题定义与根因",
      "方案决策过程",
      "落地方案细节",
      "效果追踪与复盘",
    ],
    emphasis:
      "迭代项目展示的是发现问题→解决问题的完整链路。要有清晰的优化前后对比和数据佐证。",
    cautions:
      "避免把局部优化拆成一堆零散截图。要有聚焦的问题主线，而不是功能堆砌。",
  },
  // ── To B ──────────────────────────────────────────────────────────────────
  {
    audience: "TO_B",
    nature: "NEW_BUILD",
    narrativeArc:
      "业务背景与角色梳理 → 信息架构与关键流程 → 核心模块设计 → 复杂场景处理 → 落地结果",
    recommendedGroups: [
      "项目概览与业务价值",
      "使用角色与业务流程",
      "信息架构与导航",
      "核心模块设计",
      "边界场景与异常处理",
      "数据与效率结果",
    ],
    emphasis:
      "To B 新产品最看重：是否真的理解业务复杂度，能否把复杂流程拆清楚，对权限、异常、效率是否有深度考虑。",
    cautions:
      "不要把 B 端项目讲成一堆页面拼图。缺少角色模型、业务流程和数据结构的 B 端案例显得很浅。",
  },
  {
    audience: "TO_B",
    nature: "MAJOR_REDESIGN",
    narrativeArc:
      "旧版业务痛点 → 改版目标（效率/体验/一致性） → 架构调整 → 核心模块对比 → 落地指标",
    recommendedGroups: [
      "改版背景与业务驱动",
      "旧版问题与痛点",
      "改版策略与优先级",
      "架构与导航调整",
      "核心模块改版方案",
      "落地效果与业务指标",
    ],
    emphasis:
      "B 端改版要强调效率提升和业务价值，而不只是视觉翻新。数据对比（任务完成率、操作步骤减少等）是核心。",
    cautions:
      "避免只展示界面前后对比图，没有效率数据和业务背景支撑的改版令人质疑。",
  },
  {
    audience: "TO_B",
    nature: "ITERATION",
    narrativeArc: "业务需求来源 → 问题分析 → 方案决策 → 落地细节 → 效果追踪",
    recommendedGroups: [
      "背景与需求来源",
      "问题分析与优先级",
      "设计决策过程",
      "落地方案",
      "效果追踪",
    ],
    emphasis:
      "B 端迭代要展示设计师对业务和系统的深度理解，以及在约束下做出合理决策的能力。",
    cautions: "迭代项目容易流于流水账。需要聚焦关键决策点，展示思考深度。",
  },
  // ── To G ──────────────────────────────────────────────────────────────────
  {
    audience: "TO_G",
    nature: "NEW_BUILD",
    narrativeArc:
      "政务场景与用户群体 → 规范与合规约束 → 信息架构 → 核心服务流程 → 无障碍与兼容性",
    recommendedGroups: [
      "项目概览与政务背景",
      "服务对象与使用场景",
      "合规与规范约束",
      "信息架构与服务流程",
      "核心界面设计",
      "无障碍与多端适配",
    ],
    emphasis:
      "政务产品核心是「服务可达性」——要让不同年龄、能力的公众都能完成任务。强调清晰的服务流程和无障碍设计。",
    cautions:
      "避免用 C 端产品的视觉语言做政务产品。要展示对政务合规约束和多元用户群体的理解。",
  },
  {
    audience: "TO_G",
    nature: "MAJOR_REDESIGN",
    narrativeArc:
      "旧系统问题（效率/兼容/可达） → 改版目标 → 服务流程重构 → 界面对比 → 验收指标",
    recommendedGroups: [
      "改版背景与政务驱动",
      "旧系统问题分析",
      "改版策略",
      "服务流程重构",
      "界面改版方案",
      "验收与上线",
    ],
    emphasis:
      "政务改版要强调可达性提升、服务效率改善、跨部门协作流程优化。要有明确的验收指标。",
    cautions: "政务改版不能只讲「视觉更现代」，需要服务效率和合规性的双重佐证。",
  },
  // ── Internal ─────────────────────────────────────────────────────────────
  {
    audience: "INTERNAL",
    nature: "NEW_BUILD",
    narrativeArc:
      "内部痛点与业务背景 → 用户角色（内部员工） → 工作流与数据流 → 核心功能 → 落地效果",
    recommendedGroups: [
      "项目背景与业务痛点",
      "内部用户角色与工作流",
      "核心功能设计",
      "数据与权限模型",
      "落地效果与效率提升",
    ],
    emphasis:
      "内部工具的价值在于「让内部流程更快、更少出错」。要展示对内部业务流程的深度理解，以及效率提升的数据。",
    cautions: "内部工具案例容易显得「太技术」而缺少设计视角。需要清晰说明设计判断和取舍。",
  },
  // ── Special nature (design system / concept) — audience-agnostic ─────────
  {
    audience: "TO_C",
    nature: "DESIGN_SYSTEM",
    narrativeArc: "起因与目标 → 设计原则 → Token 与基础规范 → 核心组件 → 落地与治理 → 影响",
    recommendedGroups: [
      "项目背景与建设动因",
      "设计原则与价值观",
      "Token 与基础规范",
      "核心组件设计",
      "模式与交互指引",
      "落地治理与影响",
    ],
    emphasis:
      "设计系统的价值在于「规则如何形成、如何被使用、带来了什么协作效率提升」，而不只是展示组件截图。",
    cautions:
      "不要把设计系统讲成一本 Figma 文档。要讲清背后的原则、决策过程和组织落地。",
  },
  {
    audience: "TO_B",
    nature: "DESIGN_SYSTEM",
    narrativeArc: "起因与目标 → 设计原则 → Token 与基础规范 → 核心组件 → 落地与治理 → 影响",
    recommendedGroups: [
      "项目背景与建设动因",
      "设计原则与价值观",
      "Token 与基础规范",
      "核心组件设计",
      "模式与交互指引",
      "落地治理与影响",
    ],
    emphasis:
      "To B 设计系统尤其要强调跨团队协作效率、工程对接、以及规范覆盖率的量化成果。",
    cautions: "不要把设计系统讲成一本 Figma 文档。要讲清背后的原则、决策过程和组织落地。",
  },
  {
    audience: "TO_C",
    nature: "CONCEPT",
    narrativeArc: "机会发现 → 用户洞察 → 概念方向 → 核心方案 → 验证与提案",
    recommendedGroups: [
      "项目背景与机会点",
      "用户洞察与痛点",
      "概念方向探索",
      "核心方案展示",
      "验证过程与结论",
    ],
    emphasis:
      "概念项目重在展示思维过程——如何发现机会、如何收敛方向、如何验证假设。方案本身的品质和逻辑同等重要。",
    cautions: "概念项目不能只有好看的界面，缺乏思维过程的概念案例说服力极弱。",
  },
  {
    audience: "TO_B",
    nature: "CONCEPT",
    narrativeArc: "业务机会 → 用户/业务洞察 → 概念方向 → 方案展示 → 商业价值与下一步",
    recommendedGroups: [
      "业务背景与机会判断",
      "用户与业务洞察",
      "概念方向探索",
      "核心方案展示",
      "商业价值与提案结论",
    ],
    emphasis: "To B 概念项目要展示对业务价值和商业逻辑的理解，而不只是「好看的界面」。",
    cautions: "避免 To B 概念项目流于美化。评审人关注的是你对业务问题的洞察深度。",
  },
];

// ---------------------------------------------------------------------------
// Platform-specific context notes
// ---------------------------------------------------------------------------

const PLATFORM_NOTES: Record<PlatformValue, string> = {
  WEB: "Web 端：注重信息层级、响应式设计、关键页面完整度，以及首屏与转化路径的设计质量。",
  MOBILE:
    "移动端：注重手势交互、单手操作、拇指区域分布、Push/通知机制，以及 iOS/Android 平台规范的取舍。",
  DESKTOP:
    "桌面客户端：注重多窗口管理、快捷键、工具栏密度、以及与操作系统原生规范的协调。",
  AUTOMOTIVE:
    "车载/座舱：注重驾驶安全（操作步骤极简、视线分散时间约束）、HMI 分层架构、以及与物理按键的协同。",
  LARGE_SCREEN:
    "大屏/IoT：注重信息密度、远距离阅读（字号/对比度）、数据可视化设计质量，以及设备多样性。",
  CROSS_PLATFORM:
    "跨端：重点展示如何在不同平台保持体验一致性的同时，适配各平台的独特约束。要有平台差异的对比说明。",
};

// ---------------------------------------------------------------------------
// Involvement notes
// ---------------------------------------------------------------------------

const INVOLVEMENT_NOTES: Record<InvolvementValue, string> = {
  LEAD: "我是项目主导者：叙事可以强调个人决策、方向判断、完整链路的 ownership，以及如何推动跨职能协作。",
  CORE: "我负责核心模块：叙事应聚焦在自己负责的关键决策和设计范围，对非本人主导的部分应如实说明协作方式。",
  SUPPORT:
    "我是协作支持角色：叙事应避免过度抢功，重点突出在自己负责部分的执行质量、专业价值，以及与主设计的协作方式。",
};

// ---------------------------------------------------------------------------
// Fallback generic template
// ---------------------------------------------------------------------------

const GENERIC_NARRATIVE = {
  narrativeArc: "项目背景 → 问题定义 → 设计策略 → 核心方案 → 结果复盘",
  recommendedGroups: [
    "项目概览",
    "背景与问题定义",
    "设计策略",
    "核心方案",
    "结果与复盘",
  ],
  emphasis: "重点展示：问题如何被发现、决策如何形成、方案如何落地、结果是否可量化。",
  cautions: "避免只罗列界面截图，缺少思考过程和决策依据的项目缺乏说服力。",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function formatNarrativeTemplateForPrompt(params: {
  audience?: AudienceValue | null;
  platform?: PlatformValue | null;
  projectNature?: ProjectNatureValue | null;
  involvementLevel?: InvolvementValue | null;
  industry?: string | null;
}): string {
  const { audience, platform, projectNature, involvementLevel, industry } = params;

  // Match audience × nature combo
  const combo =
    audience && projectNature
      ? (NARRATIVE_COMBOS.find(
          (c) => c.audience === audience && c.nature === projectNature
        ) ?? null)
      : null;

  const arc = combo?.narrativeArc ?? GENERIC_NARRATIVE.narrativeArc;
  const groups = combo?.recommendedGroups ?? GENERIC_NARRATIVE.recommendedGroups;
  const emphasis = combo?.emphasis ?? GENERIC_NARRATIVE.emphasis;
  const cautions = combo?.cautions ?? GENERIC_NARRATIVE.cautions;

  const lines: string[] = [
    `推荐叙事弧：${arc}`,
    `推荐分组方向：${groups.join(" / ")}`,
    `评审关注重点：${emphasis}`,
    `常见陷阱：${cautions}`,
  ];

  if (platform && PLATFORM_NOTES[platform]) {
    lines.push(`平台特殊考量：${PLATFORM_NOTES[platform]}`);
  }

  if (industry) {
    lines.push(`行业背景：项目所在行业为「${industry}」，请结合行业特点判断哪些内容更值得深讲。`);
  }

  if (involvementLevel && INVOLVEMENT_NOTES[involvementLevel]) {
    lines.push(`职责叙事策略：${INVOLVEMENT_NOTES[involvementLevel]}`);
  }

  if (!combo) {
    lines.unshift("（未找到精确匹配的叙事模板，按通用框架处理）");
  }

  return lines.join("\n");
}
