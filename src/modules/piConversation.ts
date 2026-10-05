import type {
  PiModelSelectionSnapshot,
  PiSelection,
} from "../shared/piProviderContract";
import type {
  JsonValue,
  SelectedItemSummaryDto,
  WorkflowCallControl,
} from "../workflows/types";
import { getBaseName, joinPath } from "../utils/path";
import { sha256PrefixedHex } from "../utils/sha256";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import { resolveRuntimeToolkit } from "../utils/runtimeBridge";
import {
  createPiFailureCore,
  type PiFailureEffectCertainty,
  type PiFailureOrigin,
} from "../shared/piFailureContract";
import {
  flushOwner as flushPiRuntimeAuditOwner,
  record as recordPiRuntimeAudit,
} from "./piRuntimeAudit";
import { loadPiModelCatalog } from "./piModelCatalog";
import { listPiCredentials } from "./piCredentialStore";
import {
  loadPiProviderConfigurationState,
  resolvePiModelSelection,
} from "./piProviderConfiguration";
import {
  createPiProviderModelSource,
  createPiProviderSource,
} from "./piProviderExecution";
import {
  PiRuntime,
  type PiRuntimeModelSource,
  type PiTurnResult,
  type PiRuntimeMessage,
  type PiRuntimeResource,
  type PiRuntimeSessionOptions,
  type PiRuntimeUsage,
  type PiProviderTerminal,
  unknownPiRuntimeUsage,
} from "./piRuntime";
import {
  projectPiCanonicalSelection,
  type PiPurposeUsageTotals,
} from "../shared/piUsageContract";
import {
  failureEffectCertainty,
  freezePiToolGatewayTurn,
  type PiGatewayToolDefinition,
  type PiGatewayTurn,
  type PiGatewayPendingCall,
  type PiGatewayCallResult,
} from "./piToolGateway";
import {
  preparePiTurn,
  preparePiTitleInvocation,
  createPiNativeEstimator,
  type PiTurnPreparationInput,
  type PiTurnPreparationPorts,
  type PiCompactionSummary,
} from "./piTurnPreparation";
import { createPiTrustedNativeExecution } from "./piTrustedNativeExecution";
import { piOwnerPaths, type PiTranscriptEntry } from "./piTranscriptStore";
import {
  ensureRuntimeDirectoryStrict,
  resolveRuntimePathIdentity,
} from "./runtimePersistence";
import {
  createZoteroNativeToolDefinitions,
  type PiZoteroMutationContext,
  type PiZoteroMutationIdentity,
} from "./zoteroNativeToolCatalog";
import { createPiSynthesisToolDefinitions } from "./piSynthesisToolCatalog";
import {
  resolveZoteroHostCapabilityBroker,
  createZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import { getPiMcpToolSources } from "./piMcpRuntimeOwner";
import { getDefaultSynthesisClient } from "./synthesisClient/defaultClient";
import type { PiPhysicalSettlement } from "./piRuntimeLifecycle";
import { getPiBrokeredWebTools, type PiWebTurn } from "./piBrokeredWebTools";
import {
  createPiConversationOwner,
  inspectPiOwner,
  recordPiToolPhysicalEvidence,
  getPiConversationMetadata,
  listPiConversations,
  updatePiConversationMetadata,
  markPiConversationDeleting,
  cleanupPiConversation,
  appendPiConversationFact,
  admitPiConversationTurn,
  readPiConversationTranscriptSnapshot,
  createPiConversationPreparationAdapter,
  readPiConversationPage,
  getPiConversationProjection,
  listPiOwnerInventory,
  assessPiOwnerRecovery,
  recordPiExecutionCheckpoint,
  repairPiOwnerTornTail,
  reconcilePiOwnerOperationEvidence,
  type PiOwnerOperationObserver,
} from "./piOwnerPersistence";
import {
  getPiRuntimeLifecycle,
  waitForPiShutdown,
  type PiExecutionLease,
} from "./piRuntimeLifecycle";
import type {
  AssistantWorkspaceTranscriptItem,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistant/publication/assistantWorkspaceTranscriptPublication";

export type PiConversationResource =
  | {
      resourceId: string;
      kind: "selection";
      displayName: string;
      item: SelectedItemSummaryDto;
    }
  | { resourceId: string; kind: "file"; displayName: string; path: string };
export type PiConversationChange = {
  conversationId: string | null;
  kinds: (
    | "navigation"
    | "control"
    | "resources"
    | "presentation"
    | "details"
    | "counts"
    | "permission"
    | "transcript"
  )[];
  transcriptEvents?: AssistantWorkspaceTranscriptMutationEvent[];
  sourceEventSeq?: number;
};
type Options = {
  root?: string;
  /** Process admission; the singleton owns capacity, budget and shutdown. */
  lifecycle?: ReturnType<typeof getPiRuntimeLifecycle>;
  resolveModel?: (selection?: PiSelection) => Promise<PiModelSelectionSnapshot>;
  modelSource?: (selection: PiModelSelectionSnapshot) => PiRuntimeModelSource;
  execution?: (
    selection: PiModelSelectionSnapshot,
  ) => Omit<Extract<PiRuntimeSessionOptions, { source: unknown }>, "sessionId">;
  /**
   * The structured provider used for a compaction summary. It is separate from
   * `execution` because a compaction is an auxiliary invocation with its own
   * selection, and it is what makes the summary's real usage observable.
   */
  compactionExecution?: (
    selection: PiModelSelectionSnapshot,
  ) => Omit<Extract<PiRuntimeSessionOptions, { source: unknown }>, "sessionId">;
  definitions?: (conversationId: string) => Promise<PiGatewayToolDefinition[]>;
};
type LocalNetworkAuthorizer = (endpoint: string) => Promise<boolean>;

const id = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const ref = (ownerId: string) => ({ kind: "conversation" as const, ownerId });
const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));
const digest = async (value: unknown) => {
  const result = await sha256PrefixedHex(
    new TextEncoder().encode(JSON.stringify(value)),
  );
  if (!result) throw new Error("pi_hash_unavailable");
  return result;
};
const normalizeTitle = (text: string) =>
  Array.from(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || "",
  )
    .slice(0, 48)
    .join("");

/**
 * Production evidence source. The Broker is only ever read here: an
 * unavailable or unknown observation leaves its hold exactly where it was.
 */
function defaultPiOperationObserver(): PiOwnerOperationObserver {
  return async (request) =>
    resolveZoteroHostCapabilityBroker().mutations.getOperation(
      { operationId: request.operationId },
      request.scope,
    );
}

export function createPiConversationCoordinator(options: Options = {}) {
  const listeners = new Set<(change: PiConversationChange) => void>();
  const lifecycle = options.lifecycle ?? getPiRuntimeLifecycle();
  const drafts = new Map<string, PiConversationResource[]>();
  let selectedId: string | null = null;
  let disposed = false;
  const states = new Map<
    string,
    {
      status:
        | "idle"
        | "busy"
        | "cancelling"
        | "waiting_permission"
        | "failed"
        | "recovery_required";
      turnId: string;
      abort?: () => void;
      result?: Promise<PiTurnResult>;
      text: string;
      itemId: string;
      revision: number;
      unread: boolean;
      failure?: string;
      composerError?: string;
      sendAdmissionRevision: number;
      localEndpoint?: string;
      pending: PiGatewayPendingCall[];
      frozen?: PiTurnPreparationInput["frozen"];
      definitions: PiGatewayToolDefinition[];
      navigationTarget?: WorkflowCallControl["target"];
      invalidateNavigation?: () => void;
      usage: {
        main: number;
        title: number;
        compaction: number;
        input: number;
        output: number;
        cost: number;
        titleCost: number;
        compactionCost: number;
        /** Contributions whose cost could not be priced; keeps the total honest. */
        costUnknown: number;
        purposeTotals?: PiPurposeUsageTotals;
        legacyUnknown?: boolean;
      };
    }
  >();
  const titleTasks = new Map<
    string,
    { abort(): void; result: Promise<void>; settled?: Promise<unknown> }
  >();
  function state(conversationId: string) {
    let current = states.get(conversationId);
    if (!current) {
      const persisted = getPiConversationProjection(conversationId);
      current = {
        status: ["active", "waiting_permission", "state_unknown"].includes(
          persisted?.latestTurnStatus || "",
        )
          ? "recovery_required"
          : persisted?.latestTurnStatus === "failed"
            ? "failed"
            : "idle",
        turnId: persisted?.latestTurnId || "",
        text: "",
        itemId: "",
        revision: persisted?.contextRevision || 0,
        unread: false,
        sendAdmissionRevision: 0,
        pending: [],
        definitions: [],
        usage: {
          main: persisted?.usageTotals.totalTokens || 0,
          title: persisted?.usageTotals.titleTokens || 0,
          compaction: persisted?.usageTotals.compactionTokens || 0,
          input: persisted?.usageTotals.input || 0,
          output: persisted?.usageTotals.output || 0,
          cost: persisted?.usageTotals.cost || 0,
          titleCost: persisted?.usageTotals.titleCost || 0,
          compactionCost: persisted?.usageTotals.compactionCost || 0,
          costUnknown: persisted?.usageTotals.costUnknown || 0,
          purposeTotals: persisted?.usage?.purposeTotals,
        },
      };
      states.set(conversationId, current);
    }
    return current;
  }
  function metadata(conversationId: string) {
    const value = getPiConversationMetadata(conversationId);
    if (!value) throw new Error("pi_conversation_missing");
    return value;
  }
  function idle(conversationId: string) {
    const current = state(conversationId);
    if (current.status !== "idle" && current.status !== "failed")
      throw new Error("pi_conversation_not_replyable");
    if (metadata(conversationId).lifecycle !== "active")
      throw new Error("pi_conversation_lifecycle_frozen");
    return current;
  }
  const emit = (
    conversationId: string | null,
    kinds: PiConversationChange["kinds"],
    extra: Partial<PiConversationChange> = {},
  ) => {
    if (!disposed)
      for (const listener of listeners)
        listener({ conversationId, kinds, ...extra });
  };
  const resolveModel =
    options.resolveModel ||
    (async (ownerSelection?: PiSelection) =>
      resolvePiModelSelection({
        kind: "conversation",
        ownerSelection,
        catalog: await loadPiModelCatalog(),
        credentials: listPiCredentials(),
      }));
  const modelSource = (
    selection: PiModelSelectionSnapshot,
    localEndpoint?: string,
  ) =>
    options.modelSource
      ? options.modelSource(selection)
      : createPiProviderModelSource(selection, {
          authorizeLocalNetwork: async (endpoint) => endpoint === localEndpoint,
        });
  async function authorizeModel(
    conversationId: string,
    model: PiModelSelectionSnapshot,
    authorize?: LocalNetworkAuthorizer,
  ) {
    if (!model.requiresLocalNetwork) return;
    if (!(await authorize?.(model.baseUrl)))
      throw new Error("pi_local_network_unapproved");
    state(conversationId).localEndpoint = model.baseUrl;
  }
  const providerAdmission = (conversationId: string) => ({
    authorizeLocalNetwork: async (endpoint: string) =>
      state(conversationId).localEndpoint === endpoint,
  });
  /**
   * One admitted interaction owns one process lease. The lease deadline caps
   * the whole turn, and the budget checkpoint is written at the durable turn
   * boundaries so a later continuation inherits the remaining active time
   * instead of a fresh allowance.
   */
  /** Last committed, still resumable budget for a restarted continuation. */
  const readCanonicalRemaining = async (conversationId: string) => {
    const inspection = await inspectPiOwner(
      ref(conversationId),
      options.root,
    ).catch(() => null);
    if (!inspection || inspection.status !== "valid") return undefined;
    let latest: { remainingMs: number; resumeEligible: boolean } | undefined;
    for (const entry of inspection.entries) {
      if (entry.kind !== "execution_checkpoint") continue;
      const payload = entry.payload as {
        remainingMs?: unknown;
        resumeEligible?: unknown;
      };
      if (
        typeof payload.remainingMs === "number" &&
        typeof payload.resumeEligible === "boolean"
      )
        latest = {
          remainingMs: payload.remainingMs,
          resumeEligible: payload.resumeEligible,
        };
    }
    return latest?.resumeEligible ? latest.remainingMs : undefined;
  };
  const leaseOf = new Map<string, PiExecutionLease>();
  /** The auxiliary title's background lease, released on explicit delete. */
  const titleLeases = new Map<string, PiExecutionLease>();
  // Deletes that hit a live hold and were deferred. The retry happens when the
  // work that held the owner proves it settled, never on a timer.
  const deferredDeletes = new Set<string>();
  // Settles when a deferred deletion has run its retry, so a caller that
  // awaits the aborted work also awaits the completion it asked for.
  const deferredDeleteDone = new Map<string, Promise<void>>();
  // A permission decision continues the same logical turn, so its budget is
  // the checkpoint the waiting boundary committed. Without this the second
  // admission would silently hand the owner a fresh two hours.
  const continuationBudget = new Map<string, number>();
  const admit = async (
    conversationId: string,
    turnId: string,
    lane: "foreground" | "background",
    signal: AbortSignal,
    resume = false,
  ) => {
    const prior = leaseOf.get(conversationId);
    if (prior) prior.release();
    // A resume continues one logical turn and therefore spends what that turn
    // left. A brand new prompt always starts from the full ceiling. The
    // in-memory value covers the live process; the canonical fact covers a
    // restart, so a resumed turn never gains a fresh allowance either way.
    const restore = resume
      ? (continuationBudget.get(conversationId) ??
        (await readCanonicalRemaining(conversationId)))
      : undefined;
    continuationBudget.delete(conversationId);
    const lease = await lifecycle.acquire({
      owner: ref(conversationId),
      turnId,
      lane,
      signal,
      // The lifecycle clamps to the two hour ceiling, so a continuation can
      // only ever spend what the previous boundary left behind.
      ...(restore === undefined
        ? {}
        : { elapsedMs: 2 * 60 * 60 * 1000 - restore }),
    });
    leaseOf.set(conversationId, lease);
    return lease;
  };
  const releaseLease = (conversationId: string, resumeEligible: boolean) => {
    const lease = leaseOf.get(conversationId);
    if (!lease) return undefined;
    leaseOf.delete(conversationId);
    const value = lease.checkpoint(resumeEligible);
    lease.release();
    return value;
  };
  /**
   * A settled boundary commits the consumed budget before the owner idles, so
   * a later continuation reads a canonical remainder rather than an in-memory
   * guess. A commit failure is not swallowed: the owner falls back to recovery
   * because an unrecorded budget cannot be proven to be safe.
   */
  const checkpoint = async (
    conversationId: string,
    turnId: string,
    resumeEligible: boolean,
  ) => {
    const lease = leaseOf.get(conversationId);
    if (!lease) return;
    const value = lease.checkpoint(resumeEligible);
    if (resumeEligible)
      continuationBudget.set(conversationId, value.remainingMs);
    try {
      // The fact is durable before the capacity is released, so a crash in
      // between can never lose the budget this turn already spent.
      await recordPiExecutionCheckpoint(
        ref(conversationId),
        value,
        options.root,
      );
    } catch {
      leaseOf.delete(conversationId);
      lease.release();
      continuationBudget.delete(conversationId);
      const current = state(conversationId);
      if (current.status !== "waiting_permission") {
        current.status = "recovery_required";
        current.failure = "pi_execution_checkpoint_unavailable";
        emit(conversationId, ["control", "details"]);
      }
      return;
    }
    leaseOf.delete(conversationId);
    lease.release();
  };
  const fact = (
    conversationId: string,
    kind: string,
    payload: unknown,
    turnId?: string,
    entryId?: string,
  ) =>
    appendPiConversationFact(
      ref(conversationId),
      {
        kind,
        payload: json(payload),
        ...(turnId ? { turnId } : {}),
        ...(entryId ? { entryId } : {}),
      },
      options.root,
    );
  /**
   * One observed failure gets one canonical core, committed before any audit
   * evidence or higher projection references it. This helper deliberately
   * records no audit fact: the module that *observes* the failure owns its
   * evidence. A Gateway failure is observed by the Gateway, and a turn failure
   * is observed by this coordinator, so recording here would duplicate both.
   */
  const failureFact = (
    conversationId: string,
    code: string,
    turnId: string | undefined,
    detail: {
      origin?: PiFailureOrigin;
      effectCertainty?: PiFailureEffectCertainty;
    } = {},
  ) => {
    const core = createPiFailureCore({
      origin: detail.origin || "pi_conversation",
      code,
      failureId: id("failure"),
      ...(detail.effectCertainty
        ? { effectCertainty: detail.effectCertainty }
        : {}),
    });
    return fact(conversationId, "failure_observed", core, turnId).then(
      () => core,
    );
  };
  function setComposerError(conversationId: string, code?: string) {
    state(conversationId).composerError =
      code === "pi_resource_add_failed"
        ? code
        : code
          ? "pi_conversation_action_failed"
          : undefined;
    emit(conversationId, ["resources"]);
  }
  async function select(conversationId: string) {
    metadata(conversationId);
    if (selectedId !== conversationId)
      for (const current of states.values()) current.invalidateNavigation?.();
    selectedId = conversationId;
    state(conversationId).unread = false;
    emit(conversationId, ["navigation"]);
  }
  async function create() {
    let model: PiModelSelectionSnapshot;
    try {
      model = await resolveModel();
    } catch {
      return { status: "unavailable" as const };
    }
    const created = await createPiConversationOwner(
      {
        selection: JSON.stringify({
          configurationId: model.configurationId,
          modelId: model.modelId,
          reasoning: model.reasoning,
        }),
      },
      options.root,
    );
    await select(created.ref.ownerId);
    return { status: "created" as const, conversationId: created.ref.ownerId };
  }
  async function list(args: { archived?: boolean } = {}) {
    return listPiConversations({
      lifecycles: args.archived
        ? ["archived", "deleting", "cleanup_pending"]
        : ["active"],
    }).map((owner) => ({
      ...owner,
      status: state(owner.conversationId).status,
      messageCount:
        (getPiConversationProjection(owner.conversationId)?.counts.user || 0) +
        (getPiConversationProjection(owner.conversationId)?.counts.assistant ||
          0),
      canArchive: ["idle", "failed"].includes(
        state(owner.conversationId).status,
      ),
      attention:
        state(owner.conversationId).unread ||
        ["waiting_permission", "recovery_required"].includes(
          state(owner.conversationId).status,
        ),
    }));
  }
  async function readModel(conversationId: string) {
    const owner = metadata(conversationId);
    const current = state(conversationId);
    const projection = getPiConversationProjection(conversationId);
    let model: PiModelSelectionSnapshot | undefined;
    try {
      model = await resolveModel(
        owner.selection ? JSON.parse(owner.selection) : undefined,
      );
    } catch {
      /* Selection unavailability is represented by control state. */
    }
    const {
      navigationTarget: _target,
      invalidateNavigation: _invalidate,
      ...publicState
    } = current;
    return {
      ...owner,
      ...publicState,
      counts: projection?.counts,
      model,
      usage: {
        ...publicState.usage,
        purposeTotals:
          projection?.usage?.purposeTotals ?? publicState.usage.purposeTotals,
        legacyUnknown:
          !projection?.usage?.purposeTotals &&
          (!!projection?.usage ||
            Object.entries(projection?.usageTotals || {}).some(
              ([key, value]) => key !== "costUnknown" && value !== 0,
            ) ||
            (projection?.usageTotals.costUnknown || 0) > 0),
      },
      resources: resources(conversationId).map(
        ({ resourceId, kind, displayName }) => ({
          resourceId,
          kind,
          displayName,
        }),
      ),
      attention:
        current.unread ||
        ["waiting_permission", "recovery_required"].includes(current.status),
    };
  }
  async function rename(conversationId: string, title: string) {
    updatePiConversationMetadata(conversationId, {
      title,
      titleSource: "user",
    });
    emit(conversationId, ["navigation", "presentation", "details"]);
  }
  async function archive(conversationId: string) {
    idle(conversationId);
    updatePiConversationMetadata(conversationId, { lifecycle: "archived" });
    // Archive retains audit, so pending evidence settles before the owner goes
    // quiet. Best effort: a failed flush leaves a bounded gap, never a failure.
    await flushPiRuntimeAuditOwner(ref(conversationId), options.root);
    states.delete(conversationId);
    drafts.delete(conversationId);
    if (selectedId === conversationId) selectedId = null;
    emit(conversationId, ["navigation"]);
  }
  async function restore(conversationId: string) {
    updatePiConversationMetadata(
      conversationId,
      { lifecycle: "active" },
      { lifecycle: "archived" },
    );
    await select(conversationId);
  }
  /**
   * Completes a deletion the user already requested once the work that forced
   * it to defer has settled. A hold that is still real keeps deferring for
   * lifecycle maintenance; this never invents a deletion of its own.
   */
  async function finishDeferredDelete(conversationId: string) {
    if (lifecycle.closed || disposed) return;
    if (!deferredDeletes.has(conversationId)) return;
    const retried = await cleanupPiConversation(
      ref(conversationId),
      options.root,
      { isPhysicallyOccupied: (owner) => lifecycle.hasPhysicalHold(owner) },
    ).catch(() => undefined);
    if (retried?.status === "deleted") {
      deferredDeletes.delete(conversationId);
      states.delete(conversationId);
      drafts.delete(conversationId);
      emit(conversationId, ["navigation"]);
    }
  }

  async function deleteConversation(conversationId: string) {
    markPiConversationDeleting(conversationId, { lifecycle: "archived" });
    const title = titleTasks.get(conversationId);
    title?.abort();
    // An aborted title still holds its background lease until the provider
    // unwinds. Releasing it here is what lets the retry below judge the real
    // occupancy instead of work the user already asked to abandon.
    titleLeases.get(conversationId)?.release();
    titleLeases.delete(conversationId);
    // An explicit delete is a request, not a race: the aborted work is awaited
    // once so a purely in-flight executor is not mistaken for a live hold. A
    // hold that survives that — an unresolved outcome or a process that has
    // not really exited — still keeps the owner and its files, and lifecycle
    // maintenance retries it.
    // The title task settles its own lease in its finally, so awaiting the
    // task is also awaiting the release. Awaiting once more guarantees the
    // microtask that releases it has run before occupancy is judged.
    await title?.result.catch(() => undefined);
    // Permanent deletion is hold-safe: a live executor or an unresolved
    // outcome keeps the owner and its files until maintenance retries it.
    const result = await cleanupPiConversation(
      ref(conversationId),
      options.root,
      {
        isPhysicallyOccupied: (owner) => lifecycle.hasPhysicalHold(owner),
      },
    );
    states.delete(conversationId);
    drafts.delete(conversationId);
    if (result.status === "cleanup_pending") {
      deferredDeletes.add(conversationId);
      // The user already asked for this deletion. The only reason it deferred
      // is a still-settling executor whose work the abort above awaited, so a
      // single retry now finishes the request they made. A hold that is still
      // real keeps deferring for lifecycle maintenance. The retry runs when
      // the aborted work actually settles, because an executor that ignores
      // its abort is still occupying the owner and must not be judged gone.
      deferredDeleteDone.set(
        conversationId,
        (title?.settled ?? title?.result ?? Promise.resolve())
          .catch(() => undefined)
          .then(() => finishDeferredDelete(conversationId))
          .then(() => undefined),
      );
    } else deferredDeletes.delete(conversationId);
    emit(conversationId, ["navigation"]);
    return result;
  }
  async function setSelection(conversationId: string, selection: PiSelection) {
    idle(conversationId);
    await resolveModel(selection);
    updatePiConversationMetadata(conversationId, {
      selection: JSON.stringify(selection),
    });
    emit(conversationId, ["control", "presentation", "details"]);
  }
  function publishItem(
    conversationId: string,
    item: AssistantWorkspaceTranscriptItem,
  ) {
    const current = state(conversationId);
    emit(conversationId, ["transcript"], {
      sourceEventSeq: ++current.revision,
      transcriptEvents: [
        {
          boundary: "hard-boundary",
          cardinality: "insert",
          mutation: { op: "upsert_item", item },
        },
      ],
    });
  }
  function messageItem(
    entry: PiTranscriptEntry,
  ): AssistantWorkspaceTranscriptItem | null {
    const payload = entry.payload as Record<string, any>;
    const base = {
      itemId: entry.entryId,
      createdAt: entry.createdAt,
      updatedAt: null,
    };
    if (entry.kind === "message")
      return {
        ...base,
        itemKind: "message",
        role: payload.role,
        text:
          payload.text ||
          (payload.resources || [])
            .map((resource: { displayName: string }) => resource.displayName)
            .join("\n"),
        status: payload.status === "incomplete-visible" ? "error" : "complete",
        revision: null,
      };
    if (entry.kind === "thought")
      return {
        ...base,
        itemKind: "thought",
        text: payload.text || "",
        status: "complete",
      };
    if (entry.kind === "tool_result")
      return {
        ...base,
        itemKind: "tool-call",
        toolCallId: payload.callId,
        title: payload.name,
        toolName: payload.name,
        toolKind: null,
        inputSummary: null,
        resultSummary: String(payload.text || "").slice(0, 12000),
        summary: null,
        status: payload.status === "completed" ? "completed" : "failed",
      };
    if (entry.kind === "compaction")
      return {
        ...base,
        itemKind: "status",
        level: "info",
        label: "Compacted",
        text: "",
      };
    if (entry.kind === "turn_terminal" && payload.status === "failed")
      return {
        ...base,
        itemKind: "status",
        level: "error",
        label: "Failed",
        text: "",
      };
    return null;
  }
  async function readPage(
    conversationId: string,
    request: { cursor?: number | null; limit?: number } = {},
  ) {
    const limit = Math.min(80, Math.max(1, request.limit || 80));
    const page = await readPiConversationPage(
      ref(conversationId),
      { ...(request.cursor == null ? {} : { cursor: request.cursor }), limit },
      options.root,
    );
    const cursor = page.cursor;
    const items = page.entries
      .map(messageItem)
      .filter((item): item is AssistantWorkspaceTranscriptItem => !!item);
    return {
      items,
      cursor,
      limit,
      total: page.totalVisible,
      previousCursor: cursor ? Math.max(0, cursor - limit) : null,
      nextCursor: page.nextCursor,
      sourceEventSeq: state(conversationId).revision,
    };
  }
  async function definitions(
    conversationId: string,
    turnId: string,
    native: Awaited<ReturnType<typeof workspace>>,
    web: PiWebTurn,
    navigationTarget?: WorkflowCallControl["target"],
  ) {
    if (options.definitions) return options.definitions(conversationId);
    const mcp = await getPiMcpToolSources();
    const { piMcpGatewayDefinitions } = await import("./piMcpToolSources");
    const catalog = await mcp.getCatalogForTurn();
    const mutationEntryId = (
      context: PiZoteroMutationContext,
      suffix: string,
    ) =>
      digest([
        context.owner,
        context.sourceTurnId,
        context.callId,
        suffix,
      ]).then((value) => `zotero-${suffix}-${value.slice(7)}`);
    const storedMutationFact = async (entryId: string) => {
      const snapshot = await readPiConversationTranscriptSnapshot(
        ref(conversationId),
        options.root,
      );
      return snapshot.entries.find((entry) => entry.entryId === entryId);
    };
    return [
      ...native.definitions,
      ...createZoteroNativeToolDefinitions({
        broker: resolveZoteroHostCapabilityBroker(),
        workspace: native,
        navigationTarget,
        mutations: {
          identity: async (context) => {
            const entryId = await mutationEntryId(context, "identity");
            const existing = await storedMutationFact(entryId);
            const identity = existing?.payload as
              | PiZoteroMutationIdentity
              | undefined;
            if (identity) {
              const sources = await storedMutationFact(
                await mutationEntryId(context, "source-ids"),
              );
              return {
                ...identity,
                ...(sources?.payload as
                  | { generatedSourceReferenceIds: string[] }
                  | undefined),
              };
            }
            const value = {
              operationId: entryId,
              generatedSourceReferenceIds: [],
            };
            await fact(
              conversationId,
              "zotero_mutation_identity",
              value,
              context.sourceTurnId,
              entryId,
            );
            return value;
          },
          recordSourceIds: async (context, ids) => {
            const entryId = await mutationEntryId(context, "source-ids");
            await fact(
              conversationId,
              "zotero_mutation_source_ids",
              { generatedSourceReferenceIds: ids },
              context.sourceTurnId,
              entryId,
            );
          },
          recordDomainResult: async (context, result) => {
            const entryId = await mutationEntryId(context, "receipt");
            const evidence =
              "receipt" in result
                ? { outcome: result.outcome, receipt: result.receipt }
                : { outcome: result.outcome, attempt: result.attempt };
            await fact(
              conversationId,
              "zotero_mutation_receipt",
              evidence,
              context.sourceTurnId,
              entryId,
            );
            return entryId;
          },
        },
      }),
      ...createPiSynthesisToolDefinitions({
        resolveSynthesisClient: getDefaultSynthesisClient,
        workspace: native,
        recordOperation: async ({ callId, sourceTurnId, operation }) => {
          const { entry } = await fact(
            conversationId,
            "synthesis_maintenance_operation",
            { ...(callId ? { callId } : {}), operation },
            sourceTurnId || turnId,
          );
          return entry.entryId;
        },
      }),
      ...piMcpGatewayDefinitions(catalog, mcp),
      ...getPiBrokeredWebTools().definitions(web, (attempt, callId) =>
        fact(
          conversationId,
          "web_source_attempt",
          { ...attempt, callId },
          state(conversationId).turnId,
        ).then(() => {}),
      ),
    ];
  }
  async function gateway(
    conversationId: string,
    turnId: string,
    tools: PiGatewayToolDefinition[],
    signal: AbortSignal,
  ) {
    const navigationTarget = state(conversationId).navigationTarget;
    // The owner lease owns the absolute turn deadline and the process-wide
    // physical claim. A tool can therefore never outlive its budget, and its
    // resource claim is released only on real executor settlement.
    const lease = leaseOf.get(conversationId);
    return freezePiToolGatewayTurn({
      owner: ref(conversationId),
      ...(lease ? { deadline: lease.deadline } : {}),
      ...(lease
        ? { trackPhysical: (settlement) => lease.trackPhysical(settlement) }
        : {}),
      turnId,
      definitions: tools,
      runtimeCapability: {
        identity: "pi-conversation-runtime:v1",
        availableCapabilityIds: tools.map((tool) => tool.capabilityId),
      },
      policy: {
        mode: "interactive",
        systemAllowedEffects: [
          "bounded-read",
          "workspace-mutation",
          "code-execution",
          "external-egress",
          "external-mutation",
          "local-network",
          "zotero-mutation",
          "host-control",
        ],
        authorizedEffects: ["bounded-read", "external-egress"],
        authorizedKeys: [],
        maxCalls: 100,
        maxConcurrent: 4,
        maxCost: 100,
      },
      /**
       * Real executor evidence that arrived after the logical answer. It is
       * appended under the original call identity and never rewrites the
       * committed receipt or clears an unknown outcome by itself.
       */
      recordPhysicalEvidence: async (evidence): Promise<void> => {
        // Shutdown closes admission first, so a late append must not reopen
        // infrastructure that is already being torn down.
        if (lifecycle.closed) throw new Error("pi_shutdown_evidence_pending");
        // Awaited so the gateway only resolves the call's physical claim
        // after the evidence is durable. A rejecting owner is a hold, never an
        // unhandled rejection.
        // The canonical writer owns the stored shape: identity, physical state
        // and the executor's own certainty, never an outcome body.
        await recordPiToolPhysicalEvidence(
          ref(conversationId),
          {
            turnId: evidence.turnId,
            callId: evidence.callId,
            capabilityId: evidence.capabilityId,
            state: evidence.state,
            ...(evidence.outcome
              ? {
                  outcome: {
                    status: evidence.outcome.status,
                    effectCertainty: evidence.outcome.effectCertainty,
                  },
                }
              : {}),
            ...(evidence.domainOperation
              ? { domainOperation: evidence.domainOperation }
              : {}),
          },
          options.root,
        ).catch(() => undefined);
        // A call canceled while its executor was still running never emits a
        // result event, so its durable result would otherwise be lost and the
        // next turn's context would miss a tool message for a call the
        // assistant already made. The late outcome is appended under the same
        // call identity; the canceled turn itself stays unchanged.
        const outcome = evidence.outcome;
        if (!outcome) return;
        // The model knows the call by its tool name, not its capability, so
        // the durable result has to carry the name the catalog published.
        const name =
          tools.find((tool) => tool.capabilityId === evidence.capabilityId)
            ?.name ?? evidence.capabilityId;
        const already = await inspectPiOwner(
          ref(conversationId),
          options.root,
        ).catch(() => null);
        // Identity is turn plus call: two turns can legitimately use the same
        // callId, so a bare callId would suppress a real result.
        if (
          already?.entries.some(
            (entry) =>
              entry.kind === "tool_result" &&
              entry.turnId === evidence.turnId &&
              String((entry.payload as { callId?: unknown }).callId) ===
                evidence.callId,
          )
        )
          return;
        await fact(
          conversationId,
          "tool_result",
          {
            callId: evidence.callId,
            name,
            text: JSON.stringify({ status: outcome.status }),
            status: outcome.status,
            effectCertainty: outcome.effectCertainty,
          },
          evidence.turnId,
        ).catch(() => undefined);
      },
      hooks: {
        recordStarted: (value) =>
          fact(conversationId, "tool_call_started", value, turnId).then(
            () => {},
          ),
        recordReceipt: (value) =>
          fact(conversationId, "tool_call_receipt", value, turnId).then(
            () => {},
          ),
        recordPermission: (value) =>
          fact(
            conversationId,
            "permission_pending",
            { id: value.call.callId, pending: value },
            turnId,
          ).then(() => {}),
        // The gateway owns the tool failure, so it commits the canonical core
        // here and returns its identity. Audit and the turn projection reuse
        // that id instead of re-describing the cause.
        recordFailure: async (failure) =>
          (
            await failureFact(conversationId, failure.code, turnId, {
              origin: "pi_tool_gateway",
              effectCertainty: failureEffectCertainty(failure.effectCertainty),
            })
          ).failureId,
      },
      audit: {
        owner: ref(conversationId),
        ...(options.root ? { root: options.root } : {}),
      },
      signal,
      foregroundConversation: () =>
        !disposed && !!navigationTarget?.resolveAndValidate(),
    });
  }
  async function frozenFacts(
    conversationId: string,
    turnId: string,
    model: PiModelSelectionSnapshot,
    tools: PiGatewayTurn["catalog"],
    accepted: { ref: string; kind: string; displayName: string }[],
  ): Promise<PiTurnPreparationInput["frozen"]> {
    const estimator = createPiNativeEstimator();
    return {
      turnId,
      model,
      tools,
      capability: {
        envelopeDigest: await digest(tools.digest),
        receiptRef: `capability:${turnId}`,
      },
      policy: {
        outputReserve: Math.min(
          model.policy.maxTokens || 2048,
          Math.floor(model.policy.contextWindow / 4),
        ),
        safetyMargin: Math.min(
          1024,
          Math.floor(model.policy.contextWindow / 20),
        ),
        budgetVersion: "pi-conversation:v1",
        estimator: {
          id: estimator.id,
          version: estimator.version,
          mode: estimator.mode,
        },
        tailTargetTokens: Math.floor(model.policy.contextWindow / 4),
      },
      instructions: [],
      resources: {
        manifestDigest: await digest(accepted),
        skills: [],
        attachments: accepted
          .filter((item) => item.kind === "snapshot")
          .map(({ ref, displayName }) => ({ ref, displayName })),
        userFiles: [],
      },
    };
  }
  /**
   * Preparation runs under both the Runtime invocation signal and the process
   * lease signal, so a budget expiry or a shutdown aborts a summary in flight
   * instead of letting it publish after its owner stopped.
   */
  function anySignal(
    ...signals: (AbortSignal | undefined)[]
  ): AbortSignal | undefined {
    const present = signals.filter((value): value is AbortSignal => !!value);
    if (present.length < 2) return present[0];
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) return present[0];
    const controller = new Controller();
    for (const value of present) {
      if (value.aborted) {
        controller.abort();
        continue;
      }
      value.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return controller.signal;
  }
  async function preparation(
    conversationId: string,
    turnId: string,
    invocationId: string,
    frozen: PiTurnPreparationInput["frozen"],
    intent: PiTurnPreparationInput["intent"] = "initial",
    invocationSignal?: AbortSignal,
  ) {
    // The lease is the owner's own cancellation source; a nested provider or
    // tool call inherits it rather than consuming a second turn.
    const signal = anySignal(
      invocationSignal,
      leaseOf.get(conversationId)?.signal,
    );
    const estimator = createPiNativeEstimator();
    const ports: PiTurnPreparationPorts = {
      ...createPiConversationPreparationAdapter(
        ref(conversationId),
        options.root,
      ),
      estimator: {
        id: estimator.id,
        version: estimator.version,
        mode: estimator.mode,
      },
      estimate: estimator.estimate,
      async summarize(input) {
        const Controller = resolveNativeAbortControllerConstructor();
        if (!Controller) throw new Error("pi_signal_unavailable");
        const controller = new Controller();
        const onAbort = () => controller.abort();
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted) controller.abort();
        let output = "";
        const selectionRef = (
          await fact(
            conversationId,
            "model_selection",
            {
              purpose: "compaction",
              model: json(projectPiCanonicalSelection(input.model)),
            },
            turnId,
          )
        ).entry.entryId;
        const fallbackInvocationId = id("compaction");
        const usageByInvocation = new Map<
          string,
          {
            usage: PiRuntimeUsage;
            stopReason?: string;
            providerTerminal?: PiProviderTerminal;
          }
        >();
        try {
          const messages = [
            {
              role: "user" as const,
              text: JSON.stringify({
                messages: input.summaryInput,
                schemaVersion: 1,
                inputDigest: input.inputDigest,
                coveredEntryIds: input.coveredEntryIds,
                retainedEntryIds: input.retainedEntryIds,
              }),
            },
          ];
          // The structured provider reports the invocation's real terminal
          // usage. The legacy text-delta seam has none, so its compaction
          // stays explicitly unknown instead of being estimated from text.
          const structured = options.compactionExecution
            ? options.compactionExecution(input.model)
            : options.modelSource
              ? undefined
              : createPiProviderSource(
                  input.model,
                  providerAdmission(conversationId),
                );
          if (structured) {
            const session = new PiRuntime().openSession({
              sessionId: `${conversationId}:compaction:${invocationId}`,
              ...structured,
            });
            const turn = session.runTurn({
              turnId: `${turnId}:compaction`,
              messages,
              systemPrompt: input.prompt,
              onEvent: (event) => {
                if (event.kind === "invocation_started") {
                  if (usageByInvocation.size < 20)
                    usageByInvocation.set(event.invocationId, {
                      usage: unknownPiRuntimeUsage(),
                    });
                } else if (event.kind === "assistant_message") {
                  output += event.text;
                  const contribution = usageByInvocation.get(
                    event.invocationId,
                  );
                  if (contribution) contribution.usage = event.usage;
                } else if (event.kind === "invocation_terminal") {
                  const contribution = usageByInvocation.get(
                    event.invocationId,
                  );
                  if (contribution) {
                    if (event.usage) contribution.usage = event.usage;
                    contribution.stopReason = event.stopReason;
                    if (event.providerTerminal)
                      contribution.providerTerminal = event.providerTerminal;
                  }
                }
              },
            });
            controller.signal.addEventListener("abort", () => turn.abort(), {
              once: true,
            });
            if (controller.signal.aborted) turn.abort();
            leaseOf.get(conversationId)?.trackPhysical(turn.settled);
            const result = await turn.result;
            session.dispose();
            if (result.status !== "completed")
              throw new Error("pi_summary_failed");
          } else {
            const source = modelSource(
              input.model,
              state(conversationId).localEndpoint,
            );
            for await (const part of source({
              systemPrompt: input.prompt,
              messages,
              signal: controller.signal,
            })) {
              output += part;
              if (output.length > 256 * 1024) {
                controller.abort();
                throw new Error("pi_summary_too_large");
              }
            }
          }
          return JSON.parse(output) as PiCompactionSummary;
        } finally {
          signal?.removeEventListener("abort", onAbort);
          const current = state(conversationId).usage;
          if (usageByInvocation.size === 0)
            usageByInvocation.set(fallbackInvocationId, {
              usage: unknownPiRuntimeUsage(),
            });
          for (const [invocationId, evidence] of usageByInvocation) {
            await fact(
              conversationId,
              "compaction_usage",
              {
                purpose: "compaction",
                intent,
                invocationId,
                selectionRef,
                usage: evidence.usage,
                ...(evidence.stopReason
                  ? { stopReason: evidence.stopReason }
                  : {}),
                ...(evidence.providerTerminal
                  ? { providerTerminal: evidence.providerTerminal }
                  : {}),
              },
              turnId,
            );
            current.compaction += evidence.usage.totalTokens;
            if (evidence.usage.costEstimate === null) current.costUnknown += 1;
            else current.compactionCost += evidence.usage.costEstimate;
          }
        }
      },
    };
    // Auxiliary facts may advance the basis before record CAS; retry only pre-call preparation.
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) throw new Error("pi_send_canceled");
      const prepared = await preparePiTurn(
        {
          intent,
          owner: ref(conversationId),
          turnId,
          invocationId,
          runtimeGeneration: turnId,
          ownerIdle: intent === "manual_compaction",
          transcript: await readPiConversationTranscriptSnapshot(
            ref(conversationId),
            options.root,
          ),
          frozen: { ...frozen, turnId },
        },
        ports,
      );
      if (prepared.status !== "failed") return prepared.context;
      if (prepared.failure.code !== "record_failed" || attempt === 2) {
        state(conversationId).failure = prepared.failure.code;
        throw new Error(prepared.failure.code);
      }
    }
    throw new Error("record_failed");
  }
  async function startRuntime(
    conversationId: string,
    turnId: string,
    model: PiModelSelectionSnapshot,
    toolGateway: PiGatewayTurn,
  ) {
    const current = state(conversationId);
    current.status = "busy";
    current.turnId = turnId;
    const session = options.execution
      ? new PiRuntime().openSession({
          sessionId: `${conversationId}:${turnId}`,
          ...options.execution(model),
        })
      : options.modelSource
        ? new PiRuntime().openSession({
            sessionId: `${conversationId}:${turnId}`,
            modelStream: modelSource(model, current.localEndpoint),
          })
        : new PiRuntime().openSession({
            sessionId: `${conversationId}:${turnId}`,
            ...createPiProviderSource(model, providerAdmission(conversationId)),
          });
    // Declared before the turn exists: the Runtime may emit events while the
    // session is still being built, and a temporal dead zone there would drop
    // every canonical fact of the turn.
    const openInvocations = new Set<string>();
    let assistantMessagePersisted = false;
    const turn = session.runTurn({
      turnId,
      messages: [],
      tools: toolGateway.catalog.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        execute: async () => {
          throw new Error("pi_gateway_required");
        },
      })),
      async prepareInvocation({ invocationId, invocationIndex, signal }) {
        const context = await preparation(
          conversationId,
          turnId,
          invocationId,
          current.frozen!,
          invocationIndex ? "continuation" : "initial",
          signal,
        );
        current.itemId = id("assistant");
        current.text = "";
        assistantMessagePersisted = false;
        const messages: PiRuntimeMessage[] = context.messages.map((message) => {
          if (message.role === "tool")
            return {
              role: "tool",
              callId: message.callId!,
              name: message.name!,
              text: message.text,
              isError: message.isError === true,
            };
          if (message.role === "assistant")
            return {
              role: "assistant",
              text: message.text,
              ...(message.toolCalls
                ? {
                    toolCalls: message.toolCalls.map((call) => ({
                      callId: call.callId,
                      name: call.name,
                      arguments: call.arguments ?? {},
                    })),
                  }
                : {}),
            };
          return {
            role: "user",
            text: message.text,
            ...(Array.isArray(message.resources)
              ? { resources: message.resources as PiRuntimeResource[] }
              : {}),
          };
        });
        return {
          systemPrompt: context.blocks.map((block) => block.text).join("\n\n"),
          messages,
          tools: toolGateway.catalog.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            schema: tool.schema,
            execute: async () => {
              throw new Error("pi_gateway_required");
            },
          })),
        };
      },
      async executeTools(batch) {
        const result = await toolGateway.executeBatch(
          batch.calls.map((call) => ({ ...call })),
        );
        current.pending = result.pending;
        if (result.pending.length) {
          current.status = "waiting_permission";
          emit(conversationId, ["permission", "control", "navigation"]);
        }
        return {
          results: result.results
            .filter((value) => value.status !== "permission_required")
            .map((value) => ({
              callId: value.callId,
              name: value.name,
              text: JSON.stringify(value),
              isError: value.status !== "completed",
            })),
          suspended: result.pending.length > 0,
          unknown: result.results
            .filter((value) => value.effectCertainty === "unknown")
            .map((value) => value.callId),
        };
      },
      /**
       * Actual provider completion. A canceled turn never emits its logical
       * terminal, so this separate canonical fact is the only honest closure.
       * It is a non-context fact, so an interrupted conversation can still
       * continue, and it never fabricates a result.
       */
      async onInvocationSettled({ invocationId }) {
        openInvocations.delete(invocationId);
        // A closing process must not reopen owner storage from a late
        // callback. The provider really exited, but a fact written after
        // shutdown belongs to the next start's explicit recovery instead.
        if (lifecycle.closed || disposed)
          throw new Error("pi_shutdown_evidence_pending");
        await fact(
          conversationId,
          "model_invocation_settled",
          { invocationId, physicalOutcome: "settled" },
          turnId,
        );
      },
      async onEvent(event) {
        try {
          if (
            current.turnId !== turnId ||
            (current.status === "cancelling" &&
              event.kind !== "invocation_terminal" &&
              event.kind !== "tool_result")
          )
            return;
          if (event.kind === "invocation_started") {
            openInvocations.add(event.invocationId);
            await fact(
              conversationId,
              "model_invocation_started",
              { invocationId: event.invocationId },
              turnId,
            );
          } else if (event.kind === "text_delta") {
            if (!current.text)
              publishItem(conversationId, {
                itemId: current.itemId,
                itemKind: "message",
                role: "assistant",
                text: event.text,
                createdAt: new Date().toISOString(),
                updatedAt: null,
                status: "streaming",
                revision: null,
              });
            else
              emit(conversationId, ["transcript"], {
                sourceEventSeq: ++current.revision,
                transcriptEvents: [
                  {
                    boundary: "text-continuation",
                    cardinality: "retain",
                    mutation: {
                      op: "append_text",
                      itemId: current.itemId,
                      text: event.text,
                    },
                  },
                ],
              });
            current.text += event.text;
          } else if (event.kind === "assistant_message") {
            assistantMessagePersisted = true;
            const toolCalls = await Promise.all(
              event.toolCalls.map(async (call) => ({
                ...call,
                argumentsDigest: await digest(call.arguments),
              })),
            );
            const entry = await fact(
              conversationId,
              "message",
              {
                role: "assistant",
                text: event.text,
                toolCalls,
                usage: event.usage,
                // The contribution identity keeps one invocation's usage and
                // cost a single canonical fact across replays and rebuilds.
                invocationId: event.invocationId,
                purpose: "main",
              },
              turnId,
              current.itemId,
            );
            current.usage.main += event.usage.totalTokens;
            current.usage.input += event.usage.input;
            current.usage.output += event.usage.output;
            // The SDK cost block reports zero for an unmapped target, so the
            // owner's running total follows the project estimate instead.
            if (event.usage.costEstimate === null)
              current.usage.costUnknown += 1;
            else current.usage.cost += event.usage.costEstimate;
            if (event.thinking) {
              const thought = await fact(
                conversationId,
                "thought",
                { text: event.thinking },
                turnId,
              );
              publishItem(conversationId, messageItem(thought.entry)!);
            }
            if (current.text)
              emit(conversationId, ["transcript"], {
                sourceEventSeq: ++current.revision,
                transcriptEvents: [
                  {
                    boundary: "hard-boundary",
                    cardinality: "retain",
                    mutation: {
                      op: "patch_item",
                      itemId: current.itemId,
                      patch: { status: "complete" },
                    },
                  },
                ],
              });
            else publishItem(conversationId, messageItem(entry.entry)!);
            if (selectedId !== conversationId) current.unread = true;
          } else if (event.kind === "tool_result") {
            const result = JSON.parse(event.text) as PiGatewayCallResult;
            const entry = await fact(
              conversationId,
              "tool_result",
              {
                callId: event.callId,
                name: event.name,
                text: event.text,
                status:
                  result.status === "state_unknown"
                    ? "state_unknown"
                    : result.status,
                effectCertainty: result.effectCertainty,
              },
              turnId,
            );
            if (result.effectCertainty === "unknown")
              current.status = "recovery_required";
            publishItem(conversationId, messageItem(entry.entry)!);
          } else if (event.kind === "invocation_terminal") {
            openInvocations.delete(event.invocationId);
            if (
              event.providerTerminal?.status === "incomplete" &&
              current.text &&
              !assistantMessagePersisted
            ) {
              const incomplete = await fact(
                conversationId,
                "message",
                {
                  role: "assistant",
                  text: current.text,
                  status: "incomplete-visible",
                },
                turnId,
                current.itemId,
              );
              assistantMessagePersisted = true;
              publishItem(conversationId, messageItem(incomplete.entry)!);
            }
            await fact(
              conversationId,
              "model_invocation_terminal",
              {
                invocationId: event.invocationId,
                stopReason: event.stopReason,
                ...(event.providerTerminal
                  ? { providerTerminal: event.providerTerminal }
                  : {}),
                ...(event.usage ? { usage: event.usage, purpose: "main" } : {}),
              },
              turnId,
            );
            if (event.usage) {
              current.usage.main += event.usage.totalTokens;
              current.usage.input += event.usage.input;
              current.usage.output += event.usage.output;
              if (event.usage.costEstimate === null)
                current.usage.costUnknown += 1;
              else current.usage.cost += event.usage.costEstimate;
            }
          }
        } catch {
          current.failure = "persistence_failed";
          current.status = "recovery_required";
          current.abort?.();
        }
      },
    });
    current.abort = turn.abort;
    emit(conversationId, ["control", "navigation", "counts"]);
    // Physical occupancy is the Agent's real completion, not the bounded
    // logical result: a canceled turn still holds capacity until the provider
    // actually exits, so admission can never over-admit in the meantime.
    leaseOf.get(conversationId)?.trackPhysical(turn.settled);
    current.result = (async () => {
      let result = await turn.result;
      const persistenceFailure = (): PiTurnResult => ({
        status: "failed",
        failure: {
          code: "runtime_failed",
          message: "Conversation history could not be committed",
        },
      });
      if (current.failure === "persistence_failed")
        result = persistenceFailure();
      // A failed turn commits its failure core once, before the terminal fact
      // that references it. Both share one identity: propagation, the owner
      // projection and audit all point at this failureId.
      let failureId: string | undefined;
      let failureCommitted = true;
      let terminalCommitted = false;
      if (result.status === "failed") {
        try {
          failureId = (
            await failureFact(conversationId, result.failure.code, turnId)
          ).failureId;
          result = { ...result, failure: { ...result.failure, failureId } };
          // The turn observed this failure, so the coordinator records the
          // evidence. The Gateway records its own separately, and a
          // propagated cause is not a second observation.
          recordPiRuntimeAudit({
            operation: "failure.observed",
            origin: "conversation",
            owner: ref(conversationId),
            root: options.root,
            correlation: { turnId, failureId },
            failureCode: result.failure.code,
          });
        } catch {
          // The canonical commit failed, so no terminal may describe this
          // failure: the observation it would reference does not exist. The
          // owner requires recovery and records the evidence gap instead of
          // publishing a terminal for a fact that was never written.
          failureId = undefined;
          failureCommitted = false;
        }
      }
      if (!failureCommitted) {
        current.failure = "persistence_failed";
        current.status = "recovery_required";
        result = persistenceFailure();
        recordPiRuntimeAudit({
          operation: "audit.gap",
          origin: "persistence",
          owner: ref(conversationId),
          root: options.root,
          correlation: { turnId },
          attributes: { reason: "canonical_failure_unavailable" },
        });
      } else
        try {
          await fact(
            conversationId,
            "turn_terminal",
            {
              turnId,
              status:
                current.status === "recovery_required"
                  ? "state_unknown"
                  : result.status,
              ...(result.status === "failed"
                ? {
                    failure: result.failure.code,
                    ...(failureId ? { failureId } : {}),
                  }
                : {}),
            },
            turnId,
          );
          terminalCommitted = true;
        } catch {
          current.failure = "persistence_failed";
          current.status = "recovery_required";
          result = persistenceFailure();
        }
      if (current.status !== "recovery_required")
        current.status =
          result.status === "waiting_permission"
            ? "waiting_permission"
            : result.status === "failed"
              ? "failed"
              : "idle";
      if (result.status === "failed") {
        current.failure ||= result.failure.code;
        if (
          [
            "recovery_required",
            "transcript_integrity_failed",
            "preparation_waiting",
          ].includes(current.failure)
        )
          current.status = "recovery_required";
      }
      if (selectedId !== conversationId && result.status === "failed")
        current.unread = true;
      current.abort = undefined;
      if (current.status !== "waiting_permission") {
        current.invalidateNavigation?.();
        current.invalidateNavigation = undefined;
        current.navigationTarget = undefined;
        current.definitions = [];
      }
      session.dispose();
      // The turn reached a durable terminal, so the consumed active budget is
      // checkpointed exactly once. A turn that ended in recovery records no
      // resume-eligible checkpoint, which keeps its continuation blocked.
      await checkpoint(
        conversationId,
        turnId,
        terminalCommitted && current.status !== "recovery_required",
      );
      // Owner terminal is recorded by the coordinator that owns the turn, once
      // the canonical terminal fact is committed. Propagation layers and the
      // Workspace surfaces deliberately do not repeat it. A turn that fell back
      // to recovery has no committed terminal, so it records no owner terminal
      // either.
      if (terminalCommitted) {
        if (result.status === "canceled")
          recordPiRuntimeAudit({
            operation: "execution.canceled",
            origin: "conversation",
            owner: ref(conversationId),
            root: options.root,
            correlation: { turnId },
          });
        recordPiRuntimeAudit({
          operation: "owner.terminal",
          origin: "conversation",
          owner: ref(conversationId),
          root: options.root,
          correlation: {
            turnId,
            ...(failureId ? { failureId } : {}),
          },
          attributes: {
            status:
              current.status === "recovery_required"
                ? "state_unknown"
                : result.status,
            ...(result.status === "failed"
              ? { reason: result.failure.code }
              : {}),
          },
        });
        // Terminal is a flush boundary: the owner's evidence is settled before
        // the turn is reported finished.
        await flushPiRuntimeAuditOwner(ref(conversationId), options.root);
      }
      emit(conversationId, [
        "control",
        "navigation",
        "presentation",
        "details",
        "counts",
      ]);
      return result;
    })();
    return { result: current.result, abort: turn.abort };
  }
  async function send(
    conversationId: string,
    text: string,
    authorizeLocalNetwork?: LocalNetworkAuthorizer,
    navigationTarget?: WorkflowCallControl["target"],
  ) {
    const current = idle(conversationId);
    // Bind this interaction once; a validator can only retain its original window.
    let sourceWindow: _ZoteroTypes.MainWindow | null | undefined;
    try {
      sourceWindow = navigationTarget?.resolveAndValidate();
    } catch {
      sourceWindow = null;
    }
    let sourceValid = !!sourceWindow;
    current.invalidateNavigation?.();
    current.invalidateNavigation = () => {
      sourceValid = false;
    };
    current.navigationTarget = sourceValid
      ? {
          resolveAndValidate() {
            try {
              sourceValid =
                sourceValid &&
                !disposed &&
                !sourceWindow?.closed &&
                navigationTarget?.resolveAndValidate() === sourceWindow;
            } catch {
              sourceValid = false;
            }
            return sourceValid ? sourceWindow : null;
          },
        }
      : undefined;
    const draft = [...resources(conversationId)];
    if (!text.trim() && !draft.length) throw new Error("pi_message_empty");
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) throw new Error("pi_signal_unavailable");
    const controller = new Controller();
    const checkPreflight = () => {
      if (controller.signal.aborted || disposed)
        throw new Error("pi_send_canceled");
    };
    let admittedTurnId: string | undefined;
    current.status = "busy";
    current.abort = () => controller.abort();
    current.failure = undefined;
    current.composerError = undefined;
    emit(conversationId, ["control"]);
    try {
      const turnId = id("turn");
      // Process admission comes first: a prompt that cannot get foreground
      // capacity never freezes resources or dispatches a model turn.
      await admit(conversationId, turnId, "foreground", controller.signal);
      checkPreflight();
      const owner = metadata(conversationId);
      const model = await resolveModel(
        owner.selection ? JSON.parse(owner.selection) : undefined,
      );
      // A turn that inherited a default anchors the choice it actually made.
      // A later default change then revalidates this choice instead of
      // silently switching a saved owner; an explicit user change is never
      // overwritten.
      if (!owner.selection)
        await updatePiConversationMetadata(conversationId, {
          selection: JSON.stringify({
            configurationId: model.configurationId,
            modelId: model.modelId,
            reasoning: model.reasoning,
          } satisfies PiSelection),
        });
      checkPreflight();
      await authorizeModel(conversationId, model, authorizeLocalNetwork);
      checkPreflight();
      const native = await workspace(conversationId);
      checkPreflight();
      const accepted: {
        ref: string;
        kind: "snapshot" | "selection";
        displayName: string;
      }[] = [];
      for (const resource of draft.filter(
        (item) => item.kind === "selection",
      )) {
        if (resource.kind !== "selection") continue;
        await resolveZoteroHostCapabilityBroker().library.getItemDetail(
          resource.item.ref,
        );
        checkPreflight();
        accepted.push({
          ref: `${resource.item.ref.libraryId}:${resource.item.ref.key}`,
          kind: "selection",
          displayName: resource.displayName,
        });
      }
      const snapshots = await native.snapshotUserFiles(
        draft.filter(
          (
            resource,
          ): resource is Extract<PiConversationResource, { kind: "file" }> =>
            resource.kind === "file",
        ),
      );
      checkPreflight();
      accepted.push(
        ...snapshots.map((snapshot) => ({
          ref: snapshot.ref,
          kind: "snapshot" as const,
          displayName: snapshot.displayName,
        })),
      );
      const web = await getPiBrokeredWebTools().freezeForTurn(model);
      current.definitions = model.policy.supportsTools
        ? await definitions(
            conversationId,
            turnId,
            native,
            web,
            current.navigationTarget,
          )
        : [];
      checkPreflight();
      if (
        accepted.some((resource) => resource.kind === "snapshot") &&
        !current.definitions.some((tool) => tool.name === "read")
      )
        throw new Error("pi_attachment_reader_unavailable");
      // Tool dispatch inherits the owner's lease. Without it a tool could run
      // its full hard maximum long after the turn budget expired.
      const tools = await gateway(
        conversationId,
        turnId,
        current.definitions,
        anySignal(controller.signal, leaseOf.get(conversationId)?.signal) ??
          controller.signal,
      );
      current.frozen = await frozenFacts(
        conversationId,
        turnId,
        model,
        tools.catalog,
        accepted,
      );
      current.frozen.webSources = {
        digest: web.digest,
        sourceRefs: web.sources.map((s) => `web:${s.source.id}`),
      };
      const snapshot = await readPiConversationTranscriptSnapshot(
        ref(conversationId),
        options.root,
      );
      checkPreflight();
      const admission = await admitPiConversationTurn(
        ref(conversationId),
        {
          turnId,
          expectedBasis: {
            revision: snapshot.revision,
            activeLeaf: snapshot.activeLeaf,
          },
          entries: [
            {
              entryId: id("user"),
              kind: "message",
              payload: json({ role: "user", text, resources: accepted }),
            },
          ],
          frozen: {
            // Canonical safe selection evidence, written once for this turn.
            model: projectPiCanonicalSelection(model),
            resources: accepted.map((resource) => ({
              ref: resource.ref,
              kind: resource.kind,
              label: resource.displayName,
            })),
          },
        },
        options.root,
      );
      admittedTurnId = turnId;
      current.sendAdmissionRevision += 1;
      drafts.delete(conversationId);
      emit(conversationId, ["resources"]);
      for (const entry of admission.entries) {
        const item = messageItem(entry);
        if (item) publishItem(conversationId, item);
      }
      checkPreflight();
      const started = await startRuntime(conversationId, turnId, model, tools);
      const abortRuntime = started.abort;
      current.abort = () => {
        controller.abort();
        abortRuntime();
      };
      started.abort = current.abort;
      if (snapshot.entries.every((entry) => entry.kind !== "message"))
        void title(conversationId, text, accepted, authorizeLocalNetwork).catch(
          () => {},
        );
      return started;
    } catch (error) {
      current.abort = undefined;
      current.invalidateNavigation?.();
      current.invalidateNavigation = undefined;
      current.navigationTarget = undefined;
      current.definitions = [];
      // A prompt that never reached its admission never earned a checkpoint.
      await releaseLease(conversationId, false);
      if (controller.signal.aborted || disposed) {
        if (admittedTurnId)
          await fact(
            conversationId,
            "turn_terminal",
            { turnId: admittedTurnId, status: "canceled" },
            admittedTurnId,
          );
        current.status = "idle";
      } else {
        current.status = "failed";
        current.failure = "admission_failed";
        setComposerError(conversationId, "pi_conversation_action_failed");
      }
      emit(conversationId, ["control"]);
      throw error;
    }
  }
  function cancel(conversationId: string) {
    const current = state(conversationId);
    if (current.abort) {
      current.status = "cancelling";
      current.abort();
      emit(conversationId, ["control"]);
    }
  }
  async function compact(
    conversationId: string,
    authorizeLocalNetwork?: LocalNetworkAuthorizer,
  ) {
    const current = idle(conversationId);
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) throw new Error("pi_signal_unavailable");
    const controller = new Controller();
    current.abort = () => controller.abort();
    current.failure = undefined;
    current.status = "busy";
    emit(conversationId, ["control"]);
    const turnId = id("compaction");
    try {
      // Manual compaction is a user-initiated foreground turn with the same
      // budget as a prompt: a conversation cannot compact indefinitely.
      await admit(conversationId, turnId, "foreground", controller.signal);
      const owner = metadata(conversationId);
      const model = await resolveModel(
        owner.selection ? JSON.parse(owner.selection) : undefined,
      );
      await authorizeModel(conversationId, model, authorizeLocalNetwork);
      if (controller.signal.aborted) throw new Error("pi_send_canceled");
      const frozen = await frozenFacts(
        conversationId,
        turnId,
        model,
        { digest: await digest([]), tools: [] },
        [],
      );
      await preparation(
        conversationId,
        turnId,
        id("invocation"),
        frozen,
        "manual_compaction",
        controller.signal,
      );
      current.status = "idle";
      // Reaching here means preparation committed its summary, so the turn is
      // a settled foreground boundary with a resume-eligible budget.
      await checkpoint(conversationId, turnId, true);
    } catch (error) {
      await releaseLease(conversationId, false);
      if (controller.signal.aborted) {
        current.failure = undefined;
        current.status = "idle";
        return;
      }
      current.failure ||= "compaction_failed";
      current.status = [
        "recovery_required",
        "transcript_integrity_failed",
        "preparation_waiting",
      ].includes(current.failure)
        ? "recovery_required"
        : "failed";
      throw error;
    } finally {
      current.abort = undefined;
      emit(conversationId, ["control", "details", "presentation"]);
    }
  }
  async function permission(
    conversationId: string,
    requestId: string,
    decision: "approve" | "deny",
  ) {
    const current = state(conversationId);
    if (current.status !== "waiting_permission" || !current.frozen)
      throw new Error("pi_permission_unavailable");
    const pending = current.pending.find(
      (item) => item.call.callId === requestId,
    );
    if (!pending) throw new Error("pi_permission_stale");
    const turnId = id("permission-turn");
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) throw new Error("pi_signal_unavailable");
    const controller = new Controller();
    current.status = "busy";
    current.abort = () => controller.abort();
    emit(conversationId, ["control", "permission"]);
    // A permission decision is a continuation of the same turn, so it rejoins
    // foreground capacity under the remaining budget instead of a new one.
    await admit(conversationId, turnId, "foreground", controller.signal, true);
    let tools: PiGatewayTurn;
    let result: PiGatewayCallResult;
    let renewed: PiGatewayPendingCall | undefined;
    try {
      tools = await gateway(
        conversationId,
        turnId,
        current.definitions,
        controller.signal,
      );
      const snapshot = await readPiConversationTranscriptSnapshot(
        ref(conversationId),
        options.root,
      );
      await admitPiConversationTurn(
        ref(conversationId),
        {
          turnId,
          expectedBasis: {
            revision: snapshot.revision,
            activeLeaf: snapshot.activeLeaf,
          },
          entries: [
            {
              entryId: id("permission"),
              kind: "permission_resolved",
              payload: { id: requestId, decision },
            },
          ],
        },
        options.root,
      );
      const continuation = await tools.continueCall(pending, decision);
      result = continuation.result;
      renewed = continuation.pending;
    } catch {
      current.status = "recovery_required";
      current.abort = undefined;
      await releaseLease(conversationId, false);
      current.invalidateNavigation?.();
      current.invalidateNavigation = undefined;
      current.navigationTarget = undefined;
      current.definitions = [];
      emit(conversationId, ["control", "permission", "navigation"]);
      return;
    }
    if (result.status !== "permission_required") {
      const entry = await fact(
        conversationId,
        "tool_result",
        {
          callId: result.callId,
          name: result.name,
          text: JSON.stringify(result),
          status: result.status,
          effectCertainty: result.effectCertainty,
        },
        turnId,
      );
      publishItem(conversationId, messageItem(entry.entry)!);
    }
    current.pending = current.pending.flatMap((item) =>
      item === pending ? (renewed ? [renewed] : []) : [item],
    );
    if (
      result.effectCertainty === "unknown" ||
      current.pending.length ||
      controller.signal.aborted
    ) {
      current.status =
        result.effectCertainty === "unknown"
          ? "recovery_required"
          : controller.signal.aborted
            ? "idle"
            : "waiting_permission";
      await fact(
        conversationId,
        "turn_terminal",
        {
          turnId,
          status:
            result.effectCertainty === "unknown"
              ? "state_unknown"
              : controller.signal.aborted
                ? "canceled"
                : "waiting_permission",
        },
        turnId,
      );
      current.abort = undefined;
      if (current.status !== "waiting_permission") {
        current.invalidateNavigation?.();
        current.invalidateNavigation = undefined;
        current.navigationTarget = undefined;
        current.definitions = [];
      }
      // Waiting is a lifecycle boundary: settle any queued evidence before the
      // owner goes idle, so a later export never races a pending write.
      if (current.status === "waiting_permission")
        await flushPiRuntimeAuditOwner(ref(conversationId), options.root);
      // Waiting on a permission decision is a durable pause, not a terminal:
      // the consumed budget is checkpointed and the same turn continues later.
      await checkpoint(
        conversationId,
        turnId,
        current.status !== "recovery_required",
      );
      emit(conversationId, ["permission", "control", "navigation"]);
      return;
    }
    current.frozen = { ...current.frozen, turnId };
    emit(conversationId, ["permission", "control", "navigation"]);
    const started = await startRuntime(
      conversationId,
      turnId,
      current.frozen.model,
      tools,
    );
    const abortRuntime = started.abort;
    current.abort = () => {
      controller.abort();
      abortRuntime();
    };
    started.abort = current.abort;
    return started;
  }
  async function title(
    conversationId: string,
    text: string,
    accepted: { kind: string; displayName: string }[],
    authorizeLocalNetwork?: LocalNetworkAuthorizer,
  ) {
    const owner = metadata(conversationId);
    if (
      owner.titleSource === "user" ||
      !["active", "archived"].includes(owner.lifecycle)
    )
      return;
    const fallback = normalizeTitle(
      text || accepted[0]?.displayName || "Conversation",
    );
    const initial = updatePiConversationMetadata(
      conversationId,
      { title: fallback, titleSource: "agent" },
      { titleRevision: owner.titleRevision },
    );
    emit(conversationId, ["navigation", "presentation"]);
    const auxiliary = loadPiProviderConfigurationState().defaults.auxiliary;
    if (!auxiliary) return;
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) return;
    const controller = new Controller();
    const titleTurnId = id("title");
    const result = (async () => {
      let output = "";
      const titleUsageByInvocation = new Map<
        string,
        {
          usage: PiRuntimeUsage;
          stopReason?: string;
          providerTerminal?: PiProviderTerminal;
        }
      >();
      let titleSelectionRef: string | undefined;
      let provider = "";
      let modelId = "";
      let failure: string | undefined;
      let lease: PiExecutionLease | undefined;
      try {
        // An auxiliary title is background work: it never competes with a user
        // prompt for foreground capacity, and a full process drops it.
        try {
          lease = await lifecycle.acquire({
            owner: ref(conversationId),
            turnId: titleTurnId,
            lane: "background",
            signal: controller.signal,
          });
          // Tracked so an explicit delete can release the background claim
          // without waiting for the provider to unwind.
          titleLeases.set(conversationId, lease);
        } catch {
          return;
        }
        const model = await resolveModel(auxiliary);
        const localApproved =
          !model.requiresLocalNetwork ||
          state(conversationId).localEndpoint === model.baseUrl ||
          !!(await authorizeLocalNetwork?.(model.baseUrl));
        if (!localApproved) throw new Error("pi_local_network_unapproved");
        provider = model.provider;
        modelId = model.modelId;
        titleSelectionRef = (
          await fact(
            conversationId,
            "model_selection",
            {
              purpose: "title",
              model: json(projectPiCanonicalSelection(model)),
            },
            titleTurnId,
          )
        ).entry.entryId;
        const session = options.execution
          ? new PiRuntime().openSession({
              sessionId: `${conversationId}:title`,
              ...options.execution(model),
            })
          : options.modelSource
            ? new PiRuntime().openSession({
                sessionId: `${conversationId}:title`,
                modelStream: modelSource(
                  model,
                  localApproved ? model.baseUrl : undefined,
                ),
              })
            : new PiRuntime().openSession({
                sessionId: `${conversationId}:title`,
                ...createPiProviderSource(model, {
                  authorizeLocalNetwork: async (endpoint) =>
                    localApproved && endpoint === model.baseUrl,
                }),
              });
        const titleInput = JSON.stringify({
          text: text.slice(0, 4000),
          resources: accepted.map(({ kind, displayName }) => ({
            kind,
            displayName: displayName.slice(0, 256),
          })),
        });
        const frozen = await frozenFacts(
          conversationId,
          titleTurnId,
          model,
          { digest: await digest([]), tools: [] },
          [],
        );
        const estimator = createPiNativeEstimator();
        const turn = session.runTurn({
          turnId: titleTurnId,
          systemPrompt:
            "Return only a concise single-line Conversation title, at most 48 characters.",
          messages: [{ role: "user", text: titleInput }],
          async prepareInvocation({ invocationId }) {
            for (let attempt = 0; attempt < 3; attempt++) {
              const transcript = await readPiConversationTranscriptSnapshot(
                ref(conversationId),
                options.root,
              );
              const prepared = await preparePiTitleInvocation(
                {
                  owner: ref(conversationId),
                  turnId: titleTurnId,
                  invocationId,
                  runtimeGeneration: titleTurnId,
                  generation: transcript.generation,
                  transcript,
                  model,
                  policy: frozen.policy,
                  basis: {
                    revision: transcript.revision,
                    activeLeaf: transcript.activeLeaf,
                  },
                  text: titleInput,
                },
                {
                  ...createPiConversationPreparationAdapter(
                    ref(conversationId),
                    options.root,
                  ),
                  estimator,
                  estimate: estimator.estimate,
                  async summarize() {
                    throw new Error("pi_title_compaction_unavailable");
                  },
                },
              );
              if (prepared.status !== "failed")
                return {
                  messages: [{ role: "user" as const, text: titleInput }],
                  systemPrompt:
                    "Return only a concise single-line Conversation title, at most 48 characters.",
                  tools: [],
                };
              if (prepared.failure.code !== "record_failed" || attempt === 2)
                throw new Error(prepared.failure.code);
            }
            throw new Error("record_failed");
          },
          onEvent(event) {
            if (event.kind === "invocation_started") {
              if (titleUsageByInvocation.size < 20)
                titleUsageByInvocation.set(event.invocationId, {
                  usage: unknownPiRuntimeUsage(),
                });
            } else if (event.kind === "assistant_message") {
              output = event.text;
              const contribution = titleUsageByInvocation.get(
                event.invocationId,
              );
              if (contribution) contribution.usage = event.usage;
            } else if (event.kind === "invocation_terminal") {
              const contribution = titleUsageByInvocation.get(
                event.invocationId,
              );
              if (contribution) {
                if (event.usage) contribution.usage = event.usage;
                contribution.stopReason = event.stopReason;
                if (event.providerTerminal)
                  contribution.providerTerminal = event.providerTerminal;
              }
            }
          },
        });
        controller.signal.addEventListener("abort", () => turn.abort(), {
          once: true,
        });
        // The title's real completion is the provider's exit, not the
        // bounded logical result. Registering it is what lets a permanent
        // delete finish: without it the lease looks permanently occupied and
        // cleanup keeps deferring an owner that has actually finished.
        lease?.trackPhysical(
          turn.settled.then<PiPhysicalSettlement, PiPhysicalSettlement>(
            (outcome) => (outcome === "unknown" ? "unknown" : "settled"),
            () => "unknown",
          ),
        );
        const task = titleTasks.get(conversationId);
        if (task) task.settled = turn.settled;
        try {
          if ((await turn.result).status !== "completed")
            throw new Error("title_failed");
        } finally {
          session.dispose();
        }
        const fresh = getPiConversationMetadata(conversationId);
        if (
          controller.signal.aborted ||
          !fresh ||
          !["active", "archived"].includes(fresh.lifecycle) ||
          fresh.generation !== initial.generation ||
          fresh.titleSource === "user" ||
          fresh.titleRevision !== initial.titleRevision
        )
          return;
        updatePiConversationMetadata(
          conversationId,
          { title: normalizeTitle(output) || fallback, titleSource: "agent" },
          { titleRevision: initial.titleRevision },
        );
      } catch {
        failure = "title_failed";
      } finally {
        // A dropped auxiliary title never writes a budget fact: it is not a
        // turn, and the owner's main budget is untouched by it.
        lease?.release();
        titleLeases.delete(conversationId);
        const fresh = getPiConversationMetadata(conversationId);
        // A deleting or already-removed owner must not gain a new fact: the
        // abort is only observed once the task unwinds, and the write would
        // otherwise resurrect an owner the user already asked to delete.
        if (fresh && ["active", "archived"].includes(fresh.lifecycle)) {
          if (titleUsageByInvocation.size === 0)
            titleUsageByInvocation.set(id("title-invocation"), {
              usage: unknownPiRuntimeUsage(),
            });
          for (const [invocationId, evidence] of titleUsageByInvocation) {
            const usage = evidence.usage;
            state(conversationId).usage.title += usage.totalTokens;
            if (usage.costEstimate === null)
              state(conversationId).usage.costUnknown += 1;
            else state(conversationId).usage.titleCost += usage.costEstimate;
            await fact(conversationId, "title_usage", {
              purpose: "title",
              invocationId,
              selectionRef: titleSelectionRef,
              provider,
              modelId,
              inputTokens: usage.input,
              outputTokens: usage.output,
              totalTokens: usage.totalTokens,
              cost: usage.cost.total,
              costEstimate: usage.costEstimate,
              costState: usage.costState,
              usageKnown: usage.usageKnown,
              completeness: usage.completeness,
              ...(usage.measurement ? { measurement: usage.measurement } : {}),
              ...(evidence.stopReason
                ? { stopReason: evidence.stopReason }
                : {}),
              ...(evidence.providerTerminal
                ? { providerTerminal: evidence.providerTerminal }
                : {}),
              ...(failure ? { failure } : {}),
            }).catch(() => {});
          }
          emit(conversationId, ["navigation", "presentation", "details"]);
        }
        titleTasks.delete(conversationId);
      }
    })();
    // The title's real completion is the provider's exit, not the bounded
    // logical result, so a deletion that deferred on this work waits on the
    // physical fact instead of the answer it was already given.
    titleTasks.set(conversationId, {
      abort: () => controller.abort(),
      result,
    });
    await result;
  }

  async function workspace(conversationId: string) {
    const ownerRoot = piOwnerPaths(ref(conversationId), options.root).dir;
    const workspaceRoot = joinPath(ownerRoot, "workspace");
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    return createPiTrustedNativeExecution({
      workspaceRoot,
      ownerRoot,
      mode: "trusted",
    });
  }
  function resources(conversationId: string) {
    return drafts.get(conversationId) || [];
  }
  function add(conversationId: string, additions: PiConversationResource[]) {
    const current = resources(conversationId);
    const unique = additions.filter(
      (item, index) =>
        !current.some((existing) => existing.resourceId === item.resourceId) &&
        additions.findIndex((other) => other.resourceId === item.resourceId) ===
          index,
    );
    if (current.length + unique.length > 20)
      throw new Error("pi_resource_count_exceeded");
    drafts.set(conversationId, [...current, ...unique]);
    emit(conversationId, ["resources"]);
  }
  async function addFiles(
    conversationId: string,
    inputsOrWindow?: { path: string; displayName?: string }[] | Window,
  ) {
    let inputs: { path: string; displayName?: string }[];
    if (Array.isArray(inputsOrWindow)) inputs = inputsOrWindow;
    else {
      const toolkit = resolveRuntimeToolkit() as {
        FilePicker?: new (
          title: string,
          mode: string,
          filters: string[][],
          filename?: string,
          window?: Window,
        ) => { open(): Promise<string | string[] | undefined> };
      };
      if (!toolkit?.FilePicker) throw new Error("pi_file_picker_unavailable");
      const picked = await new toolkit.FilePicker(
        "Add resources",
        "openMultiple",
        [["All files", "*.*"]],
        undefined,
        inputsOrWindow,
      ).open();
      if (!picked) return;
      inputs = (Array.isArray(picked) ? picked : [picked]).map((path) => ({
        path,
      }));
    }
    const additions: PiConversationResource[] = [];
    for (const input of inputs) {
      const parent = input.path.replace(/[\\/][^\\/]+$/, "") || "/";
      const identity = await resolveRuntimePathIdentity({
        root: parent,
        path: input.path,
      });
      additions.push({
        resourceId: await digest(identity.canonicalKey),
        kind: "file",
        displayName: (input.displayName || getBaseName(input.path)).slice(
          0,
          256,
        ),
        path: identity.path,
      });
    }
    add(conversationId, additions);
  }
  /**
   * Explicit recovery check. It only observes authoritative Broker outcomes
   * and re-reads canonical facts: no model, tool or summary work is dispatched
   * here, so a check can never replay the work it is checking.
   */
  async function checkRecovery(
    conversationId: string,
    observer?: PiOwnerOperationObserver,
  ) {
    const owner = ref(conversationId);
    // Repair first: a torn tail otherwise makes the observation pass throw and
    // the owner never reaches an assessment at all.
    await repairPiOwnerTornTail(owner, options.root).catch(() => undefined);
    const reconciliation = await reconcilePiOwnerOperationEvidence(
      owner,
      options.root,
      { observeOperation: observer ?? defaultPiOperationObserver() },
    );
    const assessment = await assessPiOwnerRecovery(owner, options.root, {
      isPhysicallyOccupied: (target) => lifecycle.hasPhysicalHold(target),
    });
    const current = state(conversationId);
    if (assessment.hasHolds) {
      current.status = "recovery_required";
      current.failure = "owner_recovery_hold";
    } else if (current.status === "recovery_required") {
      // Cleared holds restore the owner to its canonical resting state; the
      // next real prompt is a new foreground turn, not an automatic resume.
      current.status = "idle";
      current.failure = undefined;
    }
    emit(conversationId, ["control", "navigation", "details"]);
    return {
      state: assessment.state,
      safeToResume: assessment.safeToResume,
      hasHolds: assessment.hasHolds,
      unresolvedOperations: assessment.unresolvedOperations,
      resolved: reconciliation.resolved.length,
    };
  }
  async function addSelection(
    conversationId: string,
    window?: _ZoteroTypes.MainWindow,
  ) {
    const broker = window
      ? createZoteroHostCapabilityBroker(() => window)
      : resolveZoteroHostCapabilityBroker();
    const page = await broker.context.getSelectedItems({ limit: 21 });
    if (page.hasMore || page.items.length > 20)
      throw new Error("pi_resource_count_exceeded");
    if (!page.items.length) throw new Error("pi_selection_empty");
    add(
      conversationId,
      page.items.map((item) => ({
        resourceId: `zotero:${item.ref.libraryId}:${item.ref.key}`,
        kind: "selection",
        displayName: String(item.title || item.itemType).slice(0, 256),
        item: {
          ...item,
          title: String(item.title || item.itemType).slice(0, 256),
        },
      })),
    );
  }

  return {
    get selectedId() {
      return selectedId;
    },
    subscribe(listener: (change: PiConversationChange) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    create,
    select,
    list,
    readModel,
    readPage,
    send,
    cancel,
    permission,
    compact,
    rename,
    archive,
    restore,
    delete: deleteConversation,
    setSelection,
    setComposerError,
    async waitForTitle(conversationId: string) {
      await titleTasks.get(conversationId)?.result;
      await deferredDeleteDone.get(conversationId)?.catch(() => undefined);
    },
    addFiles,
    addSelection,
    removeResource(conversationId: string, resourceId: string) {
      drafts.set(
        conversationId,
        resources(conversationId).filter(
          (item) => item.resourceId !== resourceId,
        ),
      );
      emit(conversationId, ["resources"]);
    },
    checkRecovery,
    async dispose() {
      disposed = true;
      for (const current of states.values()) current.abort?.();
      for (const task of titleTasks.values()) task.abort();
      // Release every lease without a new fact: a closing process records no
      // budget checkpoint, so nothing here can be mistaken for a safe
      // continuation by a later restart.
      for (const [conversationId, lease] of leaseOf) {
        leaseOf.delete(conversationId);
        lease.release();
      }
      await Promise.allSettled([
        ...[...states.values()].map((current) => current.result),
        ...[...titleTasks.values()].map((task) => task.result),
      ]);
      // Settle each owner's queued evidence before releasing it, so a pending
      // write cannot race a later directory removal. Best effort only.
      await Promise.allSettled(
        [...states.keys()].map((conversationId) =>
          flushPiRuntimeAuditOwner(ref(conversationId), options.root),
        ),
      );
      listeners.clear();
      for (const current of states.values()) {
        current.invalidateNavigation?.();
        current.invalidateNavigation = undefined;
        current.navigationTarget = undefined;
        current.definitions = [];
      }
      states.clear();
      drafts.clear();
    },
  };
}

let singleton: ReturnType<typeof createPiConversationCoordinator> | undefined;
/** A closed process never reopens: the getter refuses until a test resets it. */
let stopped = false;
export function getPiConversationCoordinator() {
  if (stopped) throw new Error("pi_conversation_shutdown");
  return (singleton ||= createPiConversationCoordinator());
}

/**
 * Startup recovery for Conversations. It reconstructs state from canonical
 * facts and reassesses each owner once, but it never dispatches: an owner with
 * unresolved effects keeps its hold until authoritative evidence arrives.
 */
export async function reconcilePiConversationsOnStartup(
  options: { root?: string; observeOperation?: PiOwnerOperationObserver } = {},
): Promise<void> {
  const coordinator = getPiConversationCoordinator();
  const lifecycle = getPiRuntimeLifecycle();
  for (const ref of await listPiOwnerInventory(options.root)) {
    // A closing process must not reopen owner state after an await.
    if (lifecycle.closed) break;
    if (ref.kind !== "conversation") continue;
    // A canonical owner directory without its registry projection is still an
    // owner, so discovery never depends on the rebuildable metadata row.
    const metadata = getPiConversationMetadata(ref.ownerId);
    if (metadata && metadata.lifecycle !== "active") continue;
    // Serial and bounded: one owner at a time, and a single owner's damage
    // never stops the next one from being reconstructed.
    await coordinator
      .checkRecovery(ref.ownerId, options.observeOperation)
      .catch(() => undefined);
    // A large owner set must not block the startup path.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * One absolute deadline governs the wait. Expiry ends waiting, not truth: any
 * owner still holding capacity or files keeps both after the deadline.
 */
export async function shutdownPiConversations(
  deadline = Date.now() + 15_000,
): Promise<boolean> {
  const current = singleton;
  singleton = undefined;
  stopped = true;
  if (!current) return true;
  return (
    (await waitForPiShutdown(
      current.dispose().then(() => true),
      deadline,
    )) === true
  );
}
export function resetPiConversationShutdownForTests() {
  stopped = false;
}
