import { SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION } from "../../../packages/synthesis-engine/src/index";
import { SYNTHESIS_CITATION_GRAPH_BUILD_CONTRACT_VERSION, computeSynthesisCitationGraphBuild, } from "../../../packages/synthesis-engine/src/citationGraphBuild";
import { hashCanonicalJson, sha256 } from "./foundation";
export const CITATION_GRAPH_LAYOUT_VERSION = SYNTHESIS_CITATION_GRAPH_LAYOUT_VERSION;
export function normalizeCitationLayoutAlgorithm(value) {
    const algorithm = normalizeText(value);
    if (algorithm === "radial" || algorithm === "components") {
        return algorithm;
    }
    return "force";
}
function normalizeText(value) {
    return String(value || "").trim();
}
function normalizeRawText(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
}
function slug(value) {
    return normalizeText(value)
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
function normalizeCitekey(value) {
    return slug(value);
}
function normalizeDoi(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
        .replace(/^doi:/, "")
        .trim();
}
function normalizeArxiv(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/^https?:\/\/arxiv\.org\/(abs|pdf)\//, "")
        .replace(/\.pdf$/, "")
        .replace(/^arxiv:/, "")
        .trim();
}
function normalizeUrl(value) {
    return normalizeText(value)
        .toLowerCase()
        .replace(/#.*$/, "")
        .replace(/\/+$/, "");
}
function keyKind(key) {
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
export function provisionalReferenceKey(input) {
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
function referenceIdentityKeys(input) {
    const keys = [];
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
function paperNodeId(paper) {
    return `zotero:item:${normalizeText(paper.itemKey)}`;
}
function basePaperNode(paper) {
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
function compareCanonicalPaper(left, right) {
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
function groupCanonicalPapers(papers) {
    const byKey = new Map();
    for (const paper of papers) {
        for (const key of referenceIdentityKeys(paper).filter((entry) => !entry.startsWith("ref:raw:"))) {
            const existing = byKey.get(key) || [];
            existing.push(paper);
            byKey.set(key, existing);
        }
    }
    const canonicalByKey = new Map();
    const duplicateDiagnostics = [];
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
function edgeId(source, target) {
    return hashCanonicalJson({
        kind: "citation-edge",
        source,
        target,
        edge_kind: "citation",
    });
}
export function buildUnifiedCitationGraph(args) {
    const papers = [...(args.papers || [])].sort((left, right) => paperNodeId(left).localeCompare(paperNodeId(right)));
    const { canonicalByKey, duplicateDiagnostics } = groupCanonicalPapers(papers);
    const libraryNodesById = new Map();
    const legacyLibraryNodesById = new Map();
    const promotions = [];
    const referenceStats = {
        total: 0,
        promoted: 0,
        external: 0,
        unresolved: 0,
        dropped_empty: 0,
        merged_external_nodes: 0,
        merged_unresolved_nodes: 0,
    };
    const externalTargets = new Set();
    const unresolvedTargets = new Set();
    const legacyTargetMetadata = new Map();
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
    const references = [];
    for (const paper of papers) {
        const source = paperNodeId(paper);
        for (const [index, reference] of (paper.references || []).entries()) {
            referenceStats.total += 1;
            const refKey = provisionalReferenceKey(reference);
            let target = "";
            if (refKey && canonicalByKey.has(refKey)) {
                const targetPaper = canonicalByKey.get(refKey);
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
                if (!promotions.some((entry) => entry.from === refKey && entry.to === target)) {
                    promotions.push({
                        from: refKey,
                        to: target,
                        reason: "provisional_key_match",
                        key_kind: keyKind(refKey),
                        confidence: "deterministic",
                    });
                }
                referenceStats.promoted += 1;
            }
            else if (refKey) {
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
                }
                else {
                    referenceStats.external += 1;
                    externalTargets.add(target);
                }
            }
            else {
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
                // The graph's provisional/canonical node identity still comes from
                // matching facts. Keep the artifact's opaque source identity only as
                // evidence for the derived edge projection.
                sourceRef: reference.sourceReferenceId || `${source}#ref:${index}`,
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
    const nodeList = built.nodes.map((node) => {
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
        .map((entry) => ({
        edge_id: edgeId(entry.sourceId, entry.targetId),
        source: entry.sourceId,
        target: entry.targetId,
        kind: "citation",
        mention_count: entry.mentionCount,
        primary_role: entry.primaryRole,
        aux_roles: entry.auxRoles,
        role_evidence: entry.roleEvidence,
        source_refs: entry.sourceRefs,
    }))
        .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
    const nodeCounts = {
        ...built.diagnostics.nodeCounts,
    };
    referenceStats.merged_external_nodes =
        referenceStats.external - externalTargets.size;
    referenceStats.merged_unresolved_nodes =
        referenceStats.unresolved - unresolvedTargets.size;
    const graphBase = {
        schema_id: "synthesis.unified_citation_graph",
        schema_version: "1.0.0",
        nodes: nodeList,
        edges: edgeList,
        diagnostics: {
            promotions: promotions.sort((left, right) => left.from.localeCompare(right.from)),
            duplicates: duplicateDiagnostics.sort((left, right) => left.provisional_key.localeCompare(right.provisional_key)),
            node_counts: nodeCounts,
            reference_stats: referenceStats,
        },
    };
    return {
        ...graphBase,
        graph_hash: hashCanonicalJson(graphBase),
    };
}
