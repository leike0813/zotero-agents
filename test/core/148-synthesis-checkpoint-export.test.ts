import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildSynthesisKnowledgeGraphPaths } from "../../src/modules/synthesis/foundation";
import { createSynthesisConceptKbService } from "../../src/modules/synthesis/conceptKb";
import { createSynthesisLiteratureRegistryService } from "../../src/modules/synthesis/literatureRegistry";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import { createSynthesisService } from "../../src/modules/synthesis/service";
import { createSynthesisTagVocabularyService } from "../../src/modules/synthesis/tagVocabulary";
import { createSynthesisTopicGraphService } from "../../src/modules/synthesis/topicGraph";
import {
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-checkpoint-export-"));
}

describe("Synthesis checkpoint export", function () {
  it("exports SQLite runtime state to canonical JSON only through an explicit command", async function () {
    const root = await makeRuntimeRoot();
    const now = () => "2026-05-27T00:00:00.000Z";
    const repository = createSynthesisRepository({ runtimeRoot: root, now });
    const paths = buildSynthesisKnowledgeGraphPaths(root);

    await createSynthesisLiteratureRegistryService({
      root,
      now,
      repository,
    }).importLiteratureRegistryCheckpoint({
      papers: [
        {
          paper_ref: "1:CHECKPT",
          library_id: 1,
          item_key: "CHECKPT",
          title: "Checkpoint Paper",
          year: "2026",
          item_type: "journalArticle",
          tags: ["field:cv"],
          collections: ["synthesis"],
          creators: ["Ada Lovelace"],
          doi: "10.1000/checkpoint",
          artifacts: {},
          readiness: "ready",
          coverage: "complete",
          diagnostics: [],
          row_hash: "sha256:checkpoint-paper",
        },
      ],
      referenceInstances: [
        {
          reference_instance_id: "refinst:checkpoint:0",
          source_paper_ref: "1:CHECKPT",
          reference_index: 0,
          provisional_key: "reference:missing",
          title: "Missing Reference",
          year: "2025",
          authors: ["Grace Hopper"],
          raw: "Grace Hopper. Missing Reference. 2025.",
          roles: ["background"],
        },
      ],
      referenceResolutions: [
        {
          resolution_id: "resolution:checkpoint:0",
          reference_instance_id: "refinst:checkpoint:0",
          source_paper_ref: "1:CHECKPT",
          provisional_key: "reference:missing",
          status: "unmatched",
          confidence: "review",
          diagnostics: [],
        },
      ],
      transactionId: "sqlite-seed-literature",
    });
    await createSynthesisTopicGraphService({
      root,
      now,
      repository,
    }).saveTopicGraph({
      nodes: [
        {
          topic_id: "topic-checkpoint",
          title: "Checkpoint Topic",
          node_type: "materialized",
        },
      ],
      edges: [],
      transactionId: "sqlite-seed-topic",
    });
    await createSynthesisConceptKbService({
      root,
      now,
      repository,
    }).importConceptKbCheckpoint({
      concepts: [
        {
          concept_id: "concept:checkpoint",
          label: "Checkpoint",
          aliases: [],
          concept_type: "method",
          domain: "testing",
          status: "active",
          sense_ids: ["sense:checkpoint"],
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z",
        },
      ],
      senses: [
        {
          sense_id: "sense:checkpoint",
          concept_id: "concept:checkpoint",
          label: "Checkpoint",
          aliases: [],
          domain: "testing",
          confidence: "high",
          source_topic_ids: ["topic-checkpoint"],
          evidence: [],
          created_at: "2026-05-27T00:00:00.000Z",
          updated_at: "2026-05-27T00:00:00.000Z",
        },
      ],
      topicLinks: [
        {
          topic_id: "topic-checkpoint",
          links: [
            {
              topic_id: "topic-checkpoint",
              concept_id: "concept:checkpoint",
              sense_id: "sense:checkpoint",
              label: "Checkpoint",
              confidence: "high",
              source: "topic_synthesis_concept_cards",
              created_at: "2026-05-27T00:00:00.000Z",
              updated_at: "2026-05-27T00:00:00.000Z",
            },
          ],
        },
      ],
      transactionId: "sqlite-seed-concept",
    });
    await createSynthesisTagVocabularyService({
      root,
      now,
      repository,
    }).saveTagVocabulary({
      entries: [{ tag: "field:cv", facet: "field" }],
      transactionId: "sqlite-seed-tags",
    });

    assert.isFalse(
      await runtimePathExists(
        path.join(paths.citationGraphRoot, "manifest.json"),
      ),
    );
    assert.isFalse(
      await runtimePathExists(path.join(paths.topicGraphRoot, "manifest.json")),
    );
    assert.isFalse(
      await runtimePathExists(path.join(paths.conceptsRoot, "manifest.json")),
    );
    assert.isFalse(
      await runtimePathExists(path.join(paths.tagsRoot, "vocabulary.json")),
    );

    const service = createSynthesisService({
      root,
      libraryId: 1,
      now,
      synthesisRepository: repository,
    });
    const checkpoint = await service.exportSynthesisCheckpoint({
      transactionId: "sqlite-checkpoint",
    });

    const literatureManifest = JSON.parse(
      await readRuntimeTextFile(
        path.join(paths.citationGraphRoot, "manifest.json"),
      ),
    );
    const topicManifest = JSON.parse(
      await readRuntimeTextFile(
        path.join(paths.topicGraphRoot, "manifest.json"),
      ),
    );
    const conceptManifest = JSON.parse(
      await readRuntimeTextFile(path.join(paths.conceptsRoot, "manifest.json")),
    );
    const vocabulary = JSON.parse(
      await readRuntimeTextFile(path.join(paths.tagsRoot, "vocabulary.json")),
    );

    assert.equal(checkpoint.transactionId, "sqlite-checkpoint");
    assert.equal(
      checkpoint.domains.literature.transactionId,
      "sqlite-checkpoint-literature",
    );
    assert.equal(literatureManifest.data.paper_count, 1);
    assert.equal(literatureManifest.data.reference_instance_count, 1);
    assert.equal(topicManifest.data.node_count, 1);
    assert.equal(conceptManifest.data.concept_count, 1);
    assert.deepEqual(
      vocabulary.data.tags.map((entry: { tag: string }) => entry.tag),
      ["field:cv"],
    );
    assert.isTrue(
      await runtimePathExists(
        path.join(paths.stateRoot, "literature-registry-index.json"),
      ),
    );
    assert.isTrue(
      await runtimePathExists(
        path.join(paths.stateRoot, "citation-graph-index.json"),
      ),
    );

    const verified = await service.verifySynthesisCheckpoint();

    assert.isTrue(verified.ok);
    assert.equal(verified.domains.literature.db.counts.papers, 1);
    assert.equal(verified.domains.topicGraph.db.counts.nodes, 1);
    assert.equal(verified.domains.conceptKb.db.counts.concepts, 1);
    assert.equal(verified.domains.tagVocabulary.db.counts.entries, 1);

    const vocabularyPath = path.join(paths.tagsRoot, "vocabulary.json");
    const envelope = JSON.parse(await readRuntimeTextFile(vocabularyPath));
    envelope.data.tags.push({ tag: "field:nlp", facet: "field" });
    await writeRuntimeTextFile(
      vocabularyPath,
      `${JSON.stringify(envelope, null, 2)}\n`,
    );

    const failed = await service.verifySynthesisCheckpoint();

    assert.isFalse(failed.ok);
    assert.equal(repository.countRows("synt_tag_vocabulary_entry"), 1);
    assert.equal(failed.domains.tagVocabulary.db.counts.entries, 1);
    assert.equal(failed.domains.tagVocabulary.checkpoint.counts.entries, 2);
    assert.isTrue(
      failed.domains.tagVocabulary.diagnostics.some(
        (diagnostic) => diagnostic.code === "checkpoint_count_mismatch",
      ),
    );
  });
});
