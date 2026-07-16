import type {
  AssistantWorkspaceOwner,
  AssistantWorkspaceOwnerNavigation,
  AssistantWorkspacePublicationCause,
  AssistantWorkspacePublicationKind,
  AssistantWorkspacePublicationPayloadByKind,
  AssistantWorkspaceServiceStatus,
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
import { getHostBridgeServerStatus } from "./hostBridgeServer";
import { getZoteroMcpServerStatus } from "./zoteroMcpServer";

export type AssistantWorkspacePublicationRuntimeConfiguration = {
  executionDisplayMode: AssistantExecutionDisplayMode;
  transcriptPaginationVirtualizationEnabled: boolean;
};

export function readAssistantWorkspaceServiceStatus(): AssistantWorkspaceServiceStatus {
  const hostBridge = getHostBridgeServerStatus();
  const zoteroMcp = getZoteroMcpServerStatus();
  return {
    items: [
      {
        serviceId: "host-bridge",
        label: "Host Bridge",
        status: hostBridge.status,
        available: hostBridge.status === "running",
        message: hostBridge.lastError || null,
      },
      {
        serviceId: "zotero-mcp",
        label: "Zotero MCP",
        status: zoteroMcp.status,
        available: zoteroMcp.status === "running",
        message: zoteroMcp.lastError || null,
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
  if (args.serviceStatus) {
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
  const transcript = await args.adapter.readTranscriptPage({
    owner,
    context: args.context,
    request: args.transcriptPage,
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
  for (const publicationKind of requestedKinds) {
    const payload = regions[publicationKind];
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
  read: (
    kinds: readonly Exclude<
      AssistantWorkspacePublicationKind,
      "owner-navigation" | "service-status" | "transcript"
    >[],
  ) => Promise<Partial<AssistantWorkspacePublicationRuntimePayloadByKind>>;
  readNavigation: () => Promise<AssistantWorkspaceOwnerNavigation>;
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

  constructor(
    private readonly options: {
      coordinator: AssistantWorkspacePublicationCoordinator;
      activity: (
        source: AssistantWorkspaceOwner["source"],
      ) => AssistantWorkspacePublicationActivity;
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
    const navigationTargetsActiveSource =
      includesNavigation && mapped.targetsActiveOwner;
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
      });
      return { status: "initializing" as const, owner, mapped };
    }

    if (
      ownerMatches &&
      mapped.publicationKinds.includes("transcript") &&
      mapped.transcript
    ) {
      this.options.coordinator.publishDomainChange({
        owner: owner!,
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

    const kinds = mapped.publicationKinds.filter(
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
    if (kinds.length > 0) {
      this.queue({
        source: args.adapter.source,
        owner: owner!,
        navigation: includesNavigation,
        kinds: new Set(kinds),
        read: (requestedKinds) =>
          args.adapter.readOwnerRegions({
            owner: owner!,
            kinds: requestedKinds,
            context: args.context,
          }),
        readNavigation: () => args.adapter.readOwnerNavigation(),
      });
    } else if (includesNavigation) {
      this.queue({
        source: args.adapter.source,
        owner: selectedOwner,
        navigation: true,
        kinds: new Set(),
        read: async () => ({}),
        readNavigation: () => args.adapter.readOwnerNavigation(),
      });
    }
    return { status: "scheduled" as const, owner, mapped };
  }

  async initialize<
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
  }) {
    if (this.options.activity(args.adapter.source) !== "matching-target") {
      return [];
    }
    const selectedOwner = args.adapter.selectedOwner();
    if (selectedOwner) {
      this.synchronizeOwner(selectedOwner);
    } else {
      this.clearSourceOwner(args.adapter.source);
    }
    return publishAssistantWorkspaceInitialization({
      ...args,
      coordinator: this.options.coordinator,
    });
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
    const region = await args.adapter.readTranscriptPage({
      owner: args.owner,
      context: args.context,
      request: args.request,
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

  reset(source?: AssistantWorkspaceOwner["source"]) {
    if (!source) {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = null;
      for (const owner of this.owners.values()) {
        this.options.coordinator.clearOwner(owner);
        this.options.hooks?.onOwnerCleared?.(owner);
      }
      this.owners.clear();
      this.pending.clear();
      this.options.coordinator.reset();
      return;
    }
    const owner = this.owners.get(source);
    if (owner) {
      this.options.coordinator.clearOwner(owner);
      this.options.hooks?.onOwnerCleared?.(owner);
    }
    this.owners.delete(source);
    for (const [key, lane] of this.pending) {
      if (lane.source === source) this.pending.delete(key);
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
