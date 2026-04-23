"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ProjectStructureGroup,
  ProjectStructureSection,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";

export function StructureOverview({ draft }: { draft: ProjectStructureSuggestion }) {
  const totalPages = draft.groups.reduce((sum, g) => sum + g.sections.length, 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] p-5">
      <div className="flex items-baseline gap-3">
        <span className="text-xs uppercase tracking-wider text-white/40">
          建议总页数
        </span>
        <span className="text-2xl font-semibold text-white">{totalPages}</span>
        <span className="text-sm text-white/40">页 · {draft.groups.length} 个章节</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {draft.groups.map((g, i) => (
          <span
            key={g.id}
            className="rounded-lg bg-white/[0.05] px-2.5 py-1 text-xs text-white/55"
          >
            第 {i + 1} 章 · {g.sections.length} 页
          </span>
        ))}
      </div>
    </div>
  );
}

export function StructureGroupCard({
  group,
  index,
  totalGroups,
  editable,
  onChange,
  onMove,
  onDelete,
}: {
  group: ProjectStructureGroup;
  index: number;
  totalGroups: number;
  editable: boolean;
  onChange: (next: ProjectStructureGroup) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState(group.label);
  const [editingLabel, setEditingLabel] = useState(false);

  useEffect(() => {
    setLabel(group.label);
  }, [group.label]);

  const commitLabel = () => {
    setEditingLabel(false);
    const trimmed = label.trim();
    if (!trimmed || trimmed === group.label) {
      setLabel(group.label);
      return;
    }
    onChange({ ...group, label: trimmed });
  };

  const updateSection = (sectionId: string, patch: Partial<ProjectStructureSection>) => {
    onChange({
      ...group,
      sections: group.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white/90"
          aria-label={expanded ? "收起" : "展开"}
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
        <span className="shrink-0 text-xs font-mono text-white/35">
          第 {index + 1} 章
        </span>
        {editingLabel && editable ? (
          <Input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitLabel();
              if (e.key === "Escape") {
                setLabel(group.label);
                setEditingLabel(false);
              }
            }}
            className="h-7 flex-1 rounded-lg border-white/10 bg-white/[0.06] px-2 text-sm text-white"
          />
        ) : (
          <button
            type="button"
            onClick={() => editable && setEditingLabel(true)}
            disabled={!editable}
            className={cn(
              "flex-1 truncate text-left text-sm font-medium text-white/85",
              editable && "rounded px-1 hover:bg-white/5"
            )}
          >
            {group.label}
          </button>
        )}
        <span className="shrink-0 text-xs text-white/40">{group.sections.length} 页</span>
        {editable ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onMove("up")}
              disabled={index === 0}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white/85 disabled:opacity-25"
              aria-label="上移"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove("down")}
              disabled={index === totalGroups - 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/5 hover:text-white/85 disabled:opacity-25"
              aria-label="下移"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={totalGroups <= 1}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-25"
              aria-label="删除章节"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {expanded ? (
        <div className="border-t border-white/5 bg-black/15 px-4 py-3">
          <ul className="space-y-1.5">
            {group.sections.map((section, sIdx) => (
              <li
                key={section.id}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
              >
                <span className="shrink-0 text-xs font-mono text-white/30">P{sIdx + 1}</span>
                {editable ? (
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="h-7 flex-1 rounded-md border-white/8 bg-white/[0.04] px-2 text-sm text-white"
                  />
                ) : (
                  <span className="flex-1 text-sm text-white/70">{section.title}</span>
                )}
              </li>
            ))}
          </ul>
          {group.rationale ? (
            <p className="mt-3 border-l-2 border-white/10 pl-3 text-xs leading-relaxed text-white/40">
              {group.rationale}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
