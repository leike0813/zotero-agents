import type { BackendInstance } from "../backends/types";
import { joinPath } from "../utils/path";
import {
  formatRuntimeLogsAsNDJSON,
  listRuntimeLogs,
} from "./runtimeLogManager";
import {
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import type { SessionNotification } from "./acpProtocol";
import type { AcpSkillRunEvent, AcpSkillRunRecord } from "./acpSkillRunStore";
import type { AcpDiagnosticsEntry } from "./acpTypes";
import type { AcpSkillRunnerWorkspace } from "./acpSkillRunnerWorkspace";

export const ACP_RUN_AUDIT_SCHEMA = "zotero-skills.acp.run-audit.v1";
export const ACP_TIMELINE_EVENT_SCHEMA = "zotero-skills.acp.timeline-event.v1";
export const ACP_UPDATE_SUMMARY_SCHEMA = "zotero-skills.acp.update-summary.v1";
export const ACP_FINAL_STATE_SCHEMA = "zotero-skills.acp.final-state.v1";

const REDACTED = "<redacted>";
const MAX_STRING_LENGTH = 4000;
const MAX_PROMPT_LENGTH = 64 * 1024;
const MAX_STDERR_LENGTH = 64 * 1024;
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 200;
const SENSITIVE_KEY_PATTERN =
  /(authorization|token|secret|password|api[-_]?key|cookie|bearer)/i;
const appendQueuesByPath = new Map<string, Promise<void>>();

type AuditTrailFiles = Record<
  | "readme"
  | "run"
  | "timeline"
  | "acpUpdates"
  | "stderr"
  | "runtimeLogs"
  | "prompt"
  | "finalState",
  string
>;

export type AcpSkillRunAuditTrailState = {
  initialized: boolean;
  files: Record<string, string>;
  lastError?: string;
};

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function safeIso(value?: unknown) {
  const normalized = normalizeString(value);
  return normalized || new Date().toISOString();
}

function auditFiles(runtimeDir: string): AuditTrailFiles {
  return {
    readme: joinPath(runtimeDir, "README.md"),
    run: joinPath(runtimeDir, "run.json"),
    timeline: joinPath(runtimeDir, "timeline.ndjson"),
    acpUpdates: joinPath(runtimeDir, "acp-updates.ndjson"),
    stderr: joinPath(runtimeDir, "stderr.log"),
    runtimeLogs: joinPath(runtimeDir, "runtime-logs.ndjson"),
    prompt: joinPath(runtimeDir, "prompt.md"),
    finalState: joinPath(runtimeDir, "final-state.json"),
  };
}

function publicFiles(files: AuditTrailFiles): Record<string, string> {
  return { ...files };
}

export function resolveAcpSkillRunAuditTrailFiles(runtimeDir: string) {
  return publicFiles(auditFiles(runtimeDir));
}

function truncateString(value: string, limit = MAX_STRING_LENGTH) {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}...<truncated>`;
}

function sanitizeString(value: string) {
  return truncateString(
    value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, `$1${REDACTED}`)
      .replace(/(token\s*[:=]\s*)([^\s,;]+)/gi, `$1${REDACTED}`)
      .replace(/(api[-_]?key\s*[:=]\s*)([^\s,;]+)/gi, `$1${REDACTED}`)
      .replace(/(password\s*[:=]\s*)([^\s,;]+)/gi, `$1${REDACTED}`)
      .replace(/(cookie\s*[:=]\s*)([^\n\r]+)/gi, `$1${REDACTED}`),
  );
}

function sanitizeValue(
  value: unknown,
  key?: string,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }
  if (value === null || typeof value === "undefined") {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  if (typeof value !== "object") {
    return sanitizeString(String(value));
  }
  if (depth >= MAX_DEPTH) {
    return "[max-depth]";
  }
  if (seen.has(value)) {
    return "[circular]";
  }
  seen.add(value);
  if (Array.isArray(value)) {
    const normalized = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((entry) => sanitizeValue(entry, undefined, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      normalized.push(`[... ${value.length - MAX_ARRAY_ITEMS} more items]`);
    }
    return normalized;
  }
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const keys = Object.keys(source);
  for (const entryKey of keys.slice(0, MAX_OBJECT_KEYS)) {
    result[entryKey] = sanitizeValue(
      source[entryKey],
      entryKey,
      depth + 1,
      seen,
    );
  }
  if (keys.length > MAX_OBJECT_KEYS) {
    result.__truncated_keys__ = keys.length - MAX_OBJECT_KEYS;
  }
  return result;
}

function jsonLine(value: unknown) {
  return `${JSON.stringify(sanitizeValue(value))}\n`;
}

async function appendRuntimeTextFile(path: string, line: string) {
  const previous = appendQueuesByPath.get(path) || Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const existing = await readRuntimeTextFile(path);
      await writeRuntimeTextFile(path, `${existing || ""}${line}`);
    });
  appendQueuesByPath.set(path, next);
  try {
    await next;
  } finally {
    if (appendQueuesByPath.get(path) === next) {
      appendQueuesByPath.delete(path);
    }
  }
}

export async function flushAcpSkillRunAuditTrailWritesForTests() {
  await Promise.allSettled(Array.from(appendQueuesByPath.values()));
}

function toAuditError(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown");
}

function recordAuditFailure(args: {
  requestId: string;
  stage: string;
  error: unknown;
}) {
  void import("./runtimeLogManager").then(({ appendRuntimeLog }) => {
    appendRuntimeLog({
      level: "warn",
      scope: "provider",
      providerId: "acp",
      requestId: args.requestId,
      component: "acp-skill-run-audit-trail",
      operation: "write",
      stage: args.stage,
      message: "ACP skill run audit trail write failed.",
      error: args.error,
    });
  });
}

async function bestEffort(args: {
  requestId: string;
  stage: string;
  run: () => Promise<void>;
}) {
  try {
    await args.run();
  } catch (error) {
    recordAuditFailure({
      requestId: args.requestId,
      stage: args.stage,
      error,
    });
  }
}

function renderReadme() {
  return [
    "# ACP run audit",
    "",
    "This directory contains developer-facing diagnostics for this ACP skill run.",
    "It is not the result directory and does not replace `.audit` input manifests.",
    "",
    "Files:",
    "",
    "- `run.json`: run metadata and path index.",
    "- `timeline.ndjson`: lifecycle events, diagnostics, permissions, and workspace activity.",
    "- `acp-updates.ndjson`: sanitized ACP session/update summaries.",
    "- `stderr.log`: truncated ACP backend stderr tail.",
    "- `runtime-logs.ndjson`: sanitized runtime logs filtered by request id.",
    "- `prompt.md`: sanitized prompt sent to the ACP backend.",
    "- `final-state.json`: terminal or detached state summary.",
    "",
    "Sensitive values such as tokens, cookies, passwords, API keys, and authorization headers are redacted best-effort.",
    "",
  ].join("\n");
}

function buildRunSnapshot(args: {
  workspace: AcpSkillRunnerWorkspace;
  backend: BackendInstance;
  request: unknown;
  providerOptions?: Record<string, unknown>;
  status?: string;
}) {
  return {
    schema: ACP_RUN_AUDIT_SCHEMA,
    generatedAt: new Date().toISOString(),
    requestId: args.workspace.requestId,
    status: args.status || "queued",
    backend: {
      id: args.backend.id,
      type: args.backend.type,
      displayName: args.backend.displayName,
      command: args.backend.command,
      args: args.backend.args,
      agentFamily: args.backend.acp?.agentFamily,
    },
    request: {
      kind:
        args.request && typeof args.request === "object"
          ? (args.request as Record<string, unknown>).kind
          : undefined,
      skillId:
        args.request && typeof args.request === "object"
          ? (args.request as Record<string, unknown>).skill_id
          : undefined,
      taskName:
        args.request && typeof args.request === "object"
          ? (args.request as Record<string, unknown>).taskName
          : undefined,
    },
    providerOptions: args.providerOptions || {},
    paths: {
      workspaceDir: args.workspace.workspaceDir,
      runtimeDir: args.workspace.runtimeDir,
      resultDir: args.workspace.resultDir,
      resultJsonPath: args.workspace.resultJsonPath,
      auditDir: args.workspace.auditDir,
      inputManifestPath: args.workspace.inputManifestPath,
    },
    files: auditFiles(args.workspace.runtimeDir),
  };
}

export async function initializeAcpSkillRunAuditTrail(args: {
  workspace: AcpSkillRunnerWorkspace;
  backend: BackendInstance;
  request: unknown;
  providerOptions?: Record<string, unknown>;
}): Promise<AcpSkillRunAuditTrailState> {
  const files = auditFiles(args.workspace.runtimeDir);
  try {
    await writeRuntimeTextFile(files.readme, renderReadme());
    await writeRuntimeTextFile(
      files.run,
      `${JSON.stringify(
        sanitizeValue(
          buildRunSnapshot({
            workspace: args.workspace,
            backend: args.backend,
            request: args.request,
            providerOptions: args.providerOptions,
          }),
        ),
        null,
        2,
      )}\n`,
    );
    return { initialized: true, files: publicFiles(files) };
  } catch (error) {
    recordAuditFailure({
      requestId: args.workspace.requestId,
      stage: "audit-initialize-failed",
      error,
    });
    return {
      initialized: false,
      files: publicFiles(files),
      lastError: toAuditError(error),
    };
  }
}

export function appendAcpSkillRunAuditEvent(args: {
  requestId: string;
  runtimeDir?: string;
  event: AcpSkillRunEvent;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-append-event-failed",
    run: async () => {
      const files = auditFiles(runtimeDir);
      await appendRuntimeTextFile(
        files.timeline,
        jsonLine({
          schema: ACP_TIMELINE_EVENT_SCHEMA,
          source: "run-event",
          requestId: args.requestId,
          ts: safeIso(args.event.ts),
          stage: args.event.stage,
          level: args.event.level || "info",
          message: args.event.message,
          details: args.event.details,
        }),
      );
    },
  });
}

export function appendAcpSkillRunAuditDiagnostic(args: {
  requestId: string;
  runtimeDir?: string;
  entry: AcpDiagnosticsEntry;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-append-diagnostic-failed",
    run: async () => {
      await appendRuntimeTextFile(
        auditFiles(runtimeDir).timeline,
        jsonLine({
          schema: ACP_TIMELINE_EVENT_SCHEMA,
          source: "acp-diagnostic",
          requestId: args.requestId,
          ts: safeIso(args.entry.ts),
          stage: args.entry.stage || args.entry.kind || "diagnostic",
          level: args.entry.level || "info",
          message: args.entry.message,
          detail: args.entry.detail,
          errorName: args.entry.errorName,
          code: args.entry.code,
        }),
      );
    },
  });
}

function previewText(value: unknown, limit = 500) {
  const text = normalizeString(value);
  return {
    length: text.length,
    preview: text ? truncateString(sanitizeString(text), limit) : "",
  };
}

function summarizeAcpUpdate(event: SessionNotification) {
  const update = event.update || { sessionUpdate: "" };
  const kind = normalizeString(update.sessionUpdate) || "unknown";
  const base: Record<string, unknown> = {
    schema: ACP_UPDATE_SUMMARY_SCHEMA,
    requestSessionId: event.sessionId,
    updateKind: kind,
  };
  if (
    kind === "agent_message_chunk" ||
    kind === "user_message_chunk" ||
    kind === "agent_thought_chunk"
  ) {
    const content = (update as { content?: { type?: unknown; text?: unknown } })
      .content;
    return {
      ...base,
      contentType: normalizeString(content?.type),
      text: previewText(content?.text),
    };
  }
  if (kind === "tool_call" || kind === "tool_call_update") {
    const tool = update as Record<string, unknown>;
    return {
      ...base,
      toolCallId: tool.toolCallId,
      title: tool.title,
      status: tool.status,
      kind: tool.kind,
      name: tool.name || tool.tool || tool.functionName || tool.function_name,
      summary: tool.summary,
      input: previewText(
        tool.rawInput || tool.input || tool.arguments || tool.args,
      ),
      output: previewText(
        tool.rawOutput || tool.output || tool.result || tool.content,
      ),
    };
  }
  if (kind === "plan") {
    const entries = Array.isArray((update as { entries?: unknown }).entries)
      ? (update as { entries?: unknown[] }).entries || []
      : [];
    return {
      ...base,
      entries: entries.slice(0, 20).map((entry) => sanitizeValue(entry)),
      truncatedEntries: Math.max(0, entries.length - 20),
    };
  }
  if (kind === "usage_update") {
    return {
      ...base,
      used: (update as { used?: unknown }).used,
      size: (update as { size?: unknown }).size,
    };
  }
  return {
    ...base,
    update: sanitizeValue(update),
  };
}

export function appendAcpSkillRunAuditUpdate(args: {
  requestId: string;
  runtimeDir?: string;
  event: SessionNotification;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-append-update-failed",
    run: async () => {
      await appendRuntimeTextFile(
        auditFiles(runtimeDir).acpUpdates,
        jsonLine({
          ...summarizeAcpUpdate(args.event),
          requestId: args.requestId,
          ts: new Date().toISOString(),
        }),
      );
    },
  });
}

export function writeAcpSkillRunAuditPrompt(args: {
  requestId: string;
  runtimeDir?: string;
  prompt: string;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-write-prompt-failed",
    run: async () => {
      await writeRuntimeTextFile(
        auditFiles(runtimeDir).prompt,
        truncateString(sanitizeString(args.prompt), MAX_PROMPT_LENGTH),
      );
    },
  });
}

export function writeAcpSkillRunAuditStderrTail(args: {
  requestId: string;
  runtimeDir?: string;
  stderrText?: string;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-write-stderr-failed",
    run: async () => {
      await writeRuntimeTextFile(
        auditFiles(runtimeDir).stderr,
        truncateString(
          sanitizeString(args.stderrText || ""),
          MAX_STDERR_LENGTH,
        ),
      );
    },
  });
}

export function writeAcpSkillRunAuditRuntimeLogs(args: {
  requestId: string;
  runtimeDir?: string;
}) {
  const runtimeDir = normalizeString(args.runtimeDir);
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-write-runtime-logs-failed",
    run: async () => {
      const logs = listRuntimeLogs({
        requestId: args.requestId,
        order: "asc",
        limit: 500,
      });
      await writeRuntimeTextFile(
        auditFiles(runtimeDir).runtimeLogs,
        formatRuntimeLogsAsNDJSON(logs),
      );
    },
  });
}

export function writeAcpSkillRunAuditFinalState(args: {
  record?: AcpSkillRunRecord | null;
  requestId: string;
  runtimeDir?: string;
  status?: string;
  error?: string;
  stderrText?: string;
}) {
  const runtimeDir = normalizeString(
    args.runtimeDir || args.record?.runtimeDir,
  );
  if (!runtimeDir) {
    return Promise.resolve();
  }
  return bestEffort({
    requestId: args.requestId,
    stage: "audit-write-final-state-failed",
    run: async () => {
      const record = args.record;
      await writeRuntimeTextFile(
        auditFiles(runtimeDir).finalState,
        `${JSON.stringify(
          sanitizeValue({
            schema: ACP_FINAL_STATE_SCHEMA,
            generatedAt: new Date().toISOString(),
            requestId: args.requestId,
            status: args.status || record?.status,
            backendStatus: record?.backendStatus,
            sessionId: record?.sessionId,
            conversationState: record?.conversationState,
            conversationRecoveryState: record?.conversationRecoveryState,
            validationStatus: record?.validationStatus,
            validationErrors: record?.validationErrors,
            repairRounds: record?.repairRounds,
            resultJsonPath: record?.resultJsonPath,
            inputManifestPath: record?.inputManifestPath,
            lastPromptStopReason: record?.lastPromptStopReason,
            error: args.error || record?.error,
            stderr: previewText(args.stderrText || ""),
            updatedAt: record?.updatedAt,
          }),
          null,
          2,
        )}\n`,
      );
    },
  });
}
