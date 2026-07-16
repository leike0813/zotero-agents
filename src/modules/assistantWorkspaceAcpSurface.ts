import type {
  AssistantWorkspaceDomainMapping,
  AssistantWorkspaceOwner,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationCause,
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationPayloadByKind,
} from "./assistantWorkspacePublication";
import {
  createAssistantWorkspaceUnownedScope,
  createIdleTranscriptRegion,
  createLoadingTranscriptRegion,
} from "./assistantWorkspacePublication";
import type { AssistantWorkspacePublicationCoordinator } from "./assistantWorkspacePublicationCoordinator";
import type {
  AssistantWorkspaceTranscriptMutationEvent,
  AssistantWorkspaceTranscriptRegion,
} from "./assistantWorkspaceTranscriptPublication";
import type { AssistantExecutionDisplayMode } from "./assistantExecutionDisplayPolicy";

export type AssistantWorkspaceAcpSurfaceConfiguration = {
  executionDisplayMode: AssistantExecutionDisplayMode;
  transcriptPaginationVirtualizationEnabled: boolean;
};

export type AssistantWorkspaceAcpSurfacePayloadByKind = Omit<
  AssistantWorkspacePublicationPayloadByKind,
  "transcript"
> & {
  transcript: AssistantWorkspaceTranscriptRegion;
};

export type AssistantWorkspaceAcpSurfaceReadOptions<TPageRequest> = {
  transcriptReadMode?: "loading-first" | "page-first";
  transcriptPage?: TPageRequest;
};

export type AssistantWorkspaceAcpSurfaceChange<
  TSource extends AssistantWorkspaceOwner["source"],
> = {
  owner: Extract<AssistantWorkspaceOwner, { source: TSource }> | null;
  targetsActiveOwner: boolean;
  publicationKinds: AssistantWorkspacePublicationKind[];
  transcript?: {
    events: readonly AssistantWorkspaceTranscriptMutationEvent[];
    sourceEventSeq: number;
    visibility: AssistantExecutionDisplayMode;
  };
};

export type AssistantWorkspaceAcpSurfaceAdapter<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
> = {
  source: TSource;
  domainMapping: AssistantWorkspaceDomainMapping;
  getActiveOwner: () => Extract<
    AssistantWorkspaceOwner,
    { source: TSource }
  > | null;
  readOwnerNavigation: () => Promise<AssistantWorkspaceOwnerNavigation>;
  mapChange: (
    change: TChange,
    context: TContext,
  ) => AssistantWorkspaceAcpSurfaceChange<TSource>;
  readPublication: <K extends AssistantWorkspacePublicationKind>(args: {
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    publicationKind: K;
    context: TContext;
    options?: AssistantWorkspaceAcpSurfaceReadOptions<TPageRequest>;
  }) => Promise<AssistantWorkspaceAcpSurfacePayloadByKind[K] | null>;
};

export function defineAssistantWorkspaceAcpSurfaceAdapter<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(
  adapter: AssistantWorkspaceAcpSurfaceAdapter<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >,
) {
  return adapter;
}

export type AssistantWorkspaceAcpSurfaceActivity =
  | "matching-target"
  | "opposite-active"
  | "inactive-source";

export type AssistantWorkspaceAcpSurfaceDropReason =
  | Exclude<AssistantWorkspaceAcpSurfaceActivity, "matching-target">
  | "owner-mismatch";

export type AssistantWorkspaceAcpSurfaceScheduleArgs<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
> = {
  adapter: AssistantWorkspaceAcpSurfaceAdapter<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >;
  coordinator: AssistantWorkspacePublicationCoordinator;
  change: TChange;
  context: TContext;
  activity: AssistantWorkspaceAcpSurfaceActivity;
  synchronizeOwner: (
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>,
  ) => boolean;
  initialize: (
    cause: Extract<
      AssistantWorkspacePublicationCause,
      "activation" | "owner-switch"
    >,
  ) => void;
  queueRegions: (
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>,
    kinds: Exclude<AssistantWorkspacePublicationKind, "transcript">[],
  ) => void;
  onRequested?: (args: {
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }> | null;
    kinds: readonly AssistantWorkspacePublicationKind[];
    causality: AssistantWorkspaceAcpSurfaceActivity | "owner-mismatch";
  }) => void;
  onDropped?: (args: {
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }> | null;
    kinds: readonly AssistantWorkspacePublicationKind[];
    reason: AssistantWorkspaceAcpSurfaceDropReason;
  }) => void;
};

export function scheduleAssistantWorkspaceAcpSurfaceChange<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(
  args: AssistantWorkspaceAcpSurfaceScheduleArgs<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >,
) {
  const mapped = args.adapter.mapChange(args.change, args.context);
  const activeOwner = args.adapter.getActiveOwner();
  const owner = mapped.owner || activeOwner;
  const ownerMatches =
    mapped.targetsActiveOwner &&
    !!owner &&
    !!activeOwner &&
    owner.ownerKey === activeOwner.ownerKey;
  const causality =
    args.activity === "matching-target" && !ownerMatches
      ? "owner-mismatch"
      : args.activity;
  args.onRequested?.({
    owner,
    kinds: mapped.publicationKinds,
    causality,
  });
  if (mapped.publicationKinds.length === 0) {
    return { status: "ignored" as const, owner, mapped };
  }
  if (args.activity !== "matching-target") {
    args.onDropped?.({
      owner,
      kinds: mapped.publicationKinds,
      reason: args.activity,
    });
    return { status: "dropped" as const, owner, mapped };
  }
  if (!owner || !ownerMatches) {
    if (!owner && mapped.publicationKinds.includes("owner-navigation")) {
      args.initialize("activation");
      return { status: "initializing" as const, owner, mapped };
    }
    args.onDropped?.({
      owner,
      kinds: mapped.publicationKinds,
      reason: "owner-mismatch",
    });
    return { status: "dropped" as const, owner, mapped };
  }
  if (args.synchronizeOwner(owner)) {
    args.initialize("owner-switch");
    return { status: "initializing" as const, owner, mapped };
  }
  if (mapped.publicationKinds.includes("transcript") && mapped.transcript) {
    args.coordinator.publishDomainChange({
      owner,
      kind: "transcript",
      cause: "steady-state",
      transcript: {
        form: "mutations",
        events: [...mapped.transcript.events],
        sourceEventSeq: mapped.transcript.sourceEventSeq,
        visibility: mapped.transcript.visibility,
      },
    });
  }
  const regionKinds = mapped.publicationKinds.filter(
    (kind): kind is Exclude<AssistantWorkspacePublicationKind, "transcript"> =>
      kind !== "transcript",
  );
  if (regionKinds.length > 0) {
    args.queueRegions(owner, regionKinds);
  }
  return { status: "scheduled" as const, owner, mapped };
}

const INITIAL_OWNER_PUBLICATION_KINDS = [
  "baseline-status",
  "message-counts",
  "plan",
  "permission",
  "reply-hint",
  "context-details",
] as const satisfies readonly Exclude<
  AssistantWorkspacePublicationKind,
  "owner-navigation" | "transcript"
>[];

export async function initializeAssistantWorkspaceAcpSurface<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(args: {
  adapter: AssistantWorkspaceAcpSurfaceAdapter<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >;
  coordinator: AssistantWorkspacePublicationCoordinator;
  context: TContext;
  cause: Extract<
    AssistantWorkspacePublicationCause,
    "initialization" | "activation" | "owner-switch"
  >;
  transcriptPage?: TPageRequest;
}) {
  const force = args.cause === "initialization";
  const navigation = await args.adapter.readOwnerNavigation();
  const publicationIds: string[] = [];
  const navigationPublication = args.coordinator.publishDomainChange({
    owner: createAssistantWorkspaceUnownedScope(args.adapter.source),
    kind: "owner-navigation",
    cause: args.cause,
    payload: navigation,
    force,
  });
  if (navigationPublication) {
    publicationIds.push(navigationPublication.publicationId);
  }
  const owner =
    navigation.selectedOwner?.source === args.adapter.source
      ? (navigation.selectedOwner as Extract<
          AssistantWorkspaceOwner,
          { source: TSource }
        >)
      : null;
  if (!owner) {
    const idlePublication = args.coordinator.publishTranscriptSnapshot({
      owner: createAssistantWorkspaceUnownedScope(args.adapter.source),
      cause: args.cause,
      region: createIdleTranscriptRegion(),
      force,
    });
    if (idlePublication) publicationIds.push(idlePublication.publicationId);
    return publicationIds;
  }
  const loadingPublication = args.coordinator.publishTranscriptSnapshot({
    owner,
    cause: args.cause,
    region: createLoadingTranscriptRegion(owner),
    force,
  });
  if (loadingPublication) {
    publicationIds.push(loadingPublication.publicationId);
  }
  for (const publicationKind of INITIAL_OWNER_PUBLICATION_KINDS) {
    if (args.adapter.domainMapping[publicationKind] === "not-applicable") {
      continue;
    }
    const payload = await args.adapter.readPublication({
      owner,
      publicationKind,
      context: args.context,
    });
    if (!payload) continue;
    const publication = args.coordinator.publishDomainChange({
      owner,
      kind: publicationKind,
      cause: args.cause,
      payload,
      force,
    } as Parameters<
      AssistantWorkspacePublicationCoordinator["publishDomainChange"]
    >[0]);
    if (publication) publicationIds.push(publication.publicationId);
  }
  const transcript = await args.adapter.readPublication({
    owner,
    publicationKind: "transcript",
    context: args.context,
    options: {
      transcriptReadMode: "page-first",
      transcriptPage: args.transcriptPage,
    },
  });
  if (transcript) {
    const publication = args.coordinator.publishDomainChange({
      owner,
      kind: "transcript",
      cause: args.cause,
      transcript: { form: "snapshot", region: transcript },
      force,
    });
    if (publication) publicationIds.push(publication.publicationId);
  }
  return publicationIds;
}
