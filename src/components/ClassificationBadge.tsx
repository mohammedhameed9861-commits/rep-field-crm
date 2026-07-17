import type { ShopClassification } from "@/types/database";

const COLORS: Record<ShopClassification, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-amber-100 text-amber-700",
  C: "bg-gray-200 text-gray-600",
};

export function ClassificationBadge({ classification }: { classification: ShopClassification | null }) {
  if (!classification) return null;
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${COLORS[classification]}`}>
      {classification}
    </span>
  );
}
