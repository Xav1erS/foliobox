import { z } from "zod";
import { llm } from "@/lib/llm";
import type { ImageInput } from "@/lib/llm/provider";
import type {
  ProjectPrototypeBoardDraft,
  ProjectSceneSeedAsset,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";
import { resolveProjectAssetMeta } from "@/lib/project-editor-scene";

const MAX_VISION_CALLS_PER_APPLY = 4;

const ReasoningResponseSchema = z.object({
  reason: z.string(),
});

function isVisionEnabled(): boolean {
  // 服务端读 env：用 NEXT_PUBLIC_ASSET_REASONING_VISION 仅为统一名字（非用户态）。
  const value = process.env.NEXT_PUBLIC_ASSET_REASONING_VISION;
  return value === "1" || value === "true";
}

function trimReason(text: string): string {
  const cleaned = text.replace(/[\s\n]+/g, " ").trim();
  if (cleaned.length <= 30) return cleaned;
  return `${cleaned.slice(0, 30)}…`;
}

type AssetWithImage = {
  asset: Pick<ProjectSceneSeedAsset, "id" | "title" | "metaJson">;
  image: ImageInput;
  sectionId: string;
  sectionTitle: string;
};

export async function generateAssetVisionReasonings(params: {
  userId: string;
  projectId: string;
  suggestion: ProjectStructureSuggestion;
  contentDrafts: ProjectPrototypeBoardDraft[];
  resolveImage: (assetId: string) => Promise<ImageInput | null>;
  assetById: Map<string, ProjectSceneSeedAsset>;
}): Promise<Record<string, string>> {
  if (!isVisionEnabled()) return {};

  const sectionTitleById = new Map<string, string>();
  for (const group of params.suggestion.groups) {
    for (const section of group.sections) {
      sectionTitleById.set(section.id, section.title);
    }
  }

  // 只取每个 draft 的第一个 hero/support 候选素材，单页一次调用，配额上限 MAX_VISION_CALLS_PER_APPLY。
  const candidates: AssetWithImage[] = [];
  for (const draft of params.contentDrafts) {
    if (candidates.length >= MAX_VISION_CALLS_PER_APPLY) break;
    const sectionTitle = sectionTitleById.get(draft.sectionId) ?? draft.title;
    for (const assetId of draft.preferredAssetIds) {
      const asset = params.assetById.get(assetId);
      if (!asset) continue;
      const meta = resolveProjectAssetMeta(asset.metaJson);
      if (meta.roleTag !== "main" && meta.roleTag !== "support") continue;
      const image = await params.resolveImage(assetId);
      if (!image) continue;
      candidates.push({
        asset,
        image,
        sectionId: draft.sectionId,
        sectionTitle,
      });
      break;
    }
  }

  const reasoningMap: Record<string, string> = {};
  for (const candidate of candidates) {
    const prompt = [
      "你是作品集编辑器里的素材决策助手。",
      "请用一句中文（不超过 30 个汉字）说明这张图为什么适合放在指定章节，",
      "只输出一句结论，不要列点、不要英文术语。",
      `章节标题：${candidate.sectionTitle}`,
      `素材标题：${candidate.asset.title ?? candidate.asset.id}`,
      "返回 JSON: { \"reason\": \"<一句话>\" }",
    ].join("\n");

    try {
      const result = await llm.generateStructuredWithImages(
        prompt,
        [candidate.image],
        ReasoningResponseSchema,
        {
          task: "project_asset_reasoning_vision",
          temperature: 0.2,
          track: {
            userId: params.userId,
            projectId: params.projectId,
            metadata: {
              sectionId: candidate.sectionId,
              assetId: candidate.asset.id,
            },
          },
        }
      );
      const reason = trimReason(result.reason ?? "");
      if (reason) {
        // 落 sidecar 时 boardId 还没建出来，这里先以 sectionId+assetId 为 key；
        // 客户端会用 board.structureSource.sectionId 还原。
        reasoningMap[`${candidate.sectionId}::${candidate.asset.id}`] = reason;
      }
    } catch (error) {
      console.warn("[project_asset_reasoning_vision] failed", {
        projectId: params.projectId,
        sectionId: candidate.sectionId,
        assetId: candidate.asset.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return reasoningMap;
}
