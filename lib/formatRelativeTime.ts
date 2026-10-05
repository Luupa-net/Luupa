// Small "2h ago" / "Never" formatter for compact UI spots (e.g. a staff
// member's last login). No date-fns/dayjs dependency for one string.
export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  // Deriving years from `days / 365` directly (instead of from `months`)
  // used to round down to 0 for 360-364 day gaps — the exact range just
  // past the `months < 12` cutoff above, so "a year ago" briefly displayed
  // as "0y ago". Deriving from `months` keeps this consistent with the
  // branch right above it.
  return `${Math.max(1, Math.floor(months / 12))}y ago`;
}
