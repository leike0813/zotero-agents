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
  page: AssistantWorkspaceTranscriptPage;
  uiRevision: number;
  accumulator: AssistantWorkspaceTranscriptAccumulator;
  inFlight: AssistantWorkspacePublication | null;
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
  private readonly transcripts = new Map<string, TranscriptState>();
  private readonly currentTranscriptKeys = new Map<string, string>();
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

  reserveSnapshot(args: {
    owner: AssistantWorkspacePublicationOwner;
    publicationKind: AssistantWorkspacePublication["publicationKind"];
    cause: Exclude<AssistantWorkspacePublicationCause, "steady-state">;
    payload: AssistantWorkspacePublication["payload"];
  }) {
    return this.createPublication({
      owner: args.owner,
      publicationKind: args.publicationKind,
      publicationForm: "snapshot",
      publicationCause: args.cause,
      payload: args.payload,
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
    this.regionSignatures.set(signatureKey, signature);
    return this.publish({
      owner: args.owner,
      publicationKind: args.publicationKind,
      publicationForm: "region",
      publicationCause: args.cause,
      payload: args.payload,
    });
  }

  adoptTranscriptSnapshot(publication: AssistantWorkspacePublication) {
    if (
      publication.publicationKind !== "transcript" ||
      publication.publicationForm !== "snapshot" ||
      !("status" in publication.payload) ||
      !("uiRevision" in publication.payload)
    ) {
      return false;
    }
    const region = publication.payload as AssistantWorkspaceTranscriptRegion;
    if (!region.page || region.owner?.ownerKey !== publication.owner.ownerKey) {
      return false;
    }
    const key = transcriptKey(publication.owner, region.page.pageKey);
    this.transcripts.set(key, {
      owner: publication.owner,
      page: region.page,
      uiRevision: region.uiRevision,
      accumulator: new AssistantWorkspaceTranscriptAccumulator(),
      inFlight: publication,
      pendingMetadata: false,
    });
    this.currentTranscriptKeys.set(ownerIdentity(publication.owner), key);
    this.transcriptProjection.registerSnapshot(publication.owner, region.page);
    this.deliverySequence = Math.max(
      this.deliverySequence,
      publication.deliverySequence,
    );
    const regionKey = `${publication.owner.source}\n${publication.owner.ownerKey}\ntranscript`;
    this.regionRevisions.set(
      regionKey,
      Math.max(
        this.regionRevisions.get(regionKey) || 0,
        publication.regionRevision,
      ),
    );
    this.publications.set(publication.publicationId, publication);
    return true;
  }

  publishTranscriptSnapshot(args: {
    owner: AssistantWorkspaceOwner;
    cause: Exclude<AssistantWorkspacePublicationCause, "steady-state">;
    region: AssistantWorkspaceTranscriptRegion;
    force?: boolean;
  }) {
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    if (args.region.owner?.ownerKey !== args.owner.ownerKey) {
      return undefined;
    }
    const page = args.region.page;
    let state: TranscriptState | null = null;
    if (page) {
      const key = transcriptKey(args.owner, page.pageKey);
      state = this.transcripts.get(key) || {
        owner: args.owner,
        page,
        uiRevision: args.region.uiRevision,
        accumulator: new AssistantWorkspaceTranscriptAccumulator(),
        inFlight: null,
        pendingMetadata: false,
      };
      state.page = page;
      state.uiRevision = args.region.uiRevision;
      this.transcripts.set(key, state);
      this.currentTranscriptKeys.set(ownerIdentity(args.owner), key);
      this.transcriptProjection.registerSnapshot(args.owner, page);
    }
    const publication = this.publish({
      owner: args.owner,
      publicationKind: "transcript",
      publicationForm: "snapshot",
      publicationCause: args.cause,
      payload: args.region,
    });
    if (publication && state) state.inFlight = publication;
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
    const key = this.currentTranscriptKeys.get(ownerIdentity(args.owner)) || "";
    const state = this.transcripts.get(key);
    if (!state) {
      return this.publish({
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
    }
    state.page = {
      ...state.page,
      eventSeq: Math.max(state.page.eventSeq, Math.floor(args.eventSeq || 0)),
      totalItemCount: Math.max(0, Math.floor(args.totalItemCount || 0)),
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
    return state.inFlight || this.flush(state);
  }

  enqueueTranscriptMutations(args: {
    owner: AssistantWorkspaceOwner;
    page: AssistantWorkspaceTranscriptPage;
    mutations: readonly AssistantWorkspaceTranscriptMutation[];
  }) {
    if (!this.isActive(args.owner)) return this.drop(args.owner);
    const key = transcriptKey(args.owner, args.page.pageKey);
    const state = this.transcripts.get(key) || {
      owner: args.owner,
      page: args.page,
      uiRevision: 0,
      accumulator: new AssistantWorkspaceTranscriptAccumulator(),
      inFlight: null,
      pendingMetadata: false,
    };
    state.page = args.page;
    state.accumulator.enqueue(args.mutations);
    this.transcripts.set(key, state);
    return state.inFlight || this.flush(state);
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
    const pageKey = publicationPageKey(publication);
    if (!pageKey) return true;
    const state = this.transcripts.get(
      transcriptKey(publication.owner, pageKey),
    );
    if (!state || state.inFlight?.publicationId !== publication.publicationId) {
      return true;
    }
    state.inFlight = null;
    if (!this.isActive(state.owner)) {
      state.accumulator.drain();
      state.pendingMetadata = false;
      return true;
    }
    if (
      ack.outcome === "rejected" &&
      (ack.reason === "gap" ||
        ack.reason === "stale" ||
        ack.reason === "superseded")
    ) {
      state.accumulator.drain();
      state.pendingMetadata = false;
      state.inFlight =
        this.publish({
          owner: state.owner,
          publicationKind: "transcript",
          publicationForm: "resync-required",
          publicationCause: "rebase",
          payload: {
            pageKey: state.page.pageKey,
            expectedUiRevision: state.uiRevision,
            reason: ack.reason === "gap" ? "gap" : "superseded",
          },
        }) || null;
      return true;
    }
    if (ack.outcome === "rejected") {
      state.accumulator.drain();
      state.pendingMetadata = false;
      return true;
    }
    if (state.accumulator.size || state.accumulator.requiresResync) {
      this.flush(state);
    }
    return true;
  }

  getPublication(publicationId: string) {
    return this.publications.get(publicationId);
  }

  clearOwner(owner: AssistantWorkspaceOwner) {
    const prefix = `${owner.source}\n${owner.ownerKey}\n`;
    for (const key of this.transcripts.keys()) {
      if (key.startsWith(prefix)) this.transcripts.delete(key);
    }
    this.currentTranscriptKeys.delete(ownerIdentity(owner));
    this.transcriptProjection.clear(owner);
  }

  private flush(state: TranscriptState) {
    if (state.accumulator.requiresResync) {
      state.accumulator.drain();
      const publication = this.publish({
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
      state.inFlight = publication || null;
      return publication;
    }
    const mutations = state.accumulator.drain();
    if (!mutations.length && !state.pendingMetadata) return undefined;
    state.pendingMetadata = false;
    const baseUiRevision = state.uiRevision;
    state.uiRevision += 1;
    const publication = this.publish({
      owner: state.owner,
      publicationKind: "transcript",
      publicationForm: "delta",
      publicationCause: "steady-state",
      payload: {
        page: transcriptPageMetadata(state.page),
        baseUiRevision,
        uiRevision: state.uiRevision,
        mutations,
      },
    });
    state.inFlight = publication || null;
    return publication;
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

function transcriptKey(owner: AssistantWorkspaceOwner, pageKey: string) {
  return `${owner.source}\n${owner.ownerKey}\n${pageKey}`;
}

function ownerIdentity(owner: AssistantWorkspaceOwner) {
  return `${owner.source}\n${owner.ownerKey}`;
}

function isTailPage(page: AssistantWorkspaceTranscriptPage) {
  return /\ntail:\d+$/.test(page.pageKey);
}

function publicationPageKey(publication: AssistantWorkspacePublication) {
  if (publication.publicationKind !== "transcript") return "";
  const payload = publication.payload;
  if ("pageKey" in payload) return String(payload.pageKey || "");
  if ("page" in payload && payload.page)
    return String(payload.page.pageKey || "");
  return "";
}
