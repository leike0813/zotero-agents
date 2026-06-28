import { ACP_PROMPT_REQUEST_KIND } from "../config/defaults";
import type { BackendInstance } from "../backends/types";
import type {
  AcpAuthMethod,
  AcpDiagnosticsEntry,
  AcpHostContext,
  AcpPendingPermissionRequest,
} from "./acpTypes";
import {
  AcpClientConnection,
  type AcpClientTraceEvent,
  type AcpClientHandler,
} from "./acpClientConnection";
import { createAcpNdJsonMessageStream } from "./acpMessageStream";
import {
  launchAcpTransport,
  type AcpTransportLifecycle,
} from "./acpTransport";
import { describeAcpError, serializeAcpError } from "./acpDiagnostics";
import {
  ACP_PROTOCOL_VERSION,
  type AcpSessionConfigCategory,
  type AcpSessionConfigOption,
  type JsonRpcNotification,
  type NewSessionResponse,
  type RequestPermissionOutcome,
  RequestError,
  type SessionModelState,
  type SessionModeState,
  type SessionNotification,
} from "./acpProtocol";
import {
  findAcpSessionConfigOptionByCategory,
  normalizeAcpSessionConfigOptions,
} from "./acpSessionConfigOptions";
import {
  ensureZoteroMcpServer,
  markZoteroMcpServerDescriptorInjected,
  redactZoteroMcpServerDescriptor,
  subscribeZoteroMcpDiagnostics,
  type ZoteroMcpDiagnosticEvent,
  type ZoteroMcpServerDescriptor,
} from "./zoteroMcpServer";
import type { ZoteroMcpToolPermissionRequest } from "./zoteroMcpProtocol";

export type AcpConnectionUpdate = SessionNotification;
export type AcpConnectionUpdateListener = (
  update: AcpConnectionUpdate,
) => void | Promise<void>;
export type AcpConnectionCloseListener = (event?: {
  message?: string;
  stderrText?: string;
  stdoutText?: string;
  exitCode?: number | null;
  transportLifecycle?: AcpTransportLifecycle;
}) => void | Promise<void>;
export type AcpConnectionDiagnosticsListener = (
  entry: AcpDiagnosticsEntry,
) => void | Promise<void>;
export type AcpConnectionPermissionListener = (
  request: AcpPendingPermissionRequest & {
    resolve: (outcome: RequestPermissionOutcome) => void;
  },
) => void | Promise<void>;

export type AcpConnectionAdapterFactoryArgs = {
  backend: BackendInstance;
  agentWorkspaceDir: string;
  sessionCwd: string;
  workspaceDir: string;
  runtimeDir: string;
  mcpCompatibilityMode?: AcpMcpCompatibilityMode;
};

export type AcpMcpCompatibilityMode =
  | "disabled_by_default"
  | "explicit_descriptor_injection";

export type AcpConnectionInitializeResult = {
  authMethods: AcpAuthMethod[];
  agentName: string;
  agentVersion: string;
  commandLabel: string;
  commandLine: string;
  canLoadSession: boolean;
  canResumeSession: boolean;
  canUseHttpMcp: boolean;
  canUseSseMcp: boolean;
};

export type AcpConnectionNewSessionResult = {
  sessionId: string;
  sessionTitle?: string;
  sessionUpdatedAt?: string;
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
};

export type AcpConnectionAttachSessionResult = {
  sessionId: string;
  sessionTitle?: string;
  sessionUpdatedAt?: string;
  configOptions?: AcpSessionConfigOption[] | null;
  modes?: SessionModeState | null;
  models?: SessionModelState | null;
};

export type AcpConnectionTransportSnapshot = {
  commandLabel: string;
  commandLine: string;
  exitCode: number | null;
  stdoutText: string;
  stderrText: string;
  transportLifecycle?: AcpTransportLifecycle;
};

export type AcpPromptBackendError = {
  message: string;
  name?: string;
  code?: string | number;
  data?: unknown;
  source?: "request_error" | "session_update" | "connection";
};

export type AcpPromptResult = {
  stopReason: string;
  cancelRequested?: boolean;
  observedAcpActivity?: boolean;
  standardAssistantTextSeen?: boolean;
  backendError?: AcpPromptBackendError;
};

export type AcpConnectionAdapter = {
  initialize: () => Promise<AcpConnectionInitializeResult>;
  onUpdate: (listener: AcpConnectionUpdateListener) => () => void;
  onClose: (listener: AcpConnectionCloseListener) => () => void;
  onDiagnostics: (listener: AcpConnectionDiagnosticsListener) => () => void;
  onPermissionRequest: (
    listener: AcpConnectionPermissionListener,
  ) => () => void;
  newSession: () => Promise<AcpConnectionNewSessionResult>;
  loadSession: (args: {
    sessionId: string;
  }) => Promise<AcpConnectionAttachSessionResult>;
  resumeSession: (args: {
    sessionId: string;
  }) => Promise<AcpConnectionAttachSessionResult>;
  prompt: (args: {
    sessionId: string;
    message: string;
  }) => Promise<AcpPromptResult>;
  cancel: (args: { sessionId: string }) => Promise<void>;
  setConfigOption?: (args: {
    sessionId: string;
    category: AcpSessionConfigCategory;
    value: string;
  }) => Promise<boolean>;
  setMode: (args: { sessionId: string; modeId: string }) => Promise<void>;
  setModel: (args: { sessionId: string; modelId: string }) => Promise<void>;
  authenticate: (args: { methodId: string }) => Promise<void>;
  waitForTransportExit?: (timeoutMs: number) => Promise<boolean>;
  getTransportSnapshot?: () => AcpConnectionTransportSnapshot | null;
  close: () => Promise<void>;
};

export class AcpAuthRequiredError extends Error {
  readonly authMethods: AcpAuthMethod[];

  constructor(message: string, authMethods?: AcpAuthMethod[]) {
    super(message);
    this.name = "AcpAuthRequiredError";
    this.authMethods = Array.isArray(authMethods) ? authMethods : [];
  }
}

function isRequestError(value: unknown): value is RequestError {
  return value instanceof RequestError;
}

function compactError(error: unknown) {
  return describeAcpError(error, "unknown error").replace(/\s+/g, " ").trim();
}

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

const ACP_STANDARD_SESSION_UPDATE_KINDS = new Set([
  "user_message_chunk",
  "agent_message_chunk",
  "agent_thought_chunk",
  "tool_call",
  "tool_call_update",
  "plan",
  "available_commands_update",
  "current_mode_update",
  "config_option_update",
  "session_info_update",
  "usage_update",
]);

const ACP_PROMPT_ERROR_SESSION_UPDATE_KINDS = new Set([
  "backend_error",
  "prompt_error",
  "session_error",
  "stream_error",
  "provider_error",
  "model_error",
  "acp_prompt_error",
  "acp_backend_error",
]);

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function compactDiagnosticData(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return safeJson(value, 4000);
}

function compactText(value: unknown, limit = 360) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return "";
  }
  return text.length > limit
    ? `${text.slice(0, Math.max(0, limit - 1))}…`
    : text;
}

function safeJson(value: unknown, limit = 4000) {
  try {
    return compactText(JSON.stringify(value, null, 2), limit);
  } catch {
    return compactText(value, limit);
  }
}

function safeJsonRaw(value: unknown, limit = 4000) {
  try {
    const text = JSON.stringify(value);
    return text.length > limit ? `${text.slice(0, limit)}...` : text;
  } catch {
    return String(value || "");
  }
}

const ZOTERO_MCP_PROMPT_GUIDANCE = [
  "",
  "[Zotero MCP tool usage]",
  'Use the injected MCP server named "zotero" for Zotero interactions.',
  "Start with the zotero tool get_current_view when you need current library or selection context.",
  "Use zotero read tools such as get_selected_items, search_items, list_library_items, get_item_detail, get_item_notes, get_note_detail, and get_item_attachments instead of reading Zotero internals directly.",
  "Use zotero mutation tools for writes, and respect the preview, permission, and execute flow.",
  "Avoid reading Zotero's SQLite database directly unless the user explicitly asks for low-level diagnostics.",
  "Never write directly to Zotero's SQLite database, storage files, or internal data directories. Use zotero MCP write tools only.",
  "If an attachment tool returns a local file path, you may read that returned attachment file path when needed; do not infer or modify Zotero storage paths yourself.",
  "[/Zotero MCP tool usage]",
].join("\n");

function formatZoteroMcpPromptGuidance(mode: AcpMcpCompatibilityMode) {
  return mode === "explicit_descriptor_injection"
    ? ZOTERO_MCP_PROMPT_GUIDANCE
    : "";
}

function normalizeMcpCompatibilityMode(
  mode?: AcpMcpCompatibilityMode | string,
): AcpMcpCompatibilityMode {
  return mode === "explicit_descriptor_injection"
    ? "explicit_descriptor_injection"
    : "disabled_by_default";
}

function buildPromptText(
  message: string,
  mode: AcpMcpCompatibilityMode = "disabled_by_default",
) {
  return `${String(message || "").trim()}${formatZoteroMcpPromptGuidance(mode)}`;
}

export function buildAcpPromptTextForTests(
  message: string,
  _hostContext?: AcpHostContext,
  options?: { mcpCompatibilityMode?: AcpMcpCompatibilityMode },
) {
  return buildPromptText(
    message,
    normalizeMcpCompatibilityMode(options?.mcpCompatibilityMode),
  );
}

function nowIso() {
  return new Date().toISOString();
}

function nextOpaqueId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeAuthMethods(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as AcpAuthMethod[];
  }
  const normalized: AcpAuthMethod[] = [];
  for (const entry of value) {
    const id = String(entry?.id || "").trim();
    const name = String(entry?.name || "").trim();
    if (!id || !name) {
      continue;
    }
    normalized.push({
      id,
      name,
      description: String(entry?.description || "").trim() || undefined,
    });
  }
  return normalized;
}

class NativeAcpConnectionAdapter implements AcpConnectionAdapter {
  private readonly updateListeners = new Set<AcpConnectionUpdateListener>();
  private readonly closeListeners = new Set<AcpConnectionCloseListener>();
  private readonly diagnosticsListeners =
    new Set<AcpConnectionDiagnosticsListener>();
  private readonly permissionListeners =
    new Set<AcpConnectionPermissionListener>();
  private readonly authMethods: AcpAuthMethod[] = [];
  private connection: AcpClientConnection | null = null;
  private transport: Awaited<ReturnType<typeof launchAcpTransport>> | null =
    null;
  private initialized = false;
  private commandLabel = "";
  private commandLine = "";
  private agentName = "";
  private agentVersion = "";
  private canLoadSession = false;
  private canResumeSession = false;
  private canUseHttpMcp = false;
  private canUseSseMcp = false;
  private currentSessionId = "";
  private latestConfigOptions: AcpSessionConfigOption[] = [];
  private claudeRawSdkMetaDisabled = false;
  private readonly activePromptSessions = new Set<string>();
  private readonly standardAssistantTextSessions = new Set<string>();
  private readonly rawAssistantTextBySession = new Map<string, string[]>();
  private readonly promptCapturesBySession = new Map<
    string,
    {
      cancelRequested: boolean;
      observedAcpActivity: boolean;
      standardAssistantTextSeen: boolean;
      backendError?: AcpPromptBackendError;
    }
  >();
  private closing = false;
  private unsubscribeZoteroMcpDiagnostics: () => void = () => undefined;
  private readonly zoteroMcpDiagnosticListener = (
    event: ZoteroMcpDiagnosticEvent,
  ) => {
    this.emitDiagnostic({
      kind: event.kind,
      level: event.level || "info",
      message: event.message,
      detail: event.detail,
      raw: event.raw,
    });
  };

  constructor(private readonly args: AcpConnectionAdapterFactoryArgs) {}

  private mcpCompatibilityMode() {
    return normalizeMcpCompatibilityMode(this.args.mcpCompatibilityMode);
  }

  private emitDiagnostic(entry: {
    kind: string;
    level?: "info" | "warn" | "error";
    message: string;
    detail?: string;
    stage?: string;
    errorName?: string;
    stack?: string;
    cause?: string;
    code?: string | number;
    data?: unknown;
    raw?: unknown;
  }) {
    const payload: AcpDiagnosticsEntry = {
      id: nextOpaqueId("acp-diag"),
      ts: nowIso(),
      kind: entry.kind,
      level: entry.level || "info",
      message: entry.message,
      detail: String(entry.detail || ""),
      stage: entry.stage,
      errorName: entry.errorName,
      stack: entry.stack,
      cause: entry.cause,
      code: entry.code,
      data: entry.data,
      raw: entry.raw,
    };
    for (const listener of this.diagnosticsListeners) {
      void listener(payload);
    }
  }

  private emitErrorDiagnostic(entry: {
    kind: string;
    message: string;
    error: unknown;
    stage: string;
  }) {
    const serialized = serializeAcpError(entry.error, entry.stage);
    this.emitDiagnostic({
      kind: entry.kind,
      level: "error",
      message: entry.message,
      detail: serialized.detail,
      stage: serialized.stage,
      errorName: serialized.errorName,
      stack: serialized.stack,
      cause:
        serialized.cause === undefined
          ? undefined
          : typeof serialized.cause === "string"
            ? serialized.cause
            : JSON.stringify(serialized.cause),
      code: serialized.code,
      data: serialized.data,
      raw: serialized.raw,
    });
  }

  private emitTrace(event: AcpClientTraceEvent) {
    const idText = event.id === undefined ? "" : ` id=${String(event.id)}`;
    const methodText = event.method ? ` ${event.method}` : "";
    const errorText =
      event.errorCode !== undefined
        ? ` error=${String(event.errorCode)} ${String(event.errorMessage || "")}`.trimEnd()
        : "";
    this.emitDiagnostic({
      kind: "jsonrpc_trace",
      message:
        `${event.direction} ${event.kind}${methodText}${idText}${errorText}`.trim(),
      detail: JSON.stringify(event),
      raw: event,
    });
  }

  private isClaudeFamilyBackend() {
    return (
      normalizeString(this.args.backend.acp?.agentFamily).toLowerCase() ===
      "claude-code"
    );
  }

  private shouldRequestClaudeRawSdkMessages() {
    return this.isClaudeFamilyBackend() && !this.claudeRawSdkMetaDisabled;
  }

  private buildClaudeRawSdkMeta() {
    return {
      claudeCode: {
        emitRawSDKMessages: [
          {
            type: "assistant",
          },
        ],
      },
    };
  }

  private withClaudeRawSdkMeta<T extends Record<string, unknown>>(
    params: T,
  ): T & { _meta?: unknown } {
    if (!this.shouldRequestClaudeRawSdkMessages()) {
      return params;
    }
    return {
      ...params,
      _meta: this.buildClaudeRawSdkMeta(),
    };
  }

  private isClaudeRawSdkMetaUnsupportedError(error: unknown) {
    if (!isRequestError(error)) {
      return false;
    }
    if (
      error.code !== -32600 &&
      error.code !== -32602 &&
      error.code !== -32603
    ) {
      return false;
    }
    const detail = `${error.message} ${safeJsonRaw(error.data, 2000)}`;
    return /(?:_meta|meta|invalid params|unknown|unexpected|unrecognized|deserialize|schema)/i.test(
      detail,
    );
  }

  private disableClaudeRawSdkMeta(stage: string, error: unknown) {
    this.claudeRawSdkMetaDisabled = true;
    this.emitDiagnostic({
      kind: "claude_raw_sdk_extension_disabled",
      level: "warn",
      message:
        "Claude raw SDK message extension was rejected; retrying without provider extension metadata.",
      detail: compactError(error),
      stage,
    });
  }

  private extractClaudeRawSdkAssistantText(notification: JsonRpcNotification) {
    if (notification.method !== "_claude/sdkMessage") {
      return [] as string[];
    }
    const params = notification.params as
      | {
          sessionId?: unknown;
          message?: {
            type?: unknown;
            message?: {
              content?: unknown;
            };
          };
        }
      | undefined;
    if (normalizeString(params?.message?.type) !== "assistant") {
      return [];
    }
    const content = params?.message?.message?.content;
    if (!Array.isArray(content)) {
      return [];
    }
    return content
      .filter((entry) => normalizeString(entry?.type) === "text")
      .map((entry) => String(entry?.text || ""))
      .filter((text) => text.length > 0);
  }

  private bufferClaudeRawSdkAssistantText(notification: JsonRpcNotification) {
    if (!this.isClaudeFamilyBackend()) {
      return;
    }
    const params = notification.params as { sessionId?: unknown } | undefined;
    const sessionId = normalizeString(params?.sessionId);
    if (!sessionId || !this.activePromptSessions.has(sessionId)) {
      return;
    }
    const chunks = this.extractClaudeRawSdkAssistantText(notification);
    if (chunks.length === 0) {
      return;
    }
    const existing = this.rawAssistantTextBySession.get(sessionId) || [];
    this.rawAssistantTextBySession.set(sessionId, [...existing, ...chunks]);
  }

  private async emitSessionUpdate(params: SessionNotification) {
    const sessionId = normalizeString(params.sessionId);
    const capture = sessionId
      ? this.promptCapturesBySession.get(sessionId)
      : null;
    if (capture) {
      capture.observedAcpActivity = true;
    }
    const update = params?.update as
      | {
          sessionUpdate?: string;
          status?: unknown;
          error?: unknown;
          message?: unknown;
          reason?: unknown;
          configOptions?: unknown;
          content?: { type?: string | null; text?: string | null };
        }
      | undefined;
    if (String(update?.sessionUpdate || "").trim() === "config_option_update") {
      this.updateLatestConfigOptions(update?.configOptions);
    }
    const backendError = this.extractBackendErrorFromSessionUpdate(update);
    if (capture && backendError) {
      capture.backendError = backendError;
      this.emitDiagnostic({
        kind: "prompt_backend_error",
        level: "error",
        message: backendError.message,
        detail: compactDiagnosticData(backendError.data),
        stage: "session_update",
        errorName: backendError.name,
        code: backendError.code,
      });
    }
    if (
      String(update?.sessionUpdate || "").trim() === "agent_message_chunk" &&
      normalizeString(update?.content?.type) === "text" &&
      String(update?.content?.text || "").length > 0
    ) {
      this.standardAssistantTextSessions.add(sessionId);
      if (capture) {
        capture.standardAssistantTextSeen = true;
      }
    }
    for (const listener of this.updateListeners) {
      await listener(params);
    }
  }

  private extractBackendErrorFromSessionUpdate(
    update:
      | {
          sessionUpdate?: unknown;
          status?: unknown;
          error?: unknown;
          message?: unknown;
          reason?: unknown;
        }
      | undefined,
  ): AcpPromptBackendError | null {
    if (!update) {
      return null;
    }
    const sessionUpdate = normalizeString(update.sessionUpdate).toLowerCase();
    if (
      !sessionUpdate ||
      ACP_STANDARD_SESSION_UPDATE_KINDS.has(sessionUpdate) ||
      !ACP_PROMPT_ERROR_SESSION_UPDATE_KINDS.has(sessionUpdate)
    ) {
      return null;
    }
    const explicitError = update.error;
    const errorObject = isJsonObject(explicitError) ? explicitError : null;
    const message =
      normalizeString(errorObject?.message) ||
      normalizeString(update.message) ||
      normalizeString(update.reason) ||
      (typeof explicitError === "string"
        ? normalizeString(explicitError)
        : "") ||
      "ACP backend reported a prompt error.";
    return {
      source: "session_update",
      message,
      name:
        normalizeString(errorObject?.name) ||
        normalizeString(errorObject?.type) ||
        undefined,
      code:
        typeof errorObject?.code === "number" ||
        typeof errorObject?.code === "string"
          ? errorObject.code
          : undefined,
      data: explicitError !== undefined ? explicitError : update,
    };
  }

  private async flushClaudeRawSdkAssistantText(sessionIdRaw: string) {
    const sessionId = normalizeString(sessionIdRaw);
    if (!sessionId) {
      return;
    }
    const chunks = this.rawAssistantTextBySession.get(sessionId) || [];
    if (
      chunks.length === 0 ||
      this.standardAssistantTextSessions.has(sessionId)
    ) {
      return;
    }
    this.emitDiagnostic({
      kind: "claude_raw_sdk_assistant_fallback",
      message:
        "Projected Claude raw SDK assistant text because the standard ACP assistant stream was empty.",
      detail: JSON.stringify({
        sessionId,
        chunks: chunks.length,
        totalTextLength: chunks.join("").length,
      }),
      stage: "session_prompt",
    });
    for (const text of chunks) {
      await this.emitSessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text,
          },
        },
      });
    }
  }

  private clearPromptCapture(sessionIdRaw: string) {
    const sessionId = normalizeString(sessionIdRaw);
    if (!sessionId) {
      return;
    }
    this.activePromptSessions.delete(sessionId);
    this.standardAssistantTextSessions.delete(sessionId);
    this.rawAssistantTextBySession.delete(sessionId);
    this.promptCapturesBySession.delete(sessionId);
  }

  private beginPromptCapture(sessionId: string): {
    cancelRequested: boolean;
    observedAcpActivity: boolean;
    standardAssistantTextSeen: boolean;
    backendError?: AcpPromptBackendError;
  } {
    const capture = {
      cancelRequested: false,
      observedAcpActivity: false,
      standardAssistantTextSeen: false,
    };
    this.promptCapturesBySession.set(sessionId, capture);
    return capture;
  }

  private markPromptCancelled(sessionIdRaw: string) {
    const sessionId = normalizeString(sessionIdRaw);
    if (!sessionId) {
      return;
    }
    const capture = this.promptCapturesBySession.get(sessionId);
    if (capture) {
      capture.cancelRequested = true;
    }
  }

  private async resolveMcpServers(stage: string) {
    const compatibilityMode = this.mcpCompatibilityMode();
    if (compatibilityMode !== "explicit_descriptor_injection") {
      this.emitDiagnostic({
        kind: "mcp_compat_disabled",
        message:
          "MCP descriptor injection is disabled by default; Host Bridge CLI is the primary host access path.",
        detail: JSON.stringify({
          stage,
          mcpCompatibilityMode: compatibilityMode,
        }),
        stage,
      });
      return [];
    }
    if (!this.canUseHttpMcp) {
      this.emitDiagnostic({
        kind: "zotero_mcp_unavailable",
        level: "warn",
        message: "ACP backend did not advertise HTTP MCP support",
        detail: JSON.stringify({
          stage,
          canUseHttpMcp: this.canUseHttpMcp,
          canUseSseMcp: this.canUseSseMcp,
          legacySseIgnored: this.canUseSseMcp,
        }),
        stage,
      });
      return [];
    }
    try {
      this.unsubscribeZoteroMcpDiagnostics();
      this.unsubscribeZoteroMcpDiagnostics = subscribeZoteroMcpDiagnostics(
        this.zoteroMcpDiagnosticListener,
      );
      const descriptor = await ensureZoteroMcpServer({
        requestToolPermission: (request) =>
          this.requestZoteroMcpToolPermission(request),
      });
      markZoteroMcpServerDescriptorInjected();
      this.emitDiagnostic({
        kind: "mcp_compat_descriptor_injected",
        message:
          "Injected embedded Zotero MCP server for explicit compatibility mode",
        detail: JSON.stringify(
          redactZoteroMcpServerDescriptor(
            descriptor as ZoteroMcpServerDescriptor,
          ),
        ),
        stage,
      });
      return [descriptor];
    } catch (error) {
      const detail = compactError(error);
      this.emitDiagnostic({
        kind: "zotero_mcp_unavailable",
        level: "warn",
        message:
          "Embedded Zotero MCP server is unavailable; continuing without MCP tools",
        detail,
        stage,
      });
      return [];
    }
  }

  private async requestZoteroMcpToolPermission(
    request: ZoteroMcpToolPermissionRequest,
  ) {
    this.emitDiagnostic({
      kind: "permission_requested",
      level: "warn",
      message: `Permission requested for ${request.toolName}`,
      detail: request.summary,
    });
    if (this.permissionListeners.size === 0) {
      return {
        outcome: "unavailable" as const,
        reason: "permission_listener_unavailable",
      };
    }
    const requestId = nextOpaqueId("acp-mcp-permission");
    const outcome = await new Promise<RequestPermissionOutcome>((resolve) => {
      const pending: AcpPendingPermissionRequest & {
        resolve: (outcome: RequestPermissionOutcome) => void;
      } = {
        requestId,
        sessionId: this.currentSessionId,
        toolCallId: requestId,
        toolTitle: `Zotero MCP: ${request.toolName}`,
        source: "zotero-mcp-write",
        summary: request.summary,
        detail: safeJson(
          {
            toolName: request.toolName,
            mutation: request.mutation,
            preview: request.preview,
            summary: request.summary,
          },
          8000,
        ),
        requestedAt: request.requestedAt,
        options: [
          {
            optionId: "approve",
            kind: "allow_once",
            name: "Approve Zotero write",
            description: request.summary,
          },
          {
            optionId: "deny",
            kind: "deny",
            name: "Deny",
            description: "Do not write to Zotero.",
          },
        ],
        resolve,
      };
      for (const listener of this.permissionListeners) {
        void listener(pending);
      }
    });
    if (outcome.outcome === "selected" && outcome.optionId === "approve") {
      return {
        outcome: "approved" as const,
      };
    }
    return {
      outcome: "denied" as const,
      reason:
        outcome.outcome === "selected"
          ? String(outcome.optionId || "denied")
          : "cancelled",
    };
  }

  private emitClose(event?: {
    message?: string;
    stderrText?: string;
    stdoutText?: string;
    exitCode?: number | null;
    transportLifecycle?: AcpTransportLifecycle;
  }) {
    for (const listener of this.closeListeners) {
      void listener(event);
    }
  }

  getTransportSnapshot(): AcpConnectionTransportSnapshot | null {
    if (!this.transport) {
      return null;
    }
    return {
      commandLabel: this.transport.getCommandLabel(),
      commandLine: this.transport.getCommandLine(),
      exitCode: this.transport.getExitCode(),
      stdoutText: this.transport.getStdoutText(),
      stderrText: this.transport.getStderrText(),
      transportLifecycle: this.transport.getLifecycle(),
    };
  }

  async waitForTransportExit(timeoutMs: number) {
    return (await this.transport?.waitForExit(timeoutMs)) === true;
  }

  private buildClient(): AcpClientHandler {
    return {
      requestPermission: async (params) => {
        const normalizedOptions = Array.isArray(params.options)
          ? params.options.reduce(
              (acc, entry) => {
                const optionId = String(entry?.optionId || "").trim();
                const name = String(entry?.name || "").trim();
                if (!optionId || !name) {
                  return acc;
                }
                acc.push({
                  optionId,
                  kind: String(entry?.kind || "").trim(),
                  name,
                  description:
                    String(entry?.description || "").trim() || undefined,
                });
                return acc;
              },
              [] as AcpPendingPermissionRequest["options"],
            )
          : [];
        this.emitDiagnostic({
          kind: "permission_requested",
          level: "warn",
          message: `Permission requested for ${String(
            params.toolCall?.title || "tool call",
          ).trim()}`,
        });
        if (this.permissionListeners.size === 0) {
          return {
            outcome: {
              outcome: "cancelled",
            },
          };
        }
        const requestId = nextOpaqueId("acp-permission");
        const toolCall = params.toolCall || {};
        const optionDescriptions = normalizedOptions
          .map((entry) => entry.description)
          .filter(Boolean);
        const summary =
          compactText(
            (toolCall as any).summary ||
              (toolCall as any).description ||
              optionDescriptions[0] ||
              toolCall.title,
          ) || "ACP backend requests approval.";
        const detail = safeJson(
          {
            sessionId: params.sessionId,
            toolCall,
            options: params.options,
          },
          8000,
        );
        const outcome = await new Promise<RequestPermissionOutcome>(
          (resolve) => {
            const request: AcpPendingPermissionRequest & {
              resolve: (outcome: RequestPermissionOutcome) => void;
            } = {
              requestId,
              sessionId: String(params.sessionId || "").trim(),
              toolCallId: String(toolCall.toolCallId || "").trim(),
              toolTitle: String(toolCall.title || "Tool Call").trim(),
              source: "acp-tool-call",
              summary,
              detail,
              requestedAt: nowIso(),
              options: normalizedOptions,
              resolve,
            };
            for (const listener of this.permissionListeners) {
              void listener(request);
            }
          },
        );
        return {
          outcome,
        };
      },
      sessionUpdate: async (params) => {
        await this.emitSessionUpdate(params);
      },
      providerNotification: async (notification) => {
        this.bufferClaudeRawSdkAssistantText(notification);
      },
    };
  }

  async initialize() {
    if (this.initialized && this.connection) {
      return {
        authMethods: this.authMethods.map((entry) => ({ ...entry })),
        agentName: this.agentName,
        agentVersion: this.agentVersion,
        commandLabel: this.commandLabel,
        commandLine: this.commandLine,
        canLoadSession: this.canLoadSession,
        canResumeSession: this.canResumeSession,
        canUseHttpMcp: this.canUseHttpMcp,
        canUseSseMcp: this.canUseSseMcp,
      };
    }
    this.emitDiagnostic({
      kind: "command_check",
      message: "Checking OpenCode command availability",
      detail: [this.args.backend.command, ...(this.args.backend.args || [])]
        .filter(Boolean)
        .join(" "),
    });
    try {
      this.transport = await launchAcpTransport({
        backend: this.args.backend,
        cwd: this.args.agentWorkspaceDir || this.args.sessionCwd,
      });
      this.commandLabel = this.transport.getCommandLabel();
      this.commandLine = this.transport.getCommandLine();
      this.emitDiagnostic({
        kind: "spawned",
        message: "Spawned ACP backend process",
        detail: this.commandLine,
      });
      const stream = createAcpNdJsonMessageStream(
        this.transport.stdin,
        this.transport.stdout,
      );
      this.connection = new AcpClientConnection(
        () => this.buildClient(),
        stream,
        {
          onTrace: (event) => this.emitTrace(event),
        },
      );
      void this.connection.closed
        .then(async () => {
          if (this.closing) {
            return;
          }
          await this.transport?.closed.catch(() => undefined);
          const stderrText = this.transport?.getStderrText() || "";
          const stdoutText = this.transport?.getStdoutText() || "";
          const exitCode = this.transport?.getExitCode() ?? null;
          const transportLifecycle = this.transport?.getLifecycle();
          this.emitDiagnostic({
            kind: "exited",
            level:
              stderrText || stdoutText || exitCode !== null ? "warn" : "info",
            message: "ACP connection closed",
            detail: JSON.stringify({
              exitCode,
              stderrText,
              stdoutText,
              transportLifecycle,
            }),
            raw: {
              exitCode,
              stderrText,
              stdoutText,
              transportLifecycle,
            },
          });
          this.emitClose({
            message: "ACP connection closed",
            stderrText,
            stdoutText,
            exitCode,
            transportLifecycle,
          });
        })
        .catch(async (error) => {
          if (this.closing) {
            return;
          }
          await this.transport?.closed.catch(() => undefined);
          const detail = compactError(error);
          this.emitErrorDiagnostic({
            kind: "exited",
            message: "ACP connection failed",
            error,
            stage: "connection_closed",
          });
          this.emitClose({
            message: detail,
            stderrText: this.transport?.getStderrText() || "",
            stdoutText: this.transport?.getStdoutText() || "",
            exitCode: this.transport?.getExitCode() ?? null,
            transportLifecycle: this.transport?.getLifecycle(),
          });
        });
      const response = await this.connection.initialize({
        protocolVersion: ACP_PROTOCOL_VERSION,
        clientCapabilities: {},
      });
      const normalizedAuthMethods = normalizeAuthMethods(response.authMethods);
      this.authMethods.splice(
        0,
        this.authMethods.length,
        ...normalizedAuthMethods,
      );
      this.agentName =
        String(response.agentInfo?.title || "").trim() ||
        String(response.agentInfo?.name || "").trim();
      this.agentVersion = String(response.agentInfo?.version || "").trim();
      this.canLoadSession = response.agentCapabilities?.loadSession === true;
      this.canResumeSession =
        !!response.agentCapabilities?.sessionCapabilities?.resume;
      this.canUseHttpMcp =
        response.agentCapabilities?.mcpCapabilities?.http === true;
      this.canUseSseMcp =
        response.agentCapabilities?.mcpCapabilities?.sse === true;
      this.initialized = true;
      this.emitDiagnostic({
        kind: "initialized",
        message: "ACP initialize completed",
        detail: [
          this.agentName,
          this.agentVersion,
          this.canResumeSession ? "resume" : "",
          this.canLoadSession ? "load" : "",
          this.canUseHttpMcp ? "mcp-http" : "",
          this.canUseSseMcp ? "mcp-sse" : "",
        ]
          .filter(Boolean)
          .join(" "),
        raw: {
          agentCapabilities: response.agentCapabilities || null,
        },
      });
      return {
        authMethods: this.authMethods.map((entry) => ({ ...entry })),
        agentName: this.agentName,
        agentVersion: this.agentVersion,
        commandLabel: this.commandLabel,
        commandLine: this.commandLine,
        canLoadSession: this.canLoadSession,
        canResumeSession: this.canResumeSession,
        canUseHttpMcp: this.canUseHttpMcp,
        canUseSseMcp: this.canUseSseMcp,
      };
    } catch (error) {
      const transportSnapshot = this.getTransportSnapshot();
      this.emitErrorDiagnostic({
        kind: "initialized",
        message: "Failed to initialize ACP connection",
        error,
        stage: "initialize",
      });
      if (transportSnapshot) {
        this.emitDiagnostic({
          kind: "initialize_transport_snapshot",
          level: "error",
          message: "ACP transport state after initialize failure",
          detail: JSON.stringify(transportSnapshot),
          stage: "initialize",
          raw: transportSnapshot,
        });
      }
      throw error;
    }
  }

  onUpdate(listener: AcpConnectionUpdateListener) {
    this.updateListeners.add(listener);
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  onClose(listener: AcpConnectionCloseListener) {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  onDiagnostics(listener: AcpConnectionDiagnosticsListener) {
    this.diagnosticsListeners.add(listener);
    return () => {
      this.diagnosticsListeners.delete(listener);
    };
  }

  onPermissionRequest(listener: AcpConnectionPermissionListener) {
    this.permissionListeners.add(listener);
    return () => {
      this.permissionListeners.delete(listener);
    };
  }

  async newSession() {
    if (!this.connection) {
      await this.initialize();
    }
    const cwd = this.args.agentWorkspaceDir || this.args.sessionCwd;
    const mcpServers = await this.resolveMcpServers("session_new");
    try {
      const response = (await this.connection!.newSession(
        this.withClaudeRawSdkMeta({
          cwd,
          mcpServers,
        }),
      )) as NewSessionResponse & {
        title?: string | null;
        updatedAt?: string | null;
      };
      const configOptions = this.updateLatestConfigOptions(
        response.configOptions,
      );
      this.emitDiagnostic({
        kind: "session_created",
        message: `Created ACP session ${String(response.sessionId || "").trim()}`,
      });
      this.currentSessionId = String(response.sessionId || "").trim();
      return {
        sessionId: this.currentSessionId,
        sessionTitle: String(response.title || "").trim() || undefined,
        sessionUpdatedAt: String(response.updatedAt || "").trim() || undefined,
        configOptions,
        modes: response.modes || null,
        models: response.models || null,
      };
    } catch (error) {
      if (
        this.shouldRequestClaudeRawSdkMessages() &&
        this.isClaudeRawSdkMetaUnsupportedError(error)
      ) {
        this.disableClaudeRawSdkMeta("session_new", error);
        const response = (await this.connection!.newSession({
          cwd,
          mcpServers,
        })) as NewSessionResponse & {
          title?: string | null;
          updatedAt?: string | null;
        };
        const configOptions = this.updateLatestConfigOptions(
          response.configOptions,
        );
        this.emitDiagnostic({
          kind: "session_created",
          message: `Created ACP session ${String(response.sessionId || "").trim()}`,
        });
        this.currentSessionId = String(response.sessionId || "").trim();
        return {
          sessionId: this.currentSessionId,
          sessionTitle: String(response.title || "").trim() || undefined,
          sessionUpdatedAt:
            String(response.updatedAt || "").trim() || undefined,
          configOptions,
          modes: response.modes || null,
          models: response.models || null,
        };
      }
      if (
        (isRequestError(error) && error.code === -32000) ||
        /authentication required/i.test(compactError(error))
      ) {
        this.emitDiagnostic({
          kind: "auth_required",
          level: "warn",
          message: compactError(error) || "Authentication required",
        });
        throw new AcpAuthRequiredError(
          compactError(error) || "Authentication required",
          this.authMethods,
        );
      }
      this.emitErrorDiagnostic({
        kind: "session_created",
        message: "Failed to create ACP session",
        error,
        stage: "session_new",
      });
      throw error;
    }
  }

  async loadSession(args: { sessionId: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    const sessionId = String(args.sessionId || "").trim();
    this.emitDiagnostic({
      kind: "session_load_attempted",
      message: `Loading ACP session ${sessionId}`,
    });
    const cwd = this.args.agentWorkspaceDir || this.args.sessionCwd;
    const mcpServers = await this.resolveMcpServers("session_load");
    try {
      const response = await this.connection!.loadSession(
        this.withClaudeRawSdkMeta({
          sessionId,
          cwd,
          mcpServers,
        }),
      );
      this.emitDiagnostic({
        kind: "session_load_succeeded",
        message: `Loaded ACP session ${sessionId}`,
      });
      this.currentSessionId = sessionId;
      const configOptions = this.updateLatestConfigOptions(
        response?.configOptions,
      );
      return {
        sessionId,
        sessionTitle: String(response?.title || "").trim() || undefined,
        sessionUpdatedAt: String(response?.updatedAt || "").trim() || undefined,
        configOptions,
        modes: response?.modes || null,
        models: response?.models || null,
      };
    } catch (error) {
      if (
        this.shouldRequestClaudeRawSdkMessages() &&
        this.isClaudeRawSdkMetaUnsupportedError(error)
      ) {
        this.disableClaudeRawSdkMeta("session_load", error);
        const response = await this.connection!.loadSession({
          sessionId,
          cwd,
          mcpServers,
        });
        this.emitDiagnostic({
          kind: "session_load_succeeded",
          message: `Loaded ACP session ${sessionId}`,
        });
        this.currentSessionId = sessionId;
        const configOptions = this.updateLatestConfigOptions(
          response?.configOptions,
        );
        return {
          sessionId,
          sessionTitle: String(response?.title || "").trim() || undefined,
          sessionUpdatedAt:
            String(response?.updatedAt || "").trim() || undefined,
          configOptions,
          modes: response?.modes || null,
          models: response?.models || null,
        };
      }
      this.emitErrorDiagnostic({
        kind: "session_restore_failed",
        message: "Failed to load ACP session",
        error,
        stage: "session_load",
      });
      throw error;
    }
  }

  async resumeSession(args: { sessionId: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    const sessionId = String(args.sessionId || "").trim();
    this.emitDiagnostic({
      kind: "session_resume_attempted",
      message: `Resuming ACP session ${sessionId}`,
    });
    const cwd = this.args.agentWorkspaceDir || this.args.sessionCwd;
    const mcpServers = await this.resolveMcpServers("session_resume");
    try {
      const response = await this.connection!.resumeSession(
        this.withClaudeRawSdkMeta({
          sessionId,
          cwd,
          mcpServers,
        }),
      );
      this.emitDiagnostic({
        kind: "session_resume_succeeded",
        message: `Resumed ACP session ${sessionId}`,
      });
      this.currentSessionId = sessionId;
      const configOptions = this.updateLatestConfigOptions(
        response?.configOptions,
      );
      return {
        sessionId,
        sessionTitle: String(response?.title || "").trim() || undefined,
        sessionUpdatedAt: String(response?.updatedAt || "").trim() || undefined,
        configOptions,
        modes: response?.modes || null,
        models: response?.models || null,
      };
    } catch (error) {
      if (
        this.shouldRequestClaudeRawSdkMessages() &&
        this.isClaudeRawSdkMetaUnsupportedError(error)
      ) {
        this.disableClaudeRawSdkMeta("session_resume", error);
        const response = await this.connection!.resumeSession({
          sessionId,
          cwd,
          mcpServers,
        });
        this.emitDiagnostic({
          kind: "session_resume_succeeded",
          message: `Resumed ACP session ${sessionId}`,
        });
        this.currentSessionId = sessionId;
        const configOptions = this.updateLatestConfigOptions(
          response?.configOptions,
        );
        return {
          sessionId,
          sessionTitle: String(response?.title || "").trim() || undefined,
          sessionUpdatedAt:
            String(response?.updatedAt || "").trim() || undefined,
          configOptions,
          modes: response?.modes || null,
          models: response?.models || null,
        };
      }
      this.emitErrorDiagnostic({
        kind: "session_restore_failed",
        message: "Failed to resume ACP session",
        error,
        stage: "session_resume",
      });
      throw error;
    }
  }

  async prompt(args: { sessionId: string; message: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    this.emitDiagnostic({
      kind: "prompt_started",
      message: `Prompt started for ${args.sessionId}`,
    });
    const sessionId = normalizeString(args.sessionId);
    this.clearPromptCapture(sessionId);
    const capture = this.beginPromptCapture(sessionId);
    if (sessionId) {
      this.activePromptSessions.add(sessionId);
    }
    try {
      const response = await this.connection!.prompt({
        sessionId: args.sessionId,
        prompt: [
          {
            type: "text",
            text: buildPromptText(args.message, this.mcpCompatibilityMode()),
            _meta: {
              requestKind: ACP_PROMPT_REQUEST_KIND,
            },
          },
        ],
      });
      await this.flushClaudeRawSdkAssistantText(args.sessionId);
      this.emitDiagnostic({
        kind: "prompt_finished",
        message: `Prompt finished with ${String(response.stopReason || "").trim() || "unknown"}`,
      });
      return {
        stopReason: String(response.stopReason || "").trim(),
        cancelRequested: capture.cancelRequested,
        observedAcpActivity: capture.observedAcpActivity,
        standardAssistantTextSeen: capture.standardAssistantTextSeen,
        backendError: capture.backendError,
      };
    } catch (error) {
      const requestError = isRequestError(error)
        ? {
            source: "request_error" as const,
            message:
              normalizeString(error.message) || "ACP prompt request failed.",
            name: error.name,
            code: error.code,
            data: error.data,
          }
        : undefined;
      if (requestError) {
        capture.backendError = requestError;
      }
      this.emitErrorDiagnostic({
        kind: "prompt_finished",
        message: "Prompt failed",
        error,
        stage: "session_prompt",
      });
      throw error;
    } finally {
      this.clearPromptCapture(args.sessionId);
    }
  }

  async cancel(args: { sessionId: string }) {
    if (!this.connection) {
      return;
    }
    this.markPromptCancelled(args.sessionId);
    await this.connection.cancel({
      sessionId: args.sessionId,
    });
    this.emitDiagnostic({
      kind: "prompt_finished",
      level: "warn",
      message: `Cancel requested for ${args.sessionId}`,
    });
  }

  async setMode(args: { sessionId: string; modeId: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    if (
      await this.setConfigOption({
        sessionId: args.sessionId,
        category: "mode",
        value: args.modeId,
      })
    ) {
      return;
    }
    await this.connection!.setSessionMode({
      sessionId: args.sessionId,
      modeId: args.modeId,
    });
    this.emitDiagnostic({
      kind: "initialized",
      message: `Mode set to ${args.modeId}`,
    });
  }

  async setModel(args: { sessionId: string; modelId: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    if (
      await this.setConfigOption({
        sessionId: args.sessionId,
        category: "model",
        value: args.modelId,
      })
    ) {
      return;
    }
    await this.connection!.setSessionModel({
      sessionId: args.sessionId,
      modelId: args.modelId,
    });
    this.emitDiagnostic({
      kind: "initialized",
      message: `Model set to ${args.modelId}`,
    });
  }

  private updateLatestConfigOptions(value: unknown) {
    if (!Array.isArray(value)) {
      return null;
    }
    this.latestConfigOptions = normalizeAcpSessionConfigOptions(value);
    return this.latestConfigOptions.map((entry) => ({ ...entry }));
  }

  async setConfigOption(args: {
    sessionId: string;
    category: AcpSessionConfigCategory;
    value: string;
  }) {
    if (!this.connection) {
      await this.initialize();
    }
    const option = findAcpSessionConfigOptionByCategory(
      this.latestConfigOptions,
      args.category,
    );
    if (!option) {
      return false;
    }
    try {
      const response = await this.connection!.setSessionConfigOption({
        sessionId: args.sessionId,
        configId: option.id,
        value: args.value,
      });
      this.updateLatestConfigOptions(response?.configOptions);
      this.emitDiagnostic({
        kind: "initialized",
        message: `Config option ${option.id} set to ${args.value}`,
      });
      return true;
    } catch (error) {
      if (isRequestError(error) && error.code === -32601) {
        return false;
      }
      throw error;
    }
  }

  async authenticate(args: { methodId: string }) {
    if (!this.connection) {
      await this.initialize();
    }
    await this.connection!.authenticate({
      methodId: args.methodId,
    });
    this.emitDiagnostic({
      kind: "initialized",
      message: `Authenticated with ${args.methodId}`,
    });
  }

  async close() {
    this.closing = true;
    try {
      this.unsubscribeZoteroMcpDiagnostics();
      this.unsubscribeZoteroMcpDiagnostics = () => undefined;
      await this.transport?.close({ graceMs: 1_000 });
    } finally {
      this.transport = null;
      this.connection = null;
      this.initialized = false;
      this.closing = false;
    }
  }
}

export async function createAcpConnectionAdapter(
  args: AcpConnectionAdapterFactoryArgs,
) {
  return new NativeAcpConnectionAdapter(args);
}
