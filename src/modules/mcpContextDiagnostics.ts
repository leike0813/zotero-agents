import type { BackendInstance } from "../backends/types";
import type { AcpDiagnosticsEntry } from "./acpTypes";
import {
  getAcpSkillRunRecord,
  type AcpSkillRunEvent,
  type AcpSkillRunTranscriptItem,
} from "./acpSkillRunStore";
import {
  listRuntimeLogs,
  type RuntimeLogEntry,
} from "./runtimeLogManager";
import {
  readRuntimeTextFile,
  writeRuntimeTextFile,
} from "./runtimePersistence";
import { joinPath } from "../utils/path";

export type McpContextDiagnosticClassification =
  | "host_mcp_preflight_failed"
  | "descriptor_not_injected"
  | "backend_mcp_discovery_failed"
  | "backend_mcp_tools_absent"
  | "backend_mcp_tool_call_failed_transport"
  | "model_ignored_available_tools"
  | "smoke_timeout_unclassified";

export type McpContextEvidenceKind =
  | "adapter_diagnostic"
  | "run_event"
  | "transcript"
  | "runtime_log"
  | "provider_debug"
  | "provider_session";

export type McpContextEvidenceEvent = {
  kind: McpContextEvidenceKind;
  ts?: string;
  source: string;
  message: string;
  detail?: string;
  tags: string[];
};

export type McpContextInjectionDiagnostics = {
  schema_id: "mcp.context_injection_diagnostics";
  schema_version: "1.0.0";
  generated_at: string;
  backendId: string;
  backendType: string;
  providerId: string;
  agentFamily: string;
  requestId: string;
  sessionId: string;
  workspaceDir: string;
  mcpDescriptor: {
    injected: boolean;
    name?: string;
    type?: string;
    url?: string;
    headers?: Array<{ name: string; value: string }>;
    stages: string[];
  };
  backendCapability: {
    canUseHttpMcp?: boolean;
    canUseSseMcp?: boolean;
    canUseSdkMcp?: boolean;
  };
  hostPreflight: {
    requiredTools: string[];
    availableTools: string[];
    missingTools: string[];
    ok: boolean;
  };
  callableSmoke: {
    reachedTools: string[];
    missingTools: string[];
    timeoutMs: number;
    ok: boolean;
  };
  observedToolEvents: McpContextEvidenceEvent[];
  classification: McpContextDiagnosticClassification;
  confidence: number;
  evidence: McpContextEvidenceEvent[];
  nextSuggestedProbe: string;
};

export type McpContextDiagnosticsWriteResult = {
  diagnostics: McpContextInjectionDiagnostics;
  diagnosticFile: string;
  evidenceFile: string;
};

type SmokeResultLike = {
  ok: boolean;
  reachedTools?: string[];
  missingTools?: string[];
  message?: string;
};

type PreflightResultLike = {
  ok: boolean;
  availableTools?: string[];
  missingTools?: string[];
};

const REDACTED = "<redacted>";
const MAX_EVIDENCE_EVENTS = 120;
const MAX_DEBUG_LINES = 80;

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nowIso() {
  return new Date().toISOString();
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => normalizeString(value)).filter(Boolean)),
  );
}

function byteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

export function redactMcpDiagnosticValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
      .replace(/("authorization"\s*:\s*")[^"]+(")/gi, `$1${REDACTED}$2`)
      .replace(/(authorization\s*[:=]\s*)[^\s,;]+/gi, `$1${REDACTED}`)
      .replace(/(token\s*[:=]\s*)[A-Za-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
      .replace(/([?&]token=)[^&\s]+/gi, `$1${REDACTED}`);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactMcpDiagnosticValue(entry));
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (/authorization|token|secret|api[_-]?key/i.test(key)) {
        next[key] = REDACTED;
      } else {
        next[key] = redactMcpDiagnosticValue(entry);
      }
    }
    return next;
  }
  return value;
}

function safeJsonString(value: unknown, fallback = "") {
  try {
    return JSON.stringify(redactMcpDiagnosticValue(value));
  } catch {
    return fallback;
  }
}

function evidenceEvent(args: {
  kind: McpContextEvidenceKind;
  source: string;
  message: string;
  detail?: unknown;
  ts?: string;
  tags?: string[];
}): McpContextEvidenceEvent {
  return {
    kind: args.kind,
    source: args.source,
    message: normalizeString(redactMcpDiagnosticValue(args.message)),
    detail:
      args.detail === undefined
        ? undefined
        : normalizeString(
            typeof args.detail === "string"
              ? redactMcpDiagnosticValue(args.detail)
              : safeJsonString(args.detail),
          ),
    ts: normalizeString(args.ts) || undefined,
    tags: uniqueStrings(args.tags || []),
  };
}

function parseDetailJson(detail: unknown): Record<string, unknown> | null {
  const text = normalizeString(detail);
  if (!text) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function classifyText(textRaw: string) {
  const text = normalizeString(textRaw).toLowerCase();
  const tags: string[] = [];
  if (text.includes("failed to fetch tools") || text.includes("tools/list")) {
    tags.push("backend_tool_discovery");
  }
  if (text.includes("terminated") || text.includes("connection dropped")) {
    tags.push("transport_terminated");
  }
  if (text.includes("no such tool available")) {
    tags.push("tool_absent");
  }
  if (text.includes("counttooldefinitiontokens") || text.includes("mcp__zotero__")) {
    tags.push("tool_definition_visible");
  }
  if (text.includes("executepretoolhooks") || text.includes("calling mcp tool")) {
    tags.push("tool_call_observed");
  }
  if (text.includes("fetch failed") || text.includes("connection error")) {
    tags.push("tool_call_transport_failure");
  }
  if (text.includes("mcp_server_injected") || text.includes("injected embedded zotero mcp")) {
    tags.push("descriptor_injected");
  }
  return tags;
}

function eventToEvidence(event: AcpSkillRunEvent) {
  const tags = [
    ...classifyText(`${event.stage} ${event.message}`),
    ...classifyText(safeJsonString(event.details)),
  ];
  return evidenceEvent({
    kind: "run_event",
    source: event.stage,
    ts: event.ts,
    message: event.message,
    detail: event.details,
    tags,
  });
}

function transcriptToEvidence(item: AcpSkillRunTranscriptItem) {
  const detail = safeJsonString(item);
  const message =
    item.kind === "tool_call"
      ? `${item.toolName || item.title || "tool"} ${item.state}`
      : item.kind === "message" || item.kind === "thought"
        ? item.text
        : item.kind === "status"
          ? item.text
          : item.summary;
  return evidenceEvent({
    kind: "transcript",
    source: item.kind,
    ts: item.createdAt,
    message,
    detail,
    tags: classifyText(`${message} ${detail}`),
  });
}

function runtimeLogToEvidence(entry: RuntimeLogEntry) {
  return evidenceEvent({
    kind: "runtime_log",
    source: `${entry.component || "runtime"}:${entry.stage}`,
    ts: entry.ts,
    message: entry.message,
    detail: {
      transport: entry.transport,
      details: entry.details,
      error: entry.error,
    },
    tags: classifyText(
      `${entry.stage} ${entry.message} ${safeJsonString(entry.details)} ${safeJsonString(entry.error)}`,
    ),
  });
}

function adapterDiagnosticToEvidence(entry: AcpDiagnosticsEntry) {
  return evidenceEvent({
    kind: "adapter_diagnostic",
    source: entry.kind,
    ts: entry.ts,
    message: entry.message,
    detail: {
      detail: entry.detail,
      stage: entry.stage,
      errorName: entry.errorName,
      code: entry.code,
      data: entry.data,
    },
    tags: classifyText(
      `${entry.kind} ${entry.message} ${entry.detail} ${safeJsonString(entry.data)}`,
    ),
  });
}

function getEnvValue(name: string) {
  const runtime = globalThis as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return normalizeString(runtime.process?.env?.[name]);
}

function encodeClaudeProjectPath(cwd: string) {
  return normalizeString(cwd).replace(/[^a-zA-Z0-9]/g, "-");
}

function getClaudeConfigDir() {
  const configured = getEnvValue("CLAUDE_CONFIG_DIR");
  if (configured) {
    return configured;
  }
  const home = getEnvValue("USERPROFILE") || getEnvValue("HOME");
  return home ? joinPath(home, ".claude") : "";
}

async function readTextIfAvailable(path: string): Promise<string> {
  if (!path) {
    return "";
  }
  try {
    return String(await readRuntimeTextFile(path));
  } catch {
    return "";
  }
}

async function collectClaudeCodeEvidence(args: {
  sessionId: string;
  workspaceDir: string;
}) {
  const configDir = getClaudeConfigDir();
  if (!configDir || !args.sessionId) {
    return [] as McpContextEvidenceEvent[];
  }
  const evidence: McpContextEvidenceEvent[] = [];
  const debugPath = joinPath(configDir, "debug", `${args.sessionId}.txt`);
  const debugText = await readTextIfAvailable(debugPath);
  const debugLines = debugText
    .split(/\r?\n/g)
    .filter((line) =>
      /MCP server "zotero"|mcp__zotero|No such tool available|Failed to fetch tools|countToolDefinitionTokens|executePreToolHooks/i.test(
        line,
      ),
    )
    .slice(0, MAX_DEBUG_LINES);
  for (const line of debugLines) {
    evidence.push(
      evidenceEvent({
        kind: "provider_debug",
        source: debugPath,
        message: line,
        tags: classifyText(line),
      }),
    );
  }

  const sessionPath = joinPath(
    configDir,
    "projects",
    encodeClaudeProjectPath(args.workspaceDir),
    `${args.sessionId}.jsonl`,
  );
  const sessionText = await readTextIfAvailable(sessionPath);
  const sessionLines = sessionText
    .split(/\r?\n/g)
    .filter((line) => /mcp__zotero|No such tool available|Failed to fetch tools/i.test(line))
    .slice(0, MAX_DEBUG_LINES);
  for (const line of sessionLines) {
    evidence.push(
      evidenceEvent({
        kind: "provider_session",
        source: sessionPath,
        message: line,
        tags: classifyText(line),
      }),
    );
  }
  return evidence;
}

function parseInjectedDescriptor(events: McpContextEvidenceEvent[]) {
  const descriptorEvents = events.filter((event) =>
    event.tags.includes("descriptor_injected"),
  );
  const stages = uniqueStrings(descriptorEvents.map((event) => event.source));
  const latest = descriptorEvents[descriptorEvents.length - 1];
  const parsed = parseDetailJson(latest?.detail);
  const headersRaw = Array.isArray(parsed?.headers) ? parsed.headers : [];
  return {
    injected: descriptorEvents.length > 0,
    name: normalizeString(parsed?.name) || undefined,
    type: normalizeString(parsed?.type) || undefined,
    url: normalizeString(parsed?.url) || undefined,
    headers: headersRaw
      .map((entry) =>
        entry && typeof entry === "object"
          ? {
              name: normalizeString((entry as Record<string, unknown>).name),
              value: normalizeString((entry as Record<string, unknown>).value) || REDACTED,
            }
          : null,
      )
      .filter(Boolean) as Array<{ name: string; value: string }>,
    stages,
  };
}

function chooseClassification(args: {
  preflight: PreflightResultLike;
  smoke: SmokeResultLike;
  descriptorInjected: boolean;
  evidence: McpContextEvidenceEvent[];
}) {
  const hasTag = (tag: string) =>
    args.evidence.some((event) => event.tags.includes(tag));
  if (!args.preflight.ok || (args.preflight.missingTools || []).length > 0) {
    return {
      classification: "host_mcp_preflight_failed" as const,
      confidence: 0.95,
      nextSuggestedProbe: "Fix host-side Zotero MCP tools/list before starting an ACP session.",
    };
  }
  if (!args.descriptorInjected) {
    return {
      classification: "descriptor_not_injected" as const,
      confidence: 0.85,
      nextSuggestedProbe: "Inspect ACP session creation and MCP descriptor injection diagnostics.",
    };
  }
  if (hasTag("backend_tool_discovery") && hasTag("transport_terminated")) {
    return {
      classification: "backend_mcp_discovery_failed" as const,
      confidence: 0.95,
      nextSuggestedProbe: "Inspect backend MCP discovery logs and Zotero MCP HTTP transport response/write diagnostics.",
    };
  }
  if (hasTag("tool_absent")) {
    return {
      classification: "backend_mcp_tools_absent" as const,
      confidence: 0.9,
      nextSuggestedProbe: "Inspect backend tool registration and model context construction for the injected MCP server.",
    };
  }
  if (hasTag("tool_call_transport_failure")) {
    return {
      classification: "backend_mcp_tool_call_failed_transport" as const,
      confidence: 0.85,
      nextSuggestedProbe: "Inspect per-call MCP HTTP request failures and Zotero server lifecycle.",
    };
  }
  if (hasTag("tool_definition_visible") && (args.smoke.reachedTools || []).length === 0) {
    return {
      classification: "model_ignored_available_tools" as const,
      confidence: 0.75,
      nextSuggestedProbe: "Inspect callable smoke prompt compliance and tool-use permissions.",
    };
  }
  return {
    classification: "smoke_timeout_unclassified" as const,
    confidence: 0.5,
    nextSuggestedProbe: "Collect backend debug logs for MCP discovery and tool-call availability.",
  };
}

function diagnosticsJsonText(value: unknown) {
  return `${JSON.stringify(redactMcpDiagnosticValue(value), null, 2)}\n`;
}

function evidenceLogText(events: McpContextEvidenceEvent[]) {
  return events
    .map((event) => JSON.stringify(redactMcpDiagnosticValue(event)))
    .join("\n") + "\n";
}

export async function collectMcpContextEvidence(args: {
  backend: BackendInstance;
  providerId?: string;
  agentFamily?: string;
  requestId: string;
  sessionId: string;
  workspaceDir: string;
  adapterDiagnostics?: AcpDiagnosticsEntry[];
  timeWindow?: { fromTs?: string; toTs?: string };
}) {
  const record = getAcpSkillRunRecord(args.requestId);
  const events = [
    ...(args.adapterDiagnostics || []).map(adapterDiagnosticToEvidence),
    ...((record?.events || []).map(eventToEvidence)),
    ...((record?.transcriptItems || []).map(transcriptToEvidence)),
    ...listRuntimeLogs({
      fromTs: args.timeWindow?.fromTs,
      toTs: args.timeWindow?.toTs,
      order: "asc",
      limit: 300,
    })
      .filter((entry) =>
        entry.requestId === args.requestId ||
        entry.component === "zotero-mcp" ||
        entry.providerId === args.providerId ||
        entry.backendId === args.backend.id,
      )
      .map(runtimeLogToEvidence),
  ];
  const agentFamily =
    normalizeString(args.agentFamily) || normalizeString(record?.agentFamily);
  if (args.backend.type === "acp" && agentFamily === "claude-code") {
    events.push(
      ...(await collectClaudeCodeEvidence({
        sessionId: args.sessionId,
        workspaceDir: args.workspaceDir,
      })),
    );
  }
  return events.slice(-MAX_EVIDENCE_EVENTS);
}

export async function writeMcpContextInjectionDiagnostics(args: {
  backend: BackendInstance;
  providerId?: string;
  agentFamily?: string;
  requestId: string;
  sessionId: string;
  workspaceDir: string;
  adapterDiagnostics?: AcpDiagnosticsEntry[];
  preflight: PreflightResultLike;
  smoke: SmokeResultLike;
  timeoutMs: number;
  timeWindow?: { fromTs?: string; toTs?: string };
}): Promise<McpContextDiagnosticsWriteResult> {
  const providerId = normalizeString(args.providerId) || "acp";
  const evidence = await collectMcpContextEvidence({
    backend: args.backend,
    providerId,
    requestId: args.requestId,
    sessionId: args.sessionId,
    workspaceDir: args.workspaceDir,
    agentFamily: args.agentFamily,
    adapterDiagnostics: args.adapterDiagnostics,
    timeWindow: args.timeWindow,
  });
  const record = getAcpSkillRunRecord(args.requestId);
  const mcpDescriptor = parseInjectedDescriptor(evidence);
  const classified = chooseClassification({
    preflight: args.preflight,
    smoke: args.smoke,
    descriptorInjected: mcpDescriptor.injected,
    evidence,
  });
  const diagnostics: McpContextInjectionDiagnostics = {
    schema_id: "mcp.context_injection_diagnostics",
    schema_version: "1.0.0",
    generated_at: nowIso(),
    backendId: args.backend.id,
    backendType: args.backend.type,
    providerId,
    agentFamily:
      normalizeString(args.agentFamily) ||
      normalizeString(record?.agentFamily) ||
      "unknown",
    requestId: args.requestId,
    sessionId: args.sessionId,
    workspaceDir: args.workspaceDir,
    mcpDescriptor,
    backendCapability: {
      canUseHttpMcp: undefined,
      canUseSseMcp: undefined,
      canUseSdkMcp: undefined,
    },
    hostPreflight: {
      requiredTools: uniqueStrings([
        ...(args.smoke.missingTools || []),
        ...(args.smoke.reachedTools || []),
      ]),
      availableTools: uniqueStrings(args.preflight.availableTools || []),
      missingTools: uniqueStrings(args.preflight.missingTools || []),
      ok: args.preflight.ok,
    },
    callableSmoke: {
      reachedTools: uniqueStrings(args.smoke.reachedTools || []),
      missingTools: uniqueStrings(args.smoke.missingTools || []),
      timeoutMs: args.timeoutMs,
      ok: args.smoke.ok,
    },
    observedToolEvents: evidence.filter((event) =>
      event.tags.some((tag) =>
        [
          "tool_absent",
          "tool_call_observed",
          "tool_call_transport_failure",
          "tool_definition_visible",
          "backend_tool_discovery",
        ].includes(tag),
      ),
    ),
    classification: classified.classification,
    confidence: classified.confidence,
    evidence,
    nextSuggestedProbe: classified.nextSuggestedProbe,
  };
  const diagnosticsDir = joinPath(args.workspaceDir, "runtime", "diagnostics");
  const diagnosticFile = joinPath(diagnosticsDir, "mcp-context-injection.json");
  const evidenceFile = joinPath(diagnosticsDir, "backend-mcp-evidence.log");
  await writeRuntimeTextFile(diagnosticFile, diagnosticsJsonText(diagnostics));
  await writeRuntimeTextFile(evidenceFile, evidenceLogText(evidence));
  const serializedDiagnostics = diagnosticsJsonText(diagnostics);
  const serializedEvidence = evidenceLogText(evidence);
  if (
    /Bearer\s+(?!<redacted>)/i.test(serializedDiagnostics) ||
    /Bearer\s+(?!<redacted>)/i.test(serializedEvidence) ||
    byteLength(serializedDiagnostics) < 2
  ) {
    throw new Error("MCP context diagnostics redaction failed");
  }
  return {
    diagnostics,
    diagnosticFile,
    evidenceFile,
  };
}
