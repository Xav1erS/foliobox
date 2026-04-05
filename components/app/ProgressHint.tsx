export function ProgressHint({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{label ?? "当前进度"}</span>
        <span>
          第 {current} / {total} 步
        </span>
      </div>
      <div className="h-1.5 overflow-hidden border border-neutral-300 bg-neutral-200/80">
        <div
          className="h-full bg-neutral-900 transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}
