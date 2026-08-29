import type { ReferenceSidecarInput } from "../../src/modules/synthesis/registry";
import type {
  SynthesisCitationComplexMetricsRecord,
  SynthesisCitationEdgeRecord,
  SynthesisCitationGraphStateReplacement,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
} from "../../packages/synthesis-repository/src/index";
import type { SynthesisTagSuggestionStageRequest } from "../../packages/synthesis-contracts/src/tags";
import type { SynthesisTopicApplyRequest } from "../../packages/synthesis-contracts/src/workflow";

export type SyntheticSynthesisBenchmarkDatasetName = "2k" | "10k" | "25k";

export type SyntheticSynthesisBenchmarkDataset = {
  name: SyntheticSynthesisBenchmarkDatasetName;
  paperCount: number;
  referenceFanout: number;
  registryInputs: ReferenceSidecarInput[];
};

export type SyntheticSynthesisProductionRouteItem = {
  paperRef: string;
  libraryId: number;
  itemKey: string;
  itemType: "journalArticle";
  title: string;
  year: string;
  date: string;
  creators: string[];
  tags: string[];
  collections: string[];
  doi: string;
  arxiv: string;
  isbn: string;
  url: string;
  citekey: string;
  dateAdded: string;
  metadataHash: string;
};

export type SyntheticSynthesisProductionRouteArtifact = {
  paperRef: string;
  artifactType: "digest" | "references" | "citation_analysis";
  payloadType:
    | "digest-markdown"
    | "references-json"
    | "citation-analysis-json";
  status: "available" | "missing";
  locator?: string;
  payloadHash?: string;
  estimatedSize?: number;
  diagnostics: string[];
};

export type SyntheticSynthesisProductionRouteDataset = {
  name: SyntheticSynthesisBenchmarkDatasetName;
  paperCount: number;
  referenceFanout: number;
  changedPaperRefs: string[];
  tagEffects: Array<{
    libraryId: number;
    itemKey: string;
    tags: string[];
  }>;
  topicApplyRequest: SynthesisTopicApplyRequest;
  tagSuggestionRequest(ordinal: number): SynthesisTagSuggestionStageRequest;
  listItemsPage(request: {
    cursor?: string;
    limit?: number;
  }): {
    items: SyntheticSynthesisProductionRouteItem[];
    cursor: string;
    nextCursor: string;
    hasMore: boolean;
    returned: number;
    limit: number;
    snapshotRevision: string;
  };
  scanArtifactsPage(request: {
    cursor?: string;
    limit?: number;
    paperRefs?: string[];
    artifactTypes?: Array<
      "digest" | "references" | "citation_analysis" | "literature_score"
    >;
  }): {
    artifacts: SyntheticSynthesisProductionRouteArtifact[];
    cursor: string;
    nextCursor: string;
    hasMore: boolean;
    returned: number;
    limit: number;
    snapshotRevision: string;
  };
  readArtifact(request: {
    locator?: string;
    expectedHash?: string;
  }): Record<string, unknown>;
};

export type SyntheticSynthesisBenchmarkRepositoryState = {
  citationGraphState: SynthesisCitationGraphStateReplacement;
};

const DATASET_SIZES: Record<SyntheticSynthesisBenchmarkDatasetName, number> = {
  "2k": 2000,
  "10k": 10000,
  "25k": 25000,
};

const TOPIC_TAGS = [
  "topic:retrieval",
  "topic:graph",
  "topic:review",
  "topic:agents",
  "topic:evaluation",
  "topic:knowledge-base",
  "topic:workflow",
  "topic:benchmark",
];

const ROLES = ["background", "method", "result", "dataset"];

function padded(value: number, width: number) {
  return String(value).padStart(width, "0");
}

function fixtureHash(namespace: "metadata" | "digest" | "references" | "citation_analysis", index: number) {
  const prefix = {
    metadata: "1",
    digest: "2",
    references: "3",
    citation_analysis: "4",
  }[namespace];
  return `sha256:${prefix}${(index + 1).toString(16).padStart(12, "0")}${"0".repeat(51)}`;
}

function paperTitle(index: number) {
  return `Synthetic Synthesis Paper ${padded(index + 1, 5)}`;
}

function paperYear(index: number) {
  return String(2018 + (index % 8));
}

function paperDoi(index: number) {
  return `10.7777/zs.synthetic.${padded(index + 1, 6)}`;
}

function itemKey(index: number) {
  return `SYN${padded(index + 1, 7)}`;
}

function sourceRef(index: number, libraryId: number) {
  return `${libraryId}:${itemKey(index)}`;
}

function targetIndexForReference(args: {
  sourceIndex: number;
  offset: number;
  count: number;
}) {
  if (args.count <= 1) {
    return args.sourceIndex;
  }
  const target = (args.sourceIndex + args.offset * 17 + 13) % args.count;
  return target === args.sourceIndex ? (target + 1) % args.count : target;
}

function referencePayload(args: {
  sourceIndex: number;
  count: number;
  fanout: number;
}) {
  return Array.from({ length: args.fanout }, (_, offset) => {
    const targetIndex = targetIndexForReference({
      sourceIndex: args.sourceIndex,
      offset,
      count: args.count,
    });
    return {
      title: paperTitle(targetIndex),
      year: paperYear(targetIndex),
      authors: [`Synthetic Author ${targetIndex % 97}`],
      doi: paperDoi(targetIndex),
      roles: [ROLES[(args.sourceIndex + offset) % ROLES.length]],
    };
  });
}

function notePayloadBlocks(args: {
  index: number;
  count: number;
  fanout: number;
}) {
  const references = referencePayload({
    sourceIndex: args.index,
    count: args.count,
    fanout: args.fanout,
  });
  return [
    {
      payloadType: "digest-markdown",
      version: "1",
      format: "text",
      payload: [
        `# ${paperTitle(args.index)}`,
        "",
        `Synthetic digest body for benchmark paper ${args.index + 1}.`,
      ].join("\n"),
    },
    {
      payloadType: "references-json",
      version: "1",
      format: "json",
      payload: { references },
    },
    {
      payloadType: "citation-analysis-json",
      version: "1",
      format: "json",
      payload: {
        citations: references.map((reference, referenceIndex) => ({
          reference_index: referenceIndex,
          title: reference.title,
          role: reference.roles[0],
        })),
      },
    },
  ];
}

export function createSyntheticSynthesisBenchmarkRegistryInputs(args: {
  paperCount: number;
  referenceFanout?: number;
  libraryId?: number;
}): ReferenceSidecarInput[] {
  const paperCount = Math.max(1, Math.floor(Number(args.paperCount) || 1));
  const fanout = Math.max(0, Math.floor(Number(args.referenceFanout) || 3));
  const libraryId = Math.max(1, Math.floor(Number(args.libraryId) || 1));
  return Array.from({ length: paperCount }, (_, index) => {
    return {
      libraryId,
      itemKey: itemKey(index),
      title: paperTitle(index),
      year: paperYear(index),
      itemType: "journalArticle",
      creators: [`Synthetic Author ${index % 97}`],
      doi: paperDoi(index),
      citekey: `synthetic${padded(index + 1, 5)}`,
      tags: [
        TOPIC_TAGS[index % TOPIC_TAGS.length],
        TOPIC_TAGS[(index + 3) % TOPIC_TAGS.length],
      ],
      collections: [`collection:${padded((index % 20) + 1, 2)}`],
      dateAdded: `2026-05-${padded((index % 27) + 1, 2)}T00:00:00.000Z`,
      notes: [
        {
          key: `SYN-NOTE-${padded(index + 1, 7)}`,
          title: "Synthetic synthesis payloads",
          html: "",
          updatedAt: "2026-05-27T00:00:00.000Z",
          payloadBlocks: notePayloadBlocks({
            index,
            count: paperCount,
            fanout,
          }),
        },
      ],
    };
  });
}

export function createSyntheticSynthesisBenchmarkRepositoryState(args: {
  paperCount: number;
  graphFanout?: number;
  libraryId?: number;
}): SyntheticSynthesisBenchmarkRepositoryState {
  const paperCount = Math.max(1, Math.floor(Number(args.paperCount) || 1));
  const graphFanout = Math.max(0, Math.floor(Number(args.graphFanout) || 2));
  const libraryId = Math.max(1, Math.floor(Number(args.libraryId) || 1));
  const timestamp = "2026-05-27T00:00:00.000Z";
  const nodes: SynthesisCitationNodeRecord[] = [];
  const edges: SynthesisCitationEdgeRecord[] = [];
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();

  for (let index = 0; index < paperCount; index += 1) {
    const source = sourceRef(index, libraryId);
    const key = itemKey(index);
    nodes.push({
      literatureItemId: source,
      nodeStatus: "active",
      hasZoteroBinding: true,
      title: paperTitle(index),
      year: paperYear(index),
      summaryJson: "{}",
      updatedAt: timestamp,
    });
    outgoingCounts.set(source, graphFanout);
    incomingCounts.set(source, 0);
  }

  for (let sourceIndex = 0; sourceIndex < paperCount; sourceIndex += 1) {
    for (let offset = 0; offset < graphFanout; offset += 1) {
      const targetIndex = targetIndexForReference({
        sourceIndex,
        offset,
        count: paperCount,
      });
      const target = sourceRef(targetIndex, libraryId);
      incomingCounts.set(
        target,
        (incomingCounts.get(target) || 0) + 1,
      );
      edges.push({
        edgeId: `edge:${padded(sourceIndex + 1, 7)}:${offset}`,
        sourceLiteratureItemId: sourceRef(sourceIndex, libraryId),
        targetLiteratureItemId: target,
        referenceInstanceId: `ref:${padded(sourceIndex + 1, 7)}:${offset}`,
        resolutionId: `res:${padded(sourceIndex + 1, 7)}:${offset}`,
        edgeStatus: "matched",
        rolesJson: JSON.stringify([
          ROLES[(sourceIndex + offset) % ROLES.length],
        ]),
        weight: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  const lightweightMetrics: SynthesisCitationLightMetricsRecord[] =
    nodes.map((node) => {
      const incomingCount = incomingCounts.get(node.literatureItemId) || 0;
      const outgoingCount = outgoingCounts.get(node.literatureItemId) || 0;
      return {
        literatureItemId: node.literatureItemId,
        outgoingCount,
        incomingCount,
        matchedOutgoingCount: outgoingCount,
        unresolvedOutgoingCount: 0,
        ambiguousOutgoingCount: 0,
        localDegree: incomingCount + outgoingCount,
        sourceStructureVersion: 1,
        updatedAt: timestamp,
      };
    });
  const complexMetrics: SynthesisCitationComplexMetricsRecord[] =
    lightweightMetrics.map((metric, index) => ({
      literatureItemId: metric.literatureItemId,
      nodeId: `zotero:item:${itemKey(index)}`,
      paperRef: `${libraryId}:${itemKey(index)}`,
      itemKey: itemKey(index),
      title: paperTitle(index),
      year: paperYear(index),
      internalInDegree: metric.incomingCount,
      internalOutDegree: metric.outgoingCount,
      externalReferenceCount: 0,
      unresolvedReferenceCount: 0,
      internalPagerank: 0,
      componentId: "synthetic",
      componentSize: paperCount,
      isIsolated: metric.localDegree === 0,
      ageNorm: 0,
      recencyNorm: 0,
      inDegreeNorm: metric.incomingCount,
      outDegreeNorm: metric.outgoingCount,
      pagerankNorm: 0,
      foundationScore: metric.incomingCount,
      frontierScore: metric.outgoingCount,
      synthesisRoleHintsJson: "[]",
      sourceStructureVersion: 1,
      sourceGraphHash: "sha256:synthetic-graph",
      metricsHash: "sha256:synthetic-metrics",
      status: "ready",
      updatedAt: timestamp,
    }));
  return {
    citationGraphState: {
      nodes,
      edges,
      lightweightMetrics,
      complexMetrics,
    },
  };
}

export function createSyntheticSynthesisBenchmarkDataset(
  name: SyntheticSynthesisBenchmarkDatasetName,
): SyntheticSynthesisBenchmarkDataset {
  const paperCount = DATASET_SIZES[name];
  const referenceFanout = 3;
  return {
    name,
    paperCount,
    referenceFanout,
    registryInputs: createSyntheticSynthesisBenchmarkRegistryInputs({
      paperCount,
      referenceFanout,
    }),
  };
}

function pageOffset(cursor: string | undefined) {
  if (!cursor) return 0;
  const parsed = Number(cursor.replace(/^offset:/, ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function boundedPageLimit(limit: number | undefined) {
  return Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
}

function syntheticTopicApplyRequest(args: {
  name: SyntheticSynthesisBenchmarkDatasetName;
  paperRefs: string[];
}): SynthesisTopicApplyRequest {
  const topicId = `topic:production-route:${args.name}`;
  const sourcePaperRef = args.paperRefs[0];
  const sectionValues: Record<string, unknown> = {
    topic: {
      id: topicId,
      title: `Synthetic production-route ${args.name}`,
      definition: "A governed native-route scale fixture",
      discipline: "Information Science",
      scope: "Production-route parity and scale evidence",
    },
    summary: { overview: "A deterministic governed benchmark Topic." },
    taxonomy: {
      summary: { text: "One deterministic benchmark route." },
      nodes: [
        {
          id: "route:benchmark",
          definition: "Native production-route evidence",
          core_problem: "Keep route evidence non-vacuous",
          mechanism: "Typed composition, Rust, SQLite, workers, and Host",
          source_paper_refs: [sourcePaperRef],
          strengths: ["deterministic"],
          limitations: ["synthetic fixture"],
          maturity: "validated",
        },
      ],
    },
    improvement_dimensions: [
      {
        id: "dimension:boundedness",
        analysis: "The fixture exercises bounded production reads.",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    claims: [
      {
        id: "claim:production-route",
        text: "The governed fixture traverses the native route.",
        analysis: "The result is materialized through production ownership.",
        scope: "Synthetic benchmark",
        source_paper_refs: [sourcePaperRef],
      },
    ],
    timeline_events: {
      summary: { text: "Setup precedes warmup and formal measurement." },
      events: [
        {
          id: "event:setup",
          description: "Dataset state is applied before measurement.",
          phase: "setup",
          source_paper_refs: [sourcePaperRef],
        },
      ],
    },
    source_papers: [
      {
        paper_ref: sourcePaperRef,
        digest_ref: {
          paper_ref: sourcePaperRef,
          payload_type: "digest-markdown",
        },
      },
    ],
    debates: [],
    coverage: {
      coverage_verdict: "partial",
      coverage_reason: "This is a bounded deterministic scale fixture.",
      coverage_caveats: ["Synthetic inputs do not establish research claims."],
      external_context_summary: "External context is outside the benchmark.",
      suggested_collection_directions: [],
    },
    future_directions: [
      { id: "future:parity", source_paper_refs: [sourcePaperRef] },
    ],
    review_outline: {
      topic_importance: "Non-vacuous evidence protects migration decisions.",
      writing_strategies: [
        {
          id: "strategy:evidence",
          title: "Evidence",
          review_thesis: "Production behavior must be measured directly.",
          writing_strategy: "Follow the production data path.",
          best_for: "Migration verification",
          risks: "Synthetic fixture scope",
          section_plan: ["Setup", "Measure", "Gate"],
          source_paper_refs: [sourcePaperRef],
        },
      ],
      recommended_strategy_id: "strategy:evidence",
    },
    statistics: {
      paper_count: args.paperRefs.length,
      time_span: { start_year: 2018, end_year: 2026 },
      route_coverage: `${args.paperRefs.length} synthetic papers`,
      coverage_verdict: "partial",
    },
    synthesis_report: {
      title: "Synthetic production-route benchmark",
      source_section_chapters: {
        research_routes: "taxonomy.summary",
        historical_progression: "timeline_events.summary",
      },
      body: [
        "This deterministic benchmark fixture exists only to measure native production-route behavior. Its generated papers, references, tags, and Topic membership provide stable volume and relationship inputs so the benchmark can distinguish a populated bounded result from an empty response that happened to complete quickly. The fixture carries no research claim beyond those generated inputs, and its single purpose is to expose the cost and observable semantics of the production ownership path.",
        "Setup is completed before warmup and formal sampling. Public grouped-client calls stage the Topic and other domain inputs, native composition applies the approved transfer policy, the authenticated HTTP route dispatches into Rust, and the resulting facts are stored by the production repository. Measurements therefore exclude fixture construction while still proving that every measured read depends on state materialized through the same route used by the plugin.",
        "The formal samples record request and response bytes, repository query and write counts, reverse-Host calls, maintenance receipt latency, returned rows, and process memory. Empty Topic, Index, or Graph evidence is rejected unless the stress dataset reports an explicit structured degraded state. These constraints keep the report useful as migration evidence even while later implementation stages are still expected to reveal performance or parity failures.",
      ].join("\n\n"),
    },
    source_artifacts: [],
    diagnostics: { warnings: [] },
  };
  const sidecarValues: Record<string, Record<string, unknown>> = {
    topic_interest_metadata: {
      schema: "topic_interest_metadata.v1",
      topic_id: topicId,
      include_terms: ["production route"],
    },
    concept_cards_proposal: {
      schema_id: "synthesis.concept_cards_proposal",
      schema_version: "1.0.0",
      cards: [],
    },
    topic_graph_relation_proposals: {
      schema_id: "synthesis.topic_graph_relation_proposals",
      schema_version: "1.0.0",
      proposals: [],
    },
    prospective_topic_relation_proposals: {
      schema_id: "synthesis.prospective_topic_relation_proposals",
      schema_version: "1.0.0",
      proposals: [],
    },
  };
  return {
    bundle: {
      kind: "topic_synthesis",
      operation: "create",
      mode: "create",
      language: "en",
      topic_definition: {
        id: topicId,
        title: `Synthetic production-route ${args.name}`,
        definition: "A governed native-route scale fixture",
      },
      resolver_manifest_path: "asset/resolver",
      analysis_manifest_path: "asset/manifest",
      artifact_metadata: {},
      markdown: "",
    },
    assets: [
      {
        id: "asset/manifest",
        mediaType: "application/json",
        text: JSON.stringify({
          schema_id: "synthesis.topic_analysis_manifest",
          schema_version: "3.0.0",
          operation: "create",
          topic_id: topicId,
          language: "en",
          sections: Object.fromEntries(
            Object.keys(sectionValues).map((name) => [
              name,
              { path: `asset/section/${name}`, content_type: "json" },
            ]),
          ),
          sidecars: Object.fromEntries(
            Object.keys(sidecarValues).map((name) => [
              name,
              {
                path: `asset/sidecar/${name}`,
                content_type: "json",
                schema_id: `fixture.${name}`,
              },
            ]),
          ),
        }),
      },
      ...Object.entries(sectionValues).map(([name, value]) => ({
        id: `asset/section/${name}`,
        mediaType: "application/json" as const,
        text: JSON.stringify(value),
      })),
      ...Object.entries(sidecarValues).map(([name, value]) => ({
        id: `asset/sidecar/${name}`,
        mediaType: "application/json" as const,
        text: JSON.stringify(value),
      })),
      {
        id: "asset/resolver",
        mediaType: "application/json",
        text: JSON.stringify({
          resolver: {
            paper_refs: [sourcePaperRef],
            collection_key: [],
            combine: "union",
          },
          resolved_paper_set: {
            papers: args.paperRefs.map((paperRef) => ({ paper_ref: paperRef })),
          },
        }),
      },
    ],
  };
}

export function createSyntheticSynthesisProductionRouteDataset(
  name: SyntheticSynthesisBenchmarkDatasetName,
): SyntheticSynthesisProductionRouteDataset {
  const paperCount = DATASET_SIZES[name];
  const referenceFanout = 3;
  const changedPaperRefs = Array.from(
    { length: Math.min(50, paperCount) },
    (_, index) => sourceRef(index, 1),
  );
  const changed = new Set(changedPaperRefs);
  const snapshotRevision = `synthetic-production-route:${name}:v1`;
  const items = Array.from({ length: paperCount }, (_, index) => ({
    paperRef: sourceRef(index, 1),
    libraryId: 1,
    itemKey: itemKey(index),
    itemType: "journalArticle" as const,
    title: paperTitle(index),
    year: paperYear(index),
    date: paperYear(index),
    creators: [`Synthetic Author ${index % 97}`],
    tags: [
      TOPIC_TAGS[index % TOPIC_TAGS.length],
      TOPIC_TAGS[(index + 3) % TOPIC_TAGS.length],
    ],
    collections: [`collection:${padded((index % 20) + 1, 2)}`],
    doi: paperDoi(index),
    arxiv: "",
    isbn: "",
    url: "",
    citekey: `synthetic${padded(index + 1, 5)}`,
    dateAdded: `2026-05-${padded((index % 27) + 1, 2)}T00:00:00.000Z`,
    metadataHash: fixtureHash("metadata", index),
  }));
  const itemIndexByPaperRef = new Map(
    items.map((item, index) => [item.paperRef, index]),
  );
  const artifacts = items.flatMap((item, index) =>
    ([
      ["digest", "digest-markdown"],
      ["references", "references-json"],
      ["citation_analysis", "citation-analysis-json"],
    ] as const).map(([artifactType, payloadType]) => {
      const available =
        changed.has(item.paperRef) && artifactType !== "digest";
      return {
        paperRef: item.paperRef,
        artifactType,
        payloadType,
        status: available ? ("available" as const) : ("missing" as const),
        ...(available
          ? {
              locator: `synthetic:${name}:${item.itemKey}:${artifactType}`,
              payloadHash: fixtureHash(artifactType, index),
              estimatedSize: 512,
            }
          : {}),
        diagnostics: [],
      };
    }),
  );
  const tagEffects = items.slice(0, Math.min(250, items.length)).map((item, index) => ({
    libraryId: item.libraryId,
    itemKey: item.itemKey,
    tags: [TOPIC_TAGS[index % TOPIC_TAGS.length]],
  }));
  return {
    name,
    paperCount,
    referenceFanout,
    changedPaperRefs,
    tagEffects,
    topicApplyRequest: syntheticTopicApplyRequest({
      name,
      paperRefs: items.map((item) => item.paperRef),
    }),
    tagSuggestionRequest(ordinal) {
      const tag = `topic:production-route-effect-${name}-${ordinal}`;
      return {
        entries: [
          {
            tag,
            facet: "topic",
            note: "governed production-route batch fixture",
            source_flow: "production-route-performance",
            parent_bindings: tagEffects.map(({ libraryId, itemKey }) => ({
              libraryId,
              itemKey,
            })),
          },
        ],
      };
    },
    listItemsPage(request) {
      const cursor = request.cursor || "";
      const offset = pageOffset(cursor);
      const limit = boundedPageLimit(request.limit);
      const page = items.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      return {
        items: page,
        cursor,
        nextCursor: nextOffset < items.length ? `offset:${nextOffset}` : "",
        hasMore: nextOffset < items.length,
        returned: page.length,
        limit,
        snapshotRevision,
      };
    },
    scanArtifactsPage(request) {
      const cursor = request.cursor || "";
      const offset = pageOffset(cursor);
      const limit = boundedPageLimit(request.limit);
      const selectedIndexes = request.paperRefs?.length
        ? Array.from(new Set(request.paperRefs)).flatMap((paperRef) => {
            const index = itemIndexByPaperRef.get(paperRef);
            return index === undefined ? [] : [index];
          })
        : undefined;
      const requestedArtifactTypes = request.artifactTypes?.length
        ? new Set(request.artifactTypes)
        : undefined;
      if (!selectedIndexes) {
        const selectedArtifacts = requestedArtifactTypes
          ? artifacts.filter(({ artifactType }) =>
              requestedArtifactTypes.has(artifactType),
            )
          : artifacts;
        const page = selectedArtifacts.slice(offset, offset + limit);
        const nextOffset = offset + page.length;
        return {
          artifacts: page,
          cursor,
          nextCursor:
            nextOffset < selectedArtifacts.length
              ? `offset:${nextOffset}`
              : "",
          hasMore: nextOffset < selectedArtifacts.length,
          returned: page.length,
          limit,
          snapshotRevision,
        };
      }
      const sourceCount = selectedIndexes.length;
      const pageIndexes = selectedIndexes.slice(offset, offset + limit);
      const page = pageIndexes.flatMap((index) =>
        artifacts
          .slice(index * 3, index * 3 + 3)
          .filter(
            ({ artifactType }) =>
              !requestedArtifactTypes || requestedArtifactTypes.has(artifactType),
          ),
      );
      const nextOffset = offset + pageIndexes.length;
      return {
        artifacts: page,
        cursor,
        nextCursor: nextOffset < sourceCount ? `offset:${nextOffset}` : "",
        hasMore: nextOffset < sourceCount,
        returned: pageIndexes.length,
        limit,
        snapshotRevision,
      };
    },
    readArtifact(request) {
      const locator = String(request.locator || "");
      const item = items.find((candidate) => locator.includes(candidate.itemKey));
      if (!item) return { status: "missing", diagnostics: [] };
      if (locator.endsWith(":references")) {
        const index = items.indexOf(item);
        return {
          status: "available",
          payloadHash: request.expectedHash,
          content: {
            kind: "json",
            value: {
              references: referencePayload({
                sourceIndex: index,
                count: paperCount,
                fanout: referenceFanout,
              }),
            },
          },
          diagnostics: [],
        };
      }
      return {
        status: "available",
        payloadHash: request.expectedHash,
        content: { kind: "json", value: { citations: [] } },
        diagnostics: [],
      };
    },
  };
}
