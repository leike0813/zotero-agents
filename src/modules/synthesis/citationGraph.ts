import { SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION } from "../../../packages/synthesis-engine/src/index";
import {
  SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
  computeSynthesisCitationGraphBuild,
  type SynthesisCitationGraphBuildLibraryNode,
  type SynthesisCitationGraphBuildReference,
} from "../../../packages/synthesis-engine/src/citationGraphBuild";
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
  metrics_version: 2;
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
  layout_engine:
    | "d3-force"
    | "radial"
    | "components"
    | "forceatlas2-rust"
    | "radial-rust"
    | "components-rust";
  layout_version: number;
  algorithm: CitationLayoutAlgorithm;
  preset: CitationLayoutAlgorithm;
  params: Record<string, number | string>;
  nodes: Record<string, { x: number; y: number }>;
  layout_hash: string;
};

export const CITATION_GRAPH_LAYOUT_VERSION =
  SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION;

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

export function buildUnifiedCitationGraph(args: {
  papers: CitationGraphPaperInput[];
  rolePriority?: string[];
}): CitationGraph {
  const papers = [...(args.papers || [])].sort((left, right) =>
    paperNodeId(left).localeCompare(paperNodeId(right)),
  );
  const { canonicalByKey, duplicateDiagnostics } = groupCanonicalPapers(papers);
  const libraryNodesById = new Map<
    string,
    SynthesisCitationGraphBuildLibraryNode
  >();
  const legacyLibraryNodesById = new Map<string, CitationGraphNode>();
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
  const legacyTargetMetadata = new Map<
    string,
    { title: string; year: string; authors: string[] }
  >();
  for (const paper of papers) {
    const legacyNode = basePaperNode(paper);
    legacyLibraryNodesById.set(legacyNode.node_id, legacyNode);
    libraryNodesById.set(legacyNode.node_id, {
      nodeId: legacyNode.node_id,
      ...(legacyNode.title ? { title: legacyNode.title } : {}),
      ...(legacyNode.year ? { year: legacyNode.year } : {}),
      authors: (legacyNode.authors || []).map(normalizeText).filter(Boolean),
      aliases: [...legacyNode.aliases],
    });
  }
  const references: SynthesisCitationGraphBuildReference[] = [];

  for (const paper of papers) {
    const source = paperNodeId(paper);
    for (const [index, reference] of (paper.references || []).entries()) {
      referenceStats.total += 1;
      const refKey = provisionalReferenceKey(reference);
      let target = "";
      if (refKey && canonicalByKey.has(refKey)) {
        const targetPaper = canonicalByKey.get(refKey)!;
        target = paperNodeId(targetPaper);
        const targetNode = libraryNodesById.get(target);
        const legacyTargetNode = legacyLibraryNodesById.get(target);
        if (targetNode && !targetNode.aliases.includes(refKey)) {
          targetNode.aliases.push(refKey);
          targetNode.aliases.sort();
        }
        if (legacyTargetNode && !legacyTargetNode.aliases.includes(refKey)) {
          legacyTargetNode.aliases.push(refKey);
          legacyTargetNode.aliases.sort();
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
        if (!legacyTargetMetadata.has(target)) {
          legacyTargetMetadata.set(target, {
            title: normalizeText(reference.title),
            year: normalizeText(reference.year),
            authors: [...(reference.authors || [])],
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

      const targetLibraryNode = libraryNodesById.get(target);
      const title = normalizeText(reference.title);
      const year = normalizeText(reference.year);
      references.push({
        referenceId: `${source}#ref:${String(index).padStart(8, "0")}`,
        edgeId: hashCanonicalJson({
          kind: "citation-reference-instance",
          source,
          target,
          index,
        }),
        sourceId: source,
        sourceRef: `${source}#ref:${index}`,
        targetId: target,
        targetKind: targetLibraryNode
          ? "library_paper"
          : refKey.startsWith("ref:raw:")
            ? "unresolved_reference"
            : "external_reference",
        ...(title ? { targetTitle: title } : {}),
        ...(year ? { targetYear: year } : {}),
        targetAuthors: (reference.authors || [])
          .map(normalizeText)
          .filter(Boolean),
        targetAliases: [],
        roles: (reference.roles || [])
          .map((role) => normalizeText(role) || "unspecified")
          .filter(Boolean),
        weight: 1,
      });
    }
  }

  const built = computeSynthesisCitationGraphBuild({
    contractVersion: SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION,
    scope: {
      kind: "full",
      sourceIds: Array.from(libraryNodesById.keys()).sort(),
    },
    rolePriority: (args.rolePriority || []).map(normalizeText).filter(Boolean),
    libraryNodes: Array.from(libraryNodesById.values()),
    references,
  });
  const nodeList = built.nodes.map((node): CitationGraphNode => {
    const libraryNode = legacyLibraryNodesById.get(node.nodeId);
    if (libraryNode) {
      return {
        ...libraryNode,
        aliases: [...node.aliases],
      };
    }
    const rawFallback = node.kind === "unresolved_reference";
    const legacyMetadata = legacyTargetMetadata.get(node.nodeId);
    return {
      node_id: node.nodeId,
      kind: node.kind,
      target_state: rawFallback
        ? "unresolved"
        : node.kind === "external_reference"
          ? "external"
          : "library",
      provisional_key: node.nodeId,
      aliases: [...node.aliases],
      title: legacyMetadata?.title || node.title || "",
      year: legacyMetadata?.year || node.year || "",
      authors: legacyMetadata?.authors || [...node.authors],
      low_signal: rawFallback,
    };
  });
  const edgeList = built.aggregateEdges
    .map(
      (entry): CitationGraphEdge => ({
        edge_id: edgeId(entry.sourceId, entry.targetId),
        source: entry.sourceId,
        target: entry.targetId,
        kind: "citation",
        mention_count: entry.mentionCount,
        primary_role: entry.primaryRole,
        aux_roles: entry.auxRoles,
        role_evidence: entry.roleEvidence,
        source_refs: entry.sourceRefs,
      }),
    )
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  const nodeCounts = {
    ...built.diagnostics.nodeCounts,
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
