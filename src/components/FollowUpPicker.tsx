import { useState } from "react";
import { useTranslation } from "react-i18next";

const PRESETS: { key: "tomorrow" | "in3days" | "nextWeek"; days: number }[] = [
  { key: "tomorrow", days: 1 },
  { key: "in3days", days: 3 },
  { key: "nextWeek", days: 7 },
];

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Tomorrow / In 3 days / Next week / No follow-up" (plus, with `allowCustom`, "Custom" — a
 * plain date input) — sets a plain date on the visit or call being logged (or edited) so
 * "Upcoming Follow-ups" can surface it as the rep's/agent's next task, without needing a
 * separate task system. */
export default function FollowUpPicker({
  value,
  onChange,
  allowCustom = false,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  allowCustom?: boolean;
}) {
  const { t } = useTranslation();
  const presetDates = PRESETS.map((p) => ({ ...p, date: addDays(p.days) }));
  const matchesPreset = value === null || presetDates.some((p) => p.date === value);
  const [customOpen, setCustomOpen] = useState(allowCustom && value !== null && !matchesPreset);

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{t("followUp.label")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setCustomOpen(false);
            onChange(null);
          }}
          className={pill(!customOpen && value === null)}
        >
          {t("followUp.none")}
        </button>
        {presetDates.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setCustomOpen(false);
              onChange(p.date);
            }}
            className={pill(!customOpen && value === p.date)}
          >
            {t(`followUp.${p.key}`)}
          </button>
        ))}
        {allowCustom && (
          <button
            type="button"
            onClick={() => {
              setCustomOpen(true);
              if (value === null || matchesPreset) onChange(null);
            }}
            className={pill(customOpen)}
          >
            {t("followUp.custom")}
          </button>
        )}
      </div>
      {customOpen && (
        <input
          type="date"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="mt-2 rounded-lg border border-gray-200 px-3.5 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          dir="ltr"
        />
      )}
    </div>
  );
}

function pill(active: boolean) {
  return `rounded-full px-3.5 py-1.5 text-xs font-semibold ${
    active ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
  }`;
}
