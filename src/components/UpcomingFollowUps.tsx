import { useTranslation } from "react-i18next";
import { CalendarClock } from "lucide-react";
import { formatDate } from "../lib/format";

interface FollowUpItem {
  id: string;
  next_followup_at: string | null;
  account?: { name: string; area: string | null } | null;
}

/** The rep's/agent's "next task" list — every logged visit or call that has a next-follow-up
 * date set, soonest first, so scheduling one at logging time is enough to surface it here
 * without any separate task system. Shown at the top of "My Visits"/"My Calls". */
export default function UpcomingFollowUps({ items }: { items: FollowUpItem[] }) {
  const { t } = useTranslation();

  const upcoming = items
    .filter((i): i is FollowUpItem & { next_followup_at: string } => Boolean(i.next_followup_at))
    .sort((a, b) => a.next_followup_at.localeCompare(b.next_followup_at));

  if (upcoming.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-sea-800">
        <CalendarClock size={15} /> {t("followUp.upcomingTitle")}
      </div>
      <div className="flex flex-col gap-1.5">
        {upcoming.map((i) => {
          const status = i.next_followup_at < today ? "overdue" : i.next_followup_at === today ? "today" : "due";
          return (
            <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-gray-700">
                {i.account?.name ?? ""}
                {i.account?.area ? <span className="text-gray-400"> · {i.account.area}</span> : null}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                  status === "overdue"
                    ? "bg-red-100 text-red-600"
                    : status === "today"
                      ? "bg-warn-100 text-warn-600"
                      : "bg-teal-50 text-teal-700"
                }`}
              >
                {status === "today" ? t("followUp.today") : status === "overdue" ? t("followUp.overdue") : formatDate(i.next_followup_at)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
