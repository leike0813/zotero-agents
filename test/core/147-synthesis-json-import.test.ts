import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisKnowledgeGraphPaths,
  SynthesisSchemaRegistry,
  writeCanonicalJsonAsset,
} from "../../src/modules/synthesis/foundation";
import { createSynthesisJsonImportService } from "../../src/modules/synthesis/jsonImport";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import {
  SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
  SYNTHESIS_CONCEPT_SCHEMA_ID,
  SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
  SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
} from "../../src/modules/synthesis/conceptKb";
import {
  SYNTHESIS_TAG_ABBREV_SCHEMA_ID,
  SYNTHESIS_TAG_ALIASES_SCHEMA_ID,
  SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID,
  SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
} from "../../src/modules/synthesis/tagVocabulary";
import { SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID } from "../../src/modules/synthesis/topicGraph";
import {
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-json-import-"));
}

function importTestRegistry() {
  const registry = new SynthesisSchemaRegistry();
  for (const schemaId of [
    SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
    SYNTHESIS_CONCEPT_SCHEMA_ID,
    SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
    SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
    SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
    SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
    SYNTHESIS_TAG_ALIASES_SCHEMA_ID,
    SYNTHESIS_TAG_ABBREV_SCHEMA_ID,
    SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID,
  ]) {
    registry.registerDataSchema(schemaId, {
      type: "object",
      additionalProperties: true,
    });
  }
  return registry;
}

async function writeImportAsset(args: {
  root: string;
  relativePath: string;
  schemaId: string;
  data: unknown;
}) {
  return writeCanonicalJsonAsset({
    root: args.root,
    relativePath: args.relativePath,
    schemaId: args.schemaId,
    data: args.data,
    registry: importTestRegistry(),
    now: "2026-05-27T00:00:00.000Z",
  });
}

describe("Synthesis JSON import tooling", function () {
  it("dry-runs and applies canonical JSON import into SQLite without deleting sources", async function () {
    const root = await makeRuntimeRoot();
    await writeImportAsset({
      root,
      relativePath: "topic-graph/nodes/topic_alpha.json",
      schemaId: SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
      data: {
        topic_id: "topic-alpha",
        title: "Alpha",
        aliases: [],
        node_type: "materialized",
        created_at: "2026-05-27T00:00:00.000Z",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    });
    await writeImportAsset({
      root,
      relativePath: "concepts/concepts/concept_detr.json",
      schemaId: SYNTHESIS_CONCEPT_SCHEMA_ID,
      data: {
        concept_id: "concept:cv:detr",
        label: "DETR",
        aliases: ["DETR"],
        concept_type: "model",
        domain: "computer vision",
        status: "active",
        sense_ids: ["sense:cv:detr"],
        created_at: "2026-05-27T00:00:00.000Z",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    });
    await writeImportAsset({
      root,
      relativePath: "concepts/senses/sense_detr.json",
      schemaId: SYNTHESIS_CONCEPT_SENSE_SCHEMA_ID,
      data: {
        sense_id: "sense:cv:detr",
        concept_id: "concept:cv:detr",
        label: "DETR",
        aliases: ["DETR"],
        domain: "computer vision",
        short_definition: "Object detector.",
        definition: "Transformer object detector.",
        confidence: "high",
        source_topic_ids: ["topic-alpha"],
        evidence: [],
        created_at: "2026-05-27T00:00:00.000Z",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    });
    await writeImportAsset({
      root,
      relativePath: "concepts/aliases/alias_detr.json",
      schemaId: SYNTHESIS_CONCEPT_ALIAS_SCHEMA_ID,
      data: {
        alias_id: "alias:detr",
        alias: "DETR",
        normalized: "detr",
        concept_id: "concept:cv:detr",
        sense_id: "sense:cv:detr",
        status: "active",
        confidence: "high",
        created_at: "2026-05-27T00:00:00.000Z",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    });
    await writeImportAsset({
      root,
      relativePath: "topics/topic-alpha/current/concepts.json",
      schemaId: SYNTHESIS_CONCEPT_TOPIC_LINKS_SCHEMA_ID,
      data: {
        topic_id: "topic-alpha",
        links: [
          {
            topic_id: "topic-alpha",
            concept_id: "concept:cv:detr",
            sense_id: "sense:cv:detr",
            label: "DETR",
            confidence: "high",
            source: "topic_synthesis_concept_cards",
            created_at: "2026-05-27T00:00:00.000Z",
            updated_at: "2026-05-27T00:00:00.000Z",
          },
        ],
      },
    });
    await writeImportAsset({
      root,
      relativePath: "tags/vocabulary.json",
      schemaId: SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
      data: {
        version: "1.0.0",
        tags: [{ tag: "ai_task:NER", facet: "ai_task" }],
        abbrevs: { ner: "NER" },
      },
    });
    await writeImportAsset({
      root,
      relativePath: "tags/aliases.json",
      schemaId: SYNTHESIS_TAG_ALIASES_SCHEMA_ID,
      data: { aliases: { ner: "ai_task:NER" } },
    });
    await writeImportAsset({
      root,
      relativePath: "tags/abbrev.json",
      schemaId: SYNTHESIS_TAG_ABBREV_SCHEMA_ID,
      data: { abbrevs: { ner: "NER" } },
    });
    await writeImportAsset({
      root,
      relativePath: "tags/protocol.json",
      schemaId: SYNTHESIS_TAG_PROTOCOL_SCHEMA_ID,
      data: {
        version: "1.0.0",
        tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
        max_tag_length: 120,
        facets: ["ai_task"],
      },
    });
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisJsonImportService({ root, repository });

    const preview = await service.previewSynthesisJsonImport();

    assert.isFalse(preview.applied);
    assert.equal(preview.domains.topicGraph.counts.nodes, 1);
    assert.equal(preview.domains.conceptKb.counts.concepts, 1);
    assert.equal(preview.domains.tagVocabulary.counts.entries, 1);

    const applied = await service.applySynthesisJsonImport({
      transactionId: "json-import-test",
    });

    assert.isTrue(applied.applied);
    assert.equal(repository.countRows("synt_topic_graph_node"), 1);
    assert.equal(repository.countRows("synt_concept"), 1);
    assert.equal(repository.countRows("synt_topic_concept_link"), 1);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 1);
    assert.isTrue(
      await runtimePathExists(
        path.join(
          buildSynthesisKnowledgeGraphPaths(root).tagsRoot,
          "vocabulary.json",
        ),
      ),
    );
  });

  it("imports legacy projection fallback data when canonical assets are absent", async function () {
    const root = await makeRuntimeRoot();
    const paths = await buildSynthesisKnowledgeGraphPaths(root);
    await writeRuntimeTextFile(
      path.join(paths.stateRoot, "topic-graph-index.json"),
      `${JSON.stringify({
        schema_id: "synthesis.topic_graph_index_projection",
        nodes: [
          {
            topic_id: "topic-projection",
            title: "Projection Topic",
            aliases: [],
            node_type: "placeholder",
            created_at: "2026-05-27T00:00:00.000Z",
            updated_at: "2026-05-27T00:00:00.000Z",
          },
        ],
        edges: [],
        review_items: [],
      })}\n`,
    );
    await writeRuntimeTextFile(
      path.join(paths.stateRoot, "tag-index.json"),
      `${JSON.stringify({
        schema_id: "synthesis.tag_index_projection",
        tags: ["field:computer_vision"],
        aliases: {},
        abbrev: {},
        validation_warnings: [],
      })}\n`,
    );
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const service = createSynthesisJsonImportService({ root, repository });

    const applied = await service.applySynthesisJsonImport();

    assert.equal(applied.domains.topicGraph.source, "projection");
    assert.equal(applied.domains.tagVocabulary.source, "projection");
    assert.equal(repository.countRows("synt_topic_graph_node"), 1);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 1);
    assert.include(
      await readRuntimeTextFile(path.join(paths.stateRoot, "tag-index.json")),
      "field:computer_vision",
    );
  });

  it("does not auto-import existing checkpoint JSON during service reads", async function () {
    const root = await makeRuntimeRoot();
    await writeImportAsset({
      root,
      relativePath: "topic-graph/nodes/topic_startup.json",
      schemaId: SYNTHESIS_TOPIC_GRAPH_NODE_SCHEMA_ID,
      data: {
        topic_id: "topic-startup",
        title: "Startup Topic",
        aliases: [],
        node_type: "materialized",
        created_at: "2026-05-27T00:00:00.000Z",
        updated_at: "2026-05-27T00:00:00.000Z",
      },
    });
    await writeImportAsset({
      root,
      relativePath: "tags/vocabulary.json",
      schemaId: SYNTHESIS_TAG_VOCABULARY_SCHEMA_ID,
      data: {
        version: "1.0.0",
        tags: [{ tag: "field:startup", facet: "field" }],
      },
    });
    const repository = createSynthesisRepository({ runtimeRoot: root });
    const importService = createSynthesisJsonImportService({
      root,
      repository,
    });
    const preview = await importService.previewSynthesisJsonImport();
    const service = createSynthesisService({
      root,
      libraryId: 1,
      synthesisRepository: repository,
    });

    await service.getSynthesisSnapshot();

    assert.equal(preview.domains.topicGraph.counts.nodes, 1);
    assert.equal(preview.domains.tagVocabulary.counts.entries, 1);
    assert.equal(repository.countRows("synt_topic_graph_node"), 0);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 0);
  });
});
