import { hashCanonicalJson } from "./foundation";
function cleanString(value) {
    return String(value || "").trim();
}
function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
}
function sanitizeStructuredValue(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => sanitizeStructuredValue(entry));
    }
    if (!isRecord(value)) {
        return value;
    }
    return Object.fromEntries(Object.entries(value)
        .filter(([key]) => key !== "digest_markdown" && key !== "digest")
        .map(([key, entry]) => [key, sanitizeStructuredValue(entry)]));
}
function buildStructuredTopicInput(value) {
    const artifact = isRecord(value?.artifact)
        ? sanitizeStructuredValue(value.artifact)
        : null;
    if (!artifact) {
        return undefined;
    }
    return {
        artifact,
        ...(isRecord(value?.manifest)
            ? {
                manifest: sanitizeStructuredValue(value.manifest),
            }
            : {}),
        ...(isRecord(value?.metadata)
            ? {
                metadata: sanitizeStructuredValue(value.metadata),
            }
            : {}),
        claims: Array.isArray(artifact.claims) ? artifact.claims : [],
        timeline_events: isRecord(artifact.timeline_events)
            ? artifact.timeline_events
            : Array.isArray(artifact.timeline_events)
                ? { summary: {}, events: artifact.timeline_events }
                : { summary: {}, events: [] },
        source_papers: Array.isArray(artifact.source_papers)
            ? artifact.source_papers
            : [],
        taxonomy: isRecord(artifact.taxonomy) ? artifact.taxonomy : {},
        improvement_dimensions: isRecord(artifact.improvement_dimensions)
            ? artifact.improvement_dimensions
            : Array.isArray(artifact.improvement_dimensions)
                ? { summary: {}, dimensions: artifact.improvement_dimensions }
                : { summary: {}, dimensions: [] },
        debates: Array.isArray(artifact.debates) ? artifact.debates : [],
        coverage: isRecord(artifact.coverage) ? artifact.coverage : {},
        future_directions: Array.isArray(artifact.future_directions)
            ? artifact.future_directions
            : [],
        review_outline: isRecord(artifact.review_outline)
            ? artifact.review_outline
            : {},
        incomplete_sections: [
            "taxonomy",
            "improvement_dimensions",
            "debates",
            "review_outline",
            "source_papers",
        ].filter((section) => !(section in artifact)),
    };
}
function normalizeStringList(values) {
    return Array.from(new Set(Array.isArray(values)
        ? values.map((entry) => cleanString(entry)).filter(Boolean)
        : [])).sort((left, right) => left.localeCompare(right));
}
function normalizeCoverage(value) {
    const coverage = cleanString(value);
    if (coverage === "complete" || coverage === "partial") {
        return coverage;
    }
    return "missing";
}
function paperRefToNodeId(paperRef) {
    const itemKey = cleanString(paperRef).split(":").pop() || "";
    return itemKey ? `zotero:item:${itemKey}` : "";
}
function normalizeResolvedPapers(snapshot) {
    const rawPapers = Array.isArray(snapshot.papers)
        ? snapshot.papers
        : Array.isArray(snapshot.paper_refs)
            ? snapshot.paper_refs.map((paper_ref) => ({ paper_ref }))
            : [];
    return rawPapers
        .map((entry) => {
        if (typeof entry === "string") {
            const paperRef = cleanString(entry);
            return paperRef ? { paper_ref: paperRef, match_reasons: [] } : null;
        }
        if (!entry || typeof entry !== "object") {
            return null;
        }
        const row = entry;
        const paperRef = cleanString(row.paper_ref);
        if (!paperRef) {
            return null;
        }
        return {
            paper_ref: paperRef,
            match_reasons: normalizeStringList(row.match_reasons),
        };
    })
        .filter((entry) => Boolean(entry))
        .sort((left, right) => left.paper_ref.localeCompare(right.paper_ref));
}
function normalizeRegistryRows(rows, paperRefs) {
    const allowed = new Set(paperRefs);
    return [...(rows || [])]
        .map((row) => ({
        paper_ref: cleanString(row.paper_ref),
        title: cleanString(row.title) || cleanString(row.paper_ref),
        artifactCoverage: normalizeCoverage(row.artifactCoverage),
        missing_artifacts: normalizeStringList(row.missing_artifacts),
    }))
        .filter((row) => row.paper_ref && allowed.has(row.paper_ref))
        .sort((left, right) => left.paper_ref.localeCompare(right.paper_ref));
}
export function projectCitationGraphSliceForReview(args) {
    const requestedNodeIds = new Set(normalizeStringList(args.paperRefs).map(paperRefToNodeId).filter(Boolean));
    const maxNodes = Math.max(0, Math.floor(Number(args.maxNodes || 0))) || 500;
    const maxEdges = Math.max(0, Math.floor(Number(args.maxEdges || 0))) || 1000;
    const includedNodeIds = new Set();
    const edges = [...(args.graph.edges || [])]
        .filter((edge) => requestedNodeIds.has(edge.source) && requestedNodeIds.has(edge.target))
        .sort((left, right) => left.edge_id.localeCompare(right.edge_id))
        .slice(0, maxEdges);
    for (const edge of edges) {
        includedNodeIds.add(edge.source);
        includedNodeIds.add(edge.target);
    }
    for (const nodeId of requestedNodeIds) {
        includedNodeIds.add(nodeId);
    }
    const nodes = [...(args.graph.nodes || [])]
        .filter((node) => includedNodeIds.has(node.node_id))
        .sort((left, right) => left.node_id.localeCompare(right.node_id))
        .slice(0, maxNodes);
    const retainedNodeIds = new Set(nodes.map((node) => node.node_id));
    return {
        graph_hash: cleanString(args.graph.graph_hash),
        nodes,
        edges: edges.filter((edge) => retainedNodeIds.has(edge.source) && retainedNodeIds.has(edge.target)),
    };
}
function buildMissingArtifactDiagnostics(rows) {
    return rows
        .flatMap((row) => row.missing_artifacts.map((artifactType) => ({
        paper_ref: row.paper_ref,
        artifact_type: artifactType,
        severity: "warning",
        message: `${artifactType} is missing for ${row.paper_ref}`,
    })))
        .sort((left, right) => left.paper_ref.localeCompare(right.paper_ref) ||
        left.artifact_type.localeCompare(right.artifact_type));
}
export function buildReviewWorkflowInput(args) {
    const topicId = cleanString(args.topic.topic_id);
    const markdown = cleanString(args.topic.markdown);
    if (!topicId) {
        throw new Error("review workflow input requires topic_id");
    }
    if (!markdown) {
        throw new Error("review workflow input requires topic synthesis markdown");
    }
    const resolvedPapers = normalizeResolvedPapers(args.resolved_paper_set);
    if (resolvedPapers.length === 0) {
        throw new Error("review workflow input requires a resolved paper set");
    }
    const paperRefs = resolvedPapers.map((paper) => paper.paper_ref);
    const registryRows = normalizeRegistryRows(args.registry_rows, paperRefs);
    const missingArtifacts = buildMissingArtifactDiagnostics(registryRows);
    const structuredTopic = buildStructuredTopicInput(args.topic.structured_topic);
    const base = {
        kind: "synthesis.review_workflow_input",
        schema_version: "1.0.0",
        topic: {
            topic_id: topicId,
            title: cleanString(args.topic.title) || topicId,
            markdown,
            metadata: { ...(args.topic.metadata || {}) },
            topic_definition: { ...(args.topic.topic_definition || {}) },
            resolver: { ...(args.topic.resolver || {}) },
        },
        topic_timeline: {
            content: args.topic.timeline || "",
        },
        ...(structuredTopic ? { structured_topic: structuredTopic } : {}),
        resolved_paper_set: {
            papers: resolvedPapers,
            snapshot: {
                ...args.resolved_paper_set,
                papers: resolvedPapers,
            },
        },
        registry_artifact_coverage: {
            rows: registryRows,
        },
        citation_graph_slice: projectCitationGraphSliceForReview({
            graph: args.citation_graph,
            paperRefs,
        }),
        missing_artifact_diagnostics: missingArtifacts,
        diagnostics: {
            blocking: [],
            warnings: missingArtifacts.map((entry) => entry.message),
        },
    };
    return {
        ...base,
        input_hash: hashCanonicalJson(base),
    };
}
