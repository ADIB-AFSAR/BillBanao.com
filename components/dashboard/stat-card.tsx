import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "amber" | "brick" | "moss";
  sub?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-ink/5 text-ink",
    amber: "bg-amber/10 text-amber-dark",
    brick: "bg-brick-bg text-brick",
    moss: "bg-moss-bg text-moss",
  };

  return (
    <div className="rounded-lg border border-paper-line bg-paper-raised p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
        <span className={cn("grid place-items-center size-8 rounded-md", toneClasses[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-ink tabular">{value}</p>
      {sub && <p className="text-xs text-slate mt-1">{sub}</p>}
    </div>
  );
}
