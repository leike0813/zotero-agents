import {
  ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
  type AssistantWorkspaceOwner,
  type AssistantWorkspacePublicationOwner,
  type AssistantWorkspaceDomainChange,
  type AssistantWorkspacePublication,
  type AssistantWorkspacePublicationAck,
  type AssistantWorkspacePublicationCause,
} from "./assistantWorkspacePublication";
import {
  AssistantWorkspaceTranscriptAccumulator,
  AssistantWorkspaceTranscriptProjection,
  type AssistantWorkspaceTranscriptMutation,
  type AssistantWorkspaceTranscriptMutationEvent,
  type AssistantWorkspaceTranscriptPage,
  type AssistantWorkspaceTranscriptRegion,
  transcriptPageMetadata,
} from "./assistantWorkspaceTranscriptPublication";

type CoordinatorOptions = {
  scopeKey: string;
  getActiveOwner: (
    source: AssistantWorkspaceOwner["source"],
  ) => AssistantWorkspaceOwner | null;
  post: (publication: AssistantWorkspacePublication) => boolean;
  onDroppedBeforeBuild?: (owner: AssistantWorkspaceOwner) => void;
};

type TranscriptState = {
  owner: AssistantWorkspaceOwner;
  page: AssistantWorkspaceTranscriptPage | null;
  uiRevision: number;
  accumulator: AssistantWorkspaceTranscriptAccumulator;
  inFlight: AssistantWorkspacePublication | null;
  pendingSnapshots: AssistantWorkspacePublication[];
  pendingMetadata: boolean;
};

export class AssistantWorkspacePublicationCoordinator {
  private publicationSequence = 0;
  private deliverySequence = 0;
  private readonly regionRevisions = new Map<string, number>();
  private readonly regionSignatures = new Map<string, string>();
  private readonly publications = new Map<
    string,
    AssistantWorkspacePublication
  >();
  private readonly publicationPostWaiters = new Map<
    string,
    Set<(publication: AssistantWorkspacePublication | undefined) => void>
  >();
  private readonly transcripts = new Map<string, TranscriptState>();
  private readonly transcriptProjection =
    new AssistantWorkspaceTranscriptProjection();

  constructor(private readonly options: CoordinatorOptions) {}

  publishDomainChange(change: AssistantWorkspaceDomainChange) {
    if (change.kind !== "transcript") {
      return this.publishRegion({
        owner: change.owner,
        publicationKind: change.kind,
        cause: change.cause,
        payload: change.payload,
        force: change.force,
      });
    }
    if (
      change.transcript.form === "snapshot" &&
      change.cause !== "steady-state"
    ) {
      return this.publishTranscriptSnapshot({
        owner: change.owner,
        cause: change.cause,
        region: change.transcript.region,
        force: "force" in change ? change.force : undefined,
      });
    }
    if (change.transcript.form !== "mutations") return undefined;
    return this.publishTranscriptMutations({
      owner: change.owner,
      events: change.transcript.events,
      eventSeq: change.transcript.eventSeq,
      totalItemCount: change.transcript.totalItemCount,
      visibility: change.transcript.visibility,
    });
  }

  publishRegion(args: {
    owner: AssistantWorkspaceOwner;
    publicationKind: Exclude<
      AssistantWorkspacePublication["publicationKind"],
      "transcript"
    >;
    cause: AssistantWorkspacePublicationCause;
    payload: AssistantWorkspacePublication["payload"];
    force?: boolean;
  }) {
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    const signatureKey = `${args.owner.source}\n${args.owner.ownerKey}\n${args.publicationKind}`;
    const signature = JSON.stringify(args.payload);
    if (!args.force && this.regionSignatures.get(signatureKey) === signature) {
      return undefined;
    }
    const publication = this.publish({
      owner: args.owner,
      publicationKind: args.publicationKind,
      publicationForm: "region",
      publicationCause: args.cause,
      payload: args.payload,
    });
    if (publication) {
      this.regionSignatures.set(signatureKey, signature);
    }
    return publication;
  }

  publishTranscriptSnapshot(args: {
    owner: AssistantWorkspacePublicationOwner;
    cause: Exclude<AssistantWorkspacePublicationCause, "steady-state">;
    region: AssistantWorkspaceTranscriptRegion;
    force?: boolean;
  }) {
    if (args.owner.ownerKey === null) {
      if (args.region.status !== "idle" || args.region.owner !== null) {
        return undefined;
      }
      return this.publish({
        owner: args.owner,
        publicationKind: "transcript",
        publicationForm: "snapshot",
        publicationCause: args.cause,
        payload: args.region,
      });
    }
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    if (
      args.region.owner?.source !== args.owner.source ||
      args.region.owner.ownerKey !== args.owner.ownerKey
    ) {
      return undefined;
    }
    const state = this.transcriptLane(args.owner);
    state.accumulator.drain();
    state.pendingMetadata = false;
    state.page = args.region.page;
    state.uiRevision = args.region.uiRevision;
    this.transcriptProjection.clear(args.owner);
    if (args.region.page) {
      this.transcriptProjection.registerSnapshot(args.owner, args.region.page);
    }
    const publication = this.createPublication({
      owner: args.owner,
      publicationKind: "transcript",
      publicationForm: "snapshot",
      publicationCause: args.cause,
      payload: args.region,
    });
    // A snapshot is a complete owner/page rebase. Any transcript work that has
    // not reached the shell yet is already represented by this snapshot and
    // must not be delivered ahead of it after the transport becomes ready.
    this.replacePendingSnapshots(state, [publication]);
    this.pumpTranscriptLane(state);
    return publication;
  }

  publishTranscriptMutations(args: {
    owner: AssistantWorkspaceOwner;
    events: readonly AssistantWorkspaceTranscriptMutationEvent[];
    eventSeq: number;
    totalItemCount: number;
    visibility: "live" | "boundary" | "silent";
  }) {
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    const state = this.transcripts.get(ownerIdentity(args.owner));
    if (!state || !state.page) {
      const publication = this.createPublication({
        owner: args.owner,
        publicationKind: "transcript",
        publicationForm: "resync-required",
        publicationCause: "rebase",
        payload: {
          pageKey: `${args.owner.ownerKey}\ntail:80`,
          expectedUiRevision: 0,
          reason: "gap",
        },
      });
      const lane = state || this.transcriptLane(args.owner);
      lane.pendingSnapshots.push(publication);
      this.pumpTranscriptLane(lane);
      return publication;
    }
    const totalItemCount = Math.max(0, Math.floor(args.totalItemCount || 0));
    const startCursor = isTailPage(state.page)
      ? Math.max(0, totalItemCount - state.page.limit)
      : state.page.startCursor;
    state.page = {
      ...state.page,
      eventSeq: Math.max(state.page.eventSeq, Math.floor(args.eventSeq || 0)),
      totalItemCount,
      startCursor,
      previousCursor:
        startCursor > 0 ? Math.max(0, startCursor - state.page.limit) : null,
      nextCursor: isTailPage(state.page) ? null : state.page.nextCursor,
    };
    const mutations = args.events.flatMap((event) =>
      this.transcriptProjection.record(args.owner, {
        boundary: event.boundary,
        mutation: event.mutation,
        visibility: args.visibility,
      }),
    );
    if (isTailPage(state.page)) {
      state.accumulator.enqueue(mutations);
    } else {
      state.pendingMetadata = true;
    }
    if (!mutations.length && !state.pendingMetadata) {
      return state.inFlight || undefined;
    }
    this.pumpTranscriptLane(state);
    return state.inFlight || undefined;
  }

  enqueueTranscriptMutations(args: {
    owner: AssistantWorkspaceOwner;
    page: AssistantWorkspaceTranscriptPage;
    mutations: readonly AssistantWorkspaceTranscriptMutation[];
  }) {
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    const state = this.transcriptLane(args.owner);
    state.page = args.page;
    state.accumulator.enqueue(args.mutations);
    this.pumpTranscriptLane(state);
    return state.inFlight || undefined;
  }

  acknowledge(ack: AssistantWorkspacePublicationAck) {
    const publication = this.publications.get(ack.publicationId);
    if (!publication) return false;
    const terminal =
      ack.outcome === "rejected" || ack.stage === "render-complete";
    if (!terminal) return true;
    this.publications.delete(publication.publicationId);
    if (publication.publicationKind !== "transcript") return true;
    if (publication.owner.ownerKey === null) return true;
    const state = this.transcripts.get(ownerIdentity(publication.owner));
    if (!state || state.inFlight?.publicationId !== publication.publicationId) {
      return true;
    }
    state.inFlight = null;
    if (!this.isActive(state.owner)) {
      state.accumulator.drain();
      this.replacePendingSnapshots(state, []);
      state.pendingMetadata = false;
      return true;
    }
    if (
      ack.outcome === "rejected" &&
      publication.publicationForm !== "resync-required" &&
      (ack.reason === "old-owner" ||
        ack.reason === "gap" ||
        ack.reason === "render-failed" ||
        ack.reason === "stale" ||
        ack.reason === "superseded")
    ) {
      state.accumulator.drain();
      state.pendingMetadata = false;
      this.replacePendingSnapshots(state, [
        this.createPublication({
          owner: state.owner,
          publicationKind: "transcript",
          publicationForm: "resync-required",
          publicationCause: "rebase",
          payload: {
            pageKey: state.page?.pageKey || `${state.owner.ownerKey}\ntail:80`,
            expectedUiRevision: state.uiRevision,
            reason:
              ack.reason === "gap" || ack.reason === "render-failed"
                ? ack.reason
                : "superseded",
          },
        }),
      ]);
      this.pumpTranscriptLane(state);
      return true;
    }
    if (ack.outcome === "rejected") {
      state.accumulator.drain();
      state.pendingMetadata = false;
      this.pumpTranscriptLane(state);
      return true;
    }
    this.pumpTranscriptLane(state);
    return true;
  }

  waitForPostedPublication(publicationId: string) {
    const posted = this.publications.get(publicationId);
    if (posted) return Promise.resolve(posted);
    const prepared = [...this.transcripts.values()].some((state) =>
      state.pendingSnapshots.some(
        (publication) => publication.publicationId === publicationId,
      ),
    );
    if (!prepared) return Promise.resolve(undefined);
    return new Promise<AssistantWorkspacePublication | undefined>((resolve) => {
      const waiters =
        this.publicationPostWaiters.get(publicationId) ||
        new Set<
          (publication: AssistantWorkspacePublication | undefined) => void
        >();
      waiters.add(resolve);
      this.publicationPostWaiters.set(publicationId, waiters);
    });
  }

  private settlePublicationPost(
    publicationId: string,
    publication: AssistantWorkspacePublication | undefined,
  ) {
    const waiters = this.publicationPostWaiters.get(publicationId);
    if (!waiters) return;
    this.publicationPostWaiters.delete(publicationId);
    for (const resolve of waiters) {
      resolve(publication);
    }
  }

  private replacePendingSnapshots(
    state: TranscriptState,
    publications: AssistantWorkspacePublication[],
  ) {
    const retained = new Set(
      publications.map((publication) => publication.publicationId),
    );
    for (const pending of state.pendingSnapshots) {
      if (!retained.has(pending.publicationId)) {
        this.settlePublicationPost(pending.publicationId, undefined);
      }
    }
    state.pendingSnapshots = publications;
  }

  clearOwner(owner: AssistantWorkspaceOwner) {
    const key = ownerIdentity(owner);
    const state = this.transcripts.get(key);
    if (state) {
      if (state.inFlight) {
        this.publications.delete(state.inFlight.publicationId);
      }
      this.replacePendingSnapshots(state, []);
      state.accumulator.drain();
    }
    this.transcripts.delete(key);
    this.transcriptProjection.clear(owner);
  }

  private transcriptLane(owner: AssistantWorkspaceOwner) {
    const key = ownerIdentity(owner);
    let state = this.transcripts.get(key);
    if (!state) {
      state = {
        owner,
        page: null,
        uiRevision: 0,
        accumulator: new AssistantWorkspaceTranscriptAccumulator(),
        inFlight: null,
        pendingSnapshots: [],
        pendingMetadata: false,
      };
      this.transcripts.set(key, state);
    }
    return state;
  }

  private pumpTranscriptLane(state: TranscriptState) {
    if (state.inFlight) return state.inFlight;
    const pendingSnapshot = state.pendingSnapshots[0];
    if (pendingSnapshot) {
      if (!this.postPrepared(pendingSnapshot)) return undefined;
      state.pendingSnapshots.shift();
      state.inFlight = pendingSnapshot;
      return pendingSnapshot;
    }
    return this.flush(state);
  }

  private flush(state: TranscriptState) {
    if (!state.page) return undefined;
    if (state.accumulator.requiresResync) {
      const publication = this.createPublication({
        owner: state.owner,
        publicationKind: "transcript",
        publicationForm: "resync-required",
        publicationCause: "rebase",
        payload: {
          pageKey: state.page.pageKey,
          expectedUiRevision: state.uiRevision,
          reason: "overflow",
        },
      });
      if (!this.postPrepared(publication)) return undefined;
      state.accumulator.drain();
      state.inFlight = publication;
      return publication;
    }
    const mutations = state.accumulator.read();
    if (!mutations.length && !state.pendingMetadata) return undefined;
    const baseUiRevision = state.uiRevision;
    const uiRevision = baseUiRevision + 1;
    const publication = this.createPublication({
      owner: state.owner,
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      payload: {
        page: transcriptPageMetadata(state.page),
        baseUiRevision,
        uiRevision,
        mutations,
      },
    });
    if (!this.postPrepared(publication)) return undefined;
    state.accumulator.drain();
    state.pendingMetadata = false;
    state.uiRevision = uiRevision;
    state.inFlight = publication;
    return publication;
  }

  private postPrepared(publication: AssistantWorkspacePublication) {
    if (!this.options.post(publication)) return false;
    this.publications.set(publication.publicationId, publication);
    this.settlePublicationPost(publication.publicationId, publication);
    return true;
  }

  private publish(
    args: Omit<
      AssistantWorkspacePublication,
      "schema" | "publicationId" | "regionRevision" | "deliverySequence"
    >,
  ): AssistantWorkspacePublication | undefined {
    const publication = this.createPublication(args);
    if (!this.options.post(publication)) return undefined;
    this.publications.set(publication.publicationId, publication);
    return publication;
  }

  private createPublication(
    args: Omit<
      AssistantWorkspacePublication,
      "schema" | "publicationId" | "regionRevision" | "deliverySequence"
    >,
  ): AssistantWorkspacePublication {
    const regionKey = `${args.owner.source}\n${args.owner.ownerKey}\n${args.publicationKind}`;
    const regionRevision = (this.regionRevisions.get(regionKey) || 0) + 1;
    this.regionRevisions.set(regionKey, regionRevision);
    this.publicationSequence += 1;
    this.deliverySequence += 1;
    const publication = {
      schema: ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA,
      publicationId: `${this.options.scopeKey}-publication-${this.publicationSequence}`,
      regionRevision,
      deliverySequence: this.deliverySequence,
      ...args,
    } as AssistantWorkspacePublication;
    return publication;
  }

  private isActive(owner: AssistantWorkspaceOwner) {
    const active = this.options.getActiveOwner(owner.source);
    return active?.ownerKey === owner.ownerKey;
  }

  private drop(owner: AssistantWorkspaceOwner) {
    this.options.onDroppedBeforeBuild?.(owner);
    return undefined;
  }
}

function ownerIdentity(owner: AssistantWorkspaceOwner) {
  return `${owner.source}\n${owner.ownerKey}`;
}

function isTailPage(page: AssistantWorkspaceTranscriptPage) {
  return /\ntail:\d+$/.test(page.pageKey);
}
