import Graph from "graphology";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import { hashCanonicalJson, sha256 } from "./foundation";

export type CitationGraphReferenceInput = {
  citekey?: string;
  doi?: string;
  arxiv?: string;
  isbn?: string;
  url?: string;
  title?: string;
  year?: string;
  authors?: string[];
  raw?: string;
  roles?: string[];
};

export type CitationGraphPaperInput = {
  libraryId: number;
  itemKey: string;
  title: string;
  year?: string;
  authors?: string[];
  doi?: string;
  arxiv?: string;
  isbn?: string;
  url?: string;
  citekey?: string;
  hasAttachment?: boolean;
  dateAdded?: string;
  references?: CitationGraphReferenceInput[];
};

export type CitationGraphNode = {
  node_id: string;
  kind: "library_paper" | "external_reference" | "unresolved_reference";
  target_state: "library" | "external" | "unresolved";
  item_key?: string;
  library_id?: number;
  provisional_key?: string;
  aliases: string[];
  title?: string;
  year?: string;
  authors?: string[];
  low_signal?: boolean;
  external_degree?: number;
  visibility?: "default" | "hover_only";
  display_tier?: "library" | "shared_external" | "single_external";
};

export type CitationGraphEdge = {
  edge_id: string;
  source: string;
  target: string;
  kind: "citation";
  mention_count: number;
  primary_role: string;
  aux_roles: Array<{ role: string; count: number }>;
  role_evidence: Array<{ role: string; count: number }>;
  source_refs: string[];
  visibility?: "default" | "hover_only";
};

export type CitationGraph = {
  schema_id: "synthesis.unified_citation_graph";
  schema_version: "1.0.0";
  nodes: CitationGraphNode[];
  edges: CitationGraphEdge[];
  diagnostics: {
    promotions: Array<{
      from: string;
      to: string;
      reason: "provisional_key_match";
      key_kind: string;
      confidence: "deterministic";
    }>;
    duplicates: Array<{
      provisional_key: string;
      canonical_node_id: string;
      duplicate_node_ids: string[];
    }>;
    node_counts: Record<CitationGraphNode["kind"], number>;
    reference_stats: {
      total: number;
      promoted: number;
      external: number;
      unresolved: number;
      dropped_empty: number;
      merged_external_nodes: number;
      merged_unresolved_nodes: number;
    };
  };
  graph_hash: string;
};

export type CitationGraphLibraryNodeMetrics = {
  node_id: string;
  paper_ref?: string;
  item_key?: string;
  title?: string;
  year?: string;
  internal_in_degree: number;
  internal_out_degree: number;
  external_reference_count: number;
  unresolved_reference_count: number;
  internal_pagerank: number;
  component_id: string;
  component_size: number;
  is_isolated: boolean;
  age_norm: number;
  recency_norm: number;
  in_degree_norm: number;
  out_degree_norm: number;
  pagerank_norm: number;
  foundation_score: number;
  frontier_score: number;
  synthesis_role_hints: string[];
};

export type CitationGraphMetrics = {
  schema_id: "synthesis.unified_citation_graph_metrics";
  schema_version: "1.0.0";
  graph_hash: string;
  metrics_version: 1;
  params: {
    pagerank_damping: number;
    pagerank_iterations: number;
    foundation_formula: string;
    frontier_formula: string;
  };
  graph_year: number | null;
  library_node_metrics: CitationGraphLibraryNodeMetrics[];
  diagnostics: {
    library_node_count: number;
    external_reference_count: number;
    unresolved_reference_count: number;
    component_count: number;
    isolated_library_node_count: number;
    missing_year_count: number;
  };
  metrics_hash: string;
};

export type CitationLayoutAlgorithm = "force" | "radial" | "components";

export type CitationGraphLayout = {
  graph_hash: string;
  layout_engine: "d3-force" | "radial" | "components";
  layout_version: number;
  algorithm: CitationLayoutAlgorithm;
  preset: CitationLayoutAlgorithm;
  params: Record<string, number | string>;
  nodes: Record<string, { x: number; y: number }>;
  layout_hash: string;
};

export const CITATION_GRAPH_LAYOUT_VERSION = 1.2;

const FORCE_LAYOUT_PARAMS = {
  link_distance: 180,
  charge: -520,
  collision_radius: 24,
  iterations: 700,
  isolated_radius: 72,
  isolated_gap: 96,
};

const RADIAL_LAYOUT_PARAMS = {
  library_radius_step: 82,
  external_offset: 76,
  fallback_radius_step: 64,
  golden_angle: 2.399963229728653,
};

const COMPONENT_LAYOUT_PARAMS = {
  component_gap: 360,
  node_gap: 54,
  golden_angle: 2.399963229728653,
};

export function normalizeCitationLayoutAlgorithm(
  value: unknown,
): CitationLayoutAlgorithm {
  const algorithm = normalizeText(value);
  if (algorithm === "radial" || algorithm === "components") {
    return algorithm;
  }
  return "force";
}

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

function normalizeRawText(value: unknown) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
}

function slug(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCitekey(value: unknown) {
  return slug(value);
}

function normalizeDoi(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:/, "")
    .trim();
}

function normalizeArxiv(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, "")
    .replace(/\.pdf$/, "")
    .replace(/^arxiv:/, "")
    .trim();
}

function normalizeUrl(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/#.*$/, "")
    .replace(/\/+$/, "");
}

function keyKind(key: string) {
  if (key.startsWith("ref:citekey:")) {
    return "citekey";
  }
  if (key.startsWith("ref:doi:")) {
    return "doi";
  }
  if (key.startsWith("ref:arxiv:")) {
    return "arxiv";
  }
  if (key.startsWith("ref:url:")) {
    return "url";
  }
  if (key.startsWith("ref:titleyearauthor:")) {
    return "title_year_first_author";
  }
  if (key.startsWith("ref:raw:")) {
    return "raw";
  }
  return "unknown";
}

export function provisionalReferenceKey(input: {
  citekey?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  title?: string;
  year?: string;
  authors?: string[];
  raw?: string;
}) {
  const citekey = normalizeCitekey(input.citekey);
  if (citekey) {
    return `ref:citekey:${citekey}`;
  }
  const doi = normalizeDoi(input.doi);
  if (doi) {
    return `ref:doi:${doi}`;
  }
  const arxiv = normalizeArxiv(input.arxiv);
  if (arxiv) {
    return `ref:arxiv:${arxiv}`;
  }
  const url = normalizeUrl(input.url);
  if (url) {
    return `ref:url:${slug(url)}`;
  }
  const title = slug(input.title);
  const year = slug(input.year);
  const firstAuthor = slug((input.authors || [])[0]);
  if (title && year && firstAuthor) {
    return `ref:titleyearauthor:${title}:${year}:${firstAuthor}`;
  }
  const raw = normalizeRawText(input.raw);
  if (raw) {
    return `ref:raw:${sha256(raw).slice("sha256:".length, "sha256:".length + 24)}`;
  }
  return "";
}

function referenceIdentityKeys(input: {
  citekey?: string;
  doi?: string;
  arxiv?: string;
  url?: string;
  title?: string;
  year?: string;
  authors?: string[];
  raw?: string;
}) {
  const keys: string[] = [];
  const citekey = normalizeCitekey(input.citekey);
  if (citekey) {
    keys.push(`ref:citekey:${citekey}`);
  }
  const doi = normalizeDoi(input.doi);
  if (doi) {
    keys.push(`ref:doi:${doi}`);
  }
  const arxiv = normalizeArxiv(input.arxiv);
  if (arxiv) {
    keys.push(`ref:arxiv:${arxiv}`);
  }
  const url = normalizeUrl(input.url);
  if (url) {
    keys.push(`ref:url:${slug(url)}`);
  }
  const title = slug(input.title);
  const year = slug(input.year);
  const firstAuthor = slug((input.authors || [])[0]);
  if (title && year && firstAuthor) {
    keys.push(`ref:titleyearauthor:${title}:${year}:${firstAuthor}`);
  }
  const raw = normalizeRawText(input.raw);
  if (raw) {
    keys.push(
      `ref:raw:${sha256(raw).slice("sha256:".length, "sha256:".length + 24)}`,
    );
  }
  return Array.from(new Set(keys));
}

function paperNodeId(paper: CitationGraphPaperInput) {
  return `zotero:item:${normalizeText(paper.itemKey)}`;
}

function basePaperNode(paper: CitationGraphPaperInput): CitationGraphNode {
  return {
    node_id: paperNodeId(paper),
    kind: "library_paper",
    target_state: "library",
    item_key: normalizeText(paper.itemKey),
    library_id: Number(paper.libraryId),
    aliases: referenceIdentityKeys(paper),
    title: normalizeText(paper.title),
    year: normalizeText(paper.year),
    authors: [...(paper.authors || [])],
  };
}

function compareCanonicalPaper(
  left: CitationGraphPaperInput,
  right: CitationGraphPaperInput,
) {
  const leftHasDoi = normalizeDoi(left.doi) ? 1 : 0;
  const rightHasDoi = normalizeDoi(right.doi) ? 1 : 0;
  if (leftHasDoi !== rightHasDoi) {
    return rightHasDoi - leftHasDoi;
  }
  const leftAttachment = left.hasAttachment ? 1 : 0;
  const rightAttachment = right.hasAttachment ? 1 : 0;
  if (leftAttachment !== rightAttachment) {
    return rightAttachment - leftAttachment;
  }
  const leftDate = normalizeText(left.dateAdded) || "9999";
  const rightDate = normalizeText(right.dateAdded) || "9999";
  const dateCompare = leftDate.localeCompare(rightDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }
  return normalizeText(left.itemKey).localeCompare(
    normalizeText(right.itemKey),
  );
}

function groupCanonicalPapers(papers: CitationGraphPaperInput[]) {
  const byKey = new Map<string, CitationGraphPaperInput[]>();
  for (const paper of papers) {
    for (const key of referenceIdentityKeys(paper).filter(
      (entry) => !entry.startsWith("ref:raw:"),
    )) {
      const existing = byKey.get(key) || [];
      existing.push(paper);
      byKey.set(key, existing);
    }
  }
  const canonicalByKey = new Map<string, CitationGraphPaperInput>();
  const duplicateDiagnostics: CitationGraph["diagnostics"]["duplicates"] = [];
  for (const [key, entries] of byKey.entries()) {
    const sorted = [...entries].sort(compareCanonicalPaper);
    const canonical = sorted[0];
    canonicalByKey.set(key, canonical);
    if (sorted.length > 1) {
      duplicateDiagnostics.push({
        provisional_key: key,
        canonical_node_id: paperNodeId(canonical),
        duplicate_node_ids: sorted.slice(1).map(paperNodeId),
      });
    }
  }
  return { canonicalByKey, duplicateDiagnostics };
}

function edgeId(source: string, target: string) {
  return hashCanonicalJson({
    kind: "citation-edge",
    source,
    target,
    edge_kind: "citation",
  });
}

function choosePrimaryRole(
  roleCounts: Map<string, number>,
  rolePriority: string[],
) {
  if (roleCounts.size === 0) {
    return "unspecified";
  }
  const priority = new Map(rolePriority.map((role, index) => [role, index]));
  return [...roleCounts.entries()].sort((left, right) => {
    const count = right[1] - left[1];
    if (count !== 0) {
      return count;
    }
    const leftPriority = priority.has(left[0]) ? priority.get(left[0])! : 9999;
    const rightPriority = priority.has(right[0])
      ? priority.get(right[0])!
      : 9999;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return left[0].localeCompare(right[0]);
  })[0][0];
}

function finalizeEdges(
  aggregate: Map<
    string,
    {
      source: string;
      target: string;
      mentionCount: number;
      sourceRefs: string[];
      roleCounts: Map<string, number>;
    }
  >,
  rolePriority: string[],
) {
  return [...aggregate.values()]
    .map((entry): CitationGraphEdge => {
      const primary = choosePrimaryRole(entry.roleCounts, rolePriority);
      const roleEvidence = [...entry.roleCounts.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort(
          (left, right) =>
            right.count - left.count || left.role.localeCompare(right.role),
        );
      return {
        edge_id: edgeId(entry.source, entry.target),
        source: entry.source,
        target: entry.target,
        kind: "citation",
        mention_count: entry.mentionCount,
        primary_role: primary,
        aux_roles: roleEvidence
          .filter((role) => role.role !== primary)
          .map((role) => ({ role: role.role, count: role.count })),
        role_evidence: roleEvidence,
        source_refs: entry.sourceRefs,
      };
    })
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
}

export function buildUnifiedCitationGraph(args: {
  papers: CitationGraphPaperInput[];
  rolePriority?: string[];
}): CitationGraph {
  const papers = [...(args.papers || [])].sort((left, right) =>
    paperNodeId(left).localeCompare(paperNodeId(right)),
  );
  const { canonicalByKey, duplicateDiagnostics } = groupCanonicalPapers(papers);
  const nodes = new Map<string, CitationGraphNode>();
  const promotions: CitationGraph["diagnostics"]["promotions"] = [];
  const referenceStats: CitationGraph["diagnostics"]["reference_stats"] = {
    total: 0,
    promoted: 0,
    external: 0,
    unresolved: 0,
    dropped_empty: 0,
    merged_external_nodes: 0,
    merged_unresolved_nodes: 0,
  };
  const externalTargets = new Set<string>();
  const unresolvedTargets = new Set<string>();
  for (const paper of papers) {
    nodes.set(paperNodeId(paper), basePaperNode(paper));
  }

  const edgeAggregate = new Map<
    string,
    {
      source: string;
      target: string;
      mentionCount: number;
      sourceRefs: string[];
      roleCounts: Map<string, number>;
    }
  >();

  for (const paper of papers) {
    const source = paperNodeId(paper);
    for (const [index, reference] of (paper.references || []).entries()) {
      referenceStats.total += 1;
      const refKey = provisionalReferenceKey(reference);
      let target = "";
      if (refKey && canonicalByKey.has(refKey)) {
        const targetPaper = canonicalByKey.get(refKey)!;
        target = paperNodeId(targetPaper);
        const targetNode = nodes.get(target);
        if (targetNode && !targetNode.aliases.includes(refKey)) {
          targetNode.aliases.push(refKey);
          targetNode.aliases.sort((left, right) => left.localeCompare(right));
        }
        if (
          !promotions.some(
            (entry) => entry.from === refKey && entry.to === target,
          )
        ) {
          promotions.push({
            from: refKey,
            to: target,
            reason: "provisional_key_match",
            key_kind: keyKind(refKey),
            confidence: "deterministic",
          });
        }
        referenceStats.promoted += 1;
      } else if (refKey) {
        target = refKey;
        const rawFallback = refKey.startsWith("ref:raw:");
        if (!nodes.has(target)) {
          nodes.set(target, {
            node_id: target,
            kind: rawFallback ? "unresolved_reference" : "external_reference",
            target_state: rawFallback ? "unresolved" : "external",
            provisional_key: refKey,
            aliases: [],
            title: normalizeText(reference.title),
            year: normalizeText(reference.year),
            authors: [...(reference.authors || [])],
            low_signal: rawFallback,
          });
        }
        if (rawFallback) {
          referenceStats.unresolved += 1;
          unresolvedTargets.add(target);
        } else {
          referenceStats.external += 1;
          externalTargets.add(target);
        }
      } else {
        referenceStats.dropped_empty += 1;
        continue;
      }

      const id = `${source}->${target}`;
      const existing = edgeAggregate.get(id) || {
        source,
        target,
        mentionCount: 0,
        sourceRefs: [],
        roleCounts: new Map<string, number>(),
      };
      existing.mentionCount += 1;
      existing.sourceRefs.push(`${source}#ref:${index}`);
      for (const role of reference.roles || []) {
        const label = normalizeText(role) || "unspecified";
        existing.roleCounts.set(
          label,
          (existing.roleCounts.get(label) || 0) + 1,
        );
      }
      edgeAggregate.set(id, existing);
    }
  }

  const nodeList = [...nodes.values()].sort((left, right) =>
    left.node_id.localeCompare(right.node_id),
  );
  const edgeList = finalizeEdges(edgeAggregate, args.rolePriority || []);
  const nodeCounts = {
    library_paper: nodeList.filter((node) => node.kind === "library_paper")
      .length,
    external_reference: nodeList.filter(
      (node) => node.kind === "external_reference",
    ).length,
    unresolved_reference: nodeList.filter(
      (node) => node.kind === "unresolved_reference",
    ).length,
  };
  referenceStats.merged_external_nodes =
    referenceStats.external - externalTargets.size;
  referenceStats.merged_unresolved_nodes =
    referenceStats.unresolved - unresolvedTargets.size;
  const graphBase = {
    schema_id: "synthesis.unified_citation_graph" as const,
    schema_version: "1.0.0" as const,
    nodes: nodeList,
    edges: edgeList,
    diagnostics: {
      promotions: promotions.sort((left, right) =>
        left.from.localeCompare(right.from),
      ),
      duplicates: duplicateDiagnostics.sort((left, right) =>
        left.provisional_key.localeCompare(right.provisional_key),
      ),
      node_counts: nodeCounts,
      reference_stats: referenceStats,
    },
  };
  return {
    ...graphBase,
    graph_hash: hashCanonicalJson(graphBase),
  };
}

function coordinateSeed(
  nodeId: string,
  algorithm: CitationLayoutAlgorithm,
  axis: "x" | "y",
) {
  const hex = sha256(`${nodeId}:${algorithm}:${axis}`).slice(
    "sha256:".length,
    "sha256:".length + 8,
  );
  const value = Number.parseInt(hex, 16) / 0xffffffff;
  return (value - 0.5) * 100;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundMetric(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeMetric(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return roundMetric(Math.max(0, value) / max);
}

function parseYear(value: unknown) {
  const match = normalizeText(value).match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function paperRefFromLibraryNode(node: CitationGraphNode) {
  return node.library_id && node.item_key
    ? `${node.library_id}:${node.item_key}`
    : undefined;
}

function computeLibraryPagerank(args: {
  libraryNodeIds: string[];
  internalEdges: CitationGraphEdge[];
  damping: number;
  iterations: number;
}) {
  const nodes = [...args.libraryNodeIds].sort((left, right) =>
    left.localeCompare(right),
  );
  const nodeSet = new Set(nodes);
  const count = nodes.length;
  const ranks = new Map<string, number>();
  if (!count) {
    return ranks;
  }
  const outgoing = new Map<string, Array<{ target: string; weight: number }>>();
  for (const node of nodes) {
    ranks.set(node, 1 / count);
    outgoing.set(node, []);
  }
  for (const edge of args.internalEdges) {
    if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
      outgoing.get(edge.source)!.push({
        target: edge.target,
        weight: Math.max(1, Number(edge.mention_count) || 1),
      });
    }
  }
  for (let iteration = 0; iteration < args.iterations; iteration += 1) {
    const next = new Map<string, number>();
    const base = (1 - args.damping) / count;
    for (const node of nodes) {
      next.set(node, base);
    }
    let dangling = 0;
    for (const node of nodes) {
      const rank = ranks.get(node) || 0;
      const links = outgoing.get(node) || [];
      const totalWeight = links.reduce((sum, link) => sum + link.weight, 0);
      if (!links.length || totalWeight <= 0) {
        dangling += rank;
        continue;
      }
      for (const link of links) {
        next.set(
          link.target,
          (next.get(link.target) || 0) +
            args.damping * rank * (link.weight / totalWeight),
        );
      }
    }
    const danglingShare = (args.damping * dangling) / count;
    for (const node of nodes) {
      ranks.set(node, (next.get(node) || 0) + danglingShare);
    }
  }
  for (const node of nodes) {
    ranks.set(node, roundMetric(ranks.get(node) || 0));
  }
  return ranks;
}

function computeWeakComponents(args: {
  libraryNodeIds: string[];
  internalEdges: CitationGraphEdge[];
}) {
  const nodes = [...args.libraryNodeIds].sort((left, right) =>
    left.localeCompare(right),
  );
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node, new Set());
  }
  for (const edge of args.internalEdges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const node of nodes) {
    if (seen.has(node)) {
      continue;
    }
    const component: string[] = [];
    const queue = [node];
    seen.add(node);
    while (queue.length) {
      const current = queue.shift()!;
      component.push(current);
      for (const next of [...(adjacency.get(current) || [])].sort(
        (left, right) => left.localeCompare(right),
      )) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    components.push(component.sort((left, right) => left.localeCompare(right)));
  }
  components.sort((left, right) => left[0].localeCompare(right[0]));
  const byNode = new Map<
    string,
    { component_id: string; component_size: number }
  >();
  components.forEach((component, index) => {
    const componentId = `component:${String(index + 1).padStart(3, "0")}`;
    for (const node of component) {
      byNode.set(node, {
        component_id: componentId,
        component_size: component.length,
      });
    }
  });
  return { components, byNode };
}

function roleHints(args: {
  foundationScore: number;
  frontierScore: number;
  pagerankNorm: number;
  inDegreeNorm: number;
  recencyNorm: number;
  isIsolated: boolean;
  externalReferenceCount: number;
  unresolvedReferenceCount: number;
  internalOutDegree: number;
}) {
  const hints = new Set<string>();
  if (args.foundationScore >= 0.65 && args.pagerankNorm >= 0.35) {
    hints.add("core");
  }
  if (args.foundationScore >= 0.55 && args.inDegreeNorm >= 0.35) {
    hints.add("foundation");
  }
  if (args.frontierScore >= 0.55 && args.recencyNorm >= 0.5) {
    hints.add("frontier");
  }
  if (args.isIsolated) {
    hints.add("isolated");
  }
  if (
    args.externalReferenceCount + args.unresolvedReferenceCount >= 3 &&
    args.externalReferenceCount + args.unresolvedReferenceCount >=
      args.internalOutDegree * 2
  ) {
    hints.add("external-heavy");
  }
  return [...hints].sort((left, right) => left.localeCompare(right));
}

export function computeCitationGraphMetrics(
  graph: CitationGraph,
): CitationGraphMetrics {
  const libraryNodes = graph.nodes
    .filter((node) => node.kind === "library_paper")
    .sort((left, right) => left.node_id.localeCompare(right.node_id));
  const libraryNodeIds = libraryNodes.map((node) => node.node_id);
  const librarySet = new Set(libraryNodeIds);
  const nodeById = new Map(graph.nodes.map((node) => [node.node_id, node]));
  const internalEdges = graph.edges.filter(
    (edge) => librarySet.has(edge.source) && librarySet.has(edge.target),
  );
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  const externalCounts = new Map<string, number>();
  const unresolvedCounts = new Map<string, number>();
  for (const nodeId of libraryNodeIds) {
    inDegree.set(nodeId, 0);
    outDegree.set(nodeId, 0);
    externalCounts.set(nodeId, 0);
    unresolvedCounts.set(nodeId, 0);
  }
  for (const edge of graph.edges) {
    const weight = Math.max(1, Number(edge.mention_count) || 1);
    if (librarySet.has(edge.source) && librarySet.has(edge.target)) {
      outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + weight);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + weight);
      continue;
    }
    if (librarySet.has(edge.source)) {
      const target = nodeById.get(edge.target);
      if (target?.kind === "external_reference") {
        externalCounts.set(
          edge.source,
          (externalCounts.get(edge.source) || 0) + weight,
        );
      } else if (target?.kind === "unresolved_reference") {
        unresolvedCounts.set(
          edge.source,
          (unresolvedCounts.get(edge.source) || 0) + weight,
        );
      }
    }
  }
  const pagerank = computeLibraryPagerank({
    libraryNodeIds,
    internalEdges,
    damping: 0.85,
    iterations: 50,
  });
  const { components, byNode: componentByNode } = computeWeakComponents({
    libraryNodeIds,
    internalEdges,
  });
  const validYears = libraryNodes
    .map((node) => parseYear(node.year))
    .filter((year): year is number => year !== null);
  const graphYear = validYears.length ? Math.max(...validYears) : null;
  const minYear = validYears.length ? Math.min(...validYears) : null;
  const yearSpan =
    graphYear !== null && minYear !== null && graphYear > minYear
      ? graphYear - minYear
      : 0;
  const maxIn = Math.max(
    0,
    ...libraryNodeIds.map((node) => inDegree.get(node) || 0),
  );
  const maxOut = Math.max(
    0,
    ...libraryNodeIds.map((node) => outDegree.get(node) || 0),
  );
  const maxPagerank = Math.max(
    0,
    ...libraryNodeIds.map((node) => pagerank.get(node) || 0),
  );
  const libraryNodeMetrics = libraryNodes.map(
    (node): CitationGraphLibraryNodeMetrics => {
      const parsedYear = parseYear(node.year);
      const ageNorm =
        parsedYear !== null && graphYear !== null && yearSpan > 0
          ? roundMetric((graphYear - parsedYear) / yearSpan)
          : 0;
      const recencyNorm =
        parsedYear !== null && graphYear !== null
          ? yearSpan > 0
            ? roundMetric(1 - ageNorm)
            : 1
          : 0;
      const internalInDegree = inDegree.get(node.node_id) || 0;
      const internalOutDegree = outDegree.get(node.node_id) || 0;
      const internalPagerank = pagerank.get(node.node_id) || 0;
      const inDegreeNorm = normalizeMetric(internalInDegree, maxIn);
      const outDegreeNorm = normalizeMetric(internalOutDegree, maxOut);
      const pagerankNorm = normalizeMetric(internalPagerank, maxPagerank);
      const foundationScore = roundMetric(
        0.5 * inDegreeNorm + 0.35 * pagerankNorm + 0.15 * ageNorm,
      );
      const frontierScore = roundMetric(
        0.55 * recencyNorm + 0.25 * outDegreeNorm + 0.2 * pagerankNorm,
      );
      const component = componentByNode.get(node.node_id) || {
        component_id: "component:000",
        component_size: 0,
      };
      const isIsolated = component.component_size <= 1;
      return {
        node_id: node.node_id,
        paper_ref: paperRefFromLibraryNode(node),
        item_key: node.item_key,
        title: node.title,
        year: node.year,
        internal_in_degree: internalInDegree,
        internal_out_degree: internalOutDegree,
        external_reference_count: externalCounts.get(node.node_id) || 0,
        unresolved_reference_count: unresolvedCounts.get(node.node_id) || 0,
        internal_pagerank: roundMetric(internalPagerank),
        component_id: component.component_id,
        component_size: component.component_size,
        is_isolated: isIsolated,
        age_norm: ageNorm,
        recency_norm: recencyNorm,
        in_degree_norm: inDegreeNorm,
        out_degree_norm: outDegreeNorm,
        pagerank_norm: pagerankNorm,
        foundation_score: foundationScore,
        frontier_score: frontierScore,
        synthesis_role_hints: roleHints({
          foundationScore,
          frontierScore,
          pagerankNorm,
          inDegreeNorm,
          recencyNorm,
          isIsolated,
          externalReferenceCount: externalCounts.get(node.node_id) || 0,
          unresolvedReferenceCount: unresolvedCounts.get(node.node_id) || 0,
          internalOutDegree,
        }),
      };
    },
  );
  const base = {
    schema_id: "synthesis.unified_citation_graph_metrics" as const,
    schema_version: "1.0.0" as const,
    graph_hash: graph.graph_hash,
    metrics_version: 1 as const,
    params: {
      pagerank_damping: 0.85,
      pagerank_iterations: 50,
      foundation_formula:
        "0.50*in_degree_norm + 0.35*pagerank_norm + 0.15*age_norm",
      frontier_formula:
        "0.55*recency_norm + 0.25*out_degree_norm + 0.20*pagerank_norm",
    },
    graph_year: graphYear,
    library_node_metrics: libraryNodeMetrics.sort((left, right) =>
      left.node_id.localeCompare(right.node_id),
    ),
    diagnostics: {
      library_node_count: libraryNodes.length,
      external_reference_count: graph.nodes.filter(
        (node) => node.kind === "external_reference",
      ).length,
      unresolved_reference_count: graph.nodes.filter(
        (node) => node.kind === "unresolved_reference",
      ).length,
      component_count: components.length,
      isolated_library_node_count: components.filter(
        (component) => component.length === 1,
      ).length,
      missing_year_count: libraryNodes.length - validYears.length,
    },
  };
  return {
    ...base,
    metrics_hash: hashCanonicalJson(base),
  };
}

export function computeCitationGraphLayout(
  graph: CitationGraph,
  algorithmInput: CitationLayoutAlgorithm,
): CitationGraphLayout {
  const algorithm = normalizeCitationLayoutAlgorithm(algorithmInput);
  if (algorithm === "radial") {
    return computeRadialCitationGraphLayout(graph);
  }
  if (algorithm === "components") {
    return computeComponentCitationGraphLayout(graph);
  }
  return computeForceCitationGraphLayout(graph);
}

function finalizeCitationGraphLayout(args: {
  graph: CitationGraph;
  layoutEngine: CitationGraphLayout["layout_engine"];
  algorithm: CitationLayoutAlgorithm;
  params: CitationGraphLayout["params"];
  nodes: Record<string, { x: number; y: number }>;
}): CitationGraphLayout {
  const base = {
    graph_hash: args.graph.graph_hash,
    layout_engine: args.layoutEngine,
    layout_version: CITATION_GRAPH_LAYOUT_VERSION,
    algorithm: args.algorithm,
    preset: args.algorithm,
    params: args.params,
    nodes: args.nodes,
  };
  return {
    ...base,
    layout_hash: hashCanonicalJson(base),
  };
}

function sortedCitationNodes(graph: CitationGraph) {
  return [...graph.nodes].sort((left, right) =>
    left.node_id.localeCompare(right.node_id),
  );
}

function sortedCitationEdges(graph: CitationGraph) {
  return [...graph.edges].sort((left, right) =>
    left.edge_id.localeCompare(right.edge_id),
  );
}

function citationGraphDegreeMaps(graph: CitationGraph) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of graph.edges) {
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) || 0) + 1);
  }
  return { incoming, outgoing };
}

function stableNodeRank(
  node: CitationGraphNode,
  incoming: Map<string, number>,
  outgoing: Map<string, number>,
) {
  return {
    incoming: incoming.get(node.node_id) || 0,
    outgoing: outgoing.get(node.node_id) || 0,
    year: Number(node.year) || Number.POSITIVE_INFINITY,
    title: normalizeText(node.title || node.node_id).toLowerCase(),
  };
}

function compareCitationNodeImportance(
  incoming: Map<string, number>,
  outgoing: Map<string, number>,
) {
  return (left: CitationGraphNode, right: CitationGraphNode) => {
    const leftRank = stableNodeRank(left, incoming, outgoing);
    const rightRank = stableNodeRank(right, incoming, outgoing);
    return (
      rightRank.incoming - leftRank.incoming ||
      rightRank.outgoing - leftRank.outgoing ||
      leftRank.year - rightRank.year ||
      leftRank.title.localeCompare(rightRank.title) ||
      left.node_id.localeCompare(right.node_id)
    );
  };
}

function coordinateOnSpiral(
  index: number,
  radiusStep: number,
  angleStep: number,
) {
  if (index <= 0) {
    return { x: 0, y: 0 };
  }
  const angle = index * angleStep;
  const radius = radiusStep * Math.sqrt(index);
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function roundedCoordinates(
  nodes: Record<string, { x: number; y: number }>,
): Record<string, { x: number; y: number }> {
  return Object.fromEntries(
    Object.entries(nodes)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([id, point]) => [
        id,
        {
          x: roundCoordinate(point.x),
          y: roundCoordinate(point.y),
        },
      ]),
  );
}

function computeForceCitationGraphLayout(graph: CitationGraph) {
  const params = FORCE_LAYOUT_PARAMS;
  const model = new Graph({ multi: false, type: "directed" });
  const nodes = sortedCitationNodes(graph);
  const links = sortedCitationEdges(graph);
  const connectedNodeIds = new Set<string>();
  for (const edge of links) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }
  const connectedNodes = nodes.filter((node) =>
    connectedNodeIds.has(node.node_id),
  );
  const isolatedNodes = nodes.filter(
    (node) => !connectedNodeIds.has(node.node_id),
  );
  const simulationNodes = connectedNodes.map((node) => ({
    id: node.node_id,
    x: coordinateSeed(node.node_id, "force", "x"),
    y: coordinateSeed(node.node_id, "force", "y"),
  }));
  for (const node of simulationNodes) {
    model.addNode(node.id);
  }
  for (const edge of links) {
    if (model.hasNode(edge.source) && model.hasNode(edge.target)) {
      model.mergeDirectedEdgeWithKey(edge.edge_id, edge.source, edge.target);
    }
  }
  const simulation = forceSimulation(simulationNodes)
    .force(
      "link",
      forceLink(
        links.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
      )
        .id((node: any) => node.id)
        .distance(params.link_distance),
    )
    .force("charge", forceManyBody().strength(params.charge))
    .force("collide", forceCollide(params.collision_radius))
    .force("center", forceCenter(0, 0))
    .stop();
  for (let index = 0; index < params.iterations; index += 1) {
    simulation.tick();
  }
  const coordinates: Record<string, { x: number; y: number }> = {};
  const connectedCoordinates: Array<{ x: number; y: number }> = [];
  for (const node of simulationNodes.sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    connectedCoordinates.push({
      x: Number(node.x || 0),
      y: Number(node.y || 0),
    });
    coordinates[node.id] = {
      x: roundCoordinate(Number(node.x || 0)),
      y: roundCoordinate(Number(node.y || 0)),
    };
  }
  if (isolatedNodes.length) {
    const maxX = connectedCoordinates.length
      ? Math.max(...connectedCoordinates.map((point) => point.x))
      : 0;
    const minY = connectedCoordinates.length
      ? Math.min(...connectedCoordinates.map((point) => point.y))
      : 0;
    const center = {
      x: maxX + params.isolated_radius + params.isolated_gap,
      y: minY,
    };
    isolatedNodes.forEach((node, index) => {
      const offset = coordinateOnSpiral(
        index,
        params.isolated_radius,
        RADIAL_LAYOUT_PARAMS.golden_angle,
      );
      coordinates[node.node_id] = {
        x: roundCoordinate(center.x + offset.x),
        y: roundCoordinate(center.y + offset.y),
      };
    });
  }
  return finalizeCitationGraphLayout({
    graph,
    layoutEngine: "d3-force",
    algorithm: "force",
    params,
    nodes: coordinates,
  });
}

function computeRadialCitationGraphLayout(graph: CitationGraph) {
  const nodes = sortedCitationNodes(graph);
  const { incoming, outgoing } = citationGraphDegreeMaps(graph);
  const libraryNodes = nodes
    .filter((node) => node.kind === "library_paper")
    .sort(compareCitationNodeImportance(incoming, outgoing));
  const nonLibraryNodes = nodes
    .filter((node) => node.kind !== "library_paper")
    .sort(compareCitationNodeImportance(incoming, outgoing));
  const coordinates: Record<string, { x: number; y: number }> = {};
  libraryNodes.forEach((node, index) => {
    coordinates[node.node_id] = coordinateOnSpiral(
      index,
      RADIAL_LAYOUT_PARAMS.library_radius_step,
      RADIAL_LAYOUT_PARAMS.golden_angle,
    );
  });
  const inboundSourcesByTarget = new Map<string, string[]>();
  for (const edge of sortedCitationEdges(graph)) {
    if (!inboundSourcesByTarget.has(edge.target)) {
      inboundSourcesByTarget.set(edge.target, []);
    }
    inboundSourcesByTarget.get(edge.target)?.push(edge.source);
  }
  nonLibraryNodes.forEach((node, index) => {
    const sourcePoints = (inboundSourcesByTarget.get(node.node_id) || [])
      .map((source) => coordinates[source])
      .filter(Boolean);
    if (!sourcePoints.length) {
      coordinates[node.node_id] = coordinateOnSpiral(
        libraryNodes.length + index + 1,
        RADIAL_LAYOUT_PARAMS.fallback_radius_step,
        RADIAL_LAYOUT_PARAMS.golden_angle,
      );
      return;
    }
    const centroid = sourcePoints.reduce(
      (acc, point) => ({
        x: acc.x + point.x / sourcePoints.length,
        y: acc.y + point.y / sourcePoints.length,
      }),
      { x: 0, y: 0 },
    );
    const seedAngle =
      Math.atan2(centroid.y, centroid.x) ||
      (index + 1) * RADIAL_LAYOUT_PARAMS.golden_angle;
    const offset =
      RADIAL_LAYOUT_PARAMS.external_offset +
      Math.sqrt(index + 1) * (RADIAL_LAYOUT_PARAMS.external_offset / 3);
    coordinates[node.node_id] = {
      x: centroid.x + Math.cos(seedAngle) * offset,
      y: centroid.y + Math.sin(seedAngle) * offset,
    };
  });
  return finalizeCitationGraphLayout({
    graph,
    layoutEngine: "radial",
    algorithm: "radial",
    params: RADIAL_LAYOUT_PARAMS,
    nodes: roundedCoordinates(coordinates),
  });
}

function computeComponentCitationGraphLayout(graph: CitationGraph) {
  const nodes = sortedCitationNodes(graph);
  const { incoming, outgoing } = citationGraphDegreeMaps(graph);
  const nodesById = new Map(nodes.map((node) => [node.node_id, node]));
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.node_id, new Set());
  }
  for (const edge of sortedCitationEdges(graph)) {
    if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
      adjacency.get(edge.source)?.add(edge.target);
      adjacency.get(edge.target)?.add(edge.source);
    }
  }
  const visited = new Set<string>();
  const components: CitationGraphNode[][] = [];
  for (const node of nodes) {
    if (visited.has(node.node_id)) {
      continue;
    }
    const queue = [node.node_id];
    visited.add(node.node_id);
    const component: CitationGraphNode[] = [];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      const graphNode = nodesById.get(current);
      if (graphNode) {
        component.push(graphNode);
      }
      for (const next of adjacency.get(current) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    components.push(component);
  }
  components.sort(
    (left, right) =>
      right.length - left.length ||
      left[0]?.node_id.localeCompare(right[0]?.node_id || "") ||
      0,
  );
  const columns = Math.max(1, Math.ceil(Math.sqrt(components.length || 1)));
  const coordinates: Record<string, { x: number; y: number }> = {};
  components.forEach((component, componentIndex) => {
    const column = componentIndex % columns;
    const row = Math.floor(componentIndex / columns);
    const center = {
      x:
        (column - (Math.min(columns, components.length) - 1) / 2) *
        COMPONENT_LAYOUT_PARAMS.component_gap,
      y: row * COMPONENT_LAYOUT_PARAMS.component_gap,
    };
    const ordered = component.sort(
      compareCitationNodeImportance(incoming, outgoing),
    );
    ordered.forEach((node, index) => {
      const offset = coordinateOnSpiral(
        index,
        COMPONENT_LAYOUT_PARAMS.node_gap,
        COMPONENT_LAYOUT_PARAMS.golden_angle,
      );
      coordinates[node.node_id] = {
        x: center.x + offset.x,
        y: center.y + offset.y,
      };
    });
  });
  return finalizeCitationGraphLayout({
    graph,
    layoutEngine: "components",
    algorithm: "components",
    params: COMPONENT_LAYOUT_PARAMS,
    nodes: roundedCoordinates(coordinates),
  });
}
