import { getHostBridgeApprovalRequirement } from "./hostBridgePermissionManager";
import { registerHostBridgeFileHandle } from "./hostBridgeFileRegistry";
import { isDebugModeEnabled } from "./debugMode";
import {
  getRuntimePersistencePaths,
  scanRuntimePersistenceUsage,
} from "./runtimePersistence";
import { scanPersistenceIntegrity } from "./persistenceIntegrity";
import { listActiveWorkflowTasks, listWorkflowTasks } from "./taskRuntime";
import { listAcpSkillRuns } from "./acpSkillRunStore";
import { reapplyAcpSkillRunResult } from "./acpSkillRunnerOrchestrator";
import type {
  HostBridgeApprovalRequirement,
  HostBridgeCapabilityCategory,
  HostBridgeCapabilityManifestEntry,
  HostBridgeStatusSnapshot,
} from "./hostBridgeProtocol";
import {
  createZoteroHostCapabilityBrokerApis,
  type ZoteroHostItemRefInput,
  type ZoteroHostLibraryListArgs,
  type ZoteroHostMutationRequest,
  type ZoteroHostNoteDetailArgs,
  type ZoteroHostNotePayloadDetailArgs,
  type ZoteroHostAttachmentDto,
} from "./zoteroHostCapabilityBroker";
import { getDefaultSynthesisService } from "./synthesis/service";
import type {
  SynthesisMcpService,
  SynthesisMcpServiceMethod,
} from "./synthesis/mcpService";

export type HostBridgeCapabilityContext = {
  getStatus: () => HostBridgeStatusSnapshot;
  resolveSynthesisService?: () => SynthesisMcpService;
};

export type HostBridgeCapabilityHandler = (
  input: unknown,
  context: HostBridgeCapabilityContext,
) => unknown | Promise<unknown>;

export type HostBridgeCapabilityDefinition =
  HostBridgeCapabilityManifestEntry & {
    handler: HostBridgeCapabilityHandler;
  };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function asObject(input: unknown): Record<string, unknown> {
  return isPlainObject(input) ? input : {};
}

function itemRefFromInput(input: unknown): ZoteroHostItemRefInput {
  const object = asObject(input);
  if (Object.prototype.hasOwnProperty.call(object, "ref")) {
    return object.ref as ZoteroHostItemRefInput;
  }
  return input as ZoteroHostItemRefInput;
}

function normalizeJsonSafeValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  return JSON.parse(JSON.stringify(value));
}

async function toBridgeAttachmentDescriptor(
  attachment: ZoteroHostAttachmentDto,
) {
  const path = String(attachment.path || "").trim();
  const { path: _path, ...safeAttachment } = attachment;
  if (!path || attachment.errors?.length) {
    return {
      ...safeAttachment,
      access: {
        mode: "unavailable",
        file: null,
      },
    };
  }
  const file = await registerHostBridgeFileHandle({
    localPath: path,
    sourceKind: "zotero-attachment",
    displayName: attachment.filename || attachment.title,
    contentType: attachment.contentType,
    owner: {
      capability: "library.get_item_attachments",
      itemKey: attachment.parent?.key || attachment.key,
      libraryId: attachment.libraryId,
    },
  });
  return {
    ...safeAttachment,
    access: {
      mode: "bridge-download",
      file,
    },
  };
}

async function toBridgeAttachmentDescriptors(input: unknown) {
  const attachments =
    await createZoteroHostCapabilityBrokerApis().library.getItemAttachments(
      itemRefFromInput(input),
    );
  return Promise.all(attachments.map(toBridgeAttachmentDescriptor));
}

function capability(
  name: string,
  category: HostBridgeCapabilityCategory,
  summary: string,
  input: HostBridgeCapabilityManifestEntry["input"],
  handler: HostBridgeCapabilityHandler,
): HostBridgeCapabilityDefinition {
  const approval = getHostBridgeApprovalRequirement(name);
  return {
    name,
    category,
    summary,
    approval,
    input,
    handler: async (rawInput, context) =>
      normalizeJsonSafeValue(await handler(rawInput, context)),
  };
}

function assertDebugModeEnabled() {
  if (!isDebugModeEnabled()) {
    throw new Error("Host Bridge debug capabilities are disabled");
  }
}

function debugCapability(
  name: string,
  summary: string,
  handler: HostBridgeCapabilityHandler,
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    "debug",
    summary,
    { type: "object", required: false },
    async (input, context) => {
      assertDebugModeEnabled();
      return handler(input, context);
    },
  );
}

function debugLimit(input: Record<string, unknown>, fallback = 100) {
  return Math.max(
    1,
    Math.min(
      1000,
      Math.floor(Number(input.limit ?? input.maxRows ?? fallback) || fallback),
    ),
  );
}

function debugEnvelope(
  schema: string,
  input: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  return {
    schema,
    debugMode: true,
    generatedAt: new Date().toISOString(),
    truncated: Boolean(payload.truncated),
    limits: {
      limit: debugLimit(input),
      includeLocalPaths: input.includeLocalPaths === true,
      includeRawRows: input.includeRawRows === true,
    },
    diagnostics: Array.isArray(payload.diagnostics) ? payload.diagnostics : [],
    ...payload,
  };
}

const DEBUG_ZOTERO_EVAL_SCHEMA = "host_bridge.debug.zotero.eval.v1";
const DEBUG_ZOTERO_EVAL_DEFAULT_TIMEOUT_MS = 5000;
const DEBUG_ZOTERO_EVAL_MAX_TIMEOUT_MS = 30000;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_DEPTH = 4;
const DEBUG_ZOTERO_EVAL_MAX_DEPTH = 8;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_ITEMS = 50;
const DEBUG_ZOTERO_EVAL_MAX_ITEMS = 500;
const DEBUG_ZOTERO_EVAL_DEFAULT_MAX_CHARS = 20000;
const DEBUG_ZOTERO_EVAL_MAX_CHARS = 200000;
const DEBUG_ZOTERO_EVAL_STRING_LIMIT = 4000;

function clampDebugInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function debugZoteroEvalResultType(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (value instanceof Error) {
    return "error";
  }
  return typeof value;
}

function truncateDebugString(
  value: string,
  maxChars: number,
  truncated: { value: boolean },
) {
  if (value.length <= maxChars) {
    return value;
  }
  truncated.value = true;
  return `${value.slice(0, Math.max(0, maxChars))}...[truncated]`;
}

function safeDebugEvalValue(
  value: unknown,
  options: {
    depth: number;
    maxDepth: number;
    maxItems: number;
    maxStringChars: number;
    seen: WeakSet<object>;
    truncated: { value: boolean };
  },
): unknown {
  if (value === undefined) {
    return "[Undefined]";
  }
  if (typeof value === "bigint") {
    return `${value.toString()}n`;
  }
  if (typeof value === "symbol") {
    return value.toString();
  }
  if (typeof value === "function") {
    return `[Function${value.name ? `: ${value.name}` : ""}]`;
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return truncateDebugString(
      value,
      options.maxStringChars,
      options.truncated,
    );
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    const errorResult: Record<string, unknown> = {
      name: value.name,
      message: truncateDebugString(
        value.message,
        options.maxStringChars,
        options.truncated,
      ),
    };
    if (value.stack) {
      errorResult.stack = truncateDebugString(
        value.stack,
        options.maxStringChars,
        options.truncated,
      );
    }
    return errorResult;
  }
  if (typeof value !== "object") {
    return String(value);
  }
  if (options.seen.has(value)) {
    options.truncated.value = true;
    return "[Circular]";
  }
  if (options.depth >= options.maxDepth) {
    options.truncated.value = true;
    return "[MaxDepth]";
  }
  options.seen.add(value);
  if (Array.isArray(value)) {
    const items = value.slice(0, options.maxItems).map((entry) =>
      safeDebugEvalValue(entry, {
        ...options,
        depth: options.depth + 1,
      }),
    );
    if (value.length > options.maxItems) {
      options.truncated.value = true;
      items.push(`[${value.length - options.maxItems} more item(s)]`);
    }
    return items;
  }
  const output: Record<string, unknown> = {};
  const entries = Object.entries(value).slice(0, options.maxItems);
  for (const [key, entry] of entries) {
    output[key] = safeDebugEvalValue(entry, {
      ...options,
      depth: options.depth + 1,
    });
  }
  const totalEntries = Object.keys(value).length;
  if (totalEntries > options.maxItems) {
    options.truncated.value = true;
    output.__truncatedKeys = totalEntries - options.maxItems;
  }
  return output;
}

function enforceDebugEvalJsonLimit(
  value: unknown,
  maxChars: number,
  truncated: { value: boolean },
) {
  const serialized = JSON.stringify(value);
  if (!serialized || serialized.length <= maxChars) {
    return value;
  }
  truncated.value = true;
  return {
    summary: truncateDebugString(serialized, maxChars, truncated),
  };
}

function timeoutPromise(timeoutMs: number) {
  return new Promise<never>((_resolve, reject) => {
    setTimeout(
      () =>
        reject(new Error(`debug.zotero.eval timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
}

async function debugZoteroEval(rawInput: unknown) {
  const input = asObject(rawInput);
  const code = String(input.code || "").trim();
  if (!code) {
    throw new Error("debug.zotero.eval requires non-empty code");
  }
  const timeoutMs = clampDebugInteger(
    input.timeoutMs,
    DEBUG_ZOTERO_EVAL_DEFAULT_TIMEOUT_MS,
    1,
    DEBUG_ZOTERO_EVAL_MAX_TIMEOUT_MS,
  );
  const maxDepth = clampDebugInteger(
    input.maxDepth,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_DEPTH,
    1,
    DEBUG_ZOTERO_EVAL_MAX_DEPTH,
  );
  const maxItems = clampDebugInteger(
    input.maxItems,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_ITEMS,
    1,
    DEBUG_ZOTERO_EVAL_MAX_ITEMS,
  );
  const maxChars = clampDebugInteger(
    input.maxChars,
    DEBUG_ZOTERO_EVAL_DEFAULT_MAX_CHARS,
    100,
    DEBUG_ZOTERO_EVAL_MAX_CHARS,
  );
  const startedAt =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const evaluator = new Function(
    "Zotero",
    "window",
    "globalThis",
    "input",
    `"use strict"; return (async () => {\n${code}\n})();`,
  ) as (
    zotero: unknown,
    win: unknown,
    global: typeof globalThis,
    input: unknown,
  ) => Promise<unknown>;
  const result = await Promise.race([
    evaluator(
      (globalThis as { Zotero?: unknown }).Zotero,
      (globalThis as { window?: unknown }).window,
      globalThis,
      input.input,
    ),
    timeoutPromise(timeoutMs),
  ]);
  const endedAt =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  const truncated = { value: false };
  const safeResult = safeDebugEvalValue(result, {
    depth: 0,
    maxDepth,
    maxItems,
    maxStringChars: Math.min(DEBUG_ZOTERO_EVAL_STRING_LIMIT, maxChars),
    seen: new WeakSet<object>(),
    truncated,
  });
  return {
    schema: DEBUG_ZOTERO_EVAL_SCHEMA,
    debugMode: true,
    generatedAt: new Date().toISOString(),
    elapsedMs: Math.max(0, Math.round(endedAt - startedAt)),
    result: enforceDebugEvalJsonLimit(safeResult, maxChars, truncated),
    resultType: debugZoteroEvalResultType(result),
    truncated: truncated.value,
  };
}

function redactLocalPaths(value: unknown, includeLocalPaths: boolean): unknown {
  if (includeLocalPaths) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactLocalPaths(entry, includeLocalPaths));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key.toLowerCase().includes("path") || key === "root") {
      output[key] = entry ? "[redacted-path]" : entry;
      continue;
    }
    output[key] = redactLocalPaths(entry, includeLocalPaths);
  }
  return output;
}

function summarizeRun(run: Record<string, unknown>) {
  return {
    requestId: run.requestId,
    runId: run.runId,
    workflowId: run.workflowId,
    backendId: run.backendId,
    status: run.status,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    error: run.error,
  };
}

async function debugStatus(
  input: unknown,
  context: HostBridgeCapabilityContext,
) {
  const object = asObject(input);
  const tasks = listWorkflowTasks();
  const activeTasks = listActiveWorkflowTasks();
  const runs = listAcpSkillRuns();
  return debugEnvelope("host_bridge.debug.status.v1", object, {
    hostBridge: context.getStatus(),
    capabilityCounts: {
      total: listHostBridgeCapabilities().length,
      debug: listHostBridgeCapabilities().filter((entry) =>
        entry.name.startsWith("debug."),
      ).length,
    },
    runtimePersistence: redactLocalPaths(
      getRuntimePersistencePaths(),
      object.includeLocalPaths === true,
    ),
    tasks: {
      total: tasks.length,
      active: activeTasks.length,
      recent: tasks.slice(0, debugLimit(object, 20)),
    },
    acpSkillRuns: {
      total: runs.length,
      active: runs.filter(
        (run) =>
          run.status !== "succeeded" &&
          run.status !== "failed" &&
          run.status !== "canceled",
      ).length,
      recent: runs.slice(0, debugLimit(object, 20)).map(summarizeRun),
    },
    truncated:
      tasks.length > debugLimit(object, 20) ||
      runs.length > debugLimit(object, 20),
  });
}

async function debugPersistenceSnapshot(input: unknown) {
  const object = asObject(input);
  const [usage, integrity] = await Promise.all([
    scanRuntimePersistenceUsage(),
    scanPersistenceIntegrity(),
  ]);
  return debugEnvelope("host_bridge.debug.persistence.snapshot.v1", object, {
    usage: redactLocalPaths(usage, object.includeLocalPaths === true),
    integrity: redactLocalPaths(integrity, object.includeLocalPaths === true),
    truncated: false,
  });
}

async function debugTasksSnapshot(input: unknown) {
  const object = asObject(input);
  const limit = debugLimit(object);
  const tasks = listWorkflowTasks();
  const activeTasks = listActiveWorkflowTasks();
  const runs = listAcpSkillRuns();
  return debugEnvelope("host_bridge.debug.tasks.snapshot.v1", object, {
    tasks: tasks.slice(0, limit),
    activeTasks: activeTasks.slice(0, limit),
    acpSkillRuns: runs.slice(0, limit).map(summarizeRun),
    totals: {
      tasks: tasks.length,
      activeTasks: activeTasks.length,
      acpSkillRuns: runs.length,
    },
    truncated:
      tasks.length > limit || activeTasks.length > limit || runs.length > limit,
  });
}

function synthesisCapability(
  name: string,
  category: HostBridgeCapabilityCategory,
  summary: string,
  methodName: SynthesisMcpServiceMethod,
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    category,
    summary,
    { type: "object", required: false },
    async (input, context) => {
      const service =
        context.resolveSynthesisService?.() ||
        (getDefaultSynthesisService() as unknown as SynthesisMcpService);
      const method = service?.[methodName];
      if (typeof method !== "function") {
        throw new Error(
          `Synthesis service method is unavailable: ${String(methodName)}`,
        );
      }
      return method(asObject(input));
    },
  );
}

async function callSynthesisDebugService(methodName: string, input: unknown) {
  const service = getDefaultSynthesisService() as unknown as Record<
    string,
    unknown
  >;
  const method = service[methodName];
  if (typeof method !== "function") {
    throw new Error(`Synthesis debug method is unavailable: ${methodName}`);
  }
  return method(asObject(input));
}

const CAPABILITIES: HostBridgeCapabilityDefinition[] = [
  capability(
    "context.get_current_view",
    "context",
    "Return the active Zotero target, library id, selection state, and current item metadata.",
    { type: "none", required: false },
    () => createZoteroHostCapabilityBrokerApis().context.getCurrentView(),
  ),
  capability(
    "context.get_selected_items",
    "context",
    "Return JSON-safe summaries for the currently selected Zotero items.",
    { type: "none", required: false },
    () => createZoteroHostCapabilityBrokerApis().context.getSelectedItems(),
  ),
  capability(
    "library.search_items",
    "library",
    "Search regular Zotero library items by bounded text query.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.searchItems(
        asObject(input) as {
          query: string;
          limit?: number | string;
          libraryId?: number | string;
        },
      ),
  ),
  capability(
    "library.list_items",
    "library",
    "List compact parent Zotero library item summaries with bounded pagination and filters.",
    { type: "object", required: false },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.listItems(
        asObject(input) as ZoteroHostLibraryListArgs,
      ),
  ),
  capability(
    "library.get_item_detail",
    "library",
    "Return detailed JSON-safe metadata for one Zotero item.",
    { type: "item-ref", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getItemDetail(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_item_notes",
    "library",
    "Return bounded child note summaries for one Zotero item.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getItemNotes(
        itemRefFromInput(input),
        asObject(input),
      ),
  ),
  capability(
    "library.get_note_detail",
    "library",
    "Read one Zotero note body in bounded chunks.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getNoteDetail(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNoteDetailArgs,
      ),
  ),
  capability(
    "library.list_note_payloads",
    "library",
    "List workflow note payloads from embedded attachments and legacy payload blocks.",
    { type: "item-ref", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.listNotePayloads(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_note_payload",
    "library",
    "Decode one workflow payload from one Zotero note.",
    { type: "object", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.getNotePayload(
        itemRefFromInput(input),
        asObject(input) as ZoteroHostNotePayloadDetailArgs,
      ),
  ),
  capability(
    "library.get_item_attachments",
    "library",
    "Return child attachment metadata with broker-issued download handles when available.",
    { type: "item-ref", required: true },
    (input) => toBridgeAttachmentDescriptors(input),
  ),
  capability(
    "mutation.preview",
    "mutation",
    "Preview a supported Zotero mutation without executing it.",
    { type: "mutation-preview", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().mutations.preview(
        asObject(input) as ZoteroHostMutationRequest,
      ),
  ),
  capability(
    "mutation.execute",
    "mutation",
    "Execute a supported Zotero mutation after Zotero-side approval.",
    { type: "mutation-preview", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().mutations.execute(
        asObject(input) as ZoteroHostMutationRequest,
      ),
  ),
  capability(
    "diagnostic.get_status",
    "diagnostic",
    "Return a redacted Host Bridge service status snapshot.",
    { type: "none", required: false },
    (_input, context) => context.getStatus(),
  ),
  debugCapability(
    "debug.status",
    "Return a debug-only Host Bridge and runtime status snapshot.",
    debugStatus,
  ),
  debugCapability(
    "debug.persistence.snapshot",
    "Return a debug-only runtime persistence usage and integrity snapshot.",
    debugPersistenceSnapshot,
  ),
  debugCapability(
    "debug.tasks.snapshot",
    "Return debug-only workflow task and ACP run diagnostics.",
    debugTasksSnapshot,
  ),
  debugCapability(
    "debug.acpSkillRun.reapplyResult",
    "Debug-only operation: re-run applyResult for an existing ACP skill run result.",
    (input) => {
      const object = asObject(input);
      return reapplyAcpSkillRunResult({
        requestId: object.requestId as string | undefined,
        runId: object.runId as string | undefined,
        force: object.force === true,
        persistResult: Object.prototype.hasOwnProperty.call(
          object,
          "persistResult",
        )
          ? object.persistResult !== false
          : undefined,
        resultJsonOverride: isPlainObject(object.resultJsonOverride)
          ? object.resultJsonOverride
          : undefined,
        overrideMode:
          object.overrideMode === "replace" || object.overrideMode === "merge"
            ? object.overrideMode
            : undefined,
      });
    },
  ),
  debugCapability(
    "debug.zotero.eval",
    "Debug-only operation: execute approved JavaScript in the Zotero host context.",
    (input) => debugZoteroEval(input),
  ),
  debugCapability(
    "debug.synthesis.snapshot",
    "Return a debug-only Synthesis operation, cache, table-count, and UI snapshot.",
    (input) => callSynthesisDebugService("debugSynthesisSnapshot", input),
  ),
  debugCapability(
    "debug.synthesis.operations.list",
    "List debug-only Synthesis explicit operations and background job rows.",
    (input) => callSynthesisDebugService("debugSynthesisOperationsList", input),
  ),
  debugCapability(
    "debug.synthesis.profiler.list",
    "List debug-only Synthesis profiler runs and phase timings.",
    (input) => callSynthesisDebugService("debugSynthesisProfilerList", input),
  ),
  debugCapability(
    "debug.synthesis.paper.inspect",
    "Inspect one paper across Zotero payloads and Synthesis repository caches.",
    (input) => callSynthesisDebugService("debugSynthesisPaperInspect", input),
  ),
  debugCapability(
    "debug.synthesis.topic.inspect",
    "Inspect one topic across artifacts, graph, freshness, and discovery state.",
    (input) => callSynthesisDebugService("debugSynthesisTopicInspect", input),
  ),
  debugCapability(
    "debug.synthesis.diff",
    "Compare Zotero payload availability against Synthesis repository caches.",
    (input) => callSynthesisDebugService("debugSynthesisDiff", input),
  ),
  debugCapability(
    "debug.synthesis.cache.list",
    "List debug-only Synthesis sidecar cache basis rows.",
    (input) => callSynthesisDebugService("debugSynthesisCacheList", input),
  ),
  debugCapability(
    "debug.synthesis.cleanInstallReset",
    "Dangerous debug operation: reset Synthesis DB state and delete data/synthesis.",
    (input) =>
      callSynthesisDebugService("debugSynthesisCleanInstallReset", input),
  ),
  synthesisCapability(
    "topics.list",
    "topics",
    "List Zotero Synthesis Layer topics for duplicate checks and topic selection.",
    "listTopics",
  ),
  synthesisCapability(
    "topics.find_by_paper_ref",
    "topics",
    "Return active Synthesis topics associated with selected paper references from artifact dependency state.",
    "findTopicsByPaperRef",
  ),
  synthesisCapability(
    "topics.get_context",
    "topics",
    "Return one topic context, optionally including current artifact and manifest data.",
    "getTopicContext",
  ),
  synthesisCapability(
    "topics.get_report",
    "topics",
    "Return one topic synthesis report markdown body from runtime synthesis_report.body.",
    "getTopicReport",
  ),
  synthesisCapability(
    "schemas.get",
    "schemas",
    "Return Synthesis Layer schema metadata for diagnostic and validation workflows.",
    "getSchemas",
  ),
  synthesisCapability(
    "concepts.query",
    "concepts",
    "Return bounded read-only Concept KB and alias-index candidates for topic synthesis KG enrichment.",
    "queryConceptKb",
  ),
  synthesisCapability(
    "citation_graph.query_cluster",
    "citation_graph",
    "Return bounded read-only topic-scoped citation graph cluster data for synthesis statistics.",
    "queryCitationGraphCluster",
  ),
  synthesisCapability(
    "library_index.get",
    "library_index",
    "Return paginated compact Synthesis library index pages derived from Zotero library facts.",
    "getLibraryIndex",
  ),
  synthesisCapability(
    "resolvers.resolve",
    "resolvers",
    "Resolve a topic resolver into a deterministic paper workset and diagnostics.",
    "resolveResolver",
  ),
  synthesisCapability(
    "reference_index.get",
    "reference_index",
    "Return bounded read-only reference index metadata and diagnostics for selected source references.",
    "getReferenceSidecarIndex",
  ),
  synthesisCapability(
    "citation_graph.get_overview",
    "citation_graph",
    "Return bounded read-only Synthesis citation graph query results for selected paper references.",
    "queryCitationGraph",
  ),
  synthesisCapability(
    "citation_graph.get_slice",
    "citation_graph",
    "Return a bounded read-only citation graph slice with freshness diagnostics for selected paper references.",
    "getCitationGraphSlice",
  ),
  synthesisCapability(
    "citation_graph.get_layout",
    "citation_graph",
    "Return persisted citation graph layout coordinates for an explicit full graph or bounded subgraph query without recomputing layout.",
    "getCitationGraphLayout",
  ),
  synthesisCapability(
    "citation_graph.get_metrics",
    "citation_graph",
    "Return bounded read-only citation graph metrics, freshness diagnostics, and recommended maintenance commands for selected paper references.",
    "getCitationGraphMetrics",
  ),
  synthesisCapability(
    "citation_graph.rank_external_references",
    "citation_graph",
    "Return ranked external references from the persisted citation graph without refreshing graph state.",
    "rankExternalReferences",
  ),
  synthesisCapability(
    "citation_graph.rank_library_papers",
    "citation_graph",
    "Return ranked library papers from persisted citation graph metrics without refreshing graph state.",
    "rankLibraryPapers",
  ),
  synthesisCapability(
    "citation_graph.refresh_metrics",
    "citation_graph",
    "Diagnostic repair: refresh persisted citation graph complex metrics from the current graph cache without rebuilding graph structure.",
    "refreshCitationGraphMetricsNow",
  ),
  synthesisCapability(
    "paper_artifacts.get_manifest",
    "paper_artifacts",
    "Return available Synthesis paper artifact descriptors for selected paper references.",
    "getPaperArtifactManifest",
  ),
  synthesisCapability(
    "paper_artifacts.read",
    "paper_artifacts",
    "Read bounded Synthesis paper artifacts for selected paper references.",
    "readPaperArtifacts",
  ),
  synthesisCapability(
    "paper_artifacts.export_filtered",
    "paper_artifacts",
    "Export bounded filtered paper artifacts into the ACP run workspace.",
    "exportFilteredPaperArtifacts",
  ),
  synthesisCapability(
    "paper_artifacts.resolve_topic_digest",
    "paper_artifacts",
    "Resolve one topic paper digest artifact for reading or diagnostics.",
    "resolveTopicPaperDigest",
  ),
  synthesisCapability(
    "topics.get_review_input",
    "topics",
    "Return structured Synthesis review workflow input.",
    "getReviewInput",
  ),
  synthesisCapability(
    "insights.get_attention_queue",
    "insights",
    "Return read-only attention items for graph metrics, reference index, and paper artifact readiness.",
    "getAttentionQueue",
  ),
];

const CAPABILITY_BY_NAME = new Map(
  CAPABILITIES.map((entry) => [entry.name, entry]),
);

export function listHostBridgeCapabilities(): HostBridgeCapabilityManifestEntry[] {
  return CAPABILITIES.filter(
    (entry) => entry.category !== "debug" || isDebugModeEnabled(),
  ).map(({ handler: _handler, ...entry }) => ({
    ...entry,
  }));
}

export function getHostBridgeCapability(
  name: string,
): HostBridgeCapabilityDefinition | null {
  const capability = CAPABILITY_BY_NAME.get(name) || null;
  if (capability?.category === "debug" && !isDebugModeEnabled()) {
    return null;
  }
  return capability;
}

export function getHostBridgeCapabilityApproval(
  name: string,
): HostBridgeApprovalRequirement {
  return getHostBridgeCapability(name)?.approval || "zotero-ui-required";
}
