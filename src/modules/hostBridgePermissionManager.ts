import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";
import { setAcpConversationHostBridgePermissionRequest } from "./acpConversationHostBridgePermissionRegistry";
import { isHostBridgeWriteAutoApprovalScope } from "./hostBridgeWriteAutoApprovalRegistry";
import type { HostBridgeApprovalRequirement } from "./hostBridgeProtocol";
import {
  resetSkillRunnerHostBridgePermissionRegistryForTests,
  setSkillRunnerHostBridgePermissionRequest,
} from "./skillRunnerHostBridgePermissionRegistry";
import { getPref } from "../utils/prefs";

const NO_APPROVAL_CAPABILITIES = new Set([
  "context.get_current_view",
  "context.get_selected_items",
  "library.search_items",
  "library.list_items",
  "library.sync_snapshot",
  "library.readiness_audit",
  "library.get_item_detail",
  "library.get_item_notes",
  "library.get_note_detail",
  "library.list_note_payloads",
  "library.get_note_payload",
  "library.get_item_attachments",
  "library.list_annotations",
  "library.export_annotations",
  "workflow_products.list",
  "workflow_products.get",
  "workflow_products.read_asset",
  "workflow_products.export",
  "mutation.preview",
  "diagnostic.get_status",
]);

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

export type HostBridgePermissionScope = {
  kind:
    | "acp-chat"
    | "acp-skill-run"
    | "acp-run"
    | "skillrunner-run"
    | "global"
    | string;
  requestId?: string;
  runId?: string;
  autoApproveWrites?: boolean;
  grantId?: string;
  connectionMode?: "local" | "remote";
};

export type HostBridgePermissionRequest = {
  action: string;
  title: string;
  summary: string;
  detail?: string;
  source?: "host-bridge-cli" | "host-bridge" | string;
  scope?: HostBridgePermissionScope | null;
  timeoutMs?: number;
};

export type HostBridgePermissionDecision =
  | {
      outcome: "approved";
      requestId: string;
      channel: "acp-chat" | "acp-skill-run" | "skillrunner-run" | "global";
    }
  | {
      outcome: "denied" | "timeout" | "ui_unavailable";
      requestId: string;
      channel: "acp-chat" | "acp-skill-run" | "skillrunner-run" | "global";
      reason: string;
    };

export type HostBridgePermissionProjection = {
  permissionRequestId: string;
  action: string;
  title: string;
  summary: string;
  source: string;
  scope?: HostBridgePermissionScope | null;
  workflowRunId?: string;
  skillRunId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  state: "pending" | "approved" | "denied" | "timeout" | "ui_unavailable";
  channel?: HostBridgePermissionDecision["channel"];
  reason?: string;
};

export class HostBridgePermissionError extends Error {
  readonly code:
    | "permission_denied"
    | "permission_timeout"
    | "permission_ui_unavailable";

  readonly decision: HostBridgePermissionDecision;

  constructor(decision: HostBridgePermissionDecision) {
    const code =
      decision.outcome === "timeout"
        ? "permission_timeout"
        : decision.outcome === "ui_unavailable"
          ? "permission_ui_unavailable"
          : "permission_denied";
    super(decision.outcome === "approved" ? code : decision.reason || code);
    this.name = "HostBridgePermissionError";
    this.code = code;
    this.decision = decision;
  }
}

type GlobalApprovalHandler = (
  request: HostBridgePermissionRequest & { requestId: string },
) => Promise<HostBridgePermissionDecision> | HostBridgePermissionDecision;

let globalApprovalHandlerForTests: GlobalApprovalHandler | null = null;
let requestSequence = 0;
const permissionProjections = new Map<string, HostBridgePermissionProjection>();

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nextPermissionRequestId() {
  requestSequence += 1;
  return `host-bridge-permission-${Date.now().toString(36)}-${requestSequence}`;
}

function nowIso() {
  return new Date().toISOString();
}

function hostBridgeWriteApprovalDisabled() {
  try {
    return getPref("hostBridgeDisableWriteApproval") === true;
  } catch {
    return false;
  }
}

function permissionOptions(): AcpPendingPermissionRequest["options"] {
  return [
    {
      optionId: "approve_once",
      kind: "allow_once",
      name: "Approve once",
      description: "Allow this Host Bridge operation one time.",
    },
    {
      optionId: "deny",
      kind: "reject_once",
      name: "Deny",
      description: "Reject this Host Bridge operation.",
    },
  ];
}

function parseAcpPermissionOutcome(outcome: RequestPermissionOutcome) {
  if (outcome.outcome === "selected" && outcome.optionId === "approve_once") {
    return "approved" as const;
  }
  return "denied" as const;
}

function withTimeout<T>(args: {
  promise: Promise<T>;
  timeoutMs: number;
  onTimeout: () => T;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(args.onTimeout()), args.timeoutMs);
  });
  return Promise.race([args.promise, timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function acpRunRequestId(scope?: HostBridgePermissionScope | null) {
  const kind = normalizeString(scope?.kind);
  if (kind !== "acp-skill-run" && kind !== "acp-run") {
    return "";
  }
  return normalizeString(scope?.requestId) || normalizeString(scope?.runId);
}

function acpChatConversationId(scope?: HostBridgePermissionScope | null) {
  const kind = normalizeString(scope?.kind);
  if (kind !== "acp-chat") {
    return "";
  }
  return normalizeString(scope?.requestId) || normalizeString(scope?.runId);
}

function skillRunnerRunRequestId(scope?: HostBridgePermissionScope | null) {
  const kind = normalizeString(scope?.kind);
  if (kind !== "skillrunner-run") {
    return "";
  }
  return normalizeString(scope?.requestId) || normalizeString(scope?.runId);
}

function permissionChannelFromScope(
  scope?: HostBridgePermissionScope | null,
): HostBridgePermissionDecision["channel"] {
  const kind = normalizeString(scope?.kind);
  if (kind === "acp-chat") {
    return "acp-chat";
  }
  if (kind === "acp-skill-run" || kind === "acp-run") {
    return "acp-skill-run";
  }
  if (kind === "skillrunner-run") {
    return "skillrunner-run";
  }
  return "global";
}

function approvalDisabledRequestId(action: string) {
  const suffix =
    normalizeString(action)
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "operation";
  return `host-bridge-${suffix}-approval-disabled`;
}

function relatedWorkflowRunId(scope?: HostBridgePermissionScope | null) {
  const kind = normalizeString(scope?.kind);
  if (kind === "skillrunner-run") {
    return normalizeString(scope?.runId) || undefined;
  }
  return normalizeString(scope?.runId) || undefined;
}

function relatedSkillRunId(scope?: HostBridgePermissionScope | null) {
  const kind = normalizeString(scope?.kind);
  if (kind === "acp-skill-run" || kind === "skillrunner-run") {
    return normalizeString(scope?.requestId) || undefined;
  }
  return undefined;
}

function registerPermissionProjection(
  request: HostBridgePermissionRequest & { requestId: string },
) {
  const createdAt = nowIso();
  const projectedScope = request.scope
    ? {
        kind: request.scope.kind,
        ...(request.scope.requestId
          ? { requestId: request.scope.requestId }
          : {}),
        ...(request.scope.runId ? { runId: request.scope.runId } : {}),
      }
    : null;
  permissionProjections.set(request.requestId, {
    permissionRequestId: request.requestId,
    action: normalizeString(request.action),
    title: normalizeString(request.title),
    summary: normalizeString(request.summary),
    source: normalizeString(request.source) || "host-bridge",
    scope: projectedScope,
    workflowRunId: relatedWorkflowRunId(request.scope),
    skillRunId: relatedSkillRunId(request.scope),
    requestId:
      normalizeString(request.scope?.requestId) ||
      normalizeString(request.scope?.runId) ||
      undefined,
    createdAt,
    updatedAt: createdAt,
    state: "pending",
  });
}

function resolvePermissionProjection(decision: HostBridgePermissionDecision) {
  const projection = permissionProjections.get(decision.requestId);
  if (!projection) {
    return;
  }
  permissionProjections.set(decision.requestId, {
    ...projection,
    state: decision.outcome,
    channel: decision.channel,
    reason: "reason" in decision ? decision.reason : undefined,
    updatedAt: nowIso(),
  });
}

export function listHostBridgePendingPermissions() {
  return Array.from(permissionProjections.values())
    .filter((entry) => entry.state === "pending")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function getHostBridgePermissionProjection(permissionRequestId: string) {
  const id = normalizeString(permissionRequestId);
  return id ? permissionProjections.get(id) || null : null;
}

function requestGlobalPermissionWithPrompt(
  request: HostBridgePermissionRequest & { requestId: string },
): HostBridgePermissionDecision {
  const runtime = globalThis as {
    Zotero?: {
      getMainWindow?: () => _ZoteroTypes.MainWindow;
      Prompt?: {
        confirm?: (args: {
          window?: _ZoteroTypes.MainWindow | null;
          title: string;
          text: string;
          button0: string;
          button1: string;
          defaultButton: number;
        }) => number;
      };
    };
    window?: { confirm?: (message: string) => boolean };
    confirm?: (message: string) => boolean;
  };
  const text = [request.summary, request.detail].filter(Boolean).join("\n\n");
  try {
    const prompt = runtime.Zotero?.Prompt;
    if (typeof prompt?.confirm === "function") {
      const selected = prompt.confirm({
        window: runtime.Zotero?.getMainWindow?.() || null,
        title: request.title,
        text,
        button0: "Approve once",
        button1: "Deny",
        defaultButton: 1,
      });
      return selected === 0
        ? {
            outcome: "approved",
            requestId: request.requestId,
            channel: "global",
          }
        : {
            outcome: "denied",
            requestId: request.requestId,
            channel: "global",
            reason: "User denied the requested Host Bridge operation.",
          };
    }
  } catch {
    // fall through to window confirm
  }

  const confirm = runtime.window?.confirm || runtime.confirm;
  if (typeof confirm === "function") {
    return confirm(`${request.title}\n\n${text}`)
      ? {
          outcome: "approved",
          requestId: request.requestId,
          channel: "global",
        }
      : {
          outcome: "denied",
          requestId: request.requestId,
          channel: "global",
          reason: "User denied the requested Host Bridge operation.",
        };
  }

  return {
    outcome: "ui_unavailable",
    requestId: request.requestId,
    channel: "global",
    reason: "This operation requires approval in Zotero UI.",
  };
}

async function requestSkillRunnerRunScopedPermission(
  request: HostBridgePermissionRequest & { requestId: string },
  runRequestId: string,
): Promise<HostBridgePermissionDecision> {
  const outcomePromise = new Promise<HostBridgePermissionDecision>(
    (resolve) => {
      const registered = setSkillRunnerHostBridgePermissionRequest(
        runRequestId,
        {
          requestId: request.requestId,
          sessionId: "host-bridge",
          toolCallId: request.requestId,
          toolTitle: request.title,
          source: request.source || "host-bridge-cli",
          summary: request.summary,
          detail: request.detail,
          requestedAt: new Date().toISOString(),
          options: permissionOptions(),
          resolve: (outcome) => {
            const parsed = parseAcpPermissionOutcome(outcome);
            resolve(
              parsed === "approved"
                ? {
                    outcome: "approved",
                    requestId: request.requestId,
                    channel: "skillrunner-run",
                  }
                : {
                    outcome: "denied",
                    requestId: request.requestId,
                    channel: "skillrunner-run",
                    reason: "User denied the requested Host Bridge operation.",
                  },
            );
          },
        },
      );
      if (!registered) {
        resolve({
          outcome: "ui_unavailable",
          requestId: request.requestId,
          channel: "skillrunner-run",
          reason:
            "SkillRunner approval UI is unavailable for this Host Bridge operation.",
        });
      }
    },
  );

  return withTimeout({
    promise: outcomePromise,
    timeoutMs: request.timeoutMs || DEFAULT_APPROVAL_TIMEOUT_MS,
    onTimeout: () => ({
      outcome: "timeout",
      requestId: request.requestId,
      channel: "skillrunner-run",
      reason: "Timed out waiting for SkillRunner approval.",
    }),
  });
}

async function requestAcpRunScopedPermission(
  request: HostBridgePermissionRequest & { requestId: string },
  runRequestId: string,
): Promise<HostBridgePermissionDecision> {
  if (
    normalizeString(request.action) === "workflow.submit" &&
    isHostBridgeWriteAutoApprovalScope(request.scope)
  ) {
    return {
      outcome: "approved",
      requestId: request.requestId,
      channel: "acp-skill-run",
    };
  }
  const { setAcpSkillRunPermissionRequest } =
    await import("./acpSkillRunPermissionFacade");
  const outcomePromise = new Promise<HostBridgePermissionDecision>(
    (resolve) => {
      const registered = setAcpSkillRunPermissionRequest(runRequestId, {
        requestId: request.requestId,
        sessionId: "host-bridge",
        toolCallId: request.requestId,
        toolTitle: request.title,
        source: request.source || "host-bridge-cli",
        summary: request.summary,
        detail: request.detail,
        requestedAt: new Date().toISOString(),
        options: permissionOptions(),
        resolve: (outcome) => {
          const parsed = parseAcpPermissionOutcome(outcome);
          resolve(
            parsed === "approved"
              ? {
                  outcome: "approved",
                  requestId: request.requestId,
                  channel: "acp-skill-run",
                }
              : {
                  outcome: "denied",
                  requestId: request.requestId,
                  channel: "acp-skill-run",
                  reason: "User denied the requested Host Bridge operation.",
                },
          );
        },
      });
      if (!registered) {
        resolve({
          outcome: "ui_unavailable",
          requestId: request.requestId,
          channel: "acp-skill-run",
          reason:
            "ACP Skills approval UI is unavailable for this Host Bridge operation.",
        });
      }
    },
  );

  return withTimeout({
    promise: outcomePromise,
    timeoutMs: request.timeoutMs || DEFAULT_APPROVAL_TIMEOUT_MS,
    onTimeout: () => ({
      outcome: "timeout",
      requestId: request.requestId,
      channel: "acp-skill-run",
      reason: "Timed out waiting for Zotero approval.",
    }),
  });
}

async function requestAcpChatScopedPermission(
  request: HostBridgePermissionRequest & { requestId: string },
  conversationId: string,
): Promise<HostBridgePermissionDecision> {
  const outcomePromise = new Promise<HostBridgePermissionDecision>(
    (resolve) => {
      const registered = setAcpConversationHostBridgePermissionRequest(
        conversationId,
        {
          requestId: request.requestId,
          sessionId: "host-bridge",
          toolCallId: request.requestId,
          toolTitle: request.title,
          source: request.source || "host-bridge-cli",
          summary: request.summary,
          detail: request.detail,
          requestedAt: new Date().toISOString(),
          options: permissionOptions(),
          resolve: (outcome) => {
            const parsed = parseAcpPermissionOutcome(outcome);
            resolve(
              parsed === "approved"
                ? {
                    outcome: "approved",
                    requestId: request.requestId,
                    channel: "acp-chat",
                  }
                : {
                    outcome: "denied",
                    requestId: request.requestId,
                    channel: "acp-chat",
                    reason: "User denied the requested Host Bridge operation.",
                  },
            );
          },
        },
      );
      if (!registered) {
        resolve({
          outcome: "ui_unavailable",
          requestId: request.requestId,
          channel: "acp-chat",
          reason:
            "ACP Chat approval UI is unavailable for this Host Bridge operation.",
        });
      }
    },
  );

  return withTimeout({
    promise: outcomePromise,
    timeoutMs: request.timeoutMs || DEFAULT_APPROVAL_TIMEOUT_MS,
    onTimeout: () => ({
      outcome: "timeout",
      requestId: request.requestId,
      channel: "acp-chat",
      reason: "Timed out waiting for ACP Chat approval.",
    }),
  });
}

export function getHostBridgeApprovalRequirement(
  capability: string,
): HostBridgeApprovalRequirement {
  let requirement: HostBridgeApprovalRequirement = "zotero-ui-required";
  if (
    capability === "debug.synthesis.cleanInstallReset" ||
    capability === "debug.zotero.eval" ||
    capability === "citation_graph.refresh_metrics" ||
    capability === "reference_sidecar.refresh" ||
    capability === "citation_graph.update"
  ) {
    requirement = "zotero-ui-required";
  } else if (capability === "synthesis.operation.get") {
    requirement = "none";
  } else if (capability.startsWith("debug.")) {
    requirement = "none";
  } else if (
    capability.startsWith("citation_graph.") ||
    capability.startsWith("concepts.") ||
    capability.startsWith("insights.") ||
    capability.startsWith("library_index.") ||
    capability.startsWith("paper_artifacts.") ||
    capability.startsWith("reference_index.") ||
    capability.startsWith("resolvers.") ||
    capability.startsWith("schemas.") ||
    capability.startsWith("topics.")
  ) {
    requirement = "none";
  } else if (NO_APPROVAL_CAPABILITIES.has(capability)) {
    requirement = "none";
  }
  if (
    requirement === "zotero-ui-required" &&
    hostBridgeWriteApprovalDisabled()
  ) {
    return "none";
  }
  return requirement;
}

export function getHostBridgeApprovalRequirementForPhaseOne(): HostBridgeApprovalRequirement {
  return "none";
}

export function parseHostBridgePermissionScope(
  raw: unknown,
): HostBridgePermissionScope | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const source = raw as Record<string, unknown>;
  const kind = normalizeString(source.kind);
  if (!kind) {
    return null;
  }
  return {
    kind,
    requestId: normalizeString(source.requestId) || undefined,
    runId: normalizeString(source.runId) || undefined,
    autoApproveWrites: source.autoApproveWrites === true,
    grantId: normalizeString(source.grantId) || undefined,
  };
}

export async function requestHostBridgePermission(
  request: HostBridgePermissionRequest,
): Promise<HostBridgePermissionDecision> {
  const requestWithId = {
    ...request,
    requestId: nextPermissionRequestId(),
  };
  registerPermissionProjection(requestWithId);
  const chatConversationId = acpChatConversationId(request.scope);
  const runRequestId = acpRunRequestId(request.scope);
  const skillRunnerRequestId = skillRunnerRunRequestId(request.scope);
  let decision: HostBridgePermissionDecision;
  try {
    decision = chatConversationId
      ? await requestAcpChatScopedPermission(requestWithId, chatConversationId)
      : runRequestId
        ? await requestAcpRunScopedPermission(requestWithId, runRequestId)
        : skillRunnerRequestId
          ? await requestSkillRunnerRunScopedPermission(
              requestWithId,
              skillRunnerRequestId,
            )
          : await (
              globalApprovalHandlerForTests || requestGlobalPermissionWithPrompt
            )(requestWithId);
  } catch (error) {
    const failedDecision: HostBridgePermissionDecision = {
      outcome: "ui_unavailable",
      requestId: requestWithId.requestId,
      channel: chatConversationId
        ? "acp-chat"
        : runRequestId
          ? "acp-skill-run"
          : skillRunnerRequestId
            ? "skillrunner-run"
            : "global",
      reason: error instanceof Error ? error.message : String(error || ""),
    };
    resolvePermissionProjection(failedDecision);
    throw error;
  }
  resolvePermissionProjection(decision);
  if (decision.outcome !== "approved") {
    throw new HostBridgePermissionError(decision);
  }
  return decision;
}

export async function requestHostBridgePermissionForRequirement(
  request: HostBridgePermissionRequest,
): Promise<HostBridgePermissionDecision> {
  if (getHostBridgeApprovalRequirement(request.action) === "none") {
    return {
      outcome: "approved",
      requestId: approvalDisabledRequestId(request.action),
      channel: permissionChannelFromScope(request.scope),
    };
  }
  return requestHostBridgePermission(request);
}

export function configureHostBridgeGlobalApprovalHandlerForTests(
  handler: GlobalApprovalHandler | null,
) {
  globalApprovalHandlerForTests = handler;
}

export function resetHostBridgePermissionManagerForTests() {
  globalApprovalHandlerForTests = null;
  requestSequence = 0;
  permissionProjections.clear();
  resetSkillRunnerHostBridgePermissionRegistryForTests();
}
