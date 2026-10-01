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
import {
  createPiOwner,
  appendPiOwnerFact,
  inspectPiOwner,
  commitPiOwnerFacts,
  readPiOwnerTranscriptSnapshot,
  createPiOwnerPreparationAdapter,
} from "./piOwnerPersistence";
import {
  piOwnerPaths,
  readPiVisibleTranscriptPage,
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
  type PiRuntimeToolCall,
  type PiRuntimeToolResult,
  type PiRuntimeLoopGuardState,
} from "./piRuntime";
import { loadPiModelCatalog } from "./piModelCatalog";
import { listPiCredentials } from "./piCredentialStore";
import { resolvePiModelSelection } from "./piProviderConfiguration";
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
  prepare?: (
    args: ProviderExecuteArgs & { requestId: string },
  ) => Promise<PreparedSkillRun>;
  resolveModel?: (selection?: PiSelection) => Promise<PiModelSelectionSnapshot>;
  execution?: (model: PiModelSelectionSnapshot) => Execution;
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
  selection?: PiSelection;
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

export function createPiSkillRunCoordinator(options: Options = {}) {
  const states = new Map<string, State>();
  const listeners = new Set<(change: PiSkillRunChange) => void>();
  const commands = new Map<string, Promise<unknown>>();
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
    if (state) state.updatedAt = result.entry.createdAt;
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
      updatedAt: entries.at(-1)?.createdAt || "",
      turnId: "",
      revision: entries.length,
      pending: [],
      guard: { invocations: 0, toolAttempts: 0, cycles: [] },
      counts: { user: 0, assistant: 0, tool: 0, thought: 0 },
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
        state.model = payload.model as PiModelSelectionSnapshot;
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
      else if (entry.kind === "permission_pending") {
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
    await fact(requestId, "skill_run_admitted", {
      skillRunPipelineVersion: "v1",
      skillId: request.skill_id,
      taskName: request.taskName || request.skill_id,
      mode: mode === "interactive" ? "interactive" : "auto",
      workflow: args.orchestrationContext || {},
      backendId: "builtin-pi",
    });
    const state = await load(requestId);
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
    return freezePiToolGatewayTurn({
      owner: ref(state.requestId),
      turnId,
      definitions: tools,
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
    signal: AbortSignal,
  ) {
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
          let text = "";
          const source = createPiProviderModelSource(input.model, {
            authorizeLocalNetwork: async (endpoint) =>
              endpoint === state.localEndpoint,
          });
          for await (const part of source({
            systemPrompt: input.prompt,
            messages: [
              {
                role: "user",
                text: JSON.stringify({
                  messages: input.summaryInput,
                  schemaVersion: 1,
                  inputDigest: input.inputDigest,
                  coveredEntryIds: input.coveredEntryIds,
                  retainedEntryIds: input.retainedEntryIds,
                }),
              },
            ],
            signal,
          })) {
            text += part;
            if (text.length > 256 * 1024)
              throw new Error("pi_summary_too_large");
          }
          return JSON.parse(text) as PiCompactionSummary;
        },
      },
    );
    if (prepared.status === "failed") throw new Error(prepared.failure.code);
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
  ): Promise<ProviderExecutionResult> {
    if (state.outcome) return state.outcome;
    if (state.active) throw new Error("pi_skill_run_busy");
    await commitPiOwnerFacts(
      ref(state.requestId),
      (entries) => {
        const fresh = fold(state.requestId, entries);
        if (
          fresh.outcome ||
          fresh.sealed ||
          !["queued", "suspended"].includes(fresh.status)
        )
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
      state.model = options.resolveModel
        ? await options.resolveModel(state.selection)
        : resolvePiModelSelection({
            kind: "skillRun",
            ownerSelection: state.selection,
            catalog: await loadPiModelCatalog(),
            credentials: listPiCredentials(),
          });
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
      const tools = await gateway(
        state,
        turnId,
        allDefinitions,
        controller.signal,
        (attempts) => reservation.reserve!(attempts),
      );
      const frozen = await frozenFacts(state, tools.catalog);
      if (state.outcome) return state.outcome;
      if (controller.signal.aborted || state.status === "suspended")
        return deferred(state);
      await fact(
        state.requestId,
        "turn_started",
        {
          turnId,
          preparedDigest: state.prepared!.provenance.snapshotDigest,
          model: state.model,
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
            return await runBatch(state, tools, batch.calls);
          } catch (error) {
            await recordRefusedCleanup(state, error, turnId);
            throw error;
          }
        },
        async onEvent(event) {
          if (event.kind === "invocation_started")
            await fact(
              state.requestId,
              "model_invocation_started",
              { invocationId: event.invocationId },
              turnId,
            );
          else if (event.kind === "invocation_terminal")
            await fact(
              state.requestId,
              "model_invocation_terminal",
              {
                invocationId: event.invocationId,
                stopReason: event.stopReason,
              },
              turnId,
            );
          else if (event.kind === "assistant_message") {
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
      if (state.sealed) return finalize(state);
      if (state.outcome) return state.outcome;
      if (state.status === "recovery_required") return deferred(state);
      if (
        ["suspended"].includes(state.status) ||
        result.status === "suspended"
      ) {
        await setStatus(state, "suspended");
        return deferred(state);
      }
      if (
        result.status === "waiting_user" ||
        result.status === "waiting_permission"
      )
        return deferred(state);
      if (result.status === "state_unknown") {
        await setStatus(state, "recovery_required", "tool_effect_unknown");
        return deferred(state);
      }
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
      const state = await load(requestId);
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
      const state = await load(requestId);
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
      const state = await load(requestId);
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
  async function recover(requestId: string) {
    const state = await load(requestId);
    if (state.active) return state;
    if (state.outcome) return state;
    if (!state.prepared) {
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
    const inspection = await inspectPiOwner(ref(requestId), options.root);
    const started = inspection.entries.filter(
      (entry) =>
        entry.kind === "model_invocation_started" ||
        entry.kind === "tool_call_started",
    );
    const unsafe =
      inspection.entries.some(
        (entry) =>
          entry.kind === "tool_call_receipt" &&
          (entry.payload as { effectCertainty?: string }).effectCertainty ===
            "unknown",
      ) ||
      started.some((entry) => {
        const payload = entry.payload as {
          invocationId?: string;
          callId?: string;
        };
        return !inspection.entries.some((settled) =>
          entry.kind === "model_invocation_started"
            ? settled.kind === "model_invocation_terminal" &&
              (settled.payload as { invocationId?: string }).invocationId ===
                payload.invocationId
            : settled.kind === "tool_call_receipt" &&
              (settled.payload as { callId?: string }).callId ===
                payload.callId,
        );
      });
    if (unsafe)
      await setStatus(state, "recovery_required", "skill_run_recovery_unsafe");
    else if (
      !["waiting_user", "waiting_permission", "suspended"].includes(
        state.status,
      )
    )
      await setStatus(state, "suspended");
    return state;
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
      model: state.model,
      pending: state.pending,
      interactionBatch: state.interactionBatch,
      failure: state.failure,
      prepared: state.prepared,
      outcome: state.outcome,
      applyReceipt: state.applyReceipt,
      terminalAck: state.terminalAck,
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
          status: "complete",
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
      const state = await load(requestId);
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
      for (const state of states.values()) state.abort?.();
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
export function getPiSkillRunCoordinator() {
  return (singleton ||= createPiSkillRunCoordinator());
}
export const claimPiSkillRunApply = (requestId: string) =>
  getPiSkillRunCoordinator().claimApply(requestId);
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
