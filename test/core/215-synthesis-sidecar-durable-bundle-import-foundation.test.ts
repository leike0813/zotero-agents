import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
  classifySynthesisDurableImportFacts,
  normalizeSynthesisDurableImportEntries,
  rebuildSynthesisDurableSyncIndex,
  type SynthesisDurableImportFact,
} from "../../packages/synthesis-contracts/src/durableBundleImport";
import {
  createSynthesisDurableBundleCodec,
  type SynthesisDurableAssetEnvelope,
} from "../../packages/synthesis-contracts/src/durableBundle";
import {
  canonicalizeSynthesisEngineJson,
  hashSynthesisEngineCanonicalJson,
} from "../../packages/synthesis-engine/src/canonicalJson";
import {
  createSynthesisDurableBundleApplication,
  type SynthesisDurableImportRepositoryCapture,
} from "../../packages/synthesis-application/src/durableBundleApplication";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisSidecarTopicCanonicalStore } from "../../apps/synthesis-service/src/topicCanonicalStoreNode";
import { createSynthesisSidecarDurableBundleApplication } from "../../apps/synthesis-service/src/durableBundleApplicationNode";
import {
  canonicalSynthesisTopicPathId,
  computeSynthesisTopicCurrentHashes,
  rebuildSynthesisTopicCanonicalSnapshot,
} from "../../packages/synthesis-application/src/topicCanonical";

const HASH_A = `sha256:${"a".repeat(64)}`;
const HASH_B = `sha256:${"b".repeat(64)}`;
const HASH_C = `sha256:${"c".repeat(64)}`;
const NOW = "2026-07-18T09:00:00.000Z";
const codec = createSynthesisDurableBundleCodec({
  canonicalizeJson: canonicalizeSynthesisEngineJson,
  hashCanonicalJson: hashSynthesisEngineCanonicalJson,
});

const emptySyncIndex = () =>
  rebuildSynthesisDurableSyncIndex({
    schema_id: "synthesis.durable_sync_index",
    schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
    updated_at: NOW,
    entities: {},
  });

function bundleSource(snapshot: ReturnType<typeof codec.buildExport>) {
  return {
    readManifestText: async () => snapshot.manifestText,
    readAssetText: async (assetPath: string) =>
      snapshot.assets.find((asset) => asset.path === assetPath)?.text ?? null,
  };
}

function importCapture(
  aggregateBasis: unknown = { revision: 1 },
): SynthesisDurableImportRepositoryCapture {
  return {
    aggregateBasis,
    topicBases: [],
    drafts: [],
    indexRevision: 0,
    syncIndex: emptySyncIndex(),
    commitReceipt: null,
  };
}

async function expectRejected(operation: Promise<unknown>, code: string) {
  let rejected: unknown;
  try {
    await operation;
  } catch (error) {
    rejected = error;
  }
  assert.instanceOf(rejected, Error);
  assert.equal((rejected as Error).message, code);
}

function envelope(
  entityKind: SynthesisDurableAssetEnvelope["entity_kind"],
  entityId: string,
  data: unknown,
): SynthesisDurableAssetEnvelope {
  return {
    schema_id: `synthesis.durable.${entityKind}`,
    schema_version: "1.0.0",
    entity_kind: entityKind,
    entity_id: entityId,
    base_hash: "",
    content_hash: HASH_A,
    updated_at: NOW,
    data,
  };
}

function fact(
  entityId: string,
  hash: string,
  entityKind: SynthesisDurableImportFact["entityKind"] = "concept",
): SynthesisDurableImportFact {
  return {
    entityKind,
    entityId,
    path: `bundles/${entityKind}.json`,
    hash,
  };
}

function conceptData(conceptId: string, label = "Concept") {
  return {
    conceptId,
    label,
    conceptType: "method",
    domain: "research",
    status: "active",
  };
}

function topicSnapshot(topicId: string, markdown: Record<string, string> = {}) {
  const sections = { brief: { text: "Brief" } };
  const artifact = {
    schema_id: "synthesis.topic_synthesis_artifact",
    schema_version: "3.0.0",
    language: "en",
    ...sections,
  };
  const metadata = {
    schema_id: "synthesis.topic_artifact_metadata",
    schema_version: "1.0.0",
    created_at: NOW,
    updated_at: NOW,
    data: { topic_id: topicId },
  };
  const hashes = computeSynthesisTopicCurrentHashes({
    manifest: {},
    artifact,
    metadata,
    sections,
    markdown,
  });
  return rebuildSynthesisTopicCanonicalSnapshot({
    topicId,
    pathId: canonicalSynthesisTopicPathId(topicId),
    manifest: {
      schema_id: "synthesis.topic_analysis_manifest",
      schema_version: "3.0.0",
      sections: { brief: { path: "brief.json" } },
      artifact_hash: hashes.artifactHash,
      metadata_hash: hashes.metadataHash,
      section_hashes: hashes.sectionHashes,
    },
    artifact,
    metadata,
    sections,
    markdown,
  });
}

describe("Synthesis sidecar durable bundle import foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0))
      fs.rmSync(root, { recursive: true, force: true });
  });

  it("strictly normalizes live identities and blocks tombstones", function () {
    const normalized = normalizeSynthesisDurableImportEntries([
      envelope("concept", "concept:one", {
        conceptId: "concept:one",
        label: "One",
        conceptType: "method",
        domain: "research",
        status: "active",
      }),
      envelope("concept_sense", "sense:one", {
        senseId: "sense:one",
        conceptId: "concept:one",
        label: "Sense",
        domain: "research",
        confidence: "high",
      }),
      envelope("concept_alias", "alias:one", {
        aliasId: "alias:one",
        alias: "Alias",
        normalized: "alias",
        conceptId: "concept:one",
        status: "active",
        confidence: "high",
      }),
      envelope("concept_relation", "relation:one", {
        relationId: "relation:one",
        sourceConceptId: "concept:one",
        targetConceptId: "concept:two",
        relation: "uses",
        status: "active",
        confidence: "high",
      }),
      envelope("concept_review_item", "concept-review:one", {
        reviewId: "concept-review:one",
        status: "pending",
        reason: "ambiguous",
        topicId: "topic:one",
        topicPathId: "topic-one",
        label: "Review",
        confidence: "low",
      }),
      envelope(
        "topic_current_asset",
        "topic-asset:topic-one:topic-one/current/brief.md",
        {
          topic_id: "topic-one",
          relative_path: "topics/topic-one/current/brief.md",
          content: "Brief\n",
        },
      ),
      envelope("topic_concept_links", "topic:one", {
        topicId: "topic:one",
        links: [],
      }),
      envelope("topic_graph_node", "topic:one", {
        topicId: "topic:one",
        title: "Topic",
        nodeType: "topic",
      }),
      envelope("topic_graph_edge", "edge:one", {
        edgeId: "edge:one",
        sourceTopicId: "topic:one",
        targetTopicId: "topic:two",
        relation: "broader",
        status: "active",
      }),
      envelope("topic_graph_review_item", "graph-review:one", {
        reviewId: "graph-review:one",
        status: "pending",
        sourceTopicId: "topic:one",
        targetTopicId: "topic:two",
        relation: "related",
      }),
      envelope("canonical_reference", "reference:one", {
        canonicalReferenceId: "reference:one",
      }),
      envelope("canonical_reference_redirect", "reference:old", {
        fromCanonicalReferenceId: "reference:old",
        toCanonicalReferenceId: "reference:new",
      }),
      envelope("reference_binding", "binding:one", {
        bindingId: "binding:one",
        canonicalReferenceId: "reference:one",
        status: "accepted",
      }),
      envelope("reference_match_proposal", "proposal:one", {
        proposalId: "proposal:one",
        kind: "binding",
        status: "pending",
        sourceCanonicalReferenceId: "reference:one",
      }),
      envelope("review_item", "review:one", {
        reviewItemId: "review:one",
        reviewKind: "reference_match",
        priority: 2,
        status: "pending",
      }),
      envelope("topic_interest_metadata", "topic:one", {
        topicId: "topic:one",
        schemaId: "topic_interest_metadata.v1",
        includeTermsJson: "[]",
        mustHaveTermsJson: "[]",
        methodsJson: "[]",
        excludeTermsJson: "[]",
        seedLiteratureItemIdsJson: "[]",
      }),
      envelope("topic_discovery_hint", "hint:one", {
        hintId: "hint:one",
        topicId: "topic:one",
        literatureItemId: "literature:one",
        score: 1,
        method: "discovery.apply_time_token_overlap.v1",
        matchingFieldsJson: "{}",
        status: "candidate",
      }),
      envelope("tag_vocabulary", "tag-vocabulary", { entries: [] }),
      envelope("tag_aliases", "tag-aliases", { aliases: [] }),
      envelope("tag_abbrev", "tag-abbrev", { abbrev: [] }),
      envelope("tag_protocol", "tag-protocol", {
        protocolId: "default",
        version: "1.0.0",
        tagPattern: "^[a-z]+$",
        maxTagLength: 128,
        facetsJson: "[]",
      }),
      envelope("related_items_sync_effect", "effect:one", {
        effectId: "effect:one",
        operationId: "operation:one",
        sourceLibraryId: 1,
        sourceItemKey: "SOURCE01",
        targetLibraryId: 1,
        targetItemKey: "TARGET01",
        action: "add",
        status: "pending",
      }),
    ]);
    assert.lengthOf(normalized, 22);
    assert.throws(() =>
      normalizeSynthesisDurableImportEntries([
        envelope(
          "concept",
          "concept:one",
          conceptData("concept:other", "Other"),
        ),
      ]),
    );
    assert.throws(() =>
      normalizeSynthesisDurableImportEntries([
        envelope("concept", "concept:one", {
          ...conceptData("concept:one", "One"),
          aliasesJson: "not-json",
        }),
      ]),
    );
    assert.throws(() =>
      normalizeSynthesisDurableImportEntries([
        envelope("tombstone", "tombstone:one", { target: "concept:one" }),
      ]),
    );
  });

  it("strictly rebuilds bounded sync metadata", function () {
    const value = rebuildSynthesisDurableSyncIndex({
      schema_id: "synthesis.durable_sync_index",
      schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
      updated_at: NOW,
      entities: {
        "concept:concept:one": {
          entity_id: "concept:one",
          entity_kind: "concept",
          path: "bundles/concepts.json",
          last_synced_hash: HASH_A,
          last_imported_hash: HASH_A,
          updated_at: NOW,
        },
      },
    });
    assert.equal(
      value.entities["concept:concept:one"].last_synced_hash,
      HASH_A,
    );
    assert.throws(() =>
      rebuildSynthesisDurableSyncIndex({ ...value, unexpected: true }),
    );
    assert.throws(() =>
      rebuildSynthesisDurableSyncIndex({
        ...value,
        entities: {
          wrong: value.entities["concept:concept:one"],
        },
      }),
    );
  });

  it("classifies additions, unbased updates, unchanged and conflicts deterministically", function () {
    const result = classifySynthesisDurableImportFacts({
      remote: [
        fact("concept:add", HASH_A),
        fact("concept:unchanged", HASH_B),
        fact("concept:unbased", HASH_C),
        fact("concept:conflict", HASH_C),
      ],
      localHashes: {
        "concept:concept:unchanged": HASH_B,
        "concept:concept:unbased": HASH_A,
        "concept:concept:conflict": HASH_B,
      },
      index: rebuildSynthesisDurableSyncIndex({
        schema_id: "synthesis.durable_sync_index",
        schema_version: SYNTHESIS_DURABLE_SYNC_INDEX_SCHEMA_VERSION,
        updated_at: NOW,
        entities: {
          "concept:concept:conflict": {
            entity_id: "concept:conflict",
            entity_kind: "concept",
            path: "bundles/concept.json",
            last_synced_hash: HASH_A,
            updated_at: NOW,
          },
        },
      }),
    });
    assert.deepEqual(
      {
        additions: result.additions,
        updates: result.updates,
        unbasedUpdates: result.unbasedUpdates,
        unchanged: result.unchanged,
        conflicts: result.conflicts.length,
      },
      {
        additions: 1,
        updates: 0,
        unbasedUpdates: 1,
        unchanged: 1,
        conflicts: 1,
      },
    );
    assert.equal(result.conflicts[0].reason, "both_changed");
  });

  it("commits auxiliary durable facts and sync metadata under one captured basis", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "synt-durable-import-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: "1".repeat(64),
      dataRootId: "2".repeat(64),
      now: () => NOW,
    });
    const captured = repository.store.captureDurableImportState();
    const interest = envelope("topic_interest_metadata", "topic:one", {
      topicId: "topic:one",
      schemaId: "topic_interest_metadata.v1",
      includeTermsJson: "[]",
      mustHaveTermsJson: "[]",
      methodsJson: "[]",
      excludeTermsJson: "[]",
      seedLiteratureItemIdsJson: "[]",
      updatedAt: NOW,
    });
    const concept = envelope("concept", "concept:imported", {
      conceptId: "concept:imported",
      label: "Imported",
      conceptType: "method",
      domain: "research",
      status: "active",
      aliasesJson: "[]",
      senseIdsJson: "[]",
      createdAt: NOW,
      updatedAt: NOW,
    });
    const review = envelope("review_item", "review:imported", {
      reviewItemId: "review:imported",
      reviewKind: "reference_match",
      priority: 1,
      status: "open",
      payloadJson: "{}",
      diagnosticsJson: "[]",
      createdAt: NOW,
      updatedAt: NOW,
    });
    const committed = repository.store.applyDurableImportState({
      expectedAggregateBasis: captured.aggregateBasis,
      expectedIndexRevision: captured.indexRevision,
      receiptId: "receipt:one",
      manifestHash: HASH_A,
      entries: [interest, concept, review],
      facts: [
        fact("topic:one", HASH_B, "topic_interest_metadata"),
        fact("concept:imported", HASH_C),
        fact("review:imported", HASH_A, "review_item"),
      ],
      topicTargets: [],
      now: NOW,
    });
    assert.isTrue(committed);
    const next = repository.store.captureDurableImportState();
    assert.equal(next.indexRevision, 1);
    assert.equal(next.commitReceipt?.receiptId, "receipt:one");
    assert.deepInclude(
      repository.store
        .captureDurableBundleState()
        .drafts.find((row) => row.entityKind === "topic_interest_metadata")
        ?.data as Record<string, unknown>,
      { topicId: "topic:one" },
    );
    assert.deepInclude(repository.store.listConcepts()[0], {
      conceptId: "concept:imported",
      label: "Imported",
    });
    assert.deepInclude(
      repository.store
        .captureDurableBundleState()
        .drafts.find((row) => row.entityKind === "review_item")?.data as Record<
        string,
        unknown
      >,
      { reviewItemId: "review:imported", reviewKind: "reference_match" },
    );
    repository.store.clearDurableImportCommit("receipt:one");
    assert.isNull(repository.store.captureDurableImportState().commitReceipt);
    repository.close();
  });

  it("preserves Markdown and promotes a staged canonical import batch", function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "synt-canonical-import-"),
    );
    roots.push(root);
    const store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: root,
      profileId: "3".repeat(64),
      dataRootId: "4".repeat(64),
    });
    const snapshot = topicSnapshot("topic:markdown", {
      "brief.md": "# Durable Markdown\n",
      "notes/detail.md": "Detail\n",
    });
    store.stageImportBatch?.({
      receiptId: "receipt:markdown",
      manifestHash: HASH_A,
      items: [{ expectedBasis: null, snapshot }],
    });
    assert.equal(store.inspect({ topicId: snapshot.topicId }).status, "absent");
    assert.equal(
      store.commitImportBatch?.("receipt:markdown").status,
      "promoted",
    );
    const current = store.readCurrent({ topicId: snapshot.topicId });
    assert.equal(current.status, "ready");
    assert.deepEqual(current.snapshot?.markdown, snapshot.markdown);
    assert.match(current.currentHash ?? "", /^sha256:/);
    const changed = topicSnapshot(snapshot.topicId, {
      "brief.md": "Changed Markdown\n",
    });
    const originalHashes = computeSynthesisTopicCurrentHashes(snapshot);
    assert.equal(
      store.promote({
        expectedBasis: {
          manifestHash: originalHashes.manifestHash,
          artifactHash: originalHashes.artifactHash,
          currentHash: current.currentHash!,
        },
        snapshot: changed,
      }).status,
      "promoted",
    );
    assert.throws(() =>
      store.stageImportBatch?.({
        receiptId: "receipt:stale-markdown",
        manifestHash: HASH_B,
        items: [
          {
            expectedBasis: {
              manifestHash: originalHashes.manifestHash,
              artifactHash: originalHashes.artifactHash,
              currentHash: current.currentHash!,
            },
            snapshot,
          },
        ],
      }),
    );
    store.close();
  });

  it("reserves canonical writer admission while a durable import batch is staged", function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "synt-import-writer-window-"),
    );
    roots.push(root);
    const store = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: root,
      profileId: "b".repeat(64),
      dataRootId: "c".repeat(64),
    });
    const staged = topicSnapshot("topic:writer-window", {
      "brief.md": "Staged import\n",
    });
    const competing = topicSnapshot(staged.topicId, {
      "brief.md": "Competing writer\n",
    });
    store.stageImportBatch?.({
      receiptId: "receipt:writer-window",
      manifestHash: HASH_A,
      items: [{ expectedBasis: null, snapshot: staged }],
    });

    assert.equal(
      store.promote({ expectedBasis: null, snapshot: competing }).status,
      "canonical_store_busy",
    );
    assert.equal(store.inspect({ topicId: staged.topicId }).status, "absent");
    assert.equal(
      store.commitImportBatch?.("receipt:writer-window").status,
      "promoted",
    );
    const committed = store.readCurrent({ topicId: staged.topicId });
    assert.equal(committed.status, "ready");
    assert.deepEqual(committed.snapshot?.markdown, staged.markdown);

    const committedHashes = computeSynthesisTopicCurrentHashes(staged);
    assert.equal(
      store.promote({
        expectedBasis: {
          manifestHash: committedHashes.manifestHash,
          artifactHash: committedHashes.artifactHash,
          currentHash: committed.currentHash!,
        },
        snapshot: competing,
      }).status,
      "promoted",
    );
    assert.deepEqual(
      store.readCurrent({ topicId: staged.topicId }).snapshot?.markdown,
      competing.markdown,
    );
    store.close();
  });

  it("recovers a matching canonical batch forward and discards an uncommitted batch", function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "synt-import-recovery-"),
    );
    roots.push(root);
    const options = {
      profileRuntimeRoot: root,
      profileId: "5".repeat(64),
      dataRootId: "6".repeat(64),
    };
    const forward = topicSnapshot("topic:forward", {
      "forward.md": "Forward\n",
    });
    let store = openSynthesisSidecarTopicCanonicalStore(options);
    store.stageImportBatch?.({
      receiptId: "receipt:forward",
      manifestHash: HASH_A,
      items: [{ expectedBasis: null, snapshot: forward }],
    });
    store.close();
    store = openSynthesisSidecarTopicCanonicalStore(options);
    assert.equal(
      store.recoverImportBatch?.({
        receiptId: "receipt:forward",
        manifestHash: HASH_A,
      })?.status,
      "promoted",
    );
    assert.deepEqual(
      store.readCurrent({ topicId: forward.topicId }).snapshot?.markdown,
      forward.markdown,
    );

    const discarded = topicSnapshot("topic:discarded");
    store.stageImportBatch?.({
      receiptId: "receipt:discarded",
      manifestHash: HASH_B,
      items: [{ expectedBasis: null, snapshot: discarded }],
    });
    store.close();
    store = openSynthesisSidecarTopicCanonicalStore(options);
    assert.equal(store.recoverImportBatch?.(null)?.status, "failed_recovered");
    assert.equal(
      store.inspect({ topicId: discarded.topicId }).status,
      "absent",
    );
    const inconsistent = topicSnapshot("topic:inconsistent");
    store.stageImportBatch?.({
      receiptId: "receipt:inconsistent",
      manifestHash: HASH_C,
      items: [{ expectedBasis: null, snapshot: inconsistent }],
    });
    store.close();
    store = openSynthesisSidecarTopicCanonicalStore(options);
    assert.equal(
      store.recoverImportBatch?.({
        receiptId: "receipt:other",
        manifestHash: HASH_C,
      })?.status,
      "repair_required",
    );
    assert.equal(store.snapshot().state, "repair_required");
    store.close();
  });

  it("round-trips Topic current through the private sidecar import composition", async function () {
    const sourceRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "synt-import-source-"),
    );
    const targetRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "synt-import-target-"),
    );
    roots.push(sourceRoot, targetRoot);
    const sourceRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: sourceRoot,
      profileId: "7".repeat(64),
      dataRootId: "8".repeat(64),
      now: () => NOW,
    });
    const sourceStore = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: sourceRoot,
      profileId: "7".repeat(64),
      dataRootId: "8".repeat(64),
    });
    const snapshot = topicSnapshot("topic:roundtrip", {
      "brief.md": "# Round trip\n",
    });
    const hashes = computeSynthesisTopicCurrentHashes(snapshot);
    assert.equal(
      sourceStore.promote({ expectedBasis: null, snapshot }).status,
      "promoted",
    );
    sourceRepository.store.upsertTopicApplicationState({
      topicId: snapshot.topicId,
      pathId: snapshot.pathId,
      title: "Round trip",
      definition: "Durable Topic",
      language: "en",
      operation: "create",
      manifestHash: hashes.manifestHash,
      artifactHash: hashes.artifactHash,
      metadataHash: hashes.metadataHash,
      bundleHash: hashes.currentHash,
      paperCount: 0,
      topicDefinitionJson: "{}",
      topicResolverJson: "{}",
      resolvedPaperSetJson: "{}",
    });
    const sourceApplication = createSynthesisSidecarDurableBundleApplication({
      repository: sourceRepository.store,
      canonicalStore: sourceStore,
      now: () => NOW,
    });
    const exported = await sourceApplication.buildExport();

    const targetRepository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: targetRoot,
      profileId: "9".repeat(64),
      dataRootId: "a".repeat(64),
      now: () => NOW,
    });
    const targetStore = openSynthesisSidecarTopicCanonicalStore({
      profileRuntimeRoot: targetRoot,
      profileId: "9".repeat(64),
      dataRootId: "a".repeat(64),
    });
    const targetApplication = createSynthesisSidecarDurableBundleApplication({
      repository: targetRepository.store,
      canonicalStore: targetStore,
      now: () => NOW,
    });
    const preview = await targetApplication.previewImport(
      bundleSource(exported),
    );
    assert.isTrue(preview.ok);
    const applied = await targetApplication.applyImport({
      receiptId: preview.receiptId!,
      manifestHash: preview.manifestHash!,
      acknowledgeUnbasedUpdates: false,
    });
    assert.equal(applied.status, "committed");
    assert.deepEqual(
      targetStore.readCurrent({ topicId: snapshot.topicId }).snapshot?.markdown,
      snapshot.markdown,
    );
    assert.deepInclude(
      targetRepository.store.captureDurableBundleState().topicBases[0],
      {
        topicId: snapshot.topicId,
        pathId: snapshot.pathId,
        bundleHash: hashes.currentHash,
      },
    );
    await sourceApplication.shutdown();
    await targetApplication.shutdown();
    sourceStore.close();
    targetStore.close();
    sourceRepository.close();
    targetRepository.close();
  });

  it("rejects malformed domain payloads during preview without issuing a receipt", async function () {
    const malformed = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:malformed",
          schemaId: "synthesis.durable.concept",
          data: { conceptId: "concept:malformed" },
        },
      ],
      generatedAt: NOW,
    });
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () => importCapture(),
      },
    });
    const preview = await application.previewImport(bundleSource(malformed));
    assert.isFalse(preview.ok);
    assert.isUndefined(preview.receiptId);
    assert.include(
      preview.diagnostics.map((row) => row.code),
      "durable_import_payload_invalid",
    );
  });

  it("previews a strict legacy v1 candidate through the shared reader", async function () {
    const entry = codec.createEnvelope({
      entityKind: "concept",
      entityId: "concept:legacy",
      schemaId: "synthesis.durable.concept",
      data: conceptData("concept:legacy", "Legacy"),
      updatedAt: NOW,
    });
    const assetText = codec.canonicalText(entry);
    const asset = {
      path: "concepts/concept-legacy.json",
      schema_id: entry.schema_id,
      schema_version: entry.schema_version,
      hash: hashSynthesisEngineCanonicalJson(assetText),
      bytes: assetText.length,
      entity_kind: entry.entity_kind,
      entity_id: entry.entity_id,
    };
    const manifestBase = {
      manifest_schema_version: "1.0.0",
      producer_version: "legacy-fixture",
      min_reader_version: "1.0.0",
      required_capabilities: ["durable-state.v1"],
      domain_versions: { concept: "1.0.0" },
      generated_at: NOW,
      asset_count: 1,
      assets: [asset],
    };
    const manifest = {
      ...manifestBase,
      manifest_hash: hashSynthesisEngineCanonicalJson(manifestBase),
    };
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () => importCapture(),
      },
    });
    const preview = await application.previewImport({
      readManifestText: async () => codec.canonicalText(manifest),
      readAssetText: async () => assetText,
    });
    assert.isTrue(preview.ok);
    assert.equal(preview.additions, 1);
    assert.isString(preview.receiptId);
  });

  it("previews and consumes one pinned receipt without rereading the source", async function () {
    const remote = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:remote",
          schemaId: "synthesis.durable.concept",
          data: conceptData("concept:remote", "Remote"),
        },
      ],
      generatedAt: NOW,
    });
    let manifestReads = 0;
    let applied = 0;
    let cleared = 0;
    const source = bundleSource(remote);
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () => importCapture(),
        applyDurableImportState: (request) => {
          applied += 1;
          assert.equal(request.entries[0].entity_id, "concept:remote");
          return true;
        },
        clearDurableImportCommit: () => {
          cleared += 1;
        },
      },
    });
    const preview = await application.previewImport({
      readManifestText: async () => {
        manifestReads += 1;
        return source.readManifestText();
      },
      readAssetText: source.readAssetText,
    });
    assert.isTrue(preview.ok);
    assert.equal(preview.additions, 1);
    assert.isString(preview.receiptId);
    const result = await application.applyImport({
      receiptId: preview.receiptId!,
      manifestHash: preview.manifestHash!,
      acknowledgeUnbasedUpdates: false,
    });
    assert.deepInclude(result, { status: "committed", imported: 1 });
    assert.equal(manifestReads, 1);
    assert.equal(applied, 1);
    assert.equal(cleared, 1);
    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId!,
        manifestHash: preview.manifestHash!,
        acknowledgeUnbasedUpdates: false,
      }),
      "receipt_invalid",
    );
  });

  it("consumes the receipt when the repository basis is superseded", async function () {
    const remote = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:remote",
          schemaId: "synthesis.durable.concept",
          data: conceptData("concept:remote", "Remote"),
        },
      ],
      generatedAt: NOW,
    });
    let captures = 0;
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () =>
          importCapture({ revision: ++captures }),
        applyDurableImportState: () => true,
        clearDurableImportCommit: () => undefined,
      },
    });
    const preview = await application.previewImport(bundleSource(remote));
    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId!,
        manifestHash: preview.manifestHash!,
        acknowledgeUnbasedUpdates: false,
      }),
      "basis_superseded",
    );
    assert.isFalse(await application.discardImport(preview.receiptId));
  });

  it("discards canonical staging when repository CAS loses the race", async function () {
    const remote = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:remote",
          schemaId: "synthesis.durable.concept",
          data: conceptData("concept:remote", "Remote"),
        },
      ],
      generatedAt: NOW,
    });
    const snapshot = topicSnapshot("topic:staged");
    let staged = 0;
    let discarded = 0;
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () => importCapture(),
        applyDurableImportState: () => false,
        clearDurableImportCommit: () => undefined,
      },
      canonicalImport: {
        prepare: () => ({
          items: [{ expectedBasis: null, snapshot }],
          targets: [],
        }),
        stage: () => {
          staged += 1;
        },
        commit: () => "promoted",
        discard: () => {
          discarded += 1;
        },
      },
    });
    const preview = await application.previewImport(bundleSource(remote));
    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId!,
        manifestHash: preview.manifestHash!,
        acknowledgeUnbasedUpdates: false,
      }),
      "basis_superseded",
    );
    assert.equal(staged, 1);
    assert.equal(discarded, 1);
  });

  it("clears admission receipts before shutdown", async function () {
    const remote = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:remote",
          schemaId: "synthesis.durable.concept",
          data: conceptData("concept:remote", "Remote"),
        },
      ],
      generatedAt: NOW,
    });
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: () => importCapture(),
        captureDurableImportState: () => importCapture(),
        applyDurableImportState: () => true,
        clearDurableImportCommit: () => undefined,
      },
    });
    const preview = await application.previewImport(bundleSource(remote));
    application.stopAdmission();
    await expectRejected(
      application.discardImport(preview.receiptId),
      "stopping",
    );
    await expectRejected(
      application.previewImport(bundleSource(remote)),
      "stopping",
    );
    await application.shutdown();
  });

  it("blocks verified tombstones and requires explicit unbased-update acknowledgement", async function () {
    const tombstone = codec.buildExport({
      drafts: [
        {
          entityKind: "tombstone",
          entityId: "tombstone:concept:removed",
          schemaId: "synthesis.durable.tombstone",
          data: { target_kind: "concept", target_id: "concept:removed" },
        },
      ],
      generatedAt: NOW,
    });
    const remote = codec.buildExport({
      drafts: [
        {
          entityKind: "concept",
          entityId: "concept:shared",
          schemaId: "synthesis.durable.concept",
          data: conceptData("concept:shared", "Remote"),
        },
      ],
      generatedAt: NOW,
    });
    const localDraft = {
      entityKind: "concept" as const,
      entityId: "concept:shared",
      schemaId: "synthesis.durable.concept",
      data: conceptData("concept:shared", "Local"),
    };
    const capture = (): SynthesisDurableImportRepositoryCapture => ({
      ...importCapture(),
      drafts: [localDraft],
    });
    const application = createSynthesisDurableBundleApplication({
      codec,
      now: () => NOW,
      repository: {
        captureDurableBundleState: capture,
        captureDurableImportState: capture,
        applyDurableImportState: () => true,
        clearDurableImportCommit: () => undefined,
      },
    });
    const tombstonePreview = await application.previewImport(
      bundleSource(tombstone),
    );
    assert.isFalse(tombstonePreview.ok);
    assert.equal(tombstonePreview.tombstones, 1);
    assert.isUndefined(tombstonePreview.receiptId);
    assert.include(
      tombstonePreview.diagnostics.map((row) => row.code),
      "tombstone_apply_unsupported",
    );

    const first = await application.previewImport(bundleSource(remote));
    assert.equal(first.unbasedUpdates, 1);
    await expectRejected(
      application.applyImport({
        receiptId: first.receiptId!,
        manifestHash: first.manifestHash!,
        acknowledgeUnbasedUpdates: false,
      }),
      "unbased_update_acknowledgement_required",
    );
    const second = await application.previewImport(bundleSource(remote));
    const applied = await application.applyImport({
      receiptId: second.receiptId!,
      manifestHash: second.manifestHash!,
      acknowledgeUnbasedUpdates: true,
    });
    assert.equal(applied.status, "committed");
  });
});
