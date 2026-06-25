import type { BackendInstance } from "../backends/types";
import {
  BACKEND_TYPES,
  PASS_THROUGH_BACKEND_TYPE,
  type BackendType,
} from "../config/defaults";
import type { TaskDashboardHistoryRecord } from "./taskDashboardHistory";
import type { WorkflowTaskRecord } from "./taskRuntime";

function cloneBackend(backend: BackendInstance): BackendInstance {
  return {
    ...backend,
    auth: {
      ...(backend.auth || { kind: "none" }),
    },
  };
}

function toTime(input: string | undefined) {
  const parsed = Date.parse(String(input || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBackendKey(record: {
  backendId?: string;
  backendType?: string;
  backendBaseUrl?: string;
}) {
  const id = String(record.backendId || "").trim();
  const type = String(record.backendType || "").trim();
  const baseUrl = String(record.backendBaseUrl || "").trim();
  return { id, type, baseUrl };
}

function normalizeBackendType(value: unknown): BackendType | null {
  const normalized = String(value || "").trim();
  return BACKEND_TYPES.includes(normalized as BackendType)
    ? (normalized as BackendType)
    : null;
}

function appendSyntheticBackend(
  map: Map<string, BackendInstance>,
  record: {
    backendId?: string;
    backendType?: string;
    backendBaseUrl?: string;
  },
) {
  const normalized = normalizeBackendKey(record);
  const type = normalizeBackendType(normalized.type);
  if (
    !normalized.id ||
    !type ||
    type === PASS_THROUGH_BACKEND_TYPE ||
    map.has(normalized.id)
  ) {
    return;
  }
  map.set(normalized.id, {
    id: normalized.id,
    type,
    baseUrl: normalized.baseUrl || "unknown://backend",
    auth: { kind: "none" },
  });
}

export function normalizeDashboardBackends(args: {
  configured: BackendInstance[];
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
}) {
  const map = new Map<string, BackendInstance>();
  for (const backend of args.configured) {
    if (backend.type === PASS_THROUGH_BACKEND_TYPE) {
      continue;
    }
    map.set(backend.id, cloneBackend(backend));
  }
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function mergeRecordMap<T extends { id: string; updatedAt: string }>(
  target: Map<string, T>,
  record: T,
) {
  const existing = target.get(record.id);
  if (!existing) {
    target.set(record.id, record);
    return;
  }
  if (toTime(record.updatedAt) >= toTime(existing.updatedAt)) {
    target.set(record.id, record);
  }
}

export function mergeDashboardTaskRows(args: {
  backendId: string;
  history: TaskDashboardHistoryRecord[];
  active: WorkflowTaskRecord[];
}) {
  const normalizedBackendId = String(args.backendId || "").trim();
  const merged = new Map<string, WorkflowTaskRecord>();
  for (const row of args.history) {
    if (row.backendId !== normalizedBackendId) {
      continue;
    }
    mergeRecordMap(merged, { ...row });
  }
  for (const row of args.active) {
    if (row.backendId !== normalizedBackendId) {
      continue;
    }
    mergeRecordMap(merged, { ...row });
  }
  return Array.from(merged.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function normalizeDashboardTabKey(args: {
  requestedTabKey?: string;
  backends: BackendInstance[];
  debugModeEnabled?: boolean;
}) {
  const requested = String(args.requestedTabKey || "").trim();
  if (
    requested === "home" ||
    requested === "products" ||
    requested === "workflow-options" ||
    requested === "runtime-logs"
  ) {
    return requested;
  }
  if (
    args.debugModeEnabled === true &&
    requested === "skillrunner-connection-audit"
  ) {
    return requested;
  }
  if (requested.startsWith("backend:")) {
    const backendId = requested.slice("backend:".length);
    if (args.backends.some((entry) => entry.id === backendId)) {
      return requested;
    }
  }
  return "home";
}
