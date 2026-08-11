import {
  SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS,
  rebuildSynthesisCitationGraphApplicationInspectResult,
  rebuildSynthesisCitationGraphApplicationLayoutRequest,
  rebuildSynthesisCitationGraphApplicationMetricsRequest,
  rebuildSynthesisCitationGraphApplicationMutationResult,
  rebuildSynthesisCitationGraphApplicationRebuildRequest,
  rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest,
  rebuildSynthesisCitationGraphApplicationSliceRequest,
  type SynthesisCitationGraphApplicationInspectResult,
  type SynthesisCitationGraphApplicationLayoutRequest,
  type SynthesisCitationGraphApplicationMutationResult,
  type SynthesisCitationGraphApplicationPreset,
  type SynthesisCitationGraphApplicationSliceRequest,
} from "../../synthesis-contracts/src/citationGraphApplication.js";
import {
  byteLengthSynthesisEngineText,
  canonicalizeSynthesisEngineJson,
  countSynthesisEngineJsonNodes,
  hashSynthesisEngineCanonicalJson,
  rebuildSynthesisCitationGraphLayoutResult,
  rebuildSynthesisCitationGraphMetricsResult,
  type SynthesisCitationGraphLayoutRequest,
  type SynthesisCitationGraphLayoutResult,
  type SynthesisCitationGraphMetricsRequest,
  type SynthesisCitationGraphMetricsResult,
} from "../../synthesis-engine/src/index.js";
import {
  rebuildSynthesisCitationGraphBuildRequest,
  rebuildSynthesisCitationGraphBuildResult,
  type SynthesisCitationGraphBuildRequest,
  type SynthesisCitationGraphBuildResult,
} from "../../synthesis-engine/src/citationGraphBuild.js";
import type {
  SynthesisCitationComplexMetricsRecord,
  SynthesisCitationEdgeRecord,
  SynthesisCitationGraphApplicationStateRecord,
  SynthesisCitationGraphStateReplacement,
  SynthesisCitationLayoutRecord,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
  SynthesisCitationSourceOwnershipRecord,
  SynthesisCitationIncomingGroupRecord,
  SynthesisOperationRecord,
  SynthesisOperationStatusUpdate,
} from "../../synthesis-repository/src/index.js";
import {
  projectSynthesisCitationGraphBuildRecords,
  projectSynthesisCitationGraphDefaultRecords,
  synthesisCitationGraphRecordKind,
} from "./citationGraphProjection.js";

export type SynthesisCitationGraphApplicationRepository = {
  initializeCitationGraphApplication(): void;
  getCitationGraphApplicationState(): SynthesisCitationGraphApplicationStateRecord | null;
  replaceCitationGraphApplicationState(args: {
    expectedGraphHash: string | null;
    graphHash: string;
    inputHash: string;
    state: SynthesisCitationGraphStateReplacement;
    now: string;
  }): boolean;
  promoteCitationGraphComplexMetrics(args: {
    expectedGraphHash: string;
    metricsHash: string;
    records: SynthesisCitationComplexMetricsRecord[];
    now: string;
  }): boolean;
  promoteCitationGraphLayout(args: {
    expectedGraphHash: string;
    record: SynthesisCitationLayoutRecord;
    now: string;
  }): boolean;
  listCitationNodes(): SynthesisCitationNodeRecord[];
  listCitationEdges(): SynthesisCitationEdgeRecord[];
  listCitationSourceOwnership(): SynthesisCitationSourceOwnershipRecord[];
  listCitationIncomingGroups(): SynthesisCitationIncomingGroupRecord[];
  listCitationLightMetrics(): SynthesisCitationLightMetricsRecord[];
  listCitationComplexMetrics(): SynthesisCitationComplexMetricsRecord[];
  getCitationGraphLayout(
    layoutKey: string,
  ): SynthesisCitationLayoutRecord | null;
  listCitationGraphLayouts(): SynthesisCitationLayoutRecord[];
  upsertOperation?(record: SynthesisOperationRecord): void;
  updateOperationStatus?(
    args: SynthesisOperationStatusUpdate,
  ): SynthesisOperationRecord | null;
};

export type SynthesisCitationGraphApplicationCompute = {
  build(
    request: SynthesisCitationGraphBuildRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphBuildResult>;
  metrics(
    request: SynthesisCitationGraphMetricsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphMetricsResult>;
  layout(
    request: SynthesisCitationGraphLayoutRequest,
    options?: { signal?: AbortSignal },
  ): Promise<SynthesisCitationGraphLayoutResult>;
};

export type SynthesisCitationGraphApplication = ReturnType<
  typeof createSynthesisCitationGraphApplication
>;

type Options = {
  repository: SynthesisCitationGraphApplicationRepository;
  compute: SynthesisCitationGraphApplicationCompute;
  now?: () => string;
  createOperationId?: () => string;
};

const warningMetrics = "citation_graph_metrics_refresh_failed";
const warningReceipt = "citation_graph_operation_receipt_failed";

function emptyMutation(
  status: SynthesisCitationGraphApplicationMutationResult["status"],
  state: SynthesisCitationGraphApplicationStateRecord | null,
  warnings: string[] = [],
): SynthesisCitationGraphApplicationMutationResult {
  return rebuildSynthesisCitationGraphApplicationMutationResult({
    status,
    graphHash: state?.graphHash ?? null,
    inputHash: state?.inputHash ?? null,
    metricsHash: state?.metricsHash ?? null,
    warnings,
  });
}

function metricRequest(
  state: SynthesisCitationGraphApplicationStateRecord,
  nodes: SynthesisCitationNodeRecord[],
  edges: SynthesisCitationEdgeRecord[],
): SynthesisCitationGraphMetricsRequest {
  return {
    graphHash: state.graphHash,
    nodes: nodes.map((node) => ({
      nodeId: node.literatureItemId,
      kind: synthesisCitationGraphRecordKind(node),
      ...(node.title ? { title: node.title } : {}),
      ...(node.year ? { year: node.year } : {}),
    })),
    edges: edges
      .filter((edge) => edge.targetLiteratureItemId)
      .map((edge) => ({
        edgeId: edge.edgeId,
        source: edge.sourceLiteratureItemId,
        target: edge.targetLiteratureItemId!,
        mentionCount: 1,
      })),
  };
}

function projectMetricsRecords(args: {
  result: SynthesisCitationGraphMetricsResult;
  metricsHash: string;
  timestamp: string;
}): SynthesisCitationComplexMetricsRecord[] {
  const sourceStructureVersion = Date.parse(args.timestamp) || 0;
  return args.result.libraryNodeMetrics.map((row) => ({
    literatureItemId: row.nodeId,
    nodeId: row.nodeId,
    paperRef: row.paperRef,
    itemKey: row.itemKey,
    title: row.title,
    year: row.year,
    internalInDegree: row.internalInDegree,
    internalOutDegree: row.internalOutDegree,
    externalReferenceCount: row.externalReferenceCount,
    unresolvedReferenceCount: row.unresolvedReferenceCount,
    internalPagerank: row.internalPagerank,
    componentId: row.componentId,
    componentSize: row.componentSize,
    isIsolated: row.isIsolated,
    ageNorm: row.ageNorm,
    recencyNorm: row.recencyNorm,
    inDegreeNorm: row.inDegreeNorm,
    outDegreeNorm: row.outDegreeNorm,
    pagerankNorm: row.pagerankNorm,
    foundationScore: row.foundationScore,
    frontierScore: row.frontierScore,
    synthesisRoleHintsJson: JSON.stringify(row.synthesisRoleHints),
    sourceStructureVersion,
    sourceGraphHash: args.result.graphHash,
    metricsHash: args.metricsHash,
    status: "ready",
    updatedAt: args.timestamp,
  }));
}

function layoutViewKey(
  request: SynthesisCitationGraphApplicationLayoutRequest,
) {
  return hashSynthesisEngineCanonicalJson(request.scope);
}

function initialCoordinate(nodeId: string, axis: "x" | "y") {
  const hash = hashSynthesisEngineCanonicalJson({ nodeId, axis });
  const value = Number.parseInt(hash.slice(7, 15), 16) / 0xffffffff;
  return (value - 0.5) * 100;
}

function workerStatus(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "worker_busy") return "worker_busy" as const;
  if (code === "worker_canceled") return "stopping" as const;
  return "worker_failed" as const;
}

export function createSynthesisCitationGraphApplication(options: Options) {
  const { repository, compute } = options;
  const now = options.now ?? (() => new Date().toISOString());
  let operationSequence = 0;
  const createOperationId =
    options.createOperationId ??
    (() => `citation-graph-${Date.now()}-${++operationSequence}`);
  let stopping = false;
  let active: {
    controller: AbortController;
    promise: Promise<unknown>;
  } | null = null;
  repository.initializeCitationGraphApplication();

  const inspect = (): SynthesisCitationGraphApplicationInspectResult => {
    const state = repository.getCitationGraphApplicationState();
    const layoutPresets = repository
      .listCitationGraphLayouts()
      .filter(
        (row) => row.status === "ready" && row.graphHash === state?.graphHash,
      )
      .map((row) => row.preset)
      .filter(
        (preset): preset is SynthesisCitationGraphApplicationPreset =>
          preset === "force" || preset === "radial" || preset === "components",
      )
      .filter((preset, index, all) => all.indexOf(preset) === index)
      .sort();
    return rebuildSynthesisCitationGraphApplicationInspectResult({
      graphHash: state?.graphHash ?? null,
      inputHash: state?.inputHash ?? null,
      metricsHash: state?.metricsHash ?? null,
      nodeCount: state?.nodeCount ?? 0,
      edgeCount: state?.edgeCount ?? 0,
      metricsReady: Boolean(state?.metricsHash),
      layoutPresets,
    });
  };

  const runMutation = async (
    body: (
      controller: AbortController,
    ) => Promise<SynthesisCitationGraphApplicationMutationResult>,
  ) => {
    if (stopping)
      return emptyMutation(
        "stopping",
        repository.getCitationGraphApplicationState(),
      );
    if (active)
      return emptyMutation(
        "graph_application_busy",
        repository.getCitationGraphApplicationState(),
      );
    const controller = new AbortController();
    const promise = body(controller);
    active = { controller, promise };
    try {
      return await promise;
    } finally {
      if (active?.promise === promise) active = null;
    }
  };

  const refreshCommittedMetrics = async (
    state: SynthesisCitationGraphApplicationStateRecord,
    controller: AbortController,
  ) => {
    const request = metricRequest(
      state,
      repository.listCitationNodes(),
      repository.listCitationEdges(),
    );
    const result = rebuildSynthesisCitationGraphMetricsResult(
      await compute.metrics(request, { signal: controller.signal }),
      request,
    );
    const metricsHash = hashSynthesisEngineCanonicalJson(result);
    const timestamp = now();
    const promoted = repository.promoteCitationGraphComplexMetrics({
      expectedGraphHash: state.graphHash,
      metricsHash,
      records: projectMetricsRecords({ result, metricsHash, timestamp }),
      now: timestamp,
    });
    return promoted ? metricsHash : null;
  };

  const rebuildFull = (requestInput: unknown) =>
    runMutation(async (controller) => {
      let request;
      try {
        request =
          rebuildSynthesisCitationGraphApplicationRebuildRequest(requestInput);
      } catch {
        return emptyMutation(
          "invalid_request",
          repository.getCitationGraphApplicationState(),
        );
      }
      let graphInput: SynthesisCitationGraphBuildRequest;
      try {
        graphInput = rebuildSynthesisCitationGraphBuildRequest(request.input);
      } catch {
        return emptyMutation(
          "invalid_request",
          repository.getCitationGraphApplicationState(),
        );
      }
      const canonicalInput = canonicalizeSynthesisEngineJson(graphInput);
      if (
        byteLengthSynthesisEngineText(canonicalInput) >
          SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.rebuildRequestBytes ||
        countSynthesisEngineJsonNodes(graphInput) >
          SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.rebuildRequestJsonNodes
      ) {
        return emptyMutation(
          "invalid_request",
          repository.getCitationGraphApplicationState(),
        );
      }
      const current = repository.getCitationGraphApplicationState();
      if ((current?.graphHash ?? null) !== request.expectedGraphHash) {
        return emptyMutation("basis_mismatch", current);
      }
      const inputHash = hashSynthesisEngineCanonicalJson(graphInput);
      if (!request.force && current?.inputHash === inputHash) {
        return emptyMutation("unchanged", current);
      }
      const operationId = createOperationId();
      const timestamp = now();
      try {
        repository.upsertOperation?.({
          operationId,
          operationType: "citation_graph_application_rebuild",
          status: "running",
          phase: "build",
          basisKind: "graph_hash",
          basisValue: request.expectedGraphHash ?? "",
          sourceHash: inputHash,
          createdAt: timestamp,
          startedAt: timestamp,
          updatedAt: timestamp,
        });
      } catch {
        return emptyMutation("repair_required", current);
      }
      let result: SynthesisCitationGraphBuildResult;
      try {
        result = rebuildSynthesisCitationGraphBuildResult(
          await compute.build(graphInput, { signal: controller.signal }),
          graphInput,
        );
        if (
          countSynthesisEngineJsonNodes(result) >
          SYNTHESIS_CITATION_GRAPH_APPLICATION_LIMITS.rebuildResultJsonNodes
        ) {
          throw new Error("worker_result_invalid");
        }
      } catch (error) {
        const status = workerStatus(error);
        try {
          repository.updateOperationStatus?.({
            operationId,
            status: status === "stopping" ? "canceled" : "failed",
            phase: "build_failed",
          });
        } catch {
          // The graph has not committed; the stable worker failure still wins.
        }
        return emptyMutation(status, current);
      }
      const graphHash = hashSynthesisEngineCanonicalJson(result);
      try {
        const promoted = repository.replaceCitationGraphApplicationState({
          expectedGraphHash: request.expectedGraphHash,
          graphHash,
          inputHash,
          state: projectSynthesisCitationGraphBuildRecords({
            request: graphInput,
            result,
            timestamp,
          }),
          now: timestamp,
        });
        if (!promoted) {
          return emptyMutation(
            "basis_mismatch",
            repository.getCitationGraphApplicationState(),
          );
        }
      } catch {
        try {
          repository.updateOperationStatus?.({
            operationId,
            status: "failed",
            phase: "promotion_failed",
          });
        } catch {
          // Preserve the repository failure result.
        }
        return emptyMutation("repair_required", current);
      }

      const warnings: string[] = [];
      const committed = repository.getCitationGraphApplicationState()!;
      try {
        const metricsHash = await refreshCommittedMetrics(
          committed,
          controller,
        );
        if (!metricsHash) warnings.push(warningMetrics);
      } catch {
        warnings.push(warningMetrics);
      }
      try {
        repository.updateOperationStatus?.({
          operationId,
          status: "completed",
          phase: "complete",
        });
      } catch {
        warnings.push(warningReceipt);
      }
      return emptyMutation(
        "promoted",
        repository.getCitationGraphApplicationState(),
        warnings,
      );
    });

  const refreshMetrics = (requestInput: unknown) =>
    runMutation(async (controller) => {
      let request;
      try {
        request =
          rebuildSynthesisCitationGraphApplicationRefreshMetricsRequest(
            requestInput,
          );
      } catch {
        return emptyMutation(
          "invalid_request",
          repository.getCitationGraphApplicationState(),
        );
      }
      const state = repository.getCitationGraphApplicationState();
      if (!state || request.expectedGraphHash !== state.graphHash) {
        return emptyMutation("basis_mismatch", state);
      }
      try {
        const metricsHash = await refreshCommittedMetrics(state, controller);
        return metricsHash
          ? emptyMutation(
              "promoted",
              repository.getCitationGraphApplicationState(),
            )
          : emptyMutation(
              "basis_mismatch",
              repository.getCitationGraphApplicationState(),
            );
      } catch (error) {
        return emptyMutation(
          workerStatus(error),
          repository.getCitationGraphApplicationState(),
        );
      }
    });

  const readSlice = (requestInput: unknown) => {
    const request =
      rebuildSynthesisCitationGraphApplicationSliceRequest(requestInput);
    return projectSlice(repository, request);
  };

  const readMetrics = (requestInput: unknown = {}) => {
    const request =
      rebuildSynthesisCitationGraphApplicationMetricsRequest(requestInput);
    const state = repository.getCitationGraphApplicationState();
    const paperRefs = new Set(request.paperRefs);
    const rows = repository
      .listCitationComplexMetrics()
      .filter(
        (row) =>
          !paperRefs.size || (row.paperRef && paperRefs.has(row.paperRef)),
      )
      .sort((left, right) => {
        const difference =
          request.sortBy === "frontier"
            ? right.frontierScore - left.frontierScore
            : request.sortBy === "pagerank"
              ? right.internalPagerank - left.internalPagerank
              : request.sortBy === "in_degree"
                ? right.internalInDegree - left.internalInDegree
                : right.foundationScore - left.foundationScore;
        return (
          difference ||
          left.literatureItemId.localeCompare(right.literatureItemId)
        );
      });
    const offset = Number(request.cursor || 0);
    const page = rows.slice(offset, offset + request.limit);
    const next = offset + page.length;
    return {
      ready: Boolean(state?.metricsHash),
      graphHash: state?.graphHash ?? null,
      metricsHash: state?.metricsHash ?? null,
      records: page,
      cursor: request.cursor,
      nextCursor: next < rows.length ? String(next) : "",
      hasMore: next < rows.length,
      returned: page.length,
      total: rows.length,
      limit: request.limit,
    };
  };

  const readLayout = (requestInput: unknown) => {
    const request =
      rebuildSynthesisCitationGraphApplicationLayoutRequest(requestInput);
    const state = repository.getCitationGraphApplicationState();
    const viewKey = layoutViewKey(request);
    const record = repository.getCitationGraphLayout(
      `${viewKey}:${request.preset}`,
    );
    return {
      ready: Boolean(
        record &&
        record.status === "ready" &&
        record.graphHash === state?.graphHash,
      ),
      graphHash: state?.graphHash ?? null,
      preset: request.preset,
      scope: request.scope,
      layout: record?.layoutJson ? JSON.parse(record.layoutJson) : null,
    };
  };

  const recomputeLayout = (requestInput: unknown) =>
    runMutation(async (controller) => {
      let request: SynthesisCitationGraphApplicationLayoutRequest;
      try {
        request =
          rebuildSynthesisCitationGraphApplicationLayoutRequest(requestInput);
      } catch {
        return emptyMutation(
          "invalid_request",
          repository.getCitationGraphApplicationState(),
        );
      }
      const state = repository.getCitationGraphApplicationState();
      if (!state) return emptyMutation("basis_mismatch", null);
      const slice = layoutSlice(repository, request);
      const engineRequest: SynthesisCitationGraphLayoutRequest = {
        graphHash: state.graphHash,
        algorithm: request.preset,
        nodes: slice.nodes.map((node) => ({
          nodeId: node.literatureItemId,
          kind: synthesisCitationGraphRecordKind(node),
          ...(node.title ? { title: node.title } : {}),
          ...(node.year ? { year: node.year } : {}),
          initialX: initialCoordinate(node.literatureItemId, "x"),
          initialY: initialCoordinate(node.literatureItemId, "y"),
        })),
        edges: slice.edges
          .filter((edge) => edge.targetLiteratureItemId)
          .map((edge) => ({
            edgeId: edge.edgeId,
            source: edge.sourceLiteratureItemId,
            target: edge.targetLiteratureItemId!,
          })),
      };
      try {
        const result = rebuildSynthesisCitationGraphLayoutResult(
          await compute.layout(engineRequest, { signal: controller.signal }),
          engineRequest,
        );
        const viewKey = layoutViewKey(request);
        const promoted = repository.promoteCitationGraphLayout({
          expectedGraphHash: state.graphHash,
          record: {
            layoutKey: `${viewKey}:${request.preset}`,
            viewKey,
            preset: request.preset,
            graphHash: state.graphHash,
            status: "ready",
            layoutJson: canonicalizeSynthesisEngineJson(result),
            diagnosticsJson: "[]",
            updatedAt: now(),
          },
          now: now(),
        });
        return emptyMutation(
          promoted ? "promoted" : "basis_mismatch",
          repository.getCitationGraphApplicationState(),
        );
      } catch (error) {
        return emptyMutation(
          workerStatus(error),
          repository.getCitationGraphApplicationState(),
        );
      }
    });

  const stopAdmission = () => {
    stopping = true;
    active?.controller.abort();
  };

  const shutdown = async () => {
    stopAdmission();
    try {
      await active?.promise;
    } catch {
      // Mutation methods normalize worker failures; shutdown only drains them.
    }
  };

  return {
    inspect,
    readSlice,
    readMetrics,
    readLayout,
    rebuildFull,
    refreshMetrics,
    recomputeLayout,
    stopAdmission,
    shutdown,
  };
}

function projectSlice(
  repository: SynthesisCitationGraphApplicationRepository,
  request: SynthesisCitationGraphApplicationSliceRequest,
) {
  const allNodes = repository.listCitationNodes();
  const allEdges = repository.listCitationEdges();
  const byId = new Map(allNodes.map((node) => [node.literatureItemId, node]));
  if (!byId.has(request.rootNodeId)) return { nodes: [], edges: [] };
  const selected = new Set([request.rootNodeId]);
  let frontier = new Set([request.rootNodeId]);
  for (let depth = 0; depth < request.depth; depth += 1) {
    const next = new Set<string>();
    for (const edge of allEdges) {
      const target = edge.targetLiteratureItemId;
      if (!target) continue;
      const roles = (() => {
        try {
          return JSON.parse(edge.rolesJson || "[]") as string[];
        } catch {
          return [];
        }
      })();
      if (
        request.roleFilter.length &&
        !request.roleFilter.some((role) => roles.includes(role))
      ) {
        continue;
      }
      if (!request.includeLowSignal && edge.edgeStatus !== "accepted") continue;
      if (
        request.direction !== "incoming" &&
        frontier.has(edge.sourceLiteratureItemId)
      ) {
        next.add(target);
      }
      if (request.direction !== "outgoing" && frontier.has(target)) {
        next.add(edge.sourceLiteratureItemId);
      }
    }
    frontier = new Set(
      [...next]
        .filter((id) => byId.has(id) && !selected.has(id))
        .sort()
        .slice(0, Math.max(0, request.maxNodes - selected.size)),
    );
    frontier.forEach((id) => selected.add(id));
  }
  const nodes = [...selected]
    .sort()
    .slice(0, request.maxNodes)
    .map((id) => byId.get(id)!)
    .filter(Boolean);
  const allowed = new Set(nodes.map((node) => node.literatureItemId));
  const edges = allEdges
    .filter(
      (edge) =>
        allowed.has(edge.sourceLiteratureItemId) &&
        Boolean(
          edge.targetLiteratureItemId &&
          allowed.has(edge.targetLiteratureItemId),
        ),
    )
    .sort(
      (left, right) =>
        left.sourceLiteratureItemId.localeCompare(
          right.sourceLiteratureItemId,
        ) || left.edgeId.localeCompare(right.edgeId),
    )
    .slice(0, request.maxEdges);
  return { nodes, edges };
}

function layoutSlice(
  repository: SynthesisCitationGraphApplicationRepository,
  request: SynthesisCitationGraphApplicationLayoutRequest,
) {
  if (request.scope.kind === "slice") {
    const slice = projectSlice(repository, {
      rootNodeId: request.scope.rootNodeId,
      depth: request.scope.depth,
      direction: request.scope.direction,
      roleFilter: [],
      includeLowSignal: true,
      maxNodes: Number.MAX_SAFE_INTEGER,
      maxEdges: Number.MAX_SAFE_INTEGER,
    });
    return boundDefaultLayoutProjection(slice, request);
  }
  const allNodes = repository.listCitationNodes();
  const selectedIds =
    request.scope.kind === "explicit"
      ? new Set(request.scope.nodeIds)
      : new Set(allNodes.map((node) => node.literatureItemId));
  const candidateNodes = allNodes.filter((node) =>
    selectedIds.has(node.literatureItemId),
  );
  const candidateIds = new Set(
    candidateNodes.map((node) => node.literatureItemId),
  );
  const edges = repository
    .listCitationEdges()
    .filter(
      (edge) =>
        candidateIds.has(edge.sourceLiteratureItemId) &&
        Boolean(
          edge.targetLiteratureItemId &&
          candidateIds.has(edge.targetLiteratureItemId),
        ),
    );
  return boundDefaultLayoutProjection(
    { nodes: candidateNodes, edges },
    request,
  );
}

function boundDefaultLayoutProjection(
  records: {
    nodes: SynthesisCitationNodeRecord[];
    edges: SynthesisCitationEdgeRecord[];
  },
  request: Pick<
    SynthesisCitationGraphApplicationLayoutRequest,
    "maxNodes" | "maxEdges"
  >,
) {
  const projected = projectSynthesisCitationGraphDefaultRecords(records);
  const nodes = projected.nodes.slice(0, request.maxNodes);
  const allowed = new Set(nodes.map((node) => node.literatureItemId));
  const edges = projected.edges
    .filter(
      (edge) =>
        allowed.has(edge.sourceLiteratureItemId) &&
        Boolean(
          edge.targetLiteratureItemId &&
          allowed.has(edge.targetLiteratureItemId),
        ),
    )
    .slice(0, request.maxEdges);
  return { nodes, edges };
}
