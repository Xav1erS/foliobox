import { cn } from "@/lib/utils";

// Semantic vision diagram: portfolio → resume alignment → job targeting → interview → one workspace
export function IsometricWireframe({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("text-white", className)}>
      <svg
        viewBox="0 0 480 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* Box 1: 作品集整理 */}
        <rect x="8" y="16" width="96" height="52" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="8" y1="30" x2="104" y2="30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        <text x="56" y="27" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">01</text>
        <text x="56" y="47" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="system-ui,sans-serif">作品集整理</text>
        <line x1="20" y1="58" x2="92" y2="58" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.18" />

        {/* Arrow 1→2 */}
        <line x1="104" y1="42" x2="126" y2="42" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
        <polyline points="122,38 126,42 122,46" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" fill="none" />

        {/* Box 2: 简历对齐 */}
        <rect x="130" y="16" width="96" height="52" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="130" y1="30" x2="226" y2="30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        <text x="178" y="27" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">02</text>
        <text x="178" y="47" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="system-ui,sans-serif">简历对齐</text>
        <line x1="142" y1="58" x2="214" y2="58" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.18" />

        {/* Arrow 2→3 */}
        <line x1="226" y1="42" x2="248" y2="42" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
        <polyline points="244,38 248,42 244,46" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" fill="none" />

        {/* Box 3: 岗位定向 */}
        <rect x="252" y="16" width="96" height="52" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="252" y1="30" x2="348" y2="30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        <text x="300" y="27" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">03</text>
        <text x="300" y="47" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="system-ui,sans-serif">岗位定向</text>
        <line x1="264" y1="58" x2="336" y2="58" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.18" />

        {/* Arrow 3→4 */}
        <line x1="348" y1="42" x2="370" y2="42" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
        <polyline points="366,38 370,42 366,46" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" fill="none" />

        {/* Box 4: 面试讲述 */}
        <rect x="374" y="16" width="96" height="52" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
        <line x1="374" y1="30" x2="470" y2="30" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        <text x="422" y="27" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">04</text>
        <text x="422" y="47" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.6" fontFamily="system-ui,sans-serif">面试讲述</text>
        <line x1="386" y1="58" x2="458" y2="58" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.18" />

        {/* Convergence lines: each box bottom → horizontal rail → down to center */}
        <line x1="56" y1="68" x2="56" y2="148" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="4 3" />
        <line x1="178" y1="68" x2="178" y2="148" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="4 3" />
        <line x1="300" y1="68" x2="300" y2="148" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="4 3" />
        <line x1="422" y1="68" x2="422" y2="148" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="4 3" />
        {/* horizontal rail */}
        <line x1="56" y1="148" x2="422" y2="148" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.2" strokeDasharray="4 3" />
        {/* down to center box */}
        <line x1="239" y1="148" x2="239" y2="178" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
        <polyline points="235,174 239,179 243,174" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" fill="none" />

        {/* Center bottom box: 同一个工作台 */}
        <rect x="148" y="182" width="182" height="62" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.85" />
        <line x1="148" y1="196" x2="330" y2="196" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.22" />
        <text x="239" y="193" textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.35" fontFamily="system-ui,sans-serif" letterSpacing="0.08em">WORKSPACE</text>
        <text x="239" y="222" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.78" fontFamily="system-ui,sans-serif" letterSpacing="0.06em">同一个工作台</text>
        <line x1="162" y1="234" x2="316" y2="234" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.14" />

        {/* Corner accent squares on center box */}
        <rect x="145" y="179" width="5" height="5" fill="currentColor" fillOpacity="0.55" />
        <rect x="328" y="179" width="5" height="5" fill="currentColor" fillOpacity="0.55" />
        <rect x="145" y="241" width="5" height="5" fill="currentColor" fillOpacity="0.3" />
        <rect x="328" y="241" width="5" height="5" fill="currentColor" fillOpacity="0.3" />
      </svg>
    </div>
  );
}
