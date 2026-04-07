const STEPS = [
  { num: 1, label: "边界确认" },
  { num: 2, label: "完整度检查" },
  { num: 3, label: "骨架定稿" },
  { num: 4, label: "排版验收" },
] as const;

export function WorkflowProgressBar({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mt-6 grid grid-cols-4 border border-neutral-200 bg-white">
      {STEPS.map((step, i) => {
        const isActive = step.num === currentStep;
        const isDone = step.num < currentStep;
        return (
          <div
            key={step.num}
            className={[
              "flex items-center gap-2.5 px-4 py-3",
              i > 0 ? "border-l border-neutral-200" : "",
              isActive ? "bg-neutral-900" : isDone ? "bg-neutral-50" : "bg-white",
            ].join(" ")}
          >
            <span
              className={[
                "shrink-0 text-[10px] font-mono",
                isActive ? "text-neutral-400" : isDone ? "text-neutral-400" : "text-neutral-300",
              ].join(" ")}
            >
              {isDone ? "✓" : `0${step.num}`}
            </span>
            <span
              className={[
                "text-xs font-medium",
                isActive ? "text-white" : isDone ? "text-neutral-500" : "text-neutral-400",
              ].join(" ")}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
