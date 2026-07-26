import type { AssistantMessageCountsSnapshot } from "./assistantMessageCounts";
import type {
  AssistantWorkspaceTranscriptDelta,
  AssistantWorkspaceTranscriptPage,
  AssistantWorkspaceTranscriptRegion,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistantWorkspaceTranscriptPublication";

// Wire identity and field lists are single-sourced in the shared wire
// contract (imported by both this module and the sidebar page bundles);
// re-exported here to keep existing import sites compatible.
export {
  ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
  ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
  ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
} from "../shared/assistantWireContract";
import {
  parseAssistantPendingInteraction,
  type AssistantPendingInteraction,
} from "../shared/assistantInteractionContract";

// Shared wire identity types (AssistantWorkspaceOwner,
// AssistantWorkspacePublicationAck, ...) also live in the shared wire
// contract; re-exported here for the same compatibility reason.
export type {
  AssistantWorkspaceOwner,
  AssistantWorkspacePublicationAck,
  AssistantWorkspacePublicationAckStage,
  AssistantWorkspacePublicationSource,
} from "../shared/assistantWireContract";

import {
  ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS,
  ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS,
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
  ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
} from "../shared/assistantWireContract";

import type {
  AssistantWorkspaceOwner,
  AssistantWorkspacePublicationAck,
  AssistantWorkspacePublicationSource,
} from "../shared/assistantWireContract";

import type {
  AcpChatAction,
  AcpSkillsAction,
  AssistantWorkspaceActionPayloadMap,
} from "../shared/assistantActionContract";

export const ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY = {
  backend: { labelPath: "fields.backend" },
  workflow: { labelPath: "fields.workflow" },
  skill: { labelPath: "fields.skill" },
  status: { labelPath: "fields.status" },
  "backend-status": { labelPath: "status.backend" },
  "apply-state": { labelPath: "status.apply" },
  "updated-at": { labelPath: "fields.updated" },
  conversation: { labelPath: "fields.conversation" },
  session: { labelPath: "fields.session" },
  recovery: { labelPath: "fields.remoteRestore" },
  workspace: { labelPath: "fields.workspace" },
  runtime: { labelPath: "fields.runtime" },
  model: { labelPath: "fields.model" },
  reasoning: { labelPath: "fields.reasoning" },
  "agent-version": { labelPath: "fields.agentVersion" },
} as const;

export type AssistantWorkspacePresentationFieldId =
  keyof typeof ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY;

export type AssistantWorkspaceActionScope =
  | "local"
  | "target-owner"
  | "selected-owner"
  | "navigation-group"
  | "global";

export const ASSISTANT_WORKSPACE_ACTION_REGISTRY = {
  "open-context-drawer": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "close-context-drawer": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "open-details-drawer": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "close-details-drawer": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "request-owner-details": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "open-permission-request": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "close-permission-request": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "toggle-drawer-section": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["sectionId"],
  },
  "toggle-drawer-group": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["groupKey"],
  },
  "set-chat-display-mode": {
    scope: "local",
    sources: ["acp-chat"],
    payloadKeys: ["mode"],
  },
  "set-active-conversation": {
    scope: "target-owner",
    sources: ["acp-chat"],
    payloadKeys: [],
  },
  "archive-conversation": {
    scope: "target-owner",
    sources: ["acp-chat"],
    payloadKeys: [],
  },
  "select-run": {
    scope: "target-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "archive-run": {
    scope: "target-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "cancel-queued-workflow-unit": {
    scope: "global",
    sources: ["acp-skills"],
    payloadKeys: ["queueId"],
  },
  "set-active-backend": {
    scope: "navigation-group",
    sources: ["acp-chat"],
    payloadKeys: ["groupId"],
  },
  "new-conversation": {
    scope: "navigation-group",
    sources: ["acp-chat"],
    payloadKeys: ["groupId"],
  },
  "open-backend-manager": {
    scope: "global",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "close-sidebar": {
    scope: "global",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "set-execution-display-mode": {
    scope: "global",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["mode"],
  },
  "load-transcript-page": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["request"],
  },
  connect: {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: [],
  },
  disconnect: {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: [],
  },
  cancel: {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: [],
  },
  authenticate: {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: ["methodId"],
  },
  "set-auto-approve-permissions": {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: ["enabled"],
  },
  "send-prompt": {
    scope: "selected-owner",
    sources: ["acp-chat"],
    payloadKeys: ["message"],
  },
  "connect-run": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "disconnect-run": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "interrupt-run-turn": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "cancel-run": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "reply-run": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: ["message"],
  },
  "select-interaction-option": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: ["responseValue", "responseLabel"],
  },
  "submit-interaction-files": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "resolve-permission": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["permissionRequestId", "outcome", "optionId"],
  },
  "set-mode": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["modeId"],
  },
  "set-model": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["modelId"],
  },
  "set-reasoning-effort": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["effortId"],
  },
  "copy-request-id": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: [],
  },
  "copy-diagnostics": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
  "open-workspace": {
    scope: "selected-owner",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: [],
  },
} as const satisfies Record<
  string,
  {
    scope: AssistantWorkspaceActionScope;
    sources: readonly AssistantWorkspacePublicationSource[];
    payloadKeys: readonly string[];
  }
>;

export type AssistantWorkspaceAction =
  keyof typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY;

// ---------------------------------------------------------------------------
// Compile-time drift guards between the runtime action registry above and the
// shared action payload contract (src/shared/assistantActionContract.ts).
// Type-level assertions only; they emit no runtime code and fail tsc when the
// registry and the contract fall out of sync.
// ---------------------------------------------------------------------------

type AssistantWorkspaceContractIsEqual<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type AssistantWorkspaceContractAssert<Check extends true> = Check;

type AssistantWorkspaceRegistryActionsForSource<
  Source extends AssistantWorkspacePublicationSource,
> = {
  [Action in AssistantWorkspaceAction]: Source extends (typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY)[Action]["sources"][number]
    ? Action
    : never;
}[AssistantWorkspaceAction];

type AssistantWorkspaceActionPayloadKeyDrift = {
  [Action in AssistantWorkspaceAction]: AssistantWorkspaceContractIsEqual<
    keyof AssistantWorkspaceActionPayloadMap[Action],
    (typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY)[Action]["payloadKeys"][number]
  > extends true
    ? never
    : Action;
}[AssistantWorkspaceAction];

// The payload map must cover the registry vocabulary one-for-one.
export type _AssistantWorkspaceActionVocabularyGuard =
  AssistantWorkspaceContractAssert<
    AssistantWorkspaceContractIsEqual<
      keyof AssistantWorkspaceActionPayloadMap,
      AssistantWorkspaceAction
    >
  >;

// Each payload entry's keys must equal the registry payloadKeys exactly.
export type _AssistantWorkspaceActionPayloadKeysGuard =
  AssistantWorkspaceContractAssert<
    AssistantWorkspaceContractIsEqual<
      AssistantWorkspaceActionPayloadKeyDrift,
      never
    >
  >;

// The contract's per-source action subsets must equal the registry sources.
export type _AssistantWorkspaceAcpChatActionSubsetGuard =
  AssistantWorkspaceContractAssert<
    AssistantWorkspaceContractIsEqual<
      AcpChatAction,
      AssistantWorkspaceRegistryActionsForSource<"acp-chat">
    >
  >;

export type _AssistantWorkspaceAcpSkillsActionSubsetGuard =
  AssistantWorkspaceContractAssert<
    AssistantWorkspaceContractIsEqual<
      AcpSkillsAction,
      AssistantWorkspaceRegistryActionsForSource<"acp-skills">
    >
  >;

export type AssistantWorkspacePublicationKind =
  | "owner-navigation"
  | "service-status"
  | "owner-control"
  | "message-counts"
  | "transcript"
  | "plan"
  | "permission"
  | "composer"
  | "owner-presentation"
  | "owner-details";

export type AssistantWorkspaceUnownedScope = {
  source: AssistantWorkspacePublicationSource;
  ownerKey: null;
};

export type AssistantWorkspacePublicationOwner =
  | AssistantWorkspaceOwner
  | AssistantWorkspaceUnownedScope;

export type AssistantWorkspacePublicationForm = "region" | "snapshot" | "delta";

export type AssistantWorkspacePublicationCause =
  | "initialization"
  | "activation"
  | "owner-switch"
  | "page-request"
  | "steady-state"
  | "rebase"
  | "diagnostic";

export type AssistantWorkspaceServiceStatus = {
  items: Array<{
    serviceId: "acp-connection" | "host-bridge";
    label: string;
    status: string;
    available: boolean;
    message: string | null;
  }>;
};

export type AssistantWorkspaceOwnerControl = {
  status: string;
  busy: boolean;
  hint: {
    kind:
      | "hidden"
      | "auth"
      | "running"
      | "repairing"
      | "waiting_user"
      | "completed"
      | "canceled"
      | "disconnected"
      | "error"
      | "notice";
    message: string | null;
  };
  interaction: AssistantPendingInteraction | null;
  connection: {
    status: string;
    sessionAvailable: boolean;
    connected: boolean;
    canConnect: boolean;
    canDisconnect: boolean;
  };
  execution: {
    canCancel: boolean;
    canInterrupt: boolean;
  };
  authentication: {
    required: boolean;
    canAuthenticate: boolean;
    methodId: string | null;
  };
  permissionPolicy: {
    autoApprove: boolean;
    canSetAutoApprove: boolean;
  };
};

export type AssistantWorkspaceMessageCounts = {
  counts: AssistantMessageCountsSnapshot | null;
};

export type AssistantWorkspaceQueuedNavigationEntry = {
  queueId: string;
  groupId: string;
  label: string;
  subtitle: string | null;
  groupLabel: string | null;
  updatedAt: string | null;
  canCancel: boolean;
};

export type AssistantWorkspaceOwnerNavigation = {
  selectedOwner: AssistantWorkspaceOwner | null;
  selectedGroupId: string | null;
  groups: Array<{
    groupId: string;
    label: string;
    status: string;
  }>;
  entries: Array<{
    owner: AssistantWorkspaceOwner;
    groupId: string | null;
    label: string;
    subtitle: string | null;
    description: string | null;
    groupLabel: string | null;
    status: string;
    backendStatus: string | null;
    applyState: string | null;
    attention: string | null;
    updatedAt: string | null;
    messageCount: number;
  }>;
  queuedEntries: AssistantWorkspaceQueuedNavigationEntry[];
  canCreateOwner: boolean;
};

export type AssistantWorkspacePlanEntry = {
  itemId: string;
  content: string;
  priority: string | null;
  status: string | null;
};

export type AssistantWorkspacePlan = {
  items: AssistantWorkspacePlanEntry[];
};

export type AssistantWorkspacePermissionRequest = {
  requestId: string;
  approvalKind: "acp-tool" | "zotero-write";
  title: string;
  summary: string;
  tool: {
    title: string;
    callId: string | null;
  };
  review: {
    requestedAt: string | null;
    command: string | null;
    preview: string | null;
  };
  options: Array<{
    optionId: string;
    label: string;
    description: string | null;
  }>;
};

export type AssistantWorkspacePermission = {
  request: AssistantWorkspacePermissionRequest | null;
};

function boundedPermissionText(value: unknown, limit: number) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, limit) : null;
}

export function projectAssistantWorkspacePermissionRequest(
  value: unknown,
): AssistantWorkspacePermissionRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const requestId = boundedPermissionText(source.requestId, 512);
  if (!requestId) return null;
  const approvalKind =
    String(source.source || "").trim() === "zotero-mcp-write"
      ? ("zotero-write" as const)
      : ("acp-tool" as const);
  let command: string | null = null;
  let preview: string | null = null;
  const detail = boundedPermissionText(source.detail, 12_000);
  if (detail) {
    try {
      const parsed = JSON.parse(detail) as Record<string, unknown>;
      command = boundedPermissionText(
        typeof parsed.command === "string"
          ? parsed.command
          : Array.isArray(parsed.command)
            ? parsed.command.join(" ")
            : null,
        4_000,
      );
      preview = boundedPermissionText(
        parsed.preview || parsed.diff || parsed.summary,
        12_000,
      );
    } catch {
      preview = detail;
    }
  }
  return {
    requestId,
    approvalKind,
    title:
      boundedPermissionText(source.toolTitle, 512) ||
      boundedPermissionText(source.summary, 512) ||
      requestId,
    summary: boundedPermissionText(source.summary, 1_000) || "",
    tool: {
      title:
        boundedPermissionText(source.toolTitle, 512) ||
        boundedPermissionText(source.summary, 512) ||
        requestId,
      callId: boundedPermissionText(source.toolCallId, 512),
    },
    review: {
      requestedAt: boundedPermissionText(source.requestedAt, 128),
      command,
      preview,
    },
    options: (Array.isArray(source.options) ? source.options : []).map(
      (option) => {
        const entry = option as Record<string, unknown>;
        return {
          optionId: String(entry.optionId || ""),
          label: String(entry.name || entry.label || entry.optionId || ""),
          description: boundedPermissionText(entry.description, 1_000),
        };
      },
    ),
  };
}

export type AssistantWorkspaceComposer = {
  reply: {
    status: "enabled" | "disabled" | "busy" | "cancelling";
  };
  runtimeOptions: {
    mode: AssistantWorkspaceOptionGroup;
    model: AssistantWorkspaceOptionGroup;
    reasoningEffort: AssistantWorkspaceOptionGroup;
  };
};

export type AssistantWorkspaceOption = {
  optionId: string;
  label: string;
  description: string | null;
};

export type AssistantWorkspaceOptionGroup = {
  selectedOptionId: string | null;
  options: AssistantWorkspaceOption[];
  enabled: boolean;
};

export function projectAssistantWorkspaceOptionGroup(
  options:
    | ReadonlyArray<{
        id: string;
        label: string;
        description?: string | null;
      }>
    | undefined,
  selectedOptionId: string | null | undefined,
  enabled: boolean,
): AssistantWorkspaceOptionGroup {
  return {
    selectedOptionId: selectedOptionId || null,
    options: (options || []).map((option) => ({
      optionId: option.id,
      label: option.label,
      description: option.description || null,
    })),
    enabled,
  };
}

export type AssistantWorkspaceOwnerPresentation = {
  title: string;
  subtitle: string | null;
  description: string | null;
  notice: {
    tone: "info" | "warning" | "danger";
    text: string;
  } | null;
  metadata: Array<{
    fieldId: AssistantWorkspacePresentationFieldId;
    value: string;
  }>;
  usage: {
    used: number;
    limit: number;
    costText: string | null;
  } | null;
};

export const ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY = {
  session: { labelPath: "details.session" },
  paths: { labelPath: "details.paths" },
  diagnostics: { labelPath: "details.diagnostics" },
  "run-paths": { labelPath: "details.runPaths" },
  runner: { labelPath: "details.runner" },
  validation: { labelPath: "details.validation" },
  "runtime-dependencies": { labelPath: "details.runtimeDependencies" },
  "output-revisions": { labelPath: "details.outputRevisions" },
  "runtime-logs": { labelPath: "details.runtimeLogs" },
  "result-json": { labelPath: "details.resultJson" },
} as const;

export type AssistantWorkspaceDetailsSectionId =
  keyof typeof ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY;

export const ASSISTANT_WORKSPACE_DETAILS_FIELD_REGISTRY = {
  target: { labelPath: "fields.target" },
  agent: { labelPath: "fields.agent" },
  "agent-version": { labelPath: "fields.agentVersion" },
  session: { labelPath: "fields.session" },
  "remote-session": { labelPath: "fields.remoteSession" },
  "remote-restore": { labelPath: "fields.remoteRestore" },
  "stop-reason": { labelPath: "fields.stopReason" },
  workspace: { labelPath: "fields.workspace" },
  "host-context": { labelPath: "fields.hostContext" },
  diagnostics: { labelPath: "details.recentDiagnostics" },
  command: { labelPath: "fields.command" },
  stderr: { labelPath: "fields.stderr" },
  "last-error": { labelPath: "fields.lastError" },
  "prerequisite-error": { labelPath: "fields.prerequisiteError" },
  runtime: { labelPath: "fields.runtime" },
  "input-manifest": { labelPath: "fields.inputManifest" },
  "result-artifact": { labelPath: "fields.resultArtifact" },
  backend: { labelPath: "fields.backend" },
  "agent-family": { labelPath: "fields.agentFamily" },
  mode: { labelPath: "fields.mode" },
  model: { labelPath: "fields.model" },
  reasoning: { labelPath: "fields.reasoning" },
  "raw-model": { labelPath: "fields.rawModel" },
  skill: { labelPath: "fields.skill" },
  "skill-roots": { labelPath: "fields.skillRoots" },
  "validation-status": { labelPath: "fields.validationStatus" },
  "repair-rounds": { labelPath: "fields.repairRounds" },
  "validation-errors": { labelPath: "fields.validationErrors" },
  "run-error": { labelPath: "fields.runError" },
  "conversation-error": { labelPath: "fields.conversationError" },
  "conversation-state": { labelPath: "fields.conversationState" },
  "apply-result": { labelPath: "fields.applyResult" },
  "applied-at": { labelPath: "fields.appliedAt" },
  "dependency-status": { labelPath: "fields.dependencyStatus" },
  dependencies: { labelPath: "fields.dependencies" },
  "dependency-error": { labelPath: "fields.dependencyError" },
  "revision-count": { labelPath: "fields.revisionCount" },
  "repair-round": { labelPath: "fields.repairRound" },
  "replacement-reason": { labelPath: "fields.replacementReason" },
  "candidate-preview": { labelPath: "fields.candidatePreview" },
  logs: { labelPath: "fields.logs" },
  "result-json": { labelPath: "details.resultJson" },
} as const;

export type AssistantWorkspaceDetailsFieldId =
  keyof typeof ASSISTANT_WORKSPACE_DETAILS_FIELD_REGISTRY;

export type AssistantWorkspaceOwnerDetails = {
  status: "ready" | "failed";
  title: string;
  subtitle: string | null;
  sections: Array<{
    sectionId: AssistantWorkspaceDetailsSectionId;
    collapsed: boolean;
    items: Array<{
      fieldId: AssistantWorkspaceDetailsFieldId;
      value: string;
      format: "text" | "path" | "code" | "json";
    }>;
  }>;
  actions: Array<"copy-id" | "copy-diagnostics" | "open-workspace">;
  error: { code: string; message: string } | null;
};

export type AssistantWorkspacePublicationPayload =
  | AssistantWorkspaceServiceStatus
  | AssistantWorkspaceOwnerControl
  | AssistantWorkspaceMessageCounts
  | AssistantWorkspaceOwnerNavigation
  | AssistantWorkspacePlan
  | AssistantWorkspacePermission
  | AssistantWorkspaceComposer
  | AssistantWorkspaceOwnerPresentation
  | AssistantWorkspaceOwnerDetails
  | AssistantWorkspaceTranscriptRegion
  | AssistantWorkspaceTranscriptDelta;

export type AssistantWorkspacePublicationPayloadByKind = {
  "owner-navigation": AssistantWorkspaceOwnerNavigation;
  "service-status": AssistantWorkspaceServiceStatus;
  "owner-control": AssistantWorkspaceOwnerControl;
  "message-counts": AssistantWorkspaceMessageCounts;
  transcript:
    | AssistantWorkspaceTranscriptRegion
    | AssistantWorkspaceTranscriptDelta;
  plan: AssistantWorkspacePlan;
  permission: AssistantWorkspacePermission;
  composer: AssistantWorkspaceComposer;
  "owner-presentation": AssistantWorkspaceOwnerPresentation;
  "owner-details": AssistantWorkspaceOwnerDetails;
};

export type AssistantWorkspaceRegionScope = "source" | "owner";
export type AssistantWorkspaceManagedRegion =
  | "navigation"
  | "services"
  | "toolbar"
  | "banner"
  | "message-counts"
  | "transcript"
  | "plan"
  | "hint"
  | "permission"
  | "composer"
  | "context-drawer"
  | "details-drawer";

export const ASSISTANT_WORKSPACE_REGION_REGISTRY = {
  "owner-navigation": {
    scope: "source",
    form: "region",
    browserStateKey: "navigation",
    managedRegions: ["navigation", "banner", "context-drawer"],
    sources: ["acp-chat", "acp-skills"],
  },
  "service-status": {
    scope: "source",
    form: "region",
    browserStateKey: "services",
    managedRegions: ["services", "banner"],
    sources: ["acp-chat", "acp-skills"],
  },
  "owner-control": {
    scope: "owner",
    form: "region",
    browserStateKey: "control",
    managedRegions: ["toolbar", "banner", "hint", "composer"],
    sources: ["acp-chat", "acp-skills"],
  },
  "message-counts": {
    scope: "owner",
    form: "region",
    browserStateKey: "messageCounts",
    managedRegions: ["message-counts"],
    sources: ["acp-chat", "acp-skills"],
  },
  transcript: {
    scope: "owner",
    form: "transcript",
    browserStateKey: "transcript",
    managedRegions: ["transcript"],
    sources: ["acp-chat", "acp-skills"],
  },
  plan: {
    scope: "owner",
    form: "region",
    browserStateKey: "plan",
    managedRegions: ["plan"],
    sources: ["acp-chat", "acp-skills"],
  },
  permission: {
    scope: "owner",
    form: "region",
    browserStateKey: "permission",
    managedRegions: ["hint", "permission", "composer"],
    sources: ["acp-chat", "acp-skills"],
  },
  composer: {
    scope: "owner",
    form: "region",
    browserStateKey: "composer",
    managedRegions: ["composer"],
    sources: ["acp-chat", "acp-skills"],
  },
  "owner-presentation": {
    scope: "owner",
    form: "region",
    browserStateKey: "presentation",
    managedRegions: ["banner"],
    sources: ["acp-chat", "acp-skills"],
  },
  "owner-details": {
    scope: "owner",
    form: "region",
    browserStateKey: "details",
    managedRegions: ["details-drawer"],
    sources: ["acp-chat", "acp-skills"],
  },
} as const satisfies Record<
  AssistantWorkspacePublicationKind,
  {
    scope: AssistantWorkspaceRegionScope;
    form: "region" | "transcript";
    browserStateKey: string;
    managedRegions: readonly AssistantWorkspaceManagedRegion[];
    sources: readonly AssistantWorkspacePublicationSource[];
  }
>;

export const ASSISTANT_WORKSPACE_PUBLICATION_KINDS = Object.freeze(
  Object.keys(
    ASSISTANT_WORKSPACE_REGION_REGISTRY,
  ) as AssistantWorkspacePublicationKind[],
);

export type AssistantWorkspaceSelectionPhase =
  | "idle"
  | "loading"
  | "ready"
  | "failed";

export type AssistantWorkspaceCanonicalBrowserState = {
  source: AssistantWorkspacePublicationSource;
  navigation: AssistantWorkspaceOwnerNavigation;
  services: AssistantWorkspaceServiceStatus;
  selection: {
    owner: AssistantWorkspaceOwner | null;
    phase: AssistantWorkspaceSelectionPhase;
    control: AssistantWorkspaceOwnerControl | null;
    messageCounts: AssistantWorkspaceMessageCounts | null;
    transcript: AssistantWorkspaceTranscriptRegion;
    plan: AssistantWorkspacePlan | null;
    permission: AssistantWorkspacePermission | null;
    composer: AssistantWorkspaceComposer | null;
    presentation: AssistantWorkspaceOwnerPresentation | null;
    details: AssistantWorkspaceOwnerDetails | null;
  };
};

type AssistantWorkspacePublicationCommon = {
  schema: typeof ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA;
  publicationId: string;
  owner: AssistantWorkspacePublicationOwner;
  publicationCause: AssistantWorkspacePublicationCause;
  regionRevision: number;
  deliverySequence: number;
};

type AssistantWorkspaceTranscriptPublication =
  AssistantWorkspacePublicationCommon &
    (
      | {
          publicationKind: "transcript";
          publicationForm: "snapshot";
          payload: AssistantWorkspaceTranscriptRegion;
        }
      | {
          publicationKind: "transcript";
          publicationForm: "delta";
          payload: AssistantWorkspaceTranscriptDelta;
        }
    );

type AssistantWorkspaceNonTranscriptPublication = {
  [K in Exclude<
    AssistantWorkspacePublicationKind,
    "transcript"
  >]: AssistantWorkspacePublicationCommon & {
    publicationKind: K;
    publicationForm: "region";
    payload: AssistantWorkspacePublicationPayloadByKind[K];
  };
}[Exclude<AssistantWorkspacePublicationKind, "transcript">];

export type AssistantWorkspacePublication =
  | AssistantWorkspaceTranscriptPublication
  | AssistantWorkspaceNonTranscriptPublication;

type AssistantWorkspaceOwnedRegionDomainChange = {
  [K in Exclude<
    AssistantWorkspacePublicationKind,
    "transcript" | "owner-navigation" | "service-status"
  >]: {
    owner: AssistantWorkspaceOwner;
    kind: K;
    cause: AssistantWorkspacePublicationCause;
    payload: AssistantWorkspacePublicationPayloadByKind[K];
    force?: boolean;
  };
}[Exclude<
  AssistantWorkspacePublicationKind,
  "transcript" | "owner-navigation" | "service-status"
>];

export type AssistantWorkspaceDomainChange =
  | AssistantWorkspaceOwnedRegionDomainChange
  | {
      owner: AssistantWorkspacePublicationOwner;
      kind: "owner-navigation" | "service-status";
      cause: AssistantWorkspacePublicationCause;
      payload:
        | AssistantWorkspaceOwnerNavigation
        | AssistantWorkspaceServiceStatus;
      force?: boolean;
    }
  | {
      owner: AssistantWorkspaceOwner;
      kind: "transcript";
      cause: Exclude<AssistantWorkspacePublicationCause, "steady-state">;
      transcript: {
        form: "snapshot";
        region: AssistantWorkspaceTranscriptRegion;
      };
      force?: boolean;
    }
  | {
      owner: AssistantWorkspaceOwner;
      kind: "transcript";
      cause: "steady-state";
      transcript: {
        form: "mutations";
        events: readonly AssistantWorkspaceTranscriptMutationEvent[];
        sourceEventSeq: number;
        visibility: "live" | "boundary" | "silent";
      };
    };

export type AssistantWorkspacePublicationLifecycle = {
  publicationId: string;
  state: "pending" | "render-complete" | "rejected";
  reason: AssistantWorkspacePublicationAck["reason"];
  failure: AssistantWorkspacePublicationAck["failure"];
};

export type AssistantWorkspacePublicationBarrier = {
  source: AssistantWorkspacePublicationSource;
  publicationId: string;
  deliverySequence: number;
};

export type AssistantWorkspaceDomainMapping = Record<
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationKind | "not-applicable"
>;

export const ACP_CHAT_WORKSPACE_DOMAIN_MAPPING = {
  "owner-navigation": "owner-navigation",
  "service-status": "service-status",
  "owner-control": "owner-control",
  "message-counts": "message-counts",
  transcript: "transcript",
  plan: "plan",
  permission: "permission",
  composer: "composer",
  "owner-presentation": "owner-presentation",
  "owner-details": "owner-details",
} satisfies AssistantWorkspaceDomainMapping;

export const ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING = {
  "owner-navigation": "owner-navigation",
  "service-status": "service-status",
  "owner-control": "owner-control",
  "message-counts": "message-counts",
  transcript: "transcript",
  plan: "plan",
  permission: "permission",
  composer: "composer",
  "owner-presentation": "owner-presentation",
  "owner-details": "owner-details",
} satisfies AssistantWorkspaceDomainMapping;

export function createAcpChatWorkspaceOwner(
  backendIdRaw: unknown,
  conversationIdRaw: unknown,
): Extract<AssistantWorkspaceOwner, { source: "acp-chat" }> {
  const backendId = String(backendIdRaw || "").trim();
  const conversationId = String(conversationIdRaw || "").trim();
  if (!backendId || !conversationId) {
    throw new Error("assistant-workspace-chat-owner-required");
  }
  return {
    source: "acp-chat",
    ownerKey: `${backendId}\n${conversationId}`,
    backendId,
    conversationId,
  };
}

export function createAcpSkillsWorkspaceOwner(
  requestIdRaw: unknown,
): Extract<AssistantWorkspaceOwner, { source: "acp-skills" }> {
  const requestId = String(requestIdRaw || "").trim();
  if (!requestId) {
    throw new Error("assistant-workspace-skills-owner-required");
  }
  return { source: "acp-skills", ownerKey: requestId, requestId };
}

export function createAssistantWorkspaceUnownedScope(
  source: AssistantWorkspacePublicationSource,
): AssistantWorkspaceUnownedScope {
  return { source, ownerKey: null };
}

export function createIdleTranscriptRegion(): AssistantWorkspaceTranscriptRegion {
  return {
    owner: null,
    status: "idle",
    error: null,
    page: null,
    transcriptRevision: 0,
  };
}

export function createLoadingTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  transcriptRevision = 0,
): AssistantWorkspaceTranscriptRegion {
  return {
    owner,
    status: "loading",
    error: null,
    page: null,
    transcriptRevision,
  };
}

export function createReadyTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  page: AssistantWorkspaceTranscriptPage,
  transcriptRevision: number,
): AssistantWorkspaceTranscriptRegion {
  return { owner, status: "ready", error: null, page, transcriptRevision };
}

export function createFailedTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  error: { code: string; message: string },
  transcriptRevision = 0,
): AssistantWorkspaceTranscriptRegion {
  return {
    owner,
    status: "failed",
    error,
    page: null,
    transcriptRevision,
  };
}

export function assertAssistantWorkspacePublication(
  value: unknown,
): asserts value is AssistantWorkspacePublication {
  assertWireValue(value, "publication");
  const publication = value as Partial<AssistantWorkspacePublication>;
  assertExactObjectKeys(
    publication,
    ASSISTANT_WORKSPACE_PUBLICATION_ENVELOPE_KEYS,
    "assistant-workspace-publication-envelope",
  );
  if (publication.schema !== ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA) {
    throw new Error("assistant-workspace-publication-schema");
  }
  if (!String(publication.publicationId || "").trim()) {
    throw new Error("assistant-workspace-publication-id");
  }
  if (!publication.owner) {
    throw new Error("assistant-workspace-publication-owner");
  }
  const owner = publication.owner;
  if (owner.source !== "acp-chat" && owner.source !== "acp-skills") {
    throw new Error("assistant-workspace-publication-owner-source");
  }
  const unowned = owner.ownerKey === null;
  if (unowned) {
    assertExactObjectKeys(
      owner,
      ["source", "ownerKey"],
      "assistant-workspace-publication-owner-invariant",
    );
  } else if (owner.source === "acp-chat") {
    if (
      !("backendId" in owner) ||
      !owner.backendId ||
      !owner.conversationId ||
      owner.ownerKey !== `${owner.backendId}\n${owner.conversationId}`
    ) {
      throw new Error("assistant-workspace-publication-owner-invariant");
    }
  } else if (
    !("requestId" in owner) ||
    !owner.requestId ||
    owner.ownerKey !== owner.requestId
  ) {
    throw new Error("assistant-workspace-publication-owner-invariant");
  }
  if (
    !publication.publicationKind ||
    !Object.prototype.hasOwnProperty.call(
      ASSISTANT_WORKSPACE_REGION_REGISTRY,
      publication.publicationKind,
    )
  ) {
    throw new Error("assistant-workspace-publication-kind");
  }
  if (
    !(
      ASSISTANT_WORKSPACE_REGION_REGISTRY[publication.publicationKind]
        .sources as readonly AssistantWorkspacePublicationSource[]
    ).includes(owner.source)
  ) {
    throw new Error("assistant-workspace-publication-kind-not-applicable");
  }
  if (
    !publication.publicationForm ||
    !["region", "snapshot", "delta"].includes(publication.publicationForm)
  ) {
    throw new Error("assistant-workspace-publication-form");
  }
  if (
    publication.publicationKind !== "transcript" &&
    publication.publicationForm !== "region"
  ) {
    throw new Error("assistant-workspace-publication-form-kind");
  }
  if (
    !publication.publicationCause ||
    ![
      "initialization",
      "activation",
      "owner-switch",
      "page-request",
      "steady-state",
      "rebase",
      "diagnostic",
    ].includes(publication.publicationCause)
  ) {
    throw new Error("assistant-workspace-publication-cause");
  }
  if (
    !Number.isInteger(publication.regionRevision) ||
    Number(publication.regionRevision) <= 0 ||
    !Number.isInteger(publication.deliverySequence) ||
    Number(publication.deliverySequence) <= 0
  ) {
    throw new Error("assistant-workspace-publication-revision");
  }
  const validUnownedTranscript =
    publication.publicationKind === "transcript" &&
    publication.publicationForm === "snapshot" &&
    publication.payload &&
    "status" in publication.payload &&
    publication.payload.status === "idle";
  const validUnownedNavigation =
    publication.publicationKind === "owner-navigation" &&
    publication.publicationForm === "region";
  const validUnownedService =
    publication.publicationKind === "service-status" &&
    publication.publicationForm === "region";
  if (
    unowned &&
    !validUnownedTranscript &&
    !validUnownedNavigation &&
    !validUnownedService
  ) {
    throw new Error("assistant-workspace-publication-unowned-scope");
  }
  assertPublicationPayloadInvariant(
    publication.publicationKind,
    publication.publicationForm,
    publication.payload,
  );
}

function assertPublicationPayloadInvariant(
  kind: AssistantWorkspacePublicationKind,
  form: AssistantWorkspacePublicationForm,
  payload: AssistantWorkspacePublicationPayload | undefined,
) {
  if (kind === "transcript") {
    if (form === "snapshot") {
      assertExactObjectKeys(
        payload,
        ASSISTANT_WORKSPACE_TRANSCRIPT_SNAPSHOT_KEYS,
        "assistant-workspace-transcript-region",
      );
      assertTranscriptRegionInvariant(payload);
      return;
    }
    if (form === "delta") {
      assertExactObjectKeys(
        payload,
        ASSISTANT_WORKSPACE_TRANSCRIPT_DELTA_KEYS,
        "assistant-workspace-transcript-delta",
      );
      if (
        !Array.isArray((payload as AssistantWorkspaceTranscriptDelta).mutations)
      ) {
        throw new Error("assistant-workspace-transcript-delta-mutations");
      }
      return;
    }
    throw new Error("assistant-workspace-transcript-form");
  }
  assertExactObjectKeys(
    payload,
    ASSISTANT_WORKSPACE_PUBLICATION_PAYLOAD_KEYS[kind],
    `assistant-workspace-${kind}-payload`,
  );
  if (kind === "owner-control") {
    const baseline = payload as AssistantWorkspaceOwnerControl;
    assertExactObjectKeys(
      baseline.hint,
      ["kind", "message"],
      "assistant-workspace-owner-control-hint",
    );
    if (
      baseline.interaction !== null &&
      !parseAssistantPendingInteraction(baseline.interaction)
    ) {
      throw new Error("assistant-workspace-owner-control-interaction");
    }
    if (
      ![
        "hidden",
        "auth",
        "running",
        "repairing",
        "waiting_user",
        "completed",
        "canceled",
        "disconnected",
        "error",
        "notice",
      ].includes(baseline.hint.kind)
    ) {
      throw new Error("assistant-workspace-owner-control-hint-kind");
    }
    assertExactObjectKeys(
      baseline.connection,
      [
        "status",
        "sessionAvailable",
        "connected",
        "canConnect",
        "canDisconnect",
      ],
      "assistant-workspace-owner-control-connection",
    );
    assertExactObjectKeys(
      baseline.execution,
      ["canCancel", "canInterrupt"],
      "assistant-workspace-owner-control-execution",
    );
    assertExactObjectKeys(
      baseline.authentication,
      ["required", "canAuthenticate", "methodId"],
      "assistant-workspace-owner-control-authentication",
    );
    assertExactObjectKeys(
      baseline.permissionPolicy,
      ["autoApprove", "canSetAutoApprove"],
      "assistant-workspace-owner-control-permission-policy",
    );
  }
  if (kind === "owner-navigation") {
    const navigation = payload as AssistantWorkspaceOwnerNavigation;
    for (const group of navigation.groups) {
      assertExactObjectKeys(
        group,
        ["groupId", "label", "status"],
        "assistant-workspace-owner-navigation-group",
      );
    }
    for (const entry of navigation.entries) {
      assertExactObjectKeys(
        entry,
        [
          "owner",
          "groupId",
          "label",
          "subtitle",
          "description",
          "groupLabel",
          "status",
          "backendStatus",
          "applyState",
          "attention",
          "updatedAt",
          "messageCount",
        ],
        "assistant-workspace-owner-navigation-entry",
      );
    }
  }
  if (kind === "service-status") {
    for (const item of (payload as AssistantWorkspaceServiceStatus).items) {
      assertExactObjectKeys(
        item,
        ["serviceId", "label", "status", "available", "message"],
        "assistant-workspace-service-status-item",
      );
      if (!["acp-connection", "host-bridge"].includes(item.serviceId)) {
        throw new Error("assistant-workspace-service-status-id");
      }
    }
  }
  if (kind === "plan") {
    for (const item of (payload as AssistantWorkspacePlan).items) {
      assertExactObjectKeys(
        item,
        ["itemId", "content", "priority", "status"],
        "assistant-workspace-plan-item",
      );
    }
  }
  if (kind === "permission") {
    const request = (payload as AssistantWorkspacePermission).request;
    if (request) {
      assertExactObjectKeys(
        request,
        ASSISTANT_WORKSPACE_PERMISSION_REQUEST_KEYS,
        "assistant-workspace-permission-request",
      );
      if (!["acp-tool", "zotero-write"].includes(request.approvalKind)) {
        throw new Error("assistant-workspace-permission-kind");
      }
      assertExactObjectKeys(
        request.tool,
        ["title", "callId"],
        "assistant-workspace-permission-tool",
      );
      assertExactObjectKeys(
        request.review,
        ["requestedAt", "command", "preview"],
        "assistant-workspace-permission-review",
      );
      for (const option of request.options) {
        assertExactObjectKeys(
          option,
          ["optionId", "label", "description"],
          "assistant-workspace-permission-option",
        );
      }
    }
  }
  if (kind === "composer") {
    const composer = payload as AssistantWorkspaceComposer;
    assertExactObjectKeys(
      composer.reply,
      ["status"],
      "assistant-workspace-composer-reply",
    );
    if (
      !["enabled", "disabled", "busy", "cancelling"].includes(
        composer.reply.status,
      )
    ) {
      throw new Error("assistant-workspace-composer-reply-status");
    }
    assertExactObjectKeys(
      composer.runtimeOptions,
      ["mode", "model", "reasoningEffort"],
      "assistant-workspace-composer-options",
    );
    for (const group of [
      composer.runtimeOptions.mode,
      composer.runtimeOptions.model,
      composer.runtimeOptions.reasoningEffort,
    ]) {
      assertExactObjectKeys(
        group,
        ["selectedOptionId", "options", "enabled"],
        "assistant-workspace-option-group",
      );
      for (const option of group.options) {
        assertExactObjectKeys(
          option,
          ["optionId", "label", "description"],
          "assistant-workspace-option",
        );
      }
    }
  }
  if (kind === "owner-presentation") {
    const presentation = payload as AssistantWorkspaceOwnerPresentation;
    if (presentation.notice) {
      assertExactObjectKeys(
        presentation.notice,
        ["tone", "text"],
        "assistant-workspace-owner-presentation-notice",
      );
      if (
        !["info", "warning", "danger"].includes(presentation.notice.tone) ||
        !String(presentation.notice.text || "").trim()
      ) {
        throw new Error("assistant-workspace-owner-presentation-notice");
      }
    }
    if (presentation.usage) {
      assertExactObjectKeys(
        presentation.usage,
        ["used", "limit", "costText"],
        "assistant-workspace-owner-presentation-usage",
      );
    }
    for (const item of presentation.metadata) {
      assertExactObjectKeys(
        item,
        ["fieldId", "value"],
        "assistant-workspace-owner-presentation-item",
      );
      assertAssistantWorkspacePresentationField(item.fieldId);
    }
  }
  if (kind === "owner-details") {
    const details = payload as AssistantWorkspaceOwnerDetails;
    if (!["ready", "failed"].includes(details.status)) {
      throw new Error("assistant-workspace-owner-details-status");
    }
    if (details.error) {
      assertExactObjectKeys(
        details.error,
        ["code", "message"],
        "assistant-workspace-owner-details-error",
      );
    }
    for (const section of details.sections) {
      assertExactObjectKeys(
        section,
        ["sectionId", "collapsed", "items"],
        "assistant-workspace-owner-details-section",
      );
      if (
        !(section.sectionId in ASSISTANT_WORKSPACE_DETAILS_SECTION_REGISTRY)
      ) {
        throw new Error("assistant-workspace-owner-details-section");
      }
      for (const item of section.items) {
        assertExactObjectKeys(
          item,
          ["fieldId", "value", "format"],
          "assistant-workspace-owner-details-item",
        );
        if (!(item.fieldId in ASSISTANT_WORKSPACE_DETAILS_FIELD_REGISTRY)) {
          throw new Error("assistant-workspace-owner-details-field");
        }
        if (!["text", "path", "code", "json"].includes(item.format)) {
          throw new Error("assistant-workspace-owner-details-format");
        }
      }
    }
    for (const action of details.actions) {
      if (!["copy-id", "copy-diagnostics", "open-workspace"].includes(action)) {
        throw new Error("assistant-workspace-owner-details-action");
      }
    }
  }
}

function assertAssistantWorkspacePresentationField(value: unknown) {
  if (
    !String(value || "").trim() ||
    !(String(value) in ASSISTANT_WORKSPACE_PRESENTATION_FIELD_REGISTRY)
  ) {
    throw new Error("assistant-workspace-owner-presentation-field");
  }
}

function assertExactObjectKeys(
  value: unknown,
  expectedKeys: readonly string[],
  errorCode: string,
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorCode);
  }
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new Error(errorCode);
  }
}

export function assertAssistantWorkspacePublicationAck(
  value: unknown,
): asserts value is AssistantWorkspacePublicationAck {
  assertWireValue(value, "ack");
  const ack = value as Partial<AssistantWorkspacePublicationAck>;
  assertExactObjectKeys(
    ack,
    ["publicationId", "stage", "outcome", "reason", "failure"],
    "assistant-workspace-publication-ack-envelope",
  );
  if (!String(ack.publicationId || "").trim()) {
    throw new Error("assistant-workspace-publication-ack-id");
  }
  if (
    !ack.stage ||
    ![
      "shell-receive",
      "shell-forward",
      "child-apply",
      "render-complete",
    ].includes(ack.stage)
  ) {
    throw new Error("assistant-workspace-publication-ack-stage");
  }
  if (ack.outcome !== "accepted" && ack.outcome !== "rejected") {
    throw new Error("assistant-workspace-publication-ack-outcome");
  }
  if (
    ack.reason !== null &&
    ![
      "old-owner",
      "stale",
      "gap",
      "superseded",
      "invalid",
      "render-failed",
    ].includes(String(ack.reason))
  ) {
    throw new Error("assistant-workspace-publication-ack-reason");
  }
  if (ack.failure !== null) {
    assertExactObjectKeys(
      ack.failure,
      ["stage", "code"],
      "assistant-workspace-publication-ack-failure",
    );
    if (
      ![
        "projection",
        "toolbar",
        "banner",
        "message-counts",
        "transcript",
        "plan",
        "permission",
        "composer",
        "context-drawer",
        "details-drawer",
      ].includes(String(ack.failure?.stage)) ||
      ![
        "module-missing",
        "bridge-missing",
        "projection-failed",
        "render-failed",
        "effect-invalid",
        "container-missing",
        "node-map-missing",
        "page-items-missing",
        "page-invalid",
        "virtual-reconcile-failed",
        "row-reconcile-failed",
        "dom-commit-failed",
      ].includes(String(ack.failure?.code))
    ) {
      throw new Error("assistant-workspace-publication-ack-failure");
    }
  }
}

function assertWireValue(value: unknown, path: string): void {
  if (value === undefined) throw new Error(`undefined-wire-value:${path}`);
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertWireValue(entry, `${path}[${index}]`),
    );
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    if (ASSISTANT_WORKSPACE_FORBIDDEN_WIRE_FIELDS.has(key)) {
      throw new Error(`forbidden-wire-field:${key}`);
    }
    assertWireValue(entry, `${path}.${key}`);
  }
}

function assertTranscriptRegionInvariant(
  payload: AssistantWorkspacePublicationPayload | undefined,
) {
  if (!payload || !("status" in payload) || !("transcriptRevision" in payload))
    return;
  const region = payload as AssistantWorkspaceTranscriptRegion;
  const valid =
    (region.status === "idle" &&
      region.owner === null &&
      region.page === null &&
      region.error === null) ||
    (region.status === "loading" &&
      region.owner !== null &&
      region.page === null &&
      region.error === null) ||
    (region.status === "ready" &&
      region.owner !== null &&
      region.page !== null &&
      region.error === null) ||
    (region.status === "failed" &&
      region.owner !== null &&
      region.page === null &&
      region.error !== null);
  if (!valid)
    throw new Error("assistant-workspace-transcript-region-invariant");
}
