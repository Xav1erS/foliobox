export const PORTFOLIO_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  SELECTION: "选择项目",
  OUTLINE: "确认结构",
  EDITOR: "修改中",
  PUBLISHED: "已发布",
};

export function getPortfolioContinuePath(portfolio: {
  id: string;
  status?: string;
}) {
  const status = portfolio.status;
  if (status === "PUBLISHED" || status === "EDITOR") {
    return { href: `/portfolios/${portfolio.id}/editor`, label: "继续修改作品集" };
  }
  if (status && status !== "DRAFT") {
    return { href: `/portfolios/${portfolio.id}/editor`, label: "回到作品集编辑器" };
  }

  return { href: `/portfolios/${portfolio.id}/editor`, label: "开始编辑作品集" };
}
