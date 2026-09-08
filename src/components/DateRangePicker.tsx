import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A small calendar-style date-range filter — click a start day, then an end day. No dependency, one month visible at a time. */
export default function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = from ? new Date(from + "T00:00:00") : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  function pickDay(iso: string) {
    if (!from || (from && to)) {
      onChange(iso, "");
    } else if (iso < from) {
      onChange(iso, from);
    } else {
      onChange(from, iso);
    }
  }

  const label = from || to ? `${from || "…"} → ${to || "…"}` : t("dateRange.pick");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
      >
        <Calendar size={13} className="text-gray-400" />
        <span dir="ltr">{label}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between pb-2">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-sea-800" dir="ltr">
              {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="rounded p-1 text-gray-400 hover:bg-gray-100"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toISODate(new Date(year, month, day));
              const inRange = from && to && iso >= from && iso <= to;
              const isEndpoint = iso === from || iso === to;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pickDay(iso)}
                  className={`rounded-full py-1 text-[11px] ${
                    isEndpoint
                      ? "bg-teal-500 font-bold text-white"
                      : inRange
                        ? "bg-teal-50 text-teal-700"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-gray-600"
            >
              <X size={11} /> {t("dateRange.clear")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-semibold text-teal-700 hover:underline"
            >
              {t("dateRange.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
