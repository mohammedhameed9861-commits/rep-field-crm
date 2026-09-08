import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { fetchMyVisits, visitPhotoUrl } from "../../lib/visits";
import type { Visit } from "../../lib/types";
import { NO_SALE_REASON_LABEL } from "../../lib/types";
import { formatDateTime } from "../../lib/format";

export default function MyVisitsPage() {
  const { profile } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    setLoading(true);
    fetchMyVisits(profile.id)
      .then(async (data) => {
        if (!alive) return;
        setVisits(data);
        const entries = await Promise.all(
          data.map(async (v) => [v.id, await visitPhotoUrl(v.photo_path)] as const),
        );
        if (alive) {
          setPhotos(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [profile]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-7 pb-4 pt-6">
        <div>
          <h1 className="text-xl font-bold text-sea-800">My Visits</h1>
          <p className="mt-0.5 text-sm text-gray-500">{visits.length} logged</p>
        </div>
        <Link
          to="/visits/new"
          className="flex items-center gap-2 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
        >
          <Plus size={16} /> New Visit
        </Link>
      </div>

      {error && <p className="px-7 pb-3 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-gray-400">No visits logged yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {visits.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3"
              >
                {photos[v.id] ? (
                  <img
                    src={photos[v.id]}
                    alt={v.account?.name ?? "Visit"}
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {v.account?.name ?? "Shop"}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                        v.outcome === "sold"
                          ? "bg-teal-50 text-teal-700"
                          : "bg-warn-100 text-warn-600"
                      }`}
                    >
                      {v.outcome === "sold" ? "Sold" : "No Sale"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">
                    {v.account?.area ?? ""} &middot; {formatDateTime(v.created_at)}
                  </div>
                  {v.outcome === "no_sale" && v.no_sale_reason && (
                    <div className="mt-1 text-xs text-gray-500">
                      {NO_SALE_REASON_LABEL[v.no_sale_reason]}
                      {v.note ? ` — ${v.note}` : ""}
                    </div>
                  )}
                  {v.outcome === "sold" && v.note && (
                    <div className="mt-1 text-xs text-gray-500">{v.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
