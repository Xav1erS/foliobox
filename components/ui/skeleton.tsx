import { cn } from "@/lib/utils"

function Skeleton({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "inverse"
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md",
        variant === "inverse" ? "bg-white/6" : "bg-muted",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
