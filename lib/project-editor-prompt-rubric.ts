import type { ProjectLayoutIntent } from "./project-editor-scene";
import { PROJECT_LAYOUT_INTENTS, type ProjectPageType } from "./project-editor-scene";

type IntentEntry = {
  id: ProjectLayoutIntent;
  name: string;
  silhouette: string;
  whenToUse: string;
  avoidWhen: string;
  goodExample: string;
  badExample: string;
};

const INTENT_LIBRARY: Record<ProjectLayoutIntent, IntentEntry> = {
  hero: {
    id: "hero",
    name: "Hero 主视觉",
    silhouette: "单一主视觉占满大半画面，标题与一句话定义并列，适合作为开场或重磅结论",
    whenToUse: "有一张能代表项目的封面图/完整界面图；或需要一锤定音的结论页",
    avoidWhen: "没有视觉素材；信息是多点并列",
    goodExample: "封面页：preferredAssetIds=[完整界面截图]，title=「智慧通勤助手」，summary=「一句话定义产品价值」",
    badExample: "结果指标页用 hero（应改 grid_3 列三个数字），或没有任何素材时强行用 hero（应改 narrative）",
  },
  split_2_1: {
    id: "split_2_1",
    name: "左右 2:1 分屏",
    silhouette: "左侧正文/论述，右侧单张图或信息面板，重点在文图对应",
    whenToUse: "有一张核心配图 + 一段论述；问题背景 / 业务背景类",
    avoidWhen: "没有视觉素材；信息维度大于 2",
    goodExample: "问题背景页：左侧 narrative 60-100 字描述场景，右侧一张数据看板截图",
    badExample: "把 4 个同层级要点塞进 split_2_1（应改 grid_2x2），或没有图却选 split_2_1（应改 narrative）",
  },
  grid_3: {
    id: "grid_3",
    name: "三宫格",
    silhouette: "三个并列的 info block，标题上方，每个 block 独立承载一个点",
    whenToUse: "3 个同层级要点（三场景 / 三策略 / 三结果指标）",
    avoidWhen: "只有 1-2 个要点或 4 个以上",
    goodExample: "结果证明页：infoCards=[{label:「日活」,value:「+38%」},{label:「留存」,value:「+12pt」},{label:「NPS」,value:「62」}]",
    badExample: "只有 2 个要点强行凑 3 块（应改 split_2_1），或塞 5 条 keyPoints（应改 grid_2x2 + 精简）",
  },
  grid_2x2: {
    id: "grid_2x2",
    name: "2×2 四宫格",
    silhouette: "四个均分 block，适合结构化规则、映射关系或维度对比",
    whenToUse: "4 个同层级要点；规则/组件映射；策略矩阵",
    avoidWhen: "要点 < 3 或 > 4；存在明显时序",
    goodExample: "设计策略页：4 条策略各占一格，每格 label ≤6 字 + value ≤24 字",
    badExample: "时序流程用 grid_2x2（应改 timeline），或 3 条要点凑 4 格留白（应改 grid_3）",
  },
  timeline: {
    id: "timeline",
    name: "时间线 / 流程",
    silhouette: "水平线连接的 N 个节点，每节点下方文字说明，强调顺序",
    whenToUse: "任务链、before/after、流程优化、阶段推进",
    avoidWhen: "信息没有顺序关系；只有 1-2 个节点",
    goodExample: "任务链优化页：4 个节点 = 旧流程 4 步，每节点一句对照说明",
    badExample: "并列要点强行编号变 timeline（应改 grid_3 / grid_2x2）",
  },
  narrative: {
    id: "narrative",
    name: "叙事长文",
    silhouette: "单列大段文字 + 右侧小信息栏，适合反思、总结、开放结论",
    whenToUse: "项目反思；一句话定义问题；总结页",
    avoidWhen: "有强视觉素材；信息是并列要点",
    goodExample: "总结页：narrative 80-110 字反思 + 右侧 2 条短 infoCards 作时间/角色注脚",
    badExample: "封面页用 narrative（应改 hero），或 narrative 写成 4 条 bullet（应改 grid_2x2）",
  },
  showcase: {
    id: "showcase",
    name: "Showcase 展示",
    silhouette: "一张大图靠左居中，右侧 2-3 个短 info 卡 + 底部一句话说明",
    whenToUse: "关键界面展示、模块优化、核心方案",
    avoidWhen: "没有界面图；信息完全是文字",
    goodExample: "关键模块页：preferredAssetIds=[模块大图]，右侧 2-3 个短 infoCards 解释亮点",
    badExample: "纯文字反思页用 showcase（应改 narrative），或没有界面图也选 showcase（应改 grid_3）",
  },
};

const PAGE_TYPE_INTENT_PREFERENCE: Record<ProjectPageType, {
  preferred: ProjectLayoutIntent[];
  fallback: ProjectLayoutIntent;
}> = {
  "项目定位 / 背景页": { preferred: ["hero", "split_2_1"], fallback: "hero" },
  "项目定位 / 背景": { preferred: ["hero", "split_2_1"], fallback: "hero" },
  "业务背景 / 问题背景": { preferred: ["split_2_1", "narrative"], fallback: "split_2_1" },
  "问题与目标": { preferred: ["split_2_1", "narrative"], fallback: "split_2_1" },
  "用户 / 流程 / 关键洞察": { preferred: ["grid_3", "grid_2x2", "timeline"], fallback: "grid_3" },
  "设计目标 / 设计策略": { preferred: ["grid_2x2", "grid_3"], fallback: "grid_2x2" },
  "全局结构优化": { preferred: ["grid_2x2", "grid_3"], fallback: "grid_2x2" },
  "关键模块优化": { preferred: ["showcase", "split_2_1"], fallback: "showcase" },
  "流程 / 任务链优化页": { preferred: ["timeline", "grid_3"], fallback: "timeline" },
  "结果 / 价值证明": { preferred: ["grid_3", "hero"], fallback: "grid_3" },
  "总结 / 反思": { preferred: ["narrative", "grid_2x2"], fallback: "narrative" },
  "核心方案 / 关键界面": { preferred: ["showcase", "split_2_1"], fallback: "showcase" },
  "before / after 或流程优化": { preferred: ["timeline", "split_2_1"], fallback: "timeline" },
  "结果 / 简短总结": { preferred: ["hero", "grid_3"], fallback: "hero" },
  "作品定位 / 题材说明": { preferred: ["hero", "narrative"], fallback: "hero" },
  "关键视觉或关键界面": { preferred: ["showcase", "hero"], fallback: "showcase" },
  "简短说明 / 角色说明": { preferred: ["narrative", "split_2_1"], fallback: "narrative" },
};

export function getPreferredLayoutIntents(pageType: ProjectPageType): ProjectLayoutIntent[] {
  return PAGE_TYPE_INTENT_PREFERENCE[pageType]?.preferred ?? ["narrative"];
}

export function getFallbackLayoutIntent(pageType: ProjectPageType): ProjectLayoutIntent {
  return PAGE_TYPE_INTENT_PREFERENCE[pageType]?.fallback ?? "narrative";
}

export function buildLayoutIntentRubric(): string {
  const lines: string[] = [];
  lines.push("版式意图（layoutIntent）必须从以下 7 个中选一个：");
  for (const intent of PROJECT_LAYOUT_INTENTS) {
    const entry = INTENT_LIBRARY[intent];
    lines.push(
      `- ${entry.id}（${entry.name}）：${entry.silhouette}｜适合：${entry.whenToUse}｜不适合：${entry.avoidWhen}`
    );
    lines.push(`  · 正例：${entry.goodExample}`);
    lines.push(`  · 反例：${entry.badExample}`);
  }
  lines.push("");
  lines.push("每种 pageType 的推荐顺序（排在前面的优先级更高，最多选一个）：");
  for (const [pageType, cfg] of Object.entries(PAGE_TYPE_INTENT_PREFERENCE)) {
    lines.push(`- ${pageType}：${cfg.preferred.join(" / ")}`);
  }
  lines.push("");
  lines.push(
    "硬约束：若相邻两页的 layoutIntent 完全相同，必须把第二页切换到该 pageType 推荐列表里的另一个合法意图，避免连续同质化。"
  );
  lines.push("硬约束：若本页没有任何可用视觉素材（matchedAsset 为空），不要选 hero / showcase / split_2_1，改走 grid_* / timeline / narrative。");
  return lines.join("\n");
}
