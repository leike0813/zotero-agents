import type { ProviderExecuteArgs } from "../providers/types";
import type {
  ProviderExecutionResult,
  SkillRunnerJobRequestV1,
} from "../providers/contracts";
import type {
  PiModelSelectionSnapshot,
  PiSelection,
  PiReasoningLevel,
} from "../shared/piProviderContract";
import type { JsonValue } from "../workflows/types";
import { sha256PrefixedHex } from "../utils/sha256";
import { resolveNativeAbortControllerConstructor } from "../utils/wait";
import type { PiExecutionCheckpoint } from "./piOwnerPersistence";
import {
  createPiOwner,
  appendPiOwnerFact,
  inspectPiOwner,
  commitPiOwnerFacts,
  readPiOwnerTranscriptSnapshot,
  createPiOwnerPreparationAdapter,
  piOwnerUsageTotalsFor,
  assessPiOwnerRecovery,
  cleanupPiSkillRun,
  listPiOwnerInventory,
  markPiSkillRunDeleting,
  repairPiOwnerTornTail,
  reconcilePiOwnerOperationEvidence,
  recordPiExecutionCheckpoint,
  type PiOwnerOperationObserver,
  type PiSkillRunDeleteResult,
  getPiSkillRunReservation,
} from "./piOwnerPersistence";
import {
  getPiRuntimeLifecycle,
  waitForPiShutdown,
  type PiExecutionLease,
} from "./piRuntimeLifecycle";
import { workflowSubmissionQueue } from "../jobQueue/workflowSubmissionQueue";
import type {
  PiWorkflowReservation,
  WorkflowSubmissionSlotCoordinator,
  WorkflowSubmissionSlotState,
  WorkflowSubmissionSlotYieldReason,
  WorkflowSubmissionSlotResumeReason,
} from "../jobQueue/workflowSubmissionQueueContracts";
import {
  piOwnerPaths,
  readPiVisibleTranscriptPage,
  type PiOwnerRef,
  type PiTranscriptEntry,
  type PiTranscriptInput,
} from "./piTranscriptStore";
import { listPiSkillRunRegistry } from "./pluginStateStore";
import { type PreparedSkillRun } from "./skillRunPreparation";
import type { AcpSkillRunnerWorkspace } from "./acp/skillRun/acpSkillRunnerWorkspace";
import { buildSkillRunResponseEnvelope } from "./skillRunFinalizer";
import {
  createPiFailureCore,
  type PiFailureEffectCertainty,
  type PiFailureOrigin,
} from "../shared/piFailureContract";
import {
  discardPiRuntimeAuditOwner,
  flushOwner as flushPiRuntimeAuditOwner,
  record as recordPiRuntimeAudit,
} from "./piRuntimeAudit";
import {
  updatePiSkillRunProviderProjection,
  type PiSkillRunProviderProjection,
} from "../providers/builtin-pi/provider";
import {
  PiRuntime,
  PiRuntimeToolAttemptLimitError,
  createPiRuntimeLoopGuard,
  type PiRuntimeSessionOptions,
  type PiRuntimeUsage,
  type PiProviderTerminal,
  type PiRuntimeToolCall,
  type PiRuntimeToolResult,
  type PiRuntimeLoopGuardState,
  unknownPiRuntimeUsage,
} from "./piRuntime";
import { loadPiModelCatalog } from "./piModelCatalog";
import {
  getPiCredentialIdentityRevision,
  listPiCredentials,
} from "./piCredentialStore";
import {
  assertPiChatGPTInferenceAllowed,
  listPiChatGPTRegistrations,
} from "./piChatGPTAuth";
import { resolvePiModelSelection } from "./piProviderConfiguration";
import {
  addPiUsageMeasurement,
  piSkillRunUsageView,
  projectPiCanonicalSelection,
  readPiCanonicalSelection,
  type PiCanonicalSelection,
  type PiSkillRunUsageView,
} from "../shared/piUsageContract";
import {
  createPiProviderSource,
  createPiProviderModelSource,
} from "./piProviderExecution";
import {
  failureEffectCertainty,
  freezePiToolGatewayTurn,
  type PiGatewayToolDefinition,
  type PiGatewayPendingCall,
  type PiGatewayCallResult,
  type PiGatewayTurn,
} from "./piToolGateway";
import {
  createPiTrustedNativeExecution,
  type PiConversationUserFileSource,
} from "./piTrustedNativeExecution";
import { ensureRuntimeDirectoryStrict } from "./runtimePersistence";
import {
  preparePiTurn,
  createPiNativeEstimator,
  type PiTurnPreparationInput,
  type PiCompactionSummary,
} from "./piTurnPreparation";
import { createZoteroNativeToolDefinitions } from "./zoteroNativeToolCatalog";
import { resolveZoteroHostCapabilityBroker } from "./zoteroHostCapabilityBroker";
import { getPiMcpToolSources } from "./piMcpRuntimeOwner";
import { getDefaultSynthesisClient } from "./synthesisClient/defaultClient";
import { getPiBrokeredWebTools } from "./piBrokeredWebTools";
import type {
  AssistantWorkspaceTranscriptItem,
  AssistantWorkspaceTranscriptMutationEvent,
} from "./assistant/publication/assistantWorkspaceTranscriptPublication";
import {
  parseAskUserModelInputV1,
  parseUserInteractionBatchV1,
  isUserInteractionBatchSubmittableV1,
  collectUserInteractionFileRefs,
  USER_INTERACTION_BATCH_SCHEMA,
  ASK_USER_RESULT_SCHEMA,
  ASK_USER_MODEL_INPUT_SCHEMA,
  type UserInteractionBatchV1,
  type AssistantInteractionDraftPayloadV1,
  type AssistantInteractionSubmitPayloadV1,
  type AssistantInteractionDeclinePayloadV1,
} from "../shared/userInteractionContract";

export type PiSkillRunStatus =
  | "queued"
  | "running"
  | "waiting_user"
  | "waiting_permission"
  | "suspended"
  | "recovery_required"
  | "succeeded"
  | "failed"
  | "canceled";
export type PiSkillRunChange = {
  requestId: string | null;
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
type Execution = Omit<
  Extract<PiRuntimeSessionOptions, { source: unknown }>,
  "sessionId"
>;
type Options = {
  root?: string;
  /** Process admission; the singleton owns capacity, budget and shutdown. */
  lifecycle?: ReturnType<typeof getPiRuntimeLifecycle>;
  /** Existing Workflow queue; its slot coordinator stays authoritative. */
  queue?: typeof workflowSubmissionQueue;
  /** Authoritative outcome source for an explicit recovery check. */
  observeOperation?: PiOwnerOperationObserver;
  prepare?: (
    args: ProviderExecuteArgs & { requestId: string },
  ) => Promise<PreparedSkillRun>;
  resolveModel?: (selection?: PiSelection) => Promise<PiModelSelectionSnapshot>;
  execution?: (model: PiModelSelectionSnapshot) => Execution;
  /**
   * The structured provider used for a compaction summary. It is separate from
   * `execution` because a compaction is an auxiliary invocation with its own
   * selection, and it is what makes the summary's real usage observable.
   */
  compactionExecution?: (model: PiModelSelectionSnapshot) => Execution;
  definitions?: (requestId: string) => Promise<PiGatewayToolDefinition[]>;
  launchFocus?: (requestId: string, window?: unknown) => Promise<void> | void;
  authorizeLocalNetwork?: (
    endpoint: string,
    window?: unknown,
  ) => Promise<boolean>;
};
type ApplyReceipt = {
  applyKey: string;
  status: "claimed" | "succeeded" | "failed" | "skipped";
  code?: string;
};
type State = {
  requestId: string;
  taskName: string;
  skillId: string;
  mode: "auto" | "interactive";
  status: PiSkillRunStatus;
  archived: boolean;
  updatedAt: string;
  turnId: string;
  revision: number;
  workflow: ProviderExecuteArgs["orchestrationContext"];
  prepared?: PreparedSkillRun;
  /** Admission-time workspace binding, present even when preparation fails. */
  workspace?: AcpSkillRunnerWorkspace;
  model?: PiModelSelectionSnapshot;
  restartConsent?: {
    taskScope: string;
    credentialRef: string;
    identityRevision: string;
  };
  /**
   * The last turn's canonical safe evidence, read back after a restore. It is
   * display-only: the next turn revalidates its own choice against current
   * metadata rather than trusting this record.
   */
  restoredSelection?: PiCanonicalSelection;
  selection?: PiSelection;
  /** Bounded safe usage projection rebuilt from the canonical facts. */
  usage: PiSkillRunUsageView;
  usageInvocationIds: Set<string>;
  pending: PiGatewayPendingCall[];
  interactionBatch?: UserInteractionBatchV1;
  guard: PiRuntimeLoopGuardState;
  sealed?: {
    callId: string;
    result: JsonValue;
    digest: string;
    turnId: string;
  };
  outcome?: ProviderExecutionResult;
  applyReceipt?: ApplyReceipt;
  terminalAck?: string;
  /** Latest durable execution checkpoint; a restart resumes its remainder. */
  checkpoint?: PiExecutionCheckpoint;
  budgetMs?: number;
  /** Admission-time Workflow reservation identity for slot restoration. */
  reservation?: PiWorkflowReservation;
  canContinueRecovery?: boolean;
  /** Permanent deletion was requested; the owner accepts no new work. */
  deleting?: boolean;
  /**
   * Workflow apply inputs captured at admission. The apply seam runs on an
   * in-memory run state a restart cannot rebuild, so these scalars are the
   * only honest basis for a reattach; their absence is a hold, not a guess.
   */
  applyInputs?: {
    workflowId: string | null;
    workflowRunId: string | null;
    jobId: string | null;
    workflowLabel: string | null;
    submissionId: string | null;
    submissionUnitId: string | null;
  };
  failure?: string;
  /** The committed canonical failure identity for this run, if any. */
  failureId?: string;
  /** The code that identity was committed for; guards against stale reuse. */
  failureCode?: string;
  counts: { user: number; assistant: number; tool: number; thought: number };
  draftReceipts: Record<string, { fingerprint: string; revision: number }>;
  abort?: () => void;
  suspend?: () => void;
  active?: Promise<ProviderExecutionResult>;
  localEndpoint?: string;
  originWindow?: unknown;
};
const id = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const ref = (ownerId: string) => ({ kind: "skill_run" as const, ownerId });
const json = (value: unknown): JsonValue => JSON.parse(JSON.stringify(value));
const digest = async (value: unknown) => {
  const result = await sha256PrefixedHex(
    new TextEncoder().encode(JSON.stringify(value)),
  );
  if (!result) throw new Error("pi_hash_unavailable");
  return result;
};
const terminal = (status: string) =>
  ["succeeded", "failed", "canceled"].includes(status);

/**
 * Combines the Runtime invocation signal with the owner's process lease so one
 * abort cancels the whole turn, whichever side observes it first.
 */
function anySignal(
  signals: (AbortSignal | undefined)[],
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

export function createPiSkillRunCoordinator(options: Options = {}) {
  let disposed = false;
  const states = new Map<string, State>();
  const listeners = new Set<(change: PiSkillRunChange) => void>();
  const commands = new Map<string, Promise<unknown>>();
  const lifecycle = options.lifecycle ?? getPiRuntimeLifecycle();
  const queue = options.queue ?? workflowSubmissionQueue;
  const leases = new Map<string, PiExecutionLease>();
  /**
   * The queue remains authoritative for its slot. This only projects the live
   * descriptor for the identity the run was admitted with; a unit that is not
   * currently queued has no reservation to record.
   */
  const readWorkflowReservation = (
    args: ProviderExecuteArgs,
    requestId: string,
  ): PiWorkflowReservation | undefined => {
    const unitId = args.orchestrationContext?.submissionUnitId;
    if (!unitId) return undefined;
    const descriptor = queue.getReservation(unitId);
    if (!descriptor) return undefined;
    return Object.freeze({
      ...descriptor,
      ownerId: descriptor.ownerId || requestId,
    });
  };
  const restoredSlots = new Map<string, WorkflowSubmissionSlotCoordinator>();
  let selectedId: string | null = null;
  let launchFocus = options.launchFocus;
  let authorizeLocalNetwork = options.authorizeLocalNetwork;
  const publishProjection = (state: State) =>
    updatePiSkillRunProviderProjection(state.requestId, {
      requestId: state.requestId,
      status: state.status,
      error: state.failure,
      applyState: state.applyReceipt?.status || "pending",
      applyError: state.applyReceipt?.code,
    });
  const emit = (
    requestId: string | null,
    kinds: PiSkillRunChange["kinds"],
    extra: Partial<PiSkillRunChange> = {},
  ) => {
    if (requestId && states.has(requestId))
      publishProjection(states.get(requestId)!);
    for (const listener of listeners) listener({ requestId, kinds, ...extra });
  };
  const serialize = <T>(
    requestId: string,
    work: () => Promise<T>,
  ): Promise<T> => {
    const prior = commands.get(requestId) || Promise.resolve();
    const current = prior.catch(() => undefined).then(work);
    commands.set(requestId, current);
    void current
      .finally(() => {
        if (commands.get(requestId) === current) commands.delete(requestId);
      })
      .catch(() => undefined);
    return current;
  };
  const fact = async (
    requestId: string,
    kind: string,
    payload: unknown,
    turnId?: string,
    entryId?: string,
  ) => {
    const result = await appendPiOwnerFact(
      ref(requestId),
      {
        kind,
        payload: json(payload),
        ...(turnId ? { turnId } : {}),
        ...(entryId ? { entryId } : {}),
      },
      options.root,
    );
    const state = states.get(requestId);
    if (state) {
      state.updatedAt = result.entry.createdAt;
      const contribution = piOwnerUsageTotalsFor([result.entry]);
      for (const purpose of ["main", "compaction", "title"] as const) {
        const delta = contribution[purpose];
        if (!delta.invocations) continue;
        const payload = result.entry.payload as Record<string, unknown>;
        const invocationId =
          typeof payload.invocationId === "string" && payload.invocationId
            ? payload.invocationId
            : result.entry.entryId;
        if (state.usageInvocationIds.has(invocationId)) continue;
        const nested = payload.usage;
        const usage =
          nested && typeof nested === "object" && !Array.isArray(nested)
            ? (nested as Record<string, unknown>)
            : payload;
        addPiUsageMeasurement(
          state.usage.purposeTotals[purpose],
          delta.measurement,
          delta.completeness,
          usage.usageKnown !== false,
        );
        state.usageInvocationIds.add(invocationId);
      }
    }
    return result.entry;
  };
  /**
   * One observed failure gets one canonical core, committed before any audit
   * evidence or higher projection references it. The caller that observed the
   * failure records the evidence, so a Gateway failure and a run terminal
   * never both record for the same identity.
   */
  const failureFact = async (
    requestId: string,
    code: string,
    turnId: string | undefined,
    detail: {
      origin?: PiFailureOrigin;
      effectCertainty?: PiFailureEffectCertainty;
    } = {},
  ) => {
    const core = createPiFailureCore({
      origin: detail.origin || "pi_skill_run",
      code,
      failureId: id("failure"),
      ...(detail.effectCertainty
        ? { effectCertainty: detail.effectCertainty }
        : {}),
    });
    await fact(requestId, "failure_observed", core, turnId);
    const state = states.get(requestId);
    if (state) {
      state.failureId = core.failureId;
      state.failureCode = code;
    }
    return core;
  };
  function fold(
    requestId: string,
    entries: readonly PiTranscriptEntry[],
  ): State {
    const admission = entries.find(
      (entry) => entry.kind === "skill_run_admitted",
    )?.payload as Record<string, unknown> | undefined;
    if (!admission) throw new Error("pi_skill_run_missing");
    const state: State = {
      requestId,
      taskName: String(admission.taskName),
      skillId: String(admission.skillId),
      mode: admission.mode === "interactive" ? "interactive" : "auto",
      status: "queued",
      archived: false,
      workflow: admission.workflow as State["workflow"],
      budgetMs:
        typeof admission.budgetMs === "number" ? admission.budgetMs : undefined,
      updatedAt: entries.at(-1)?.createdAt || "",
      turnId: "",
      revision: entries.length,
      pending: [],
      guard: { invocations: 0, toolAttempts: 0, cycles: [] },
      counts: { user: 0, assistant: 0, tool: 0, thought: 0 },
      usage: piSkillRunUsageView(piOwnerUsageTotalsFor(entries)),
      usageInvocationIds: new Set(),
      draftReceipts: Object.create(null),
    };
    for (const entry of entries) {
      const payload = entry.payload as Record<string, unknown>;
      if (entry.kind === "skill_run_status") {
        state.status = payload.status as PiSkillRunStatus;
        state.failure =
          typeof payload.code === "string" ? payload.code : undefined;
      } else if (entry.kind === "turn_started") {
        state.failureId = undefined;
        state.failureCode = undefined;
        state.turnId = String(payload.turnId);
        state.restoredSelection =
          readPiCanonicalSelection(payload.model) ?? undefined;
        // A turn records safe evidence only; the live selection is always
        // re-resolved at the start of the turn that uses it.
      } else if (entry.kind === "failure_observed") {
        if (typeof payload.failureId === "string") {
          state.failureId = payload.failureId;
          if (typeof payload.code === "string")
            state.failureCode = payload.code;
        }
      } else if (entry.kind === "skill_run_workspace") {
        // The admission-time binding survives a failed preparation, so audit
        // can resolve this owner without depending on a prepared fact.
        if (typeof payload.workspaceDir === "string")
          state.workspace = {
            workspaceDir: payload.workspaceDir,
            runtimeDir:
              typeof payload.runtimeDir === "string"
                ? payload.runtimeDir
                : payload.workspaceDir,
          } as AcpSkillRunnerWorkspace;
      } else if (entry.kind === "skill_run_guard")
        state.guard = payload as unknown as PiRuntimeLoopGuardState;
      else if (entry.kind === "skill_run_result_sealed")
        state.sealed = payload as unknown as State["sealed"];
      else if (entry.kind === "skill_run_outcome") {
        state.outcome = payload.result as ProviderExecutionResult;
        // Reuse the committed identity so a restored owner never mints a
        // second failure for the same run.
        if (typeof payload.failureId === "string")
          state.failureId = payload.failureId;
        if (state.outcome.status === "succeeded" && state.sealed)
          state.outcome = { ...state.outcome, resultJson: state.sealed.result };
        state.status = state.outcome.status as PiSkillRunStatus;
      } else if (entry.kind === "skill_run_apply_receipt")
        state.applyReceipt = payload as unknown as ApplyReceipt;
      else if (entry.kind === "skill_run_terminal_ack")
        state.terminalAck = String(payload.ackId);
      else if (entry.kind === "skill_run_archive") state.archived = true;
      else if (entry.kind === "skill_run_selection")
        state.selection = payload as PiSelection;
      else if (entry.kind === "skill_run_restart_consent") {
        state.restartConsent =
          payload.enabled === true &&
          typeof payload.taskScope === "string" &&
          typeof payload.credentialRef === "string" &&
          typeof payload.identityRevision === "string"
            ? {
                taskScope: payload.taskScope,
                credentialRef: payload.credentialRef,
                identityRevision: payload.identityRevision,
              }
            : undefined;
      } else if (entry.kind === "permission_pending") {
        const pending = payload.pending as PiGatewayPendingCall;
        state.pending = state.pending.filter(
          (item) => item.call.callId !== pending.call.callId,
        );
        state.pending.push(pending);
      } else if (entry.kind === "permission_resolved")
        state.pending = state.pending.filter(
          (pending) => pending.call.callId !== payload.id,
        );
      else if (entry.kind === "interaction_pending")
        state.interactionBatch = payload.batch as UserInteractionBatchV1;
      else if (entry.kind === "execution_checkpoint") {
        const payload = entry.payload as {
          turnId?: string;
          budgetMs?: number;
          activeMs?: number;
          remainingMs?: number;
          resumeEligible?: boolean;
        };
        // The last committed checkpoint is the whole restart budget: an
        // earlier turn's value never overwrites a newer one.
        if (
          typeof payload.turnId === "string" &&
          typeof payload.budgetMs === "number" &&
          typeof payload.activeMs === "number" &&
          typeof payload.remainingMs === "number" &&
          typeof payload.resumeEligible === "boolean"
        )
          state.checkpoint = {
            version: 1,
            turnId: payload.turnId,
            budgetMs: payload.budgetMs,
            activeMs: payload.activeMs,
            remainingMs: payload.remainingMs,
            resumeEligible: payload.resumeEligible,
          };
      } else if (
        entry.kind === "skill_run_deleting" ||
        entry.kind === "skill_run_deleted"
      ) {
        // Permanent deletion was requested. The owner keeps its canonical
        // history for a hold-safe retry, but it accepts no new work.
        state.deleting = true;
      } else if (entry.kind === "skill_run_reservation")
        state.reservation = entry.payload as unknown as PiWorkflowReservation;
      else if (entry.kind === "skill_run_apply_inputs")
        state.applyInputs = entry.payload as State["applyInputs"];
      else if (entry.kind === "skill_run_interaction_draft") {
        state.interactionBatch = payload.batch as UserInteractionBatchV1;
        state.draftReceipts[String(payload.mutationId)] = {
          fingerprint: String(payload.fingerprint),
          revision: Number(payload.revision),
        };
      } else if (entry.kind === "interaction_resolved")
        state.interactionBatch = payload.batch as UserInteractionBatchV1;
      else if (entry.kind === "message") {
        if (payload.role === "user") state.counts.user++;
        else if (payload.role === "assistant") state.counts.assistant++;
      } else if (entry.kind === "tool_result") state.counts.tool++;
      else if (entry.kind === "thought") state.counts.thought++;
    }
    return state;
  }
  /**
   * Foreground Skill Run admission. The cumulative budget comes from the
   * owner's last committed checkpoint, so a continuation or a restart spends
   * the recorded remainder instead of a fresh allowance.
   */
  async function admit(
    state: State,
    turnId: string,
    lane: "foreground" | "background",
    signal: AbortSignal,
  ) {
    const prior = leases.get(state.requestId);
    const budgetMs =
      state.checkpoint?.budgetMs ?? state.budgetMs ?? 8 * 60 * 60 * 1000;
    const restored = state.checkpoint?.activeMs;
    if (prior) prior.release();
    const lease = await lifecycle.acquire({
      owner: ref(state.requestId),
      turnId,
      lane,
      signal,
      budgetMs,
      // The lifecycle clamps to the eight hour ceiling, so a Workflow can lower
      // the budget but never raise it.
      ...(restored === undefined ? {} : { elapsedMs: restored }),
    });
    leases.set(state.requestId, lease);
    return lease;
  }
  /** A settled boundary persists the consumed budget before the owner idles. */
  /**
   * A settled boundary commits the consumed budget before the owner idles, so
   * a later continuation reads a canonical remainder rather than an in-memory
   * guess. A commit failure is not swallowed: an unrecorded budget cannot be
   * proven safe, so the owner falls back to recovery instead.
   */
  /**
   * Records consumed budget at a durable boundary without releasing the lease.
   * The turn keeps running and keeps occupying capacity; only the recorded
   * remainder changes. This is what makes a crash between two tool calls
   * recoverable: the budget spent so far is already canonical, and the owner
   * resumes with exactly that remainder instead of a full eight hours.
   */
  async function snapshotBudget(
    state: State,
    turnId: string,
    resumeEligible: boolean,
  ) {
    const lease = leases.get(state.requestId);
    if (!lease) return;
    const value = lease.checkpoint(resumeEligible);
    // The in-memory value is only adopted after the fact is durable. A failed
    // write means the spent budget is unproven, so the caller must not treat
    // the next boundary as a safe continuation point.
    await recordPiExecutionCheckpoint(
      ref(state.requestId),
      value,
      options.root,
    );
    state.checkpoint = value;
  }

  async function checkpoint(
    state: State,
    turnId: string,
    resumeEligible: boolean,
  ) {
    const lease = leases.get(state.requestId);
    if (!lease) return;
    leases.delete(state.requestId);
    const value = lease.checkpoint(resumeEligible);
    state.checkpoint = value;
    // Release capacity only after the fact is durable, so a crash between the
    // two can never lose the budget this turn spent.
    try {
      await recordPiExecutionCheckpoint(
        ref(state.requestId),
        value,
        options.root,
      );
    } catch {
      lease.release();
      if (state.status !== "recovery_required") {
        await setStatus(
          state,
          "recovery_required",
          "pi_execution_checkpoint_unavailable",
        );
      }
      return;
    }
    lease.release();
  }

  async function load(requestId: string): Promise<State> {
    const cached = states.get(requestId);
    if (cached) return cached;
    const inspection = await inspectPiOwner(ref(requestId), options.root);
    if (inspection.status !== "valid")
      throw new Error("pi_skill_run_recovery_required");
    const state = fold(requestId, inspection.entries);
    const preparation = inspection.entries.find(
      (entry) => entry.kind === "skill_run_prepared",
    )?.payload as { runtimeDir?: string; snapshotDigest?: string } | undefined;
    if (preparation?.runtimeDir) {
      const { readPreparedSkillRun } = await import("./skillRunPreparation");
      const prepared = await readPreparedSkillRun(preparation.runtimeDir).catch(
        () => null,
      );
      if (
        prepared?.requestId === requestId &&
        prepared.provenance.snapshotDigest === preparation.snapshotDigest
      )
        state.prepared = prepared;
    }
    states.set(requestId, state);
    publishProjection(state);
    return state;
  }
  async function loadPaused(
    requestId: string,
    status: "waiting_permission" | "waiting_user" | "suspended",
  ) {
    const state = await load(requestId);
    // A visible wait can precede the turn's final checkpoint. User actions
    // continue only after that work settles; cancel still bypasses this wait.
    if (state.status === status) await state.active?.catch(() => undefined);
    return state;
  }
  async function setStatus(
    state: State,
    status: PiSkillRunStatus,
    code?: string,
  ) {
    await fact(
      state.requestId,
      "skill_run_status",
      { status, ...(code ? { code } : {}) },
      state.turnId || undefined,
    );
    // Interaction boundaries are structural evidence of where a run paused,
    // recorded once the status fact is durable. They carry the interaction
    // identity only, never the pending call arguments or a user's answer.
    if (["waiting_user", "waiting_permission"].includes(status))
      recordPiRuntimeAudit({
        operation: "interaction.wait",
        origin: "skill_run",
        owner: ref(state.requestId),
        ...(options.root ? { root: options.root } : {}),
        ...(state.workspace
          ? { workspaceDir: state.workspace.workspaceDir }
          : {}),
        correlation: {
          ...(state.turnId ? { turnId: state.turnId } : {}),
          ...(state.pending[0]?.call.callId
            ? { callId: state.pending[0].call.callId }
            : {}),
        },
        attributes: { kind: status },
      });
    if (status === "suspended")
      recordPiRuntimeAudit({
        operation: "interaction.suspended",
        origin: "skill_run",
        owner: ref(state.requestId),
        ...(options.root ? { root: options.root } : {}),
        ...(state.workspace
          ? { workspaceDir: state.workspace.workspaceDir }
          : {}),
        correlation: state.turnId ? { turnId: state.turnId } : {},
        attributes: { kind: "suspended" },
      });
    state.status = status;
    state.failure = code;
    emit(state.requestId, [
      "navigation",
      "control",
      "presentation",
      "details",
      "resources",
      "permission",
    ]);
  }
  function failureResult(
    state: State,
    code: string,
    phase = "execute",
  ): ProviderExecutionResult {
    return {
      status: "failed",
      requestId: state.requestId,
      fetchType: "result",
      error: code,
      responseJson: buildSkillRunResponseEnvelope({
        status: "failed",
        requestId: state.requestId,
        backend: { id: "builtin-pi", type: "builtin-pi" },
        skillId: state.skillId,
        error: {
          phase: phase as "execute" | "prepare" | "finalize",
          category:
            code === "invalid_execution_mode"
              ? "contract"
              : code === "agent_loop_limit_exceeded"
                ? "resource_limit"
                : phase === "prepare"
                  ? "configuration"
                  : "execution",
          code,
          retryability: "new_attempt",
        },
      }),
    };
  }
  async function sealOutcome(state: State, result: ProviderExecutionResult) {
    // A failing run commits its failure core before the sealed outcome, so the
    // outcome and every higher projection reference one existing identity. A
    // repeat seal reuses the committed observation instead of appending one.
    let failureId: string | undefined;
    const failureCode =
      result.status === "failed"
        ? (result.responseJson as { error?: { code?: string } } | undefined)
            ?.error?.code || "skill_run_execution_failed"
        : undefined;
    if (failureCode) {
      // Only an observation committed for this same cause may be reused. An
      // earlier turn's identity describes a different failure, so a genuinely
      // distinct cause always gets its own.
      const existing =
        state.failureCode === failureCode ? state.failureId : undefined;
      if (existing) {
        failureId = existing;
      } else {
        try {
          failureId = (
            await failureFact(state.requestId, failureCode, state.turnId)
          ).failureId;
          state.failureCode = failureCode;
          // The run observed this terminal failure, so the coordinator records
          // the evidence; a Gateway failure already recorded its own.
          recordPiRuntimeAudit({
            operation: "failure.observed",
            origin: "skill_run",
            owner: ref(state.requestId),
            ...(options.root ? { root: options.root } : {}),
            ...(state.workspace
              ? { workspaceDir: state.workspace.workspaceDir }
              : {}),
            correlation: {
              ...(state.turnId ? { turnId: state.turnId } : {}),
              failureId,
            },
            failureCode,
          });
        } catch {
          // The failure core could not be committed, so no sealed outcome may
          // reference a durable identity that does not exist. The run requires
          // recovery and records the evidence gap instead.
          state.failureId = undefined;
          state.failureCode = undefined;
          recordPiRuntimeAudit({
            operation: "audit.gap",
            origin: "persistence",
            owner: ref(state.requestId),
            ...(options.root ? { root: options.root } : {}),
            ...(state.workspace
              ? { workspaceDir: state.workspace.workspaceDir }
              : {}),
            correlation: state.turnId ? { turnId: state.turnId } : {},
            attributes: { reason: "canonical_failure_unavailable" },
          });
          state.status = "recovery_required";
          state.failure = "persistence_failed";
          return (
            state.outcome ||
            ({
              status: "failed",
              requestId: state.requestId,
              fetchType: "result",
              error: "persistence_failed",
              responseJson: undefined,
            } as ProviderExecutionResult)
          );
        }
      }
    }
    let committed = false;
    await commitPiOwnerFacts(
      ref(state.requestId),
      (entries) => {
        const existing = entries.find(
          (entry) => entry.kind === "skill_run_outcome",
        );
        if (existing) {
          state.outcome = fold(state.requestId, entries).outcome;
          return [];
        }
        committed = true;
        const { resultJson: _resultJson, ...receipt } = result;
        return [
          {
            entryId: "provider-outcome",
            kind: "skill_run_outcome",
            payload: json({
              result: receipt,
              // The outcome references the committed failure identity; the
              // cause itself stays in the failure core, not restated here.
              ...(failureId ? { failureId } : {}),
              sealedAt: new Date().toISOString(),
              revision: entries.length + 1,
            }),
          },
        ];
      },
      options.root,
    );
    if (committed) state.outcome = result;
    state.status = state.outcome!.status as PiSkillRunStatus;
    const settled = state.outcome!;
    // The failure observation and its evidence were committed by failureFact
    // before the outcome, so the terminal only references that identity.
    if (committed) {
      if (settled.status === "canceled")
        recordPiRuntimeAudit({
          operation: "execution.canceled",
          origin: "skill_run",
          owner: ref(state.requestId),
          root: options.root,
          correlation: { turnId: state.turnId || undefined },
        });
      recordPiRuntimeAudit({
        operation: "owner.terminal",
        origin: "skill_run",
        owner: ref(state.requestId),
        root: options.root,
        ...(state.workspace
          ? { workspaceDir: state.workspace.workspaceDir }
          : {}),
        correlation: {
          turnId: state.turnId || undefined,
          ...(failureId ? { failureId } : {}),
        },
        attributes: { status: settled.status },
      });
    }
    // Terminal is a flush boundary for this owner.
    await flushPiRuntimeAuditOwner(ref(state.requestId), options.root);
    emit(state.requestId, [
      "navigation",
      "control",
      "presentation",
      "details",
      "resources",
    ]);
    return state.outcome!;
  }
  const deferred = (state: State): ProviderExecutionResult => ({
    status: "deferred",
    requestId: state.requestId,
    fetchType: "result",
    backendStatus: "waiting_user",
    detachReason:
      state.status === "recovery_required" ? "observer_failure" : "waiting",
    continuationOwner:
      state.status === "recovery_required" ? "recovery" : "foreground",
  });
  async function execute(
    args: ProviderExecuteArgs,
  ): Promise<ProviderExecutionResult> {
    if (
      args.backend.type !== "builtin-pi" ||
      args.requestKind !== "skillrunner.job.v1"
    )
      throw new Error("pi_skill_run_contract_invalid");
    const request = args.request as SkillRunnerJobRequestV1;
    if (
      !request ||
      request.kind !== "skillrunner.job.v1" ||
      typeof request.skill_id !== "string" ||
      !request.skill_id.trim()
    )
      throw new Error("pi_skill_run_contract_invalid");
    const requestId = id("pi-skill");
    await createPiOwner(ref(requestId), options.root);
    const mode = request.runtime_options?.execution_mode;
    const requestedBudget = args.orchestrationContext?.executionBudgetMs;
    if (
      requestedBudget !== undefined &&
      (!Number.isFinite(requestedBudget) || requestedBudget <= 0)
    )
      throw new Error("execution_budget_invalid");
    await fact(requestId, "skill_run_admitted", {
      skillRunPipelineVersion: "v1",
      skillId: request.skill_id,
      taskName: request.taskName || request.skill_id,
      mode: mode === "interactive" ? "interactive" : "auto",
      workflow: args.orchestrationContext || {},
      backendId: "builtin-pi",
      budgetMs: Math.min(
        8 * 60 * 60 * 1000,
        requestedBudget ?? 8 * 60 * 60 * 1000,
      ),
    });
    // The Workflow apply inputs are captured once, at admission, while they
    // still exist. The apply seam itself runs on an in-memory run state that a
    // restart cannot rebuild, so these scalars are the only facts a later
    // reattach can honestly use. Anything the apply step needs beyond them is
    // unavailable by construction, and the owner says so rather than guessing.
    await fact(requestId, "skill_run_apply_inputs", {
      workflowId: args.orchestrationContext?.workflowId ?? null,
      workflowRunId: args.orchestrationContext?.workflowRunId ?? null,
      jobId: args.orchestrationContext?.jobId ?? null,
      workflowLabel: args.orchestrationContext?.workflowLabel ?? null,
      submissionId: args.orchestrationContext?.submissionId ?? null,
      submissionUnitId: args.orchestrationContext?.submissionUnitId ?? null,
      capturedAt: new Date().toISOString(),
    });
    const state = await load(requestId);
    // The Workflow reservation is read back from the queue that admitted this
    // unit and committed as a canonical fact, so a restart rejoins the very
    // same slot instead of opening a second reservation pool.
    const reservation = readWorkflowReservation(args, requestId);
    if (reservation) {
      state.reservation = reservation;
      await fact(requestId, "skill_run_reservation", reservation);
    }
    // The workspace is bound at admission, before preparation and before any
    // model dispatch, so a run that fails preparation still has a durable
    // location for its evidence. Preparation reuses this same workspace
    // instead of creating a second one. A failure here still settles the
    // already-admitted owner rather than leaving it dangling.
    let workspace: AcpSkillRunnerWorkspace | undefined;
    try {
      const { createAcpSkillRunnerWorkspace } =
        await import("./acp/skillRun/acpSkillRunnerWorkspace");
      workspace = await createAcpSkillRunnerWorkspace({
        backendId: "builtin-pi",
        skillId: request.skill_id,
        requestId,
        ...(args.orchestrationContext?.workflowId
          ? { workflowId: args.orchestrationContext.workflowId }
          : {}),
        ...(args.orchestrationContext?.jobId
          ? { jobId: args.orchestrationContext.jobId }
          : {}),
        ...(options.root ? { rootDir: options.root } : {}),
      });
      state.workspace = workspace;
      await fact(requestId, "skill_run_workspace", {
        workspaceDir: workspace.workspaceDir,
      });
    } catch {
      // Without a binding the run cannot own evidence, so it settles as a
      // preparation failure through the same terminal path as any other.
      return sealOutcome(
        state,
        failureResult(state, "skill_run_preparation_failed", "prepare"),
      );
    }
    state.originWindow =
      args.providerOptions?.originWindow ||
      (typeof Zotero === "undefined" ? undefined : Zotero.getMainWindow?.());
    args.onProgress?.({ type: "request-created", requestId });
    emit(requestId, ["navigation"]);
    if (state.mode === "interactive") {
      try {
        await launchFocus?.(requestId, state.originWindow);
      } catch {
        /* UI availability does not govern admission. */
      }
    }
    if (mode !== undefined && mode !== "auto" && mode !== "interactive")
      return sealOutcome(
        state,
        failureResult(state, "invalid_execution_mode", "prepare"),
      );
    try {
      const prepared = options.prepare
        ? await options.prepare({ ...args, requestId })
        : (
            await (
              await import("./skillRunPreparation")
            ).prepareSkillRunJob({
              request,
              requestId,
              backendId: "builtin-pi",
              workflowId: args.orchestrationContext?.workflowId,
              jobId: args.orchestrationContext?.jobId,
              root: options.root,
              // Reuse the admission-time binding so preparation never
              // creates a second workspace for the same owner.
              workspace,
            })
          ).prepared;
      if (state.outcome) return state.outcome;
      state.prepared = prepared;
      await fact(requestId, "skill_run_prepared", {
        runtimeDir: prepared.workspace.runtimeDir,
        workspaceDir: prepared.workspace.workspaceDir,
        snapshotDigest: prepared.provenance.snapshotDigest,
      });
      return await start(
        state,
        "Execute the prepared Skill and submit its output with submit_skill_result.",
      );
    } catch {
      return (
        state.outcome ||
        sealOutcome(
          state,
          failureResult(state, "skill_run_preparation_failed", "prepare"),
        )
      );
    }
  }

  async function nativeWorkspace(state: State) {
    const ownerRoot = piOwnerPaths(ref(state.requestId), options.root).dir;
    const workspaceRoot = state.prepared!.workspace.workspaceDir;
    await ensureRuntimeDirectoryStrict(workspaceRoot);
    return createPiTrustedNativeExecution({
      ownerRoot,
      workspaceRoot,
      mode: "trusted",
    });
  }
  async function definitions(state: State) {
    if (options.definitions) return options.definitions(state.requestId);
    const native = await nativeWorkspace(state);
    const mcp = await getPiMcpToolSources();
    const { piMcpGatewayDefinitions } = await import("./piMcpToolSources");
    const web = await getPiBrokeredWebTools().freezeForTurn(state.model);
    const identityId = async (
      context: { sourceTurnId: string; callId: string },
      suffix: string,
    ) =>
      `zotero-${suffix}-${(await digest([state.requestId, context.sourceTurnId, context.callId, suffix])).slice(7)}`;
    const existingFact = async (entryId: string) =>
      (await inspectPiOwner(ref(state.requestId), options.root)).entries.find(
        (entry) => entry.entryId === entryId,
      )?.payload;
    return [
      ...native.definitions,
      ...createZoteroNativeToolDefinitions({
        broker: resolveZoteroHostCapabilityBroker(),
        workspace: native,
        resolveSynthesisClient: getDefaultSynthesisClient,
        mutations: {
          async identity(context) {
            const entryId = await identityId(context, "identity");
            const existing = await existingFact(entryId);
            if (existing)
              return {
                ...(existing as {
                  operationId: string;
                  generatedSourceReferenceIds: string[];
                }),
                ...(((await existingFact(
                  await identityId(context, "source-ids"),
                )) as { generatedSourceReferenceIds: string[] }) || {}),
              };
            const value = {
              operationId: entryId,
              generatedSourceReferenceIds: [],
            };
            await fact(
              state.requestId,
              "zotero_mutation_identity",
              value,
              context.sourceTurnId,
              entryId,
            );
            return value;
          },
          async recordSourceIds(context, ids) {
            await fact(
              state.requestId,
              "zotero_mutation_source_ids",
              { generatedSourceReferenceIds: ids },
              context.sourceTurnId,
              await identityId(context, "source-ids"),
            );
          },
          async recordDomainResult(context, result) {
            const entryId = await identityId(context, "receipt");
            await fact(
              state.requestId,
              "zotero_mutation_receipt",
              "receipt" in result
                ? { outcome: result.outcome, receipt: result.receipt }
                : { outcome: result.outcome, attempt: result.attempt },
              context.sourceTurnId,
              entryId,
            );
            return entryId;
          },
        },
      }),
      ...piMcpGatewayDefinitions(await mcp.getCatalogForTurn(), mcp),
      ...getPiBrokeredWebTools().definitions(web, (attempt, callId) =>
        fact(
          state.requestId,
          "web_source_attempt",
          { ...attempt, callId },
          state.turnId,
        ).then(() => {}),
      ),
    ];
  }
  async function resultDefinition(
    state: State,
  ): Promise<PiGatewayToolDefinition> {
    const prepared = state.prepared!;
    const schema = prepared.schemas.output?.document || {};
    return {
      capabilityId: "skill-result:v1",
      name: "submit_skill_result",
      description:
        "Submit the prepared Skill output. Once accepted the result is immutable.",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { protocolVersion: { const: 1 }, result: schema },
        required: ["protocolVersion", "result"],
      },
      minimumEffects: ["workspace-mutation"],
      batchMode: "exclusive",
      maxResultBytes: 50 * 1024,
      classify: () => ({
        effects: ["workspace-mutation"],
        authorizationKeys: [],
        resourceKeys: [`skill-result:${state.requestId}`],
        cost: 1,
      }),
      async execute(args, context) {
        const value = args as { result: JsonValue };
        const { validateSkillRunSubmission } =
          await import("./skillRunFinalizer");
        const validation = await validateSkillRunSubmission({
          payload: value.result,
          prepared,
        });
        if (!validation.ok)
          return {
            status: "failed",
            effectCertainty: "confirmed_none",
            code: "skill_result_invalid",
          };
        const resultDigest = await digest(value.result);
        let code: string | undefined;
        let committedSeal: State["sealed"];
        await commitPiOwnerFacts(
          ref(state.requestId),
          (entries) => {
            const fresh = fold(state.requestId, entries);
            if (fresh.sealed) {
              committedSeal = fresh.sealed;
              if (fresh.sealed.callId !== context.callId)
                code = "skill_result_already_submitted";
              return [];
            }
            if (fresh.status === "canceled" || fresh.outcome) {
              code =
                fresh.status === "canceled"
                  ? "skill_run_canceled"
                  : "skill_run_terminal";
              return [];
            }
            const sealed = {
              callId: context.callId!,
              result: json(validation.resultJson),
              digest: resultDigest,
              turnId: state.turnId,
            };
            committedSeal = sealed;
            return [
              {
                entryId: "skill-result-seal",
                kind: "skill_run_result_sealed",
                turnId: state.turnId,
                payload: json(sealed),
              },
            ];
          },
          options.root,
        );
        if (committedSeal) state.sealed = committedSeal;
        return code
          ? { status: "failed", effectCertainty: "confirmed_none", code }
          : {
              status: "completed",
              effectCertainty: "confirmed_complete",
              value: { accepted: true, resultDigest: state.sealed!.digest },
            };
      },
    };
  }
  const askDefinition: PiGatewayToolDefinition = {
    capabilityId: "ask-user:v1",
    name: "ask_user",
    description: "Ask the user one to four structured questions.",
    schema: ASK_USER_MODEL_INPUT_SCHEMA,
    minimumEffects: ["bounded-read"],
    batchMode: "deferred",
    maxResultBytes: 50 * 1024,
    classify: () => ({
      effects: ["bounded-read"],
      authorizationKeys: [],
      resourceKeys: [],
      cost: 1,
    }),
    execute: async () => ({
      status: "completed",
      effectCertainty: "not_applicable",
      value: {},
    }),
  };
  async function gateway(
    state: State,
    turnId: string,
    tools: PiGatewayToolDefinition[],
    signal: AbortSignal,
    reserveAttempts?: (attempts: number) => Promise<void>,
  ) {
    // The owner lease owns the absolute turn deadline and the process-wide
    // physical claim. A tool can therefore never outlive its budget, and its
    // resource claim is released only on real executor settlement.
    const lease = leases.get(state.requestId);
    return freezePiToolGatewayTurn({
      owner: ref(state.requestId),
      turnId,
      definitions: tools,
      ...(lease ? { deadline: lease.deadline } : {}),
      ...(lease
        ? { trackPhysical: (settlement) => lease.trackPhysical(settlement) }
        : {}),
      /**
       * Real executor evidence that arrived after the logical answer. It is
       * appended under the original call identity and never rewrites the
       * committed receipt or clears an unknown outcome by itself.
       */
      recordPhysicalEvidence: async (evidence) => {
        // Shutdown closes admission first, so a late append must not reopen
        // infrastructure that is already being torn down.
        if (lifecycle.closed || disposed)
          throw new Error("pi_shutdown_evidence_pending");
        // Identity and the outcome's own status only. The committed receipt
        // already holds the result body, so a late append never duplicates a
        // payload and never claims an outcome the owner has not reconciled.
        await fact(
          state.requestId,
          "tool_call_physical_evidence",
          {
            callId: evidence.callId,
            capabilityId: evidence.capabilityId,
            state: evidence.state,
            ...(evidence.outcome
              ? {
                  outcomeStatus: evidence.outcome.status,
                  effectCertainty: evidence.outcome.effectCertainty,
                }
              : {}),
            ...(evidence.domainOperation
              ? { domainOperation: evidence.domainOperation }
              : {}),
          },
          evidence.turnId,
        ).catch(() => undefined);
      },
      runtimeCapability: {
        identity: "pi-skill-runtime:v1",
        availableCapabilityIds: tools.map((tool) => tool.capabilityId),
      },
      policy: {
        mode: state.mode === "auto" ? "automatic" : "interactive",
        systemAllowedEffects: [
          "bounded-read",
          "workspace-mutation",
          "code-execution",
          "external-egress",
          "external-mutation",
          "local-network",
          "zotero-mutation",
        ],
        authorizedEffects: [
          "bounded-read",
          "workspace-mutation",
          "external-egress",
        ],
        authorizedKeys: [],
        maxCalls: 100,
        maxConcurrent: 4,
        maxCost: 100,
      },
      hooks: {
        beforeExecuteBatch: reserveAttempts,
        recordStarted: (value) =>
          fact(state.requestId, "tool_call_started", value, turnId).then(
            () => {},
          ),
        recordReceipt: (value) =>
          fact(state.requestId, "tool_call_receipt", value, turnId).then(
            () => {},
          ),
        recordPermission: (value) =>
          fact(
            state.requestId,
            "permission_pending",
            { id: value.call.callId, pending: value },
            turnId,
          ).then(() => {}),
        // The gateway owns the tool failure and commits its canonical core;
        // everything above reuses the returned identity.
        recordFailure: async (failure) =>
          (
            await failureFact(state.requestId, failure.code, turnId, {
              origin: "pi_tool_gateway",
              effectCertainty: failureEffectCertainty(failure.effectCertainty),
            })
          ).failureId,
      },
      audit: {
        owner: ref(state.requestId),
        ...(options.root ? { root: options.root } : {}),
        ...(state.workspace
          ? { workspaceDir: state.workspace.workspaceDir }
          : {}),
      },
      signal,
    });
  }
  function modelTools(tools: PiGatewayTurn["catalog"]["tools"], state: State) {
    return tools
      .filter((tool) => !(state.sealed && tool.name === "submit_skill_result"))
      .map((tool) => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        execute: async () => {
          throw new Error("pi_gateway_required");
        },
      }));
  }
  async function frozenFacts(
    state: State,
    tools: PiGatewayTurn["catalog"],
  ): Promise<PiTurnPreparationInput["frozen"]> {
    const prepared = state.prepared!;
    const estimator = createPiNativeEstimator();
    const instructions = [
      prepared.instructions.skillMd?.content,
      prepared.instructions.run?.content,
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      turnId: state.turnId,
      model: state.model!,
      tools,
      capability: {
        envelopeDigest: await digest(tools.digest),
        receiptRef: `capability:${state.turnId}`,
      },
      policy: {
        outputReserve: Math.min(
          state.model!.policy.maxTokens || 2048,
          Math.floor(state.model!.policy.contextWindow / 4),
        ),
        safetyMargin: Math.min(
          1024,
          Math.floor(state.model!.policy.contextWindow / 20),
        ),
        budgetVersion: "pi-skill-run:v1",
        estimator: {
          id: estimator.id,
          version: estimator.version,
          mode: estimator.mode,
        },
        tailTargetTokens: Math.floor(state.model!.policy.contextWindow / 4),
      },
      instructions: [
        {
          source: "managed_control",
          registered: true,
          ref: `prepared:${prepared.provenance.snapshotDigest}`,
          revision: prepared.provenance.snapshotDigest,
          digest: await digest(instructions),
          discoveryVersion: "skill-run:v1",
          text: instructions,
        },
      ],
      resources: {
        manifestDigest: prepared.provenance.snapshotDigest,
        skills: [
          {
            ref: `skill:${prepared.skillId}`,
            name: prepared.skillId,
            description: "Prepared Skill",
            digest: prepared.resources.checksum,
            available: true,
            required: true,
          },
        ],
        attachments: collectUserInteractionFileRefs(
          state.interactionBatch?.draftAnswers || {},
        ).map((file) => ({
          ref: file.refId,
          ...(file.name ? { displayName: file.name } : {}),
        })),
        userFiles: [],
        preparedSkillRun: {
          ref: `prepared:${prepared.requestId}`,
          version: "v1",
          snapshotDigest: prepared.provenance.snapshotDigest,
          inputDigest: await digest(prepared.inputs),
          outputDigest: prepared.provenance.schemaDigest,
          outputContractText: JSON.stringify({
            instructions: prepared.outputContractText,
            input: prepared.inputs.input,
            parameter: prepared.inputs.parameter,
            files: prepared.inputs.files,
            outputSchema: prepared.schemas.output?.document || {},
            workspace: prepared.workspace.workspaceDir,
            resultProtocolVersion: 1,
          }),
        },
      },
    };
  }
  async function prepareInvocation(
    state: State,
    frozen: PiTurnPreparationInput["frozen"],
    invocationId: string,
    continuation: boolean,
    invocationSignal: AbortSignal,
  ) {
    // The lease is the owner's own cancellation source, so a budget expiry or
    // a shutdown aborts preparation even when the Runtime invocation has not
    // noticed the disconnect yet. A nested provider call inherits it rather
    // than consuming a second turn.
    let signal = invocationSignal;
    try {
      const leaseSignal = leases.get(state.requestId)?.signal;
      if (leaseSignal)
        signal = anySignal([invocationSignal, leaseSignal]) ?? invocationSignal;
    } catch {
      // A missing native AbortController must not fail preparation: the
      // Runtime's own invocation signal already bounds this call.
    }
    const estimator = createPiNativeEstimator();
    const prepared = await preparePiTurn(
      {
        intent: continuation ? "continuation" : "initial",
        owner: ref(state.requestId),
        turnId: state.turnId,
        invocationId,
        runtimeGeneration: state.turnId,
        ownerIdle: false,
        transcript: await readPiOwnerTranscriptSnapshot(
          ref(state.requestId),
          options.root,
        ),
        frozen,
      },
      {
        ...createPiOwnerPreparationAdapter(ref(state.requestId), options.root),
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
          if (signal?.aborted) controller.abort();
          const onAbort = () => controller.abort();
          signal?.addEventListener("abort", onAbort, { once: true });
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
          let output = "";
          const selectionRef = (
            await fact(
              state.requestId,
              "model_selection",
              {
                purpose: "compaction",
                model: projectPiCanonicalSelection(input.model),
              },
              state.turnId,
            )
          ).entryId;
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
            // The structured provider reports the invocation's real terminal
            // usage. The legacy text-delta seam has none, so its compaction stays
            // explicitly unknown instead of being estimated from the summary.
            const structured = options.compactionExecution
              ? options.compactionExecution(input.model)
              : options.execution
                ? undefined
                : createPiProviderSource(input.model, {
                    authorizeLocalNetwork: async (endpoint) =>
                      endpoint === state.localEndpoint,
                  });
            if (structured) {
              const session = new PiRuntime().openSession({
                sessionId: `${state.requestId}:compaction:${invocationId}`,
                ...structured,
              });
              const turn = session.runTurn({
                turnId: `${state.turnId}:compaction`,
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
              leases.get(state.requestId)?.trackPhysical(turn.settled);
              const result = await turn.result;
              session.dispose();
              if (result.status !== "completed")
                throw new Error("pi_summary_failed");
            } else {
              const source = createPiProviderModelSource(input.model, {
                authorizeLocalNetwork: async (endpoint) =>
                  endpoint === state.localEndpoint,
              });
              for await (const part of source({
                systemPrompt: input.prompt,
                messages,
                signal: controller.signal,
              })) {
                output += part;
                if (output.length > 256 * 1024)
                  throw new Error("pi_summary_too_large");
              }
            }
            return JSON.parse(output) as PiCompactionSummary;
          } finally {
            signal?.removeEventListener("abort", onAbort);
            if (usageByInvocation.size === 0)
              usageByInvocation.set(fallbackInvocationId, {
                usage: unknownPiRuntimeUsage(),
              });
            for (const [invocationId, evidence] of usageByInvocation) {
              const usage = evidence.usage;
              await fact(
                state.requestId,
                "compaction_usage",
                {
                  purpose: "compaction",
                  invocationId,
                  selectionRef,
                  usage,
                  ...(evidence.stopReason
                    ? { stopReason: evidence.stopReason }
                    : {}),
                  ...(evidence.providerTerminal
                    ? { providerTerminal: evidence.providerTerminal }
                    : {}),
                },
                state.turnId,
              );
              state.usage.compaction += usage.totalTokens;
              if (usage.costEstimate === null) state.usage.costUnknown += 1;
              else state.usage.compactionCost += usage.costEstimate;
            }
          }
        },
      },
    );
    if (prepared.status === "failed") {
      throw new Error(prepared.failure.code);
    }
    const context = prepared.context;
    return {
      systemPrompt: context.blocks.map((block) => block.text).join("\n\n"),
      messages: context.messages.map((message) =>
        message.role === "tool"
          ? {
              role: "tool" as const,
              callId: message.callId!,
              name: message.name!,
              text: message.text,
              isError: message.isError === true,
            }
          : message.role === "assistant"
            ? {
                role: "assistant" as const,
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
              }
            : { role: "user" as const, text: message.text },
      ),
    };
  }
  async function createInteraction(
    state: State,
    calls: readonly PiRuntimeToolCall[],
  ) {
    const batch: UserInteractionBatchV1 = {
      schema: USER_INTERACTION_BATCH_SCHEMA,
      batchId: id("interaction"),
      ownerKey: state.requestId,
      turnId: state.turnId,
      assistantMessageId: id("assistant"),
      status: "collecting",
      revision: 0,
      calls: [],
      questions: [],
      draftAnswers: {},
    };
    for (const [callIndex, call] of calls.entries()) {
      const input = parseAskUserModelInputV1(call.arguments)!;
      const questionIds: string[] = [];
      for (const [questionIndex, question] of input.questions.entries()) {
        const questionId = id("question");
        questionIds.push(questionId);
        batch.questions.push({
          questionId,
          toolCallId: call.callId,
          callIndex,
          questionIndex,
          kind: question.kind,
          prompt: question.prompt,
          header: question.header || null,
          hint: question.hint || null,
          required: question.required !== false,
          options: (question.options || []).map((option) => ({
            optionId: id("option"),
            label: option.label,
            value: option.value,
            description: option.description || null,
          })),
          files: (question.files || []).map((slot) => ({
            slotId: id("slot"),
            name: slot.name,
            required: slot.required !== false,
            hint: slot.hint || null,
            accept: slot.accept || null,
          })),
        });
      }
      batch.calls.push({ toolCallId: call.callId, callIndex, questionIds });
    }
    if (!parseUserInteractionBatchV1(batch))
      throw new Error("pi_interaction_invalid");
    await fact(
      state.requestId,
      "interaction_pending",
      { id: batch.batchId, batch },
      state.turnId,
    );
    state.interactionBatch = batch;
    await setStatus(state, "waiting_user");
  }
  function toolResult(result: PiGatewayCallResult): PiRuntimeToolResult {
    return {
      callId: result.callId,
      name: result.name,
      text: JSON.stringify(result),
      isError: result.status !== "completed",
      effectCertainty: result.effectCertainty,
    };
  }
  async function runBatch(
    state: State,
    tools: PiGatewayTurn,
    calls: readonly PiRuntimeToolCall[],
  ) {
    if (
      calls.some((call) => call.name === "submit_skill_result") &&
      calls.length !== 1
    )
      return {
        results: calls.map((call) => ({
          callId: call.callId,
          name: call.name,
          text: JSON.stringify({ code: "skill_result_batch_exclusive" }),
          isError: true,
        })),
      };
    const asks =
      state.mode === "interactive"
        ? calls.filter((call) => call.name === "ask_user")
        : [];
    const ordinary = calls.filter((call) => !asks.includes(call));
    const inputs = asks.map((call) => parseAskUserModelInputV1(call.arguments));
    const valid =
      inputs.every(Boolean) &&
      inputs.reduce(
        (count, input) => count + (input?.questions.length || 0),
        0,
      ) <= 16;
    const executed = await tools.executeBatch([...ordinary]);
    state.pending = executed.pending;
    const results = executed.results
      .filter((result) => result.status !== "permission_required")
      .map(toolResult);
    const unknown = executed.results
      .filter((result) => result.effectCertainty === "unknown")
      .map((result) => result.callId);
    if (!valid)
      results.push(
        ...asks.map((call) => ({
          callId: call.callId,
          name: call.name,
          text: JSON.stringify({ code: "ask_user_invalid" }),
          isError: true,
          effectCertainty: "not_started" as const,
        })),
      );
    // Ordinary results become canonical before a durable interaction wait.
    for (const result of results)
      await recordResult(state, result, state.turnId);
    if (unknown.length) {
      await setStatus(state, "recovery_required", "tool_effect_unknown");
      return { results, unknown };
    }
    if (state.pending.length) {
      await setStatus(state, "waiting_permission");
      return { results, suspended: true };
    }
    if (state.status === "canceled") return { results, suspendedRun: true };
    if (state.sealed) return { results, suspendedRun: true };
    if (valid && asks.length) {
      await createInteraction(state, asks);
      return { results, waitingUser: true };
    }
    return { results };
  }
  async function recordResult(
    state: State,
    result: PiRuntimeToolResult,
    turnId: string,
  ) {
    const existing = (
      await inspectPiOwner(ref(state.requestId), options.root)
    ).entries.some((entry) => entry.entryId === `result-${result.callId}`);
    if (existing) return;
    await fact(
      state.requestId,
      "tool_result",
      {
        callId: result.callId,
        name: result.name,
        text: result.text,
        status: result.isError ? "failed" : "completed",
        effectCertainty: result.effectCertainty || "not_applicable",
      },
      turnId,
      `result-${result.callId}`,
    );
    state.counts.tool++;
    emit(state.requestId, ["transcript"], { sourceEventSeq: ++state.revision });
  }
  async function recordRefusedCleanup(
    state: State,
    error: unknown,
    turnId: string,
  ) {
    const calls =
      error && typeof error === "object" && "cleanupPendingCallIds" in error
        ? (error as { cleanupPendingCallIds?: unknown }).cleanupPendingCallIds
        : undefined;
    if (Array.isArray(calls) && calls.length)
      await fact(
        state.requestId,
        "tool_preflight_cleanup_pending",
        { callIds: calls },
        turnId,
      );
  }
  async function finalize(state: State): Promise<ProviderExecutionResult> {
    if (state.outcome) return state.outcome;
    const prepared = state.prepared!;
    const { finalizeSkillRun } = await import("./skillRunFinalizer");
    const result = await finalizeSkillRun({
      payload: state.sealed!.result,
      backend: { id: "builtin-pi", type: "builtin-pi" },
      repairRounds: 0,
      prepared,
    });
    if (!result.ok)
      return sealOutcome(
        state,
        failureResult(state, "skill_result_finalization_failed", "finalize"),
      );
    return sealOutcome(state, {
      status: "succeeded",
      requestId: state.requestId,
      fetchType: "result",
      resultJson: result.resultJson,
      resultJsonPath: result.resultJsonPath,
      workspaceDir: prepared.workspace.workspaceDir,
      resultArtifactBasePath: prepared.workspace.workspaceDir,
      responseJson: result.responseJson,
    });
  }
  async function start(
    state: State,
    text?: string,
    startupContinuation = false,
    startupConsent?: State["restartConsent"],
  ): Promise<ProviderExecutionResult> {
    if (disposed) throw new Error("pi_skill_run_shutdown");
    if (state.outcome) return state.outcome;
    if (state.active) throw new Error("pi_skill_run_busy");
    // A deleting owner keeps its history for a hold-safe retry, so nothing
    // here may dispatch or admit new work for it.
    if (state.deleting) throw new Error("pi_skill_run_deleting");
    await commitPiOwnerFacts(
      ref(state.requestId),
      (entries) => {
        const fresh = fold(state.requestId, entries);
        // The fresh fold is the authority: a deletion marked after this
        // turn was requested blocks it even if the in-memory state is stale.
        if (fresh.deleting) throw new Error("pi_skill_run_deleting");
        if (
          startupContinuation &&
          startupConsent &&
          (!fresh.restartConsent ||
            fresh.restartConsent.taskScope !== startupConsent.taskScope ||
            fresh.restartConsent.credentialRef !==
              startupConsent.credentialRef ||
            fresh.restartConsent.identityRevision !==
              startupConsent.identityRevision ||
            getPiCredentialIdentityRevision(
              startupConsent.credentialRef,
              "model-provider",
            ) !== startupConsent.identityRevision)
        )
          throw new Error("pi_skill_run_restart_consent_changed");
        // A previously running owner is admitted only through recovery, which
        // has already judged its checkpoint safe. Every other status is busy.
        const admissible = ["queued", "suspended"];
        if (fresh.status === "running" && startupContinuation)
          admissible.push("running");
        if (fresh.outcome || fresh.sealed || !admissible.includes(fresh.status))
          throw new Error("pi_skill_run_busy");
        return [
          {
            entryId: id("turn-admission"),
            kind: "skill_run_status",
            payload: { status: "running" },
          },
        ];
      },
      options.root,
    );
    state.status = "running";
    const work = (async () => {
      const turnId = id("turn");
      state.turnId = turnId;
      state.failureId = undefined;
      state.failureCode = undefined;
      const Controller = resolveNativeAbortControllerConstructor();
      if (!Controller) throw new Error("pi_signal_unavailable");
      const controller = new Controller();
      state.abort = () => controller.abort();
      state.suspend = () => controller.abort();
      // Auto work and safe startup continuations preserve foreground slots.
      await admit(
        state,
        turnId,
        startupContinuation || state.mode === "auto"
          ? "background"
          : "foreground",
        controller.signal,
      );
      state.model = options.resolveModel
        ? await options.resolveModel(state.selection)
        : resolvePiModelSelection({
            kind: "skillRun",
            ownerSelection: state.selection,
            catalog: await loadPiModelCatalog(),
            credentials: listPiCredentials(),
          });
      /**
       * A run admitted through a default anchors the choice it actually made.
       * The next turn revalidates this choice against current metadata instead
       * of following a default that has since moved; an explicit user change
       * is never overwritten, and no effect, budget or lease is touched.
       */
      if (!state.selection) {
        const anchored: PiSelection = {
          configurationId: state.model.configurationId,
          modelId: state.model.modelId,
          reasoning: state.model.reasoning,
        };
        await fact(state.requestId, "skill_run_selection", anchored);
        state.selection = anchored;
      }
      if (
        state.model.requiresLocalNetwork &&
        state.localEndpoint !== state.model.baseUrl
      ) {
        if (
          !(await authorizeLocalNetwork?.(
            state.model.baseUrl,
            state.originWindow,
          ))
        )
          throw new Error("pi_local_network_unapproved");
        state.localEndpoint = state.model.baseUrl;
      }
      const allDefinitions = [
        ...(await definitions(state)),
        ...(!state.sealed ? [await resultDefinition(state)] : []),
        ...(state.mode === "interactive" ? [askDefinition] : []),
      ];
      const reservation: {
        reserve?: (attempts: number) => Promise<void>;
      } = {};
      // Tool dispatch inherits the owner's lease. Without it a tool could run
      // its full hard maximum long after the turn budget expired.
      const tools = await gateway(
        state,
        turnId,
        allDefinitions,
        anySignal([controller.signal, leases.get(state.requestId)?.signal]) ??
          controller.signal,
        (attempts) => reservation.reserve!(attempts),
      );
      const frozen = await frozenFacts(state, tools.catalog);
      if (state.outcome) return state.outcome;
      if (controller.signal.aborted || state.status === "suspended")
        return deferred(state);
      // The budget exists canonically before any model dispatch. Without this
      // an owner interrupted after admission has no recorded active time, and
      // a restart could never distinguish it from a run that never started. A
      // failed write releases the lease and requires recovery, so the turn can
      // never keep spending against an unrecorded budget.
      try {
        await snapshotBudget(state, turnId, true);
      } catch {
        const lease = leases.get(state.requestId);
        leases.delete(state.requestId);
        lease?.release();
        await setStatus(
          state,
          "recovery_required",
          "pi_execution_checkpoint_unavailable",
        );
        return deferred(state);
      }
      await fact(
        state.requestId,
        "turn_started",
        {
          turnId,
          preparedDigest: state.prepared!.provenance.snapshotDigest,
          // Canonical safe selection evidence, written once per turn. The
          // endpoint and the credential stay in the binding.
          model: json(projectPiCanonicalSelection(state.model)),
        },
        turnId,
      );
      if (text) {
        await fact(state.requestId, "message", { role: "user", text }, turnId);
        state.counts.user++;
      }
      await setStatus(state, "running");
      if (state.outcome) return state.outcome;
      if (controller.signal.aborted) return deferred(state);
      const session = new PiRuntime().openSession({
        sessionId: `${state.requestId}:${turnId}`,
        ...(options.execution
          ? options.execution(state.model)
          : createPiProviderSource(state.model, {
              authorizeLocalNetwork: async (endpoint) =>
                endpoint === state.localEndpoint,
            })),
      });
      let assistantId = id("assistant");
      let streamingText = "";
      let assistantMessagePersisted = false;
      // Declared before the turn exists: the Runtime may emit events while the
      // session is still being built, and a temporal dead zone there would drop
      // every canonical fact of the turn.
      const openInvocations = new Set<string>();
      const turn = session.runTurn({
        turnId,
        toolAttemptAccounting: "gateway",
        messages: [],
        tools: modelTools(tools.catalog.tools, state),
        loopGuard: {
          state: state.guard,
          persist: (guard) =>
            fact(state.requestId, "skill_run_guard", guard, turnId).then(
              () => {},
            ),
        },
        async prepareInvocation({ invocationId, invocationIndex, signal }) {
          assistantId = id("assistant");
          streamingText = "";
          assistantMessagePersisted = false;
          return {
            ...(await prepareInvocation(
              state,
              frozen,
              invocationId,
              invocationIndex > 0,
              signal,
            )),
            tools: modelTools(tools.catalog.tools, state),
          };
        },
        executeTools: async (batch) => {
          reservation.reserve = batch.reserveAttempts;
          // Owner-controlled interaction calls wait without dispatching a tool.
          await batch.reserveAttempts!(0);
          try {
            const settled = await runBatch(state, tools, batch.calls);
            // Every call of the batch is settled, so this is a safe
            // continuation point: the consumed budget is recorded while the
            // turn keeps running, and a crash before the next model call
            // still resumes with the correct remainder.
            // A failed budget write throws out of the batch, so the turn never
            // dispatches another model call on an unrecorded budget.
            if (!settled.suspended && openInvocations.size === 0)
              await snapshotBudget(state, turnId, true);
            return settled;
          } catch (error) {
            await recordRefusedCleanup(state, error, turnId);
            throw error;
          }
        },
        /**
         * Actual provider completion. A canceled or timed-out turn never emits
         * its logical terminal, so this separate canonical fact is the only
         * honest closure. It is a non-context fact, so a suspended run can
         * still continue, and it never fabricates a result.
         */
        async onInvocationSettled({ invocationId }) {
          openInvocations.delete(invocationId);
          // A closing process must not reopen owner storage from a late
          // callback. The provider really exited, but a fact written after
          // shutdown belongs to the next start's explicit recovery instead.
          if (lifecycle.closed || disposed)
            throw new Error("pi_shutdown_evidence_pending");
          await fact(
            state.requestId,
            "model_invocation_settled",
            { invocationId, physicalOutcome: "settled" },
            turnId,
          );
        },
        async onEvent(event) {
          if (event.kind === "invocation_started") {
            openInvocations.add(event.invocationId);
            await fact(
              state.requestId,
              "model_invocation_started",
              { invocationId: event.invocationId },
              turnId,
            );
          } else if (event.kind === "invocation_terminal") {
            openInvocations.delete(event.invocationId);
            if (
              event.providerTerminal?.status === "incomplete" &&
              streamingText &&
              !assistantMessagePersisted
            ) {
              await fact(
                state.requestId,
                "message",
                {
                  role: "assistant",
                  text: streamingText,
                  status: "incomplete-visible",
                },
                turnId,
                assistantId,
              );
              assistantMessagePersisted = true;
              state.counts.assistant++;
              emit(state.requestId, ["transcript"], {
                sourceEventSeq: ++state.revision,
              });
            }
            await fact(
              state.requestId,
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
              state.usage.main += event.usage.totalTokens;
              if (event.usage.costEstimate === null)
                state.usage.costUnknown += 1;
              else state.usage.cost += event.usage.costEstimate;
            }
          } else if (event.kind === "assistant_message") {
            assistantMessagePersisted = true;
            await fact(
              state.requestId,
              "message",
              {
                role: "assistant",
                text: event.text,
                toolCalls: await Promise.all(
                  event.toolCalls.map(async (call) => ({
                    ...call,
                    argumentsDigest: await digest(call.arguments),
                  })),
                ),
                usage: event.usage,
                // The contribution identity keeps one invocation's usage and
                // cost a single canonical fact across replays and rebuilds.
                invocationId: event.invocationId,
                purpose: "main",
              },
              turnId,
              assistantId,
            );
            if (event.thinking) {
              await fact(
                state.requestId,
                "thought",
                { text: event.thinking },
                turnId,
              );
              state.counts.thought++;
            }
            state.counts.assistant++;
            // The SDK cost block reports zero for an unmapped target, so the
            // run's running total follows the project estimate instead.
            if (event.usage.costEstimate === null) state.usage.costUnknown += 1;
            else state.usage.cost += event.usage.costEstimate;
            state.usage.main += event.usage.totalTokens;
            emit(state.requestId, ["transcript"], {
              sourceEventSeq: ++state.revision,
            });
          } else if (event.kind === "tool_result")
            await recordResult(state, event, turnId);
          else if (event.kind === "text_delta") {
            const first = !streamingText;
            streamingText += event.text;
            emit(state.requestId, ["transcript"], {
              sourceEventSeq: ++state.revision,
              transcriptEvents: [
                {
                  boundary: first ? "hard-boundary" : "text-continuation",
                  cardinality: first ? "insert" : "retain",
                  mutation: first
                    ? {
                        op: "upsert_item",
                        item: {
                          itemId: assistantId,
                          itemKind: "message",
                          role: "assistant",
                          text: event.text,
                          createdAt: new Date().toISOString(),
                          updatedAt: null,
                          status: "streaming",
                          revision: null,
                        },
                      }
                    : {
                        op: "append_text",
                        itemId: assistantId,
                        text: event.text,
                      },
                },
              ],
            });
          }
        },
      });
      state.abort = () => {
        controller.abort();
        turn.abort();
      };
      state.suspend = () => {
        controller.abort();
        turn.suspend();
      };
      // Physical occupancy is the Agent's real completion, not the bounded
      // logical result: a canceled or timed-out turn still holds capacity until
      // the provider actually exits.
      leases.get(state.requestId)?.trackPhysical(turn.settled);
      // Canonical closure of every invocation this turn opened. A canceled or
      // timed-out turn never emits its logical terminal, so without this fact
      // the invocation stays open forever and every later preparation refuses
      // the owner as unrecoverable. Recording it on real physical completion
      // never fabricates a result and never suppresses a visible event.
      let result;
      try {
        result = await turn.result;
        if (result.status === "failed") {
          const failure = await failureFact(
            state.requestId,
            result.failure.code,
            turnId,
          );
          result = {
            ...result,
            failure: { ...result.failure, failureId: failure.failureId },
          };
          recordPiRuntimeAudit({
            operation: "failure.observed",
            origin: "skill_run",
            owner: ref(state.requestId),
            root: options.root,
            correlation: { turnId, failureId: failure.failureId },
            failureCode: failure.code,
          });
        }
        await fact(
          state.requestId,
          "turn_terminal",
          {
            turnId,
            status: result.status,
            ...(result.status === "failed"
              ? { failureId: result.failure.failureId }
              : {}),
          },
          turnId,
        );
      } finally {
        session.dispose();
        state.abort = undefined;
        state.suspend = undefined;
      }
      if (state.sealed) {
        await checkpoint(state, turnId, false);
        return finalize(state);
      }
      if (state.outcome) {
        await checkpoint(state, turnId, false);
        return state.outcome;
      }
      if (state.status === "recovery_required") {
        // The durable halt retains its budget. Unresolved effect and physical
        // holds independently block continuation until authoritative evidence.
        await checkpoint(state, turnId, true);
        return deferred(state);
      }
      if (
        ["suspended"].includes(state.status) ||
        result.status === "suspended"
      ) {
        await setStatus(state, "suspended");
        await checkpoint(state, turnId, true);
        return deferred(state);
      }
      if (
        result.status === "waiting_user" ||
        result.status === "waiting_permission"
      ) {
        // Waiting is a durable pause: the remainder is checkpointed so the
        // answer continues the same run rather than a fresh eight hours.
        await checkpoint(state, turnId, true);
        return deferred(state);
      }
      if (result.status === "state_unknown") {
        await setStatus(state, "recovery_required", "tool_effect_unknown");
        await checkpoint(state, turnId, true);
        return deferred(state);
      }
      // A sealed terminal is not resumable: the run is finished.
      await checkpoint(state, turnId, false);
      return sealOutcome(
        state,
        failureResult(
          state,
          result.status === "failed"
            ? result.failure.code
            : result.status === "canceled"
              ? "skill_run_canceled"
              : "skill_result_not_submitted",
        ),
      );
    })();
    state.active = work;
    try {
      return await work;
    } catch {
      return (
        state.outcome ||
        (state.sealed
          ? finalize(state)
          : sealOutcome(
              state,
              failureResult(state, "skill_run_execution_failed"),
            ))
      );
    } finally {
      state.active = undefined;
      state.abort = undefined;
      state.suspend = undefined;
    }
  }

  async function interactionMutation(
    requestId: string,
    payload:
      | AssistantInteractionDraftPayloadV1
      | AssistantInteractionSubmitPayloadV1
      | AssistantInteractionDeclinePayloadV1,
    action: "draft" | "submit" | "decline",
  ) {
    if (
      !payload ||
      typeof payload.mutationId !== "string" ||
      !payload.mutationId.trim() ||
      payload.mutationId.length > 512 ||
      typeof payload.batchId !== "string" ||
      !Number.isSafeInteger(payload.baseRevision)
    )
      throw new Error("interaction_payload_invalid");
    const mutationEntryId = `interaction-mutation-${(await digest(payload.mutationId)).slice(7)}`;
    return serialize(requestId, async () => {
      const state = await loadPaused(requestId, "waiting_user");
      const fingerprint = await digest({ action, payload });
      let revision = 0;
      let resume = false;
      let committedBatch: UserInteractionBatchV1 | undefined;
      await commitPiOwnerFacts(
        ref(requestId),
        (entries) => {
          const fresh = fold(requestId, entries);
          const previous = fresh.draftReceipts[payload.mutationId];
          if (previous) {
            if (previous.fingerprint !== fingerprint)
              throw new Error("interaction_mutation_conflict");
            revision = previous.revision;
            committedBatch = fresh.interactionBatch;
            return [];
          }
          const batch = fresh.interactionBatch;
          if (
            !batch ||
            batch.batchId !== payload.batchId ||
            batch.status !== "collecting" ||
            fresh.status !== "waiting_user" ||
            state.active
          )
            throw new Error("interaction_not_collecting");
          if (
            !Number.isSafeInteger(payload.baseRevision) ||
            payload.baseRevision !== batch.revision
          ) {
            state.interactionBatch = batch;
            emit(requestId, ["resources"]);
            throw new Error("interaction_revision_stale");
          }
          const next = JSON.parse(
            JSON.stringify(batch),
          ) as UserInteractionBatchV1;
          if (action === "draft") {
            const mutation = payload as AssistantInteractionDraftPayloadV1;
            const question = next.questions.find(
              (item) => item.questionId === mutation.questionId,
            );
            if (!question) throw new Error("interaction_question_missing");
            next.draftAnswers[mutation.questionId] = mutation.answer;
          } else if (action === "submit") {
            const submission = payload as AssistantInteractionSubmitPayloadV1;
            next.draftAnswers = submission.answers;
            if (!isUserInteractionBatchSubmittableV1(next))
              throw new Error("interaction_required_answer_missing");
            next.status = "submitted";
          } else next.status = "declined";
          next.revision++;
          revision = next.revision;
          if (!parseUserInteractionBatchV1(next))
            throw new Error("interaction_answer_invalid");
          // File identities must be admitted by the owner, never invented by a page.
          const knownFiles = new Set(
            collectUserInteractionFileRefs(batch.draftAnswers).map((file) =>
              JSON.stringify(file),
            ),
          );
          for (const file of collectUserInteractionFileRefs(next.draftAnswers))
            if (!knownFiles.has(JSON.stringify(file)))
              throw new Error("interaction_file_unowned");
          const inputs: PiTranscriptInput[] = [
            {
              entryId: mutationEntryId,
              kind: "skill_run_interaction_draft",
              payload: json({
                batch: next,
                mutationId: payload.mutationId,
                fingerprint,
                revision,
              }),
            },
          ];
          if (action !== "draft") {
            inputs.push({
              entryId: `interaction-resolved-${batch.batchId}`,
              kind: "interaction_resolved",
              payload: json({ id: batch.batchId, batch: next }),
            });
            for (const call of batch.calls) {
              const result = {
                schema: ASK_USER_RESULT_SCHEMA,
                toolCallId: call.toolCallId,
                outcome: action === "decline" ? "declined" : "answered",
                answers:
                  action === "decline"
                    ? []
                    : call.questionIds.map((questionId) => ({
                        questionId,
                        answer: next.draftAnswers[questionId] || {
                          kind: "unanswered",
                          reason: "optional",
                        },
                      })),
              };
              inputs.push({
                entryId: `result-${call.toolCallId}`,
                kind: "tool_result",
                turnId: batch.turnId,
                payload: json({
                  callId: call.toolCallId,
                  name: "ask_user",
                  text: JSON.stringify(result),
                  status: "completed",
                  effectCertainty: "not_applicable",
                }),
              });
            }
            inputs.push({
              entryId: id("continue-ready"),
              kind: "skill_run_status",
              payload: { status: "suspended" },
            });
            resume = true;
          }
          committedBatch = next;
          return inputs;
        },
        options.root,
      );
      state.interactionBatch = committedBatch;
      state.draftReceipts[payload.mutationId] = { fingerprint, revision };
      emit(
        requestId,
        resume
          ? ["resources", "control", "navigation", "transcript"]
          : ["resources"],
      );
      if (resume) {
        state.status = "suspended";
        void start(state).catch(() => {});
      }
      return { revision, mutationId: payload.mutationId };
    });
  }
  async function submitFiles(
    requestId: string,
    payload: {
      batchId: string;
      questionId: string;
      slotId?: string;
      baseRevision: number;
      mutationId: string;
    },
    sources: readonly PiConversationUserFileSource[],
  ) {
    if (
      !payload ||
      typeof payload.mutationId !== "string" ||
      !payload.mutationId.trim() ||
      payload.mutationId.length > 512 ||
      typeof payload.batchId !== "string" ||
      typeof payload.questionId !== "string" ||
      !Number.isSafeInteger(payload.baseRevision)
    )
      throw new Error("interaction_payload_invalid");
    const mutationEntryId = `interaction-mutation-${(await digest(payload.mutationId)).slice(7)}`;
    return serialize(requestId, async () => {
      const state = await loadPaused(requestId, "waiting_user");
      const fingerprint = await digest({ action: "files", payload, sources });
      let revision = 0;
      let committedBatch: UserInteractionBatchV1 | undefined;
      await commitPiOwnerFacts(
        ref(requestId),
        async (entries) => {
          const fresh = fold(requestId, entries);
          const previous = fresh.draftReceipts[payload.mutationId];
          if (previous) {
            if (previous.fingerprint !== fingerprint)
              throw new Error("interaction_mutation_conflict");
            revision = previous.revision;
            committedBatch = fresh.interactionBatch;
            return [];
          }
          const batch = fresh.interactionBatch;
          const question = batch?.questions.find(
            (item) => item.questionId === payload.questionId,
          );
          if (
            !batch ||
            batch.batchId !== payload.batchId ||
            batch.status !== "collecting" ||
            batch.revision !== payload.baseRevision ||
            fresh.status !== "waiting_user" ||
            question?.kind !== "files"
          ) {
            state.interactionBatch = batch;
            state.status = fresh.status;
            emit(requestId, ["resources", "control"]);
            throw new Error("interaction_revision_stale");
          }
          const slot =
            question.files.find((item) => item.slotId === payload.slotId) ||
            (question.files.length === 1 ? question.files[0] : undefined);
          if (!slot) throw new Error("interaction_file_slot_missing");
          const prior = batch.draftAnswers[question.questionId];
          const slots =
            prior?.kind === "files"
              ? prior.slots.filter((item) => item.slotId !== slot.slotId)
              : [];
          const retained = {
            ...batch.draftAnswers,
            [question.questionId]: { kind: "files" as const, slots },
          };
          const existing = collectUserInteractionFileRefs(retained);
          const native = await nativeWorkspace(state);
          const snapshots = await native.snapshotUserFiles(sources, {
            maxResources: 20 - existing.length,
            maxTotalBytes:
              50 * 1024 * 1024 -
              existing.reduce((size, file) => size + (file.byteLength || 0), 0),
          });
          const files = snapshots.map((snapshot) => ({
            refId: snapshot.ref,
            name: snapshot.displayName,
            mediaType: null,
            byteLength: snapshot.size,
          }));
          const next = {
            ...batch,
            revision: batch.revision + 1,
            draftAnswers: {
              ...retained,
              [question.questionId]: {
                kind: "files" as const,
                slots: [...slots, { slotId: slot.slotId, files }],
              },
            },
          };
          if (!parseUserInteractionBatchV1(next))
            throw new Error("interaction_file_invalid");
          revision = next.revision;
          committedBatch = next;
          return [
            {
              entryId: mutationEntryId,
              kind: "skill_run_interaction_draft",
              payload: json({
                batch: next,
                mutationId: payload.mutationId,
                fingerprint,
                revision,
              }),
            },
          ];
        },
        options.root,
      );
      state.interactionBatch = committedBatch;
      emit(requestId, ["resources"]);
      return { revision, mutationId: payload.mutationId };
    });
  }
  async function resolvePermission(
    requestId: string,
    callId: string,
    decision: "approve" | "deny",
  ) {
    return serialize(requestId, async () => {
      const state = await loadPaused(requestId, "waiting_permission");
      if (state.status !== "waiting_permission" || state.active)
        throw new Error("pi_permission_not_pending");
      const pending = state.pending.find((item) => item.call.callId === callId);
      if (!pending) throw new Error("pi_permission_not_pending");
      const Controller = resolveNativeAbortControllerConstructor();
      if (!Controller) throw new Error("pi_signal_unavailable");
      const turnId = id("permission-turn");
      const guard = createPiRuntimeLoopGuard({
        state: state.guard,
        persist: (value) =>
          fact(requestId, "skill_run_guard", value, turnId).then(() => {}),
      });
      const tools = await gateway(
        state,
        turnId,
        [
          ...(await definitions(state)),
          await resultDefinition(state),
          ...(state.mode === "interactive" ? [askDefinition] : []),
        ],
        new Controller().signal,
        async (attempts) => {
          if (!guard.allowsToolBatch(attempts))
            throw new PiRuntimeToolAttemptLimitError();
          await guard.commitToolAttempts(attempts);
        },
      );
      let continued: Awaited<ReturnType<PiGatewayTurn["continueCall"]>>;
      try {
        continued = await tools.continueCall(pending, decision);
      } catch (error) {
        await recordRefusedCleanup(state, error, turnId);
        if (error instanceof PiRuntimeToolAttemptLimitError)
          return sealOutcome(state, failureResult(state, error.code));
        throw error;
      }
      state.pending = state.pending.filter((item) => item !== pending);
      if (continued.pending) {
        state.pending.push(continued.pending);
        emit(requestId, ["permission", "control", "resources"]);
        return deferred(state);
      }
      await fact(
        requestId,
        "permission_resolved",
        { id: callId, decision },
        turnId,
      );
      // The decision is durable, so its structural evidence can be recorded.
      // Only the decision itself is kept; the reviewed arguments are not.
      recordPiRuntimeAudit({
        operation:
          decision === "approve"
            ? "interaction.continued"
            : "interaction.declined",
        origin: "skill_run",
        owner: ref(requestId),
        ...(options.root ? { root: options.root } : {}),
        ...(state.workspace
          ? { workspaceDir: state.workspace.workspaceDir }
          : {}),
        correlation: { ...(turnId ? { turnId } : {}), callId },
        attributes: { kind: decision },
      });
      await recordResult(state, toolResult(continued.result), turnId);
      if (continued.result.effectCertainty === "unknown") {
        await setStatus(state, "recovery_required", "tool_effect_unknown");
        return deferred(state);
      }
      if (state.pending.length) {
        emit(requestId, ["permission", "control", "resources"]);
        return deferred(state);
      }
      const inspection = await inspectPiOwner(ref(requestId), options.root);
      const assistant = [...inspection.entries]
        .reverse()
        .find(
          (entry) =>
            entry.kind === "message" &&
            (entry.payload as { role?: string }).role === "assistant",
        );
      const calls =
        (assistant?.payload as { toolCalls?: PiRuntimeToolCall[] })
          ?.toolCalls || [];
      const unanswered = calls.filter(
        (call) =>
          call.name === "ask_user" &&
          !inspection.entries.some(
            (entry) =>
              entry.kind === "tool_result" &&
              (entry.payload as { callId?: string }).callId === call.callId,
          ),
      );
      if (unanswered.length) {
        const inputs = unanswered.map((call) =>
          parseAskUserModelInputV1(call.arguments),
        );
        if (
          inputs.every(Boolean) &&
          inputs.reduce(
            (sum, input) => sum + (input?.questions.length || 0),
            0,
          ) <= 16
        ) {
          await createInteraction(state, unanswered);
          return deferred(state);
        }
        for (const call of unanswered)
          await recordResult(
            state,
            {
              callId: call.callId,
              name: call.name,
              text: JSON.stringify({ code: "ask_user_invalid" }),
              isError: true,
            },
            turnId,
          );
      }
      await setStatus(state, "suspended");
      void start(state).catch(() => {});
      return deferred(state);
    });
  }
  async function cancel(requestId: string) {
    const state = await load(requestId);
    return serialize(requestId, async () => {
      await commitPiOwnerFacts(
        ref(requestId),
        (entries) => {
          const fresh = fold(requestId, entries);
          if (fresh.outcome || fresh.sealed) {
            state.sealed = fresh.sealed;
            state.outcome = fresh.outcome;
            return [];
          }
          state.status = "canceled";
          const inputs: PiTranscriptInput[] = [
            {
              entryId: "run-canceled",
              kind: "skill_run_status",
              payload: { status: "canceled" },
            },
          ];
          if (fresh.interactionBatch?.status === "collecting") {
            state.interactionBatch = {
              ...fresh.interactionBatch,
              status: "canceled",
              draftAnswers: {},
            };
            inputs.push({
              entryId: `interaction-resolved-${fresh.interactionBatch.batchId}`,
              kind: "interaction_resolved",
              payload: json({
                id: fresh.interactionBatch.batchId,
                batch: state.interactionBatch,
              }),
            });
          }
          return inputs;
        },
        options.root,
      );
      state.abort?.();
      if (state.outcome) return state.outcome;
      if (state.sealed) return finalize(state);
      return sealOutcome(state, {
        status: "canceled",
        requestId,
        fetchType: "result",
        responseJson: buildSkillRunResponseEnvelope({
          status: "canceled",
          requestId,
          backend: { id: "builtin-pi", type: "builtin-pi" },
          skillId: state.skillId,
        }),
      });
    });
  }
  /**
   * One explicit evidence pass: observe the authoritative Broker, then
   * reassess the owner from canonical facts. It never dispatches, so it can
   * clear a hold or leave it, but it can never replay the work behind it.
   */
  async function checkRecoveryEvidence(state: State) {
    // Repair first: a torn tail otherwise makes the observation pass throw and
    // the owner never reaches an assessment at all.
    await repairPiOwnerTornTail(ref(state.requestId), options.root).catch(
      () => undefined,
    );
    await reconcilePiOwnerOperationEvidence(
      ref(state.requestId),
      options.root,
      {
        observeOperation:
          options.observeOperation ?? defaultPiOperationObserver(),
      },
    );
    return assessPiOwnerRecovery(ref(state.requestId), options.root, {
      isPhysicallyOccupied: (target) => lifecycle.hasPhysicalHold(target),
    });
  }

  async function recover(requestId: string) {
    const state = await load(requestId);
    if (state.active) return state;
    if (state.outcome) return state;
    // An explicit check observes the Broker even for an owner whose prepared
    // snapshot is gone: clearing a late outcome hold is what makes its files
    // safe to clean up, and that never depends on resuming execution.
    if (!state.prepared) {
      await checkRecoveryEvidence(state);
      if (!state.prepared)
        await setStatus(
          state,
          "recovery_required",
          "prepared_snapshot_unavailable",
        );
      return state;
    }
    if (state.sealed) {
      if (!state.prepared) {
        await setStatus(
          state,
          "recovery_required",
          "prepared_snapshot_unavailable",
        );
        return state;
      }
      await finalize(state);
      return state;
    }
    // Persistence owns the single definition of unsafe: unresolved
    // invocations, unknown effects, static receipt holds and physical
    // occupancy. An explicit check first observes the Broker, so a late
    // authoritative outcome can clear its hold here.
    const assessment = await checkRecoveryEvidence(state);
    if (assessment.hasHolds)
      await setStatus(state, "recovery_required", "skill_run_recovery_unsafe");
    else if (
      !["waiting_user", "waiting_permission", "suspended"].includes(
        state.status,
      )
    )
      await setStatus(state, "suspended");
    state.canContinueRecovery = !!(await recoveryContinuation(state));
    emit(requestId, ["presentation", "control", "details"]);
    return state;
  }
  /**
   * A damaged owner cannot be folded, so its reservation is recovered from the
   * canonical facts and the rebuildable registry scalar alone. When neither can
   * identify the occupied slot, the owner is not reconstructible and the caller
   * keeps the admission barrier closed.
   */
  async function restoreUnreadableReservation(
    owner: PiOwnerRef,
    target: typeof workflowSubmissionQueue,
  ): Promise<boolean> {
    // The registry projection is the accounting source: it is rebuilt from the
    // committed reservation tuple, so a damaged transcript does not make the
    // occupied slot unaccountable. A valid log still wins, because it is the
    // canonical fact.
    const entries = await inspectPiOwner(owner, options.root).catch(() => null);
    const fromLog =
      entries?.status === "valid"
        ? (entries.entries.find(
            (entry) => entry.kind === "skill_run_reservation",
          )?.payload as PiWorkflowReservation | undefined)
        : undefined;
    const reservation =
      fromLog ??
      (getPiSkillRunReservation(
        owner.ownerId,
      ) as PiWorkflowReservation | null) ??
      undefined;
    if (!reservation?.submissionUnitId) return false;
    try {
      restoredSlots.set(
        reservation.submissionUnitId,
        target.restoreReservation(
          Object.freeze({ ...reservation, ownerId: owner.ownerId }),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Startup reservation pass. Every durable reservation is adopted under its
   * original submission and unit identity before new Skill Run admission opens.
   * A false result means global accounting could not be trusted, so admission
   * stays closed; one damaged owner never blocks the others.
   */
  async function restoreReservations(
    overrides: { root?: string; queue?: typeof workflowSubmissionQueue } = {},
  ): Promise<boolean> {
    const target = overrides.queue ?? queue;
    const root = overrides.root ?? options.root;
    target.setPiAdmissionBarrier(true);
    let trustworthy = true;
    for (const owner of await listPiOwnerInventory(root)) {
      // A closing process must not reopen owner state after an await.
      if (lifecycle.closed) break;
      if (owner.kind !== "skill_run") continue;
      let state: State;
      try {
        // A torn tail is repaired before the owner is read, so an interrupted
        // final record never makes a recoverable run unrecoverable.
        await repairPiOwnerTornTail(owner, root).catch(() => undefined);
        state = await load(owner.ownerId);
      } catch {
        // A damaged owner is isolated, but only when its reservation is still
        // reconstructible. Otherwise its slot is unaccounted for, and a new
        // submission could take it.
        if (!(await restoreUnreadableReservation(owner, target)))
          trustworthy = false;
        continue;
      }
      if (!state.reservation) {
        // Work that was admitted but never bound a slot, or lost its
        // reservation fact, is exactly the accounting gap this barrier exists
        // to catch.
        // A terminal run never held a slot, and work that never dispatched is
        // still only queued. Only real dispatched work without a reservation
        // is the accounting gap this barrier exists to catch.
        if (state.status !== "queued" && !state.outcome) trustworthy = false;
        continue;
      }
      // Adopting twice is idempotent: the queue returns the existing slot.
      try {
        restoredSlots.set(
          state.reservation.submissionUnitId,
          target.restoreReservation(state.reservation),
        );
      } catch {
        trustworthy = false;
      }
      // A large owner set must not block the startup path.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    if (trustworthy) {
      target.setPiAdmissionBarrier(false);
      lifecycle.setSkillAdmissionOpen(true);
    } else {
      // Global accounting is unproven, so no new Skill Run is admitted. The
      // reservations that were restored stay accounted for either way.
      lifecycle.setSkillAdmissionOpen(false);
    }
    return trustworthy;
  }

  /**
   * Startup recovery. Each owner is observed once against authoritative Broker
   * evidence and reassessed from canonical facts. Only a previously running
   * owner with a verified safe checkpoint continues, and it continues on the
   * background lane without blocking startup on its execution.
   */
  async function setTaskRestartConsent(requestId: string, enabled: boolean) {
    const state = await load(requestId);
    let binding: State["restartConsent"];
    if (enabled) {
      const prepared = state.prepared;
      const taskSelection: PiSelection | undefined =
        state.selection ??
        (state.model
          ? {
              configurationId: state.model.configurationId,
              modelId: state.model.modelId,
              reasoning: state.model.reasoning,
            }
          : state.restoredSelection
            ? {
                configurationId: state.restoredSelection.configurationId,
                modelId: state.restoredSelection.modelId,
                reasoning: state.restoredSelection.reasoning,
              }
            : undefined);
      if (!prepared?.provenance.snapshotDigest || !taskSelection)
        throw new Error("pi_skill_run_restart_consent_unavailable");
      let model: PiModelSelectionSnapshot;
      try {
        model = options.resolveModel
          ? await options.resolveModel(taskSelection)
          : resolvePiModelSelection({
              kind: "skillRun",
              explicit: taskSelection,
              catalog: await loadPiModelCatalog(),
              credentials: listPiCredentials(),
            });
      } catch {
        throw new Error("pi_skill_run_restart_consent_unavailable");
      }
      const credentialRef = model.credentialRef;
      const identityRevision = credentialRef
        ? getPiCredentialIdentityRevision(credentialRef, "model-provider")
        : null;
      const registrations = listPiChatGPTRegistrations();
      if (
        model.authVariant !== "chatgpt" ||
        !credentialRef ||
        !identityRevision ||
        !registrations.some(
          (registration) =>
            registration.id === credentialRef && registration.signedIn,
        )
      )
        throw new Error("pi_skill_run_restart_consent_unavailable");
      binding = {
        taskScope: prepared.provenance.snapshotDigest,
        credentialRef,
        identityRevision,
      };
    }
    await commitPiOwnerFacts(
      ref(requestId),
      (entries) => {
        const fresh = fold(requestId, entries);
        if (
          enabled &&
          (!binding ||
            fresh.prepared?.provenance.snapshotDigest !== binding.taskScope ||
            getPiCredentialIdentityRevision(
              binding.credentialRef,
              "model-provider",
            ) !== binding.identityRevision)
        )
          throw new Error("pi_skill_run_restart_consent_changed");
        return [
          {
            entryId: id("restart-consent"),
            kind: "skill_run_restart_consent",
            payload: enabled
              ? { enabled: true, ...binding! }
              : { enabled: false },
          },
        ];
      },
      options.root,
    );
    states.set(requestId, await load(requestId));
    emit(requestId, ["details"]);
  }

  async function startupRestartConsentAllows(
    state: State,
    model: PiModelSelectionSnapshot,
  ): Promise<boolean> {
    const consent = state.restartConsent;
    if (!consent || !state.prepared) return false;
    if (
      model.authVariant !== "chatgpt" ||
      model.credentialRef !== consent.credentialRef ||
      state.prepared.provenance.snapshotDigest !== consent.taskScope ||
      getPiCredentialIdentityRevision(
        consent.credentialRef,
        "model-provider",
      ) !== consent.identityRevision
    )
      return false;
    const registration = listPiChatGPTRegistrations().find(
      (item) => item.id === consent.credentialRef && item.signedIn,
    );
    if (!registration) return false;
    const Controller = resolveNativeAbortControllerConstructor();
    if (!Controller) return false;
    try {
      await assertPiChatGPTInferenceAllowed(
        consent.credentialRef,
        new Controller().signal,
        undefined,
        consent.identityRevision,
      );
      return true;
    } catch {
      return false;
    }
  }

  async function reconcile(
    overrides: {
      root?: string;
      observeOperation?: PiOwnerOperationObserver;
    } = {},
  ): Promise<{ continued: number; holds: number; retained: number }> {
    const root = overrides.root ?? options.root;
    const observe = overrides.observeOperation ?? options.observeOperation;
    const summary = { continued: 0, holds: 0, retained: 0 };
    for (const owner of await listPiOwnerInventory(root)) {
      if (owner.kind !== "skill_run") continue;
      let state: State;
      try {
        state = await load(owner.ownerId);
      } catch {
        summary.holds++;
        continue;
      }
      if (lifecycle.closed) break;
      // A finalized run is not finished until the Workflow applied it, so an
      // outcome alone must not skip the owner here. Only live work is skipped.
      if (state.active) continue;
      // A deleting owner is finished with execution; only its cleanup retry
      // remains, and that never dispatches.
      if (state.deleting) {
        summary.retained++;
        continue;
      }
      if (
        ["waiting_user", "waiting_permission", "suspended"].includes(
          state.status,
        )
      ) {
        // Waiting and suspended owners keep their durable state unchanged.
        summary.retained++;
        continue;
      }
      try {
        if (state.status === "running") {
          const beforeObservation = await assessPiOwnerRecovery(
            ref(state.requestId),
            root,
            {
              isPhysicallyOccupied: (target) =>
                lifecycle.hasPhysicalHold(target),
            },
          );
          if (beforeObservation.unresolvedOperations.length) {
            // Commit before observing: even a crash after evidence publication
            // must not turn unknown resolution into automatic continuation.
            await setStatus(
              state,
              "recovery_required",
              "skill_run_recovery_hold",
            );
          }
        }
        await reconcilePiOwnerOperationEvidence(ref(state.requestId), root, {
          observeOperation: observe ?? defaultPiOperationObserver(),
        });
        const assessment = await assessPiOwnerRecovery(
          ref(state.requestId),
          root,
          {
            isPhysicallyOccupied: (target) => lifecycle.hasPhysicalHold(target),
          },
        );
        // A sealed result is finished through its existing idempotent finalizer.
        // Its own receipt and ack hold is expected, so it is settled before the
        // remaining holds are judged.
        if (state.sealed && !state.outcome) {
          await finalize(state);
        }
        if (state.outcome && state.applyReceipt && state.terminalAck) {
          await releaseRestoredSlot(state);
          summary.retained++;
          continue;
        }
        if (state.outcome && state.applyReceipt && state.applyInputs) {
          await reattachWorkflowApply(state);
          summary.retained++;
          continue;
        }
        // A finalized result is not complete until the Workflow applied it. The
        // apply seam runs on an in-memory run state a restart cannot rebuild,
        // so the owner can only reattach through the existing Workflow slot
        // coordinator. Without a restored reservation and captured apply
        // inputs the apply input is unavailable: that is a hold, never a
        // second finalizer and never a replay.
        if (state.outcome && !state.applyReceipt) {
          if (!state.reservation || !state.applyInputs) {
            summary.holds++;
            if (state.status !== "recovery_required")
              await setStatus(
                state,
                "recovery_required",
                "skill_run_apply_input_unavailable",
              );
            continue;
          }
          const slot = restoredSlots.get(state.reservation.submissionUnitId);
          if (!slot || !(await slot.ensureSlot("host-apply"))) {
            summary.holds++;
            await setStatus(
              state,
              "recovery_required",
              "skill_run_apply_slot_unavailable",
            );
            continue;
          }
          await reattachWorkflowApply(state);
          summary.retained++;
          continue;
        }
        if (assessment.hasHolds) {
          summary.holds++;
          if (state.status !== "recovery_required")
            await setStatus(
              state,
              "recovery_required",
              "skill_run_recovery_hold",
            );
          continue;
        }
        if (state.status !== "running" || !state.prepared) {
          summary.retained++;
          continue;
        }
        if (!assessment.safeToResume) {
          summary.holds++;
          await setStatus(
            state,
            "recovery_required",
            "skill_run_checkpoint_missing",
          );
          continue;
        }
        // A continuation occupies a Workflow slot, so it may only run when its
        // original reservation was actually restored. Without one, the resumed
        // work would dispatch outside the queue's admission and could double
        // the unit's capacity.
        if (
          !state.reservation ||
          !restoredSlots.has(state.reservation.submissionUnitId)
        ) {
          summary.holds++;
          await setStatus(
            state,
            "recovery_required",
            "skill_run_reservation_unavailable",
          );
          continue;
        }
        if (lifecycle.closed) break;
        const restartModel = options.resolveModel
          ? await options.resolveModel(state.selection)
          : resolvePiModelSelection({
              kind: "skillRun",
              ownerSelection: state.selection,
              catalog: await loadPiModelCatalog(),
              credentials: listPiCredentials(),
            });
        if (
          restartModel.authVariant === "chatgpt" &&
          !(await startupRestartConsentAllows(state, restartModel))
        ) {
          await setStatus(
            state,
            "suspended",
            "skill_run_restart_consent_required",
          );
          state.canContinueRecovery = !!(await recoveryContinuation(state));
          summary.retained++;
          continue;
        }
        // Safe continuation: the same request identity, its recorded
        // remaining budget and the restored reservation. Startup never waits
        // for it, so a long run does not delay the process.
        state.status = "suspended";
        void start(
          state,
          undefined,
          true,
          restartModel.authVariant === "chatgpt"
            ? state.restartConsent
            : undefined,
        ).catch(() => undefined);
        summary.continued++;
      } catch {
        summary.holds++;
      }
    }
    return summary;
  }

  /**
   * Explicit deletion. The owner is marked first and its files are retained
   * while an execution, recovery or receipt hold remains, so a retry later can
   * still finish the removal.
   */
  async function deleteRun(requestId: string) {
    const state = await load(requestId).catch(() => undefined);
    if (!state) throw new Error("pi_skill_run_recovery_required");
    state.abort?.();
    leases.get(requestId)?.release();
    leases.delete(requestId);
    await markPiSkillRunDeleting(requestId, options.root);
    const result = await cleanupPiSkillRun(ref(requestId), options.root, {
      isPhysicallyOccupied: (target) => lifecycle.hasPhysicalHold(target),
    });
    // Only a proven removal drops the in-memory owner; a pending cleanup keeps
    // its state, files and navigation selection so a retry can still finish.
    if (result.status === "deleted") {
      states.delete(requestId);
      if (selectedId === requestId) selectedId = null;
      emit(requestId, ["navigation", "control"]);
    }
    return result;
  }

  async function claimApply(requestId: string) {
    const state = await load(requestId);
    let status: "claimed" | "terminal" | "recovery_required" =
      "recovery_required";
    const applyKey = `pi-skill-apply:${requestId}`;
    await commitPiOwnerFacts(
      ref(requestId),
      (entries) => {
        const fresh = fold(requestId, entries);
        if (!fresh.outcome) throw new Error("pi_provider_outcome_unsealed");
        if (fresh.applyReceipt) {
          state.applyReceipt = fresh.applyReceipt;
          status =
            fresh.applyReceipt.status === "claimed"
              ? "recovery_required"
              : "terminal";
          return [];
        }
        const receipt: ApplyReceipt = {
          applyKey,
          status: fresh.outcome.status === "succeeded" ? "claimed" : "skipped",
        };
        state.applyReceipt = receipt;
        status = receipt.status === "claimed" ? "claimed" : "terminal";
        return [
          {
            entryId: "apply-claim",
            kind: "skill_run_apply_receipt",
            payload: json(receipt),
          },
        ];
      },
      options.root,
    );
    publishProjection(state);
    return { status, applyKey, receipt: state.applyReceipt };
  }
  async function recordApplyReceipt(
    requestId: string,
    receipt: { status: "succeeded" | "failed" | "skipped"; code?: string },
  ) {
    const state = await load(requestId);
    await commitPiOwnerFacts(
      ref(requestId),
      (entries) => {
        const fresh = fold(requestId, entries);
        if (!fresh.applyReceipt) throw new Error("pi_apply_not_claimed");
        if (fresh.applyReceipt.status !== "claimed") {
          state.applyReceipt = fresh.applyReceipt;
          return [];
        }
        state.applyReceipt = {
          applyKey: fresh.applyReceipt.applyKey,
          ...receipt,
        };
        return [
          {
            entryId: "apply-terminal",
            kind: "skill_run_apply_receipt",
            payload: json(state.applyReceipt),
          },
        ];
      },
      options.root,
    );
    publishProjection(state);
  }
  /**
   * Reattaches the existing Workflow apply/ack owners for a finalized run.
   * It reuses the same claim, receipt and ack identities the live path uses,
   * so both are idempotent: a run that was already applied is a no-op, and a
   * run whose apply is still claimed stays a hold instead of being re-applied.
   */
  async function reattachWorkflowApply(state: State) {
    const inputs = state.applyInputs!;
    const outcome = state.outcome!;
    const ackId = [inputs.workflowRunId, inputs.jobId]
      .filter(Boolean)
      .join(":");
    // Read the committed receipt first. Claiming here would manufacture a
    // claimed effect for apply work that was never attempted, so an existing
    // receipt is only ever completed, never re-issued.
    if (state.applyReceipt) {
      if (state.applyReceipt.status === "claimed") {
        // The effect is unconfirmed. Nothing in this owner can prove it, so the
        // run holds and no second claim is ever created.
        await setStatus(state, "recovery_required", "skill_run_apply_claimed");
        return;
      }
      if (!state.terminalAck) await acknowledgeTerminal(state.requestId, ackId);
      await releaseRestoredSlot(state);
      return;
    }
    if (outcome.status !== "succeeded") {
      // A non-succeeded run has no apply effect to prove, so the existing
      // claim/receipt/ack owners complete it idempotently.
      await claimApply(state.requestId);
      await recordApplyReceipt(state.requestId, { status: "skipped" });
      await acknowledgeTerminal(state.requestId, ackId);
      await releaseRestoredSlot(state);
      return;
    }
    // A succeeded run whose apply was never executed cannot be reattached from
    // the owner alone: the Workflow apply payload lives in an in-memory run
    // state a restart cannot rebuild, and the captured admission scalars do
    // not prove it. The approved contract makes missing apply input a hold, so
    // the run waits for the Workflow's own apply path instead of claiming a
    // success this owner cannot verify.
    await setStatus(
      state,
      "recovery_required",
      "skill_run_apply_input_unavailable",
    );
  }
  /**
   * A recovered run keeps its original slot until the whole chain settled:
   * outcome, apply receipt and terminal ack. An unresolved or unknown effect
   * keeps the reservation, because a restart may still need to reattach it.
   */
  async function releaseRestoredSlot(state: State) {
    if (!state.reservation || !state.terminalAck || !state.applyReceipt) return;
    if (state.applyReceipt.status === "claimed") return;
    if (leases.get(state.requestId)) return;
    const assessment = await assessPiOwnerRecovery(
      ref(state.requestId),
      options.root,
      { isPhysicallyOccupied: (target) => lifecycle.hasPhysicalHold(target) },
    ).catch(() => ({ hasHolds: true }) as { hasHolds: boolean });
    if (assessment.hasHolds) return;
    const unitId = state.reservation.submissionUnitId;
    if (queue.releaseRecoveredReservation(unitId)) restoredSlots.delete(unitId);
  }

  async function acknowledgeTerminal(requestId: string, ackId: string) {
    const state = await load(requestId);
    await commitPiOwnerFacts(
      ref(requestId),
      (entries) => {
        const fresh = fold(requestId, entries);
        if (
          !fresh.outcome ||
          !fresh.applyReceipt ||
          fresh.applyReceipt.status === "claimed"
        )
          throw new Error("pi_terminal_ack_not_ready");
        if (fresh.terminalAck) {
          state.terminalAck = fresh.terminalAck;
          return [];
        }
        state.terminalAck = ackId;
        return [
          {
            entryId: "terminal-ack",
            kind: "skill_run_terminal_ack",
            payload: { ackId },
          },
        ];
      },
      options.root,
    );
    await releaseRestoredSlot(state);
  }
  async function recoveryContinuation(state: State) {
    if (
      state.active ||
      state.deleting ||
      state.sealed ||
      state.outcome ||
      !state.prepared ||
      !["suspended", "recovery_required"].includes(state.status)
    )
      return null;
    const reservation =
      state.reservation &&
      queue.getReservation(state.reservation.submissionUnitId);
    if (!reservation || reservation.ownerId !== state.requestId) return null;
    const assessment = await assessPiOwnerRecovery(
      ref(state.requestId),
      options.root,
      {
        isPhysicallyOccupied: (owner) => lifecycle.hasPhysicalHold(owner),
      },
    );
    return !assessment.hasHolds &&
      assessment.safeToResume &&
      assessment.checkpoint?.resumeEligible &&
      assessment.checkpoint.remainingMs > 0
      ? assessment.checkpoint
      : null;
  }

  async function continueRecovery(requestId: string) {
    const state = await load(requestId);
    const checkpoint = await recoveryContinuation(state);
    if (!checkpoint) throw new Error("pi_skill_run_recovery_unavailable");
    state.checkpoint = checkpoint;
    if (state.status === "recovery_required")
      await setStatus(state, "suspended");
    return start(state);
  }

  async function readModel(requestId: string) {
    const state = await load(requestId);
    return {
      requestId,
      taskName: state.taskName,
      skillId: state.skillId,
      mode: state.mode,
      status: state.status,
      archived: state.archived,
      updatedAt: state.updatedAt,
      turnId: state.turnId,
      revision: state.revision,
      counts: state.counts,
      model: state.model ?? state.restoredSelection,
      usage: state.usage,
      pending: state.pending,
      interactionBatch: state.interactionBatch,
      failure: state.failure,
      prepared: state.prepared,
      outcome: state.outcome,
      applyReceipt: state.applyReceipt,
      terminalAck: state.terminalAck,
      canContinueRecovery:
        !!state.canContinueRecovery &&
        ["suspended", "recovery_required"].includes(state.status),
      restartConsentEnabled: !!state.restartConsent,
    };
  }
  async function list() {
    const owners = new Map(
      listPiSkillRunRegistry().map((row) => [row.requestId, row]),
    );
    for (const state of states.values())
      owners.set(state.requestId, {
        ...state,
        entryCount: state.revision,
        lastSequence: state.revision,
      });
    return [...owners.values()]
      .filter((state) => !state.archived && state.skillId)
      .map((state) => ({
        requestId: state.requestId,
        taskName: state.taskName,
        skillId: state.skillId,
        status: state.status as PiSkillRunStatus,
        updatedAt: state.updatedAt,
        attention: [
          "waiting_user",
          "waiting_permission",
          "recovery_required",
        ].includes(state.status),
        recoveryActions:
          state.status === "recovery_required" ? ["cancel-run"] : [],
        canArchive: terminal(state.status),
        messageCount: state.counts.user + state.counts.assistant,
      }));
  }
  async function readPage(
    requestId: string,
    request: { cursor?: number | null; limit?: number } = {},
  ) {
    const limit = Math.min(80, Math.max(1, request.limit || 80));
    const page = await readPiVisibleTranscriptPage(
      ref(requestId),
      { ...(request.cursor == null ? {} : { cursor: request.cursor }), limit },
      options.root,
    );
    const items: AssistantWorkspaceTranscriptItem[] = [];
    for (const entry of page.entries) {
      const payload = entry.payload as Record<string, unknown>;
      const base = {
        itemId: entry.entryId,
        createdAt: entry.createdAt,
        updatedAt: null,
        revision: null,
      };
      if (entry.kind === "message")
        items.push({
          ...base,
          itemKind: "message",
          role: payload.role === "user" ? "user" : "assistant",
          text: String(payload.text),
          status:
            payload.status === "incomplete-visible" ? "error" : "complete",
        });
      else if (entry.kind === "tool_result")
        items.push({
          ...base,
          itemKind: "tool-call",
          title: String(payload.name),
          toolName: String(payload.name),
          toolKind: null,
          inputSummary: null,
          resultSummary: String(payload.text),
          summary: null,
          status: payload.status === "failed" ? "failed" : "completed",
          toolCallId: String(payload.callId),
        });
      else if (entry.kind === "thought")
        items.push({
          ...base,
          itemKind: "thought",
          text: String(payload.text),
          status: "complete",
        });
    }
    return {
      items,
      cursor: page.cursor,
      limit,
      total: page.totalVisible,
      previousCursor: page.cursor ? Math.max(0, page.cursor - limit) : null,
      nextCursor: page.nextCursor,
      sourceEventSeq: states.get(requestId)?.revision || 0,
    };
  }
  return {
    get selectedId() {
      return selectedId;
    },
    setLaunchFocus(handler: Options["launchFocus"]) {
      launchFocus = handler;
    },
    setLocalNetworkAuthorizer(handler: Options["authorizeLocalNetwork"]) {
      authorizeLocalNetwork = handler;
    },
    subscribe(listener: (change: PiSkillRunChange) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute,
    list,
    readModel,
    readPage,
    recover,
    continueRecovery,
    setTaskRestartConsent,
    restoreReservations,
    reconcile,
    deleteRun: deleteRun as (
      requestId: string,
    ) => Promise<PiSkillRunDeleteResult>,
    cancel,
    resolvePermission,
    submitFiles,
    claimApply,
    recordApplyReceipt,
    acknowledgeTerminal,
    readProviderProjection(
      requestId: string,
    ): PiSkillRunProviderProjection | undefined {
      const state = states.get(requestId);
      return state
        ? {
            requestId,
            status: state.status,
            error: state.failure,
            applyState: state.applyReceipt?.status || "pending",
            applyError: state.applyReceipt?.code,
          }
        : undefined;
    },
    async readProviderResult(requestId: string) {
      return (await load(requestId)).outcome || deferred(await load(requestId));
    },
    async select(requestId: string) {
      const state = await load(requestId);
      if (state.archived) throw new Error("pi_skill_run_archived");
      selectedId = requestId;
      emit(requestId, [
        "navigation",
        "control",
        "resources",
        "presentation",
        "permission",
        "counts",
      ]);
    },
    async archive(requestId: string) {
      const state = await load(requestId);
      if (!terminal(state.status)) throw new Error("pi_skill_run_not_terminal");
      await fact(requestId, "skill_run_archive", {
        archivedAt: new Date().toISOString(),
      });
      state.archived = true;
      if (selectedId === requestId) selectedId = null;
      emit(requestId, ["navigation", "control"]);
    },
    async interrupt(requestId: string) {
      const state = await load(requestId);
      if (state.status !== "running")
        throw new Error("pi_skill_run_not_running");
      state.suspend?.();
      await setStatus(state, "suspended");
    },
    async reply(requestId: string, text: string) {
      const state = await loadPaused(requestId, "suspended");
      if (state.deleting) throw new Error("pi_skill_run_deleting");
      if (state.status !== "suspended" || !text.trim() || state.active)
        throw new Error("pi_skill_run_not_replyable");
      return start(state, text);
    },
    updateDraft: (
      requestId: string,
      payload: AssistantInteractionDraftPayloadV1,
    ) => interactionMutation(requestId, payload, "draft"),
    submitInteraction: (
      requestId: string,
      payload: AssistantInteractionSubmitPayloadV1,
    ) => interactionMutation(requestId, payload, "submit"),
    declineInteraction: (
      requestId: string,
      payload: AssistantInteractionDeclinePayloadV1,
    ) => interactionMutation(requestId, payload, "decline"),
    async setModel(requestId: string, selection: PiSelection) {
      const state = await load(requestId);
      if (
        !["suspended", "waiting_user", "waiting_permission"].includes(
          state.status,
        ) ||
        state.active
      )
        throw new Error("pi_selection_frozen");
      await fact(requestId, "skill_run_selection", selection);
      state.selection = selection;
      emit(requestId, ["resources", "presentation"]);
    },
    async setReasoning(requestId: string, reasoning: PiReasoningLevel) {
      const state = await load(requestId);
      if (
        !["suspended", "waiting_user", "waiting_permission"].includes(
          state.status,
        ) ||
        state.active
      )
        throw new Error("pi_selection_frozen");
      const selection = {
        ...state.selection,
        configurationId:
          state.selection?.configurationId || state.model?.configurationId,
        reasoning,
      } as PiSelection;
      await fact(requestId, "skill_run_selection", selection);
      state.selection = selection;
      emit(requestId, ["resources"]);
    },
    async dispose() {
      disposed = true;
      for (const state of states.values()) state.abort?.();
      // Release every lease without writing a new fact: a closing process
      // records no budget checkpoint, so nothing here can be mistaken for a
      // safe continuation by a later restart.
      for (const [requestId, lease] of leases) {
        leases.delete(requestId);
        lease.release();
      }
      for (const [unitId] of restoredSlots)
        queue.releaseRecoveredReservation(unitId);
      restoredSlots.clear();
      await Promise.allSettled(
        [...states.values()].map((state) => state.active),
      );
      // Dispose is the production close boundary. Settle each owner's queued
      // evidence before the owner can be released or removed, so a pending
      // write can never race a directory removal. Best effort: the audit queue
      // retains its own bounded gap, and this never fails a shutdown.
      await Promise.allSettled(
        [...states.keys()].map((requestId) =>
          flushPiRuntimeAuditOwner(ref(requestId), options.root),
        ),
      );
      // A flush only settles records already admitted to the queue. Records
      // still waiting on owner resolution would land afterwards and recreate
      // the tree, so stop the owner before the second, confirming flush.
      await Promise.allSettled(
        [...states.keys()].map((requestId) =>
          discardPiRuntimeAuditOwner(ref(requestId), options.root),
        ),
      );
      listeners.clear();
    },
  };
}
let singleton: ReturnType<typeof createPiSkillRunCoordinator> | undefined;
/** A closed process never reopens: the getter refuses until a test resets it. */
let stopped = false;
export function getPiSkillRunCoordinator() {
  if (stopped) throw new Error("pi_skill_run_shutdown");
  return (singleton ||= createPiSkillRunCoordinator());
}
export const claimPiSkillRunApply = (requestId: string) =>
  getPiSkillRunCoordinator().claimApply(requestId);
export const readPiSkillRunProviderResult = (requestId: string) =>
  getPiSkillRunCoordinator().readProviderResult(requestId);
export const recordPiSkillRunApplyReceipt = (
  requestId: string,
  receipt: { status: "succeeded" | "failed" | "skipped"; code?: string },
) => getPiSkillRunCoordinator().recordApplyReceipt(requestId, receipt);
export const acknowledgePiSkillRunTerminal = (
  requestId: string,
  ackId: string,
) => getPiSkillRunCoordinator().acknowledgeTerminal(requestId, ackId);
export const getPiSkillRunProviderProjection = (requestId: string) =>
  getPiSkillRunCoordinator().readProviderProjection(requestId);
export const subscribePiSkillRunChanges = (
  listener: (change: PiSkillRunChange) => void,
) => getPiSkillRunCoordinator().subscribe(listener);

/**
 * Production evidence source. The Broker is only read here: an unavailable,
 * running or unknown observation leaves its hold exactly where it was.
 */
function defaultPiOperationObserver(): PiOwnerOperationObserver {
  return async (request) =>
    resolveZoteroHostCapabilityBroker().mutations.getOperation(
      { operationId: request.operationId },
      request.scope,
    );
}

/**
 * Startup reservation pass. New Skill Run admission stays closed until every
 * durable reservation is accounted for, so a recovered run and a new one can
 * never occupy the same Workflow slot.
 */
export async function restorePiSkillRunReservationsOnStartup(
  options: { root?: string; queue?: typeof workflowSubmissionQueue } = {},
): Promise<boolean> {
  return getPiSkillRunCoordinator().restoreReservations(
    Object.keys(options).length ? options : {},
  );
}

/**
 * Startup recovery. Conversations are never dispatched, and a safe Skill Run
 * continuation is queued on the background lane instead of awaited here.
 */
export async function reconcilePiSkillRunsOnStartup(
  options: { root?: string; observeOperation?: PiOwnerOperationObserver } = {},
): Promise<void> {
  await getPiSkillRunCoordinator().reconcile(options);
}

/**
 * One absolute deadline governs the wait. Expiry ends waiting, not truth: an
 * owner that ignores cancellation keeps its capacity claim and its files, and a
 * later callback can never reopen a disposed coordinator.
 */
export async function shutdownPiSkillRuns(
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

export function resetPiSkillRunShutdownForTests() {
  stopped = false;
}
