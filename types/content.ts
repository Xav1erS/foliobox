/**
 * 集盒 FolioBox — Content Schema v1
 *
 * 两个核心结构：
 * 1. OutlineSchema   — 描述作品集整体结构（存于 PortfolioOutline.sectionsJson）
 * 2. DraftContentSchema — 描述单个 draft 的 block 内容（存于 PortfolioDraft.contentJson）
 *
 * 参考 MVP Spec § 6.11
 */

// ─────────────────────────────────────────────
// Outline Schema
// ─────────────────────────────────────────────

export type VariantType = "professional" | "balanced" | "expressive";

export type SectionType =
  | "cover"
  | "profile"
  | "toc"
  | "project_case"
  | "extras"
  | "closing";

export interface OutlineSection {
  id: string;
  type: SectionType;
  enabled: boolean;
  projectId?: string;         // 仅 project_case 类型
  estimatedPages?: number;    // 仅 project_case 类型
  focus?: string[];           // e.g. ["role", "complexity", "outcome"]
}

export interface OutlineProject {
  projectId: string;
  displayName: string;
  estimatedPages: number;
  coverAssetId: string | null;
}

export interface OutlineSchema {
  theme: VariantType;
  totalEstimatedPages: number;
  projects: OutlineProject[];
  sections: OutlineSection[];
}

// ─────────────────────────────────────────────
// Draft Content Schema (Block-based)
// ─────────────────────────────────────────────

export type BlockType =
  | "hero"
  | "section_heading"
  | "rich_text"
  | "bullet_list"
  | "stat_group"
  | "image_single"
  | "image_grid"
  | "caption"
  | "quote"
  | "divider"
  | "closing";

// Block data types per block type

export interface HeroBlockData {
  title: string;
  subtitle?: string;
  imageAssetId?: string;
}

export interface SectionHeadingBlockData {
  text: string;
  level?: 1 | 2 | 3;
}

export interface RichTextBlockData {
  text: string;  // supports markdown
}

export interface BulletListBlockData {
  items: string[];
}

export interface StatItem {
  label: string;
  value: string;
}

export interface StatGroupBlockData {
  stats: StatItem[];
}

export interface ImageSingleBlockData {
  assetId: string;
  caption?: string;
  alt?: string;
}

export interface ImageGridBlockData {
  assetIds: string[];
  layout: "2-col" | "3-col" | "1-2" | "2-1";
  caption?: string;
}

export interface CaptionBlockData {
  text: string;
}

export interface QuoteBlockData {
  text: string;
  attribution?: string;
}

export type DividerBlockData = Record<string, never>;

export interface ClosingBlockData {
  text?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export type BlockData =
  | HeroBlockData
  | SectionHeadingBlockData
  | RichTextBlockData
  | BulletListBlockData
  | StatGroupBlockData
  | ImageSingleBlockData
  | ImageGridBlockData
  | CaptionBlockData
  | QuoteBlockData
  | DividerBlockData
  | ClosingBlockData;

export interface ContentBlock {
  id: string;
  type: BlockType;
  editable: boolean;
  data: BlockData;
}

export interface DraftPage {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

export interface DraftContentSchema {
  draftId: string;
  variantType: VariantType;
  pages: DraftPage[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Block types that allow text editing by the user */
export const EDITABLE_TEXT_BLOCKS: BlockType[] = [
  "hero",
  "section_heading",
  "rich_text",
  "bullet_list",
  "caption",
  "quote",
  "closing",
];

/** Block types that allow image replacement by the user */
export const EDITABLE_IMAGE_BLOCKS: BlockType[] = [
  "hero",
  "image_single",
  "image_grid",
];
