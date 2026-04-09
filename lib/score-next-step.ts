import type { PortfolioScoreLevel } from "@/lib/portfolio-score-level";
import type { ScoreCoverage } from "@/lib/score-contract";

type ProfileShape = {
  currentTitle?: string | null;
  yearsOfExperience?: string | null;
  targetRole?: string | null;
  specialties?: string[];
  strengths?: string[];
} | null;

export type ScoreNextStep = {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function isProfileReadyForGeneration(profile: ProfileShape) {
  if (!profile) return false;

  return Boolean(
    profile.currentTitle?.trim() &&
      profile.yearsOfExperience?.trim() &&
      profile.targetRole?.trim() &&
      (profile.specialties?.length ?? 0) > 0 &&
      (profile.strengths?.length ?? 0) > 0
  );
}

export function getScoreNextStep(params: {
  scoreId: string;
  level: PortfolioScoreLevel;
  coverage: ScoreCoverage;
  isLoggedIn: boolean;
  profileReady: boolean;
}): ScoreNextStep {
  const workspaceHref = `/dashboard?from=score&sid=${params.scoreId}`;
  const projectHref = `/projects?create=1&from=score&sid=${params.scoreId}`;
  const profileHref = `/profile?from=score&sid=${params.scoreId}`;
  const loginWorkspaceHref = `/login?next=${encodeURIComponent(workspaceHref)}`;

  if (!params.isLoggedIn) {
    return {
      title: "先登录，再带着这次评分继续下一步",
      description:
        "登录后会保留当前评分结果，并把你带回工作台继续整理，不需要重新上传或重新评分。",
      primaryHref: loginWorkspaceHref,
      primaryLabel: "登录后进入工作台",
    };
  }

  if (!params.profileReady) {
    return {
      title: "先补设计师档案，再开始整理会更顺",
      description:
        "先补充职位、经验、擅长方向和目标岗位，后续 AI 生成的大纲与表达重点会更贴近你的求职方向。",
      primaryHref: profileHref,
      primaryLabel: "先补设计师档案",
      secondaryHref: projectHref,
      secondaryLabel: "直接新建项目",
    };
  }

  if (params.level === "NOT_READY") {
    return {
      title: "先新建一个真实项目，把基础表达补起来",
      description:
        "这次评分说明当前还不适合直接投递。下一步更适合先整理一个真实项目，把背景、角色、过程和结果补齐。",
      primaryHref: projectHref,
      primaryLabel: "新建项目开始整理",
      secondaryHref: workspaceHref,
      secondaryLabel: "先回工作台",
    };
  }

  if (params.level === "DRAFT" || params.coverage.detectedProjects <= 0) {
    return {
      title: "先把这次问题带进项目整理流程",
      description:
        "当前更适合作为草稿继续整理。建议先导入真实项目，把关键信息补齐，再生成第一版作品集。",
      primaryHref: projectHref,
      primaryLabel: "新建项目开始整理",
      secondaryHref: workspaceHref,
      secondaryLabel: "先回工作台",
    };
  }

  if (params.level === "NEEDS_IMPROVEMENT") {
    return {
      title: "带着这次评分回到工作台继续优化",
      description:
        "这份作品集已经具备投递价值，但还有几处关键问题值得先修。回到工作台后可以继续整理并生成下一版。",
      primaryHref: workspaceHref,
      primaryLabel: "带着结果进入工作台",
      secondaryHref: projectHref,
      secondaryLabel: "新建项目开始整理",
    };
  }

  return {
    title: "这份作品集已经具备投递价值，可以继续微调",
    description:
      "如果你还想让表达更稳，可以回到工作台继续整理、生成新一版，或者直接保留这次结果作为当前基线。",
    primaryHref: workspaceHref,
    primaryLabel: "进入工作台继续微调",
    secondaryHref: projectHref,
    secondaryLabel: "新建项目开始整理",
  };
}
