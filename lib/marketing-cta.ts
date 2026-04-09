export type MarketingAction = {
  href: string;
  label: string;
};

export function getNavbarPrimaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/dashboard", label: "进入工作台" }
    : { href: "/score", label: "先给我的作品集打分" };
}

export function getNavbarSecondaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/projects", label: "继续整理作品集" }
    : { href: "/login", label: "登录" };
}

export function getHeroPrimaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/dashboard", label: "进入工作台" }
    : { href: "/score", label: "先给我的作品集打分" };
}

export function getHeroSecondaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/projects", label: "继续整理作品集" }
    : { href: "/login?next=/projects?create=1", label: "直接开始整理作品集" };
}

export function getPricingPrimaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/dashboard", label: "进入工作台" }
    : { href: "/score", label: "先给我的作品集打分" };
}

export function getPricingSecondaryAction(isLoggedIn: boolean): MarketingAction {
  return isLoggedIn
    ? { href: "/projects", label: "继续整理作品集" }
    : { href: "/login?next=/projects?create=1", label: "直接开始整理作品集" };
}
