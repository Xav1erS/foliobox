export type StyleSelectionSource = "none" | "preset" | "reference_set";

export type StylePreset = {
  key: string;
  label: string;
  description: string;
  emphasis: string;
  density: "airy" | "balanced" | "dense";
  accentColor: string;
  background: string;
  surface: string;
  border: string;
  titleTone: string;
  bodyTone: string;
};

export type StyleReferenceSelection = {
  source: StyleSelectionSource;
  presetKey?: string | null;
  referenceSetId?: string | null;
  referenceSetName?: string | null;
};

export type StyleProfile = {
  source: StyleSelectionSource;
  label: string;
  summary: string;
  presetKey?: string | null;
  referenceSetId?: string | null;
  referenceSetName?: string | null;
  accentColor: string;
  background: string;
  surface: string;
  border: string;
  titleTone: string;
  bodyTone: string;
  density: StylePreset["density"];
  emphasis: string;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: "clean-case",
    label: "简洁案例",
    description: "更强调逻辑、留白和可读性，适合大多数项目起稿。",
    emphasis: "逻辑清楚、标题稳、信息不过载",
    density: "balanced",
    accentColor: "#1d4ed8",
    background: "#f5f7fb",
    surface: "#ffffff",
    border: "#d7deea",
    titleTone: "#0f172a",
    bodyTone: "#475569",
  },
  {
    key: "swiss-grid",
    label: "瑞士网格",
    description: "更强调结构和秩序，适合 B 端、系统和流程型项目。",
    emphasis: "网格感强、标题节奏明确、信息组织理性",
    density: "balanced",
    accentColor: "#0f766e",
    background: "#f1f5f4",
    surface: "#ffffff",
    border: "#d4e1dd",
    titleTone: "#102a2a",
    bodyTone: "#48605d",
  },
  {
    key: "editorial",
    label: "杂志感编排",
    description: "更强调章节气质和叙事包装，适合作品集封面与章节页。",
    emphasis: "章节感强、标题更有舞台感、版面层次明显",
    density: "airy",
    accentColor: "#9a3412",
    background: "#fbf6f0",
    surface: "#fffdf9",
    border: "#ead8cb",
    titleTone: "#431407",
    bodyTone: "#7c4a33",
  },
  {
    key: "info-dense",
    label: "高密度信息型",
    description: "更强调信息压缩和模块感，适合研究、流程和复杂业务改版。",
    emphasis: "信息容纳度高、分区强、注释感明显",
    density: "dense",
    accentColor: "#7c3aed",
    background: "#f6f3ff",
    surface: "#ffffff",
    border: "#ddd6fe",
    titleTone: "#312e81",
    bodyTone: "#5b557b",
  },
  {
    key: "cover-forward",
    label: "封面感视觉型",
    description: "更强调开场氛围和章节包装，适合有较强视觉素材的作品集。",
    emphasis: "封面感更强、章节包装更完整、视觉情绪更明显",
    density: "airy",
    accentColor: "#be123c",
    background: "#fff1f5",
    surface: "#fffafc",
    border: "#fecdd3",
    titleTone: "#4c0519",
    bodyTone: "#7b3145",
  },
];

const DEFAULT_STYLE_PROFILE: StyleProfile = {
  source: "none",
  label: "默认风格",
  summary: "不额外施加风格参考，优先保持中性、清晰、可继续编辑的排版语言。",
  accentColor: "#1f2937",
  background: "#f5f5f4",
  surface: "#ffffff",
  border: "#d4d4d4",
  titleTone: "#111827",
  bodyTone: "#404040",
  density: "balanced",
  emphasis: "中性、稳定、清晰",
};

export function getStylePreset(key: string | null | undefined) {
  if (!key) return null;
  return STYLE_PRESETS.find((preset) => preset.key === key) ?? null;
}

export function resolveStyleProfile(
  selection?: StyleReferenceSelection | null
): StyleProfile {
  if (!selection || selection.source === "none") {
    return DEFAULT_STYLE_PROFILE;
  }

  if (selection.source === "preset") {
    const preset = getStylePreset(selection.presetKey);
    if (!preset) return DEFAULT_STYLE_PROFILE;
    return {
      source: "preset",
      label: preset.label,
      summary: `${preset.description} 当前更偏向：${preset.emphasis}。`,
      presetKey: preset.key,
      accentColor: preset.accentColor,
      background: preset.background,
      surface: preset.surface,
      border: preset.border,
      titleTone: preset.titleTone,
      bodyTone: preset.bodyTone,
      density: preset.density,
      emphasis: preset.emphasis,
    };
  }

  return {
    source: "reference_set",
    label: selection.referenceSetName || "参考图组",
    summary: `本次会参考图组「${selection.referenceSetName || "未命名图组"}」的壳层、标题层级和版面密度，但不会改变内容结构。`,
    referenceSetId: selection.referenceSetId ?? null,
    referenceSetName: selection.referenceSetName ?? "参考图组",
    accentColor: "#0f766e",
    background: "#f3f7f6",
    surface: "#ffffff",
    border: "#cfe2dd",
    titleTone: "#12332d",
    bodyTone: "#49635d",
    density: "balanced",
    emphasis: "参考图组驱动的包装语言",
  };
}
