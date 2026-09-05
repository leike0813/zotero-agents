// Synthesis workbench hosted page entry: bridge action
// sender, host message listener, and the snapshot -> projection -> render
// controller. The thin src/synthesisWorkbenchApp.ts wrapper is the production
// hosted entry; standalone exports use their own entries.
//
// Wire protocol (see src/shared/synthesisWorkbenchWireContract.ts):
//   page -> host: window.__zoteroSkillsSynthesisWorkbenchBridge.postMessage(
//     action, payload) when the direct bridge exists, otherwise
//     { type: "synthesis:action", action, payload } posted to
//     window.parent / window.top / window.opener with targetOrigin "*".
//   host -> page: SynthesisWorkbenchHostMessage envelopes; every payload may
//     carry an i18n envelope (withSynthesisWorkbenchI18n).
//
// Hosted bootstrap owns the message bridge. Standalone topic/graph exports
// have independent entries and mount their required regions directly.

import { stableRegionSignature } from "../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES } from "../shared/synthesisWorkbenchI18nContract";
import type {
  SynthesisWorkbenchActionName,
  SynthesisWorkbenchActionOperation,
  SynthesisWorkbenchActionPayload,
  SynthesisWorkbenchArtifactReaderPayload,
  SynthesisWorkbenchBridge,
  SynthesisWorkbenchGraphPagePayload,
  SynthesisWorkbenchMessageKey,
  SynthesisWorkbenchPaperDigestResult,
  SynthesisWorkbenchSnapshotPayload,
  SynthesisWorkbenchSurfaceErrorPayload,
  SynthesisWorkbenchSurfaceName,
  SynthesisWorkbenchSurfacePayload,
  SynthesisWorkbenchTab,
} from "../shared/synthesisWorkbenchWireContract";
import { createSynthesisWorkbenchChromeRenderer } from "./synthesisWorkbenchChromeRenderer";
import type { CitationGraphVendors } from "./components/graph/sigmaIsland";
import {
  listSynthesisWorkbenchBackgroundJobs,
  nextStatusbarExpiryDelayMs,
  projectSynthesisWorkbenchPanel,
  synthesisWorkbenchChromeSignatureInput,
  synthesisWorkbenchSurfaceForTab,
} from "./synthesisWorkbenchPanelModel";
import type {
  SynthesisWorkbenchActionSender,
  SynthesisWorkbenchControllerState,
  SynthesisWorkbenchPageSnapshot,
  SynthesisWorkbenchPanel,
  SynthesisWorkbenchSurfaceRuntime,
  SynthesisWorkbenchUiPatch,
} from "./synthesisWorkbenchTypes";
import type {
  SynthesisReviewCenterManualTarget,
  SynthesisReviewCenterManualTargetPickerState,
  SynthesisReviewCenterPendingReferenceDecision,
  SynthesisReviewCenterProposalAction,
  SynthesisReviewCenterReferenceReviewControl,
  SynthesisReviewCenterReferenceReviewState,
} from "./components/reviewCenter/ReviewCenterRegion";
import type { SynthesisRegistryReviewState } from "./components/registry/registryTypes";

declare const window: Window &
  typeof globalThis & {
    __zoteroSkillsSynthesisWorkbenchBridge?: SynthesisWorkbenchBridge;
  };

export function sendSynthesisWorkbenchAction<
  Action extends SynthesisWorkbenchActionName,
>(action: Action, payload?: SynthesisWorkbenchActionPayload<Action>): void {
  const direct = window.__zoteroSkillsSynthesisWorkbenchBridge;
  if (direct && typeof direct.postMessage === "function") {
    void Promise.resolve(direct.postMessage(action, payload)).catch(() => {
      // Fall through behavior is handled by later user actions.
    });
    return;
  }
  const message = {
    type: "synthesis:action",
    action,
    payload: payload || {},
  };
  const targets = [window.parent, window.top, window.opener];
  const seen = new Set<Window>();
  for (const target of targets) {
    if (!target || seen.has(target)) continue;
    seen.add(target);
    try {
      target.postMessage(message, "*");
    } catch {
      // ignore bridge target failures
    }
  }
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchControllerDeps = {
  sendAction: SynthesisWorkbenchActionSender;
  renderPanel: (panel: SynthesisWorkbenchPanel | null) => void;
  now?: () => number;
  // Statusbar timed entries need one re-render when the earliest entry
  // expires; the entry injects a timer-bound scheduler.
  scheduleChromeRender?: (delayMs: number) => void;
  // Accepted graph pages are available to the graph island and test adapters.
  onGraphPage?: (payload: SynthesisWorkbenchGraphPagePayload) => void;
  onDigest?: (result: SynthesisWorkbenchPaperDigestResult | undefined) => void;
  // html.lang / document.title side effect; injectable for tests.
  setDocumentChrome?: (locale: string, title: string) => void;
};

const WORKBENCH_SURFACE_NAMES: readonly SynthesisWorkbenchSurfaceName[] = [
  "home",
  "topics",
  "index",
  "review",
  "graph",
  "tags",
  "concepts",
  "reader",
];

function isWorkbenchSurfaceName(
  value: unknown,
): value is SynthesisWorkbenchSurfaceName {
  return WORKBENCH_SURFACE_NAMES.includes(
    value as SynthesisWorkbenchSurfaceName,
  );
}

const WORKBENCH_TABS: readonly SynthesisWorkbenchTab[] = [
  "overview",
  "artifacts",
  "registry",
  "reviews",
  "tags",
  "concepts",
  "graph",
  "reader",
];

const WORKBENCH_ACTION_NAMES: readonly SynthesisWorkbenchActionName[] = [
  "ready",
  "refresh",
  "selectTab",
  "setFilters",
  "setGraphView",
  "setTopicGraphView",
  "hostCommand",
  "showArtifactReader",
  "closeArtifactReader",
  "continueGraphWindow",
  "retryGraphWindow",
  "expandGraphNeighborhood",
  "openSynthesisSidecarDiagnostics",
  "retrySynthesisSidecar",
];

function isWorkbenchActionName(
  value: string,
): value is SynthesisWorkbenchActionName {
  return WORKBENCH_ACTION_NAMES.includes(value as SynthesisWorkbenchActionName);
}

function isWorkbenchTab(value: unknown): value is SynthesisWorkbenchTab {
  return WORKBENCH_TABS.includes(value as SynthesisWorkbenchTab);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isActionPayload<Action extends SynthesisWorkbenchActionName>(
  action: Action,
  payload: Record<string, unknown>,
): payload is SynthesisWorkbenchActionPayload<Action> {
  switch (action) {
    case "selectTab":
      return isWorkbenchTab(payload.tab);
    case "hostCommand":
      return (
        typeof payload.command === "string" &&
        (payload.args === undefined || isPlainRecord(payload.args))
      );
    case "showArtifactReader":
      return (
        typeof payload.topicId === "string" &&
        (payload.previousTab === undefined ||
          (isWorkbenchTab(payload.previousTab) &&
            payload.previousTab !== "reader"))
      );
    default:
      return true;
  }
}

function textValue(value: unknown, fallback = ""): string {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Merge one graph page into the current graph owner without changing basis. */
function mergeGraphRows<T extends { id: string }>(
  previous: readonly T[],
  next: readonly T[],
): T[] {
  const rows = new Map<string, T>();
  for (const row of [...previous, ...next]) {
    if (row.id) rows.set(row.id, row);
  }
  return Array.from(rows.values());
}

function mergeGraphPageSnapshot(
  previous: SynthesisWorkbenchPageSnapshot | null,
  next: SynthesisWorkbenchPageSnapshot,
): SynthesisWorkbenchPageSnapshot {
  if (!previous) return next;
  const previousGraph = previous.graph;
  const nextGraph = next.graph;
  const previousWindow = previousGraph.window;
  const nextWindow = nextGraph.window;
  const sameBasis =
    previousGraph.graph_hash === nextGraph.graph_hash &&
    previousWindow.querySignature === nextWindow.querySignature;
  if (!sameBasis) return next;

  const graph: SynthesisWorkbenchPageSnapshot["graph"] = {
    ...previousGraph,
    ...nextGraph,
    nodes: mergeGraphRows(previousGraph.nodes, nextGraph.nodes),
    edges: mergeGraphRows(previousGraph.edges, nextGraph.edges),
    hoverOnlyNodes: mergeGraphRows(
      previousGraph.hoverOnlyNodes,
      nextGraph.hoverOnlyNodes,
    ),
    hoverOnlyEdges: mergeGraphRows(
      previousGraph.hoverOnlyEdges,
      nextGraph.hoverOnlyEdges,
    ),
    visibleNodes: mergeGraphRows(
      previousGraph.visibleNodes,
      nextGraph.visibleNodes,
    ),
    visibleEdges: mergeGraphRows(
      previousGraph.visibleEdges,
      nextGraph.visibleEdges,
    ),
    window: {
      ...previousWindow,
      ...nextWindow,
      loadedNodes: 0,
      loadedEdges: 0,
    },
  };
  graph.window.loadedNodes = graph.nodes.length;
  graph.window.loadedEdges = graph.edges.length;
  return {
    ...previous,
    ...next,
    graph,
  };
}

function keyPart(value: unknown, fallback = ""): string {
  return textValue(value, fallback);
}

function normalizeGraphLayoutAlgorithm(value: unknown) {
  const text = textValue(value);
  return text === "radial" || text === "components" ? text : "force";
}

/** Legacy operationKey: stable dedupe/clear key for tracked host commands. */
export function synthesisWorkbenchOperationKey(
  command: string,
  args: Record<string, unknown> = {},
): string {
  if (!command) return "";
  switch (command) {
    case "manualRecomputeLayout":
      return `${command}:${normalizeGraphLayoutAlgorithm(args.algorithm || args.preset)}`;
    case "applyConceptReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "deleteConceptEntry":
      return `${command}:${keyPart(Array.isArray(args.conceptIds) ? args.conceptIds.join("_") : args.conceptId)}`;
    case "applyTopicGraphReviewAction":
      return `${command}:${keyPart(args.reviewId)}`;
    case "applyReferenceMatchProposalActions":
      return command;
    case "applyCanonicalRevisionReviewAction":
      return `${command}:${keyPart(args.reviewItemId || args.proposalId)}`;
    case "mergeEffectiveCanonicalReference":
      return `${command}:${keyPart(args.sourceEffectiveCanonicalId)}:${keyPart(args.targetEffectiveCanonicalId)}`;
    case "applyCanonicalRevisionMergeRequests":
      return command;
    case "updateCanonicalReferenceMetadata":
    case "archiveCanonicalReference":
      return `${command}:${keyPart(args.canonicalReferenceId)}`;
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args.edgeId)}`;
    case "applyTagVocabularyImport":
      return `${command}:${keyPart(args.action)}`;
    case "updateStagedTagSuggestion":
    case "updateTagVocabularyEntry":
    case "deleteTagVocabularyEntry":
      return `${command}:${keyPart(args.originalTag || args.tag)}`;
    case "promoteStagedTagSuggestions":
    case "discardStagedTagSuggestions":
      return `${command}:${keyPart(args.tag || (Array.isArray(args.tags) ? args.tags.join("_") : ""))}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args.topicId)}:${keyPart(args.language, "auto")}`;
    case "openTopicArtifact":
    case "exportTopicSynthesisReport":
    case "exportTopicDetailHtml":
    case "deleteTopicArtifact":
    case "resolveTopicPaperDigest":
      return `${command}:${keyPart(args.topicId)}`;
    default:
      return command;
  }
}

function shouldTrackLocalPendingAction(command: string): boolean {
  return command !== "openTopicArtifact";
}

function normalizeSurfaceRequestId(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function surfacePayloadRequestId(payload: Record<string, unknown>) {
  const direct = normalizeSurfaceRequestId(payload.requestId);
  if (direct !== undefined) return direct;
  const request = recordValue(payload.request);
  return normalizeSurfaceRequestId(request.requestId);
}

export function createSynthesisWorkbenchController(
  deps: SynthesisWorkbenchControllerDeps,
) {
  const now = deps.now || (() => Date.now());
  let lastPanel: Parameters<
    SynthesisWorkbenchControllerDeps["renderPanel"]
  >[0] = null;
  let graphGeneration: number | undefined;

  const state: SynthesisWorkbenchControllerState = {
    snapshot: null,
    i18n: {
      locale: "en-US",
      messages: { ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES },
    },
    ui: { sidebarExpanded: false, jobPopoverOpen: false },
    hostShape: "hosted",
    surfaces: {},
    acceptedSurfaceRequestIds: {},
    localPendingActions: new Map(),
    statusbarExpirations: new Map(),
    registryReview: {
      pendingDecisions: [],
      applying: false,
      applyingProposalIds: [],
      resolvedKeys: [],
    },
  };

  let referenceReviewState: SynthesisReviewCenterReferenceReviewState = {
    pendingDecisions: [],
    applying: false,
    applyingProposalIds: [],
    resolvedKeys: [],
    manualTargetPicker: null,
  };

  function t(key: SynthesisWorkbenchMessageKey): string {
    return (
      state.i18n.messages[key] || SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES[key]
    );
  }

  function operationLabel(command: string): string {
    const key =
      `synthesis-operation-${command}` as SynthesisWorkbenchMessageKey;
    return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? t(key) : command;
  }

  function visibleSurface(): SynthesisWorkbenchSurfaceName | null {
    return state.snapshot
      ? synthesisWorkbenchSurfaceForTab(state.snapshot.selectedTab)
      : null;
  }

  function surfaceRuntimeKey(
    surface: SynthesisWorkbenchSurfaceName,
    snapshot: SynthesisWorkbenchPageSnapshot | null = state.snapshot,
  ): string {
    if (surface !== "index") return surface;
    const scope = textValue(snapshot?.registry?.filters?.scope, "library");
    return `index:${
      scope === "referenced"
        ? "referenced"
        : scope === "all"
          ? "all"
          : "library"
    }`;
  }

  function surfaceRuntime(
    surface: SynthesisWorkbenchSurfaceName,
  ): SynthesisWorkbenchSurfaceRuntime | undefined {
    return state.surfaces[surfaceRuntimeKey(surface)];
  }

  function isStaleSurfacePayload(
    surface: SynthesisWorkbenchSurfaceName,
    requestId?: number,
  ): boolean {
    if (requestId === undefined) return false;
    return requestId < (state.acceptedSurfaceRequestIds[surface] || 0);
  }

  function acceptSurfacePayload(
    surface: SynthesisWorkbenchSurfaceName,
    requestId?: number,
  ): void {
    if (requestId === undefined) return;
    state.acceptedSurfaceRequestIds[surface] = Math.max(
      state.acceptedSurfaceRequestIds[surface] || 0,
      requestId,
    );
  }

  function markSurfaceRuntime(
    surface: SynthesisWorkbenchSurfaceName,
    status: SynthesisWorkbenchSurfaceRuntime["status"],
    error?: string,
    snapshot?: SynthesisWorkbenchPageSnapshot,
    details: {
      errorCode?: string;
      transient?: boolean;
      requestId?: number;
    } = {},
  ): void {
    const key = surfaceRuntimeKey(surface, snapshot || state.snapshot);
    const previous = state.surfaces[key];
    state.surfaces[key] = {
      status,
      revision: (previous?.revision || 0) + 1,
      error,
      errorCode: details.errorCode,
      transient: details.transient,
      requestId: details.requestId ?? previous?.requestId,
      snapshot: snapshot || previous?.snapshot,
    };
  }

  function clearResolvedLocalPending(
    snapshot: SynthesisWorkbenchPageSnapshot | null,
  ): void {
    if (!snapshot) return;
    const serverKeys = new Set(
      (snapshot.actions?.inFlight || []).map((entry) => entry.key),
    );
    const completedKey = snapshot.actions?.lastCompleted?.key;
    const failedKey = snapshot.actions?.lastFailed?.key;
    for (const key of Array.from(state.localPendingActions.keys())) {
      if (!serverKeys.has(key) || key === completedKey || key === failedKey) {
        state.localPendingActions.delete(key);
      }
    }
    reconcileReferenceReview(snapshot);
  }

  function pruneStatusbarExpirations(
    snapshot: SynthesisWorkbenchPageSnapshot | null,
  ): void {
    if (!snapshot) {
      state.statusbarExpirations.clear();
      return;
    }
    const retained = new Set<string>();
    const retain = (
      entry: SynthesisWorkbenchActionOperation | undefined,
      status: string | undefined = entry?.status,
    ) => {
      if (!entry || !status) return;
      retained.add(`${status}:${entry.key || entry.command}`);
    };
    retain(snapshot.actions?.lastCompleted, "completed");
    retain(snapshot.actions?.lastFailed, "failed");
    retain(snapshot.actions?.warnings?.slice(-1)[0], "warning");
    const failedJob = listSynthesisWorkbenchBackgroundJobs(snapshot).find(
      (job) => job.status === "failed",
    );
    if (failedJob) {
      retained.add(`failed:background:${failedJob.job_id}`);
    }
    retain(state.lastLocalAction);
    for (const key of state.statusbarExpirations.keys()) {
      if (!retained.has(key)) state.statusbarExpirations.delete(key);
    }
  }

  function syncRegistryReview(): void {
    state.registryReview = {
      pendingDecisions: referenceReviewState.pendingDecisions.map(
        ({ proposalId, action, targetLabel }) => ({
          proposalId,
          action:
            action as SynthesisRegistryReviewState["pendingDecisions"][number]["action"],
          ...(targetLabel ? { targetLabel } : {}),
        }),
      ),
      applying: referenceReviewState.applying,
      applyingProposalIds: [...referenceReviewState.applyingProposalIds],
      resolvedKeys: [...referenceReviewState.resolvedKeys],
      manualTargetPickerProposalId:
        referenceReviewState.manualTargetPicker?.proposalId,
    };
  }

  function updateReferenceReview(
    next: SynthesisReviewCenterReferenceReviewState,
  ): void {
    referenceReviewState = next;
    syncRegistryReview();
    state.referenceReview = {
      state: next,
      handlers: referenceReviewHandlers,
    };
  }

  function validReferenceAction(
    value: unknown,
  ): value is SynthesisReviewCenterProposalAction {
    return (
      value === "accept" ||
      value === "reverse_accept" ||
      value === "reject" ||
      value === "reopen" ||
      value === "delete" ||
      value === "manual_target"
    );
  }

  function validManualTarget(
    value: unknown,
  ): value is SynthesisReviewCenterManualTarget {
    const target = recordValue(value);
    return (
      (target.kind === "zotero_item" &&
        Number.isFinite(Number(target.libraryId)) &&
        Boolean(textValue(target.itemKey))) ||
      (target.kind === "canonical_reference" &&
        Boolean(textValue(target.canonicalReferenceId)))
    );
  }

  function narrowReferenceDecision(
    value: unknown,
  ): SynthesisReviewCenterPendingReferenceDecision | undefined {
    const record = recordValue(value);
    const proposalId = textValue(record.proposalId);
    const action = record.action;
    if (!proposalId || !validReferenceAction(action)) return undefined;
    const target = validManualTarget(record.target) ? record.target : undefined;
    return {
      proposalId,
      action,
      ...(target ? { target } : {}),
      ...(textValue(record.targetLabel)
        ? { targetLabel: textValue(record.targetLabel) }
        : {}),
    };
  }

  function reconcileReferenceReview(
    snapshot: SynthesisWorkbenchPageSnapshot,
  ): void {
    const completedKey = snapshot.actions?.lastCompleted?.key;
    const failedKey = snapshot.actions?.lastFailed?.key;
    const operationKey = "applyReferenceMatchProposalActions";
    if (completedKey !== operationKey && failedKey !== operationKey) {
      return;
    }
    const applyingIds = new Set(referenceReviewState.applyingProposalIds);
    const pending = referenceReviewState.pendingDecisions.filter(
      (decision) =>
        completedKey !== operationKey || !applyingIds.has(decision.proposalId),
    );
    const resolvedKeys =
      completedKey === operationKey
        ? Array.from(
            new Set([
              ...referenceReviewState.resolvedKeys,
              ...Array.from(applyingIds, (id) => `reference-match:${id}`),
            ]),
          )
        : referenceReviewState.resolvedKeys;
    updateReferenceReview({
      ...referenceReviewState,
      pendingDecisions: pending,
      applying: false,
      applyingProposalIds: [],
      resolvedKeys,
    });
  }

  const referenceReviewHandlers = {
    onQueueDecision: (
      proposalId: string,
      action: SynthesisReviewCenterProposalAction,
      options: {
        target?: SynthesisReviewCenterManualTarget;
        targetLabel?: string;
      } = {},
    ) => {
      const decision: SynthesisReviewCenterPendingReferenceDecision = {
        proposalId,
        action,
        ...(options.target ? { target: options.target } : {}),
        ...(options.targetLabel ? { targetLabel: options.targetLabel } : {}),
      };
      const pending = new Map(
        referenceReviewState.pendingDecisions.map((entry) => [
          entry.proposalId,
          entry,
        ]),
      );
      pending.set(proposalId, decision);
      updateReferenceReview({
        ...referenceReviewState,
        pendingDecisions: Array.from(pending.values()),
        manualTargetPicker: null,
      });
      renderCurrentPanel();
    },
    onQueueDecisions: (
      decisions: readonly SynthesisReviewCenterPendingReferenceDecision[],
    ) => {
      const pending = new Map(
        referenceReviewState.pendingDecisions.map((entry) => [
          entry.proposalId,
          entry,
        ]),
      );
      for (const decision of decisions) {
        if (decision.proposalId && validReferenceAction(decision.action)) {
          pending.set(decision.proposalId, decision);
        }
      }
      updateReferenceReview({
        ...referenceReviewState,
        pendingDecisions: Array.from(pending.values()),
      });
      renderCurrentPanel();
    },
    onCancelDecision: (proposalId: string) => {
      updateReferenceReview({
        ...referenceReviewState,
        pendingDecisions: referenceReviewState.pendingDecisions.filter(
          (entry) => entry.proposalId !== proposalId,
        ),
      });
      renderCurrentPanel();
    },
    onApplyPending: (
      decisions: readonly SynthesisReviewCenterPendingReferenceDecision[],
    ) => {
      if (referenceReviewState.applying || !decisions.length) return;
      const normalized = decisions
        .map(narrowReferenceDecision)
        .filter(
          (entry): entry is SynthesisReviewCenterPendingReferenceDecision =>
            Boolean(entry),
        );
      if (!normalized.length) return;
      updateReferenceReview({
        ...referenceReviewState,
        applying: true,
        applyingProposalIds: normalized.map((entry) => entry.proposalId),
      });
      dispatch("hostCommand", {
        command: "applyReferenceMatchProposalActions",
        args: { decisions: normalized },
      });
      renderCurrentPanel();
    },
    onClearPending: () => {
      if (referenceReviewState.applying) return;
      updateReferenceReview({
        ...referenceReviewState,
        pendingDecisions: [],
        manualTargetPicker: null,
      });
      renderCurrentPanel();
    },
    onOpenManualTargetPicker: (
      proposalId: string,
      sourceTitle: string,
      anchorRect?: SynthesisReviewCenterManualTargetPickerState["anchorRect"],
    ) => {
      updateReferenceReview({
        ...referenceReviewState,
        manualTargetPicker: { proposalId, sourceTitle, anchorRect },
      });
      renderCurrentPanel();
    },
    onCloseManualTargetPicker: () => {
      if (!referenceReviewState.manualTargetPicker) return;
      updateReferenceReview({
        ...referenceReviewState,
        manualTargetPicker: null,
      });
      renderCurrentPanel();
    },
    onMarkCanonicalResolved: (reviewItemId: string) => {
      if (!reviewItemId) return;
      updateReferenceReview({
        ...referenceReviewState,
        resolvedKeys: Array.from(
          new Set([
            ...referenceReviewState.resolvedKeys,
            `canonical-revision:${reviewItemId}`,
          ]),
        ),
      });
      renderCurrentPanel();
    },
  } satisfies SynthesisReviewCenterReferenceReviewControl["handlers"];

  const referenceReview: SynthesisReviewCenterReferenceReviewControl = {
    state: referenceReviewState,
    handlers: referenceReviewHandlers,
  };
  state.referenceReview = referenceReview;

  function readerTitle(): string {
    const detail = recordValue(state.topicDetail);
    return (
      textValue(detail.title) || textValue(state.artifactReader?.title) || ""
    );
  }

  function renderCurrentPanel(chromeOnly = false): void {
    pruneStatusbarExpirations(state.snapshot);
    const surface = visibleSurface();
    const panel = projectSynthesisWorkbenchPanel(state.snapshot, state.ui, {
      hostShape: state.hostShape,
      i18n: state.i18n,
      localPendingActions: state.localPendingActions,
      lastLocalAction: state.lastLocalAction,
      statusbarExpirations: state.statusbarExpirations,
      now: now(),
      readerTitle: readerTitle(),
      visibleSurface: surface || "home",
      surfaceRuntime: surface ? surfaceRuntime(surface) : undefined,
      topicDetail: state.topicDetail,
      artifactReader: state.artifactReader,
      digestResult: state.digestResult,
      standaloneDigests: state.standaloneDigests,
      registryReview: state.registryReview,
      referenceReview: {
        state: referenceReviewState,
        handlers: referenceReviewHandlers,
      },
      retainedBusiness: chromeOnly ? lastPanel?.business : undefined,
    });
    lastPanel = panel;
    deps.renderPanel(panel);
    const delay = nextStatusbarExpiryDelayMs(state.statusbarExpirations, now());
    if (delay !== undefined) {
      deps.scheduleChromeRender?.(delay);
    }
  }

  /**
   * Legacy applyI18nEnvelope: every host payload may carry an i18n envelope;
   * returns whether the effective locale/messages changed.
   */
  function applyI18nEnvelope(payload: unknown): boolean {
    const payloadRecord = recordValue(payload);
    if (!Object.prototype.hasOwnProperty.call(payloadRecord, "i18n")) {
      return false;
    }
    const envelope = recordValue(payloadRecord.i18n);
    const locale = textValue(envelope.locale, state.i18n.locale || "en-US");
    const incoming = recordValue(envelope.messages);
    const nextMessages: Record<SynthesisWorkbenchMessageKey, string> = {
      ...SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES,
      ...state.i18n.messages,
    };
    for (const key of Object.keys(
      nextMessages,
    ) as SynthesisWorkbenchMessageKey[]) {
      const message = textValue(incoming[key]);
      if (message) nextMessages[key] = message;
    }
    const changed =
      locale !== state.i18n.locale ||
      stableRegionSignature(nextMessages) !==
        stableRegionSignature(state.i18n.messages);
    state.i18n = { locale, messages: nextMessages };
    if (changed) {
      deps.setDocumentChrome?.(locale, t("synthesis-page-title"));
    }
    return changed;
  }

  function stripI18n(payload: unknown): unknown {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return payload;
    }
    const rest = { ...(payload as Record<string, unknown>) };
    delete rest.i18n;
    return rest;
  }

  function chromeSignature(): string {
    return stableRegionSignature(
      synthesisWorkbenchChromeSignatureInput({
        snapshot: state.snapshot,
        localPendingActions: state.localPendingActions,
        jobPopoverOpen: state.ui.jobPopoverOpen,
      }),
    );
  }

  // -- channel handlers -----------------------------------------------------

  /** synthesis:chrome — narrow chrome-only channel. */
  function applyChromeMessage(
    payload: SynthesisWorkbenchSnapshotPayload | null,
  ): void {
    const i18nChanged = applyI18nEnvelope(payload);
    const nextSnapshot = stripI18n(
      payload || null,
    ) as SynthesisWorkbenchPageSnapshot | null;
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    if (!state.snapshot) {
      renderCurrentPanel();
      return;
    }
    const nextChromeSignature = chromeSignature();
    if (i18nChanged) {
      state.lastChromeSignature = nextChromeSignature;
      renderCurrentPanel();
      return;
    }
    if (nextChromeSignature !== state.lastChromeSignature) {
      state.lastChromeSignature = nextChromeSignature;
      renderCurrentPanel(true);
    }
  }

  /** synthesis:surface — surface-scoped snapshot channel. */
  function applySurfaceMessage(
    payload: SynthesisWorkbenchSurfacePayload,
  ): void {
    const record = recordValue(payload);
    applyI18nEnvelope(record);
    const surface = String(record.surface || "");
    if (!isWorkbenchSurfaceName(surface)) {
      renderCurrentPanel();
      return;
    }
    const requestId = surfacePayloadRequestId(record);
    if (isStaleSurfacePayload(surface, requestId)) return;
    acceptSurfacePayload(surface, requestId);
    const nextSnapshot = stripI18n(
      record.snapshot || null,
    ) as SynthesisWorkbenchPageSnapshot | null;
    if (!nextSnapshot) {
      renderCurrentPanel();
      return;
    }
    markSurfaceRuntime(surface, "ready", undefined, nextSnapshot, {
      requestId,
    });
    if (visibleSurface() !== surface) {
      // A payload for a non-visible surface only updates the surface runtime
      // registry; the visible chrome/snapshot stay untouched (surface merge
      // order: the narrow surface channel never repaints chrome for another
      // surface).
      return;
    }
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    state.lastChromeSignature = chromeSignature();
    renderCurrentPanel();
  }

  /**
   * synthesis:graph-page — incremental graph window channel; staged and
   * forwarded to the graph island adapter via deps.onGraphPage.
   */
  function applyGraphPageMessage(
    payload: SynthesisWorkbenchGraphPagePayload,
  ): void {
    const record = recordValue(payload);
    applyI18nEnvelope(record);
    if (visibleSurface() !== "graph") return;
    const requestId = surfacePayloadRequestId(record);
    if (isStaleSurfacePayload("graph", requestId)) return;
    const rawSnapshot = stripI18n(
      record.snapshot || null,
    ) as SynthesisWorkbenchPageSnapshot | null;
    if (!rawSnapshot || rawSnapshot.selectedTab !== "graph") return;
    if (rawSnapshot.libraryId !== state.snapshot?.libraryId) return;
    if (graphGeneration !== undefined && payload.generation < graphGeneration)
      return;
    const generationChanged =
      graphGeneration !== undefined && payload.generation !== graphGeneration;
    graphGeneration = payload.generation;
    acceptSurfacePayload("graph", requestId);
    const nextSnapshot = generationChanged
      ? rawSnapshot
      : mergeGraphPageSnapshot(state.snapshot, rawSnapshot);
    state.snapshot = nextSnapshot;
    clearResolvedLocalPending(state.snapshot);
    const mergedPage = { ...payload, snapshot: nextSnapshot };
    state.latestGraphPage = mergedPage;
    markSurfaceRuntime("graph", "ready", undefined, nextSnapshot, {
      requestId,
    });
    deps.onGraphPage?.(mergedPage);
    renderCurrentPanel();
  }

  /** synthesis:surface-error — surface-scoped failure channel. */
  function applySurfaceErrorMessage(
    payload: SynthesisWorkbenchSurfaceErrorPayload,
  ): void {
    const record = recordValue(payload);
    applyI18nEnvelope(record);
    const surface = String(record.surface || "");
    if (!isWorkbenchSurfaceName(surface)) {
      renderCurrentPanel();
      return;
    }
    const requestId = surfacePayloadRequestId(record);
    if (isStaleSurfacePayload(surface, requestId)) return;
    acceptSurfacePayload(surface, requestId);
    const transient = record.transient === true;
    const message = textValue(
      record.message,
      t("synthesis-surface-error-message"),
    );
    state.lastLocalAction = {
      key: `surface-error:${surface}`,
      command: "refresh" as SynthesisWorkbenchActionOperation["command"],
      status: "failed",
      label: transient
        ? t("synthesis-surface-refreshing-label")
        : t("synthesis-surface-error-label"),
      completed_at: new Date(now()).toISOString(),
      message,
    };
    const cachedSnapshot =
      visibleSurface() === surface
        ? state.snapshot || undefined
        : surfaceRuntime(surface)?.snapshot;
    markSurfaceRuntime(
      surface,
      "failed",
      message,
      cachedSnapshot ?? undefined,
      {
        errorCode: textValue(record.code),
        transient,
        requestId,
      },
    );
    renderCurrentPanel();
  }

  /** synthesis:init / synthesis:snapshot — full snapshot channel. */
  function applySnapshotMessage(
    payload: SynthesisWorkbenchSnapshotPayload | null,
  ): void {
    applyI18nEnvelope(payload);
    const nextSnapshot = stripI18n(
      payload || null,
    ) as SynthesisWorkbenchPageSnapshot | null;
    state.snapshot = nextSnapshot;
    if (nextSnapshot) {
      markSurfaceRuntime(
        synthesisWorkbenchSurfaceForTab(nextSnapshot.selectedTab),
        "ready",
        undefined,
        nextSnapshot,
      );
    }
    clearResolvedLocalPending(state.snapshot);
    state.lastChromeSignature = chromeSignature();
    renderCurrentPanel();
  }

  function applyArtifactMessage(
    payload: SynthesisWorkbenchArtifactReaderPayload | undefined,
  ): void {
    state.artifactReader = payload || undefined;
    state.topicDetail = undefined;
    state.digestResult = undefined;
    if (state.snapshot && payload) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: "reader",
        reader: {
          topicId: payload.topicId || "",
          previousTab: state.snapshot.reader?.previousTab || "artifacts",
        },
      };
    }
    renderCurrentPanel();
  }

  function applyTopicDetailMessage(payload: unknown): void {
    state.topicDetail = payload || undefined;
    state.artifactReader = undefined;
    state.digestResult = undefined;
    const topicId = textValue(recordValue(payload).topicId);
    if (state.snapshot && payload) {
      state.snapshot = {
        ...state.snapshot,
        selectedTab: "reader",
        reader: {
          topicId,
          previousTab: state.snapshot.reader?.previousTab || "artifacts",
        },
      };
    }
    renderCurrentPanel();
  }

  function applyDigestMessage(
    payload: SynthesisWorkbenchPaperDigestResult | undefined,
  ): void {
    state.digestResult = payload || undefined;
    deps.onDigest?.(payload || undefined);
    renderCurrentPanel();
  }

  /** Single entry point for the window message listener. */
  function handleHostMessage(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;
    const type = (data as { type?: unknown }).type;
    const payload = (data as { payload?: unknown }).payload;
    switch (type) {
      case "synthesis:chrome":
        applyChromeMessage(
          (payload || null) as SynthesisWorkbenchSnapshotPayload | null,
        );
        return true;
      case "synthesis:surface":
        applySurfaceMessage(payload as SynthesisWorkbenchSurfacePayload);
        return true;
      case "synthesis:graph-page":
        applyGraphPageMessage(payload as SynthesisWorkbenchGraphPagePayload);
        return true;
      case "synthesis:surface-error":
        applySurfaceErrorMessage(
          payload as SynthesisWorkbenchSurfaceErrorPayload,
        );
        return true;
      case "synthesis:init":
      case "synthesis:snapshot":
        applySnapshotMessage(
          (payload || null) as SynthesisWorkbenchSnapshotPayload | null,
        );
        return true;
      case "synthesis:artifact":
        applyArtifactMessage(
          payload as SynthesisWorkbenchArtifactReaderPayload | undefined,
        );
        return true;
      case "synthesis:topic-detail":
        applyTopicDetailMessage(payload);
        return true;
      case "synthesis:digest":
        applyDigestMessage(
          payload as SynthesisWorkbenchPaperDigestResult | undefined,
        );
        return true;
      default:
        return false;
    }
  }

  // -- action dispatch --------------------------------------------------------

  function forwardToHost(action: string, payload: Record<string, unknown>) {
    if (!isWorkbenchActionName(action)) return;
    if (isActionPayload(action, payload)) deps.sendAction(action, payload);
  }

  function dispatch(action: string, payload: Record<string, unknown> = {}) {
    // Page-local UI intents.
    if (action === "toggleSidebar") {
      state.ui.sidebarExpanded = !state.ui.sidebarExpanded;
      renderCurrentPanel();
      return;
    }
    if (action === "toggleJobPopover") {
      state.ui.jobPopoverOpen = !state.ui.jobPopoverOpen;
      renderCurrentPanel();
      return;
    }
    // Legacy page-local macros: decomposed before crossing the wire.
    if (action === "openTopicCitationSubgraph") {
      const topicId = textValue(payload.topicId);
      if (topicId) {
        dispatch("setGraphView", { topicId, selectedElement: null });
        dispatch("selectTab", { tab: "graph" });
      }
      return;
    }
    if (action === "queueReferenceDecision") {
      const proposalId = textValue(payload.proposalId);
      const decisionAction = payload.action;
      if (!proposalId || !validReferenceAction(decisionAction)) return;
      const target = validManualTarget(payload.target)
        ? payload.target
        : undefined;
      referenceReviewHandlers.onQueueDecision(proposalId, decisionAction, {
        ...(target ? { target } : {}),
        ...(textValue(payload.targetLabel)
          ? { targetLabel: textValue(payload.targetLabel) }
          : {}),
      });
      return;
    }
    if (action === "queueReferenceDecisions") {
      const decisions = arrayValue(payload.decisions)
        .map(narrowReferenceDecision)
        .filter(
          (entry): entry is SynthesisReviewCenterPendingReferenceDecision =>
            Boolean(entry),
        );
      referenceReviewHandlers.onQueueDecisions?.(decisions);
      return;
    }
    if (action === "cancelReferenceDecision") {
      referenceReviewHandlers.onCancelDecision(textValue(payload.proposalId));
      return;
    }
    if (action === "applyPendingReferenceDecisions") {
      referenceReviewHandlers.onApplyPending(
        referenceReviewState.pendingDecisions,
      );
      return;
    }
    if (action === "clearPendingReferenceDecisions") {
      referenceReviewHandlers.onClearPending();
      return;
    }
    if (action === "openReferenceTargetPicker") {
      const proposalId = textValue(payload.proposalId);
      if (!proposalId) return;
      const anchor = recordValue(payload.anchorRect);
      referenceReviewHandlers.onOpenManualTargetPicker(
        proposalId,
        textValue(payload.sourceTitle),
        Object.keys(anchor).length
          ? (anchor as SynthesisReviewCenterManualTargetPickerState["anchorRect"])
          : undefined,
      );
      return;
    }
    if (action === "closeReferenceTargetPicker") {
      referenceReviewHandlers.onCloseManualTargetPicker();
      return;
    }
    if (action === "markCanonicalResolved") {
      referenceReviewHandlers.onMarkCanonicalResolved?.(
        textValue(payload.reviewItemId),
      );
      return;
    }
    if (action === "backToTopicDetail") {
      const topicId = textValue(payload.topicId);
      if (!topicId) return;
      dispatch("showArtifactReader", { topicId, previousTab: "graph" });
      return;
    }
    if (action === "selectTab") {
      const tab = payload.tab;
      if (isWorkbenchTab(tab) && state.snapshot) {
        state.snapshot = { ...state.snapshot, selectedTab: tab };
        if (tab !== "graph") graphGeneration = undefined;
        const surface = synthesisWorkbenchSurfaceForTab(tab);
        if (surfaceRuntime(surface)?.status !== "ready") {
          markSurfaceRuntime(surface, "loading");
        }
      }
      forwardToHost(action, payload);
      renderCurrentPanel();
      return;
    }
    if (action === "hostCommand") {
      const command = textValue(payload.command);
      const args = recordValue(payload.args);
      const key = synthesisWorkbenchOperationKey(command, args);
      if (key && shouldTrackLocalPendingAction(command)) {
        state.localPendingActions.set(key, {
          key,
          command: command as SynthesisWorkbenchActionOperation["command"],
          status: "pending",
          label: operationLabel(command),
          started_at: new Date(now()).toISOString(),
        });
      }
      forwardToHost(action, payload);
      renderCurrentPanel();
      return;
    }
    forwardToHost(action, payload);
  }

  function applyUiPatch(patch: SynthesisWorkbenchUiPatch): void {
    if (typeof patch.sidebarExpanded === "boolean") {
      state.ui.sidebarExpanded = patch.sidebarExpanded;
    }
    if (typeof patch.jobPopoverOpen === "boolean") {
      state.ui.jobPopoverOpen = patch.jobPopoverOpen;
    }
    renderCurrentPanel();
  }

  return {
    state,
    handleHostMessage,
    dispatch,
    applyUiPatch,
    renderCurrentPanel,
  };
}

export type SynthesisWorkbenchController = ReturnType<
  typeof createSynthesisWorkbenchController
>;

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export type SynthesisWorkbenchBootstrapOptions = {
  vendors?: CitationGraphVendors;
  root?: HTMLElement | null;
};

export function bootstrapSynthesisWorkbench(
  options: SynthesisWorkbenchBootstrapOptions = {},
) {
  const sendAction: SynthesisWorkbenchActionSender =
    sendSynthesisWorkbenchAction;
  let statusbarTimer: ReturnType<typeof setTimeout> | undefined;
  const controller = createSynthesisWorkbenchController({
    sendAction,
    renderPanel: (panel) => chromeRenderer.renderPanel(panel),
    scheduleChromeRender: (delayMs) => {
      if (statusbarTimer !== undefined) return;
      statusbarTimer = setTimeout(() => {
        statusbarTimer = undefined;
        controller.renderCurrentPanel();
      }, delayMs + 25);
    },
    setDocumentChrome: (locale, title) => {
      const html = document.documentElement as HTMLHtmlElement | null;
      if (html) html.lang = locale;
      document.title = title;
    },
  });
  const chromeRenderer = createSynthesisWorkbenchChromeRenderer({
    root: options.root,
    vendors: options.vendors,
    sendAction,
    dispatchAction: (action, payload) =>
      controller.dispatch(action, payload || {}),
    onUiChange: (patch) => controller.applyUiPatch(patch),
  });

  const handleMessage = (event: MessageEvent) =>
    controller.handleHostMessage(event.data);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (statusbarTimer !== undefined) clearTimeout(statusbarTimer);
    window.removeEventListener("message", handleMessage);
    window.removeEventListener("pagehide", dispose);
    chromeRenderer.renderPanel(null);
  };
  window.addEventListener("pagehide", dispose);
  window.addEventListener("message", handleMessage);
  sendSynthesisWorkbenchAction("ready", {});
  return Object.assign(controller, { dispose });
}
