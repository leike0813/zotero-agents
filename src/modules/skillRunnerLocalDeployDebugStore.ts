import { isDebugModeEnabled } from "./debugMode";

export type SkillRunnerLocalDeployDebugLevel =
  | "debug"
  | "info"
  | "warn"
  | "error";

export type SkillRunnerLocalDeployDebugEntry = {
  id: string;
  ts: string;
  level: SkillRunnerLocalDeployDebugLevel;
  operation: string;
  stage: string;
  message: string;
  details?: unknown;
  error?: unknown;
};

type SkillRunnerLocalDeployDebugInput = Omit<
  SkillRunnerLocalDeployDebugEntry,
  "id" | "ts"
> & {
  ts?: string;
};

type SkillRunnerLocalDeployDebugListener = (
  entries: SkillRunnerLocalDeployDebugEntry[],
) => void;

let sessionSeq = 0;
let entrySeq = 0;
let entries: SkillRunnerLocalDeployDebugEntry[] = [];
const listeners = new Set<SkillRunnerLocalDeployDebugListener>();

function cloneEntry(entry: SkillRunnerLocalDeployDebugEntry) {
  return {
    ...entry,
    details:
      typeof entry.details === "undefined"
        ? undefined
        : JSON.parse(JSON.stringify(entry.details)),
    error:
      typeof entry.error === "undefined"
        ? undefined
        : JSON.parse(JSON.stringify(entry.error)),
  } as SkillRunnerLocalDeployDebugEntry;
}

function emitChanged() {
  const snapshot = entries.map((entry) => cloneEntry(entry));
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function resetSkillRunnerLocalDeployDebugSession(args?: {
  version?: string;
  trigger?: string;
}) {
  sessionSeq += 1;
  entrySeq = 0;
  entries = [];
  if (!isDebugModeEnabled()) {
    emitChanged();
    return;
  }
  appendSkillRunnerLocalDeployDebugLog({
    level: "info",
    operation: "deploy-session",
    stage: "deploy-session-started",
    message: "started local deploy debug session",
    details: {
      sessionId: sessionSeq,
      version: String(args?.version || "").trim() || undefined,
      trigger: String(args?.trigger || "").trim() || undefined,
    },
  });
}

export function appendSkillRunnerLocalDeployDebugLog(
  input: SkillRunnerLocalDeployDebugInput,
) {
  if (!isDebugModeEnabled()) {
    return null;
  }
  const entry: SkillRunnerLocalDeployDebugEntry = {
    id: `deploy-log-${sessionSeq}-${++entrySeq}`,
    ts: String(input.ts || new Date().toISOString()),
    level: input.level,
    operation: String(input.operation || "unknown"),
    stage: String(input.stage || input.operation || "unknown"),
    message: String(input.message || ""),
    details: typeof input.details === "undefined" ? undefined : input.details,
    error: typeof input.error === "undefined" ? undefined : input.error,
  };
  entries.push(entry);
  emitChanged();
  return cloneEntry(entry);
}

export function listSkillRunnerLocalDeployDebugLogs() {
  return entries.map((entry) => cloneEntry(entry));
}

export function subscribeSkillRunnerLocalDeployDebugLogs(
  listener: SkillRunnerLocalDeployDebugListener,
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
