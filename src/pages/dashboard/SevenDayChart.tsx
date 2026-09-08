import { useTranslation } from "react-i18next";
import type { DaySeriesPoint } from "../../lib/dashboard";

/** A small dependency-free bar chart — one bar per day, height scaled to the busiest day in the series. */
export default function SevenDayChart({ series }: { series: DaySeriesPoint[] }) {
  const { i18n } = useTranslation();
  const max = Math.max(1, ...series.map((p) => p.cartons));
  const locale = i18n.language === "ar" ? "ar" : "en";

  return (
    <div className="flex h-28 items-end gap-2">
      {series.map((p) => {
        const day = new Date(p.date + "T00:00:00").toLocaleDateString(locale, { weekday: "short" });
        const heightPct = Math.max(4, (p.cartons / max) * 100);
        return (
          <div key={p.date} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-gray-500" dir="ltr">
              {p.cartons}
            </span>
            <div className="flex h-16 w-full items-end rounded bg-gray-50">
              <div className="w-full rounded bg-teal-400" style={{ height: `${heightPct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400">{day}</span>
          </div>
        );
      })}
    </div>
  );
}
