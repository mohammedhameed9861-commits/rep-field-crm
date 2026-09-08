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

/** "Tomorrow / In 3 days / Next week / No follow-up" — sets a plain date on the visit or call
 * being logged (or edited) so "Upcoming Follow-ups" can surface it as the rep's next task,
 * without needing a separate task system. */
export default function FollowUpPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-500">{t("followUp.label")}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={pill(value === null)}
        >
          {t("followUp.none")}
        </button>
        {PRESETS.map((p) => {
          const date = addDays(p.days);
          return (
            <button key={p.key} type="button" onClick={() => onChange(date)} className={pill(value === date)}>
              {t(`followUp.${p.key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pill(active: boolean) {
  return `rounded-full px-3.5 py-1.5 text-xs font-semibold ${
    active ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-500"
  }`;
}
