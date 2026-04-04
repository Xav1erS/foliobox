import { cn } from "@/lib/utils";

export function IsometricWireframe({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("text-white/85", className)}>
      <svg
        viewBox="0 0 420 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        <g opacity="0.18" stroke="currentColor" strokeWidth="1">
          {Array.from({ length: 11 }).map((_, i) => (
            <path
              key={`diag-a-${i}`}
              d={`M ${-20 + i * 42} 290 L ${190 + i * 42} 150`}
            />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <path
              key={`diag-b-${i}`}
              d={`M ${40 + i * 42} 150 L ${250 + i * 42} 290`}
            />
          ))}
        </g>

        <g stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M128 177 213 126 312 185 227 236Z" />
          <path d="M128 177v40l99 57v-38" opacity="0.65" />
          <path d="M227 236v38l85-51v-38" opacity="0.65" />

          <path d="M155 160 213 126 283 166 225 199Z" opacity="0.86" />
          <path d="M155 160v26l70 40v-27" opacity="0.48" />
          <path d="M225 199v27l58-35v-25" opacity="0.48" />

          <path d="M181 145 214 126 249 146 216 165Z" opacity="0.95" />
          <path d="M181 145v12l35 20v-12" opacity="0.5" />
          <path d="M216 165v12l33-19v-12" opacity="0.5" />

          <rect x="73" y="199" width="52" height="34" transform="rotate(-30 73 199)" opacity="0.9" />
          <path d="M95 189 133 211" opacity="0.55" />
          <path d="M90 199 128 220" opacity="0.55" />
          <path d="M84 208 121 230" opacity="0.55" />

          <rect x="318" y="157" width="56" height="38" transform="rotate(30 318 157)" opacity="0.9" />
          <path d="M330 169 360 151" opacity="0.55" />
          <path d="M338 174 367 157" opacity="0.55" />
          <path d="M346 180 375 163" opacity="0.55" />

          <path d="M248 95c0-14 14-25 31-25s31 11 31 25-14 25-31 25-31-11-31-25Z" />
          <path d="M279 70v50" opacity="0.45" />

          <path d="M106 105 152 78 187 98 142 125Z" opacity="0.88" />
          <path d="M106 105v42l36 21v-43" opacity="0.46" />
          <path d="M142 125v43l45-27V98" opacity="0.46" />

          <path d="M291 120 334 94 364 112 321 138Z" opacity="0.88" />
          <path d="M291 120v33l30 17v-32" opacity="0.46" />
          <path d="M321 138v32l43-25v-33" opacity="0.46" />

          <path d="M164 232 232 193" opacity="0.38" strokeDasharray="5 5" />
          <path d="M232 193 327 175" opacity="0.38" strokeDasharray="5 5" />
          <path d="M119 210 71 221" opacity="0.32" strokeDasharray="5 5" />
        </g>

        <g fill="currentColor">
          <circle cx="232" cy="193" r="3.5" />
          <circle cx="327" cy="175" r="3.5" opacity="0.82" />
          <circle cx="119" cy="210" r="3.5" opacity="0.82" />
          <circle cx="71" cy="221" r="3.5" opacity="0.62" />
        </g>
      </svg>
    </div>
  );
}
