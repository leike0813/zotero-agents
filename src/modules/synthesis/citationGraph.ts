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

export type CitationLayoutPreset = "compact" | "balanced" | "expanded";

export type CitationGraphLayout = {
  graph_hash: string;
  layout_engine: "d3-force";
  layout_version: 1;
  preset: CitationLayoutPreset;
  params: {
    link_distance: number;
    charge: number;
    collision_radius: number;
    iterations: number;
  };
  nodes: Record<string, { x: number; y: number }>;
  layout_hash: string;
};

const LAYOUT_PRESETS: Record<CitationLayoutPreset, CitationGraphLayout["params"]> = {
  compact: {
    link_distance: 45,
    charge: -80,
    collision_radius: 6,
    iterations: 300,
  },
  balanced: {
    link_distance: 80,
    charge: -140,
    collision_radius: 8,
    iterations: 400,
  },
  expanded: {
    link_distance: 130,
    charge: -220,
    collision_radius: 10,
    iterations: 500,
  },
};

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
  return normalizeText(value).toLowerCase().replace(/#.*$/, "").replace(/\/+$/, "");
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
    keys.push(`ref:raw:${sha256(raw).slice("sha256:".length, "sha256:".length + 24)}`);
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
  return normalizeText(left.itemKey).localeCompare(normalizeText(right.itemKey));
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
  return [...roleCounts.entries()]
    .sort((left, right) => {
      const count = right[1] - left[1];
      if (count !== 0) {
        return count;
      }
      const leftPriority = priority.has(left[0]) ? priority.get(left[0])! : 9999;
      const rightPriority = priority.has(right[0]) ? priority.get(right[0])! : 9999;
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
        .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role));
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
      const existing =
        edgeAggregate.get(id) ||
        {
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
        existing.roleCounts.set(label, (existing.roleCounts.get(label) || 0) + 1);
      }
      edgeAggregate.set(id, existing);
    }
  }

  const nodeList = [...nodes.values()].sort((left, right) =>
    left.node_id.localeCompare(right.node_id),
  );
  const edgeList = finalizeEdges(edgeAggregate, args.rolePriority || []);
  const nodeCounts = {
    library_paper: nodeList.filter((node) => node.kind === "library_paper").length,
    external_reference: nodeList.filter((node) => node.kind === "external_reference").length,
    unresolved_reference: nodeList.filter((node) => node.kind === "unresolved_reference").length,
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
      promotions: promotions.sort((left, right) => left.from.localeCompare(right.from)),
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

function coordinateSeed(nodeId: string, preset: CitationLayoutPreset, axis: "x" | "y") {
  const hex = sha256(`${nodeId}:${preset}:${axis}`).slice("sha256:".length, "sha256:".length + 8);
  const value = Number.parseInt(hex, 16) / 0xffffffff;
  return (value - 0.5) * 100;
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function computeCitationGraphLayout(
  graph: CitationGraph,
  preset: CitationLayoutPreset,
): CitationGraphLayout {
  const params = LAYOUT_PRESETS[preset];
  const model = new Graph({ multi: false, type: "directed" });
  const nodes = [...graph.nodes].sort((left, right) =>
    left.node_id.localeCompare(right.node_id),
  );
  const links = [...graph.edges].sort((left, right) =>
    left.edge_id.localeCompare(right.edge_id),
  );
  const simulationNodes = nodes.map((node) => ({
    id: node.node_id,
    x: coordinateSeed(node.node_id, preset, "x"),
    y: coordinateSeed(node.node_id, preset, "y"),
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
  for (const node of simulationNodes.sort((left, right) => left.id.localeCompare(right.id))) {
    coordinates[node.id] = {
      x: roundCoordinate(Number(node.x || 0)),
      y: roundCoordinate(Number(node.y || 0)),
    };
  }
  const base = {
    graph_hash: graph.graph_hash,
    layout_engine: "d3-force" as const,
    layout_version: 1 as const,
    preset,
    params,
    nodes: coordinates,
  };
  return {
    ...base,
    layout_hash: hashCanonicalJson(base),
  };
}
