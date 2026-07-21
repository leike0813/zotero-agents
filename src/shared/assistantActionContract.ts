/**
 * Assistant Workspace action payload contract — compile-time types for the
 * action payloads that travel between the shell/child pages and the host.
 *
 * The runtime action vocabulary stays single-sourced in
 * ASSISTANT_WORKSPACE_ACTION_REGISTRY (src/modules/assistantWorkspacePublication.ts,
 * delivered to child pages via the surface configuration) and in the
 * out-of-band action constants of assistantWireContract.ts. This file is the
 * type-level mirror describing the payload each action carries;
 * src/modules/assistantWorkspacePublication.ts holds drift guards that fail
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

// ---------------------------------------------------------------------------
// Registry action payloads (ASSISTANT_WORKSPACE_ACTION_REGISTRY mirror)
// ---------------------------------------------------------------------------

/** Payload for actions whose registry payloadKeys list is empty. */
export type AssistantWorkspaceEmptyActionPayload = Record<never, never>;

/**
 * Payload shapes per ASSISTANT_WORKSPACE_ACTION_REGISTRY action. Keys must
 * match the registry one-for-one and each entry's keys must match the
 * registry payloadKeys exactly (guarded by type assertions in
 * src/modules/assistantWorkspacePublication.ts).
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
  "select-run": AssistantWorkspaceEmptyActionPayload;
  "archive-run": AssistantWorkspaceEmptyActionPayload;
  "set-active-backend": { groupId: string };
  "new-conversation": { groupId: string };
  "open-backend-manager": AssistantWorkspaceEmptyActionPayload;
  "close-sidebar": AssistantWorkspaceEmptyActionPayload;
  "set-execution-display-mode": { mode: string };
  "load-transcript-page": {
    request: {
      cursor: number | null;
      limit: number;
    };
  };
  connect: AssistantWorkspaceEmptyActionPayload;
  disconnect: AssistantWorkspaceEmptyActionPayload;
  cancel: AssistantWorkspaceEmptyActionPayload;
  authenticate: { methodId: string };
  "set-auto-approve-permissions": { enabled: boolean };
  "send-prompt": { message: string };
  "connect-run": AssistantWorkspaceEmptyActionPayload;
  "disconnect-run": AssistantWorkspaceEmptyActionPayload;
  "interrupt-run-turn": AssistantWorkspaceEmptyActionPayload;
  "cancel-run": AssistantWorkspaceEmptyActionPayload;
  "reply-run": { message: string; interactionToken: string };
  "select-interaction-option": {
    interactionToken: string;
    responseValue: unknown;
    responseLabel: string;
  };
  "submit-interaction-files": { interactionToken: string };
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
  "copy-request-id": AssistantWorkspaceEmptyActionPayload;
  "copy-diagnostics": AssistantWorkspaceEmptyActionPayload;
  "open-workspace": AssistantWorkspaceEmptyActionPayload;
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
    // Sent by the ACP child pages; the skillrunner run-dialog sends none and
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

/**
 * SkillRunner legacy child -> host envelope (run-dialog -> shell ->
 * assistant-workspace:child-action). Payload typing for the legacy action
 * family is owned by the skillrunner legacy contract work item; kept
 * structurally loose here so the host child-action handler admits both
 * families.
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
    AcpChatOnlyAction | AcpSkillsOnlyAction | AcpSharedAction,
    keyof AssistantWorkspaceActionPayloadMap
  >
>;
