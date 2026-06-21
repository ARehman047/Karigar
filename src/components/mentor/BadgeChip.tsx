import { Medal } from "lucide-react";
import { cn } from "@/lib/utils";

type Badge = "none" | "silver" | "gold" | undefined;

interface BadgeChipProps {
  badge: Badge;
  showLabel?: boolean;
  className?: string;
}

/** Small pill showing a mentor's silver/gold badge. Renders nothing for "none". */
export const BadgeChip = ({ badge, showLabel = true, className }: BadgeChipProps) => {
  if (!badge || badge === "none") return null;
  const isGold = badge === "gold";
  return (
    <span
      title={`${isGold ? "Gold" : "Silver"} badge mentor`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        isGold
          ? "bg-amber-100 text-amber-700 border-amber-300"
          : "bg-slate-100 text-slate-600 border-slate-300",
        className
      )}
    >
      <Medal className={cn("h-3.5 w-3.5", isGold ? "text-amber-500" : "text-slate-400")} />
      {showLabel && (isGold ? "Gold" : "Silver")}
    </span>
  );
};
