import type { TFunction } from "i18next";

/** Localized ticket status for tables/badges (API sends enum e.g. RESOLVED). */
export function formatTicketStatusLabel(status: string, t: TFunction) {
  const key = `tickets.status.${status}`;
  const label = t(key);
  if (label !== key) return label;
  return status.replace(/_/g, " ");
}
