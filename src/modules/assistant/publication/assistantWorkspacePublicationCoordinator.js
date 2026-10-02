import { ASSISTANT_WORKSPACE_PUBLICATION_SCHEMA, assertAssistantWorkspacePublication, } from "./assistantWorkspacePublication";
import { isWorkspacePublicationWireAssertAvailable } from "../../debugMode";
import { incrementAcpRuntimeMetric, observeAcpRuntimeDuration, readAcpRuntimePerformanceClockMs, } from "../../acp/diagnostics/acpRuntimePerformanceProfiler";
import { AssistantWorkspaceTranscriptAccumulator, AssistantWorkspaceTranscriptProjection, transcriptPageMetadata, } from "./assistantWorkspaceTranscriptPublication";
export class AssistantWorkspacePublicationCoordinator {
    options;
    publicationSequence = 0;
    deliverySequence = 0;
    regionRevisions = new Map();
    regionSignatures = new Map();
    publications = new Map();
    publicationPostWaiters = new Map();
    transcripts = new Map();
    transcriptProjection = new AssistantWorkspaceTranscriptProjection();
    constructor(options) {
        this.options = options;
    }
    publishDomainChange(change) {
        if (change.kind !== "transcript") {
            return this.publishRegion({
                owner: change.owner,
                publicationKind: change.kind,
                cause: change.cause,
                payload: change.payload,
                force: change.force,
            });
        }
        if (change.transcript.form === "snapshot") {
            return this.publishTranscriptSnapshot({
                owner: change.owner,
                cause: change.cause,
                region: change.transcript.region,
                force: "force" in change ? change.force : undefined,
            });
        }
        if (change.transcript.form !== "mutations")
            return undefined;
        return this.publishTranscriptMutations({
            owner: change.owner,
            events: change.transcript.events,
            sourceEventSeq: change.transcript.sourceEventSeq,
            visibility: change.transcript.visibility,
        });
    }
    publishRegion(args) {
        if (args.owner.ownerKey !== null && !this.isActive(args.owner)) {
            return this.drop(args.owner);
        }
        const signatureKey = `${args.owner.source}\n${args.owner.ownerKey}\n${args.publicationKind}`;
        const signatureStartedAtMs = readAcpRuntimePerformanceClockMs();
        const signature = JSON.stringify(args.payload);
        // Region-isolation cost metrics (R3). Synchronous observations only —
        // no control-flow change; no-ops unless a matching profile is active.
        const signatureLabels = {
            publicationSurface: args.owner.source,
            publicationKind: args.publicationKind,
        };
        observeAcpRuntimeDuration(args.owner.ownerKey, "panel_signature_duration", signatureLabels, readAcpRuntimePerformanceClockMs() - signatureStartedAtMs);
        incrementAcpRuntimeMetric(args.owner.ownerKey, "panel_signature", signatureLabels);
        incrementAcpRuntimeMetric(args.owner.ownerKey, "panel_signature_bytes", signatureLabels, signature.length);
        if (!args.force && this.regionSignatures.get(signatureKey) === signature) {
            incrementAcpRuntimeMetric(args.owner.ownerKey, "panel_signature_skip", signatureLabels);
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
    publishTranscriptSnapshot(args) {
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
        if (!this.isActive(args.owner))
            return this.drop(args.owner);
        if (args.region.owner?.source !== args.owner.source ||
            args.region.owner.ownerKey !== args.owner.ownerKey) {
            return undefined;
        }
        const state = this.transcriptLane(args.owner);
        if (args.cause === "page-request") {
            if (!state.page || args.region.status !== "ready" || !args.region.page) {
                return undefined;
            }
            const publication = this.createPublication({
                owner: args.owner,
                publicationKind: "transcript",
                publicationForm: "snapshot",
                publicationCause: args.cause,
                payload: args.region,
            });
            state.pendingSnapshots.push(publication);
            this.pumpTranscriptLane(state);
            return publication;
        }
        state.accumulator.drain();
        state.pendingMetadata = false;
        state.page = args.region.page;
        state.transcriptRevision = args.region.transcriptRevision;
        state.rebasePending = false;
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
    publishTranscriptMutations(args) {
        if (!this.isActive(args.owner))
            return this.drop(args.owner);
        const state = this.transcripts.get(ownerIdentity(args.owner));
        if (!state || !state.page) {
            const lane = state || this.transcriptLane(args.owner);
            this.requestRebase(lane, "gap");
            return undefined;
        }
        const projected = args.events.reduce((result, event) => {
            const next = this.transcriptProjection.project(args.owner, {
                boundary: event.boundary,
                mutation: event.mutation,
                cardinality: event.cardinality,
                visibility: args.visibility,
            });
            result.mutations.push(...next.mutations);
            result.visibleItemCountDelta += next.visibleItemCountDelta;
            return result;
        }, {
            mutations: [],
            visibleItemCountDelta: 0,
        });
        const mutations = projected.mutations;
        const totalVisibleItemCount = Math.max(0, state.page.totalVisibleItemCount + projected.visibleItemCountDelta);
        const startCursor = isTailPage(state.page)
            ? Math.max(0, totalVisibleItemCount - state.page.limit)
            : state.page.startCursor;
        state.page = {
            ...state.page,
            sourceEventSeq: Math.max(state.page.sourceEventSeq, Math.floor(args.sourceEventSeq || 0)),
            totalVisibleItemCount,
            startCursor,
            previousCursor: startCursor > 0 ? Math.max(0, startCursor - state.page.limit) : null,
            nextCursor: isTailPage(state.page) ? null : state.page.nextCursor,
        };
        if (isTailPage(state.page)) {
            state.accumulator.enqueue(mutations);
        }
        else {
            state.pendingMetadata = true;
        }
        if (!mutations.length && !state.pendingMetadata) {
            return state.inFlight || undefined;
        }
        this.pumpTranscriptLane(state);
        return state.inFlight || undefined;
    }
    enqueueTranscriptMutations(args) {
        if (!this.isActive(args.owner))
            return this.drop(args.owner);
        const state = this.transcriptLane(args.owner);
        state.page = args.page;
        state.accumulator.enqueue(args.mutations);
        this.pumpTranscriptLane(state);
        return state.inFlight || undefined;
    }
    acknowledge(ack) {
        const publication = this.publications.get(ack.publicationId);
        if (!publication)
            return false;
        const terminal = ack.outcome === "rejected" || ack.stage === "render-complete";
        if (!terminal)
            return true;
        this.publications.delete(publication.publicationId);
        if (publication.publicationKind !== "transcript")
            return true;
        if (publication.owner.ownerKey === null)
            return true;
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
        if (ack.outcome === "rejected" &&
            (ack.reason === "old-owner" ||
                ack.reason === "gap" ||
                ack.reason === "render-failed" ||
                ack.reason === "stale" ||
                ack.reason === "superseded")) {
            if (ack.reason === "gap" || ack.reason === "render-failed") {
                this.requestRebase(state, ack.reason);
            }
            else {
                state.accumulator.drain();
                state.pendingMetadata = false;
                this.pumpTranscriptLane(state);
            }
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
    waitForPostedPublication(publicationId) {
        const posted = this.publications.get(publicationId);
        if (posted)
            return Promise.resolve(posted);
        const prepared = [...this.transcripts.values()].some((state) => state.pendingSnapshots.some((publication) => publication.publicationId === publicationId));
        if (!prepared)
            return Promise.resolve(undefined);
        return new Promise((resolve) => {
            const waiters = this.publicationPostWaiters.get(publicationId) ||
                new Set();
            waiters.add(resolve);
            this.publicationPostWaiters.set(publicationId, waiters);
        });
    }
    reset() {
        for (const state of this.transcripts.values()) {
            state.accumulator.drain();
            this.transcriptProjection.clear(state.owner);
        }
        for (const publicationId of this.publicationPostWaiters.keys()) {
            this.settlePublicationPost(publicationId, undefined);
        }
        this.publications.clear();
        this.transcripts.clear();
        this.regionSignatures.clear();
    }
    settlePublicationPost(publicationId, publication) {
        const waiters = this.publicationPostWaiters.get(publicationId);
        if (!waiters)
            return;
        this.publicationPostWaiters.delete(publicationId);
        for (const resolve of waiters) {
            resolve(publication);
        }
    }
    replacePendingSnapshots(state, publications) {
        const retained = new Set(publications.map((publication) => publication.publicationId));
        for (const pending of state.pendingSnapshots) {
            if (!retained.has(pending.publicationId)) {
                this.settlePublicationPost(pending.publicationId, undefined);
            }
        }
        state.pendingSnapshots = publications;
    }
    clearOwner(owner) {
        const key = ownerIdentity(owner);
        const regionPrefix = `${key}\n`;
        const state = this.transcripts.get(key);
        if (state) {
            if (state.inFlight) {
                this.publications.delete(state.inFlight.publicationId);
                this.settlePublicationPost(state.inFlight.publicationId, undefined);
            }
            this.replacePendingSnapshots(state, []);
            state.accumulator.drain();
        }
        for (const [publicationId, publication] of this.publications) {
            if (publication.owner.source === owner.source &&
                publication.owner.ownerKey === owner.ownerKey) {
                this.publications.delete(publicationId);
                this.settlePublicationPost(publicationId, undefined);
            }
        }
        for (const key of this.regionRevisions.keys()) {
            if (key.startsWith(regionPrefix))
                this.regionRevisions.delete(key);
        }
        for (const key of this.regionSignatures.keys()) {
            if (key.startsWith(regionPrefix))
                this.regionSignatures.delete(key);
        }
        this.transcripts.delete(key);
        this.transcriptProjection.clear(owner);
    }
    transcriptLane(owner) {
        const key = ownerIdentity(owner);
        let state = this.transcripts.get(key);
        if (!state) {
            state = {
                owner,
                page: null,
                transcriptRevision: 0,
                accumulator: new AssistantWorkspaceTranscriptAccumulator(),
                inFlight: null,
                pendingSnapshots: [],
                pendingMetadata: false,
                rebasePending: false,
            };
            this.transcripts.set(key, state);
        }
        return state;
    }
    pumpTranscriptLane(state) {
        if (state.rebasePending)
            return undefined;
        if (state.inFlight)
            return state.inFlight;
        const pendingSnapshot = state.pendingSnapshots[0];
        if (pendingSnapshot) {
            if (!this.postPrepared(pendingSnapshot))
                return undefined;
            state.pendingSnapshots.shift();
            state.inFlight = pendingSnapshot;
            return pendingSnapshot;
        }
        return this.flush(state);
    }
    flush(state) {
        if (!state.page)
            return undefined;
        if (state.accumulator.overflowedState) {
            this.requestRebase(state, "overflow");
            return undefined;
        }
        const mutations = state.accumulator.read();
        if (!mutations.length && !state.pendingMetadata)
            return undefined;
        const baseTranscriptRevision = state.transcriptRevision;
        const transcriptRevision = baseTranscriptRevision + 1;
        const publication = this.createPublication({
            owner: state.owner,
            publicationKind: "transcript",
            publicationForm: "delta",
            publicationCause: "steady-state",
            payload: {
                page: transcriptPageMetadata(state.page),
                baseTranscriptRevision,
                transcriptRevision,
                mutations,
            },
        });
        if (!this.postPrepared(publication))
            return undefined;
        state.accumulator.drain();
        state.pendingMetadata = false;
        state.transcriptRevision = transcriptRevision;
        state.inFlight = publication;
        return publication;
    }
    requestRebase(state, reason) {
        if (state.rebasePending)
            return;
        state.rebasePending = true;
        state.accumulator.drain();
        state.pendingMetadata = false;
        this.replacePendingSnapshots(state, []);
        void this.options.onTranscriptRebaseRequired?.({
            owner: state.owner,
            pageKey: state.page?.pageKey || `${state.owner.ownerKey}\ntail:80`,
            reason,
        });
    }
    postPrepared(publication) {
        if (!this.options.post(publication))
            return false;
        this.publications.set(publication.publicationId, publication);
        this.settlePublicationPost(publication.publicationId, publication);
        return true;
    }
    publish(args) {
        const publication = this.createPublication(args);
        if (!this.options.post(publication))
            return undefined;
        this.publications.set(publication.publicationId, publication);
        return publication;
    }
    createPublication(args) {
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
        };
        if (isWorkspacePublicationWireAssertAvailable()) {
            assertAssistantWorkspacePublication(publication);
        }
        return publication;
    }
    isActive(owner) {
        const active = this.options.getActiveOwner(owner.source);
        return active?.ownerKey === owner.ownerKey;
    }
    drop(owner) {
        this.options.onDroppedBeforeBuild?.(owner);
        return undefined;
    }
}
function ownerIdentity(owner) {
    return `${owner.source}\n${owner.ownerKey}`;
}
function isTailPage(page) {
    return /\ntail:\d+$/.test(page.pageKey);
}
