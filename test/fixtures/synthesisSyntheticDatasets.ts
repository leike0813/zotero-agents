import type { PaperRegistryInput } from "../../src/modules/synthesis/registry";
import type {
  SynthesisArtifactStateRecord,
  SynthesisCitationComplexMetricsRecord,
  SynthesisCitationEdgeRecord,
  SynthesisCitationGraphStateReplacement,
  SynthesisCitationLightMetricsRecord,
  SynthesisCitationNodeRecord,
  SynthesisIndexStateReplacement,
  SynthesisLiteratureIdentifierRecord,
  SynthesisLiteratureItemRecord,
  SynthesisReviewItemRecord,
  SynthesisZoteroBindingRecord,
} from "../../src/modules/synthesis/repository";

export type SyntheticSynthesisBenchmarkDatasetName = "1k" | "10k";

export type SyntheticSynthesisBenchmarkDataset = {
  name: SyntheticSynthesisBenchmarkDatasetName;
  paperCount: number;
  referenceFanout: number;
  registryInputs: PaperRegistryInput[];
};

export type SyntheticSynthesisBenchmarkRepositoryState = {
  indexState: SynthesisIndexStateReplacement;
  citationGraphState: SynthesisCitationGraphStateReplacement;
  reviewItemId: string;
};

const DATASET_SIZES: Record<SyntheticSynthesisBenchmarkDatasetName, number> = {
  "1k": 1000,
  "10k": 10000,
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

function literatureItemId(index: number) {
  return `lit:synthetic:${padded(index + 1, 7)}`;
}

function itemKey(index: number) {
  return `SYN${padded(index + 1, 7)}`;
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
}): PaperRegistryInput[] {
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
  const literatureItems: SynthesisLiteratureItemRecord[] = [];
  const identifiers: SynthesisLiteratureIdentifierRecord[] = [];
  const zoteroBindings: SynthesisZoteroBindingRecord[] = [];
  const artifactStates: SynthesisArtifactStateRecord[] = [];
  const nodes: SynthesisCitationNodeRecord[] = [];
  const edges: SynthesisCitationEdgeRecord[] = [];
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();

  for (let index = 0; index < paperCount; index += 1) {
    const litId = literatureItemId(index);
    const key = itemKey(index);
    literatureItems.push({
      literatureItemId: litId,
      displayTitle: paperTitle(index),
      normalizedTitle: paperTitle(index).toLowerCase(),
      titleNormalizerVersion: "synthetic-benchmark.v1",
      year: paperYear(index),
      authorsJson: JSON.stringify([`Synthetic Author ${index % 97}`]),
      status: "active",
      createdFrom: "synthetic-benchmark",
      confidence: "1.0",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    identifiers.push(
      {
        literatureItemId: litId,
        kind: "doi",
        normalizedValue: paperDoi(index),
        displayValue: paperDoi(index),
        source: "synthetic-benchmark",
        confidence: "1.0",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        literatureItemId: litId,
        kind: "citekey",
        normalizedValue: `synthetic${padded(index + 1, 5)}`,
        displayValue: `synthetic${padded(index + 1, 5)}`,
        source: "synthetic-benchmark",
        confidence: "1.0",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    );
    zoteroBindings.push({
      libraryId,
      itemKey: key,
      literatureItemId: litId,
      itemType: "journalArticle",
      bindingStatus: "active",
      dateAdded: timestamp,
      tagsJson: JSON.stringify([
        TOPIC_TAGS[index % TOPIC_TAGS.length],
        TOPIC_TAGS[(index + 3) % TOPIC_TAGS.length],
      ]),
      collectionsJson: JSON.stringify([
        `collection:${padded((index % 20) + 1, 2)}`,
      ]),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    for (const artifactType of ["digest", "references", "citation_analysis"]) {
      artifactStates.push({
        literatureItemId: litId,
        artifactType,
        status: "available",
        payloadHash: `sha256:synthetic-${artifactType}-${padded(index + 1, 7)}`,
        noteKey: `SYN-NOTE-${padded(index + 1, 7)}`,
        diagnosticsJson: "[]",
        updatedAt: timestamp,
      });
    }
    nodes.push({
      literatureItemId: litId,
      nodeStatus: "active",
      hasZoteroBinding: true,
      title: paperTitle(index),
      year: paperYear(index),
      summaryJson: "{}",
      updatedAt: timestamp,
    });
    outgoingCounts.set(litId, graphFanout);
    incomingCounts.set(litId, 0);
  }

  for (let sourceIndex = 0; sourceIndex < paperCount; sourceIndex += 1) {
    for (let offset = 0; offset < graphFanout; offset += 1) {
      const targetIndex = targetIndexForReference({
        sourceIndex,
        offset,
        count: paperCount,
      });
      const targetLitId = literatureItemId(targetIndex);
      incomingCounts.set(
        targetLitId,
        (incomingCounts.get(targetLitId) || 0) + 1,
      );
      edges.push({
        edgeId: `edge:${padded(sourceIndex + 1, 7)}:${offset}`,
        sourceLiteratureItemId: literatureItemId(sourceIndex),
        targetLiteratureItemId: targetLitId,
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
    literatureItems.map((item) => {
      const incomingCount = incomingCounts.get(item.literatureItemId) || 0;
      const outgoingCount = outgoingCounts.get(item.literatureItemId) || 0;
      return {
        literatureItemId: item.literatureItemId,
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
  const reviewItemId = "review:synthetic-delete:SYN0000001";
  const reviewItems: SynthesisReviewItemRecord[] = [
    {
      reviewItemId,
      reviewKind: "zotero_item_delete",
      priority: 0,
      status: "open",
      scopeKind: "paper",
      scopeRef: `${libraryId}:${itemKey(0)}`,
      payloadJson: JSON.stringify({
        literature_item_id: literatureItemId(0),
        paper_ref: `${libraryId}:${itemKey(0)}`,
      }),
      diagnosticsJson: "[]",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    indexState: {
      literatureItems,
      identifiers,
      zoteroBindings,
      artifactStates,
      reviewItems,
    },
    citationGraphState: {
      nodes,
      edges,
      lightweightMetrics,
      complexMetrics,
    },
    reviewItemId,
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
