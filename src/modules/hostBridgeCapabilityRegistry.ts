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
  summary: string,
  methodName: SynthesisMcpServiceMethod,
): HostBridgeCapabilityDefinition {
  return capability(
    name,
    "synthesis",
    summary,
    { type: "object", required: false },
    async (input) => {
      const service =
        getDefaultSynthesisService() as unknown as SynthesisMcpService;
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
    "List hidden workflow payload blocks in one Zotero note.",
    { type: "item-ref", required: true },
    (input) =>
      createZoteroHostCapabilityBrokerApis().library.listNotePayloads(
        itemRefFromInput(input),
      ),
  ),
  capability(
    "library.get_note_payload",
    "library",
    "Decode one hidden workflow payload from one Zotero note.",
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
    "synthesis.list_topics",
    "List Zotero Synthesis Layer topics for duplicate checks and topic selection.",
    "listTopics",
  ),
  synthesisCapability(
    "synthesis.get_topic_context",
    "Return one topic context, optionally including current artifact and manifest data.",
    "getTopicContext",
  ),
  synthesisCapability(
    "synthesis.get_schemas",
    "Return Synthesis Layer schema metadata for diagnostic and validation workflows.",
    "getSchemas",
  ),
  synthesisCapability(
    "synthesis.get_library_index",
    "Return paginated compact Synthesis sidecar cache pages derived from Zotero library facts.",
    "getLibraryIndex",
  ),
  synthesisCapability(
    "synthesis.resolve_resolver",
    "Resolve a topic resolver into a deterministic paper workset and diagnostics.",
    "resolveResolver",
  ),
  synthesisCapability(
    "synthesis.get_reference_sidecar_index",
    "Return bounded read-only Synthesis reference sidecar index metadata and diagnostics for selected source references.",
    "getReferenceSidecarIndex",
  ),
  synthesisCapability(
    "synthesis.query_citation_graph",
    "Query the read-only Synthesis citation graph projection with bounded maintenance diagnostics.",
    "queryCitationGraph",
  ),
  synthesisCapability(
    "synthesis.get_citation_graph_slice",
    "Return a bounded read-only citation graph slice with freshness diagnostics for selected paper references.",
    "getCitationGraphSlice",
  ),
  synthesisCapability(
    "synthesis.get_citation_graph_metrics",
    "Return bounded read-only citation graph metrics, freshness diagnostics, and recommended maintenance commands for selected paper references.",
    "getCitationGraphMetrics",
  ),
  synthesisCapability(
    "synthesis.get_paper_artifact_manifest",
    "Return available Synthesis paper artifact descriptors for selected paper references.",
    "getPaperArtifactManifest",
  ),
  synthesisCapability(
    "synthesis.read_paper_artifacts",
    "Read bounded Synthesis paper artifacts for selected paper references.",
    "readPaperArtifacts",
  ),
  synthesisCapability(
    "synthesis.export_filtered_paper_artifacts",
    "Export bounded filtered paper artifacts into the ACP run workspace.",
    "exportFilteredPaperArtifacts",
  ),
  synthesisCapability(
    "synthesis.resolve_topic_paper_digest",
    "Resolve one topic paper digest artifact for reading or diagnostics.",
    "resolveTopicPaperDigest",
  ),
  synthesisCapability(
    "synthesis.get_review_input",
    "Return structured Synthesis review workflow input.",
    "getReviewInput",
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
