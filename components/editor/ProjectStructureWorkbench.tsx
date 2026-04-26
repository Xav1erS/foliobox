"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  StructureGroupCard,
  StructureOverview,
} from "@/components/editor/ProjectStructureEditor";
import { newStructureId, parseJsonResponse } from "@/app/(app)/projects/[id]/editor/editor-helpers";
import type {
  ProjectMaterialRecognition,
  ProjectStructureGroup,
  ProjectStructureSection,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import type { ApplyStructureResponseBase } from "@/lib/project-structure-apply-types";
import {
  diffProjectStructure,
  summarizeStructureDiff,
} from "@/lib/project-structure-diff";

type StructureWorkbenchMessage = {
  tone: "info" | "error";
  text: string;
} | null;

type ApplyStructureResponse = ApplyStructureResponseBase;

export function ProjectStructureWorkbench({
  projectId,
  projectName,
  initialStructureDraft,
  initialMaterialRecognition,
  initialHasExistingBoards,
}: {
  projectId: string;
  projectName: string;
  initialStructureDraft: ProjectStructureSuggestion | null;
  initialMaterialRecognition: ProjectMaterialRecognition | null;
  initialHasExistingBoards: boolean;
}) {
  const router = useRouter();
  const [structureDraft, setStructureDraft] = useState(initialStructureDraft);
  const [materialRecognition] = useState(initialMaterialRecognition);
  const [hasExistingBoards, setHasExistingBoards] = useState(initialHasExistingBoards);
  const [suggestingStructure, setSuggestingStructure] = useState(false);
  const [structureSaveState, setStructureSaveState] = useState<
    "saved" | "saving" | "dirty" | "error"
  >("saved");
  const [applyingStructure, setApplyingStructure] = useState(false);
  const [actionMessage, setActionMessage] = useState<StructureWorkbenchMessage>(null);
  const [actionError, setActionError] = useState("");

  const totalPages = useMemo(
    () => structureDraft?.groups.reduce((sum, group) => sum + group.sections.length, 0) ?? 0,
    [structureDraft]
  );
  // 落板基准：以本次进入页面时的结构为"已应用"快照，与当前 draft 对比即可看到改动。
  const appliedSnapshotRef = useRef(initialStructureDraft);
  const structureDiff = useMemo(
    () => diffProjectStructure(appliedSnapshotRef.current, structureDraft),
    [structureDraft]
  );
  const diffSummary = summarizeStructureDiff(structureDiff);

  function mutateStructureDraft(
    updater: (current: ProjectStructureSuggestion) => ProjectStructureSuggestion
  ) {
    setStructureDraft((current) => {
      if (!current) return current;
      const next = updater(current);
      return {
        ...next,
        status: "draft",
        confirmedAt: null,
      };
    });
    setStructureSaveState("dirty");
  }

  function updateStructureGroup(groupId: string, patch: Partial<ProjectStructureGroup>) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      ),
    }));
  }

  function updateStructureSection(
    groupId: string,
    sectionId: string,
    patch: Partial<ProjectStructureSection>
  ) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              sections: group.sections.map((section) =>
                section.id === sectionId ? { ...section, ...patch } : section
              ),
            }
      ),
    }));
  }

  function deleteStructureGroup(groupId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }));
  }

  function addStructureGroup() {
    mutateStructureDraft((current) => ({
      ...current,
      groups: [
        ...current.groups,
        {
          id: newStructureId("group"),
          label: `新分组 ${current.groups.length + 1}`,
          rationale: "补充这一组要讲清的主线。",
          narrativeRole: "承接",
          sections: [
            {
              id: newStructureId("section"),
              title: "新小节",
              purpose: "说明这个小节要承载的信息。",
              recommendedContent: [],
              suggestedAssets: [],
            },
          ],
        },
      ],
    }));
  }

  function addStructureSection(groupId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              sections: [
                ...group.sections,
                {
                  id: newStructureId("section"),
                  title: `小节 ${group.sections.length + 1}`,
                  purpose: "说明这个小节要讲什么。",
                  recommendedContent: [],
                  suggestedAssets: [],
                },
              ],
            }
      ),
    }));
  }

  function deleteStructureSection(groupId: string, sectionId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups
        .map((group) =>
          group.id !== groupId
            ? group
            : {
                ...group,
                sections: group.sections.filter((section) => section.id !== sectionId),
              }
        )
        .filter((group) => group.sections.length > 0),
    }));
  }

  async function saveStructureDraft(nextSuggestion?: ProjectStructureSuggestion) {
    const suggestion = nextSuggestion ?? structureDraft;
    if (!suggestion) return;

    setStructureSaveState("saving");
    setActionError("");
    setActionMessage(null);

    try {
      const data = await parseJsonResponse<{ suggestion: ProjectStructureSuggestion }>(
        await fetch(`/api/projects/${projectId}/structure`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestion }),
        })
      );
      setStructureDraft(data.suggestion);
      setStructureSaveState("saved");
      setActionMessage({ tone: "info", text: "结构已保存。" });
      return data.suggestion;
    } catch (error) {
      setStructureSaveState("error");
      setActionError(error instanceof Error ? error.message : "结构保存失败，请稍后重试");
      throw error;
    }
  }

  async function confirmStructureDraft() {
    if (!structureDraft) return;
    const confirmedSuggestion: ProjectStructureSuggestion = {
      ...structureDraft,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    };
    await saveStructureDraft(confirmedSuggestion);
    setActionMessage({ tone: "info", text: "当前结构已确认，可继续生成低保真画板。" });
  }

  async function applyStructureToBoards() {
    if (!structureDraft || structureDraft.groups.length === 0 || applyingStructure) return;

    if (structureDraft.status !== "confirmed") {
      setActionMessage({ tone: "error", text: "请先确认当前结构，再重新生成低保真画板。" });
      return;
    }

    if (
      hasExistingBoards &&
      !window.confirm(
        [
          `将按当前结构重新生成 ${totalPages} 张低保真画板。`,
          "",
          "会替换：画板列表、低保真节点、内容稿文案、素材匹配。",
          "会保留：已确认结构、项目事实、素材库。",
          "不会自动生成新配图；缺图页面会保留补图提示。",
          "",
          "已生成排版和手动修改可能被覆盖。确认继续吗？",
        ].join("\n")
      )
    ) {
      return;
    }

    setApplyingStructure(true);
    setActionError("");
    setActionMessage(null);

    try {
      const data = await parseJsonResponse<ApplyStructureResponse>(
        await fetch(`/api/projects/${projectId}/structure/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applyMode: "replace_boards",
            generateVisuals: false,
          }),
        })
      );
      setHasExistingBoards(true);
      const partialMessage =
        data.status === "partial_success" || (data.warnings?.length ?? 0) > 0
          ? "低保真画板已生成，AI 补图已跳过。"
          : null;
      setActionMessage({
        tone: data.rolledBack || data.status === "rolled_back" ? "error" : "info",
        text:
          partialMessage ??
          data.message ??
          (data.rolledBack || data.status === "rolled_back"
            ? "创建低保真画板未完成，已保留原内容。"
            : "已按当前结构重新生成低保真画板。"),
      });
      if (data.rolledBack || data.status === "rolled_back") {
        router.refresh();
      } else {
        router.replace(`/projects/${projectId}/editor`);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "重新生成低保真画板失败，请稍后重试");
    } finally {
      setApplyingStructure(false);
    }
  }

  async function handleSuggestStructure() {
    if (suggestingStructure) return;
    setSuggestingStructure(true);
    setActionError("");
    setActionMessage(null);

    try {
      const data = await parseJsonResponse<{ suggestion: ProjectStructureSuggestion }>(
        await fetch(`/api/projects/${projectId}/structure/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      setStructureDraft(data.suggestion);
      setStructureSaveState("saved");
      setActionMessage({ tone: "info", text: "结构建议已更新。" });
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "结构建议生成失败，请稍后重试");
    } finally {
      setSuggestingStructure(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/40">Project Structure Workbench</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">{projectName}</h1>
            <p className="mt-2 text-sm text-white/55">
              这里维护当前生效结构。保存结构不会自动改画板；只有点击“重新生成低保真画板”才会替换页面。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSuggestStructure()}
              disabled={suggestingStructure}
              className="h-10 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              {suggestingStructure ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  重新生成结构
                </>
              )}
            </Button>
            <Link
              href={`/projects/${projectId}/editor`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              返回编辑器
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">当前生效结构</p>
                <Badge
                  variant="outline"
                  className="rounded-full border-white/10 bg-white/[0.04] text-white/70"
                >
                  {structureDraft?.status === "confirmed" ? "已确认" : "草稿"}
                </Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm text-white/60">
                <p>{structureDraft ? `${structureDraft.groups.length} 个章节 · ${totalPages} 页` : "暂无结构"}</p>
                <p>
                  {hasExistingBoards
                    ? "当前已经有基于这份结构创建的低保真画板。"
                    : "当前还没有基于结构创建的低保真画板。"}
                </p>
                {structureDraft?.status === "confirmed" ? (
                  <p>将重新生成 {totalPages} 张低保真画板。</p>
                ) : null}
                {materialRecognition ? (
                  <p>AI 理解：{materialRecognition.summary}</p>
                ) : null}
              </div>
              {structureDraft?.summary ? (
                <p className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3.5 py-3 text-sm leading-6 text-white/70">
                  {structureDraft.summary}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => void saveStructureDraft()}
                  disabled={!structureDraft || structureSaveState === "saving"}
                  className="h-10 w-full rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                >
                  {structureSaveState === "saving" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中
                    </>
                  ) : (
                    "保存结构"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void confirmStructureDraft()}
                  disabled={!structureDraft || structureSaveState === "saving"}
                  className="h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  <Check className="mr-2 h-4 w-4" />
                  确认当前结构
                </Button>
                {hasExistingBoards && structureDiff.hasChanges ? (
                  <div className="rounded-xl border border-amber-300/24 bg-amber-400/8 px-3 py-2.5 text-xs leading-5 text-amber-50">
                    <div className="flex items-center gap-1.5 text-amber-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden />
                      <span className="text-sm font-medium">本次重建会改动当前结构</span>
                    </div>
                    <p className="mt-1 text-amber-50/82">{diffSummary}</p>
                    {structureDiff.added.length > 0 ? (
                      <p className="mt-1 truncate text-amber-50/64">
                        新增：{structureDiff.added.map((item) => item.title).join("、")}
                      </p>
                    ) : null}
                    {structureDiff.removed.length > 0 ? (
                      <p className="mt-1 truncate text-amber-50/64">
                        删除：{structureDiff.removed.map((item) => item.title).join("、")}
                      </p>
                    ) : null}
                    {structureDiff.renamed.length > 0 ? (
                      <p className="mt-1 truncate text-amber-50/64">
                        改名：{structureDiff.renamed
                          .map((item) => `${item.previousTitle}→${item.nextTitle}`)
                          .join("、")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void applyStructureToBoards()}
                  disabled={
                    !structureDraft ||
                    applyingStructure ||
                    structureDraft.status !== "confirmed" ||
                    structureDraft.groups.length === 0
                  }
                  className="h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  {applyingStructure ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      重建中
                    </>
                  ) : (
                    "重新生成低保真画板"
                  )}
                </Button>
              </div>

              {actionMessage ? (
                <p
                  className={`mt-4 text-sm ${
                    actionMessage.tone === "error" ? "text-red-300" : "text-emerald-300"
                  }`}
                >
                  {actionMessage.text}
                </p>
              ) : null}
              {actionError ? <p className="mt-4 text-sm text-red-300">{actionError}</p> : null}
            </div>
          </div>

          <div className="space-y-5">
            {structureDraft ? (
              <>
                <StructureOverview draft={structureDraft} />

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-white/45">结构总述</label>
                      <Textarea
                        value={structureDraft.summary}
                        onChange={(event) =>
                          mutateStructureDraft((current) => ({
                            ...current,
                            summary: event.target.value,
                          }))
                        }
                        className="mt-1.5 min-h-[110px] rounded-[18px] border-white/8 bg-black/20 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/45">叙事弧线</label>
                      <Input
                        value={structureDraft.narrativeArc}
                        onChange={(event) =>
                          mutateStructureDraft((current) => ({
                            ...current,
                            narrativeArc: event.target.value,
                          }))
                        }
                        className="mt-1.5 h-10 rounded-xl border-white/8 bg-black/20 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStructureGroup}
                    className="h-10 rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增章节
                  </Button>
                </div>

                <div className="space-y-3">
                  {structureDraft.groups.map((group, index) => (
                    <div
                      key={group.id}
                      className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-white/40">章节作用</label>
                            <Input
                              value={group.narrativeRole}
                              onChange={(event) =>
                                updateStructureGroup(group.id, {
                                  narrativeRole: event.target.value,
                                })
                              }
                              className="mt-1.5 h-10 rounded-xl border-white/8 bg-black/20 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-white/40">保留理由</label>
                            <Textarea
                              value={group.rationale}
                              onChange={(event) =>
                                updateStructureGroup(group.id, {
                                  rationale: event.target.value,
                                })
                              }
                              className="mt-1.5 min-h-[96px] rounded-[18px] border-white/8 bg-black/20 text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <StructureGroupCard
                            group={group}
                            index={index}
                            totalGroups={structureDraft.groups.length}
                            editable
                            onChange={(next) =>
                              mutateStructureDraft((current) => ({
                                ...current,
                                groups: current.groups.map((item) =>
                                  item.id === group.id ? next : item
                                ),
                              }))
                            }
                            onMove={(direction) => {
                              mutateStructureDraft((current) => {
                                const target = direction === "up" ? index - 1 : index + 1;
                                if (target < 0 || target >= current.groups.length) return current;
                                const next = [...current.groups];
                                [next[index], next[target]] = [next[target], next[index]];
                                return { ...current, groups: next };
                              });
                            }}
                            onDelete={() => deleteStructureGroup(group.id)}
                          />

                          <div className="space-y-2.5">
                            {group.sections.map((section) => (
                              <div
                                key={section.id}
                                className="rounded-[18px] border border-white/8 bg-black/20 px-3.5 py-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <label className="text-xs text-white/34">小节标题</label>
                                    <Input
                                      value={section.title}
                                      onChange={(event) =>
                                        updateStructureSection(group.id, section.id, {
                                          title: event.target.value,
                                        })
                                      }
                                      className="mt-1.5 h-10 rounded-xl border-white/8 bg-black/20 text-white"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteStructureSection(group.id, section.id)}
                                    className="mt-5 h-9 w-9 rounded-xl text-white/56 hover:bg-white/6 hover:text-white"
                                  >
                                    <span className="sr-only">删除小节</span>
                                    <Plus className="h-4 w-4 rotate-45" />
                                  </Button>
                                </div>
                                <div className="mt-3">
                                  <label className="text-xs text-white/34">这一小节要讲什么</label>
                                  <Textarea
                                    value={section.purpose}
                                    onChange={(event) =>
                                      updateStructureSection(group.id, section.id, {
                                        purpose: event.target.value,
                                      })
                                    }
                                    className="mt-1.5 min-h-[84px] rounded-[18px] border-white/8 bg-black/20 text-white"
                                  />
                                </div>
                                <div className="mt-3">
                                  <label className="text-xs text-white/34">建议内容点</label>
                                  <Textarea
                                    value={section.recommendedContent.join("\n")}
                                    onChange={(event) =>
                                      updateStructureSection(group.id, section.id, {
                                        recommendedContent: event.target.value
                                          .split("\n")
                                          .map((item) => item.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder="每行一条建议内容点"
                                    className="mt-1.5 min-h-[88px] rounded-[18px] border-white/8 bg-black/20 text-white"
                                  />
                                </div>
                                <div className="mt-3">
                                  <label className="text-xs text-white/34">建议素材</label>
                                  <Input
                                    value={section.suggestedAssets.join("、")}
                                    onChange={(event) =>
                                      updateStructureSection(group.id, section.id, {
                                        suggestedAssets: event.target.value
                                          .split(/[,，]/)
                                          .map((item) => item.trim())
                                          .filter(Boolean),
                                      })
                                    }
                                    placeholder="用逗号分隔建议素材标题或类型"
                                    className="mt-1.5 h-10 rounded-xl border-white/8 bg-black/20 text-white"
                                  />
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => addStructureSection(group.id)}
                              className="h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              在这一章新增小节
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <p className="text-lg font-medium text-white/80">还没有结构建议</p>
                <p className="mt-2 text-sm text-white/45">
                  先让 AI 生成一版结构建议，再在这里调整章节和页序。
                </p>
                <Button
                  type="button"
                  onClick={() => void handleSuggestStructure()}
                  disabled={suggestingStructure}
                  className="mt-6 h-10 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                >
                  {suggestingStructure ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      生成结构建议
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
