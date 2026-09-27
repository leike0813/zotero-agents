// Host-supplied UI labels for the dashboard page bundle.
//
// Ported from addon/content/dashboard/app.js labelText (:201-207): a host
// label wins when present; an empty value or a bare `task-dashboard-*` key
// echoed back unresolved falls back to the explicit fallback, then to the
// key itself. All user-visible copy on the page resolves through this
// function — TSX components never hardcode English text.

export type DashboardLabels = Record<string, string>;

const UNRESOLVED_LABEL_KEY_PATTERN = /^task-dashboard-[a-z0-9-]+$/i;

export function labelText(
  labels: DashboardLabels | null | undefined,
  key: string,
  fallback?: string,
): string {
  const text = String((labels && labels[key]) || "").trim();
  if (text && !UNRESOLVED_LABEL_KEY_PATTERN.test(text)) {
    return text;
  }
  return typeof fallback === "string" ? fallback : key;
}
