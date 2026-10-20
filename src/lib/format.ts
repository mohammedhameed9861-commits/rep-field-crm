export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Tolerates a missing value on purpose: the SQL that adds a new column (like
 * product_types.price) is a manual step run separately from the code deploy, so a
 * stale row without it must show as 0, never crash the whole screen. */
export function formatPrice(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
