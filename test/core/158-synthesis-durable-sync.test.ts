import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  buildSynthesisStoragePaths,
  hashCanonicalJson,
} from "../../src/modules/synthesis/foundation";
import {
  applySynthesisDurableImport as applyBaseSynthesisDurableImport,
  buildSynthesisDurableExportSnapshot as buildBaseSynthesisDurableExportSnapshot,
  createSynthesisDurableEnvelope,
  listSynthesisDurableManifestEntities,
  previewSynthesisDurableImport as previewBaseSynthesisDurableImport,
  writeSynthesisDurableExportSnapshot as writeBaseSynthesisDurableExportSnapshot,
  writeSynthesisDurableSyncIndex,
} from "../../src/modules/synthesis/durableSync";
import { createSynthesisRepository } from "../../src/modules/synthesis/repository";
import {
  readRuntimeTextFile,
  runtimePathExists,
  writeRuntimeTextFile,
} from "../../src/modules/runtimePersistence";

const NOW = "2026-06-14T00:00:00.000Z";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-durable-sync-"));
}

async function readJson(pathValue: string) {
  return JSON.parse(await readRuntimeTextFile(pathValue));
}

function buildSynthesisDurableExportSnapshot(
  args: Parameters<typeof buildBaseSynthesisDurableExportSnapshot>[0],
) {
  return buildBaseSynthesisDurableExportSnapshot({
    allowRepositoryCreateForTests: true,
    ...args,
  });
}

function writeSynthesisDurableExportSnapshot(
  args: Parameters<typeof writeBaseSynthesisDurableExportSnapshot>[0],
) {
  return writeBaseSynthesisDurableExportSnapshot({
    allowRepositoryCreateForTests: true,
    ...args,
  });
}

function previewSynthesisDurableImport(
  args: Parameters<typeof previewBaseSynthesisDurableImport>[0],
) {
  return previewBaseSynthesisDurableImport({
    allowRepositoryCreateForTests: true,
    ...args,
  });
}

function applySynthesisDurableImport(
  args: Parameters<typeof applyBaseSynthesisDurableImport>[0],
) {
  return applyBaseSynthesisDurableImport({
    allowRepositoryCreateForTests: true,
    ...args,
  });
}

async function seedDurableFacts(root: string, label = "Alpha concept") {
  const repository = createSynthesisRepository({
    runtimeRoot: root,
    now: () => NOW,
  });
  repository.upsertConcept({
    conceptId: "concept:alpha",
    label,
    conceptType: "method",
    domain: "vision",
    status: "accepted",
    shortDefinition: "A durable concept.",
  });
  repository.upsertConceptSense({
    senseId: "sense:alpha",
    conceptId: "concept:alpha",
    label: "Alpha sense",
    domain: "vision",
    confidence: "high",
  });
  repository.upsertTopicConceptLink({
    topicId: "topic-alpha",
    conceptId: "concept:alpha",
    senseId: "sense:alpha",
    label: "Alpha",
    confidence: "high",
    source: "manual",
  });
  repository.upsertTopicGraphNode({
    topicId: "topic-alpha",
    title: "Topic Alpha",
    nodeType: "materialized",
    definitionStatus: "has_synthesis",
    isRoot: true,
  });
  repository.upsertTopicGraphEdge({
    edgeId: "edge:alpha-beta",
    sourceTopicId: "topic-alpha",
    targetTopicId: "topic-beta",
    relation: "related",
    status: "accepted",
  });
  repository.upsertCanonicalReference({
    canonicalReferenceId: "canonical:alpha",
    title: "Alpha Paper",
    normalizedTitle: "alpha paper",
    year: "2025",
    status: "active",
  });
  repository.upsertReferenceBinding({
    bindingId: "binding:alpha",
    canonicalReferenceId: "canonical:alpha",
    libraryId: 1,
    itemKey: "ITEMALPHA",
    status: "accepted",
  });
  repository.upsertReferenceMatchProposal({
    proposalId: "proposal:alpha",
    proposalKind: "zotero_binding",
    status: "open",
    canonicalReferenceId: "canonical:alpha",
    libraryId: 1,
    itemKey: "ITEMALPHA",
    confidence: "medium",
  });
  repository.upsertReviewItem({
    reviewItemId: "review:alpha",
    reviewKind: "reference_binding",
    priority: 1,
    status: "open",
  });
  repository.upsertTopicInterestMetadata({
    topicId: "topic-alpha",
    includeTermsJson: JSON.stringify(["alpha"]),
  });
  repository.upsertTopicDiscoveryHint({
    hintId: "hint:alpha",
    topicId: "topic-alpha",
    literatureItemId: "lit:alpha",
    score: 0.9,
    status: "open",
  });
  repository.upsertTagVocabularyEntry({
    tag: "field:vision",
    facet: "field",
    source: "manual",
  });
  repository.upsertTagAlias({
    alias: "cv",
    tag: "field:vision",
    source: "manual",
  });
  repository.upsertTagAbbrev({
    abbrevKey: "CV",
    abbrevValue: "Computer Vision",
  });
  repository.upsertTagProtocol({
    protocolId: "default",
    version: "1.0.0",
    tagPattern: "^[a-z]+:[a-z0-9_-]+$",
    maxTagLength: 120,
    facetsJson: JSON.stringify(["field"]),
  });
  repository.upsertRelatedItemsSyncEffect({
    effectId: "effect:alpha",
    operationId: "operation:related-alpha",
    sourceLiteratureItemId: "lit:source",
    targetLiteratureItemId: "lit:target",
    sourceLibraryId: 1,
    sourceItemKey: "SOURCE",
    targetLibraryId: 1,
    targetItemKey: "TARGET",
    action: "add",
    status: "pending_external_write",
  });
  repository.upsertOperation({
    operationId: "operation:runtime-only",
    operationType: "git_sync",
    label: "Runtime only",
    status: "running",
  });
  await writeRuntimeTextFile(
    path.join(
      buildSynthesisStoragePaths(root, "topic-alpha").currentRoot,
      "brief.md",
    ),
    "# Topic Alpha\n",
  );
  await writeRuntimeTextFile(
    path.join(root, "state", "zotero-agents.db"),
    "sqlite should not be exported",
  );
  await writeRuntimeTextFile(
    path.join(root, "state", "synthesis.db"),
    "synthesis sqlite should not be exported",
  );
  return repository;
}

describe("Synthesis durable sync exchange", function () {
  it("does not create a repository database when export is missing an injected repository", async function () {
    const root = await makeRuntimeRoot();
    const exportRoot = path.join(root, "export");

    try {
      await writeBaseSynthesisDurableExportSnapshot({
        root,
        outputRoot: exportRoot,
        now: () => NOW,
      });
      assert.fail("expected durable export to require an injected repository");
    } catch (error) {
      assert.equal(
        error instanceof Error ? error.message : String(error),
        "synthesis_durable_repository_required",
      );
    }
    assert.isFalse(
      await runtimePathExists(path.join(root, "state", "zotero-agents.db")),
    );
    assert.isFalse(
      await runtimePathExists(path.join(root, "state", "synthesis.db")),
    );
  });

  it("exports deterministic durable assets without SQLite/runtime-only rows", async function () {
    const root = await makeRuntimeRoot();
    await seedDurableFacts(root);
    const exportRoot = path.join(root, "export");

    const first = await writeSynthesisDurableExportSnapshot({
      root,
      outputRoot: exportRoot,
      now: () => NOW,
    });
    const second = await buildSynthesisDurableExportSnapshot({
      root,
      now: () => NOW,
    });

    assert.equal(first.manifest.manifest_hash, second.manifest.manifest_hash);
    assert.deepEqual(
      first.manifest.assets.map((asset) => [asset.path, asset.hash]),
      second.manifest.assets.map((asset) => [asset.path, asset.hash]),
    );
    assert.isTrue(
      await runtimePathExists(path.join(exportRoot, "manifest.json")),
    );
    assert.isTrue(
      first.manifest.assets.every((asset) => asset.path.startsWith("bundles/")),
    );
    assert.includeMembers(
      first.manifest.assets.map((asset) => asset.path),
      [
        "bundles/concepts.json",
        "bundles/references.json",
        "bundles/topic-graph.json",
        "bundles/discovery.json",
        "bundles/tags.json",
        "bundles/related-items.json",
      ],
    );
    assert.includeMembers(
      listSynthesisDurableManifestEntities(first.manifest).map(
        (asset) => asset.entity_kind,
      ),
      [
        "concept",
        "concept_sense",
        "topic_current_asset",
        "topic_graph_node",
        "reference_binding",
        "reference_match_proposal",
        "review_item",
        "topic_discovery_hint",
        "tag_vocabulary",
        "tag_protocol",
        "related_items_sync_effect",
      ],
    );
    assert.isFalse(
      first.manifest.assets.some((asset) =>
        asset.path.includes("zotero-agents.db"),
      ),
    );
    assert.isFalse(
      first.manifest.assets.some((asset) =>
        asset.path.includes("synthesis.db"),
      ),
    );
    assert.isFalse(
      listSynthesisDurableManifestEntities(first.manifest).some(
        (asset) => asset.entity_kind === "tombstone",
      ),
    );
    assert.isFalse(
      first.manifest.assets.some((asset) =>
        asset.path.includes("operation:runtime-only"),
      ),
    );
    assert.isFalse(await runtimePathExists(path.join(exportRoot, "concepts")));
    assert.isFalse(
      await runtimePathExists(path.join(exportRoot, "citation-graph")),
    );
  });

  it("hydrates durable facts and topic current assets into a clean runtime root", async function () {
    const sourceRoot = await makeRuntimeRoot();
    await seedDurableFacts(sourceRoot);
    const exportRoot = path.join(sourceRoot, "export");
    await writeSynthesisDurableExportSnapshot({
      root: sourceRoot,
      outputRoot: exportRoot,
      now: () => NOW,
    });
    const targetRoot = await makeRuntimeRoot();

    const imported = await applySynthesisDurableImport({
      root: targetRoot,
      sourceRoot: exportRoot,
      runId: "run:hydrate",
    });
    const target = createSynthesisRepository({ runtimeRoot: targetRoot });

    assert.isTrue(imported.applied);
    assert.equal(target.listConcepts()[0]?.label, "Alpha concept");
    assert.equal(target.listReferenceBindings()[0]?.itemKey, "ITEMALPHA");
    assert.equal(target.listTopicDiscoveryHints()[0]?.status, "open");
    assert.equal(target.listReviewItems()[0]?.reviewItemId, "review:alpha");
    assert.equal(target.listTagVocabularyEntries()[0]?.tag, "field:vision");
    assert.equal(
      target.listRelatedItemsSyncEffects()[0]?.effectId,
      "effect:alpha",
    );
    assert.equal(
      await readRuntimeTextFile(
        path.join(
          buildSynthesisStoragePaths(targetRoot, "topic-alpha").currentRoot,
          "brief.md",
        ),
      ),
      "# Topic Alpha\n",
    );
    assert.includeMembers(
      target.listCacheBasis().map((entry) => entry.status),
      ["stale"],
    );
  });

  it("blocks same-entity local and remote edits against the last synced hash", async function () {
    const localRoot = await makeRuntimeRoot();
    await seedDurableFacts(localRoot);
    const baseExportRoot = path.join(localRoot, "base-export");
    const base = await writeSynthesisDurableExportSnapshot({
      root: localRoot,
      outputRoot: baseExportRoot,
      now: () => NOW,
    });
    await writeSynthesisDurableSyncIndex({
      root: localRoot,
      manifest: base.manifest,
      imported: true,
      exported: true,
      runId: "run:base",
      now: NOW,
    });

    await seedDurableFacts(localRoot, "Local edit");
    const remoteRoot = await makeRuntimeRoot();
    await seedDurableFacts(remoteRoot, "Remote edit");
    const remoteExportRoot = path.join(remoteRoot, "remote-export");
    await writeSynthesisDurableExportSnapshot({
      root: remoteRoot,
      outputRoot: remoteExportRoot,
      now: () => NOW,
    });

    const preview = await previewSynthesisDurableImport({
      root: localRoot,
      sourceRoot: remoteExportRoot,
    });

    assert.isFalse(preview.ok);
    assert.isTrue(
      preview.conflicts.some(
        (conflict) =>
          conflict.entity_kind === "concept" &&
          conflict.entity_id === "concept:alpha" &&
          conflict.reason === "both_changed",
      ),
    );
    const manifest = await readJson(
      path.join(remoteExportRoot, "manifest.json"),
    );
    assert.isString(manifest.manifest_hash);
  });

  it("imports legacy per-entity durable snapshots and exports back as bundles", async function () {
    const sourceRoot = await makeRuntimeRoot();
    const exportRoot = path.join(sourceRoot, "legacy-export");
    const envelope = createSynthesisDurableEnvelope({
      schemaId: "synthesis.durable.concept",
      entityKind: "concept",
      entityId: "concept:legacy",
      data: {
        conceptId: "concept:legacy",
        label: "Legacy concept",
        conceptType: "method",
        domain: "vision",
        status: "accepted",
      },
      updatedAt: NOW,
    });
    const assetText = `${JSON.stringify(envelope, null, 2)}\n`;
    const assetPath = "concepts/concept_legacy.json";
    await writeRuntimeTextFile(path.join(exportRoot, assetPath), assetText);
    const manifestBase = {
      manifest_schema_version: "1.0.0",
      producer_version: "legacy-test",
      min_reader_version: "1.0.0",
      required_capabilities: ["durable-state.v1", "git-sync.v1"],
      domain_versions: {
        concept: "1.0.0",
      },
      generated_at: NOW,
      asset_count: 1,
      assets: [
        {
          path: assetPath,
          entity_kind: "concept",
          entity_id: "concept:legacy",
          schema_id: "synthesis.durable.concept",
          schema_version: "1.0.0",
          hash: hashCanonicalJson(assetText),
          bytes: assetText.length,
        },
      ],
    };
    await writeRuntimeTextFile(
      path.join(exportRoot, "manifest.json"),
      `${JSON.stringify(
        {
          ...manifestBase,
          manifest_hash: hashCanonicalJson(manifestBase),
        },
        null,
        2,
      )}\n`,
    );
    const targetRoot = await makeRuntimeRoot();

    const imported = await applySynthesisDurableImport({
      root: targetRoot,
      sourceRoot: exportRoot,
    });
    const nextExport = await writeSynthesisDurableExportSnapshot({
      root: targetRoot,
      outputRoot: path.join(targetRoot, "next-export"),
      now: () => NOW,
    });

    assert.isTrue(imported.applied);
    assert.equal(
      createSynthesisRepository({ runtimeRoot: targetRoot }).listConcepts()[0]
        ?.label,
      "Legacy concept",
    );
    assert.equal(nextExport.manifest.manifest_schema_version, "2.0.0");
    assert.deepEqual(
      nextExport.manifest.assets.map((asset) => asset.path),
      ["bundles/concepts.json"],
    );
  });
});
