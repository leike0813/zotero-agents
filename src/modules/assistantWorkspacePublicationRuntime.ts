import type {
  AssistantWorkspaceOwner,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationCause,
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationPayloadByKind,
  AssistantWorkspaceServiceStatus,
} from "./assistantWorkspacePublication";
import {
  ASSISTANT_WORKSPACE_ACTION_REGISTRY,
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
import { getHostBridgeServerStatus } from "./hostBridgeServer";
import {
  incrementAcpRuntimeMetric,
  observeAcpRuntimeDuration,
  readAcpRuntimePerformanceClockMs,
} from "./acpRuntimePerformanceProfiler";

export type AssistantWorkspacePublicationRuntimeConfiguration = {
  executionDisplayMode: AssistantExecutionDisplayMode;
  transcriptPaginationVirtualizationEnabled: boolean;
  actionRegistry: typeof ASSISTANT_WORKSPACE_ACTION_REGISTRY;
};

export function readAssistantWorkspaceServiceStatus(): AssistantWorkspaceServiceStatus {
  const hostBridge = getHostBridgeServerStatus();
  return {
    items: [
      {
        serviceId: "host-bridge",
        label: "Host Bridge",
        status: hostBridge.status,
        available: hostBridge.status === "running",
        message: hostBridge.lastError || null,
      },
    ],
  };
}

export type AssistantWorkspacePublicationRuntimePayloadByKind = Omit<
  AssistantWorkspacePublicationPayloadByKind,
  "transcript"
> & {
  transcript: AssistantWorkspaceTranscriptRegion;
};

export type AssistantWorkspacePublicationRuntimeChange<
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

export type AssistantWorkspacePublicationAdapter<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
> = {
  source: TSource;
  supportedKinds: readonly AssistantWorkspacePublicationKind[];
  selectedOwner: () => Extract<
    AssistantWorkspaceOwner,
    { source: TSource }
  > | null;
  readOwnerNavigation: () => Promise<AssistantWorkspaceOwnerNavigation>;
  mapChange: (
    change: TChange,
    context: TContext,
  ) => AssistantWorkspacePublicationRuntimeChange<TSource>;
  readOwnerRegions: (args: {
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    kinds: readonly Exclude<
      AssistantWorkspacePublicationKind,
      "owner-navigation" | "service-status" | "transcript"
    >[];
    context: TContext;
  }) => Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>>;
  readTranscriptPage: (args: {
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    context: TContext;
    request?: TPageRequest;
  }) => Promise<AssistantWorkspaceTranscriptRegion>;
};

export function defineAssistantWorkspacePublicationAdapter<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(
  adapter: AssistantWorkspacePublicationAdapter<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >,
) {
  return adapter;
}

export type AssistantWorkspacePublicationActivity =
  | "matching-target"
  | "opposite-active"
  | "inactive-source";

export type AssistantWorkspacePublicationDropReason =
  | Exclude<AssistantWorkspacePublicationActivity, "matching-target">
  | "owner-mismatch";

export type AssistantWorkspacePublicationRuntimeHooks = {
  onRequested?: (args: {
    owner: AssistantWorkspaceOwner | null;
    kinds: readonly AssistantWorkspacePublicationKind[];
    causality: AssistantWorkspacePublicationActivity | "owner-mismatch";
  }) => void;
  onDropped?: (args: {
    owner: AssistantWorkspaceOwner | null;
    kinds: readonly AssistantWorkspacePublicationKind[];
    reason: AssistantWorkspacePublicationDropReason;
  }) => void;
  onOwnerCleared?: (owner: AssistantWorkspaceOwner) => void;
  onInitializationFailed?: (args: {
    source: AssistantWorkspaceOwner["source"];
    owner: AssistantWorkspaceOwner | null;
    error: unknown;
  }) => void;
  onMaterialized?: (args: {
    owner: AssistantWorkspaceOwner;
    kind: AssistantWorkspacePublicationKind;
    cause: AssistantWorkspacePublicationCause;
    publicationForm: "snapshot" | "region";
    materializationSource: "transcript-page" | "region";
  }) => void;
};

const INITIAL_OWNER_PUBLICATION_KINDS = [
  "owner-control",
  "message-counts",
  "plan",
  "permission",
  "composer",
  "owner-presentation",
] as const satisfies readonly Exclude<
  AssistantWorkspacePublicationKind,
  "owner-navigation" | "transcript"
>[];

/**
 * Single funnel for adapter transcript page reads (R3 metrics). The wrap is
 * timing-neutral: it observes the existing await and must not add microtask
 * yields to the read path (Phase 4 lesson — publication read-path async
 * restructuring is timing-observable to the UI).
 */
async function readProfiledTranscriptPage<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(args: {
  adapter: AssistantWorkspacePublicationAdapter<
    TSource,
    TChange,
    TContext,
    TPageRequest
  >;
  owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
  context: TContext;
  request?: TPageRequest;
  cause: AssistantWorkspacePublicationCause;
}): Promise<AssistantWorkspaceTranscriptRegion> {
  const startedAtMs = readAcpRuntimePerformanceClockMs();
  const region = await args.adapter.readTranscriptPage({
    owner: args.owner,
    context: args.context,
    request: args.request,
  });
  const labels = {
    publicationSurface: args.owner.source,
    publicationPhase:
      args.cause === "initialization" ||
      args.cause === "activation" ||
      args.cause === "owner-switch"
        ? ("initialization" as const)
        : ("steady-state" as const),
  };
  incrementAcpRuntimeMetric(
    args.owner.ownerKey,
    "transcript_page_read",
    labels,
  );
  incrementAcpRuntimeMetric(
    args.owner.ownerKey,
    "transcript_page_scan_items",
    labels,
    region.page?.items.length ?? 0,
  );
  observeAcpRuntimeDuration(
    args.owner.ownerKey,
    "transcript_page_read_duration",
    labels,
    readAcpRuntimePerformanceClockMs() - startedAtMs,
  );
  return region;
}

async function publishAssistantWorkspaceInitialization<
  TSource extends AssistantWorkspaceOwner["source"],
  TChange,
  TContext,
  TPageRequest,
>(args: {
  adapter: AssistantWorkspacePublicationAdapter<
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
  serviceStatus?: AssistantWorkspaceServiceStatus;
  hooks?: AssistantWorkspacePublicationRuntimeHooks;
  isCurrent: () => boolean;
}) {
  const force = args.cause === "initialization";
  const navigation = await args.adapter.readOwnerNavigation();
  if (!args.isCurrent()) return [];
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
  if (args.serviceStatus) {
    if (!args.isCurrent()) return [];
    const servicesPublication = args.coordinator.publishDomainChange({
      owner: createAssistantWorkspaceUnownedScope(args.adapter.source),
      kind: "service-status",
      cause: args.cause,
      payload: args.serviceStatus,
      force,
    });
    if (servicesPublication) {
      publicationIds.push(servicesPublication.publicationId);
    }
  }
  const owner =
    navigation.selectedOwner?.source === args.adapter.source
      ? (navigation.selectedOwner as Extract<
          AssistantWorkspaceOwner,
          { source: TSource }
        >)
      : null;
  if (!owner) {
    if (!args.isCurrent()) return [];
    const idlePublication = args.coordinator.publishTranscriptSnapshot({
      owner: createAssistantWorkspaceUnownedScope(args.adapter.source),
      cause: args.cause,
      region: createIdleTranscriptRegion(),
      force,
    });
    if (idlePublication) publicationIds.push(idlePublication.publicationId);
    return publicationIds;
  }
  if (!args.isCurrent()) return [];
  const loadingPublication = args.coordinator.publishTranscriptSnapshot({
    owner,
    cause: args.cause,
    region: createLoadingTranscriptRegion(owner),
    force,
  });
  if (loadingPublication) {
    publicationIds.push(loadingPublication.publicationId);
  }
  if (!args.isCurrent()) return [];
  const transcript = await readProfiledTranscriptPage({
    adapter: args.adapter,
    owner,
    context: args.context,
    request: args.transcriptPage,
    cause: args.cause,
  });
  if (!args.isCurrent()) return [];
  args.hooks?.onMaterialized?.({
    owner,
    kind: "transcript",
    cause: args.cause,
    publicationForm: "snapshot",
    materializationSource: "transcript-page",
  });
  if (transcript) {
    const publication = args.coordinator.publishDomainChange({
      owner,
      kind: "transcript",
      cause: args.cause,
      transcript: { form: "snapshot", region: transcript },
      force,
    });
    if (publication) {
      publicationIds.push(publication.publicationId);
      await args.coordinator.waitForPostedPublication(
        publication.publicationId,
      );
      if (!args.isCurrent()) return [];
    }
  }
  const requestedKinds = INITIAL_OWNER_PUBLICATION_KINDS.filter((kind) =>
    args.adapter.supportedKinds.includes(kind),
  );
  const regions = await args.adapter.readOwnerRegions({
    owner,
    kinds: requestedKinds,
    context: args.context,
  });
  if (!args.isCurrent()) return [];
  for (const publicationKind of requestedKinds) {
    if (!args.isCurrent()) return [];
    const payload = regions[publicationKind];
    if (!payload) continue;
    args.hooks?.onMaterialized?.({
      owner,
      kind: publicationKind,
      cause: args.cause,
      publicationForm: "region",
      materializationSource: "region",
    });
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
  return publicationIds;
}

type PendingRuntimeLane = {
  source: AssistantWorkspaceOwner["source"];
  owner: AssistantWorkspaceOwner | null;
  navigation: boolean;
  kinds: Set<
    Exclude<
      AssistantWorkspacePublicationKind,
      "owner-navigation" | "service-status" | "transcript"
    >
  >;
  /**
   * Snapshot-only transcript sources (e.g. SkillRunner, design Decision 2 of
   * openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence)
   * have no incremental channel: their adapters queue the transcript kind
   * without mutations and the runtime re-reads a full page snapshot instead.
   */
  transcriptSnapshot?: boolean;
  readTranscript?: () => Promise<AssistantWorkspaceTranscriptRegion>;
  read: (
    kinds: readonly Exclude<
      AssistantWorkspacePublicationKind,
      "owner-navigation" | "service-status" | "transcript"
    >[],
  ) => Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>>;
  readNavigation: () => Promise<AssistantWorkspaceOwnerNavigation>;
};

type InitializationAttempt = {
  generation: string | undefined;
  ownerKey: string;
  epoch: number;
  promise: Promise<string[]>;
};

/**
 * Single host-side authority for ACP Workspace publication scheduling.
 *
 * Source adapters remain stateless. The runtime owns active/owner guards,
 * 16 ms intent coalescing, one batch read per lane, initialization, owner
 * cleanup, transcript page/rebase reads, and ACK forwarding.
 */
export class AssistantWorkspacePublicationRuntime {
  private readonly pending = new Map<string, PendingRuntimeLane>();
  private readonly owners = new Map<
    AssistantWorkspaceOwner["source"],
    AssistantWorkspaceOwner
  >();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  private readonly detailsRequestEpoch = new Map<string, number>();
  private readonly initializationEpoch = new Map<
    AssistantWorkspaceOwner["source"],
    number
  >();
  private readonly initializations = new Map<
    AssistantWorkspaceOwner["source"],
    InitializationAttempt
  >();

  constructor(
    private readonly options: {
      coordinator: AssistantWorkspacePublicationCoordinator;
      activity: (
        source: AssistantWorkspaceOwner["source"],
      ) => AssistantWorkspacePublicationActivity;
      initializationGeneration?: (
        source: AssistantWorkspaceOwner["source"],
      ) => string | undefined;
      hooks?: AssistantWorkspacePublicationRuntimeHooks;
    },
  ) {}

  schedule<
    TSource extends AssistantWorkspaceOwner["source"],
    TChange,
    TContext,
    TPageRequest,
  >(args: {
    adapter: AssistantWorkspacePublicationAdapter<
      TSource,
      TChange,
      TContext,
      TPageRequest
    >;
    change: TChange;
    context: TContext;
  }) {
    const activity = this.options.activity(args.adapter.source);
    if (activity !== "matching-target") {
      const owner = args.adapter.selectedOwner();
      this.options.hooks?.onRequested?.({
        owner,
        kinds: [],
        causality: activity,
      });
      this.options.hooks?.onDropped?.({
        owner,
        kinds: [],
        reason: activity,
      });
      return { status: "dropped" as const, owner, mapped: null };
    }

    const mapped = args.adapter.mapChange(args.change, args.context);
    const selectedOwner = args.adapter.selectedOwner();
    const owner = mapped.owner || selectedOwner;
    const includesNavigation =
      mapped.publicationKinds.includes("owner-navigation");
    const ownerMatches =
      mapped.targetsActiveOwner &&
      !!owner &&
      !!selectedOwner &&
      owner.ownerKey === selectedOwner.ownerKey;
    const navigationTargetsActiveSource = includesNavigation;
    const causality =
      ownerMatches || navigationTargetsActiveSource
        ? activity
        : "owner-mismatch";
    this.options.hooks?.onRequested?.({
      owner,
      kinds: mapped.publicationKinds,
      causality,
    });

    if (mapped.publicationKinds.length === 0) {
      return { status: "ignored" as const, owner, mapped };
    }
    if (!ownerMatches && !navigationTargetsActiveSource) {
      this.options.hooks?.onDropped?.({
        owner,
        kinds: mapped.publicationKinds,
        reason: "owner-mismatch",
      });
      return { status: "dropped" as const, owner, mapped };
    }

    const previousOwner = this.owners.get(args.adapter.source);
    const selectedOwnerChanged =
      selectedOwner?.ownerKey !== previousOwner?.ownerKey;
    if (selectedOwnerChanged) {
      if (selectedOwner) {
        this.synchronizeOwner(selectedOwner);
      } else {
        this.clearSourceOwner(args.adapter.source);
      }
      void this.initialize({
        adapter: args.adapter,
        context: args.context,
        cause: previousOwner ? "owner-switch" : "activation",
      }).catch((error) => {
        this.options.hooks?.onInitializationFailed?.({
          source: args.adapter.source,
          owner: selectedOwner,
          error,
        });
      });
      return { status: "initializing" as const, owner, mapped };
    }

    const ownerKinds = mapped.publicationKinds.filter(
      (
        kind,
      ): kind is Exclude<
        AssistantWorkspacePublicationKind,
        "owner-navigation" | "service-status" | "transcript"
      > =>
        kind !== "owner-navigation" &&
        kind !== "service-status" &&
        kind !== "transcript",
    );
    if (!ownerMatches) {
      const droppedKinds = mapped.publicationKinds.filter(
        (kind) => kind !== "owner-navigation" && kind !== "service-status",
      );
      if (droppedKinds.length > 0) {
        this.options.hooks?.onDropped?.({
          owner,
          kinds: droppedKinds,
          reason: "owner-mismatch",
        });
      }
      this.queue({
        source: args.adapter.source,
        owner: null,
        navigation: true,
        kinds: new Set(),
        read: async () => ({}),
        readNavigation: () => args.adapter.readOwnerNavigation(),
      });
      return { status: "scheduled" as const, owner, mapped };
    }

    const activeOwner = owner!;
    const transcriptSnapshotRequested =
      mapped.publicationKinds.includes("transcript") && !mapped.transcript;
    if (mapped.publicationKinds.includes("transcript") && mapped.transcript) {
      this.options.coordinator.publishDomainChange({
        owner: activeOwner,
        kind: "transcript",
        cause: "steady-state",
        transcript: {
          form: "mutations",
          events: mapped.transcript.events,
          sourceEventSeq: mapped.transcript.sourceEventSeq,
          visibility: mapped.transcript.visibility,
        },
      });
    }

    if (ownerKinds.length > 0 || transcriptSnapshotRequested) {
      this.queue({
        source: args.adapter.source,
        owner: activeOwner,
        navigation: includesNavigation,
        kinds: new Set(ownerKinds),
        transcriptSnapshot: transcriptSnapshotRequested,
        readTranscript: transcriptSnapshotRequested
          ? () =>
              readProfiledTranscriptPage({
                adapter: args.adapter,
                owner: activeOwner,
                context: args.context,
                cause: "steady-state",
              })
          : undefined,
        read: (requestedKinds) =>
          args.adapter.readOwnerRegions({
            owner: activeOwner,
            kinds: requestedKinds,
            context: args.context,
          }),
        readNavigation: () => args.adapter.readOwnerNavigation(),
      });
    } else if (includesNavigation) {
      this.queue({
        source: args.adapter.source,
        owner: null,
        navigation: true,
        kinds: new Set(),
        read: async () => ({}),
        readNavigation: () => args.adapter.readOwnerNavigation(),
      });
    }
    return { status: "scheduled" as const, owner, mapped };
  }

  initialize<
    TSource extends AssistantWorkspaceOwner["source"],
    TChange,
    TContext,
    TPageRequest,
  >(args: {
    adapter: AssistantWorkspacePublicationAdapter<
      TSource,
      TChange,
      TContext,
      TPageRequest
    >;
    context: TContext;
    cause: Extract<
      AssistantWorkspacePublicationCause,
      "initialization" | "activation" | "owner-switch"
    >;
    transcriptPage?: TPageRequest;
    serviceStatus?: AssistantWorkspaceServiceStatus;
  }): Promise<string[]> {
    if (this.options.activity(args.adapter.source) !== "matching-target") {
      return Promise.resolve([]);
    }
    const selectedOwner = args.adapter.selectedOwner();
    const generation = this.options.initializationGeneration?.(
      args.adapter.source,
    );
    const ownerKey = selectedOwner?.ownerKey || "unowned";
    const current = this.initializations.get(args.adapter.source);
    if (
      current &&
      current.generation === generation &&
      current.ownerKey === ownerKey
    ) {
      return current.promise;
    }
    const epoch = (this.initializationEpoch.get(args.adapter.source) || 0) + 1;
    this.initializationEpoch.set(args.adapter.source, epoch);
    if (selectedOwner) {
      this.synchronizeOwner(selectedOwner);
    } else {
      this.clearSourceOwner(args.adapter.source);
    }
    const isCurrent = () => {
      const attempt = this.initializations.get(args.adapter.source);
      return (
        attempt?.epoch === epoch &&
        attempt.generation === generation &&
        attempt.ownerKey === ownerKey &&
        this.options.activity(args.adapter.source) === "matching-target" &&
        (args.adapter.selectedOwner()?.ownerKey || "unowned") === ownerKey &&
        this.options.initializationGeneration?.(args.adapter.source) ===
          generation
      );
    };
    const promise = publishAssistantWorkspaceInitialization({
      ...args,
      coordinator: this.options.coordinator,
      hooks: this.options.hooks,
      isCurrent,
    });
    const attempt: InitializationAttempt = {
      generation,
      ownerKey,
      epoch,
      promise,
    };
    this.initializations.set(args.adapter.source, attempt);
    void promise.catch(() => {
      if (this.initializations.get(args.adapter.source) === attempt) {
        this.initializations.delete(args.adapter.source);
      }
    });
    return promise;
  }

  async requestTranscriptPage<
    TSource extends AssistantWorkspaceOwner["source"],
    TChange,
    TContext,
    TPageRequest,
  >(args: {
    adapter: AssistantWorkspacePublicationAdapter<
      TSource,
      TChange,
      TContext,
      TPageRequest
    >;
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    context: TContext;
    request?: TPageRequest;
    cause: Exclude<AssistantWorkspacePublicationCause, "steady-state">;
    force?: boolean;
  }) {
    const activity = this.options.activity(args.adapter.source);
    if (
      activity !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey
    ) {
      this.options.hooks?.onDropped?.({
        owner: args.owner,
        kinds: ["transcript"],
        reason: activity === "matching-target" ? "owner-mismatch" : activity,
      });
      return undefined;
    }
    this.synchronizeOwner(args.owner);
    const region = await readProfiledTranscriptPage({
      adapter: args.adapter,
      owner: args.owner,
      context: args.context,
      request: args.request,
      cause: args.cause,
    });
    this.options.hooks?.onMaterialized?.({
      owner: args.owner,
      kind: "transcript",
      cause: args.cause,
      publicationForm: "snapshot",
      materializationSource: "transcript-page",
    });
    if (
      this.options.activity(args.adapter.source) !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey
    ) {
      return undefined;
    }
    return this.options.coordinator.publishDomainChange({
      owner: args.owner,
      kind: "transcript",
      cause: args.cause,
      transcript: { form: "snapshot", region },
      force: args.force,
    });
  }

  async requestOwnerDetails<
    TSource extends AssistantWorkspaceOwner["source"],
    TChange,
    TContext,
    TPageRequest,
  >(args: {
    adapter: AssistantWorkspacePublicationAdapter<
      TSource,
      TChange,
      TContext,
      TPageRequest
    >;
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    context: TContext;
  }) {
    const activity = this.options.activity(args.adapter.source);
    if (
      activity !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey ||
      !args.adapter.supportedKinds.includes("owner-details")
    ) {
      this.options.hooks?.onDropped?.({
        owner: args.owner,
        kinds: ["owner-details"],
        reason: activity === "matching-target" ? "owner-mismatch" : activity,
      });
      return undefined;
    }
    const requestKey = `${args.adapter.source}\n${args.owner.ownerKey}`;
    const epoch = (this.detailsRequestEpoch.get(requestKey) || 0) + 1;
    this.detailsRequestEpoch.set(requestKey, epoch);
    const regions = await args.adapter.readOwnerRegions({
      owner: args.owner,
      kinds: ["owner-details"],
      context: args.context,
    });
    if (
      this.detailsRequestEpoch.get(requestKey) !== epoch ||
      this.options.activity(args.adapter.source) !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey
    ) {
      this.options.hooks?.onDropped?.({
        owner: args.owner,
        kinds: ["owner-details"],
        reason: "owner-mismatch",
      });
      return undefined;
    }
    const payload = regions["owner-details"];
    if (!payload) return undefined;
    this.options.hooks?.onMaterialized?.({
      owner: args.owner,
      kind: "owner-details",
      cause: "diagnostic",
      publicationForm: "region",
      materializationSource: "region",
    });
    return this.options.coordinator.publishDomainChange({
      owner: args.owner,
      kind: "owner-details",
      cause: "diagnostic",
      payload,
      force: true,
    });
  }

  async publishRegions<
    TSource extends AssistantWorkspaceOwner["source"],
    TChange,
    TContext,
    TPageRequest,
  >(args: {
    adapter: AssistantWorkspacePublicationAdapter<
      TSource,
      TChange,
      TContext,
      TPageRequest
    >;
    owner: Extract<AssistantWorkspaceOwner, { source: TSource }>;
    context: TContext;
    kinds: readonly Exclude<
      AssistantWorkspacePublicationKind,
      "owner-navigation" | "service-status" | "transcript"
    >[];
    cause: AssistantWorkspacePublicationCause;
    force?: boolean;
  }) {
    const activity = this.options.activity(args.adapter.source);
    if (
      activity !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey
    ) {
      this.options.hooks?.onDropped?.({
        owner: args.owner,
        kinds: args.kinds,
        reason: activity === "matching-target" ? "owner-mismatch" : activity,
      });
      return [];
    }
    this.synchronizeOwner(args.owner);
    const regions = await args.adapter.readOwnerRegions({
      owner: args.owner,
      kinds: args.kinds,
      context: args.context,
    });
    for (const kind of args.kinds) {
      if (!regions[kind]) continue;
      this.options.hooks?.onMaterialized?.({
        owner: args.owner,
        kind,
        cause: args.cause,
        publicationForm: "region",
        materializationSource: "region",
      });
    }
    if (
      this.options.activity(args.adapter.source) !== "matching-target" ||
      args.adapter.selectedOwner()?.ownerKey !== args.owner.ownerKey
    ) {
      return [];
    }
    const publicationIds: string[] = [];
    for (const kind of args.kinds) {
      const payload = regions[kind];
      if (!payload) continue;
      const publication = this.options.coordinator.publishDomainChange({
        owner: args.owner,
        kind,
        cause: args.cause,
        payload,
        force: args.force,
      } as Parameters<
        AssistantWorkspacePublicationCoordinator["publishDomainChange"]
      >[0]);
      if (publication) publicationIds.push(publication.publicationId);
    }
    return publicationIds;
  }

  acknowledge(
    ack: Parameters<AssistantWorkspacePublicationCoordinator["acknowledge"]>[0],
  ) {
    return this.options.coordinator.acknowledge(ack);
  }

  inspectTimer() {
    return this.flushTimer;
  }

  ownsTimer(token: ReturnType<typeof setTimeout>) {
    return this.flushTimer === token;
  }

  rescheduleFlush(
    expectedToken: ReturnType<typeof setTimeout>,
    remainingMs: number,
  ) {
    if (this.flushTimer !== expectedToken) return null;
    const token = setTimeout(
      () => {
        if (this.flushTimer !== token) return;
        this.flushTimer = null;
        void this.flush();
      },
      Math.max(0, remainingMs),
    );
    this.flushTimer = token;
    return token;
  }

  async flush() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.flushing) return this.flushing;
    const run = this.flushPending();
    this.flushing = run;
    try {
      await run;
    } finally {
      if (this.flushing === run) this.flushing = null;
    }
  }

  // Workspace deactivation hides the existing child document. Preserve owner
  // and revision continuity while discarding work that can no longer render.
  deactivate() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pending.clear();
    this.detailsRequestEpoch.clear();
    this.invalidateInitializations();
    this.options.coordinator.reset();
  }

  reset(source?: AssistantWorkspaceOwner["source"]) {
    if (!source) {
      this.deactivate();
      for (const owner of this.owners.values()) {
        this.options.coordinator.clearOwner(owner);
        this.options.hooks?.onOwnerCleared?.(owner);
      }
      this.owners.clear();
      return;
    }
    this.invalidateInitializations(source);
    const owner = this.owners.get(source);
    if (owner) {
      this.options.coordinator.clearOwner(owner);
      this.options.hooks?.onOwnerCleared?.(owner);
    }
    this.owners.delete(source);
    for (const [key, lane] of this.pending) {
      if (lane.source === source) this.pending.delete(key);
    }
    for (const key of this.detailsRequestEpoch.keys()) {
      if (key.startsWith(`${source}\n`)) this.detailsRequestEpoch.delete(key);
    }
  }

  private synchronizeOwner(owner: AssistantWorkspaceOwner) {
    const previous = this.owners.get(owner.source);
    if (previous?.ownerKey === owner.ownerKey) return false;
    if (previous) {
      this.options.coordinator.clearOwner(previous);
      this.options.hooks?.onOwnerCleared?.(previous);
      for (const [key, lane] of this.pending) {
        if (
          lane.source === previous.source &&
          lane.owner?.ownerKey === previous.ownerKey
        ) {
          this.pending.delete(key);
        }
      }
    }
    this.owners.set(owner.source, owner);
    return true;
  }

  private invalidateInitializations(
    source?: AssistantWorkspaceOwner["source"],
  ) {
    const sources = source
      ? [source]
      : (["acp-chat", "acp-skills", "skillrunner"] as const);
    for (const currentSource of sources) {
      this.initializations.delete(currentSource);
      this.initializationEpoch.set(
        currentSource,
        (this.initializationEpoch.get(currentSource) || 0) + 1,
      );
    }
  }

  private clearSourceOwner(source: AssistantWorkspaceOwner["source"]) {
    const previous = this.owners.get(source);
    if (!previous) return false;
    this.options.coordinator.clearOwner(previous);
    this.options.hooks?.onOwnerCleared?.(previous);
    this.owners.delete(source);
    for (const [key, lane] of this.pending) {
      if (lane.source === source) this.pending.delete(key);
    }
    return true;
  }

  private queue(lane: PendingRuntimeLane) {
    const key = `${lane.source}\n${lane.owner?.ownerKey || "unowned"}`;
    const pending = this.pending.get(key);
    if (pending) {
      for (const kind of lane.kinds) pending.kinds.add(kind);
      pending.navigation ||= lane.navigation;
      pending.transcriptSnapshot ||= lane.transcriptSnapshot === true;
      if (lane.readTranscript) pending.readTranscript = lane.readTranscript;
      pending.read = lane.read;
      pending.readNavigation = lane.readNavigation;
    } else {
      this.pending.set(key, lane);
    }
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 16);
  }

  private async flushPending() {
    const lanes = [...this.pending.values()];
    this.pending.clear();
    for (const lane of lanes) {
      const activity = this.options.activity(lane.source);
      if (
        activity !== "matching-target" ||
        (lane.owner &&
          this.owners.get(lane.source)?.ownerKey !== lane.owner.ownerKey)
      ) {
        this.options.hooks?.onDropped?.({
          owner: lane.owner,
          kinds: [
            ...(lane.navigation
              ? (["owner-navigation"] as const)
              : ([] as const)),
            ...lane.kinds,
            ...(lane.transcriptSnapshot
              ? (["transcript"] as const)
              : ([] as const)),
          ],
          reason: activity === "matching-target" ? "owner-mismatch" : activity,
        });
        continue;
      }
      const kinds = [...lane.kinds];
      const navigation = lane.navigation
        ? await lane.readNavigation()
        : undefined;
      const regions = await lane.read(kinds);
      const transcriptRegion =
        lane.transcriptSnapshot && lane.owner && lane.readTranscript
          ? await lane.readTranscript()
          : undefined;
      if (lane.owner) {
        for (const kind of kinds) {
          if (!regions[kind]) continue;
          this.options.hooks?.onMaterialized?.({
            owner: lane.owner,
            kind,
            cause: "steady-state",
            publicationForm: "region",
            materializationSource: "region",
          });
        }
        if (transcriptRegion) {
          this.options.hooks?.onMaterialized?.({
            owner: lane.owner,
            kind: "transcript",
            cause: "steady-state",
            publicationForm: "snapshot",
            materializationSource: "transcript-page",
          });
        }
      }
      if (
        this.options.activity(lane.source) !== "matching-target" ||
        (lane.owner &&
          this.owners.get(lane.source)?.ownerKey !== lane.owner.ownerKey)
      ) {
        continue;
      }
      if (navigation) {
        this.options.coordinator.publishDomainChange({
          owner: createAssistantWorkspaceUnownedScope(lane.source),
          kind: "owner-navigation",
          cause: "steady-state",
          payload: navigation,
        });
      }
      if (lane.owner && transcriptRegion) {
        this.options.coordinator.publishDomainChange({
          owner: lane.owner,
          kind: "transcript",
          cause: "steady-state",
          transcript: { form: "snapshot", region: transcriptRegion },
        });
      }
      if (!lane.owner) continue;
      for (const kind of kinds) {
        const payload = regions[kind];
        if (!payload) continue;
        this.options.coordinator.publishDomainChange({
          owner: lane.owner,
          kind,
          cause: "steady-state",
          payload,
        } as Parameters<
          AssistantWorkspacePublicationCoordinator["publishDomainChange"]
        >[0]);
      }
    }
  }
}
