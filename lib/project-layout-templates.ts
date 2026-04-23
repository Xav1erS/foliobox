import type { StyleProfile } from "./style-reference-presets";
import type {
  GeneratedLayoutPageSeed,
  ProjectAssetMeta,
  ProjectBoard,
  ProjectBoardImageNode,
  ProjectBoardNode,
  ProjectBoardShapeNode,
  ProjectBoardTextNode,
  ProjectImageRoleTag,
  ProjectPageType,
  ProjectSceneSeedAsset,
  ProjectShapeType,
  ProjectTextRole,
} from "./project-editor-scene";

type GeneratedTemplateFamily =
  | "cover"
  | "background"
  | "insight"
  | "strategy"
  | "module"
  | "result"
  | "reflection";

type GeneratedTemplateId =
  | "cover_hero_panel"
  | "cover_story_stage"
  | "background_problem_proof"
  | "background_tension_wall"
  | "insight_canvas_cards"
  | "insight_timeline_wall"
  | "strategy_canvas_stack"
  | "strategy_steps_strip"
  | "module_compare_stage"
  | "module_focus_feature"
  | "result_metrics_proof"
  | "result_story_scoreboard"
  | "reflection_journal_split"
  | "reflection_cards_wall";

type CreateShape = (
  shape: ProjectShapeType,
  patch?: Partial<ProjectBoardShapeNode>
) => ProjectBoardNode;
type CreateText = (
  patch: Partial<ProjectBoardTextNode> & Pick<ProjectBoardTextNode, "text" | "role">
) => ProjectBoardNode;
type CreateImage = (
  assetId: string,
  patch?: Partial<ProjectBoardImageNode>
) => ProjectBoardNode;

type GeneratedTemplateContext = {
  board: ProjectBoard;
  page: GeneratedLayoutPageSeed;
  pageType: ProjectPageType;
  styleProfile: StyleProfile;
  titleText: string;
  bodyText: string;
  noteBlockText: string;
  noteInlineText: string;
  metricTexts: [string, string, string];
  hasPreservedCaption: boolean;
  hasPreservedTitle: boolean;
  hasPreservedBody: boolean;
  hasPreservedNote: boolean;
  preservedMetricCount: number;
  hasPreservedImage: boolean;
  heroAssetId: string | null;
  supportAssetId: string | null;
  heroMeta: ProjectAssetMeta | null;
  supportMeta: ProjectAssetMeta | null;
  accentSoft: string;
  borderSoft: string;
  surface: string;
  titleTone: string;
  bodyTone: string;
  signalText: string;
  boardWidth: number;
  boardHeight: number;
  createShape: CreateShape;
  createText: CreateText;
  createImage: CreateImage;
};

export function renderGeneratedProjectBoardNodes(params: {
  board: ProjectBoard;
  page: GeneratedLayoutPageSeed;
  pageType: ProjectPageType;
  styleProfile: StyleProfile;
  preservedNodes: ProjectBoardNode[];
  heroAssetId: string | null;
  supportAssetId: string | null;
  assetMap: Map<string, ProjectSceneSeedAsset>;
  boardWidth: number;
  boardHeight: number;
  createShape: CreateShape;
  createText: CreateText;
  createImage: CreateImage;
  resolveAssetMeta: (value: unknown) => ProjectAssetMeta;
}) {
  const ctx = buildGeneratedTemplateContext(params);
  const nodes: ProjectBoardNode[] = [];

  pushGeneratedBoardShell(nodes, ctx);

  switch (selectGeneratedTemplateId(ctx)) {
    case "cover_hero_panel":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 304,
          width: 480,
          height: 220,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 620,
          y: 304,
          width: 320,
          height: 220,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 560,
          width: 820,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 32,
          zIndex: 3,
        })
      );
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 160,
        y: 344,
        width: 400,
        height: 136,
        fontSize: 24,
        color: ctx.titleTone,
      });
      if (ctx.preservedMetricCount === 0) {
        nodes.push(
          ctx.createText({
            role: "metric",
            text: ctx.metricTexts[0],
            x: 658,
            y: 366,
            width: 244,
            height: 92,
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.2,
            color: ctx.titleTone,
            zIndex: 4,
          })
        );
      }
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 160,
        y: 600,
        width: 740,
        height: 228,
        fontSize: 28,
        lineHeight: 1.45,
      });
      pushGeneratedImageBlock(nodes, ctx, {
        x: 1008,
        y: 144,
        width: 724,
        height: 720,
        roleTagFallback: "main",
      });
      break;

    case "cover_story_stage":
      pushGeneratedHeader(nodes, ctx, {
        captionWidth: 920,
        titleWidth: 1320,
        titleHeight: 116,
        titleFontSize: 72,
      });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 760,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 930,
          y: 300,
          width: 870,
          height: 250,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 930,
          y: 590,
          width: 420,
          height: 230,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1380,
          y: 590,
          width: 420,
          height: 230,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 930,
          width: 1680,
          height: 70,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 22,
          zIndex: 3,
        })
      );
      pushGeneratedImageBlock(nodes, ctx, {
        x: 156,
        y: 336,
        width: 688,
        height: 528,
        roleTagFallback: "main",
      });
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 978,
        y: 340,
        width: 774,
        height: 146,
        fontSize: 27,
        color: ctx.titleTone,
      });
      pushGeneratedMetricCards(nodes, ctx, [
        {
          x: 930,
          y: 590,
          width: 420,
          height: 230,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          textX: 976,
          textY: 664,
          textWidth: 328,
          textHeight: 80,
          fallbackText: "角色",
          fontSize: 30,
        },
        {
          x: 1380,
          y: 590,
          width: 420,
          height: 230,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          textX: 1426,
          textY: 664,
          textWidth: 328,
          textHeight: 80,
          fallbackText: "目标",
          fontSize: 30,
        },
      ]);
      pushGeneratedNoteBlock(
        nodes,
        ctx,
        {
          x: 164,
          y: 948,
          width: 1592,
          height: 34,
          fontSize: 22,
          lineHeight: 1.3,
        },
        ctx.noteInlineText
      );
      break;

    case "background_problem_proof":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 470,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 630,
          y: 300,
          width: 470,
          height: 600,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1140,
          y: 300,
          width: 660,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 158,
        y: 346,
        width: 404,
        height: 520,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 668,
        y: 346,
        width: 394,
        height: 520,
        fontSize: 28,
        lineHeight: 1.48,
        color: ctx.titleTone,
      });
      pushGeneratedImageBlock(nodes, ctx, {
        x: 1182,
        y: 342,
        width: 576,
        height: 516,
        roleTagFallback: "support",
      });
      break;

    case "background_tension_wall":
      pushGeneratedHeader(nodes, ctx, { titleWidth: 860 });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 620,
          height: 260,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 590,
          width: 620,
          height: 310,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 780,
          y: 300,
          width: 1020,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 32,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 164,
        y: 342,
        width: 532,
        height: 172,
        fontSize: 26,
        color: ctx.titleTone,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 164,
        y: 634,
        width: 532,
        height: 214,
      });
      pushGeneratedImageBlock(nodes, ctx, {
        x: 824,
        y: 344,
        width: 932,
        height: 512,
        roleTagFallback: "support",
      });
      break;

    case "insight_canvas_cards":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 740,
          height: 600,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 34,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 900,
          y: 300,
          width: 900,
          height: 240,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 900,
          y: 580,
          width: 270,
          height: 320,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1215,
          y: 580,
          width: 270,
          height: 320,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1530,
          y: 580,
          width: 270,
          height: 320,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        })
      );
      pushGeneratedImageBlock(nodes, ctx, {
        x: 164,
        y: 344,
        width: 652,
        height: 512,
        roleTagFallback: "support",
      });
      pushGeneratedBodyBlock(
        nodes,
        ctx,
        ctx.heroAssetId
          ? {
              x: 944,
              y: 346,
              width: 812,
              height: 146,
              fontSize: 25,
              color: ctx.titleTone,
            }
          : {
              x: 176,
              y: 360,
              width: 628,
              height: 484,
              fontSize: 26,
              color: ctx.titleTone,
            }
      );
      if (!ctx.hasPreservedNote) {
        [900, 1215, 1530].forEach((x, index) => {
          nodes.push(
            ctx.createText({
              role: "note",
              text: ctx.page.keyPoints[index] ?? (index === 0 ? ctx.noteBlockText : "补充要点"),
              x: x + 28,
              y: 618,
              width: 214,
              height: 244,
              fontSize: 22,
              lineHeight: 1.42,
              color: ctx.bodyTone,
              zIndex: 4,
            })
          );
        });
      }
      break;

    case "insight_timeline_wall":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 1680,
          height: 220,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 560,
          width: 760,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 910,
          y: 560,
          width: 430,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1370,
          y: 560,
          width: 430,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 164,
        y: 350,
        width: 1592,
        height: 120,
        fontSize: 26,
        color: ctx.titleTone,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 164,
        y: 604,
        width: 672,
        height: 214,
      });
      if (!ctx.hasPreservedNote) {
        nodes.push(
          ctx.createText({
            role: "note",
            text: ctx.page.keyPoints.slice(1, 3).join("\n") || "关键判断与下一步",
            x: 954,
            y: 604,
            width: 342,
            height: 214,
            fontSize: 22,
            lineHeight: 1.42,
            color: ctx.bodyTone,
            zIndex: 4,
          })
        );
      }
      pushGeneratedImageBlock(nodes, ctx, {
        x: 1404,
        y: 594,
        width: 362,
        height: 272,
        roleTagFallback: "support",
      });
      break;

    case "strategy_canvas_stack":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 720,
          height: 600,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 34,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 890,
          y: 300,
          width: 910,
          height: 240,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 890,
          y: 580,
          width: 910,
          height: 320,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 168,
        y: 356,
        width: 624,
        height: 500,
        fontSize: 27,
        lineHeight: 1.48,
        color: ctx.titleTone,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 938,
        y: 640,
        width: 814,
        height: 214,
      });
      pushGeneratedImageBlock(nodes, ctx, {
        x: 938,
        y: 338,
        width: 814,
        height: 164,
        roleTagFallback: "support",
      });
      break;

    case "strategy_steps_strip":
      pushGeneratedHeader(nodes, ctx, { titleWidth: 840 });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 520,
          height: 220,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 680,
          y: 300,
          width: 520,
          height: 220,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1240,
          y: 300,
          width: 560,
          height: 220,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 560,
          width: 1020,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1180,
          y: 560,
          width: 620,
          height: 340,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 160,
        y: 340,
        width: 440,
        height: 144,
        fontSize: 25,
        color: ctx.titleTone,
      });
      if (!ctx.hasPreservedNote) {
        nodes.push(
          ctx.createText({
            role: "note",
            text: ctx.page.keyPoints[0] ?? "阶段一",
            x: 720,
            y: 348,
            width: 440,
            height: 132,
            fontSize: 24,
            lineHeight: 1.42,
            color: ctx.bodyTone,
            zIndex: 4,
          }),
          ctx.createText({
            role: "note",
            text: ctx.page.keyPoints.slice(1, 3).join("\n") || "阶段二 / 阶段三",
            x: 1280,
            y: 348,
            width: 480,
            height: 132,
            fontSize: 24,
            lineHeight: 1.42,
            color: ctx.bodyTone,
            zIndex: 4,
          }),
          ctx.createText({
            role: "note",
            text: ctx.noteBlockText,
            x: 1224,
            y: 606,
            width: 532,
            height: 214,
            fontSize: 24,
            lineHeight: 1.42,
            color: ctx.bodyTone,
            zIndex: 4,
          })
        );
      }
      pushGeneratedImageBlock(nodes, ctx, {
        x: 164,
        y: 604,
        width: 932,
        height: 252,
        roleTagFallback: "support",
      });
      break;

    case "module_compare_stage":
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 770,
          height: 520,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 910,
          y: 300,
          width: 890,
          height: 520,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 850,
          width: 1680,
          height: 120,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        })
      );
      if (!ctx.hasPreservedImage && ctx.heroAssetId) {
        pushGeneratedImageBlock(nodes, ctx, {
          assetId: ctx.heroAssetId,
          x: 156,
          y: 336,
          width: ctx.supportAssetId ? 318 : 698,
          height: 448,
          roleTagFallback: "main",
        });
        if (ctx.supportAssetId) {
          pushGeneratedImageBlock(nodes, ctx, {
            assetId: ctx.supportAssetId,
            x: 480,
            y: 336,
            width: 318,
            height: 448,
            roleTagFallback: "support",
          });
        }
      }
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 954,
        y: 352,
        width: 776,
        height: 420,
        fontSize: 26,
        color: ctx.titleTone,
        zIndex: 5,
      });
      pushGeneratedNoteBlock(
        nodes,
        ctx,
        {
          x: 164,
          y: 892,
          width: 1592,
          height: 46,
          fontSize: 22,
          lineHeight: 1.3,
        },
        ctx.noteInlineText
      );
      break;

    case "module_focus_feature":
      pushGeneratedHeader(nodes, ctx, { titleWidth: 900 });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 900,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1060,
          y: 300,
          width: 740,
          height: 260,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1060,
          y: 600,
          width: 740,
          height: 300,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 930,
          width: 1680,
          height: 70,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 22,
          zIndex: 3,
        })
      );
      pushGeneratedImageBlock(nodes, ctx, {
        x: 164,
        y: 344,
        width: 812,
        height: 512,
        roleTagFallback: "main",
      });
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 1104,
        y: 340,
        width: 652,
        height: 160,
        fontSize: 26,
        color: ctx.titleTone,
      });
      if (!ctx.hasPreservedImage && ctx.supportAssetId) {
        pushGeneratedImageBlock(nodes, ctx, {
          assetId: ctx.supportAssetId,
          x: 1104,
          y: 644,
          width: 652,
          height: 212,
          roleTagFallback: "support",
        });
        pushGeneratedNoteBlock(
          nodes,
          ctx,
          {
            x: 164,
            y: 948,
            width: 1592,
            height: 34,
            fontSize: 22,
            lineHeight: 1.3,
          },
          ctx.noteInlineText
        );
      } else {
        pushGeneratedNoteBlock(nodes, ctx, {
          x: 1104,
          y: 646,
          width: 652,
          height: 208,
        });
      }
      break;

    case "result_metrics_proof":
      pushGeneratedHeader(nodes, ctx);
      pushGeneratedMetricCards(nodes, ctx, [
        {
          x: 120,
          y: 300,
          width: 250,
          height: 180,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 28,
          textX: 152,
          textY: 356,
          textWidth: 186,
          textHeight: 60,
          fallbackText: "核心指标",
          fontSize: 34,
        },
        {
          x: 406,
          y: 300,
          width: 250,
          height: 180,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          textX: 438,
          textY: 356,
          textWidth: 186,
          textHeight: 60,
          fallbackText: "业务反馈",
          fontSize: 34,
        },
        {
          x: 692,
          y: 300,
          width: 250,
          height: 180,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          textX: 724,
          textY: 356,
          textWidth: 186,
          textHeight: 60,
          fallbackText: "效率提升",
          fontSize: 34,
        },
      ]);
      nodes.push(
        ctx.createShape("rect", {
          x: 1000,
          y: 300,
          width: 800,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 30,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 120,
        y: 560,
        width: 822,
        height: 300,
        fontSize: 26,
        lineHeight: 1.45,
      });
      pushGeneratedImageBlock(nodes, ctx, {
        x: 1042,
        y: 342,
        width: 716,
        height: 516,
        roleTagFallback: "main",
      });
      break;

    case "result_story_scoreboard":
      pushGeneratedHeader(nodes, ctx, { titleWidth: 820 });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 860,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1030,
          y: 300,
          width: 770,
          height: 180,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1030,
          y: 520,
          width: 370,
          height: 160,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1430,
          y: 520,
          width: 370,
          height: 160,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1030,
          y: 710,
          width: 770,
          height: 190,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 26,
          zIndex: 3,
        })
      );
      pushGeneratedImageBlock(nodes, ctx, {
        x: 164,
        y: 344,
        width: 772,
        height: 512,
        roleTagFallback: "main",
      });
      pushGeneratedMetricCards(nodes, ctx, [
        {
          x: 1030,
          y: 300,
          width: 770,
          height: 180,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 28,
          textX: 1074,
          textY: 352,
          textWidth: 682,
          textHeight: 72,
          fallbackText: "核心指标",
          fontSize: 40,
        },
        {
          x: 1030,
          y: 520,
          width: 370,
          height: 160,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          textX: 1072,
          textY: 572,
          textWidth: 286,
          textHeight: 58,
          fallbackText: "业务反馈",
          fontSize: 30,
        },
        {
          x: 1430,
          y: 520,
          width: 370,
          height: 160,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 24,
          textX: 1472,
          textY: 572,
          textWidth: 286,
          textHeight: 58,
          fallbackText: "效率提升",
          fontSize: 30,
        },
      ]);
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 1074,
        y: 752,
        width: 682,
        height: 110,
        fontSize: 24,
      });
      break;

    case "reflection_cards_wall":
      pushGeneratedHeader(nodes, ctx, { titleWidth: 1040 });
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 1680,
          height: 220,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 32,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 120,
          y: 570,
          width: 520,
          height: 330,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 690,
          y: 570,
          width: 520,
          height: 330,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1260,
          y: 570,
          width: 540,
          height: 330,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 28,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 164,
        y: 348,
        width: 1592,
        height: 130,
        fontSize: 26,
        color: ctx.titleTone,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 164,
        y: 614,
        width: 432,
        height: 220,
      });
      if (!ctx.hasPreservedNote) {
        nodes.push(
          ctx.createText({
            role: "note",
            text: ctx.page.keyPoints.slice(1, 3).join("\n") || "复盘要点与下一步",
            x: 734,
            y: 614,
            width: 432,
            height: 220,
            fontSize: 24,
            lineHeight: 1.42,
            color: ctx.bodyTone,
            zIndex: 4,
          })
        );
      }
      pushGeneratedImageBlock(nodes, ctx, {
        x: 1294,
        y: 604,
        width: 472,
        height: 262,
        roleTagFallback: "support",
      });
      break;

    case "reflection_journal_split":
    default:
      pushGeneratedHeader(nodes, ctx);
      nodes.push(
        ctx.createShape("rect", {
          x: 120,
          y: 300,
          width: 960,
          height: 600,
          fill: ctx.accentSoft,
          stroke: null,
          strokeWidth: 0,
          rx: 34,
          zIndex: 3,
        }),
        ctx.createShape("rect", {
          x: 1120,
          y: 300,
          width: 680,
          height: 600,
          fill: "#ffffff",
          stroke: ctx.borderSoft,
          strokeWidth: 1,
          rx: 34,
          zIndex: 3,
        })
      );
      pushGeneratedBodyBlock(nodes, ctx, {
        x: 172,
        y: 360,
        width: 856,
        height: 500,
        fontSize: 28,
        lineHeight: 1.5,
        color: ctx.titleTone,
      });
      pushGeneratedNoteBlock(nodes, ctx, {
        x: 1164,
        y: 360,
        width: 592,
        height: 500,
      });
      break;
  }

  return nodes;
}

function buildGeneratedBody(page: GeneratedLayoutPageSeed) {
  const lines = [page.contentGuidance.trim(), ...page.keyPoints.slice(0, 3).map((item) => `• ${item}`)];
  return lines.filter(Boolean).join("\n");
}

function buildGeneratedTitleText(page: GeneratedLayoutPageSeed, board: ProjectBoard) {
  return page.titleSuggestion.trim() || board.name.trim() || board.structureSource?.sectionTitle || "项目页面";
}

function countPreservedTextRole(
  preservedNodes: ProjectBoardNode[],
  role: ProjectTextRole
) {
  return preservedNodes.filter((node) => node.type === "text" && node.role === role).length;
}

function getGeneratedTemplateFamily(pageType: ProjectPageType): GeneratedTemplateFamily {
  if (
    pageType === "项目定位 / 背景页" ||
    pageType === "项目定位 / 背景" ||
    pageType === "作品定位 / 题材说明"
  ) {
    return "cover";
  }
  if (pageType === "业务背景 / 问题背景" || pageType === "问题与目标") {
    return "background";
  }
  if (pageType === "用户 / 流程 / 关键洞察" || pageType === "全局结构优化") {
    return "insight";
  }
  if (pageType === "设计目标 / 设计策略" || pageType === "流程 / 任务链优化页") {
    return "strategy";
  }
  if (
    pageType === "关键模块优化" ||
    pageType === "核心方案 / 关键界面" ||
    pageType === "关键视觉或关键界面" ||
    pageType === "before / after 或流程优化"
  ) {
    return "module";
  }
  if (pageType === "结果 / 价值证明" || pageType === "结果 / 简短总结") {
    return "result";
  }
  return "reflection";
}

function hasTemplateKeyword(signalText: string, ...keywords: string[]) {
  return keywords.some((keyword) => signalText.includes(keyword.toLowerCase()));
}

function buildGeneratedTemplateContext(params: {
  board: ProjectBoard;
  page: GeneratedLayoutPageSeed;
  pageType: ProjectPageType;
  styleProfile: StyleProfile;
  preservedNodes: ProjectBoardNode[];
  heroAssetId: string | null;
  supportAssetId: string | null;
  assetMap: Map<string, ProjectSceneSeedAsset>;
  boardWidth: number;
  boardHeight: number;
  createShape: CreateShape;
  createText: CreateText;
  createImage: CreateImage;
  resolveAssetMeta: (value: unknown) => ProjectAssetMeta;
}): GeneratedTemplateContext {
  const {
    board,
    page,
    pageType,
    styleProfile,
    preservedNodes,
    heroAssetId,
    supportAssetId,
    assetMap,
    boardWidth,
    boardHeight,
    createShape,
    createText,
    createImage,
    resolveAssetMeta,
  } = params;
  const titleText = buildGeneratedTitleText(page, board);
  const bodyText = buildGeneratedBody(page);
  const noteBlockText =
    page.keyPoints.slice(0, 3).join("\n") ||
    page.assetHint?.trim() ||
    "补充说明待完善。";
  const noteInlineText =
    page.keyPoints.slice(0, 3).join("  ·  ") ||
    page.assetHint?.trim() ||
    "补充说明待完善。";

  return {
    board,
    page,
    pageType,
    styleProfile,
    titleText,
    bodyText,
    noteBlockText,
    noteInlineText,
    metricTexts: [
      page.keyPoints[0] ?? "核心指标",
      page.keyPoints[1] ?? "业务反馈",
      page.keyPoints[2] ?? "效率提升",
    ],
    hasPreservedCaption: countPreservedTextRole(preservedNodes, "caption") > 0,
    hasPreservedTitle: countPreservedTextRole(preservedNodes, "title") > 0,
    hasPreservedBody: countPreservedTextRole(preservedNodes, "body") > 0,
    hasPreservedNote: countPreservedTextRole(preservedNodes, "note") > 0,
    preservedMetricCount: countPreservedTextRole(preservedNodes, "metric"),
    hasPreservedImage: preservedNodes.some((node) => node.type === "image"),
    heroAssetId,
    supportAssetId,
    heroMeta: heroAssetId ? resolveAssetMeta(assetMap.get(heroAssetId)?.metaJson) : null,
    supportMeta: supportAssetId
      ? resolveAssetMeta(assetMap.get(supportAssetId)?.metaJson)
      : null,
    accentSoft: `${styleProfile.accentColor}14`,
    borderSoft: styleProfile.border,
    surface: styleProfile.surface,
    titleTone: styleProfile.titleTone,
    bodyTone: styleProfile.bodyTone,
    signalText: [
      page.titleSuggestion,
      page.contentGuidance,
      page.assetHint,
      page.wordCountGuideline,
      board.intent,
      ...page.keyPoints,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
    boardWidth,
    boardHeight,
    createShape,
    createText,
    createImage,
  };
}

function pushGeneratedBoardShell(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext
) {
  nodes.push(
    ctx.createShape("rect", {
      x: 0,
      y: 0,
      width: ctx.boardWidth,
      height: ctx.boardHeight,
      fill: ctx.styleProfile.background,
      stroke: null,
      strokeWidth: 0,
      rx: 0,
      zIndex: 1,
    }),
    ctx.createShape("rect", {
      x: 56,
      y: 56,
      width: 1808,
      height: 968,
      fill: ctx.surface,
      stroke: ctx.borderSoft,
      strokeWidth: 1,
      rx: 36,
      zIndex: 2,
    })
  );
}

function pushGeneratedHeader(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext,
  options: {
    captionX?: number;
    captionY?: number;
    captionWidth?: number;
    titleX?: number;
    titleY?: number;
    titleWidth?: number;
    titleHeight?: number;
    titleFontSize?: number;
  } = {}
) {
  if (!ctx.hasPreservedCaption) {
    nodes.push(
      ctx.createText({
        role: "caption",
        text: ctx.pageType,
        x: options.captionX ?? 120,
        y: options.captionY ?? 98,
        width: options.captionWidth ?? 700,
        height: 30,
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.2,
        color: ctx.bodyTone,
        zIndex: 3,
      })
    );
  }

  if (!ctx.hasPreservedTitle) {
    nodes.push(
      ctx.createText({
        role: "title",
        text: ctx.titleText,
        x: options.titleX ?? 120,
        y: options.titleY ?? 144,
        width: options.titleWidth ?? 820,
        height: options.titleHeight ?? 126,
        fontSize: options.titleFontSize ?? 74,
        fontWeight: 700,
        lineHeight: 1.04,
        color: ctx.titleTone,
        zIndex: 4,
      })
    );
  }
}

function pushGeneratedBodyBlock(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext,
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    color?: string;
    zIndex?: number;
    align?: "left" | "center" | "right";
  },
  text = ctx.bodyText
) {
  if (ctx.hasPreservedBody) return;
  nodes.push(
    ctx.createText({
      role: "body",
      text,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      fontSize: layout.fontSize ?? 26,
      fontWeight: layout.fontWeight ?? 400,
      lineHeight: layout.lineHeight ?? 1.46,
      align: layout.align ?? "left",
      color: layout.color ?? ctx.bodyTone,
      zIndex: layout.zIndex ?? 4,
    })
  );
}

function pushGeneratedNoteBlock(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext,
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    color?: string;
    zIndex?: number;
    align?: "left" | "center" | "right";
  },
  text = ctx.noteBlockText
) {
  if (ctx.hasPreservedNote) return;
  nodes.push(
    ctx.createText({
      role: "note",
      text,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
      fontSize: layout.fontSize ?? 24,
      fontWeight: layout.fontWeight ?? 400,
      lineHeight: layout.lineHeight ?? 1.45,
      align: layout.align ?? "left",
      color: layout.color ?? ctx.bodyTone,
      zIndex: layout.zIndex ?? 4,
    })
  );
}

function pushGeneratedMetricCards(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext,
  cards: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string | null;
    strokeWidth: number;
    rx: number;
    textX: number;
    textY: number;
    textWidth: number;
    textHeight: number;
    fallbackText: string;
    fontSize?: number;
    textColor?: string;
    textZIndex?: number;
    align?: "left" | "center" | "right";
  }>
) {
  cards.forEach((card, index) => {
    nodes.push(
      ctx.createShape("rect", {
        x: card.x,
        y: card.y,
        width: card.width,
        height: card.height,
        fill: card.fill,
        stroke: card.stroke,
        strokeWidth: card.strokeWidth,
        rx: card.rx,
        zIndex: 3,
      })
    );

    if (index < ctx.preservedMetricCount) return;

    nodes.push(
      ctx.createText({
        role: "metric",
        text: ctx.metricTexts[index] ?? card.fallbackText,
        x: card.textX,
        y: card.textY,
        width: card.textWidth,
        height: card.textHeight,
        fontSize: card.fontSize ?? 32,
        fontWeight: 700,
        lineHeight: 1.2,
        align: card.align ?? "left",
        color: card.textColor ?? ctx.titleTone,
        zIndex: card.textZIndex ?? 4,
      })
    );
  });
}

function pushGeneratedImageBlock(
  nodes: ProjectBoardNode[],
  ctx: GeneratedTemplateContext,
  options: {
    assetId?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    roleTagFallback: ProjectImageRoleTag;
    zIndex?: number;
  }
) {
  const assetId = options.assetId ?? ctx.heroAssetId;
  if (ctx.hasPreservedImage || !assetId) return;

  const meta = assetId === ctx.supportAssetId ? ctx.supportMeta : ctx.heroMeta;
  nodes.push(
    ctx.createImage(assetId, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      note: meta?.note ?? null,
      roleTag: meta?.roleTag ?? options.roleTagFallback,
      zIndex: options.zIndex ?? 4,
    })
  );
}

function selectGeneratedTemplateId(ctx: GeneratedTemplateContext): GeneratedTemplateId {
  const family = getGeneratedTemplateFamily(ctx.pageType);

  switch (family) {
    case "cover":
      if (ctx.styleProfile.density === "airy" && ctx.heroAssetId) {
        return "cover_story_stage";
      }
      return "cover_hero_panel";
    case "background":
      if (
        ctx.styleProfile.density === "dense" ||
        hasTemplateKeyword(ctx.signalText, "问题", "痛点", "约束", "目标")
      ) {
        return "background_tension_wall";
      }
      return ctx.heroAssetId ? "background_problem_proof" : "background_tension_wall";
    case "insight":
      if (hasTemplateKeyword(ctx.signalText, "流程", "旅程", "链路", "路径", "任务链")) {
        return "insight_timeline_wall";
      }
      return ctx.heroAssetId ? "insight_canvas_cards" : "insight_timeline_wall";
    case "strategy":
      if (
        ctx.styleProfile.density === "dense" ||
        ctx.page.keyPoints.length >= 3 ||
        hasTemplateKeyword(ctx.signalText, "步骤", "阶段", "策略", "任务链", "流程")
      ) {
        return "strategy_steps_strip";
      }
      return ctx.heroAssetId ? "strategy_canvas_stack" : "strategy_steps_strip";
    case "module":
      if (
        ctx.supportAssetId ||
        hasTemplateKeyword(ctx.signalText, "before", "after", "对比", "双屏", "前后")
      ) {
        return "module_compare_stage";
      }
      return "module_focus_feature";
    case "result":
      if (ctx.styleProfile.density === "airy" && ctx.heroAssetId) {
        return "result_story_scoreboard";
      }
      return "result_metrics_proof";
    case "reflection":
      if (
        (ctx.styleProfile.density === "airy" && ctx.heroAssetId) ||
        hasTemplateKeyword(ctx.signalText, "反思", "复盘", "总结", "经验", "下一步")
      ) {
        return "reflection_cards_wall";
      }
      return "reflection_journal_split";
  }
}
