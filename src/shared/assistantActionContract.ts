/**
 * Assistant Workspace action payload contract — compile-time types for the
 * action payloads that travel between the shell/child pages and the host.
 *
 * The runtime action vocabulary stays single-sourced in
 * ASSISTANT_WORKSPACE_ACTION_REGISTRY (src/modules/assistant/publication/assistantWorkspacePublication.ts,
 * delivered to child pages via the surface configuration) and in the
 * out-of-band action constants of assistantWireContract.ts. This file is the
 * type-level mirror describing the payload each action carries;
 * src/modules/assistant/publication/assistantWorkspacePublication.ts holds drift guards that fail
 * tsc when the registry and this contract fall out of sync.
 *
 * Field types follow what the current senders emit; host handlers keep their
 * defensive runtime validation unchanged (types are a compile-time layer, not
 * a runtime gate).
 *
 * Like assistantWireContract.ts, this file must stay free of imports from
 * src/modules/** so sidebar page bundles never pull in privileged code.
 */

import type {
  ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS,
  ASSISTANT_WORKSPACE_SHELL_ACTIONS,
  AssistantWorkspaceOwner,
  AssistantWorkspacePublicationAck,
  AssistantWorkspacePublicationSource,
  AssistantWorkspaceTab,
} from "./assistantWireContract";
import type {
  AssistantInteractionDeclinePayloadV1,
  AssistantInteractionDraftPayloadV1,
  AssistantInteractionFilePickPayloadV1,
  AssistantInteractionSubmitPayloadV1,
} from "./userInteractionContract";

// ---------------------------------------------------------------------------
// Registry action payloads (ASSISTANT_WORKSPACE_ACTION_REGISTRY mirror)
// ---------------------------------------------------------------------------

/** Payload for actions whose registry payloadKeys list is empty. */
export type AssistantWorkspaceEmptyActionPayload = Record<never, never>;

/**
 * Composer resource kinds a Pi Conversation child may request. "selection"
 * captures the current Zotero selection; "files" opens the native file
 * picker. Both are resolved host-side by the Conversation coordinator.
 */
export type AssistantWorkspaceComposerResourceKind = "selection" | "files";

/**
 * Payload shapes per ASSISTANT_WORKSPACE_ACTION_REGISTRY action. Keys must
 * match the registry one-for-one and each entry's keys must match the
 * registry payloadKeys exactly (guarded by type assertions in
 * src/modules/assistant/publication/assistantWorkspacePublication.ts).
 */
export type AssistantWorkspaceActionPayloadMap = {
  "open-context-drawer": AssistantWorkspaceEmptyActionPayload;
  "close-context-drawer": AssistantWorkspaceEmptyActionPayload;
  "open-details-drawer": AssistantWorkspaceEmptyActionPayload;
  "close-details-drawer": AssistantWorkspaceEmptyActionPayload;
  "request-owner-details": AssistantWorkspaceEmptyActionPayload;
  "open-permission-request": AssistantWorkspaceEmptyActionPayload;
  "close-permission-request": AssistantWorkspaceEmptyActionPayload;
  "toggle-drawer-section": { sectionId: string };
  "toggle-drawer-group": { groupKey: string };
  // Registry-declared and handled locally by the child; no current sender
  // emits it (the child's plain/bubble buttons mutate local state directly).
  "set-chat-display-mode": { mode: string };
  // target-owner actions carry an empty payload; the owner envelope field
  // identifies the target conversation/run.
  "set-active-conversation": AssistantWorkspaceEmptyActionPayload;
  "archive-conversation": AssistantWorkspaceEmptyActionPayload;
  "restore-conversation": AssistantWorkspaceEmptyActionPayload;
  "delete-conversation": AssistantWorkspaceEmptyActionPayload;
  "rename-conversation": { title: string };
  "compact-conversation": AssistantWorkspaceEmptyActionPayload;
  "add-resource": { kind: AssistantWorkspaceComposerResourceKind };
  "remove-resource": { resourceId: string };
  "select-run": AssistantWorkspaceEmptyActionPayload;
  "archive-run": AssistantWorkspaceEmptyActionPayload;
  "select-task": AssistantWorkspaceEmptyActionPayload;
  "cancel-queued-workflow-unit": { queueId: string };
  "set-active-backend": { groupId: string };
  "new-conversation": { groupId: string };
  "open-backend-manager": AssistantWorkspaceEmptyActionPayload;
  "open-auth-url": { url: string };
  "close-sidebar": AssistantWorkspaceEmptyActionPayload;
  "set-execution-display-mode": { mode: string };
  "load-transcript-page": {
    request: {
      cursor: number | null;
      limit: number;
    };
  };
  connect: { groupId: string };
  disconnect: AssistantWorkspaceEmptyActionPayload;
  cancel: AssistantWorkspaceEmptyActionPayload;
  authenticate: { methodId: string };
  "set-auto-approve-permissions": { enabled: boolean };
  "send-prompt": { message: string };
  "connect-run": AssistantWorkspaceEmptyActionPayload;
  "disconnect-run": AssistantWorkspaceEmptyActionPayload;
  "interrupt-run-turn": AssistantWorkspaceEmptyActionPayload;
  "cancel-run": AssistantWorkspaceEmptyActionPayload;
  "reply-run": { message: string };
  "select-interaction-option": {
    responseValue: unknown;
    responseLabel: string;
  };
  // One batch file pick for the currently selected question/slot, committed
  // with CAS against the revision the picker was opened from.
  "submit-interaction-files": AssistantInteractionFilePickPayloadV1;
  "auth-import-run": {
    providerId: string;
    files: SkillRunnerAuthImportFilePayload[];
    error: string;
  };
  "resolve-permission": {
    permissionRequestId: string;
    // Senders emit exactly these two outcomes; host handlers stay tolerant
    // and map anything else to "cancelled".
    outcome: "selected" | "cancelled";
    optionId: string;
  };
  "set-mode": { modeId: string };
  "set-model": { modelId: string };
  "set-reasoning-effort": { effortId: string };
  // Versioned multi-question interaction flow (Pi Skill Runs): one draft
  // mutation (CAS), one atomic whole-batch submit, one whole-batch decline.
  // File picking reuses the existing "submit-interaction-files" action.
  draft: AssistantInteractionDraftPayloadV1;
  submit: AssistantInteractionSubmitPayloadV1;
  decline: AssistantInteractionDeclinePayloadV1;
  "copy-request-id": AssistantWorkspaceEmptyActionPayload;
  "copy-diagnostics": AssistantWorkspaceEmptyActionPayload;
  // C18: user-selected built-in Agent diagnostic export. The host owns the
  // save target; the action itself carries no path.
  "export-diagnostics": AssistantWorkspaceEmptyActionPayload;
  // C19: explicit recovery. The check only observes authoritative evidence
  // and reassesses the owner; the continue resumes a resolved owner. Neither
  // carries a path, a payload or a synthetic outcome.
  "check-owner-recovery": AssistantWorkspaceEmptyActionPayload;
  "continue-owner-recovery": AssistantWorkspaceEmptyActionPayload;
  "enable-pi-skill-run-restart": AssistantWorkspaceEmptyActionPayload;
  "disable-pi-skill-run-restart": AssistantWorkspaceEmptyActionPayload;
  "open-workspace": AssistantWorkspaceEmptyActionPayload;
};

// ---------------------------------------------------------------------------
// SkillRunner run-action payloads
//
// These types describe the payload shapes the SkillRunner run-action handler
// (dispatchRunWorkspaceAction in src/modules/skillRunner/surface/skillRunnerRunDialog.ts)
// consumes. Payload interfaces keep the legacy open-wire shape (optional keys
// plus an index signature); host handlers keep their defensive runtime
// validation. The strict registry payload mirror above stays the SSOT for
// what child pages put on the v1 action wire.
// ---------------------------------------------------------------------------

/** reply-run in auth mode (mode discriminator: "auth"). */
export type SkillRunnerReplyRunAuthPayload = {
  mode: "auth";
  requestId?: string;
  /** Method selection payload; mutually exclusive with submission. */
  selection?: Record<string, unknown>;
  /** Auth submission payload; mutually exclusive with selection. */
  submission?: Record<string, unknown>;
  authSessionId?: string;
  replyKind?: string;
  replyText?: string;
  [key: string]: unknown;
};

/** reply-run in interaction mode (default when mode is absent). */
export type SkillRunnerReplyRunInteractionPayload = {
  mode?: "interaction";
  requestId?: string;
  interactionId?: number;
  replyText?: string;
  responseValue?: unknown;
  option?: unknown;
  responseObject?: unknown;
  [key: string]: unknown;
};

export type SkillRunnerReplyRunPayload =
  | SkillRunnerReplyRunAuthPayload
  | SkillRunnerReplyRunInteractionPayload;

export type SkillRunnerSubmitInteractionFilesPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerSelectTaskPayload = {
  taskKey?: string;
  runKey?: string;
  [key: string]: unknown;
};

export type SkillRunnerArchiveRunPayload = {
  runKey?: string;
  [key: string]: unknown;
};

export type SkillRunnerCancelRunPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerCopyRequestIdPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerCopyDiagnosticsPayload = {
  requestId?: string;
  [key: string]: unknown;
};

export type SkillRunnerOpenAuthUrlPayload = {
  url?: string;
  [key: string]: unknown;
};

export type SkillRunnerResolvePermissionPayload = {
  requestId?: string;
  permissionRequestId?: string;
  outcome?: string;
  optionId?: string;
  [key: string]: unknown;
};

export type SkillRunnerAuthImportFilePayload = {
  name?: string;
  contentBase64?: string;
  [key: string]: unknown;
};

export type SkillRunnerAuthImportRunPayload = {
  requestId?: string;
  providerId?: string;
  files?: SkillRunnerAuthImportFilePayload[];
  error?: string;
  [key: string]: unknown;
};

export type SkillRunnerCancelQueuedWorkflowUnitPayload = {
  queueId?: string;
  [key: string]: unknown;
};

// ---------------------------------------------------------------------------
// Per-source action subsets (mirror of the registry sources annotations)
// ---------------------------------------------------------------------------

/** Registry actions both acp-chat and acp-skills child pages may send. */
export type AcpSharedAction =
  | "open-context-drawer"
  | "close-context-drawer"
  | "open-details-drawer"
  | "close-details-drawer"
  | "request-owner-details"
  | "open-permission-request"
  | "close-permission-request"
  | "toggle-drawer-section"
  | "toggle-drawer-group"
  | "open-backend-manager"
  | "close-sidebar"
  | "set-execution-display-mode"
  | "load-transcript-page"
  | "resolve-permission"
  | "set-mode"
  | "set-model"
  | "set-reasoning-effort"
  | "copy-diagnostics"
  | "open-workspace";

/** Registry actions limited to acp-chat sources. */
export type AcpChatOnlyAction =
  | "set-chat-display-mode"
  | "set-active-conversation"
  | "archive-conversation"
  | "set-active-backend"
  | "new-conversation"
  | "connect"
  | "disconnect"
  | "cancel"
  | "authenticate"
  | "set-auto-approve-permissions"
  | "send-prompt";

/** Registry actions limited to acp-skills sources. */
export type AcpSkillsOnlyAction =
  | "select-run"
  | "archive-run"
  | "cancel-queued-workflow-unit"
  | "connect-run"
  | "disconnect-run"
  | "interrupt-run-turn"
  | "cancel-run"
  | "reply-run"
  | "select-interaction-option"
  | "submit-interaction-files"
  | "copy-request-id";

export type AcpChatAction = AcpChatOnlyAction | AcpSharedAction;

export type AcpSkillsAction = AcpSkillsOnlyAction | AcpSharedAction;

/** Registry actions a skillrunner child page shares with the ACP pages. */
export type SkillrunnerSharedAction =
  | "open-context-drawer"
  | "close-context-drawer"
  | "open-details-drawer"
  | "close-details-drawer"
  | "request-owner-details"
  | "open-permission-request"
  | "close-permission-request"
  | "toggle-drawer-section"
  | "toggle-drawer-group"
  | "set-chat-display-mode"
  | "set-execution-display-mode"
  | "load-transcript-page"
  | "archive-run"
  | "cancel-run"
  | "cancel-queued-workflow-unit"
  | "reply-run"
  | "select-interaction-option"
  | "submit-interaction-files"
  | "resolve-permission"
  | "copy-request-id"
  | "copy-diagnostics"
  | "open-backend-manager"
  | "open-workspace";

/** Registry actions limited to the skillrunner source. */
export type SkillrunnerOnlyAction =
  | "select-task"
  | "auth-import-run"
  | "open-auth-url";

/** Registry actions a skillrunner child page may send. */
export type SkillrunnerAction = SkillrunnerSharedAction | SkillrunnerOnlyAction;

/**
 * Actions a Pi Conversation child page shares with the ACP/skill-run pages:
 * the drawer, diagnostics, permission and workspace actions. The Pi source
 * composer has no runtime mode selector, so set-mode is intentionally absent.
 */
export type PiConversationsSharedAction =
  | "open-context-drawer"
  | "close-context-drawer"
  | "open-details-drawer"
  | "close-details-drawer"
  | "request-owner-details"
  | "open-permission-request"
  | "close-permission-request"
  | "toggle-drawer-section"
  | "toggle-drawer-group"
  | "open-backend-manager"
  | "close-sidebar"
  | "set-execution-display-mode"
  | "load-transcript-page"
  | "resolve-permission"
  | "copy-diagnostics"
  | "open-workspace";

/** Registry actions limited to the pi-conversations source. */
export type PiConversationsOnlyAction =
  | "set-active-conversation"
  | "archive-conversation"
  | "restore-conversation"
  | "delete-conversation"
  | "rename-conversation"
  | "compact-conversation"
  | "new-conversation"
  | "send-prompt"
  | "cancel"
  | "add-resource"
  | "remove-resource"
  | "set-model"
  | "set-reasoning-effort"
  | "export-diagnostics"
  | "check-owner-recovery";

/** Registry actions a pi-conversations child page may send. */
export type PiConversationsAction =
  | PiConversationsSharedAction
  | PiConversationsOnlyAction;

/** Registry actions limited to the pi-skill-runs source. */
export type PiSkillRunsOnlyAction =
  | "draft"
  | "submit"
  | "decline"
  | "export-diagnostics"
  | "check-owner-recovery"
  | "continue-owner-recovery"
  | "enable-pi-skill-run-restart"
  | "disable-pi-skill-run-restart";

/**
 * Registry actions a pi-skill-runs child page may send. Pi Skill Runs mirror
 * the ACP Skills skill-run surface, minus the runtime mode selector: a Pi
 * Skill Run's execution mode is immutable after admission. The versioned
 * multi-question interaction flow adds draft/submit/decline.
 */
export type PiSkillRunsAction =
  | Exclude<AcpSkillsAction, "set-mode">
  | PiSkillRunsOnlyAction;

// ---------------------------------------------------------------------------
// Out-of-band control-plane payloads (ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS)
// ---------------------------------------------------------------------------

export type AssistantWorkspaceChildControlAction =
  (typeof ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS)[keyof typeof ASSISTANT_WORKSPACE_CHILD_CONTROL_ACTIONS];

/** Transcript render-effect observation reported by the child renderer. */
export type AssistantWorkspacePublicationRenderObservation = {
  publicationId: string;
  renderPath?: "snapshot" | "recovery-full" | "incremental";
  insertedRows?: number;
  updatedRows?: number;
  removedRows?: number;
  measuredRows?: number;
};

export type AssistantWorkspaceChildControlPayloadMap = {
  ready: {
    // Sent by the ACP child pages; the skillrunner child sends none and
    // the host falls back to a tab-scoped generation.
    documentGeneration?: string;
  };
  "publication-ack": AssistantWorkspacePublicationAck;
  "publication-render-observation": AssistantWorkspacePublicationRenderObservation;
  // These two control actions are also registry actions; payload identical.
  "load-transcript-page": AssistantWorkspaceActionPayloadMap["load-transcript-page"];
  "request-owner-details": AssistantWorkspaceActionPayloadMap["request-owner-details"];
};

/** Resolve the payload type for any action a child page may send. */
export type AssistantWorkspaceChildActionPayloadFor<Action extends string> =
  Action extends keyof AssistantWorkspaceChildControlPayloadMap
    ? AssistantWorkspaceChildControlPayloadMap[Action]
    : Action extends keyof AssistantWorkspaceActionPayloadMap
      ? AssistantWorkspaceActionPayloadMap[Action]
      : never;

// ---------------------------------------------------------------------------
// Action envelopes
// ---------------------------------------------------------------------------

/** Shell -> host actions (assistant-workspace:action message payloads). */
export type AssistantWorkspaceShellAction =
  (typeof ASSISTANT_WORKSPACE_SHELL_ACTIONS)[keyof typeof ASSISTANT_WORKSPACE_SHELL_ACTIONS];

export type AssistantWorkspaceShellActionEnvelope = {
  action: AssistantWorkspaceShellAction;
  tab?: AssistantWorkspaceTab;
};

/** Actions an acp-chat child page may put on the wire (registry + control). */
export type AcpChatEnvelopeAction =
  | AcpChatAction
  | AssistantWorkspaceChildControlAction;

/** Actions an acp-skills child page may put on the wire (registry + control). */
export type AcpSkillsEnvelopeAction =
  | AcpSkillsAction
  | AssistantWorkspaceChildControlAction;

/**
 * ACP child -> host envelope (assistant-workspace:child-action payloads from
 * the acp-chat page). The host enforces the exact key set
 * "action,actionId,owner,payload,source" at runtime; owner is null for
 * navigation-group/global scope actions and control-plane actions without an
 * owner context.
 */
export type AcpChatActionEnvelope = {
  [Action in AcpChatEnvelopeAction]: {
    source: "acp-chat";
    owner: Extract<AssistantWorkspaceOwner, { source: "acp-chat" }> | null;
    actionId?: string;
    /** ACP child envelopes never carry a shell tab field. */
    tab?: never;
    action: Action;
    payload: AssistantWorkspaceChildActionPayloadFor<Action>;
  };
}[AcpChatEnvelopeAction];

/** ACP child -> host envelope from the acp-skills page. */
export type AcpSkillsActionEnvelope = {
  [Action in AcpSkillsEnvelopeAction]: {
    source: "acp-skills";
    owner: Extract<AssistantWorkspaceOwner, { source: "acp-skills" }> | null;
    actionId?: string;
    /** ACP child envelopes never carry a shell tab field. */
    tab?: never;
    action: Action;
    payload: AssistantWorkspaceChildActionPayloadFor<Action>;
  };
}[AcpSkillsEnvelopeAction];

/** Actions a skillrunner child page may put on the wire (registry + control). */
export type SkillrunnerEnvelopeAction =
  | SkillrunnerAction
  | AssistantWorkspaceChildControlAction;

/** SkillRunner child -> host envelope from the skillrunner page. */
export type SkillrunnerActionEnvelope = {
  [Action in SkillrunnerEnvelopeAction]: {
    source: "skillrunner";
    owner: Extract<AssistantWorkspaceOwner, { source: "skillrunner" }> | null;
    actionId?: string;
    /** SkillRunner child envelopes never carry a shell tab field. */
    tab?: never;
    action: Action;
    payload: AssistantWorkspaceChildActionPayloadFor<Action>;
  };
}[SkillrunnerEnvelopeAction];

/** Actions a pi-conversations child page may put on the wire. */
export type PiConversationsEnvelopeAction =
  | PiConversationsAction
  | AssistantWorkspaceChildControlAction;

/** Pi Conversation child -> host envelope from the pi-conversations page. */
export type PiConversationsActionEnvelope = {
  [Action in PiConversationsEnvelopeAction]: {
    source: "pi-conversations";
    owner: Extract<
      AssistantWorkspaceOwner,
      { source: "pi-conversations" }
    > | null;
    actionId?: string;
    /** Pi child envelopes never carry a shell tab field. */
    tab?: never;
    action: Action;
    payload: AssistantWorkspaceChildActionPayloadFor<Action>;
  };
}[PiConversationsEnvelopeAction];

/** Actions a pi-skill-runs child page may put on the wire. */
export type PiSkillRunsEnvelopeAction =
  | PiSkillRunsAction
  | AssistantWorkspaceChildControlAction;

/** Pi Skill Run child -> host envelope from the pi-skill-runs page. */
export type PiSkillRunsActionEnvelope = {
  [Action in PiSkillRunsEnvelopeAction]: {
    source: "pi-skill-runs";
    owner: Extract<AssistantWorkspaceOwner, { source: "pi-skill-runs" }> | null;
    actionId?: string;
    /** Pi child envelopes never carry a shell tab field. */
    tab?: never;
    action: Action;
    payload: AssistantWorkspaceChildActionPayloadFor<Action>;
  };
}[PiSkillRunsEnvelopeAction];

/**
 * SkillRunner legacy child -> host envelope shape (pre-convergence child
 * pages carried no source/owner fields). Kept structurally loose so the host
 * child-action handler still admits an older child bundle.
 */
export type AssistantWorkspaceLegacyChildActionEnvelope = {
  tab: "skillrunner";
  action: string;
  payload: Record<string, unknown>;
  actionId?: string;
  ts?: string;
  /** Legacy envelopes never carry the ACP source/owner fields. */
  source?: never;
  owner?: never;
};

/** Every payload shape accepted on assistant-workspace:child-action. */
export type AssistantWorkspaceChildActionEnvelope =
  | AcpChatActionEnvelope
  | AcpSkillsActionEnvelope
  | SkillrunnerActionEnvelope
  | PiConversationsActionEnvelope
  | PiSkillRunsActionEnvelope
  | AssistantWorkspaceLegacyChildActionEnvelope;

/**
 * Payload union for the three action-bearing inbound message types the host
 * consumes (assistant-workspace:action, assistant-workspace:child-action,
 * assistant-workspace:publication-ack). Members carry `never`-marked optional
 * fields for the fields the host probes generically before dispatching on the
 * message type.
 */
export type AssistantWorkspaceInboundActionPayload =
  | (AssistantWorkspaceShellActionEnvelope & {
      source?: never;
      owner?: never;
      actionId?: never;
    })
  | AssistantWorkspaceChildActionEnvelope
  | (AssistantWorkspacePublicationAck & {
      action?: never;
      actionId?: never;
      tab?: never;
      source?: never;
      owner?: never;
    });

// ---------------------------------------------------------------------------
// Contract self-checks (type-level only, no runtime emit)
// ---------------------------------------------------------------------------

type AssistantActionContractIsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type AssistantActionContractAssert<Check extends true> = Check;

// The control payload map must cover the out-of-band vocabulary exactly.
export type _AssistantChildControlCoverageGuard = AssistantActionContractAssert<
  AssistantActionContractIsEqual<
    keyof AssistantWorkspaceChildControlPayloadMap,
    AssistantWorkspaceChildControlAction
  >
>;

// Every registry action must be reachable from exactly one source subset.
export type _AssistantActionSubsetCoverageGuard = AssistantActionContractAssert<
  AssistantActionContractIsEqual<
    | AcpChatOnlyAction
    | AcpSkillsOnlyAction
    | AcpSharedAction
    | SkillrunnerOnlyAction
    | PiConversationsOnlyAction
    | PiSkillRunsOnlyAction,
    keyof AssistantWorkspaceActionPayloadMap
  >
>;
