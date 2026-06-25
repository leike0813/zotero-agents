import { createSynthesisConceptKbService } from "./conceptKb";
import {
  buildSynthesisKnowledgeGraphPaths,
  hashCanonicalJson,
  resolveSynthesisPersistenceRoot,
} from "./foundation";
import {
  createSynthesisRepository,
  type SynthesisRepository,
} from "./repository";
import { createSynthesisTagVocabularyService } from "./tagVocabulary";
import { createSynthesisTopicGraphService } from "./topicGraph";
import {
  listRuntimeChildren,
  readRuntimeTextFile,
  runtimePathExists,
} from "../runtimePersistence";
import { joinPath } from "../../utils/path";

type ServiceOptions = {
  root: string;
  now?: () => string;
  repository?: SynthesisRepository;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function timestampSegment(value: string) {
  return cleanString(value).replace(/[^A-Za-z0-9._-]+/g, "_") || "now";
}

function unwrapCanonicalData(value: unknown) {
  if (value && typeof value === "object" && "data" in value) {
    return (value as { data?: unknown }).data;
  }
  return value;
}

async function readCheckpointJson(path: string) {
  if (!(await runtimePathExists(path))) {
    return undefined;
  }
  try {
    return unwrapCanonicalData(JSON.parse(await readRuntimeTextFile(path)));
  } catch {
    return undefined;
  }
}

async function readCheckpointAssets(directory: string) {
  const children: string[] = await listRuntimeChildren(directory);
  const assets: unknown[] = [];
  for (const child of children.sort((left, right) =>
    left.localeCompare(right),
  )) {
    const parsed = await readCheckpointJson(child);
    if (parsed !== undefined) {
      assets.push(parsed);
    }
  }
  return assets;
}

function countObject(values: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(values).sort(([left], [right]) => left.localeCompare(right)),
  ) as Record<string, number>;
}

function signature(counts: Record<string, number>, records: unknown) {
  return {
    counts: countObject(counts),
    hash: hashCanonicalJson(records),
  };
}

type VerifyDomain = {
  ok: boolean;
  db: { counts: Record<string, number>; hash: string };
  checkpoint: { counts: Record<string, number>; hash: string };
  diagnostics: Array<{
    code: string;
    severity: "error" | "warning";
    message: string;
    details?: Record<string, unknown>;
  }>;
};

function verifyDomain(args: {
  domain: string;
  db: ReturnType<typeof signature>;
  checkpoint: ReturnType<typeof signature>;
}): VerifyDomain {
  const diagnostics: VerifyDomain["diagnostics"] = [];
  const keys = new Set([
    ...Object.keys(args.db.counts),
    ...Object.keys(args.checkpoint.counts),
  ]);
  for (const key of [...keys].sort()) {
    const dbCount = args.db.counts[key] || 0;
    const checkpointCount = args.checkpoint.counts[key] || 0;
    if (dbCount !== checkpointCount) {
      diagnostics.push({
        code: "checkpoint_count_mismatch",
        severity: "error",
        message: `${args.domain} checkpoint count does not match SQLite state.`,
        details: { field: key, db: dbCount, checkpoint: checkpointCount },
      });
    }
  }
  if (args.db.hash !== args.checkpoint.hash) {
    diagnostics.push({
      code: "checkpoint_hash_mismatch",
      severity: "error",
      message: `${args.domain} checkpoint hash does not match SQLite state.`,
      details: { db: args.db.hash, checkpoint: args.checkpoint.hash },
    });
  }
  return {
    ok: diagnostics.length === 0,
    db: args.db,
    checkpoint: args.checkpoint,
    diagnostics,
  };
}

function topicRecords(input: {
  nodes: unknown[];
  edges: unknown[];
  review_items: unknown[];
}) {
  return {
    nodes: input.nodes,
    edges: input.edges,
    review_items: input.review_items,
  };
}

function conceptRecords(input: {
  concepts: unknown[];
  senses: unknown[];
  aliases: unknown[];
  relations: unknown[];
  review_items: unknown[];
  topic_links: unknown[];
}) {
  return {
    concepts: input.concepts,
    senses: input.senses,
    aliases: input.aliases,
    relations: input.relations,
    review_items: input.review_items,
    topic_links: input.topic_links,
  };
}

function normalizeTagEntries(entries: unknown[]) {
  return entries
    .map((entry) => {
      const row =
        entry && typeof entry === "object"
          ? (entry as Record<string, unknown>)
          : {};
      const normalized: Record<string, unknown> = {
        tag: cleanString(row.tag),
        facet: cleanString(row.facet),
      };
      for (const key of ["note", "source", "replacement", "last_synced_at"]) {
        const value = cleanString(row[key]);
        if (value) {
          normalized[key] = value;
        }
      }
      if (row.deprecated === true) {
        normalized.deprecated = true;
      }
      if (Array.isArray(row.aliases) && row.aliases.length) {
        normalized.aliases = row.aliases
          .map(cleanString)
          .filter(Boolean)
          .sort();
      }
      if (Array.isArray(row.abbrev) && row.abbrev.length) {
        normalized.abbrev = row.abbrev.map(cleanString).filter(Boolean).sort();
      }
      const usageCount = Math.max(0, Math.floor(Number(row.usage_count) || 0));
      if (usageCount) {
        normalized.usage_count = usageCount;
      }
      return normalized;
    })
    .filter((entry) => entry.tag)
    .sort((left, right) =>
      cleanString(left.tag).localeCompare(cleanString(right.tag)),
    );
}

function tagRecords(input: {
  entries: unknown[];
  aliases: Record<string, string>;
  abbrev: Record<string, string>;
  protocol: unknown;
  validation_warnings: unknown[];
}) {
  return {
    entries: normalizeTagEntries(input.entries),
    aliases: input.aliases,
    abbrev: input.abbrev,
    protocol: input.protocol,
    validation_warnings: input.validation_warnings,
  };
}

export function createSynthesisCheckpointExportService(
  options: ServiceOptions,
) {
  const root = cleanString(options.root);
  if (!root) {
    throw new Error(
      "Synthesis checkpoint export service requires a storage root",
    );
  }
  const now = options.now || (() => new Date().toISOString());
  const repository =
    options.repository ||
    createSynthesisRepository({
      runtimeRoot: resolveSynthesisPersistenceRoot(root),
      now,
    });
  const topicGraph = createSynthesisTopicGraphService({
    root,
    now,
    repository,
  });
  const conceptKb = createSynthesisConceptKbService({
    root,
    now,
    repository,
  });
  const tagVocabulary = createSynthesisTagVocabularyService({
    root,
    now,
    repository,
  });

  async function exportSynthesisCheckpoint(
    args: { transactionId?: string } = {},
  ) {
    const transactionId =
      cleanString(args.transactionId) ||
      `synthesis-checkpoint-${timestampSegment(now())}`;
    const topicGraphCheckpoint = await topicGraph.exportTopicGraphCheckpoint({
      transactionId: `${transactionId}-topic-graph`,
    });
    const conceptKbCheckpoint = await conceptKb.exportConceptKbCheckpoint({
      transactionId: `${transactionId}-concept-kb`,
    });
    const tagVocabularyCheckpoint =
      await tagVocabulary.exportTagVocabularyCheckpoint({
        transactionId: `${transactionId}-tag-vocabulary`,
      });
    return {
      transactionId,
      domains: {
        topicGraph: topicGraphCheckpoint,
        conceptKb: conceptKbCheckpoint,
        tagVocabulary: tagVocabularyCheckpoint,
      },
      diagnostics: [],
    };
  }

  async function verifySynthesisCheckpoint() {
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    const topicDb = await topicGraph.loadTopicGraph();
    const topicCheckpointRecords = topicRecords({
      nodes: await readCheckpointAssets(
        joinPath(paths.topicGraphRoot, "nodes"),
      ),
      edges: await readCheckpointAssets(
        joinPath(paths.topicGraphRoot, "edges"),
      ),
      review_items: await readCheckpointAssets(
        joinPath(paths.topicGraphRoot, "review"),
      ),
    });
    const topicDbRecords = topicRecords({
      nodes: topicDb.nodes,
      edges: topicDb.edges,
      review_items: topicDb.review_items,
    });

    const conceptDb = await conceptKb.loadConceptKb();
    const topicLinksByTopic = new Map<string, unknown[]>();
    for (const link of repository.listTopicConceptLinks()) {
      const topicId = cleanString(link.topicId);
      topicLinksByTopic.set(topicId, [
        ...(topicLinksByTopic.get(topicId) || []),
        {
          topic_id: link.topicId,
          concept_id: link.conceptId,
          sense_id: link.senseId,
          label: link.label,
          relevance: link.relevance,
          confidence: link.confidence,
          source:
            link.source === "manual"
              ? "manual"
              : "topic_synthesis_concept_cards",
          created_at: link.createdAt || "",
          updated_at: link.updatedAt || "",
        },
      ]);
    }
    const conceptDbTopicLinks = Array.from(topicLinksByTopic.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([topicId, links]) => ({
        topic_id: topicId,
        links: links.sort((left, right) =>
          hashCanonicalJson(left).localeCompare(hashCanonicalJson(right)),
        ),
      }));
    const conceptDbRecords = conceptRecords({
      concepts: conceptDb.concepts,
      senses: conceptDb.senses,
      aliases: conceptDb.aliases,
      relations: conceptDb.relations,
      review_items: conceptDb.review_items,
      topic_links: conceptDbTopicLinks,
    });
    const conceptCheckpointRecords = conceptRecords({
      concepts: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "concepts"),
      ),
      senses: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "senses"),
      ),
      aliases: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "aliases"),
      ),
      relations: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "relations"),
      ),
      review_items: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "review"),
      ),
      topic_links: await readCheckpointAssets(
        joinPath(paths.conceptsRoot, "topic-links"),
      ),
    });

    const tagDb = await tagVocabulary.loadTagVocabulary();
    const tagVocabularyAsset =
      ((await readCheckpointJson(
        joinPath(paths.tagsRoot, "vocabulary.json"),
      )) as { tags?: unknown[]; entries?: unknown[] } | undefined) || {};
    const tagAliasesAsset =
      ((await readCheckpointJson(joinPath(paths.tagsRoot, "aliases.json"))) as
        | { aliases?: Record<string, string> }
        | undefined) || {};
    const tagAbbrevAsset =
      ((await readCheckpointJson(joinPath(paths.tagsRoot, "abbrev.json"))) as
        | { abbrevs?: Record<string, string>; abbrev?: Record<string, string> }
        | undefined) || {};
    const tagDbRecords = tagRecords({
      entries: tagDb.entries,
      aliases: tagDb.aliases,
      abbrev: tagDb.abbrev,
      protocol: tagDb.protocol,
      validation_warnings: [],
    });
    const tagCheckpointRecords = tagRecords({
      entries: tagVocabularyAsset.tags || tagVocabularyAsset.entries || [],
      aliases: tagAliasesAsset.aliases || {},
      abbrev: tagAbbrevAsset.abbrevs || tagAbbrevAsset.abbrev || {},
      protocol: await readCheckpointJson(
        joinPath(paths.tagsRoot, "protocol.json"),
      ),
      validation_warnings: [],
    });

    const domains = {
      topicGraph: verifyDomain({
        domain: "topicGraph",
        db: signature(
          {
            nodes: topicDbRecords.nodes.length,
            edges: topicDbRecords.edges.length,
            review_items: topicDbRecords.review_items.length,
          },
          topicDbRecords,
        ),
        checkpoint: signature(
          {
            nodes: topicCheckpointRecords.nodes.length,
            edges: topicCheckpointRecords.edges.length,
            review_items: topicCheckpointRecords.review_items.length,
          },
          topicCheckpointRecords,
        ),
      }),
      conceptKb: verifyDomain({
        domain: "conceptKb",
        db: signature(
          {
            concepts: conceptDbRecords.concepts.length,
            senses: conceptDbRecords.senses.length,
            aliases: conceptDbRecords.aliases.length,
            relations: conceptDbRecords.relations.length,
            review_items: conceptDbRecords.review_items.length,
            topic_links: conceptDbRecords.topic_links.length,
          },
          conceptDbRecords,
        ),
        checkpoint: signature(
          {
            concepts: conceptCheckpointRecords.concepts.length,
            senses: conceptCheckpointRecords.senses.length,
            aliases: conceptCheckpointRecords.aliases.length,
            relations: conceptCheckpointRecords.relations.length,
            review_items: conceptCheckpointRecords.review_items.length,
            topic_links: conceptCheckpointRecords.topic_links.length,
          },
          conceptCheckpointRecords,
        ),
      }),
      tagVocabulary: verifyDomain({
        domain: "tagVocabulary",
        db: signature(
          {
            entries: tagDbRecords.entries.length,
            aliases: Object.keys(tagDbRecords.aliases).length,
            abbrev: Object.keys(tagDbRecords.abbrev).length,
            protocol: tagDbRecords.protocol ? 1 : 0,
          },
          tagDbRecords,
        ),
        checkpoint: signature(
          {
            entries: tagCheckpointRecords.entries.length,
            aliases: Object.keys(tagCheckpointRecords.aliases).length,
            abbrev: Object.keys(tagCheckpointRecords.abbrev).length,
            protocol: tagCheckpointRecords.protocol ? 1 : 0,
          },
          tagCheckpointRecords,
        ),
      }),
    };
    const diagnostics = Object.values(domains).flatMap(
      (domain) => domain.diagnostics,
    );
    return {
      ok: diagnostics.length === 0,
      mode: "verify" as const,
      domains,
      diagnostics,
    };
  }

  return {
    exportSynthesisCheckpoint,
    verifySynthesisCheckpoint,
  };
}

export type SynthesisCheckpointExportService = ReturnType<
  typeof createSynthesisCheckpointExportService
>;
