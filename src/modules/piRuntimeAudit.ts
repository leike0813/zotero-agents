import { joinPath } from "../utils/path";
import type { JsonValue } from "../workflows/types";
import type { PiOwnerRef, PiTranscriptEntry } from "./piTranscriptStore";
import { piOwnerPaths } from "./piTranscriptStore";
import {
  appendRuntimeLog,
  normalizeRuntimeLogEntry,
  getRuntimeLogDiagnosticMode,
  snapshotRuntimeLogs,
  type RuntimeLogEntry,
  type PiRuntimeLogCorrelation,
} from "./runtimeLogManager";
import {
  appendRuntimeTextFile,
  copyRuntimeFile,
  ensureRuntimeDirectoryStrict,
  getRuntimePersistencePaths,
  removeRuntimePath,
  replaceRuntimeTextFileAtomically,
  resolveRuntimePathIdentity,
  runtimePathExists,
  scanRuntimeUtf8Lines,
  statRuntimePathStrict,
} from "./runtimePersistence";
import { createRuntimeAuditAppendQueue } from "./runtimeAuditAppendQueue";
import { createWorkflowArchiveApi } from "../workflows/archive";
import {
  isDebugModeEnabled,
  PI_RUNTIME_AUDIT_DEBUG_ENABLED,
} from "./debugMode";
import {
  getPiFailurePolicy,
  isPiFailureCode,
} from "../shared/piFailureContract";

type Origin =
  | "runtime"
  | "provider"
  | "tool_gateway"
  | "persistence"
  | "conversation"
  | "skill_run"
  | "configuration"
  | "audit";
type Correlation = PiRuntimeLogCorrelation & {
  requestId?: string;
  workflowId?: string;
  jobId?: string;
  runId?: string;
  interactionId?: string;
};
export type PiRuntimeAuditContext = {
  /**
   * Trusted audit context handed to a fact owner. It carries only the owner
   * identity the owner already holds, so a seam forwards no audit callback: it
   * calls {@link record} with a structural fact plus this context, and the
   * audit module owns admission, projection and storage.
   */
  owner: PiOwnerRef;
  root?: string;
  workspaceDir?: string;
};
export type PiRuntimeAuditFact = {
  operation: keyof typeof OPERATIONS;
  origin: Origin;
  owner?: PiOwnerRef;
  root?: string;
  workspaceDir?: string;
  correlation?: Correlation;
  attributes?: Partial<
    Record<
      | "status"
      | "outcome"
      | "reason"
      | "entryId"
      | "receiptId"
      | "count"
      | "bytes"
      | "duration"
      | "revision"
      | "droppedEntries"
      | "droppedBytes"
      | "repeatCount"
      | "modelId"
      | "providerId"
      | "capabilityId"
      | "kind"
      | "retry"
      | "method",
      string | number | boolean
    >
  >;
  /** Severity lookup input only; the canonical failure is never copied to audit. */
  failureCode?: string;
};
export type PiDiagnosticScope =
  | { kind: "global" }
  | { kind: "owner"; owner: PiOwnerRef; root?: string };
export type PiDiagnosticExportResult =
  | { status: "exported"; bytes: number; complete: boolean }
  | { status: "failed"; code: "diagnostic_export_failed" };
type Policy = {
  tier: "production" | "diagnostic" | "debug";
  level: RuntimeLogEntry["level"];
  origins: readonly Origin[];
  attributes: readonly string[];
};
const policy = (
  tier: Policy["tier"],
  level: Policy["level"],
  origins: readonly Origin[],
  attributes: readonly string[] = [],
): Policy => ({ tier, level, origins, attributes });
const OWNERS: readonly Origin[] = ["conversation", "skill_run"];
const ALL_ORIGINS: readonly Origin[] = [
  ...OWNERS,
  "runtime",
  "provider",
  "tool_gateway",
  "persistence",
  "configuration",
  "audit",
];
const OUTCOME = ["status", "outcome", "reason", "entryId", "receiptId"];
const COUNTS = [
  "count",
  "bytes",
  "duration",
  "revision",
  "droppedEntries",
  "droppedBytes",
  "repeatCount",
];
/** The sole admission/projection policy. No producer-supplied prose or level. */
const OPERATIONS = {
  "owner.terminal": policy("production", "info", OWNERS, OUTCOME),
  "failure.observed": policy("production", "error", ALL_ORIGINS),
  "execution.canceled": policy(
    "production",
    "info",
    ["runtime", ...OWNERS],
    OUTCOME,
  ),
  "capability.denied_or_degraded": policy(
    "production",
    "warn",
    ["tool_gateway", "configuration"],
    OUTCOME,
  ),
  "tool.mutation_receipt_committed": policy(
    "production",
    "info",
    ["tool_gateway"],
    ["receiptId", "entryId", "outcome"],
  ),
  "persistence.integrity_failure": policy(
    "production",
    "error",
    ["persistence"],
    OUTCOME,
  ),
  "persistence.repair_terminal": policy(
    "production",
    "info",
    ["persistence"],
    [...OUTCOME, ...COUNTS],
  ),
  "security.decision_denied": policy(
    "production",
    "warn",
    ["tool_gateway", "provider", "configuration"],
    OUTCOME,
  ),
  "audit.gap": policy("production", "warn", ALL_ORIGINS, ["reason", ...COUNTS]),
  "diagnostics.export_terminal": policy(
    "production",
    "info",
    ["audit"],
    [...OUTCOME, ...COUNTS],
  ),
  "owner.created": policy("diagnostic", "info", OWNERS),
  "owner.archived": policy("diagnostic", "info", OWNERS),
  "turn.started": policy("diagnostic", "info", ["runtime"], COUNTS),
  "turn.terminal": policy("diagnostic", "info", ["runtime"], OUTCOME),
  "model.invocation_started": policy(
    "diagnostic",
    "info",
    ["provider"],
    ["modelId", "providerId", ...COUNTS],
  ),
  "model.invocation_terminal": policy(
    "diagnostic",
    "info",
    ["provider"],
    [...OUTCOME, ...COUNTS],
  ),
  "tool.started": policy(
    "diagnostic",
    "info",
    ["tool_gateway"],
    ["capabilityId", ...COUNTS],
  ),
  "tool.terminal": policy(
    "diagnostic",
    "info",
    ["tool_gateway"],
    [...OUTCOME, ...COUNTS],
  ),
  "interaction.wait": policy("diagnostic", "info", OWNERS, [
    "kind",
    "revision",
  ]),
  "interaction.continued": policy("diagnostic", "info", OWNERS, [
    "kind",
    "revision",
  ]),
  "interaction.declined": policy("diagnostic", "info", OWNERS, [
    "kind",
    "revision",
  ]),
  "interaction.suspended": policy("diagnostic", "info", OWNERS, [
    "kind",
    "revision",
  ]),
  "provider.transport": policy(
    "diagnostic",
    "info",
    ["provider"],
    ["status", "duration", "bytes", "retry", "method"],
  ),
  "policy.allowed": policy(
    "diagnostic",
    "info",
    ["tool_gateway"],
    ["capabilityId", "reason"],
  ),
  "queue.capacity": policy("diagnostic", "info", ["runtime", "audit"], COUNTS),
  "persistence.projection_terminal": policy(
    "diagnostic",
    "info",
    ["persistence"],
    [...OUTCOME, ...COUNTS],
  ),
  "persistence.compaction_terminal": policy(
    "diagnostic",
    "info",
    ["persistence"],
    [...OUTCOME, ...COUNTS],
  ),
  "diagnostics.export_started": policy("diagnostic", "info", ["audit"]),
  "stream.shape": policy("debug", "debug", ["runtime"], ["kind", ...COUNTS]),
  "stream.late_event": policy(
    "debug",
    "debug",
    ["runtime", "provider"],
    ["kind", ...COUNTS],
  ),
  "scheduler.decision": policy(
    "debug",
    "debug",
    ["runtime"],
    ["reason", ...COUNTS],
  ),
  "policy.evaluation": policy(
    "debug",
    "debug",
    ["tool_gateway"],
    ["reason", "capabilityId"],
  ),
  "persistence.io_step": policy(
    "debug",
    "debug",
    ["persistence"],
    ["kind", ...COUNTS],
  ),
  "audit.queue_step": policy("debug", "debug", ["audit"], ["kind", ...COUNTS]),
  "runtime.teardown_step": policy(
    "debug",
    "debug",
    ["runtime"],
    ["kind", ...COUNTS],
  ),
} satisfies Record<string, Policy>;
function operationPolicy(operation: unknown): Policy | undefined {
  return typeof operation === "string" && Object.hasOwn(OPERATIONS, operation)
    ? OPERATIONS[operation as keyof typeof OPERATIONS]
    : undefined;
}
const LIMITS = {
  fileBytes: 64 * 1024 * 1024,
  fileEntries: 50_000,
  entryBytes: 64 * 1024,
  pendingBytes: 1024 * 1024,
  pendingEntries: 1000,
  exportBytes: 96 * 1024 * 1024,
};
let limits = { ...LIMITS };
const encoder = new TextEncoder();
const byteLength = (value: string) => encoder.encode(value).length;
const jsonLine = (entry: RuntimeLogEntry) => `${JSON.stringify(entry)}\n`;
const CORRELATIONS = [
  "conversationId",
  "skillRunId",
  "sessionId",
  "turnId",
  "invocationId",
  "callId",
  "failureId",
  "requestId",
  "workflowId",
  "jobId",
  "runId",
  "interactionId",
] as const;
const STRUCTURAL_VALUES = new Set([
  "completed",
  "failed",
  "canceled",
  "cancelled",
  "waiting_permission",
  "waiting_user",
  "suspended",
  "state_unknown",
  "recovery_required",
  "pending",
  "active",
  "archived",
  "allowed",
  "denied",
  "degraded",
  "success",
  "unknown",
  "unavailable",
  "running",
  "aborted",
  "error",
  "stop",
  "not_started",
  "not_applicable",
  "settled",
  "confirmed_none",
  "permission",
  "user",
  "chunk",
  "text_delta",
  "thinking_delta",
  "terminal",
  "snapshot",
  "projection",
  "compaction",
  "append",
  "replace",
  "read",
  "write",
  "cleanup",
  "model",
  "tool",
  "POST",
  "GET",
  "DELETE",
  "PUT",
  "retention",
  "queue_overflow",
  "admission_overflow",
  "oversized_entry",
  "invalid_audit_record",
  "audit_write_failed",
  "owner_unavailable",
  "owner_quota",
  "audit_gap",
  "source_incomplete",
  "runtime_log_retention",
  "canonical_failure_unavailable",
  "canonical_terminal_unavailable",
  "canonical_commit_failed",
  "torn_tail_repaired",
  "transcript_not_valid",
  "valid",
  "pi_runtime",
  "pi_provider_execution",
  "pi_tool_gateway",
  "pi_owner_persistence",
  "pi_conversation",
  "pi_skill_run",
  "input",
  "policy",
  "availability",
  "resource",
  "persistence",
  "execution",
  "lifecycle",
  "integrity",
  "contract",
]);
function safeToken(value: unknown): string | undefined {
  return typeof value === "string" &&
    value.length <= 256 &&
    /^[A-Za-z0-9][A-Za-z0-9._:@+-]*$/.test(value)
    ? value
    : undefined;
}
function safeCorrelation(source: Correlation = {}): Correlation {
  return Object.fromEntries(
    CORRELATIONS.flatMap((key) => {
      const value = safeToken(source[key]);
      return value ? [[key, value]] : [];
    }),
  );
}
function projectAttributes(
  source: unknown,
  allowed: readonly string[],
): Record<string, JsonValue> {
  const projected: Record<string, JsonValue> = {};
  if (!source || typeof source !== "object" || Array.isArray(source))
    return projected;
  for (const key of allowed) {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0)
      projected[key] = value;
    else if (typeof value === "boolean") projected[key] = value;
    else {
      const token = safeToken(value);
      const identifier = [
        "entryId",
        "receiptId",
        "failureId",
        "capabilityId",
        "modelId",
        "providerId",
      ].includes(key);
      if (
        token &&
        (identifier || STRUCTURAL_VALUES.has(token) || isPiFailureCode(token))
      )
        projected[key] = token;
    }
  }
  return projected;
}
function admitted(rule: Policy) {
  return (
    rule.tier === "production" ||
    (rule.tier === "diagnostic"
      ? getRuntimeLogDiagnosticMode()
      : isDebugModeEnabled() && PI_RUNTIME_AUDIT_DEBUG_ENABLED)
  );
}
let sequence = 0;
function projectFact(fact: PiRuntimeAuditFact): RuntimeLogEntry | null {
  const rule = operationPolicy(fact.operation);
  if (!rule || !rule.origins.includes(fact.origin) || !admitted(rule))
    return null;
  const correlation = safeCorrelation(fact.correlation);
  if (fact.owner) {
    if (
      !safeToken(fact.owner.ownerId) ||
      !["conversation", "skill_run"].includes(fact.owner.kind)
    )
      return null;
    correlation[
      fact.owner.kind === "conversation" ? "conversationId" : "skillRunId"
    ] = fact.owner.ownerId;
  }
  return normalizeRuntimeLogEntry(
    {
      level:
        fact.operation === "failure.observed"
          ? getPiFailurePolicy(fact.failureCode || "").level
          : rule.level,
      scope: "system",
      stage: fact.operation,
      message: fact.operation,
      operation: fact.operation,
      component: `pi-${fact.origin}`,
      ...correlation,
      details: projectAttributes(fact.attributes, rule.attributes),
    },
    { id: `pi-audit-${Date.now().toString(36)}-${++sequence}` },
  );
}

type OwnerState = {
  owner: PiOwnerRef;
  root?: string;
  key: string;
  ownerRoot: string;
  workspace: string;
  path: string;
  ready: Promise<void>;
  stopped: boolean;
  count: number;
  bytes: number;
  loaded: boolean;
  recent: Set<string>;
  gapEntries: number;
  gapBytes: number;
  gapReason?: string;
  pendingBytes: number;
};
const owners = new Map<string, OwnerState>();
const jobs = new Map<string, Set<Promise<void>>>();
const ownerKey = (owner: PiOwnerRef, root?: string) =>
  piOwnerPaths(owner, root).dir;
async function ownerAvailable(state: OwnerState) {
  if (
    state.stopped ||
    !(await runtimePathExists(piOwnerPaths(state.owner, state.root).log))
  )
    return false;
  if (state.owner.kind === "conversation") {
    const { getPiConversationMetadata } = await import("./piOwnerPersistence");
    const metadata = getPiConversationMetadata(state.owner.ownerId);
    if (metadata && !["active", "archived"].includes(metadata.lifecycle))
      return false;
  }
  return true;
}
function stateFor(
  owner: PiOwnerRef,
  root?: string,
  workspaceDir?: string,
): OwnerState {
  const key = ownerKey(owner, root);
  let state = owners.get(key);
  if (state) return state;
  state = {
    owner: { ...owner },
    root,
    key,
    ownerRoot: key,
    workspace: "",
    path: "",
    ready: Promise.resolve(),
    stopped: false,
    count: 0,
    bytes: 0,
    loaded: false,
    recent: new Set(),
    gapEntries: 0,
    gapBytes: 0,
    pendingBytes: 0,
  };
  owners.set(key, state);
  const created = state;
  state.ready = (async () => {
    if (!(await ownerAvailable(created)))
      throw new Error("pi_audit_owner_unavailable");
    let workspace = workspaceDir;
    if (owner.kind === "conversation") workspace = joinPath(key, "workspace");
    else {
      // Only a canonical owner binding can select a Skill Run's external workspace.
      workspace = (await canonicalDiagnostics(owner, root)).workspace;
    }
    if (!workspace) throw new Error("pi_audit_workspace_unavailable");
    const identity = await resolveRuntimePathIdentity({
      root: owner.kind === "conversation" ? key : workspace,
      path: workspace,
      allowMissing: true,
    });
    created.workspace = identity.path;
    created.path = joinPath(identity.path, "runtime-audit", "audit.ndjson");
    queue.bind({ key, owner: key, coordinatorOwner: key, path: created.path });
  })();
  void state.ready.catch(() => undefined);
  return state;
}
function addGap(
  state: OwnerState,
  entries: number,
  bytes: number,
  reason: string,
) {
  state.gapEntries += Math.max(0, entries);
  state.gapBytes += Math.max(0, bytes);
  state.gapReason = reason;
}
function gapEntry(
  state: OwnerState,
  reason = state.gapReason || "retention",
  entries = state.gapEntries,
  bytes = state.gapBytes,
) {
  return projectFact({
    operation: "audit.gap",
    origin: "audit",
    owner: state.owner,
    attributes: { reason, droppedEntries: entries, droppedBytes: bytes },
  })!;
}
function remember(state: OwnerState, entries: readonly RuntimeLogEntry[]) {
  for (const entry of entries) state.recent.add(entry.id);
  while (state.recent.size > limits.pendingEntries * 2)
    state.recent.delete(state.recent.values().next().value!);
}
function safeAuditEntry(raw: unknown): RuntimeLogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as RuntimeLogEntry;
  const rule = operationPolicy(value.operation);
  const origin = value.component?.replace(/^pi-/, "") as Origin;
  if (
    !rule ||
    !rule.origins.includes(origin) ||
    !safeToken(value.id) ||
    !Number.isFinite(Date.parse(value.ts))
  )
    return null;
  const entry = normalizeRuntimeLogEntry(
    {
      level: value.level,
      scope: "system",
      stage: value.operation!,
      message: value.operation!,
      ts: value.ts,
      operation: value.operation,
      component: value.component,
      ...safeCorrelation(value),
      details: projectAttributes(value.details, [
        ...rule.attributes,
        "repeatCount",
      ]),
    },
    { id: value.id },
  );
  return byteLength(jsonLine(entry)) <= limits.entryBytes ? entry : null;
}
async function readAudit(
  path: string,
  maxBytes = limits.fileBytes,
): Promise<{ entries: RuntimeLogEntry[]; invalid: number }> {
  if (!(await runtimePathExists(path))) return { entries: [], invalid: 0 };
  const entries: RuntimeLogEntry[] = [];
  let invalid = 0;
  const stat = await statRuntimePathStrict(path);
  if (stat.size > maxBytes) invalid++;
  await scanRuntimeUtf8Lines({
    path,
    offset: Math.max(0, stat.size - maxBytes),
    length: Math.min(maxBytes, stat.size),
    onLine(line) {
      if (!line.text.endsWith("\n") || line.length > limits.entryBytes) {
        invalid++;
        return;
      }
      try {
        const entry = safeAuditEntry(JSON.parse(line.text));
        if (entry) {
          entries.push(entry);
          if (entries.length > limits.fileEntries * 2) {
            invalid += entries.length - limits.fileEntries;
            entries.splice(0, entries.length - limits.fileEntries);
          }
        } else invalid++;
      } catch {
        invalid++;
      }
    },
  });
  return { entries, invalid };
}
function structuralKey(entry: RuntimeLogEntry): string {
  const { id: _id, ts: _ts, ...shape } = entry;
  const details = { ...(shape.details as Record<string, unknown>) };
  delete details.repeatCount;
  return JSON.stringify({ ...shape, details });
}
function compactEntries(
  entries: readonly RuntimeLogEntry[],
  maxBytes: number,
  maxEntries: number,
) {
  const merged: RuntimeLogEntry[] = [];
  for (const entry of entries) {
    const last = merged.at(-1);
    if (last && structuralKey(last) === structuralKey(entry)) {
      merged[merged.length - 1] = {
        ...entry,
        details: {
          ...(entry.details as Record<string, JsonValue>),
          repeatCount:
            Number(
              (last.details as { repeatCount?: number })?.repeatCount || 1,
            ) +
            Number(
              (entry.details as { repeatCount?: number })?.repeatCount || 1,
            ),
        },
      };
    } else merged.push(entry);
  }
  let bytes = merged.reduce(
    (sum, entry) => sum + byteLength(jsonLine(entry)),
    0,
  );
  const removed = new Set<number>();
  const remove = (index: number) => {
    if (!removed.has(index)) {
      removed.add(index);
      bytes -= byteLength(jsonLine(merged[index]));
    }
  };
  const over = () =>
    bytes > maxBytes || merged.length - removed.size > maxEntries;
  for (const level of ["debug", "info"] as const) {
    for (let index = 0; index < merged.length && over(); index++)
      if (merged[index].level === level) remove(index);
  }
  const latest = new Set<string>();
  for (let index = merged.length - 1; index >= 0; index--) {
    const entry = merged[index];
    if (entry.level !== "warn" && entry.level !== "error") continue;
    const key = structuralKey(entry);
    if (latest.has(key) && over()) remove(index);
    else latest.add(key);
  }
  for (let index = 0; index < merged.length && over(); index++) remove(index);
  return {
    entries: merged.filter((_, index) => !removed.has(index)),
    dropped: entries.length - (merged.length - removed.size),
  };
}
async function replaceAudit(
  state: OwnerState,
  entries: readonly RuntimeLogEntry[],
) {
  await replaceRuntimeTextFileAtomically({
    targetPath: state.path,
    fragments: entries.map(jsonLine),
  });
  state.bytes = entries.reduce(
    (sum, entry) => sum + byteLength(jsonLine(entry)),
    0,
  );
  state.count = entries.length;
  state.loaded = true;
  state.recent.clear();
  remember(state, entries);
}
async function loadAudit(state: OwnerState) {
  const read = await readAudit(state.path);
  if (read.entries.length > limits.fileEntries) {
    read.invalid += read.entries.length - limits.fileEntries;
    read.entries.splice(0, read.entries.length - limits.fileEntries);
  }
  state.count = read.entries.length;
  state.bytes = read.entries.reduce(
    (sum, entry) => sum + byteLength(jsonLine(entry)),
    0,
  );
  remember(state, read.entries);
  if (read.invalid) {
    addGap(state, read.invalid, 0, "invalid_audit_record");
    await replaceAudit(state, read.entries);
  }
  state.loaded = true;
}
async function appendOwnerBatch(state: OwnerState, lines: readonly string[]) {
  await state.ready;
  if (!(await ownerAvailable(state))) return;
  await ensureRuntimeDirectoryStrict(state.workspace);
  await resolveRuntimePathIdentity({
    root: state.workspace,
    path: state.path,
    allowMissing: true,
  });
  if (!state.loaded) await loadAudit(state);
  let entries = lines
    .map((line) => safeAuditEntry(JSON.parse(line)))
    .filter(
      (entry): entry is RuntimeLogEntry =>
        !!entry && !state.recent.has(entry.id),
    );
  const capturedGapEntries = state.gapEntries;
  const capturedGapBytes = state.gapBytes;
  const capturedGapReason = state.gapReason;
  const gap = state.gapEntries || state.gapReason ? gapEntry(state) : undefined;
  if (gap) entries.unshift(gap);
  if (!entries.length) return;
  const bytes = entries.reduce(
    (sum, entry) => sum + byteLength(jsonLine(entry)),
    0,
  );
  const { withPiOwnerAuditQuota } = await import("./piTrustedNativeExecution");
  await withPiOwnerAuditQuota(
    {
      ownerRoot: state.ownerRoot,
      workspaceRoot: state.workspace,
      additionalBytes: bytes,
    },
    async () => {
      if (!(await ownerAvailable(state))) return;
      await ensureRuntimeDirectoryStrict(
        joinPath(state.workspace, "runtime-audit"),
      );
      if (
        state.bytes + bytes >= limits.fileBytes ||
        state.count + entries.length >= limits.fileEntries
      ) {
        const existing = await readAudit(state.path);
        const summary = gapEntry(
          state,
          "retention",
          existing.entries.length + entries.length,
          0,
        );
        const retained = compactEntries(
          [...existing.entries, ...entries],
          Math.floor(limits.fileBytes * 0.75) - byteLength(jsonLine(summary)),
          Math.floor(limits.fileEntries * 0.75) - 1,
        );
        summary.details = {
          reason: "retention",
          droppedEntries: retained.dropped,
          droppedBytes: Math.max(
            0,
            state.bytes +
              bytes -
              retained.entries.reduce(
                (sum, entry) => sum + byteLength(jsonLine(entry)),
                0,
              ),
          ),
        };
        entries = [...retained.entries, summary];
        await replaceAudit(state, entries);
      } else {
        await appendRuntimeTextFile(state.path, entries.map(jsonLine).join(""));
        state.bytes += bytes;
        state.count += entries.length;
        remember(state, entries);
      }
      state.gapEntries = Math.max(0, state.gapEntries - capturedGapEntries);
      state.gapBytes = Math.max(0, state.gapBytes - capturedGapBytes);
      if (
        !state.gapEntries &&
        !state.gapBytes &&
        state.gapReason === capturedGapReason
      )
        state.gapReason = undefined;
    },
  );
}
const makeQueue = () =>
  createRuntimeAuditAppendQueue({
    maxPendingEntries: limits.pendingEntries,
    maxPendingBytes: limits.pendingBytes,
    log(event) {
      const state = owners.get(event.owner);
      if (!state) return;
      if (event.kind === "overflow")
        addGap(
          state,
          event.droppedEntries,
          event.droppedBytes,
          "queue_overflow",
        );
      else {
        state.loaded = false;
        addGap(state, 0, 0, "audit_write_failed");
      }
    },
    async sink({ owner, lines }) {
      const state = owners.get(owner);
      if (state) await appendOwnerBatch(state, lines);
    },
  });
let queue = makeQueue();
let closed = false;

/** Bounded, nonblocking admission; diagnostics can never throw into execution. */
export function record(fact: PiRuntimeAuditFact): void {
  if (closed) return;
  try {
    const entry = projectFact(fact);
    if (!entry) return;
    if (!fact.owner) {
      appendRuntimeLog({ ...entry, error: undefined });
      return;
    }
    const state = stateFor(fact.owner, fact.root, fact.workspaceDir);
    if (state.stopped) return;
    const line = jsonLine(entry);
    if (byteLength(line) > limits.entryBytes) {
      addGap(state, 1, byteLength(line), "oversized_entry");
      return;
    }
    const pending = jobs.get(state.key) || new Set<Promise<void>>();
    jobs.set(state.key, pending);
    if (
      pending.size >= limits.pendingEntries ||
      state.pendingBytes + byteLength(line) > limits.pendingBytes
    ) {
      addGap(state, 1, byteLength(line), "admission_overflow");
      return;
    }
    state.pendingBytes += byteLength(line);
    const job = state.ready
      .then(() => {
        if (!state.stopped)
          queue.append({
            key: state.key,
            coordinatorOwner: state.key,
            owner: state.key,
            path: state.path,
            line,
          });
      })
      .catch(() => addGap(state, 1, byteLength(line), "owner_unavailable"));
    pending.add(job);
    void job.finally(() => {
      state.pendingBytes -= byteLength(line);
      pending.delete(job);
      if (!pending.size) jobs.delete(state.key);
    });
  } catch {
    /* Audit is never an owner outcome. */
  }
}
export async function flushOwner(
  owner: PiOwnerRef,
  root?: string,
): Promise<void> {
  try {
    const key = ownerKey(owner, root);
    await Promise.allSettled([...(jobs.get(key) || [])]);
    await queue.flush(key);
  } catch {
    /* The queue retains a bounded gap and retryable evidence. */
  }
}
/** Owner cleanup integration; not a product-facing action. */
export async function discardPiRuntimeAuditOwner(
  owner: PiOwnerRef,
  root?: string,
) {
  const key = ownerKey(owner, root);
  const state = owners.get(key);
  if (state) state.stopped = true;
  await Promise.allSettled([...(jobs.get(key) || [])]);
  await queue.discardAndWait(key);
  if (owners.get(key) === state) owners.delete(key);
}
/** Called under the existing Native owner quota lock; never acquires that lock. */
export async function reclaimPiRuntimeAudit(
  ownerRoot: string,
  workspaceRoot: string,
  requiredBytes: number,
): Promise<void> {
  const path = joinPath(workspaceRoot, "runtime-audit", "audit.ndjson");
  await resolveRuntimePathIdentity({
    root: workspaceRoot,
    path,
    allowMissing: true,
  });
  if (!(await runtimePathExists(path))) return;
  const read = await readAudit(path);
  let state = owners.get(ownerRoot);
  if (!state) {
    const first = read.entries.find(
      (entry) => entry.conversationId || entry.skillRunId,
    );
    if (!first) return;
    const owner: PiOwnerRef = first.conversationId
      ? { kind: "conversation", ownerId: first.conversationId }
      : { kind: "skill_run", ownerId: first.skillRunId! };
    // Reclamation also works after restart, without reconstructing execution.
    state = {
      owner,
      key: ownerRoot,
      ownerRoot,
      workspace: workspaceRoot,
      path,
      ready: Promise.resolve(),
      stopped: false,
      count: read.entries.length,
      bytes: 0,
      loaded: true,
      recent: new Set(),
      gapEntries: 0,
      gapBytes: 0,
      pendingBytes: 0,
    };
  }
  if (state.stopped) return;
  const before = read.entries.reduce(
    (sum, entry) => sum + byteLength(jsonLine(entry)),
    0,
  );
  const summary = gapEntry(state, "owner_quota", 0, requiredBytes);
  const retained = compactEntries(
    read.entries,
    Math.max(0, before - requiredBytes - byteLength(jsonLine(summary))),
    limits.fileEntries - 1,
  );
  summary.details = {
    reason: "owner_quota",
    droppedEntries: retained.dropped,
    droppedBytes:
      before -
      retained.entries.reduce(
        (sum, entry) => sum + byteLength(jsonLine(entry)),
        0,
      ),
  };
  await replaceAudit(
    state,
    retained.entries.length ? [...retained.entries, summary] : [],
  );
  if (!retained.entries.length)
    addGap(state, read.entries.length, before, "owner_quota");
}

function safeGlobalEntry(entry: RuntimeLogEntry): RuntimeLogEntry {
  const rule = operationPolicy(entry.operation);
  const origin = entry.component?.replace(/^pi-/, "") as Origin;
  const known = rule && rule.origins.includes(origin);
  return normalizeRuntimeLogEntry(
    {
      level: entry.level,
      scope: entry.scope,
      ts: entry.ts,
      stage: known ? entry.operation! : "runtime.diagnostic",
      message: known ? entry.operation! : "runtime.diagnostic",
      operation: known ? entry.operation : undefined,
      component: known ? entry.component : undefined,
      ...safeCorrelation(entry),
      details: known ? projectAttributes(entry.details, rule.attributes) : {},
      transport: entry.transport
        ? {
            status: entry.transport.status,
            duration: entry.transport.duration,
            retry: entry.transport.retry,
            size: entry.transport.size,
          }
        : undefined,
    },
    { id: safeToken(entry.id) || "runtime-log" },
  );
}
function hasOwnerCorrelation(entry: RuntimeLogEntry) {
  return !!(
    entry.conversationId ||
    entry.skillRunId ||
    entry.sessionId ||
    entry.turnId ||
    entry.invocationId ||
    entry.callId ||
    entry.failureId ||
    entry.requestId ||
    entry.jobId ||
    entry.runId ||
    entry.interactionId
  );
}
function failureProjection(entries: readonly PiTranscriptEntry[]) {
  return entries
    .filter((entry) => entry.kind === "failure_observed")
    .flatMap((entry) => {
      const value = entry.payload as Record<string, JsonValue>;
      const fields = [
        "failureId",
        "origin",
        "category",
        "code",
        "retryable",
        "effectCertainty",
      ];
      const projected = projectAttributes(value, fields);
      return projected.failureId && projected.code ? [projected] : [];
    });
}
async function canonicalDiagnostics(owner: PiOwnerRef, root?: string) {
  const path = piOwnerPaths(owner, root).log;
  const stat = await statRuntimePathStrict(path);
  let start = "";
  let lastSequence = 0;
  let incomplete = false;
  let workspace: string | undefined;
  const failures: Record<string, JsonValue>[] = [];
  const ids = new Set<string>([owner.ownerId]);
  let failureBytes = 0;
  await scanRuntimeUtf8Lines({
    path,
    length: stat.size,
    onLine(line) {
      try {
        if (!line.text.endsWith("\n")) {
          incomplete = true;
          return;
        }
        const value = JSON.parse(line.text);
        if (line.offset === 0) {
          start = value.createdAt;
          return;
        }
        if (!Number.isSafeInteger(value.seq) || value.seq !== lastSequence + 1)
          incomplete = true;
        lastSequence = value.seq;
        if (safeToken(value.turnId) && ids.size < limits.fileEntries)
          ids.add(value.turnId);
        if (
          value.kind === "skill_run_workspace" ||
          value.kind === "skill_run_prepared"
        ) {
          workspace =
            value.payload?.workspaceDir ||
            value.payload?.runtimeDir?.replace(/[\\/]\.acp$/, "");
        }
        if (value.kind === "failure_observed") {
          const projected = failureProjection([value]);
          if (!projected.length || !isPiFailureCode(value.payload?.code))
            incomplete = true;
          failureBytes += byteLength(JSON.stringify(projected));
          if (failureBytes > limits.exportBytes)
            throw new Error("pi_failure_budget_exceeded");
          failures.push(...projected);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "pi_failure_budget_exceeded"
        )
          throw error;
        incomplete = true;
      }
    },
  });
  if (!Number.isFinite(Date.parse(start))) incomplete = true;
  return { start, lastSequence, failures, ids, incomplete, workspace };
}
export async function exportDiagnostics(
  scope: PiDiagnosticScope,
  targetPath: string,
): Promise<PiDiagnosticExportResult> {
  let temporary: string | undefined;
  try {
    if (!targetPath || !["owner", "global"].includes(scope.kind))
      throw new Error("diagnostic_export_failed");
    record({
      operation: "diagnostics.export_started",
      origin: "audit",
      ...(scope.kind === "owner"
        ? { owner: scope.owner, root: scope.root }
        : {}),
    });
    let ownerEntries: RuntimeLogEntry[] = [];
    let globalEntries: RuntimeLogEntry[];
    let failures: Record<string, JsonValue>[] = [];
    let watermark: {
      auditId?: string;
      auditBytes?: number;
      transcriptSequence?: number;
    } = {};
    const gaps: Record<string, JsonValue>[] = [];
    if (scope.kind === "owner") {
      const state = stateFor(scope.owner, scope.root);
      await state.ready;
      await Promise.allSettled([...(jobs.get(state.key) || [])]);
      temporary = joinPath(
        getRuntimePersistencePaths(scope.root).tmpDir,
        `pi-diagnostics-${Date.now()}-${++sequence}`,
      );
      await ensureRuntimeDirectoryStrict(temporary);
      const snapshotPath = joinPath(temporary, "owner-audit.ndjson");
      const captured = await queue.barrier(state.key, async () => {
        if (!(await ownerAvailable(state)))
          throw new Error("pi_audit_owner_unavailable");
        await resolveRuntimePathIdentity({
          root: state.workspace,
          path: state.path,
          allowMissing: true,
        });
        const snapshot = snapshotRuntimeLogs();
        const capturedAt = new Date().toISOString();
        const canonical = await canonicalDiagnostics(scope.owner, scope.root);
        if (await runtimePathExists(state.path))
          await copyRuntimeFile({
            sourcePath: state.path,
            targetPath: snapshotPath,
          });
        return {
          snapshot,
          canonical,
          capturedAt,
          gapEntries: state.gapEntries,
          gapBytes: state.gapBytes,
          gapReason: state.gapReason,
        };
      });
      const audit = await readAudit(snapshotPath);
      ownerEntries = audit.entries;
      for (const entry of ownerEntries)
        if (entry.operation === "audit.gap")
          gaps.push(
            projectAttributes(entry.details, [
              "reason",
              "droppedEntries",
              "droppedBytes",
            ]),
          );
      failures = captured.canonical.failures;
      watermark = {
        auditId: ownerEntries.at(-1)?.id,
        auditBytes: ownerEntries.reduce(
          (sum, entry) => sum + byteLength(jsonLine(entry)),
          0,
        ),
        transcriptSequence: captured.canonical.lastSequence,
      };
      if (captured.gapEntries || captured.gapReason)
        gaps.push({
          reason: captured.gapReason || "audit_gap",
          droppedEntries: captured.gapEntries,
          droppedBytes: captured.gapBytes,
        });
      if (audit.invalid || captured.canonical.incomplete)
        gaps.push({ reason: "source_incomplete" });
      const start = captured.canonical.start;
      const end = captured.capturedAt;
      const ids = captured.canonical.ids;
      const ownerCorrelations = CORRELATIONS.filter(
        (key) => key !== "workflowId",
      );
      for (const entry of ownerEntries)
        for (const key of ownerCorrelations)
          if (entry[key]) ids.add(entry[key]!);
      globalEntries = captured.snapshot.entries
        .filter((entry) => {
          if (
            scope.owner.kind === "conversation"
              ? entry.skillRunId ||
                (entry.conversationId &&
                  entry.conversationId !== scope.owner.ownerId)
              : entry.conversationId ||
                (entry.skillRunId && entry.skillRunId !== scope.owner.ownerId)
          )
            return false;
          return (
            entry.ts >= start &&
            entry.ts <= end &&
            ownerCorrelations.some((key) => entry[key] && ids.has(entry[key]!))
          );
        })
        .map(safeGlobalEntry);
      if (captured.snapshot.droppedEntries)
        gaps.push({
          reason: "runtime_log_retention",
          droppedEntries: captured.snapshot.droppedEntries,
        });
    } else {
      const snapshot = snapshotRuntimeLogs();
      globalEntries = snapshot.entries
        .filter((entry) => !hasOwnerCorrelation(entry))
        .map(safeGlobalEntry);
      if (snapshot.droppedEntries)
        gaps.push({
          reason: "runtime_log_retention",
          droppedEntries: snapshot.droppedEntries,
        });
    }
    const gapSummary = new Map<string, Record<string, JsonValue>>();
    for (const gap of gaps) {
      const reason = String(gap.reason || "audit_gap");
      const prior = gapSummary.get(reason) || {
        reason,
        droppedEntries: 0,
        droppedBytes: 0,
      };
      prior.droppedEntries =
        Number(prior.droppedEntries) + Number(gap.droppedEntries || 0);
      prior.droppedBytes =
        Number(prior.droppedBytes) + Number(gap.droppedBytes || 0);
      gapSummary.set(reason, prior);
    }
    gaps.splice(0, gaps.length, ...gapSummary.values());
    const manifest = {
      schemaVersion: "pi-runtime-diagnostics/v1",
      generatedAt: new Date().toISOString(),
      scope:
        scope.kind === "owner"
          ? {
              kind: "owner",
              owner: { kind: scope.owner.kind, ownerId: scope.owner.ownerId },
            }
          : { kind: "global" },
      complete: gaps.length === 0,
      watermark,
      gaps,
      trimmedGlobalEntries: 0,
      trimmedOwnerEntries: 0,
    };
    const diagnostics = () =>
      JSON.stringify({
        schemaVersion: "pi-runtime-diagnostics/v1",
        failures,
        gaps,
        entries: globalEntries,
      });
    const total = () =>
      byteLength(JSON.stringify(manifest)) +
      byteLength(diagnostics()) +
      ownerEntries.reduce((sum, entry) => sum + byteLength(jsonLine(entry)), 0);
    if (total() > limits.exportBytes) {
      manifest.complete = false;
      const fixed =
        byteLength(JSON.stringify(manifest)) +
        byteLength(
          JSON.stringify({
            schemaVersion: "pi-runtime-diagnostics/v1",
            failures,
            gaps,
            entries: [],
          }),
        );
      const ownerBytes = ownerEntries.reduce(
        (sum, entry) => sum + byteLength(jsonLine(entry)),
        0,
      );
      const keptGlobal = compactEntries(
        globalEntries,
        Math.max(0, limits.exportBytes - fixed - ownerBytes - 256),
        globalEntries.length,
      );
      manifest.trimmedGlobalEntries =
        globalEntries.length - keptGlobal.entries.length;
      globalEntries = keptGlobal.entries;
      const keptOwner = compactEntries(
        ownerEntries,
        Math.max(
          0,
          limits.exportBytes -
            byteLength(JSON.stringify(manifest)) -
            byteLength(diagnostics()) -
            256,
        ),
        ownerEntries.length,
      );
      manifest.trimmedOwnerEntries =
        ownerEntries.length - keptOwner.entries.length;
      ownerEntries = keptOwner.entries;
    }
    if (total() > limits.exportBytes)
      throw new Error("diagnostic_export_failed");
    const entries = [
      {
        name: "manifest.json",
        content: { kind: "text" as const, text: JSON.stringify(manifest) },
      },
      {
        name: "runtime-diagnostics.json",
        content: { kind: "text" as const, text: diagnostics() },
      },
      ...(scope.kind === "owner"
        ? [
            {
              name: "owner-audit.ndjson",
              content: {
                kind: "text" as const,
                text: ownerEntries.map(jsonLine).join(""),
              },
            },
          ]
        : []),
    ];
    await createWorkflowArchiveApi().writeZipAtomic({ targetPath, entries });
    record({
      operation: "diagnostics.export_terminal",
      origin: "audit",
      ...(scope.kind === "owner"
        ? { owner: scope.owner, root: scope.root }
        : {}),
      attributes: { status: "completed", bytes: total() },
    });
    return { status: "exported", bytes: total(), complete: manifest.complete };
  } catch {
    record({
      operation: "diagnostics.export_terminal",
      origin: "audit",
      ...(scope.kind === "owner"
        ? { owner: scope.owner, root: scope.root }
        : {}),
      attributes: { status: "failed", reason: "diagnostic_export_failed" },
    });
    return { status: "failed", code: "diagnostic_export_failed" };
  } finally {
    if (temporary) await removeRuntimePath(temporary).catch(() => false);
  }
}

export async function resetPiRuntimeAuditForTests(
  overrides: Partial<typeof LIMITS> = {},
) {
  await Promise.allSettled([...jobs.values()].flatMap((set) => [...set]));
  await queue.flushAndDiscardAll();
  owners.clear();
  jobs.clear();
  limits = { ...LIMITS, ...overrides };
  queue = makeQueue();
  closed = false;
}

export async function shutdownPiRuntimeAudit(deadline: number) {
  closed = true;
  const { waitForPiShutdown } = await import("./piRuntimeLifecycle");
  const drain = (async () => {
    await Promise.allSettled([...jobs.values()].flatMap((set) => [...set]));
    await queue.flushAndDiscardAll();
  })();
  try {
    await waitForPiShutdown(drain, deadline);
  } finally {
    for (const state of owners.values()) state.stopped = true;
    queue.discardAll();
  }
}
