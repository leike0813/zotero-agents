// Narrowed wire projections, layout computation, and review-queue assembly
// for the Topics surface (topics/artifacts) of the synthesis workbench page.
//
// The wire view's host slots are `unknown` page-side; the narrowers here
// describe only the fields this surface reads and are consumed by the panel
// model when it projects a snapshot into the region selection. Pure helpers
// (layout, queue assembly, enum localization, host-command operation keys)
// mirror the legacy implementation in src/synthesisWorkbenchApp.ts
// renderTopics/renderTopicsGraph (:3248-4060) so the rendered behavior stays
// identical while the protocol payload shapes remain frozen.

import { safeText } from "../../shared/regionEquality";
import { SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES } from "../../shared/synthesisWorkbenchI18nContract";
import type { SynthesisWorkbenchMessageKey } from "../../shared/synthesisWorkbenchWireContract";

export type SynthesisWorkbenchTopicsText = (
  key: SynthesisWorkbenchMessageKey,
  vars?: Record<string, unknown>,
) => string;

// ---------------------------------------------------------------------------
// Generic narrowing primitives
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInt(value: unknown): number {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function clampPercent(value: unknown): number {
  const number = Number(value || 0);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, Math.floor(number)))
    : 0;
}

function firstTextOf(
  row: Record<string, unknown> | undefined,
  keys: string[],
): string {
  if (!row) return "";
  for (const key of keys) {
    const value = safeText(row[key]);
    if (value) return value;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Artifact rows (list/grid views)
// ---------------------------------------------------------------------------

export type TopicArtifactRowView = {
  id: string;
  title: string;
  definition: string;
  summary: string;
  markdownPreview: string;
  paperCount: number;
  sourceMaterialsStatus: "complete" | "partial" | "missing";
  sourceMaterialsPercent: number;
  freshness: string;
  updatedAt: string;
  candidateCount: number;
  updateAvailable: boolean;
};

export function narrowTopicArtifactRow(
  value: unknown,
): TopicArtifactRowView | null {
  if (!isRecord(value)) return null;
  const status = safeText(value.source_materials_status);
  const intent = isRecord(value.updateIntent) ? value.updateIntent : null;
  return {
    id: safeText(value.id),
    title: safeText(value.title),
    definition: safeText(value.definition),
    summary: safeText(value.summary),
    markdownPreview: safeText(value.markdown_preview),
    paperCount: nonNegativeInt(value.paper_count),
    sourceMaterialsStatus:
      status === "complete" || status === "partial" || status === "missing"
        ? status
        : "missing",
    sourceMaterialsPercent: clampPercent(value.source_materials_percent),
    freshness: safeText(value.freshness),
    updatedAt: safeText(value.updated_at),
    candidateCount: nonNegativeInt(value.candidate_count),
    updateAvailable: !!intent && !intent.blocked,
  };
}

export function narrowTopicArtifactRows(
  value: unknown,
): TopicArtifactRowView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = narrowTopicArtifactRow(entry);
    return row ? [row] : [];
  });
}

// ---------------------------------------------------------------------------
// Topic graph nodes / edges / inspector
// ---------------------------------------------------------------------------

export type TopicGraphMode = "hierarchy" | "neighborhood" | "unplaced";

export type TopicGraphNodeView = {
  topicId: string;
  title: string;
  paperCount: number;
  nodeType: string;
  isTop: boolean;
  relationStatuses: string[];
};

export function narrowTopicGraphNode(
  value: unknown,
): TopicGraphNodeView | null {
  if (!isRecord(value)) return null;
  return {
    topicId: safeText(value.topic_id),
    title: safeText(value.title),
    paperCount: nonNegativeInt(value.paper_count),
    nodeType: safeText(value.node_type),
    isTop: Boolean(value.is_root) || value.level === "top",
    relationStatuses: Array.isArray(value.relation_statuses)
      ? value.relation_statuses.map((entry) => safeText(entry)).filter(Boolean)
      : [],
  };
}

export function narrowTopicGraphNodes(value: unknown): TopicGraphNodeView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const node = narrowTopicGraphNode(entry);
    return node ? [node] : [];
  });
}

export type TopicGraphEdgeView = {
  sourceTopicId: string;
  targetTopicId: string;
  relation: string;
  status: string;
};

export function narrowTopicGraphEdge(
  value: unknown,
): TopicGraphEdgeView | null {
  if (!isRecord(value)) return null;
  return {
    sourceTopicId: safeText(value.source_topic_id),
    targetTopicId: safeText(value.target_topic_id),
    relation: safeText(value.relation) || "related_to",
    status: safeText(value.status) || "suggested",
  };
}

export function narrowTopicGraphEdges(value: unknown): TopicGraphEdgeView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const edge = narrowTopicGraphEdge(entry);
    return edge ? [edge] : [];
  });
}

export type TopicGraphInspectorTopicView = TopicGraphNodeView & {
  definition: string;
  lastSynthesisAt: string;
};

export type TopicGraphInspectorView = {
  topic: TopicGraphInspectorTopicView | null;
  parents: TopicGraphNodeView[];
  children: TopicGraphNodeView[];
  related: Array<{
    node: TopicGraphNodeView;
    relation: string;
    status: string;
  }>;
  suggestedCount: number;
};

export function narrowTopicGraphInspector(
  value: unknown,
): TopicGraphInspectorView | null {
  if (!isRecord(value)) return null;
  const topicNode = narrowTopicGraphNode(value.topic);
  return {
    topic: topicNode
      ? {
          ...topicNode,
          definition: firstTextOf(value.topic as Record<string, unknown>, [
            "definition",
            "short_definition",
            "summary",
          ]),
          lastSynthesisAt: isRecord(value.topic)
            ? safeText(value.topic.last_synthesis_at)
            : "",
        }
      : null,
    parents: narrowTopicGraphNodes(value.parents),
    children: narrowTopicGraphNodes(value.children),
    related: (Array.isArray(value.related) ? value.related : []).flatMap(
      (entry) => {
        if (!isRecord(entry)) return [];
        const node = narrowTopicGraphNode(entry.node);
        if (!node) return [];
        return [
          {
            node,
            relation: safeText(entry.relation),
            status: safeText(entry.status),
          },
        ];
      },
    ),
    suggestedCount: nonNegativeInt(value.suggestedCount),
  };
}

// ---------------------------------------------------------------------------
// Topic relation review queue (inspector review panel)
// ---------------------------------------------------------------------------

export type TopicGraphSuggestedRelationView = {
  edgeId: string;
  sourceTopicId: string;
  targetTopicId: string;
  relation: string;
  status: string;
  confidence?: unknown;
  evidence?: unknown;
  provenance?: unknown;
};

export function narrowTopicGraphSuggestedRelations(
  value: unknown,
): TopicGraphSuggestedRelationView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    return [
      {
        edgeId: safeText(entry.edge_id),
        sourceTopicId: safeText(entry.source_topic_id),
        targetTopicId: safeText(entry.target_topic_id),
        relation: safeText(entry.relation),
        status: safeText(entry.status) || "suggested",
        confidence: entry.confidence,
        evidence: entry.evidence_refs,
        provenance: entry.provenance,
      },
    ];
  });
}

export type TopicGraphRelationReviewItemView = {
  reviewId: string;
  sourceTopicId: string;
  targetTopicId: string;
  targetTitle: string;
  relation: string;
  status: string;
  reason: string;
  confidence?: unknown;
  evidence?: unknown;
  provenance?: unknown;
};

export function narrowTopicGraphRelationReviewItems(
  value: unknown,
): TopicGraphRelationReviewItemView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    return [
      {
        reviewId: safeText(entry.review_id),
        sourceTopicId: safeText(entry.source_topic_id),
        targetTopicId: safeText(entry.target_topic_id),
        targetTitle: safeText(entry.target_title),
        relation: safeText(entry.relation) || safeText(entry.proposal_type),
        status: safeText(entry.status) || "open",
        reason: safeText(entry.reason),
        confidence: entry.confidence,
        evidence: entry.evidence_refs || entry.evidence,
        provenance: entry.provenance,
      },
    ];
  });
}

export type TopicRelationReviewEntry = {
  key: string;
  kind: "suggestion" | "review";
  edgeId?: string;
  reviewId?: string;
  sourceTitle: string;
  targetTitle: string;
  relation: string;
  status: string;
  confidence?: unknown;
  evidence?: unknown;
  provenance?: unknown;
  body: string;
};

/**
 * Legacy renderTopicGraphReviewPanel queue assembly: suggested relations
 * first, then relation review items, both minus entries the controller has
 * optimistically resolved. Title resolution walks all topic-graph nodes, then
 * falls back to the raw topic id; the component applies the final localized
 * "Source topic"/"Target topic" fallback for empty titles.
 */
export function buildTopicRelationReviewQueue(args: {
  suggestions: TopicGraphSuggestedRelationView[];
  relationReviews: TopicGraphRelationReviewItemView[];
  nodes: TopicGraphNodeView[];
  isResolved: (kind: "topic-edge" | "topic-review", id: string) => boolean;
}): TopicRelationReviewEntry[] {
  const nodesById = new Map(args.nodes.map((node) => [node.topicId, node]));
  const suggestions = args.suggestions
    .filter((relation) => !args.isResolved("topic-edge", relation.edgeId))
    .map(
      (relation): TopicRelationReviewEntry => ({
        key: `suggestion:${relation.edgeId}`,
        kind: "suggestion",
        edgeId: relation.edgeId,
        sourceTitle:
          nodesById.get(relation.sourceTopicId)?.title ||
          relation.sourceTopicId,
        targetTitle:
          nodesById.get(relation.targetTopicId)?.title ||
          relation.targetTopicId,
        relation: relation.relation,
        status: relation.status,
        confidence: relation.confidence,
        evidence: relation.evidence,
        provenance: relation.provenance,
        body: "",
      }),
    );
  const reviews = args.relationReviews
    .filter((item) => !args.isResolved("topic-review", item.reviewId))
    .map(
      (item): TopicRelationReviewEntry => ({
        key: `review:${item.reviewId}`,
        kind: "review",
        reviewId: item.reviewId,
        sourceTitle:
          nodesById.get(item.sourceTopicId)?.title || item.sourceTopicId,
        targetTitle:
          item.targetTitle ||
          nodesById.get(item.targetTopicId)?.title ||
          item.targetTopicId,
        relation: item.relation,
        status: item.status,
        confidence: item.confidence,
        evidence: item.evidence,
        provenance: item.provenance,
        body: item.reason,
      }),
    );
  return [...suggestions, ...reviews];
}

export function wrapReviewIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

// ---------------------------------------------------------------------------
// Topic graph layout (legacy computeTopicGraphLayout, operating on views)
// ---------------------------------------------------------------------------

export type TopicGraphLayoutEntry = {
  node: TopicGraphNodeView;
  x: number;
  y: number;
  role: string;
};

function distribute(index: number, count: number, min = 14, max = 86): number {
  if (count <= 1) return 50;
  return min + ((max - min) * index) / (count - 1);
}

function clampPosition(value: number): number {
  return Math.max(8, Math.min(92, value));
}

function topicGraphNodeRole(
  node: TopicGraphNodeView,
  fallback: string,
): string {
  if (node.isTop) return "root";
  if (node.relationStatuses.includes("suggested")) return "suggested";
  if (node.relationStatuses.includes("confirmed")) return "linked";
  return fallback;
}

export function computeTopicGraphLayout(args: {
  mode: TopicGraphMode;
  nodes: TopicGraphNodeView[];
  edges: TopicGraphEdgeView[];
  inspector: TopicGraphInspectorView | null;
}): TopicGraphLayoutEntry[] {
  const { nodes } = args;
  const byId = new Map(nodes.map((node) => [node.topicId, node]));
  const placed = new Map<string, TopicGraphLayoutEntry>();
  const place = (
    node: TopicGraphNodeView | undefined | null,
    x: number,
    y: number,
    role: string,
  ) => {
    if (!node) return;
    const id = node.topicId;
    if (!id || placed.has(id)) return;
    placed.set(id, {
      node,
      x: clampPosition(x),
      y: clampPosition(y),
      role: topicGraphNodeRole(node, role),
    });
  };

  const inspector = args.inspector;
  if (args.mode === "neighborhood" && inspector?.topic) {
    place(byId.get(inspector.topic.topicId), 50, 50, "selected");
    inspector.parents.forEach((node, index, group) =>
      place(
        byId.get(node.topicId),
        distribute(index, group.length),
        18,
        "parent",
      ),
    );
    inspector.children.forEach((node, index, group) =>
      place(
        byId.get(node.topicId),
        distribute(index, group.length),
        82,
        "child",
      ),
    );
    inspector.related.forEach((entry, index, group) => {
      const side = index % 2 === 0 ? 20 : 80;
      const row = Math.floor(index / 2);
      const rows = Math.ceil(group.length / 2);
      place(
        byId.get(entry.node.topicId),
        side,
        distribute(row, rows, 34, 66),
        "related",
      );
    });
    const leftovers = nodes.filter((node) => !placed.has(node.topicId));
    leftovers.forEach((node, index) =>
      place(node, distribute(index, leftovers.length, 20, 80), 66, "related"),
    );
    return [...placed.values()];
  }

  if (args.mode === "unplaced") {
    const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
    const rows = Math.max(1, Math.ceil(nodes.length / columns));
    nodes.forEach((node, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      place(
        node,
        distribute(column, columns, 18, 82),
        distribute(row, rows, 24, 76),
        "unplaced",
      );
    });
    return [...placed.values()];
  }

  const depths = new Map(nodes.map((node) => [node.topicId, 0]));
  const broaderEdges = args.edges.filter(
    (edge) =>
      edge.relation === "broader_than" &&
      byId.has(edge.sourceTopicId) &&
      byId.has(edge.targetTopicId),
  );
  for (let pass = 0; pass < nodes.length; pass += 1) {
    broaderEdges.forEach((edge) => {
      depths.set(
        edge.targetTopicId,
        Math.max(
          depths.get(edge.targetTopicId) || 0,
          (depths.get(edge.sourceTopicId) || 0) + 1,
        ),
      );
    });
  }
  const maxDepth = Math.max(0, ...Array.from(depths.values()));
  const groups = new Map<number, TopicGraphNodeView[]>();
  nodes.forEach((node) => {
    const depth = depths.get(node.topicId) || 0;
    groups.set(depth, [...(groups.get(depth) || []), node]);
  });
  Array.from(groups.entries())
    .sort(([left], [right]) => left - right)
    .forEach(([depth, group]) => {
      group
        .sort((left, right) => left.title.localeCompare(right.title))
        .forEach((node, index) =>
          place(
            node,
            distribute(index, group.length, 16, 84),
            maxDepth ? distribute(depth, maxDepth + 1, 18, 82) : 50,
            depth === 0 ? "root" : "child",
          ),
        );
    });
  return [...placed.values()];
}

// ---------------------------------------------------------------------------
// Enum localization (legacy maybeLocalizedValue) and badge tones
// ---------------------------------------------------------------------------

const CONTROLLED_ENUM_DOMAINS = [
  "status",
  "kind",
  "reason",
  "relation",
  "action",
  "confidence",
  "coverage",
  "coverage-caveat",
  "freshness",
  "binding-status",
  "priority",
  "graph-node-kind",
  "graph-edge-role",
  "graph-layout",
  "tag-status",
  "tag-density",
  "concept-type",
  "review-tab",
  "sync-status",
  "scope",
] as const;

function enumKeyPart(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function messageKeyOrUndefined(candidate: string) {
  const key = candidate as SynthesisWorkbenchMessageKey;
  return key in SYNTHESIS_WORKBENCH_DEFAULT_MESSAGES ? key : undefined;
}

/**
 * Resolve a raw wire enum token to a localized label: status keys, relation
 * keys, then the controlled enum domains; falls back to the raw token.
 */
export function localizedEnumText(
  value: unknown,
  t: SynthesisWorkbenchTopicsText,
): string {
  const text = safeText(value);
  if (!text) return "";
  const normalized = text.replace(/_/g, "-").toLowerCase();
  const statusKey = messageKeyOrUndefined(`synthesis-status-${normalized}`);
  if (statusKey) return t(statusKey);
  const relationKey = messageKeyOrUndefined(`synthesis-relation-${normalized}`);
  if (relationKey) return t(relationKey);
  const keyPart = enumKeyPart(text);
  if (keyPart) {
    for (const domain of CONTROLLED_ENUM_DOMAINS) {
      const enumKey = messageKeyOrUndefined(
        `synthesis-enum-${domain}-${keyPart}`,
      );
      if (enumKey) return t(enumKey);
    }
  }
  return text;
}

/** Legacy toneFor: everything not ok/danger collapses to "warn". */
export function topicToneFor(value: unknown): string {
  if (value === "ready" || value === "fresh" || value === "complete") {
    return "ok";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "warn";
}

export function topicSourceMaterialsLabel(
  row: TopicArtifactRowView,
  t: SynthesisWorkbenchTopicsText,
): string {
  if (row.sourceMaterialsStatus === "complete") {
    return t("synthesis-source-materials-ready");
  }
  if (row.sourceMaterialsStatus === "missing") {
    return t("synthesis-source-materials-missing");
  }
  return t("synthesis-source-materials-percent-ready", {
    percent: row.sourceMaterialsPercent,
  });
}

export function topicSourceMaterialsTone(row: TopicArtifactRowView): string {
  if (
    row.sourceMaterialsStatus === "complete" &&
    row.sourceMaterialsPercent >= 100
  ) {
    return "ok";
  }
  if (row.sourceMaterialsPercent >= 50) {
    return "warn";
  }
  return "danger";
}

// ---------------------------------------------------------------------------
// Review metadata compaction (legacy renderReviewMetadata/compactReviewValue)
// ---------------------------------------------------------------------------

function objectEntriesNonEmpty(value: Record<string, unknown>): boolean {
  return Object.entries(value).some(([, entry]) => {
    if (Array.isArray(entry)) return entry.length > 0;
    if (isRecord(entry)) return Object.keys(entry).length > 0;
    return !!safeText(entry);
  });
}

export function hasStructuredContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (isRecord(value)) return objectEntriesNonEmpty(value);
  return !!safeText(value);
}

export function compactReviewValue(
  value: unknown,
  t: SynthesisWorkbenchTopicsText,
): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (isRecord(entry)) {
          return (
            firstTextOf(entry, ["label", "title", "tag", "id", "code"]) ||
            JSON.stringify(entry)
          );
        }
        return localizedEnumText(entry, t) || safeText(entry);
      })
      .filter(Boolean)
      .slice(0, 4)
      .join(", ");
  }
  if (isRecord(value)) {
    return (
      firstTextOf(value, ["message", "summary", "label", "title", "code"]) ||
      JSON.stringify(value)
    );
  }
  return safeText(value ?? "-");
}

// ---------------------------------------------------------------------------
// Host command operation keys (pending/busy button state)
// ---------------------------------------------------------------------------

function keyPart(value: unknown, fallback = "all"): string {
  return safeText(value).replace(/\s+/g, "_") || fallback;
}

/**
 * Legacy operationKey restricted to the host commands this surface issues;
 * used to match buttons against the pending operation key list in the
 * selection (localPendingActions keys + snapshot.actions.inFlight keys).
 */
export function topicsHostCommandOperationKey(
  command: string,
  args?: Record<string, unknown>,
): string {
  switch (command) {
    case "acceptTopicGraphRelation":
    case "rejectTopicGraphRelation":
      return `decideTopicGraphRelation:${keyPart(args?.edgeId)}`;
    case "applyTopicGraphReviewAction":
      return `applyTopicGraphReviewAction:${keyPart(args?.reviewId)}`;
    case "submitTopicSynthesisUpdate":
      return `${command}:${keyPart(args?.topicId)}:${keyPart(args?.language, "auto")}`;
    case "openTopicArtifact":
    case "deleteTopicArtifact":
      return `${command}:${keyPart(args?.topicId)}`;
    default:
      return command;
  }
}

/** Legacy operationLabel: message key for the command, if one exists. */
export function topicHostCommandLabelKey(
  command: string,
): SynthesisWorkbenchMessageKey | undefined {
  return messageKeyOrUndefined(`synthesis-operation-${command}`);
}
