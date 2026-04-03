import type {
  DensityLevel,
  ScoreCoverage,
  ScoreInputScanResult,
  ScoreInputScanSection,
  ScoreInputScanUnit,
  ScoreInputTypePublic,
  ScoreSectionType,
  ScoreUnitType,
  ScoringSource,
} from "./score-contract";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function summarizeText(value: string, maxLength = 120) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function getTextDensity(text: string): DensityLevel {
  const length = normalizeText(text).length;
  if (length >= 600) return "high";
  if (length >= 160) return "medium";
  return "low";
}

function getVisualDensity(textDensity: DensityLevel): DensityLevel {
  if (textDensity === "high") return "low";
  if (textDensity === "medium") return "medium";
  return "high";
}

function classifyUnitType(params: {
  text: string;
  unitNumber: number;
  totalUnits: number;
  sourceHint?: string | null;
}): ScoreUnitType {
  const normalized = normalizeText(`${params.sourceHint ?? ""} ${params.text}`).toLowerCase();

  if (params.unitNumber === 1) return "cover";
  if (params.unitNumber === params.totalUnits) return "closing";
  if (/目录|table of contents|contents/.test(normalized)) return "toc";
  if (/关于我|about me|个人简介|self introduction/.test(normalized)) return "profile";
  if (/项目背景|项目介绍|project overview|背景/.test(normalized)) return "project_intro";
  if (/用户研究|竞品|research|访谈|调研/.test(normalized)) return "research";
  if (/洞察|insight|发现/.test(normalized)) return "insight";
  if (/策略|strategy|原则/.test(normalized)) return "strategy";
  if (/方案|solution|设计方案|页面设计/.test(normalized)) return "solution";
  if (/结果|impact|复盘|上线|数据结果|结果与价值/.test(normalized)) return "result";

  return "unknown";
}

function buildSectionsFromUnits(units: ScoreInputScanUnit[]): ScoreInputScanSection[] {
  if (units.length === 0) return [];

  const sections: ScoreInputScanSection[] = [];
  let currentProjectIndex = 0;

  for (const unit of units) {
    let sectionType: ScoreSectionType = "unknown";
    let title: string | null = null;

    if (unit.unitType === "cover") {
      sectionType = "cover";
      title = "封面";
    } else if (unit.unitType === "profile") {
      sectionType = "profile";
      title = "个人信息";
    } else if (unit.unitType === "toc") {
      sectionType = "toc";
      title = "目录";
    } else if (unit.unitType === "closing") {
      sectionType = "closing";
      title = "结尾";
    } else if (
      unit.unitType === "project_intro" ||
      unit.unitType === "research" ||
      unit.unitType === "insight" ||
      unit.unitType === "strategy" ||
      unit.unitType === "solution" ||
      unit.unitType === "result"
    ) {
      sectionType = "project";
      if (unit.unitType === "project_intro" || sections.every((item) => item.sectionType !== "project")) {
        currentProjectIndex += 1;
      }
      title = `项目 ${currentProjectIndex}`;
    }

    const previous = sections[sections.length - 1];
    if (previous && previous.sectionType === sectionType && previous.title === title) {
      previous.endUnit = unit.unitNumber;
      previous.unitCount += 1;
      unit.sectionId = previous.sectionId;
      continue;
    }

    const sectionId = `${sectionType}_${sections.length + 1}`;
    sections.push({
      sectionId,
      sectionType,
      title,
      startUnit: unit.unitNumber,
      endUnit: unit.unitNumber,
      unitCount: 1,
    });
    unit.sectionId = sectionId;
  }

  return sections;
}

function detectProjectCount(units: ScoreInputScanUnit[], sections: ScoreInputScanSection[]) {
  const projectSections = sections.filter((section) => section.sectionType === "project");
  if (projectSections.length > 0) return projectSections.length;

  const projectLikeUnits = units.filter((unit) =>
    ["project_intro", "research", "insight", "strategy", "solution", "result"].includes(unit.unitType)
  );
  if (projectLikeUnits.length >= 3) return 1;
  return 0;
}

function chooseVisualAnchorUnits(units: ScoreInputScanUnit[], maxCount: number) {
  const priorities: ScoreUnitType[] = [
    "cover",
    "toc",
    "project_intro",
    "result",
    "solution",
    "strategy",
    "research",
    "closing",
    "unknown",
  ];

  const selected: number[] = [];
  for (const priority of priorities) {
    for (const unit of units) {
      if (unit.unitType !== priority) continue;
      if (selected.includes(unit.unitNumber)) continue;
      selected.push(unit.unitNumber);
      if (selected.length >= maxCount) return selected;
    }
  }
  return selected;
}

export function buildScanResult(params: {
  inputType: ScoreInputTypePublic;
  entries: Array<{
    unitNumber: number;
    text: string;
    sourceHint?: string | null;
    visualSummary?: string | null;
  }>;
  estimatedInputTokens?: number;
}): ScoreInputScanResult {
  const totalUnits = params.entries.length;
  const units: ScoreInputScanUnit[] = params.entries.map((entry) => {
    const summary = summarizeText(entry.text);
    const textDensity = getTextDensity(entry.text);
    return {
      unitNumber: entry.unitNumber,
      unitType: classifyUnitType({
        text: entry.text,
        unitNumber: entry.unitNumber,
        totalUnits,
        sourceHint: entry.sourceHint,
      }),
      sectionId: null,
      textDensity,
      visualDensity: getVisualDensity(textDensity),
      extractedTextSummary: summary,
      visualSummary: entry.visualSummary ?? null,
    };
  });

  const sections = buildSectionsFromUnits(units);
  const detectedProjectCount = detectProjectCount(units, sections);

  return {
    inputType: params.inputType,
    totalUnits,
    sections,
    units,
    detectedProjectCount,
    estimatedInputTokens:
      params.estimatedInputTokens ??
      Math.max(
        0,
        units.reduce((sum, unit) => sum + (unit.extractedTextSummary?.length ?? 0), 0) /
          4
      ),
  };
}

function buildOverallStructureSummary(scanResult: ScoreInputScanResult) {
  const sectionSummary = scanResult.sections
    .map((section) => `${section.title ?? section.sectionType}（${section.unitCount} 单位）`)
    .join("、");

  return [
    `输入类型：${scanResult.inputType}`,
    `总扫描单位：${scanResult.totalUnits}`,
    `识别项目数：${scanResult.detectedProjectCount}`,
    `板块结构：${sectionSummary || "未识别出稳定板块"}`,
  ].join("\n");
}

function buildPageSummaries(scanResult: ScoreInputScanResult) {
  return scanResult.units
    .map((unit) => {
      const summary = unit.extractedTextSummary ?? "当前单位缺少稳定文本摘要";
      const visualSummary = unit.visualSummary ? `；视觉信号：${unit.visualSummary}` : "";
      return `单位 ${unit.unitNumber} [${unit.unitType}]：${summary}${visualSummary}`;
    })
    .join("\n");
}

function buildProjectSummaries(scanResult: ScoreInputScanResult) {
  const projectSections = scanResult.sections.filter((section) => section.sectionType === "project");
  if (projectSections.length === 0) {
    return "未识别出稳定项目边界。";
  }

  return projectSections
    .map((section, index) => {
      const unitSummaries = scanResult.units
        .filter((unit) => unit.sectionId === section.sectionId)
        .map((unit) =>
          unit.visualSummary
            ? `${unit.extractedTextSummary ?? "当前单位缺少稳定文本摘要"}（${unit.visualSummary}）`
            : unit.extractedTextSummary
        )
        .filter(Boolean)
        .join("；");

      return `项目 ${index + 1}：覆盖单位 ${section.startUnit}-${section.endUnit}。${unitSummaries}`;
    })
    .join("\n");
}

export function buildPromptInputFromScan(scanResult: ScoreInputScanResult) {
  return [
    "## 整体结构摘要",
    buildOverallStructureSummary(scanResult),
    "",
    "## 页面级摘要",
    buildPageSummaries(scanResult),
    "",
    "## 项目级摘要",
    buildProjectSummaries(scanResult),
  ].join("\n");
}

export function buildCoverage(params: {
  scanResult: ScoreInputScanResult;
  isFullCoverage: boolean;
  includeVisualAnchors: boolean;
  maxVisualAnchors?: number;
}): ScoreCoverage {
  const scoringSources: ScoringSource[] = [
    "overall_structure_summary",
    "page_level_summaries",
  ];
  if (params.scanResult.detectedProjectCount > 0) {
    scoringSources.push("project_level_summaries");
  }

  const visualAnchorUnits = params.includeVisualAnchors
    ? chooseVisualAnchorUnits(params.scanResult.units, params.maxVisualAnchors ?? 8)
    : [];

  if (visualAnchorUnits.length > 0) {
    scoringSources.push("visual_anchor_pages");
  }

  return {
    inputType: params.scanResult.inputType,
    totalUnits: params.scanResult.totalUnits,
    isFullCoverage: params.isFullCoverage,
    detectedProjects: params.scanResult.detectedProjectCount,
    scoringSources,
    visualAnchorUnits,
  };
}
