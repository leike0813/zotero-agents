// Page-side DOM/formatting utilities for the dashboard bundle, ported from
// addon/content/dashboard/app.js. Keep these free of region semantics; the
// panel model composes them into per-region view data.

export function formatTime(value: unknown): string {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }
  return parsed.toLocaleString();
}

export function escapeHtml(value: unknown): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatBytes(value: unknown): string {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  if (bytes < 1024) {
    return bytes + " B";
  }
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1) + " KB";
  }
  return (
    (bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1) + " MB"
  );
}

const DASHBOARD_BUSY_STATUS_TOKENS = new Set([
  "started",
  "running",
  "prompting",
  "repairing",
  "checking-command",
  "spawning",
  "initializing",
  "connecting",
]);

export function normalizeDashboardStatusToken(value: unknown): string {
  const token = String(value || "idle")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
  return token || "idle";
}

export function dashboardStatusClassToken(value: unknown): string {
  return (
    String(value || "idle")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "-") || "idle"
  );
}

export type DashboardStatusTone =
  | "error"
  | "warning"
  | "success"
  | "accent"
  | "muted";

export function dashboardStatusTone(stateValue: unknown): DashboardStatusTone {
  const token = normalizeDashboardStatusToken(stateValue);
  if (
    ["failed", "error", "errored", "disconnected", "closed"].indexOf(token) >= 0
  ) {
    return "error";
  }
  if (token === "failed-retriable") {
    return "warning";
  }
  if (
    [
      "waiting-user",
      "waiting-auth",
      "permission-required",
      "auth-required",
    ].indexOf(token) >= 0
  ) {
    return "warning";
  }
  if (
    [
      "succeeded",
      "success",
      "done",
      "completed",
      "connected",
      "active",
    ].indexOf(token) >= 0
  ) {
    return "success";
  }
  if (DASHBOARD_BUSY_STATUS_TOKENS.has(token)) {
    return "accent";
  }
  return "muted";
}

// Full class list of a status badge, matching renderStatusBadge in the old
// implementation ("status <token> is-<tone> [extra]").
export function dashboardStatusBadgeClass(
  stateValue: unknown,
  extraClassName?: string,
): string {
  return [
    "status",
    dashboardStatusClassToken(stateValue),
    "is-" + dashboardStatusTone(stateValue),
    extraClassName || "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Full class list of a log level badge, matching renderLogLevelBadge in the
// old implementation ("log-level-badge log-level-badge--<normalized>").
export function dashboardLogLevelBadgeClass(level: unknown): string {
  const normalized = String(level || "")
    .trim()
    .toLowerCase();
  const token = ["debug", "info", "warn", "error"].includes(normalized)
    ? normalized
    : "unknown";
  return `log-level-badge log-level-badge--${token}`;
}

const DASHBOARD_TAB_ICON_CLASSES: Record<string, string> = {
  home: "zs-icon-dashboard",
  "workflow-options": "zs-icon-settings-applications",
  products: "zs-icon-inventory-2",
  "runtime-logs": "zs-icon-terminal",
  "synthesis-sidecar": "zs-icon-terminal",
  "skillrunner-connection-audit": "zs-icon-terminal",
  "acp-trace-replay": "zs-icon-terminal",
};

export function dashboardTabIconClass(tabKey: unknown): string {
  return DASHBOARD_TAB_ICON_CLASSES[String(tabKey || "")] || "";
}

// Toast host contract: a single `div#zs-toast.zs-toast` carrying
// [data-role="dashboard-toast"], lazily created under document.body. The
// id/class stay for stylesheet compatibility with the legacy page; the
// data-role attribute is the region skeleton hook going forward.
let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function showToast(message: unknown): void {
  let toast = document.getElementById("zs-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "zs-toast";
    toast.className = "zs-toast";
    toast.setAttribute("data-role", "dashboard-toast");
    document.body.appendChild(toast);
  }
  toast.textContent = String(message == null ? "" : message);
  toast.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    toastTimer = undefined;
  }, 3000);
}

export function disposeToast(): void {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = undefined;
  }
  if (typeof document !== "undefined") {
    document.getElementById("zs-toast")?.remove();
  }
}

export function copyTextToClipboard(text: unknown): Promise<void> {
  const source = String(text || "");
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(source);
  }
  const textarea = document.createElement("textarea");
  textarea.value = source;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return Promise.resolve();
  } finally {
    textarea.remove();
  }
}

export function copyTextWithToastFeedback(
  text: unknown,
  toastMessage: string,
): Promise<void> {
  return copyTextToClipboard(text).then(() => {
    if (toastMessage) {
      showToast(toastMessage);
    }
  });
}
