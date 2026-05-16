export type SynthesisUiTab =
  | "overview"
  | "artifacts"
  | "registry"
  | "graph"
  | "reader";

export type SynthesisUiCoverage = "complete" | "partial" | "missing";

export type SynthesisUiFreshness = "fresh" | "stale" | "dirty" | "unknown";

export type SynthesisUiReadiness = "ready" | "partial";

export type SynthesisUiLayoutPreset = "compact" | "balanced" | "expanded";

export type SynthesisUiGraphElement =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export type SynthesisUiArtifactRow = {
  id: string;
  title: string;
  kind: "topic_synthesis";
  coverage: SynthesisUiCoverage;
  freshness: SynthesisUiFreshness;
  updated_at?: string;
  markdown_preview?: string;
  paper_count?: number;
  summary?: string;
  completion?: number;
};

export type SynthesisUiRegistryRow = {
  paper_ref: string;
  title: string;
  year?: string;
  readiness: SynthesisUiReadiness;
  coverage: SynthesisUiCoverage;
  missing_artifacts: string[];
};

export type SynthesisUiGraphNode = {
  id: string;
  label: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  year?: string;
  tags?: string[];
  collections?: string[];
  x?: number;
  y?: number;
  low_signal?: boolean;
};

export type SynthesisUiGraphEdge = {
  id: string;
  source: string;
  target: string;
  primary_role?: string;
  mention_count?: number;
};

export type SynthesisUiPreferencesStatus = {
  sourceWatchEnabled: boolean;
  registryAutoRebuild: boolean;
  graphRebuildMode: "off" | "idle" | "auto";
  stalenessScanEnabled: boolean;
  debounceMs: number;
  startupHashCheck: boolean;
};

export type SynthesisUiStorageStatus = {
  rootPath?: string;
  rootState: "missing" | "ready" | "unbound";
  anchorState: "missing" | "ready" | "degraded";
  mirrorState: "missing" | "ready" | "degraded";
};

export type SynthesisUiSyncDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SynthesisUiSyncStatus = {
  status:
    | "ready"
    | "missing_root"
    | "mirror_missing"
    | "mirror_degraded"
    | "divergent"
    | "index_dirty"
    | "check_skipped";
  diagnostics: SynthesisUiSyncDiagnostic[];
  allowedActions: string[];
  requiresConfirmation: boolean;
};

export type SynthesisUiConflictCandidate = {
  id: string;
  topic_id: string;
  created_at: string;
  bundle_hash: string;
  reason: string;
  status: "open" | "cleared";
};

export type SynthesisUiDeletedArtifactRow = {
  topic_id: string;
  title: string;
  deleted_at: string;
};

export type SynthesisUiState = {
  selectedTab: SynthesisUiTab;
  artifacts: {
    search: string;
    coverage: "all" | SynthesisUiCoverage;
    freshness: "all" | SynthesisUiFreshness;
    sort: "title" | "paper_count" | "updated_at";
    viewMode: "list" | "grid";
  };
  registry: {
    search: string;
    readiness: "all" | SynthesisUiReadiness;
    missingArtifact: "all" | string;
  };
  graph: {
    search: string;
    role: "all" | string;
    layoutPreset: SynthesisUiLayoutPreset;
    neighborhoodDepth: number;
    nodeKinds: SynthesisUiGraphNode["kind"][];
    showLowSignalUnresolved: boolean;
    selectedElement?: SynthesisUiGraphElement;
  };
  reader: {
    topicId: string;
    previousTab: Exclude<SynthesisUiTab, "reader">;
  };
};

export type SynthesisUiSnapshotInput = {
  libraryId: number;
  storage?: Partial<SynthesisUiStorageStatus>;
  preferences?: Partial<SynthesisUiPreferencesStatus>;
  sync?: Partial<SynthesisUiSyncStatus>;
  conflicts?: SynthesisUiConflictCandidate[];
  deletedArtifacts?: {
    rows?: SynthesisUiDeletedArtifactRow[];
  };
  artifacts?: SynthesisUiArtifactRow[];
  registry?: {
    rows?: SynthesisUiRegistryRow[];
  };
  graph?: {
    graph_hash?: string;
    layoutStatus?: "missing" | "ready" | "dirty";
    diagnostics?: Record<string, unknown>;
    nodes?: SynthesisUiGraphNode[];
    edges?: SynthesisUiGraphEdge[];
  };
};

export type SynthesisUiSnapshot = {
  libraryId: number;
  selectedTab: SynthesisUiTab;
  storage: SynthesisUiStorageStatus;
  preferences: SynthesisUiPreferencesStatus;
  sync: SynthesisUiSyncStatus;
  conflicts: {
    candidates: SynthesisUiConflictCandidate[];
  };
  deletedArtifacts: {
    count: number;
    rows: SynthesisUiDeletedArtifactRow[];
  };
  artifacts: {
    filters: SynthesisUiState["artifacts"];
    rows: SynthesisUiArtifactRow[];
    visibleRows: SynthesisUiArtifactRow[];
  };
  registry: {
    filters: SynthesisUiState["registry"];
    rows: SynthesisUiRegistryRow[];
    visibleRows: SynthesisUiRegistryRow[];
  };
  graph: {
    filters: Omit<SynthesisUiState["graph"], "selectedElement">;
    graph_hash: string;
    layoutStatus: "missing" | "ready" | "dirty";
    layoutPreset: SynthesisUiLayoutPreset;
    nodeKinds: SynthesisUiGraphNode["kind"][];
    showLowSignalUnresolved: boolean;
    selectedElement?: SynthesisUiGraphElement;
    nodes: SynthesisUiGraphNode[];
    edges: SynthesisUiGraphEdge[];
    diagnostics: Record<string, unknown>;
    visibleNodes: SynthesisUiGraphNode[];
    visibleEdges: SynthesisUiGraphEdge[];
  };
  reader: SynthesisUiState["reader"];
  hostCommands: SynthesisUiHostCommandName[];
};

export type SynthesisUiAction = {
  action: string;
  payload?: Record<string, unknown>;
};

export type SynthesisUiHostCommandName =
  | "openCanonicalMarkdown"
  | "openSynthesisFolder"
  | "runSynthesizeTopic"
  | "openZoteroItem"
  | "runMissingArtifactWorkflow"
  | "openPreferences"
  | "manualRecomputeLayout"
  | "deleteTopicArtifact"
  | "purgeDeletedTopicArtifacts";

export type SynthesisUiHostCommand = {
  command: SynthesisUiHostCommandName;
  args: Record<string, unknown>;
};

export type SynthesisUiActionResult = {
  handled: boolean;
  state: SynthesisUiState;
  hostCommand?: SynthesisUiHostCommand;
  reason?: "unknown_action" | "unknown_host_command" | "invalid_payload";
};

const HOST_COMMANDS: SynthesisUiHostCommandName[] = [
  "openCanonicalMarkdown",
  "openSynthesisFolder",
  "runSynthesizeTopic",
  "openZoteroItem",
  "runMissingArtifactWorkflow",
  "openPreferences",
  "manualRecomputeLayout",
  "deleteTopicArtifact",
  "purgeDeletedTopicArtifacts",
];

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function cleanNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function includesText(haystack: unknown, needle: string) {
  const query = needle.toLowerCase();
  if (!query) {
    return true;
  }
  return String(haystack || "").toLowerCase().includes(query);
}

function normalizeTab(value: unknown): SynthesisUiTab {
  const tab = cleanString(value);
  if (
    tab === "overview" ||
    tab === "artifacts" ||
    tab === "registry" ||
    tab === "graph" ||
    tab === "reader"
  ) {
    return tab;
  }
  return "overview";
}

function normalizeNonReaderTab(value: unknown): Exclude<SynthesisUiTab, "reader"> {
  const tab = normalizeTab(value);
  return tab === "reader" ? "artifacts" : tab;
}

function normalizeCoverage(value: unknown): SynthesisUiCoverage {
  const normalized = cleanString(value);
  if (
    normalized === "complete" ||
    normalized === "partial" ||
    normalized === "missing"
  ) {
    return normalized;
  }
  return "missing";
}

function normalizeFreshness(value: unknown): SynthesisUiFreshness {
  const normalized = cleanString(value);
  if (
    normalized === "fresh" ||
    normalized === "stale" ||
    normalized === "dirty" ||
    normalized === "unknown"
  ) {
    return normalized;
  }
  return "unknown";
}

function normalizeReadiness(value: unknown): SynthesisUiReadiness {
  return cleanString(value) === "ready" ? "ready" : "partial";
}

function normalizePreset(value: unknown): SynthesisUiLayoutPreset {
  const preset = cleanString(value);
  if (preset === "compact" || preset === "balanced" || preset === "expanded") {
    return preset;
  }
  return "balanced";
}

function normalizeStringList(values: unknown) {
  return Array.from(
    new Set(
      Array.isArray(values)
        ? values.map((entry) => cleanString(entry)).filter(Boolean)
        : [],
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeSyncDiagnostics(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      const severity = cleanString(row.severity);
      return {
        code: cleanString(row.code),
        severity:
          severity === "error" || severity === "warning"
            ? severity
            : ("info" as const),
        message: cleanString(row.message),
      };
    })
    .filter((entry): entry is SynthesisUiSyncDiagnostic => Boolean(entry?.code));
}

function normalizeSyncStatus(value: unknown): SynthesisUiSyncStatus["status"] {
  const status = cleanString(value);
  if (
    status === "missing_root" ||
    status === "mirror_missing" ||
    status === "mirror_degraded" ||
    status === "divergent" ||
    status === "index_dirty" ||
    status === "check_skipped"
  ) {
    return status;
  }
  return "ready";
}

function normalizeConflictCandidates(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        id: cleanString(row.id),
        topic_id: cleanString(row.topic_id),
        created_at: cleanString(row.created_at),
        bundle_hash: cleanString(row.bundle_hash),
        reason: cleanString(row.reason),
        status: row.status === "cleared" ? "cleared" : ("open" as const),
      };
    })
    .filter((entry): entry is SynthesisUiConflictCandidate =>
      Boolean(entry?.id && entry.status === "open"),
    )
    .sort(
      (left, right) =>
        right.created_at.localeCompare(left.created_at) ||
        left.id.localeCompare(right.id),
    );
}

function normalizeDeletedArtifactRows(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        topic_id: cleanString(row.topic_id),
        title: cleanString(row.title) || cleanString(row.topic_id),
        deleted_at: cleanString(row.deleted_at),
      };
    })
    .filter((entry): entry is SynthesisUiDeletedArtifactRow =>
      Boolean(entry?.topic_id),
    )
    .sort(
      (left, right) =>
        right.deleted_at.localeCompare(left.deleted_at) ||
        left.topic_id.localeCompare(right.topic_id),
    );
}

function normalizeArtifactRows(rows: SynthesisUiArtifactRow[] | undefined) {
  return [...(rows || [])]
    .map((row) => ({
      id: cleanString(row.id),
      title: cleanString(row.title) || cleanString(row.id),
      kind: "topic_synthesis" as const,
      coverage: normalizeCoverage(row.coverage),
      freshness: normalizeFreshness(row.freshness),
      updated_at: cleanString(row.updated_at) || undefined,
      markdown_preview: cleanString(row.markdown_preview) || undefined,
      paper_count: Math.max(0, Math.floor(cleanNumber(row.paper_count, 0))),
      summary: cleanString(row.summary) || undefined,
      completion: Math.max(
        0,
        Math.min(100, Math.floor(cleanNumber(row.completion, 0))),
      ),
    }))
    .filter((row) => row.id)
    .sort((left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id));
}

function normalizeRegistryRows(rows: SynthesisUiRegistryRow[] | undefined) {
  return [...(rows || [])]
    .map((row) => ({
      paper_ref: cleanString(row.paper_ref),
      title: cleanString(row.title) || cleanString(row.paper_ref),
      year: cleanString(row.year) || undefined,
      readiness: normalizeReadiness(row.readiness),
      coverage: normalizeCoverage(row.coverage),
      missing_artifacts: normalizeStringList(row.missing_artifacts),
    }))
    .filter((row) => row.paper_ref)
    .sort((left, right) =>
      left.title.localeCompare(right.title) || left.paper_ref.localeCompare(right.paper_ref),
    );
}

function normalizeGraphNodes(nodes: SynthesisUiGraphNode[] | undefined) {
  return [...(nodes || [])]
    .map((node) => ({
      id: cleanString(node.id),
      label: cleanString(node.label) || cleanString(node.id),
      kind:
        node.kind === "external_reference" || node.kind === "unresolved_reference"
          ? node.kind
          : ("library_paper" as const),
      year: cleanString(node.year) || undefined,
      tags: normalizeStringList(node.tags),
      collections: normalizeStringList(node.collections),
      x: typeof node.x === "number" ? node.x : undefined,
      y: typeof node.y === "number" ? node.y : undefined,
      low_signal: Boolean(node.low_signal),
    }))
    .filter((node) => node.id)
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
}

function normalizeGraphEdges(edges: SynthesisUiGraphEdge[] | undefined) {
  return [...(edges || [])]
    .map((edge) => ({
      id: cleanString(edge.id),
      source: cleanString(edge.source),
      target: cleanString(edge.target),
      primary_role: cleanString(edge.primary_role) || undefined,
      mention_count: Math.max(0, Math.floor(cleanNumber(edge.mention_count, 0))),
    }))
    .filter((edge) => edge.id && edge.source && edge.target)
    .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizeSelectedElement(value: unknown): SynthesisUiGraphElement | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as { kind?: unknown; id?: unknown };
  const kind = cleanString(candidate.kind);
  const id = cleanString(candidate.id);
  if (!id || (kind !== "node" && kind !== "edge")) {
    return undefined;
  }
  return { kind, id };
}

export function createDefaultSynthesisUiState(): SynthesisUiState {
  return {
    selectedTab: "overview",
    artifacts: {
      search: "",
      coverage: "all",
      freshness: "all",
      sort: "title",
      viewMode: "list",
    },
    registry: {
      search: "",
      readiness: "all",
      missingArtifact: "all",
    },
    graph: {
      search: "",
      role: "all",
      layoutPreset: "balanced",
      neighborhoodDepth: 1,
      nodeKinds: ["library_paper", "external_reference", "unresolved_reference"],
      showLowSignalUnresolved: false,
    },
    reader: {
      topicId: "",
      previousTab: "artifacts",
    },
  };
}

function filterArtifacts(
  rows: SynthesisUiArtifactRow[],
  filters: SynthesisUiState["artifacts"],
) {
  const filtered = rows.filter((row) => {
    if (!includesText(`${row.title} ${row.id}`, filters.search)) {
      return false;
    }
    if (filters.coverage !== "all" && row.coverage !== filters.coverage) {
      return false;
    }
    if (filters.freshness !== "all" && row.freshness !== filters.freshness) {
      return false;
    }
    return true;
  });
  return filtered.sort((left, right) => {
    if (filters.sort === "paper_count") {
      return (
        (right.paper_count || 0) - (left.paper_count || 0) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
      );
    }
    if (filters.sort === "updated_at") {
      return (
        String(right.updated_at || "").localeCompare(String(left.updated_at || "")) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
      );
    }
    return left.title.localeCompare(right.title) || left.id.localeCompare(right.id);
  });
}

function filterRegistry(
  rows: SynthesisUiRegistryRow[],
  filters: SynthesisUiState["registry"],
) {
  return rows.filter((row) => {
    if (!includesText(`${row.title} ${row.paper_ref} ${row.year || ""}`, filters.search)) {
      return false;
    }
    if (filters.readiness !== "all" && row.readiness !== filters.readiness) {
      return false;
    }
    if (
      filters.missingArtifact !== "all" &&
      !row.missing_artifacts.includes(filters.missingArtifact)
    ) {
      return false;
    }
    return true;
  });
}

function filterGraph(
  nodes: SynthesisUiGraphNode[],
  edges: SynthesisUiGraphEdge[],
  filters: SynthesisUiState["graph"],
) {
  const visibleNodes = nodes.filter((node) =>
    filters.nodeKinds.includes(node.kind) &&
    (filters.showLowSignalUnresolved || !node.low_signal) &&
    includesText(
      `${node.label} ${node.id} ${node.year || ""} ${(node.tags || []).join(" ")} ${(node.collections || []).join(" ")}`,
      filters.search,
    ),
  );
  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = edges.filter((edge) => {
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      return false;
    }
    if (filters.role !== "all" && edge.primary_role !== filters.role) {
      return false;
    }
    return true;
  });
  return { visibleNodes, visibleEdges };
}

export function buildSynthesisUiSnapshot(
  input: SynthesisUiSnapshotInput,
  state: SynthesisUiState = createDefaultSynthesisUiState(),
): SynthesisUiSnapshot {
  const artifactRows = normalizeArtifactRows(input.artifacts);
  const registryRows = normalizeRegistryRows(input.registry?.rows);
  const graphNodes = normalizeGraphNodes(input.graph?.nodes);
  const graphEdges = normalizeGraphEdges(input.graph?.edges);
  const deletedArtifactRows = normalizeDeletedArtifactRows(
    input.deletedArtifacts?.rows,
  );
  const filteredGraph = filterGraph(graphNodes, graphEdges, state.graph);

  return {
    libraryId: Math.max(0, Math.floor(cleanNumber(input.libraryId, 0))),
    selectedTab: normalizeTab(state.selectedTab),
    storage: {
      rootPath: cleanString(input.storage?.rootPath) || undefined,
      rootState:
        input.storage?.rootState === "ready" || input.storage?.rootState === "missing"
          ? input.storage.rootState
          : "unbound",
      anchorState:
        input.storage?.anchorState === "ready" ||
        input.storage?.anchorState === "degraded"
          ? input.storage.anchorState
          : "missing",
      mirrorState:
        input.storage?.mirrorState === "ready" ||
        input.storage?.mirrorState === "degraded"
          ? input.storage.mirrorState
          : "missing",
    },
    preferences: {
      sourceWatchEnabled: Boolean(input.preferences?.sourceWatchEnabled),
      registryAutoRebuild: Boolean(input.preferences?.registryAutoRebuild),
      graphRebuildMode:
        input.preferences?.graphRebuildMode === "idle" ||
        input.preferences?.graphRebuildMode === "auto"
          ? input.preferences.graphRebuildMode
          : "off",
      stalenessScanEnabled: Boolean(input.preferences?.stalenessScanEnabled),
      debounceMs: Math.max(0, Math.floor(cleanNumber(input.preferences?.debounceMs, 0))),
      startupHashCheck: Boolean(input.preferences?.startupHashCheck),
    },
    sync: {
      status: normalizeSyncStatus(input.sync?.status),
      diagnostics: normalizeSyncDiagnostics(input.sync?.diagnostics),
      allowedActions: normalizeStringList(input.sync?.allowedActions),
      requiresConfirmation: Boolean(input.sync?.requiresConfirmation),
    },
    conflicts: {
      candidates: normalizeConflictCandidates(input.conflicts),
    },
    deletedArtifacts: {
      count: deletedArtifactRows.length,
      rows: deletedArtifactRows,
    },
    artifacts: {
      filters: { ...state.artifacts },
      rows: artifactRows,
      visibleRows: filterArtifacts(artifactRows, state.artifacts),
    },
    registry: {
      filters: { ...state.registry },
      rows: registryRows,
      visibleRows: filterRegistry(registryRows, state.registry),
    },
    graph: {
      filters: {
        search: state.graph.search,
        role: state.graph.role,
        layoutPreset: normalizePreset(state.graph.layoutPreset),
        neighborhoodDepth: state.graph.neighborhoodDepth,
        nodeKinds: [...state.graph.nodeKinds],
        showLowSignalUnresolved: state.graph.showLowSignalUnresolved,
      },
      graph_hash: cleanString(input.graph?.graph_hash),
      layoutStatus:
        input.graph?.layoutStatus === "ready" || input.graph?.layoutStatus === "dirty"
          ? input.graph.layoutStatus
          : "missing",
      layoutPreset: normalizePreset(state.graph.layoutPreset),
      nodeKinds: [...state.graph.nodeKinds],
      showLowSignalUnresolved: state.graph.showLowSignalUnresolved,
      selectedElement: state.graph.selectedElement,
      nodes: graphNodes,
      edges: graphEdges,
      diagnostics:
        input.graph?.diagnostics && typeof input.graph.diagnostics === "object"
          ? { ...input.graph.diagnostics }
          : {},
      visibleNodes: filteredGraph.visibleNodes,
      visibleEdges: filteredGraph.visibleEdges,
    },
    reader: {
      topicId: cleanString(state.reader.topicId),
      previousTab: normalizeNonReaderTab(state.reader.previousTab),
    },
    hostCommands: [...HOST_COMMANDS],
  };
}

export function normalizeSynthesisUiSnapshot(
  input: SynthesisUiSnapshotInput,
): SynthesisUiSnapshot {
  return buildSynthesisUiSnapshot(input, createDefaultSynthesisUiState());
}

function normalizeAllOrCoverage(value: unknown) {
  return cleanString(value) === "all" ? "all" : normalizeCoverage(value);
}

function normalizeAllOrFreshness(value: unknown) {
  return cleanString(value) === "all" ? "all" : normalizeFreshness(value);
}

function normalizeAllOrReadiness(value: unknown) {
  return cleanString(value) === "all" ? "all" : normalizeReadiness(value);
}

function normalizeArtifactSort(value: unknown): SynthesisUiState["artifacts"]["sort"] {
  const normalized = cleanString(value);
  if (normalized === "paper_count" || normalized === "updated_at") {
    return normalized;
  }
  return "title";
}

function normalizeArtifactViewMode(
  value: unknown,
): SynthesisUiState["artifacts"]["viewMode"] {
  return cleanString(value) === "grid" ? "grid" : "list";
}

export function applySynthesisUiAction(
  state: SynthesisUiState,
  envelope: SynthesisUiAction,
): SynthesisUiActionResult {
  const action = cleanString(envelope.action);
  const payload = envelope.payload || {};
  const next: SynthesisUiState = {
    selectedTab: state.selectedTab,
    artifacts: { ...state.artifacts },
    registry: { ...state.registry },
    graph: { ...state.graph },
    reader: { ...state.reader },
  };

  if (action === "ready" || action === "refresh") {
    return { handled: true, state: next };
  }

  if (action === "selectTab") {
    next.selectedTab = normalizeTab(payload.tab);
    if (next.selectedTab !== "reader") {
      next.reader.previousTab = next.selectedTab;
    }
    return { handled: true, state: next };
  }

  if (action === "showArtifactReader") {
    const topicId = cleanString(payload.topicId);
    if (!topicId) {
      return { handled: false, state: next, reason: "invalid_payload" };
    }
    next.reader.topicId = topicId;
    next.reader.previousTab =
      "previousTab" in payload
        ? normalizeNonReaderTab(payload.previousTab)
        : state.selectedTab === "reader"
          ? normalizeNonReaderTab(state.reader.previousTab)
          : normalizeNonReaderTab(state.selectedTab);
    next.selectedTab = "reader";
    return { handled: true, state: next };
  }

  if (action === "closeArtifactReader") {
    next.selectedTab = normalizeNonReaderTab(state.reader.previousTab);
    next.reader.topicId = "";
    return { handled: true, state: next };
  }

  if (action === "setFilters") {
    if (payload.artifacts && typeof payload.artifacts === "object") {
      const filters = payload.artifacts as Record<string, unknown>;
      if ("search" in filters) {
        next.artifacts.search = cleanString(filters.search);
      }
      if ("coverage" in filters) {
        next.artifacts.coverage = normalizeAllOrCoverage(filters.coverage);
      }
      if ("freshness" in filters) {
        next.artifacts.freshness = normalizeAllOrFreshness(filters.freshness);
      }
      if ("sort" in filters) {
        next.artifacts.sort = normalizeArtifactSort(filters.sort);
      }
      if ("viewMode" in filters) {
        next.artifacts.viewMode = normalizeArtifactViewMode(filters.viewMode);
      }
    }
    if (payload.registry && typeof payload.registry === "object") {
      const filters = payload.registry as Record<string, unknown>;
      if ("search" in filters) {
        next.registry.search = cleanString(filters.search);
      }
      if ("readiness" in filters) {
        next.registry.readiness = normalizeAllOrReadiness(filters.readiness);
      }
      if ("missingArtifact" in filters) {
        next.registry.missingArtifact = cleanString(filters.missingArtifact) || "all";
      }
    }
    if (payload.graph && typeof payload.graph === "object") {
      const filters = payload.graph as Record<string, unknown>;
      if ("search" in filters) {
        next.graph.search = cleanString(filters.search);
      }
      if ("role" in filters) {
        next.graph.role = cleanString(filters.role) || "all";
      }
    }
    return { handled: true, state: next };
  }

  if (action === "setGraphView") {
    if ("layoutPreset" in payload) {
      next.graph.layoutPreset = normalizePreset(payload.layoutPreset);
    }
    if ("role" in payload) {
      next.graph.role = cleanString(payload.role) || "all";
    }
    if (Array.isArray(payload.nodeKinds)) {
      const allowed: SynthesisUiGraphNode["kind"][] = [
        "library_paper",
        "external_reference",
        "unresolved_reference",
      ];
      const normalized = Array.from(
        new Set(
          payload.nodeKinds
            .map(cleanString)
            .filter((entry): entry is SynthesisUiGraphNode["kind"] =>
              allowed.includes(entry as SynthesisUiGraphNode["kind"]),
            ),
        ),
      ).sort((left, right) => left.localeCompare(right));
      next.graph.nodeKinds = normalized.length ? normalized : allowed;
    }
    if ("showLowSignalUnresolved" in payload) {
      next.graph.showLowSignalUnresolved = Boolean(payload.showLowSignalUnresolved);
    }
    if ("selectedElement" in payload) {
      next.graph.selectedElement = normalizeSelectedElement(payload.selectedElement);
    }
    if ("neighborhoodDepth" in payload) {
      next.graph.neighborhoodDepth = Math.max(
        0,
        Math.min(4, Math.floor(cleanNumber(payload.neighborhoodDepth, 1))),
      );
    }
    return { handled: true, state: next };
  }

  if (action === "hostCommand") {
    const command = cleanString(payload.command) as SynthesisUiHostCommandName;
    if (!HOST_COMMANDS.includes(command)) {
      return {
        handled: false,
        state: next,
        reason: "unknown_host_command",
      };
    }
    const args =
      payload.args && typeof payload.args === "object"
        ? { ...(payload.args as Record<string, unknown>) }
        : {};
    return {
      handled: true,
      state: next,
      hostCommand: {
        command,
        args,
      },
    };
  }

  return { handled: false, state: next, reason: "unknown_action" };
}
