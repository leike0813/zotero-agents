import type { AssistantMessageCountsSnapshot } from "./assistantMessageCounts";
import type {
  AssistantWorkspaceTranscriptDelta,
  AssistantWorkspaceTranscriptPage,
  AssistantWorkspaceTranscriptRegion,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistantWorkspaceTranscriptPublication";

export const ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA =
  "zotero-agents.assistant-workspace-publication.v6" as const;

export type AssistantWorkspacePublicationSource = "acp-chat" | "acp-skills";

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

export const ASSISTANT_WORKSPACE_PRESENTATION_SECTION_REGISTRY = {
  context: { labelPath: "details.conversationSummary" },
  connection: { labelPath: "fields.connection" },
  recovery: { labelPath: "fields.remoteRestore" },
  workspace: { labelPath: "details.paths" },
  session: { labelPath: "details.session" },
} as const;

export type AssistantWorkspacePresentationSectionId =
  keyof typeof ASSISTANT_WORKSPACE_PRESENTATION_SECTION_REGISTRY;

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
  "open-permission-request": {
    scope: "local",
    sources: ["acp-chat", "acp-skills"],
    payloadKeys: ["permissionRequest"],
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
  "reply-run": {
    scope: "selected-owner",
    sources: ["acp-skills"],
    payloadKeys: ["message"],
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

export type AssistantWorkspacePublicationKind =
  | "owner-navigation"
  | "service-status"
  | "owner-control"
  | "message-counts"
  | "transcript"
  | "plan"
  | "permission"
  | "composer"
  | "owner-presentation";

export type AssistantWorkspaceOwner =
  | {
      source: "acp-chat";
      ownerKey: string;
      backendId: string;
      conversationId: string;
    }
  | {
      source: "acp-skills";
      ownerKey: string;
      requestId: string;
    };

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
    serviceId: "host-bridge" | "zotero-mcp";
    label: string;
    status: string;
    available: boolean;
    message: string | null;
  }>;
};

export type AssistantWorkspaceOwnerControl = {
  status: string;
  busy: boolean;
  message: string | null;
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
};

export type AssistantWorkspaceMessageCounts = {
  counts: AssistantMessageCountsSnapshot | null;
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
  title: string;
  summary: string;
  options: Array<{
    optionId: string;
    label: string;
    description: string | null;
  }>;
};

export type AssistantWorkspacePermission = {
  request: AssistantWorkspacePermissionRequest | null;
};

export type AssistantWorkspaceComposer = {
  reply: {
    status: "enabled" | "disabled" | "busy";
    hint: string | null;
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
};

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
  sections: Array<{
    sectionId: AssistantWorkspacePresentationSectionId;
    items: Array<{
      fieldId: AssistantWorkspacePresentationFieldId;
      value: string;
    }>;
  }>;
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
  | "permission"
  | "composer"
  | "context-drawer"
  | "details-drawer";

export const ASSISTANT_WORKSPACE_REGION_REGISTRY = {
  "owner-navigation": {
    scope: "source",
    form: "region",
    browserStateKey: "navigation",
    managedRegions: ["navigation"],
    sources: ["acp-chat", "acp-skills"],
  },
  "service-status": {
    scope: "source",
    form: "region",
    browserStateKey: "services",
    managedRegions: ["services"],
    sources: ["acp-chat", "acp-skills"],
  },
  "owner-control": {
    scope: "owner",
    form: "region",
    browserStateKey: "control",
    managedRegions: ["toolbar"],
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
    sources: ["acp-chat"],
  },
  permission: {
    scope: "owner",
    form: "region",
    browserStateKey: "permission",
    managedRegions: ["permission"],
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
    managedRegions: ["banner", "context-drawer", "details-drawer"],
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

export type AssistantWorkspacePublicationAckStage =
  | "shell-receive"
  | "shell-forward"
  | "child-apply"
  | "render-complete";

export type AssistantWorkspacePublicationAck = {
  publicationId: string;
  stage: AssistantWorkspacePublicationAckStage;
  outcome: "accepted" | "rejected";
  reason:
    | "old-owner"
    | "stale"
    | "gap"
    | "superseded"
    | "invalid"
    | "render-failed"
    | null;
  failure: {
    stage:
      | "projection"
      | "toolbar"
      | "banner"
      | "message-counts"
      | "transcript"
      | "plan"
      | "permission"
      | "composer"
      | "context-drawer"
      | "details-drawer";
    code:
      | "module-missing"
      | "bridge-missing"
      | "projection-failed"
      | "render-failed"
      | "effect-invalid"
      | "container-missing"
      | "node-map-missing"
      | "page-items-missing"
      | "page-invalid"
      | "virtual-reconcile-failed"
      | "row-reconcile-failed"
      | "dom-commit-failed";
  } | null;
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
} satisfies AssistantWorkspaceDomainMapping;

export const ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING = {
  "owner-navigation": "owner-navigation",
  "service-status": "service-status",
  "owner-control": "owner-control",
  "message-counts": "message-counts",
  transcript: "transcript",
  plan: "not-applicable",
  permission: "permission",
  composer: "composer",
  "owner-presentation": "owner-presentation",
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

const forbiddenWireFields = new Set([
  "regions",
  "selectedTranscript",
  "selectedTranscriptPage",
  "transcriptState",
  "transcriptRegion",
  "selectedRun",
  "selectedRequestId",
  "activeConversationId",
  "deliveryRevision",
  "initialization",
  "tab",
  "totalItemCount",
  "eventSeq",
  "uiRevision",
  "baseUiRevision",
]);

export function assertAssistantWorkspacePublication(
  value: unknown,
): asserts value is AssistantWorkspacePublication {
  assertWireValue(value, "publication");
  const publication = value as Partial<AssistantWorkspacePublication>;
  assertExactObjectKeys(
    publication,
    [
      "schema",
      "publicationId",
      "owner",
      "publicationKind",
      "publicationForm",
      "publicationCause",
      "regionRevision",
      "deliverySequence",
      "payload",
    ],
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
        ["owner", "status", "error", "page", "transcriptRevision"],
        "assistant-workspace-transcript-region",
      );
      assertTranscriptRegionInvariant(payload);
      return;
    }
    if (form === "delta") {
      assertExactObjectKeys(
        payload,
        ["page", "baseTranscriptRevision", "transcriptRevision", "mutations"],
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
  const keysByKind: Record<
    Exclude<AssistantWorkspacePublicationKind, "transcript">,
    readonly string[]
  > = {
    "owner-navigation": [
      "selectedOwner",
      "selectedGroupId",
      "groups",
      "entries",
      "canCreateOwner",
    ],
    "service-status": ["items"],
    "owner-control": ["status", "busy", "message", "connection", "execution"],
    "message-counts": ["counts"],
    plan: ["items"],
    permission: ["request"],
    composer: ["reply", "runtimeOptions"],
    "owner-presentation": [
      "title",
      "subtitle",
      "description",
      "notice",
      "metadata",
      "usage",
      "sections",
    ],
  };
  assertExactObjectKeys(
    payload,
    keysByKind[kind],
    `assistant-workspace-${kind}-payload`,
  );
  if (kind === "owner-control") {
    const baseline = payload as AssistantWorkspaceOwnerControl;
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
        ["requestId", "title", "summary", "options"],
        "assistant-workspace-permission-request",
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
      ["status", "hint"],
      "assistant-workspace-composer-reply",
    );
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
        ["selectedOptionId", "options"],
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
    for (const section of presentation.sections) {
      assertExactObjectKeys(
        section,
        ["sectionId", "items"],
        "assistant-workspace-owner-presentation-section",
      );
      if (
        !(
          section.sectionId in ASSISTANT_WORKSPACE_PRESENTATION_SECTION_REGISTRY
        )
      ) {
        throw new Error("assistant-workspace-owner-presentation-section");
      }
      for (const item of section.items) {
        assertExactObjectKeys(
          item,
          ["fieldId", "value"],
          "assistant-workspace-owner-presentation-item",
        );
        assertAssistantWorkspacePresentationField(item.fieldId);
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
    if (forbiddenWireFields.has(key)) {
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
