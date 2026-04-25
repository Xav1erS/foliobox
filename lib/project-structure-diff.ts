import type { ProjectStructureSuggestion } from "@/lib/project-editor-scene";

export type StructureDiffChange = {
  sectionId: string;
  title: string;
  groupLabel: string;
};

export type StructureDiffRename = {
  sectionId: string;
  groupLabel: string;
  previousTitle: string;
  nextTitle: string;
};

export type StructureDiffReorder = {
  sectionId: string;
  title: string;
  previousPosition: number;
  nextPosition: number;
};

export type ProjectStructureDiff = {
  hasChanges: boolean;
  added: StructureDiffChange[];
  removed: StructureDiffChange[];
  renamed: StructureDiffRename[];
  reordered: StructureDiffReorder[];
  totalBefore: number;
  totalAfter: number;
};

type FlatSection = {
  sectionId: string;
  title: string;
  groupLabel: string;
  position: number;
};

function flatten(suggestion: ProjectStructureSuggestion | null | undefined): FlatSection[] {
  if (!suggestion) return [];
  const flat: FlatSection[] = [];
  let pos = 0;
  for (const group of suggestion.groups) {
    for (const section of group.sections) {
      flat.push({
        sectionId: section.id,
        title: section.title,
        groupLabel: group.label,
        position: pos,
      });
      pos += 1;
    }
  }
  return flat;
}

const EMPTY_DIFF: ProjectStructureDiff = {
  hasChanges: false,
  added: [],
  removed: [],
  renamed: [],
  reordered: [],
  totalBefore: 0,
  totalAfter: 0,
};

export function diffProjectStructure(
  applied: ProjectStructureSuggestion | null | undefined,
  pending: ProjectStructureSuggestion | null | undefined
): ProjectStructureDiff {
  const before = flatten(applied);
  const after = flatten(pending);

  if (before.length === 0 && after.length === 0) return EMPTY_DIFF;

  const beforeById = new Map(before.map((item) => [item.sectionId, item]));
  const afterById = new Map(after.map((item) => [item.sectionId, item]));

  const added: StructureDiffChange[] = [];
  const removed: StructureDiffChange[] = [];
  const renamed: StructureDiffRename[] = [];
  const reordered: StructureDiffReorder[] = [];

  for (const section of after) {
    const prior = beforeById.get(section.sectionId);
    if (!prior) {
      added.push({
        sectionId: section.sectionId,
        title: section.title,
        groupLabel: section.groupLabel,
      });
      continue;
    }
    if (prior.title.trim() !== section.title.trim()) {
      renamed.push({
        sectionId: section.sectionId,
        groupLabel: section.groupLabel,
        previousTitle: prior.title,
        nextTitle: section.title,
      });
    }
    if (prior.position !== section.position) {
      reordered.push({
        sectionId: section.sectionId,
        title: section.title,
        previousPosition: prior.position,
        nextPosition: section.position,
      });
    }
  }

  for (const section of before) {
    if (!afterById.has(section.sectionId)) {
      removed.push({
        sectionId: section.sectionId,
        title: section.title,
        groupLabel: section.groupLabel,
      });
    }
  }

  return {
    hasChanges:
      added.length > 0 || removed.length > 0 || renamed.length > 0 || reordered.length > 0,
    added,
    removed,
    renamed,
    reordered,
    totalBefore: before.length,
    totalAfter: after.length,
  };
}

export function summarizeStructureDiff(diff: ProjectStructureDiff): string {
  if (!diff.hasChanges) return "与已落板的结构一致";
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`新增 ${diff.added.length}`);
  if (diff.removed.length > 0) parts.push(`删除 ${diff.removed.length}`);
  if (diff.renamed.length > 0) parts.push(`改名 ${diff.renamed.length}`);
  if (diff.reordered.length > 0) parts.push(`调序 ${diff.reordered.length}`);
  return parts.join(" · ");
}
