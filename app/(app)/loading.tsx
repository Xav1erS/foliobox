import { BrandMark } from "@/components/brand/BrandLogo";

// 全站 (app) 区加载占位：品牌中性动画，避免布局骨架误导用户
// 现阶段用 logo 呼吸，后续统一品牌动画时原地替换即可。
export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <span
        className="animate-pulse"
        aria-label="加载中"
        role="status"
      >
        <BrandMark priority />
      </span>
    </div>
  );
}
