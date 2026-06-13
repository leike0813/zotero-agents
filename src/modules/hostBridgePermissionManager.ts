import type { RequestPermissionOutcome } from "./acpProtocol";
import type { AcpPendingPermissionRequest } from "./acpTypes";
import { setAcpConversationHostBridgePermissionRequest } from "./acpConversationHostBridgePermissionRegistry";
import { isHostBridgeWriteAutoApprovalScope } from "./hostBridgeWriteAutoApprovalRegistry";
import type { HostBridgeApprovalRequirement } from "./hostBridgeProtocol";
import { getPref } from "../utils/prefs";

const NO_APPROVAL_CAPABILITIES = new Set([
  "context.get_current_view",
  "context.get_selected_items",
  "library.search_items",
  "library.list_items",
  "library.get_item_detail",
  "library.get_item_notes",
  "library.get_note_detail",
  "library.list_note_payloads",
  "library.get_note_payload",
  "library.get_item_attachments",
  "mutation.preview",
  "diagnostic.get_status",
]);

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

export type HostBridgePermissionScope = {
  kind: "acp-chat" | "acp-skill-run" | "acp-run" | "global" | string;
  requestId?: string;
  runId?: string;
  autoApproveWrites?: boolean;
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
      channel: "acp-chat" | "acp-skill-run" | "global";
    }
  | {
      outcome: "denied" | "timeout" | "ui_unavailable";
      requestId: string;
      channel: "acp-chat" | "acp-skill-run" | "global";
      reason: string;
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

function normalizeString(value: unknown) {
  return String(value || "").trim();
}

function nextPermissionRequestId() {
  requestSequence += 1;
  return `host-bridge-permission-${Date.now().toString(36)}-${requestSequence}`;
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
      kind: "reject",
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
    await import("./acpSkillRunStore");
  const outcomePromise = new Promise<HostBridgePermissionDecision>(
    (resolve) => {
      setAcpSkillRunPermissionRequest(runRequestId, {
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
    capability === "citation_graph.refresh_metrics"
  ) {
    requirement = "zotero-ui-required";
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
  };
}

export async function requestHostBridgePermission(
  request: HostBridgePermissionRequest,
): Promise<HostBridgePermissionDecision> {
  const requestWithId = {
    ...request,
    requestId: nextPermissionRequestId(),
  };
  const chatConversationId = acpChatConversationId(request.scope);
  const runRequestId = acpRunRequestId(request.scope);
  const decision = chatConversationId
    ? await requestAcpChatScopedPermission(requestWithId, chatConversationId)
    : runRequestId
      ? await requestAcpRunScopedPermission(requestWithId, runRequestId)
      : await (
          globalApprovalHandlerForTests || requestGlobalPermissionWithPrompt
        )(requestWithId);
  if (decision.outcome !== "approved") {
    throw new HostBridgePermissionError(decision);
  }
  return decision;
}

export function configureHostBridgeGlobalApprovalHandlerForTests(
  handler: GlobalApprovalHandler | null,
) {
  globalApprovalHandlerForTests = handler;
}

export function resetHostBridgePermissionManagerForTests() {
  globalApprovalHandlerForTests = null;
  requestSequence = 0;
}
