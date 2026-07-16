import type { AssistantMessageCountsSnapshot } from "./assistantMessageCounts";
import type {
  AssistantWorkspaceTranscriptDelta,
  AssistantWorkspaceTranscriptPage,
  AssistantWorkspaceTranscriptRegion,
  AssistantWorkspaceTranscriptResync,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistantWorkspaceTranscriptPublication";

export const ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA =
  "zotero-agents.assistant-workspace-publication.v3" as const;

export type AssistantWorkspacePublicationSource = "acp-chat" | "acp-skills";

export type AssistantWorkspacePublicationKind =
  | "baseline-status"
  | "message-counts"
  | "transcript"
  | "plan"
  | "permission"
  | "reply-hint"
  | "context-details";

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

export type AssistantWorkspacePublicationForm =
  | "region"
  | "snapshot"
  | "delta"
  | "resync-required";

export type AssistantWorkspacePublicationCause =
  | "initialization"
  | "activation"
  | "owner-switch"
  | "page-request"
  | "steady-state"
  | "rebase"
  | "diagnostic";

export type AssistantWorkspaceBaselineStatus = {
  status: string;
  busy: boolean;
  message: string | null;
};

export type AssistantWorkspaceMessageCounts = {
  counts: AssistantMessageCountsSnapshot | null;
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

export type AssistantWorkspaceReply = {
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

export type AssistantWorkspaceContextDetails = {
  context: Array<{ itemId: string; label: string; value: string }>;
  details: Array<{ itemId: string; label: string; value: string }>;
};

export type AssistantWorkspacePublicationPayload =
  | AssistantWorkspaceBaselineStatus
  | AssistantWorkspaceMessageCounts
  | AssistantWorkspacePlan
  | AssistantWorkspacePermission
  | AssistantWorkspaceReply
  | AssistantWorkspaceContextDetails
  | AssistantWorkspaceTranscriptRegion
  | AssistantWorkspaceTranscriptDelta
  | AssistantWorkspaceTranscriptResync;

export type AssistantWorkspacePublicationPayloadByKind = {
  "baseline-status": AssistantWorkspaceBaselineStatus;
  "message-counts": AssistantWorkspaceMessageCounts;
  transcript:
    | AssistantWorkspaceTranscriptRegion
    | AssistantWorkspaceTranscriptDelta
    | AssistantWorkspaceTranscriptResync;
  plan: AssistantWorkspacePlan;
  permission: AssistantWorkspacePermission;
  "reply-hint": AssistantWorkspaceReply;
  "context-details": AssistantWorkspaceContextDetails;
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
      | {
          publicationKind: "transcript";
          publicationForm: "resync-required";
          payload: AssistantWorkspaceTranscriptResync;
        }
    );

type AssistantWorkspaceNonTranscriptPublication = {
  [K in Exclude<
    AssistantWorkspacePublicationKind,
    "transcript"
  >]: AssistantWorkspacePublicationCommon & {
    publicationKind: K;
    publicationForm: "region" | "snapshot";
    payload: AssistantWorkspacePublicationPayloadByKind[K];
  };
}[Exclude<AssistantWorkspacePublicationKind, "transcript">];

export type AssistantWorkspacePublication =
  | AssistantWorkspaceTranscriptPublication
  | AssistantWorkspaceNonTranscriptPublication;

type AssistantWorkspaceRegionDomainChange = {
  [K in Exclude<AssistantWorkspacePublicationKind, "transcript">]: {
    owner: AssistantWorkspaceOwner;
    kind: K;
    cause: AssistantWorkspacePublicationCause;
    payload: AssistantWorkspacePublicationPayloadByKind[K];
    force?: boolean;
  };
}[Exclude<AssistantWorkspacePublicationKind, "transcript">];

export type AssistantWorkspaceDomainChange =
  | AssistantWorkspaceRegionDomainChange
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
        events: AssistantWorkspaceTranscriptMutationEvent[];
        eventSeq: number;
        totalItemCount: number;
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
};

export type AssistantWorkspacePublicationLifecycle = {
  publicationId: string;
  state: "pending" | "render-complete" | "rejected";
  reason: AssistantWorkspacePublicationAck["reason"];
};

export type AssistantWorkspacePublicationBarrier = {
  source: AssistantWorkspacePublicationSource;
  tab: AssistantWorkspacePublicationSource;
  publicationId: string;
  deliverySequence: number;
};

export type AssistantWorkspaceDomainMapping = Record<
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationKind | "not-applicable"
>;

export const ACP_CHAT_WORKSPACE_DOMAIN_MAPPING = {
  "baseline-status": "baseline-status",
  "message-counts": "message-counts",
  transcript: "transcript",
  plan: "plan",
  permission: "permission",
  "reply-hint": "reply-hint",
  "context-details": "context-details",
} satisfies AssistantWorkspaceDomainMapping;

export const ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING = {
  "baseline-status": "baseline-status",
  "message-counts": "message-counts",
  transcript: "transcript",
  plan: "not-applicable",
  permission: "permission",
  "reply-hint": "reply-hint",
  "context-details": "context-details",
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
    uiRevision: 0,
  };
}

export function createLoadingTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  uiRevision = 0,
): AssistantWorkspaceTranscriptRegion {
  return { owner, status: "loading", error: null, page: null, uiRevision };
}

export function createReadyTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  page: AssistantWorkspaceTranscriptPage,
  uiRevision: number,
): AssistantWorkspaceTranscriptRegion {
  return { owner, status: "ready", error: null, page, uiRevision };
}

export function createFailedTranscriptRegion(
  owner: AssistantWorkspaceOwner,
  error: { code: string; message: string },
  uiRevision = 0,
): AssistantWorkspaceTranscriptRegion {
  return { owner, status: "failed", error, page: null, uiRevision };
}

const forbiddenWireFields = new Set([
  "selectedTranscript",
  "selectedTranscriptPage",
  "transcriptState",
  "transcriptRevision",
  "deliveryRevision",
  "initialization",
  "tab",
]);

export function assertAssistantWorkspacePublication(
  value: unknown,
): asserts value is AssistantWorkspacePublication {
  assertWireValue(value, "publication");
  const publication = value as Partial<AssistantWorkspacePublication>;
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
      ACP_CHAT_WORKSPACE_DOMAIN_MAPPING,
      publication.publicationKind,
    )
  ) {
    throw new Error("assistant-workspace-publication-kind");
  }
  if (
    owner.source === "acp-skills" &&
    ACP_SKILLS_WORKSPACE_DOMAIN_MAPPING[publication.publicationKind] ===
      "not-applicable"
  ) {
    throw new Error("assistant-workspace-publication-kind-not-applicable");
  }
  if (
    !publication.publicationForm ||
    !["region", "snapshot", "delta", "resync-required"].includes(
      publication.publicationForm,
    )
  ) {
    throw new Error("assistant-workspace-publication-form");
  }
  if (
    publication.publicationKind !== "transcript" &&
    (publication.publicationForm === "delta" ||
      publication.publicationForm === "resync-required")
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
  if (
    unowned &&
    !(
      publication.publicationKind === "transcript" &&
      publication.publicationForm === "snapshot" &&
      publication.payload &&
      "status" in publication.payload &&
      publication.payload.status === "idle"
    )
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
        ["owner", "status", "error", "page", "uiRevision"],
        "assistant-workspace-transcript-region",
      );
      assertTranscriptRegionInvariant(payload);
      return;
    }
    if (form === "delta") {
      assertExactObjectKeys(
        payload,
        ["page", "baseUiRevision", "uiRevision", "mutations"],
        "assistant-workspace-transcript-delta",
      );
      if (
        !Array.isArray((payload as AssistantWorkspaceTranscriptDelta).mutations)
      ) {
        throw new Error("assistant-workspace-transcript-delta-mutations");
      }
      return;
    }
    if (form === "resync-required") {
      assertExactObjectKeys(
        payload,
        ["pageKey", "expectedUiRevision", "reason"],
        "assistant-workspace-transcript-resync",
      );
      if (
        !["gap", "overflow", "render-failed", "superseded"].includes(
          String((payload as AssistantWorkspaceTranscriptResync).reason || ""),
        )
      ) {
        throw new Error("assistant-workspace-transcript-resync-reason");
      }
      return;
    }
    throw new Error("assistant-workspace-transcript-form");
  }
  const keysByKind: Record<
    Exclude<AssistantWorkspacePublicationKind, "transcript">,
    readonly string[]
  > = {
    "baseline-status": ["status", "busy", "message"],
    "message-counts": ["counts"],
    plan: ["items"],
    permission: ["request"],
    "reply-hint": ["reply", "runtimeOptions"],
    "context-details": ["context", "details"],
  };
  assertExactObjectKeys(
    payload,
    keysByKind[kind],
    `assistant-workspace-${kind}-payload`,
  );
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
  if (!payload || !("status" in payload) || !("uiRevision" in payload)) return;
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
