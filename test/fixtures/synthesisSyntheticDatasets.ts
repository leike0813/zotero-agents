import type { ReferenceSidecarInput } from "../../src/modules/synthesis/registry";
import type {
  SynthesisCitationComplexMetricsRecord,
  SynthesisCitationEdgeRecord,
  SynthesisCitationGraphStateReplacement,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
} from "../../src/modules/synthesis/repository";

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
    metadataHash: `sha256:metadata:${padded(index + 1, 7)}`,
  }));
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
              payloadHash: `sha256:${artifactType}:${padded(index + 1, 7)}`,
              estimatedSize: 512,
            }
          : {}),
        diagnostics: [],
      };
    }),
  );
  return {
    name,
    paperCount,
    referenceFanout,
    changedPaperRefs,
    tagEffects: items.slice(0, Math.min(250, items.length)).map((item, index) => ({
      libraryId: item.libraryId,
      itemKey: item.itemKey,
      tags: [TOPIC_TAGS[index % TOPIC_TAGS.length]],
    })),
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
      const page = artifacts.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      return {
        artifacts: page,
        cursor,
        nextCursor:
          nextOffset < artifacts.length ? `offset:${nextOffset}` : "",
        hasMore: nextOffset < artifacts.length,
        returned: page.length,
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
