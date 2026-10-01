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
} from "./piRuntime";
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
import {
  resolveZoteroHostCapabilityBroker,
  createZoteroHostCapabilityBroker,
} from "./zoteroHostCapabilityBroker";
import { getPiMcpToolSources } from "./piMcpRuntimeOwner";
import { getPiBrokeredWebTools, type PiWebTurn } from "./piBrokeredWebTools";
import {
  createPiConversationOwner,
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
} from "./piOwnerPersistence";
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
  resolveModel?: (selection?: PiSelection) => Promise<PiModelSelectionSnapshot>;
  modelSource?: (selection: PiModelSelectionSnapshot) => PiRuntimeModelSource;
  execution?: (
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

export function createPiConversationCoordinator(options: Options = {}) {
  const listeners = new Set<(change: PiConversationChange) => void>();
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
        input: number;
        output: number;
        cost: number;
        titleCost: number;
      };
    }
  >();
  const titleTasks = new Map<
    string,
    { abort(): void; result: Promise<void> }
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
          input: persisted?.usageTotals.input || 0,
          output: persisted?.usageTotals.output || 0,
          cost: persisted?.usageTotals.cost || 0,
          titleCost: persisted?.usageTotals.titleCost || 0,
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
      counts: getPiConversationProjection(conversationId)?.counts,
      model,
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
  async function deleteConversation(conversationId: string) {
    markPiConversationDeleting(conversationId, { lifecycle: "archived" });
    titleTasks.get(conversationId)?.abort();
    const result = await cleanupPiConversation(
      ref(conversationId),
      options.root,
    );
    states.delete(conversationId);
    drafts.delete(conversationId);
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
        status: "complete",
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
    return freezePiToolGatewayTurn({
      owner: ref(conversationId),
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
  async function preparation(
    conversationId: string,
    turnId: string,
    invocationId: string,
    frozen: PiTurnPreparationInput["frozen"],
    intent: PiTurnPreparationInput["intent"] = "initial",
    signal?: AbortSignal,
  ) {
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
        const source = modelSource(
          input.model,
          state(conversationId).localEndpoint,
        );
        let output = "";
        try {
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
            signal: controller.signal,
          })) {
            output += part;
            if (output.length > 256 * 1024) {
              controller.abort();
              throw new Error("pi_summary_too_large");
            }
          }
          return JSON.parse(output) as PiCompactionSummary;
        } finally {
          signal?.removeEventListener("abort", onAbort);
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
      async onEvent(event) {
        try {
          if (
            current.turnId !== turnId ||
            (current.status === "cancelling" &&
              event.kind !== "invocation_terminal" &&
              event.kind !== "tool_result")
          )
            return;
          if (event.kind === "invocation_started")
            await fact(
              conversationId,
              "model_invocation_started",
              { invocationId: event.invocationId },
              turnId,
            );
          else if (event.kind === "text_delta") {
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
              },
              turnId,
              current.itemId,
            );
            current.usage.main += event.usage.totalTokens;
            current.usage.input += event.usage.input;
            current.usage.output += event.usage.output;
            current.usage.cost += event.usage.cost.total;
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
          } else if (event.kind === "invocation_terminal")
            await fact(
              conversationId,
              "model_invocation_terminal",
              {
                invocationId: event.invocationId,
                stopReason: event.stopReason,
              },
              turnId,
            );
        } catch {
          current.failure = "persistence_failed";
          current.status = "recovery_required";
          current.abort?.();
        }
      },
    });
    current.abort = turn.abort;
    emit(conversationId, ["control", "navigation", "counts"]);
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
      const owner = metadata(conversationId);
      const model = await resolveModel(
        owner.selection ? JSON.parse(owner.selection) : undefined,
      );
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
      const turnId = id("turn");
      const tools = await gateway(
        conversationId,
        turnId,
        current.definitions,
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
            model: {
              selectionRef: model.configurationId,
              provider: model.provider,
              modelId: model.modelId,
              api: model.api,
            },
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
    try {
      const owner = metadata(conversationId);
      const model = await resolveModel(
        owner.selection ? JSON.parse(owner.selection) : undefined,
      );
      await authorizeModel(conversationId, model, authorizeLocalNetwork);
      if (controller.signal.aborted) throw new Error("pi_send_canceled");
      const turnId = id("compaction");
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
    } catch (error) {
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
    const result = (async () => {
      let output = "";
      let usage = 0;
      let inputTokens = 0;
      let outputTokens = 0;
      let cost = 0;
      let provider = "";
      let modelId = "";
      let failure: string | undefined;
      try {
        const model = await resolveModel(auxiliary);
        const localApproved =
          !model.requiresLocalNetwork ||
          state(conversationId).localEndpoint === model.baseUrl ||
          !!(await authorizeLocalNetwork?.(model.baseUrl));
        if (!localApproved) throw new Error("pi_local_network_unapproved");
        provider = model.provider;
        modelId = model.modelId;
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
        const titleTurnId = id("title");
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
            if (event.kind === "assistant_message") {
              output = event.text;
              usage += event.usage.totalTokens;
              inputTokens += event.usage.input;
              outputTokens += event.usage.output;
              cost += event.usage.cost.total;
            }
          },
        });
        controller.signal.addEventListener("abort", () => turn.abort(), {
          once: true,
        });
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
        const fresh = getPiConversationMetadata(conversationId);
        if (fresh && ["active", "archived"].includes(fresh.lifecycle)) {
          state(conversationId).usage.title += usage;
          state(conversationId).usage.titleCost += cost;
          await fact(conversationId, "title_usage", {
            provider,
            modelId,
            inputTokens,
            outputTokens,
            totalTokens: usage,
            cost,
            ...(failure ? { failure } : {}),
          }).catch(() => {});
          emit(conversationId, ["navigation", "presentation", "details"]);
        }
        titleTasks.delete(conversationId);
      }
    })();
    titleTasks.set(conversationId, { abort: () => controller.abort(), result });
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
    async dispose() {
      disposed = true;
      for (const current of states.values()) current.abort?.();
      for (const task of titleTasks.values()) task.abort();
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
export function getPiConversationCoordinator() {
  return (singleton ||= createPiConversationCoordinator());
}
export async function shutdownPiConversations() {
  if (singleton) {
    await singleton.dispose();
    singleton = undefined;
  }
}
