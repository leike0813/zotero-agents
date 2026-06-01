import { joinPath } from "../../utils/path";
import {
  collectRuntimeFiles,
  readRuntimeTextFile,
  runtimePathExists,
  runtimeRelativePath,
} from "../runtimePersistence";
import {
  buildSynthesisKnowledgeGraphPaths,
  initializeSynthesisKnowledgeGraphStore,
} from "./foundation";
import {
  createSynthesisConceptKbService,
  SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
  SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID,
  SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID,
  SYNTHESIS_CONCEPT_SCHEMA_ID,
  SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
  SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
  type SynthesisConcept,
  type SynthesisConceptAlias,
  type SynthesisConceptRelation,
  type SynthesisConceptReviewItem,
  type SynthesisConceptSense,
  type SynthesisTopicConceptLinksAsset,
} from "./conceptKb";
import {
  createSynthesisRepository,
  type SynthesisRepository,
} from "./repository";
import {
  createSynthesisTagVocabularyService,
  SYNTHESIS_TAG_ABBREV_SCHEMA_ID,
  SYNTHESIS_TAG_ALIASES_SCHEMA_ID,
  SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID,
  SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
  type SynthesisTagProtocolAsset,
  type SynthesisTagVocabularyEntry,
} from "./tagVocabulary";
import {
  createSynthesisTopicGraphService,
  SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID,
  SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
  SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID,
  type SynthesisTopicGraphEdge,
  type SynthesisTopicGraphNode,
  type SynthesisTopicGraphReviewItem,
} from "./topicGraph";

export type SynthesisJsonImportDiagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  path?: string;
  details?: unknown;
};

export type SynthesisJsonImportDomainReport = {
  source: "canonical" | "projection" | "mixed" | "empty";
  counts: Record<string, number>;
  diagnostics: SynthesisJsonImportDiagnostic[];
};

export type SynthesisJsonImportReport = {
  action: "dry-run" | "apply";
  applied: boolean;
  domains: {
    topicGraph: SynthesisJsonImportDomainReport;
    conceptKb: SynthesisJsonImportDomainReport;
    tagVocabulary: SynthesisJsonImportDomainReport;
  };
  diagnostics: SynthesisJsonImportDiagnostic[];
};

type ServiceOptions = {
  root: string;
  now?: () => string;
  repository?: SynthesisRepository;
};

type CanonicalEnvelopeRecord = {
  schemaId: string;
  data: unknown;
  relativePath: string;
};

type JsonImportData = {
  topicGraph: {
    source: SynthesisJsonImportDomainReport["source"];
    nodes: SynthesisTopicGraphNode[];
    edges: SynthesisTopicGraphEdge[];
    reviewItems: SynthesisTopicGraphReviewItem[];
    diagnostics: SynthesisJsonImportDiagnostic[];
  };
  conceptKb: {
    source: SynthesisJsonImportDomainReport["source"];
    concepts: SynthesisConcept[];
    senses: SynthesisConceptSense[];
    aliases: SynthesisConceptAlias[];
    relations: SynthesisConceptRelation[];
    reviewItems: SynthesisConceptReviewItem[];
    topicLinks: SynthesisTopicConceptLinksAsset[];
    diagnostics: SynthesisJsonImportDiagnostic[];
  };
  tagVocabulary: {
    source: SynthesisJsonImportDomainReport["source"];
    entries: SynthesisTagVocabularyEntry[];
    aliases: Record<string, string>;
    abbrev: Record<string, string>;
    protocol?: SynthesisTagProtocolAsset;
    diagnostics: SynthesisJsonImportDiagnostic[];
  };
  diagnostics: SynthesisJsonImportDiagnostic[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, "/");
}

function emptyData(): JsonImportData {
  return {
    topicGraph: {
      source: "empty",
      nodes: [],
      edges: [],
      reviewItems: [],
      diagnostics: [],
    },
    conceptKb: {
      source: "empty",
      concepts: [],
      senses: [],
      aliases: [],
      relations: [],
      reviewItems: [],
      topicLinks: [],
      diagnostics: [],
    },
    tagVocabulary: {
      source: "empty",
      entries: [],
      aliases: {},
      abbrev: {},
      protocol: undefined,
      diagnostics: [],
    },
    diagnostics: [],
  };
}

async function readJsonFile(path: string) {
  if (!(await runtimePathExists(path))) {
    return null;
  }
  const raw = await readRuntimeTextFile(path);
  return raw.trim() ? JSON.parse(raw) : null;
}

function recordDiagnostic(
  diagnostics: SynthesisJsonImportDiagnostic[],
  diagnostic: SynthesisJsonImportDiagnostic,
) {
  diagnostics.push(diagnostic);
}

async function collectCanonicalEnvelopes(root: string) {
  const paths = await initializeSynthesisKnowledgeGraphStore(root);
  const files = await collectRuntimeFiles(paths.synthesisRoot);
  const envelopes: CanonicalEnvelopeRecord[] = [];
  const diagnostics: SynthesisJsonImportDiagnostic[] = [];
  for (const file of files) {
    const relativePath = normalizeRelativePath(
      runtimeRelativePath(paths.synthesisRoot, file),
    );
    if (relativePath.startsWith("state/") || relativePath.startsWith("sync/")) {
      continue;
    }
    if (!relativePath.endsWith(".json")) {
      continue;
    }
    try {
      const parsed = await readJsonFile(file);
      if (!isRecord(parsed)) {
        continue;
      }
      const schemaId = cleanString(parsed.schema_id);
      if (!schemaId || !Object.prototype.hasOwnProperty.call(parsed, "data")) {
        continue;
      }
      envelopes.push({ schemaId, data: parsed.data, relativePath });
    } catch (error) {
      recordDiagnostic(diagnostics, {
        code: "json_import_invalid_json",
        severity: "error",
        message: "Could not parse JSON import source.",
        path: relativePath,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { envelopes, diagnostics };
}

function setSource(
  current: SynthesisJsonImportDomainReport["source"],
  incoming: "canonical" | "projection",
) {
  if (current === "empty") {
    return incoming;
  }
  return current === incoming ? current : "mixed";
}

function hasCanonicalTopicGraph(data: JsonImportData) {
  return (
    data.topicGraph.nodes.length ||
    data.topicGraph.edges.length ||
    data.topicGraph.reviewItems.length
  );
}

function hasCanonicalConceptKb(data: JsonImportData) {
  return (
    data.conceptKb.concepts.length ||
    data.conceptKb.senses.length ||
    data.conceptKb.aliases.length ||
    data.conceptKb.relations.length ||
    data.conceptKb.reviewItems.length ||
    data.conceptKb.topicLinks.length
  );
}

function hasCanonicalTags(data: JsonImportData) {
  return (
    data.tagVocabulary.entries.length ||
    Object.keys(data.tagVocabulary.aliases).length ||
    Object.keys(data.tagVocabulary.abbrev).length ||
    Boolean(data.tagVocabulary.protocol)
  );
}

function ingestEnvelope(
  data: JsonImportData,
  envelope: CanonicalEnvelopeRecord,
) {
  const payload = envelope.data;
  switch (envelope.schemaId) {
    case SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID:
      data.topicGraph.nodes.push(payload as SynthesisTopicGraphNode);
      data.topicGraph.source = setSource(data.topicGraph.source, "canonical");
      break;
    case SYNTHESIS_TOPIC_GRAPH_EDGE_SCHEMA_ID:
      data.topicGraph.edges.push(payload as SynthesisTopicGraphEdge);
      data.topicGraph.source = setSource(data.topicGraph.source, "canonical");
      break;
    case SYNTHESIS_TOPIC_GRAPH_REVIEW_ITEM_SCHEMA_ID:
      data.topicGraph.reviewItems.push(
        payload as SynthesisTopicGraphReviewItem,
      );
      data.topicGraph.source = setSource(data.topicGraph.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_SCHEMA_ID:
      data.conceptKb.concepts.push(payload as SynthesisConcept);
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID:
      data.conceptKb.senses.push(payload as SynthesisConceptSense);
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID:
      data.conceptKb.aliases.push(payload as SynthesisConceptAlias);
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_RELATION_SCHEMA_ID:
      data.conceptKb.relations.push(payload as SynthesisConceptRelation);
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_REVIEW_ITEM_SCHEMA_ID:
      data.conceptKb.reviewItems.push(payload as SynthesisConceptReviewItem);
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID:
      data.conceptKb.topicLinks.push(
        payload as SynthesisTopicConceptLinksAsset,
      );
      data.conceptKb.source = setSource(data.conceptKb.source, "canonical");
      break;
    case SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID: {
      const row = isRecord(payload) ? payload : {};
      const entries = Array.isArray(row.tags)
        ? row.tags
        : Array.isArray(row.entries)
          ? row.entries
          : [];
      data.tagVocabulary.entries.push(
        ...(entries as SynthesisTagVocabularyEntry[]),
      );
      if (isRecord(row.abbrevs)) {
        data.tagVocabulary.abbrev = {
          ...data.tagVocabulary.abbrev,
          ...(row.abbrevs as Record<string, string>),
        };
      }
      data.tagVocabulary.source = setSource(
        data.tagVocabulary.source,
        "canonical",
      );
      break;
    }
    case SYNTHESIS_TAG_ALIASES_SCHEMA_ID:
      if (isRecord(payload) && isRecord(payload.aliases)) {
        data.tagVocabulary.aliases = {
          ...data.tagVocabulary.aliases,
          ...(payload.aliases as Record<string, string>),
        };
      }
      data.tagVocabulary.source = setSource(
        data.tagVocabulary.source,
        "canonical",
      );
      break;
    case SYNTHESIS_TAG_ABBREV_SCHEMA_ID:
      if (isRecord(payload) && isRecord(payload.abbrevs || payload.abbrev)) {
        data.tagVocabulary.abbrev = {
          ...data.tagVocabulary.abbrev,
          ...((payload.abbrevs || payload.abbrev) as Record<string, string>),
        };
      }
      data.tagVocabulary.source = setSource(
        data.tagVocabulary.source,
        "canonical",
      );
      break;
    case SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID:
      data.tagVocabulary.protocol = payload as SynthesisTagProtocolAsset;
      data.tagVocabulary.source = setSource(
        data.tagVocabulary.source,
        "canonical",
      );
      break;
    default:
      break;
  }
}

async function readProjectionFallbacks(root: string, data: JsonImportData) {
  const paths = buildSynthesisKnowledgeGraphPaths(root);
  if (!hasCanonicalTopicGraph(data)) {
    const projection = await readJsonFile(
      joinPath(paths.stateRoot, "topic-graph-index.json"),
    ).catch(() => null);
    if (isRecord(projection)) {
      data.topicGraph.nodes = Array.isArray(projection.nodes)
        ? (projection.nodes as SynthesisTopicGraphNode[])
        : [];
      data.topicGraph.edges = Array.isArray(projection.edges)
        ? (projection.edges as SynthesisTopicGraphEdge[])
        : [];
      data.topicGraph.reviewItems = Array.isArray(projection.review_items)
        ? (projection.review_items as SynthesisTopicGraphReviewItem[])
        : [];
      if (hasCanonicalTopicGraph(data)) {
        data.topicGraph.source = setSource(
          data.topicGraph.source,
          "projection",
        );
      }
    }
  }
  if (!hasCanonicalConceptKb(data)) {
    const projection = await readJsonFile(
      joinPath(paths.stateRoot, "concept-kb-index.json"),
    ).catch(() => null);
    if (isRecord(projection)) {
      data.conceptKb.concepts = Array.isArray(projection.concepts)
        ? (projection.concepts as SynthesisConcept[])
        : [];
      data.conceptKb.senses = Array.isArray(projection.senses)
        ? (projection.senses as SynthesisConceptSense[])
        : [];
      data.conceptKb.aliases = Array.isArray(projection.aliases)
        ? (projection.aliases as SynthesisConceptAlias[])
        : [];
      data.conceptKb.relations = Array.isArray(projection.relations)
        ? (projection.relations as SynthesisConceptRelation[])
        : [];
      data.conceptKb.reviewItems = Array.isArray(projection.review_items)
        ? (projection.review_items as SynthesisConceptReviewItem[])
        : [];
      if (hasCanonicalConceptKb(data)) {
        data.conceptKb.source = setSource(data.conceptKb.source, "projection");
      }
    }
  }
  if (!hasCanonicalTags(data)) {
    const projection = await readJsonFile(
      joinPath(paths.stateRoot, "tag-index.json"),
    ).catch(() => null);
    if (isRecord(projection)) {
      data.tagVocabulary.entries = Array.isArray(projection.tags)
        ? (projection.tags as string[]).map((tag) => ({
            tag,
            facet: tag.includes(":") ? tag.split(":")[0] : "",
          }))
        : [];
      data.tagVocabulary.aliases = isRecord(projection.aliases)
        ? (projection.aliases as Record<string, string>)
        : {};
      data.tagVocabulary.abbrev = isRecord(projection.abbrev)
        ? (projection.abbrev as Record<string, string>)
        : {};
      if (hasCanonicalTags(data)) {
        data.tagVocabulary.source = setSource(
          data.tagVocabulary.source,
          "projection",
        );
      }
    }
  }
}

async function readImportData(root: string): Promise<JsonImportData> {
  const data = emptyData();
  const { envelopes, diagnostics } = await collectCanonicalEnvelopes(root);
  data.diagnostics.push(...diagnostics);
  for (const envelope of envelopes) {
    ingestEnvelope(data, envelope);
  }
  await readProjectionFallbacks(root, data);
  return data;
}

function domainReport(
  source: SynthesisJsonImportDomainReport["source"],
  counts: Record<string, number>,
  diagnostics: SynthesisJsonImportDiagnostic[],
): SynthesisJsonImportDomainReport {
  return { source, counts, diagnostics };
}

function reportFor(
  data: JsonImportData,
  action: "dry-run" | "apply",
  applied: boolean,
): SynthesisJsonImportReport {
  return {
    action,
    applied,
    domains: {
      topicGraph: domainReport(
        data.topicGraph.source,
        {
          nodes: data.topicGraph.nodes.length,
          edges: data.topicGraph.edges.length,
          reviewItems: data.topicGraph.reviewItems.length,
        },
        data.topicGraph.diagnostics,
      ),
      conceptKb: domainReport(
        data.conceptKb.source,
        {
          concepts: data.conceptKb.concepts.length,
          senses: data.conceptKb.senses.length,
          aliases: data.conceptKb.aliases.length,
          relations: data.conceptKb.relations.length,
          reviewItems: data.conceptKb.reviewItems.length,
          topicLinks: data.conceptKb.topicLinks.length,
        },
        data.conceptKb.diagnostics,
      ),
      tagVocabulary: domainReport(
        data.tagVocabulary.source,
        {
          entries: data.tagVocabulary.entries.length,
          aliases: Object.keys(data.tagVocabulary.aliases).length,
          abbrev: Object.keys(data.tagVocabulary.abbrev).length,
          protocol: data.tagVocabulary.protocol ? 1 : 0,
        },
        data.tagVocabulary.diagnostics,
      ),
    },
    diagnostics: data.diagnostics,
  };
}

function hasImportErrors(data: JsonImportData) {
  return [
    ...data.diagnostics,
    ...data.topicGraph.diagnostics,
    ...data.conceptKb.diagnostics,
    ...data.tagVocabulary.diagnostics,
  ].some((entry) => entry.severity === "error");
}

export function createSynthesisJsonImportService(options: ServiceOptions) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error("Synthesis JSON import service requires a storage root");
  }
  const repository =
    options.repository ||
    createSynthesisRepository({
      runtimeRoot: root,
      now: options.now,
    });
  const topicGraph = createSynthesisTopicGraphService({
    root,
    now: options.now,
    repository,
  });
  const conceptKb = createSynthesisConceptKbService({
    root,
    now: options.now,
    repository,
  });
  const tagVocabulary = createSynthesisTagVocabularyService({
    root,
    now: options.now,
    repository,
  });

  async function previewSynthesisJsonImport() {
    return reportFor(await readImportData(root), "dry-run", false);
  }

  async function applySynthesisJsonImport(
    args: { transactionId?: string } = {},
  ) {
    const data = await readImportData(root);
    if (hasImportErrors(data)) {
      const report = reportFor(data, "apply", false);
      report.diagnostics.push({
        code: "json_import_validation_failed",
        severity: "error",
        message: "Synthesis JSON import failed dry-run validation.",
      });
      return report;
    }
    if (data.topicGraph.source !== "empty") {
      await topicGraph.importTopicGraphCheckpoint({
        nodes: data.topicGraph.nodes,
        edges: data.topicGraph.edges,
        reviewItems: data.topicGraph.reviewItems,
        transactionId: args.transactionId
          ? `${args.transactionId}-topic-graph`
          : undefined,
      });
    }
    if (data.conceptKb.source !== "empty") {
      await conceptKb.importConceptKbCheckpoint({
        concepts: data.conceptKb.concepts,
        senses: data.conceptKb.senses,
        aliases: data.conceptKb.aliases,
        relations: data.conceptKb.relations,
        reviewItems: data.conceptKb.reviewItems,
        topicLinks: data.conceptKb.topicLinks,
        transactionId: args.transactionId
          ? `${args.transactionId}-concept-kb`
          : undefined,
      });
    }
    if (
      data.tagVocabulary.entries.length ||
      data.tagVocabulary.source !== "empty"
    ) {
      await tagVocabulary.saveTagVocabulary({
        entries: data.tagVocabulary.entries,
        aliases: data.tagVocabulary.aliases,
        abbrev: data.tagVocabulary.abbrev,
        protocol: data.tagVocabulary.protocol,
        transactionId: args.transactionId
          ? `${args.transactionId}-tag-vocabulary`
          : undefined,
      });
    }
    return reportFor(data, "apply", true);
  }

  return {
    previewSynthesisJsonImport,
    applySynthesisJsonImport,
  };
}

export type SynthesisJsonImportService = ReturnType<
  typeof createSynthesisJsonImportService
>;
