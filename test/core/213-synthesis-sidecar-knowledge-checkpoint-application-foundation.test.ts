import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
  rebuildSynthesisKnowledgeCheckpoint,
  type SynthesisKnowledgeCheckpointPayload,
} from "../../packages/synthesis-contracts/src/knowledgeCheckpoint";
import {
  createSynthesisKnowledgeCheckpointApplication,
  hashSynthesisKnowledgeCheckpointPayload,
  type SynthesisKnowledgeCheckpointApplicationRepository,
  type SynthesisKnowledgeCheckpointRepositoryCapture,
} from "../../packages/synthesis-application/src/knowledgeCheckpointApplication";
import {
  hashSynthesisConceptKbSnapshot,
  synthesisConceptKbStateRecordsFromSnapshot,
} from "../../packages/synthesis-application/src/conceptKbApplication";
import {
  hashSynthesisTagVocabularyApplicationCandidate,
  synthesisTagVocabularyStateRecordsFromCandidate,
} from "../../packages/synthesis-application/src/tagVocabularyApplication";
import {
  hashSynthesisTopicGraphSnapshot,
  synthesisTopicGraphEdgeId,
  synthesisTopicGraphStateRecordsFromSnapshot,
} from "../../packages/synthesis-application/src/topicGraphApplication";
import { createSynthesisSidecarKnowledgeCheckpointApplication } from "../../apps/synthesis-service/src/knowledgeCheckpointApplicationNode";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";

const PROFILE_ID = "9".repeat(64);
const DATA_ROOT_ID = "c".repeat(64);
const NOW = "2026-07-18T08:00:00.000Z";

const protocol = {
  version: "1.0.0",
  tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
  maxTagLength: 120,
  facets: ["field", "topic"],
};

function payload(suffix = "one"): SynthesisKnowledgeCheckpointPayload {
  const conceptId = `concept:${suffix}`;
  const senseId = `sense:${suffix}`;
  const sourceTopicId = `topic:${suffix}`;
  const targetTopicId = `topic:${suffix}-target`;
  const edgeId = synthesisTopicGraphEdgeId({
    sourceTopicId,
    targetTopicId,
    relation: "related_to",
  });
  return {
    tagVocabulary: {
      entries: [
        {
          tag: `field:${suffix}`,
          facet: "field",
          aliases: [`${suffix} field`],
          abbrev: [],
          source: "manual",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      aliases: { [`${suffix} field`]: `field:${suffix}` },
      abbrev: {},
      protocol,
    },
    conceptKb: {
      concepts: [
        {
          conceptId,
          label: `Concept ${suffix}`,
          aliases: [],
          conceptType: "topic",
          domain: "test",
          status: "active",
          senseIds: [senseId],
        },
      ],
      senses: [
        {
          senseId,
          conceptId,
          label: `Concept ${suffix}`,
          aliases: [],
          domain: "test",
          confidence: "high",
          sourceTopicIds: [sourceTopicId],
          evidence: [],
        },
      ],
      aliases: [],
      relations: [],
      reviewItems: [],
      topicLinks: [
        {
          topicId: sourceTopicId,
          conceptId,
          senseId,
          label: `Concept ${suffix}`,
          confidence: "high",
          source: "manual",
        },
      ],
    },
    topicGraph: {
      nodes: [
        {
          topicId: sourceTopicId,
          title: `Topic ${suffix}`,
          aliases: [],
          nodeType: "materialized",
          definitionStatus: "has_synthesis",
          isRoot: true,
          level: "top",
          paperCount: 1,
        },
        {
          topicId: targetTopicId,
          title: `Topic ${suffix} target`,
          aliases: [],
          nodeType: "materialized",
          definitionStatus: "has_synthesis",
          isRoot: false,
          level: "normal",
          paperCount: 1,
        },
      ],
      edges: [
        {
          edgeId,
          sourceTopicId,
          targetTopicId,
          relation: "related_to",
          status: "confirmed",
          provenance: [],
          evidenceRefs: [],
        },
      ],
      reviewItems: [],
    },
  };
}

function basesFor(value: SynthesisKnowledgeCheckpointPayload) {
  return {
    tagRevision: hashSynthesisTagVocabularyApplicationCandidate(
      value.tagVocabulary,
    ),
    conceptManifest: hashSynthesisConceptKbSnapshot(value.conceptKb),
    topicGraphManifest: hashSynthesisTopicGraphSnapshot(value.topicGraph),
  };
}

function captureFor(
  value: SynthesisKnowledgeCheckpointPayload,
): SynthesisKnowledgeCheckpointRepositoryCapture {
  return { bases: basesFor(value), payload: value };
}

function fakeRepository(initial: SynthesisKnowledgeCheckpointPayload) {
  let captured = captureFor(initial);
  let replacementCalls = 0;
  const repository: SynthesisKnowledgeCheckpointApplicationRepository = {
    captureKnowledgeState() {
      return structuredClone(captured);
    },
    replaceKnowledgeState(args) {
      replacementCalls += 1;
      if (
        JSON.stringify(args.expectedBases) !== JSON.stringify(captured.bases)
      ) {
        return false;
      }
      captured = {
        bases: args.nextBases,
        payload: structuredClone(args.payload),
      };
      return true;
    },
  };
  return {
    repository,
    capture: () => structuredClone(captured),
    replacementCalls: () => replacementCalls,
    supersede(next: SynthesisKnowledgeCheckpointPayload) {
      captured = captureFor(next);
    },
  };
}

async function expectRejected(operation: Promise<unknown>) {
  let rejected: unknown;
  try {
    await operation;
  } catch (error) {
    rejected = error;
  }
  assert.instanceOf(rejected, Error);
}

describe("Synthesis sidecar knowledge checkpoint application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded deterministic checkpoints", async function () {
    const fake = fakeRepository(payload());
    let timestamp = NOW;
    const application = createSynthesisKnowledgeCheckpointApplication({
      repository: fake.repository,
      now: () => timestamp,
      createReceiptId: () => "receipt:strict",
    });
    const first = await application.buildCheckpoint();
    timestamp = "2026-07-18T09:00:00.000Z";
    const second = await application.buildCheckpoint();

    assert.equal(
      first.contractVersion,
      SYNTHESIS_KNOWLEDGE_CHECKPOINT_CONTRACT_VERSION,
    );
    assert.equal(first.checkpointHash, second.checkpointHash);
    assert.deepEqual(first.counts, second.counts);
    assert.notEqual(first.generatedAt, second.generatedAt);
    assert.deepEqual(first.counts, {
      tagVocabulary: { entries: 1, aliases: 1, abbrev: 0, protocol: 1 },
      conceptKb: {
        concepts: 1,
        senses: 1,
        aliases: 0,
        relations: 0,
        reviewItems: 0,
        topicLinks: 1,
      },
      topicGraph: { nodes: 2, edges: 1, reviewItems: 0 },
    });
    assert.equal(
      first.checkpointHash,
      hashSynthesisKnowledgeCheckpointPayload(first.bases, first.payload),
    );
    assert.deepEqual(await application.verifyCheckpoint(first), first);

    const reorderedPayload = payload();
    reorderedPayload.topicGraph.nodes.reverse();
    const reordered = await createSynthesisKnowledgeCheckpointApplication({
      repository: fakeRepository(reorderedPayload).repository,
      now: () => NOW,
    }).buildCheckpoint();
    assert.equal(reordered.checkpointHash, first.checkpointHash);
    assert.deepEqual(reordered.payload, first.payload);

    assert.throws(() =>
      rebuildSynthesisKnowledgeCheckpoint({ ...first, unknown: true }),
    );
    assert.throws(() =>
      rebuildSynthesisKnowledgeCheckpoint({
        ...first,
        counts: {
          ...first.counts,
          topicGraph: { ...first.counts.topicGraph, nodes: 3 },
        },
      }),
    );
    await expectRejected(
      application.verifyCheckpoint({
        ...first,
        checkpointHash: `sha256:${"e".repeat(64)}`,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisKnowledgeCheckpoint({
        ...first,
        payload: {
          ...first.payload,
          conceptKb: {
            ...first.payload.conceptKb,
            concepts: [
              ...first.payload.conceptKb.concepts,
              first.payload.conceptKb.concepts[0],
            ],
          },
        },
      }),
    );
    assert.throws(() =>
      rebuildSynthesisKnowledgeCheckpoint({
        ...first,
        payload: {
          ...first.payload,
          topicGraph: {
            ...first.payload.topicGraph,
            edges: [
              {
                ...first.payload.topicGraph.edges[0],
                targetTopicId: "topic:missing",
              },
            ],
          },
        },
      }),
    );
    assert.throws(() =>
      rebuildSynthesisKnowledgeCheckpoint({
        ...first,
        payload: {
          ...first.payload,
          tagVocabulary: {
            ...first.payload.tagVocabulary,
            entries: Array.from({ length: 25_001 }, (_, index) => ({
              tag: `field:bounded-${index}`,
              facet: "field",
              aliases: [],
              abbrev: [],
            })),
          },
        },
      }),
    );
  });

  it("previews full replacement and reports user-decision overrides", async function () {
    const current = payload("current");
    current.conceptKb.relations.push({
      relationId: "relation:current",
      sourceConceptId: "concept:current",
      targetConceptId: "concept:current",
      relation: "related_to",
      status: "confirmed",
      confidence: "high",
      provenance: [],
    });
    const fake = fakeRepository(current);
    const application = createSynthesisKnowledgeCheckpointApplication({
      repository: fake.repository,
      now: () => NOW,
      createReceiptId: () => "receipt:preview",
    });
    const incomingRepository = fakeRepository(payload("incoming"));
    const incomingApplication = createSynthesisKnowledgeCheckpointApplication({
      repository: incomingRepository.repository,
      now: () => NOW,
    });
    const checkpoint = await incomingApplication.buildCheckpoint();
    const preview = await application.previewImport(checkpoint);

    assert.equal(preview.receiptId, "receipt:preview");
    assert.deepEqual(preview.capturedBases, basesFor(current));
    assert.deepInclude(preview.diff.tagVocabulary.entries, {
      added: 1,
      updated: 0,
      deleted: 1,
    });
    assert.deepInclude(preview.diff.conceptKb.concepts, {
      added: 1,
      updated: 0,
      deleted: 1,
    });
    assert.deepInclude(preview.diff.topicGraph.edges, {
      added: 1,
      updated: 0,
      deleted: 1,
    });
    assert.includeMembers(
      preview.userDecisionOverrides.map(
        (entry) => `${entry.domain}:${entry.family}:${entry.currentDecision}`,
      ),
      [
        "tagVocabulary:entries:active_entry",
        "conceptKb:relations:confirmed",
        "conceptKb:topicLinks:manual",
        "topicGraph:edges:confirmed",
      ],
    );
    assert.deepEqual(fake.capture().payload, current);
  });

  it("requires acknowledgement and consumes every submitted receipt once", async function () {
    const fake = fakeRepository(payload("before"));
    let receipt = 0;
    const application = createSynthesisKnowledgeCheckpointApplication({
      repository: fake.repository,
      now: () => NOW,
      createReceiptId: () => `receipt:${++receipt}`,
    });
    const source = fakeRepository(payload("after"));
    const sourceApplication = createSynthesisKnowledgeCheckpointApplication({
      repository: source.repository,
      now: () => NOW,
    });
    const checkpoint = await sourceApplication.buildCheckpoint();

    const unacknowledged = await application.previewImport(checkpoint);
    await expectRejected(
      application.applyImport({
        receiptId: unacknowledged.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: false,
      }),
    );
    await expectRejected(
      application.applyImport({
        receiptId: unacknowledged.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );
    assert.equal(fake.replacementCalls(), 0);

    const superseded = await application.previewImport(checkpoint);
    const current = await application.previewImport(checkpoint);
    await expectRejected(
      application.applyImport({
        receiptId: superseded.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );
    assert.isFalse(application.discardImport(current.receiptId));
    await expectRejected(
      application.applyImport({
        receiptId: current.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );

    const discarded = await application.previewImport(checkpoint);
    assert.isTrue(application.discardImport(discarded.receiptId));

    const successful = await application.previewImport(checkpoint);
    const result = await application.applyImport({
      receiptId: successful.receiptId,
      checkpointHash: checkpoint.checkpointHash,
      acknowledgeFullReplacement: true,
    });
    assert.equal(result.status, "committed");
    assert.deepEqual(fake.capture().payload, checkpoint.payload);
    await expectRejected(
      application.applyImport({
        receiptId: successful.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );

    const restarted = createSynthesisKnowledgeCheckpointApplication({
      repository: fake.repository,
      now: () => NOW,
    });
    await expectRejected(
      restarted.applyImport({
        receiptId: successful.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );
  });

  it("invalidates receipts on superseded basis, stop, and shutdown drain", async function () {
    const fake = fakeRepository(payload("old"));
    const source = fakeRepository(payload("new"));
    const sourceApplication = createSynthesisKnowledgeCheckpointApplication({
      repository: source.repository,
      now: () => NOW,
    });
    const checkpoint = await sourceApplication.buildCheckpoint();
    const application = createSynthesisKnowledgeCheckpointApplication({
      repository: fake.repository,
      now: () => NOW,
      createReceiptId: () => "receipt:stale",
    });
    const preview = await application.previewImport(checkpoint);
    fake.supersede(payload("concurrent"));
    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );

    let releaseCapture = () => undefined;
    let startedCapture = () => undefined;
    const started = new Promise<void>((resolve) => {
      startedCapture = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseCapture = resolve;
    });
    const drainingRepository: SynthesisKnowledgeCheckpointApplicationRepository =
      {
        async captureKnowledgeState() {
          startedCapture();
          await release;
          return captureFor(payload("drain"));
        },
        replaceKnowledgeState: () => true,
      };
    const draining = createSynthesisKnowledgeCheckpointApplication({
      repository: drainingRepository,
      now: () => NOW,
    });
    const active = draining.buildCheckpoint();
    await started;
    const shutdown = draining.shutdown();
    let shutdownComplete = false;
    void shutdown.then(() => {
      shutdownComplete = true;
    });
    await Promise.resolve();
    assert.isFalse(shutdownComplete);
    await expectRejected(draining.buildCheckpoint());
    releaseCapture();
    await active;
    await shutdown;
    assert.isTrue(shutdownComplete);
  });

  it("keeps the private coordinator outside RPC and drains it before repository close", function () {
    const serverSource = fs.readFileSync(
      path.join(process.cwd(), "apps/synthesis-service/src/server.ts"),
      "utf8",
    );
    const capabilitiesSource = fs.readFileSync(
      path.join(
        process.cwd(),
        "packages/synthesis-contracts/src/sidecarSystem.ts",
      ),
      "utf8",
    );

    const checkpointStop = serverSource.indexOf(
      "knowledgeCheckpointApplication.stopAdmission()",
    );
    const domainStop = serverSource.indexOf("topicApplication.stopAdmission()");
    const checkpointShutdown = serverSource.indexOf(
      "await knowledgeCheckpointApplication.shutdown()",
    );
    const domainShutdown = serverSource.indexOf(
      "await referenceRefreshApplication.shutdown()",
    );
    const repositoryClose = serverSource.indexOf("repository.close()");

    assert.isAtLeast(checkpointStop, 0);
    assert.isAbove(domainStop, checkpointStop);
    assert.isAtLeast(checkpointShutdown, 0);
    assert.isAbove(domainShutdown, checkpointShutdown);
    assert.isAbove(repositoryClose, checkpointShutdown);
    assert.notInclude(capabilitiesSource, "knowledge_checkpoint");
  });

  it("atomically replaces all SQLite domains and preserves local operational state", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-knowledge-checkpoint-"),
    );
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => NOW,
    });
    const before = payload("before");
    const beforeBases = basesFor(before);
    repository.store.replaceTagVocabularyState({
      expectedVocabularyHash: null,
      vocabularyHash: beforeBases.tagRevision,
      state: synthesisTagVocabularyStateRecordsFromCandidate(
        before.tagVocabulary,
        NOW,
      ),
      now: NOW,
    });
    repository.store.replaceConceptKbApplicationState({
      expectedManifestHash: null,
      manifestHash: beforeBases.conceptManifest,
      state: synthesisConceptKbStateRecordsFromSnapshot(before.conceptKb),
      now: NOW,
    });
    repository.store.replaceTopicGraphApplicationState({
      expectedManifestHash: null,
      manifestHash: beforeBases.topicGraphManifest,
      state: synthesisTopicGraphStateRecordsFromSnapshot(before.topicGraph),
      now: NOW,
    });
    repository.store.replaceTagStagedSuggestions({
      expectedStagedRevision: 0,
      rows: [
        {
          tag: "field:staged",
          facet: "field",
          parentBindingsJson: "[]",
        },
      ],
      now: NOW,
    });
    const stagedRows = repository.store.listTagStagedSuggestions();
    repository.store.promoteTagVocabularyState({
      expectedVocabularyHash: beforeBases.tagRevision,
      expectedStagedRevision: 1,
      vocabularyHash: beforeBases.tagRevision,
      state: synthesisTagVocabularyStateRecordsFromCandidate(
        before.tagVocabulary,
        NOW,
      ),
      stagedRows,
      effects: [
        {
          effectId: "effect:pending",
          vocabularyHash: beforeBases.tagRevision,
          stagedRevision: 1,
          libraryId: 1,
          itemKey: "ABCD1234",
          tag: "field:staged",
          status: "pending",
          diagnosticsJson: "[]",
        },
      ],
      now: NOW,
    });
    repository.store.replaceTagAuditRecords({
      libraryId: 1,
      rows: [
        {
          libraryId: 1,
          itemKey: "ABCD1234",
          needsTagRegulation: true,
          nonCompliantTagsJson: '["legacy"]',
        },
      ],
      now: NOW,
    });
    const indexHash = `sha256:${"d".repeat(64)}`;
    repository.store.promoteTagIndex({
      expectedVocabularyHash: beforeBases.tagRevision,
      indexHash,
      indexJson: '{"kind":"tag"}',
      now: NOW,
    });
    repository.store.promoteConceptKbIndex({
      expectedManifestHash: beforeBases.conceptManifest,
      indexHash,
      indexJson: '{"kind":"concept"}',
      now: NOW,
    });
    repository.store.promoteTopicGraphIndex({
      expectedManifestHash: beforeBases.topicGraphManifest,
      indexHash,
      indexJson: '{"kind":"topic"}',
      now: NOW,
    });

    const application = createSynthesisSidecarKnowledgeCheckpointApplication({
      repository: repository.store,
      now: () => NOW,
      createReceiptId: () => "receipt:sqlite",
    });
    const source = fakeRepository(payload("after"));
    const checkpoint = await createSynthesisKnowledgeCheckpointApplication({
      repository: source.repository,
      now: () => NOW,
    }).buildCheckpoint();
    const preview = await application.previewImport(checkpoint);
    await application.applyImport({
      receiptId: preview.receiptId,
      checkpointHash: checkpoint.checkpointHash,
      acknowledgeFullReplacement: true,
    });

    const captured = await application.buildCheckpoint();
    assert.deepEqual(captured.payload, checkpoint.payload);
    assert.lengthOf(repository.store.listTagStagedSuggestions(), 1);
    assert.lengthOf(repository.store.listTagAuditRecords(), 1);
    assert.deepInclude(repository.store.listTagEffects()[0], {
      effectId: "effect:pending",
      status: "pending",
    });
    for (const state of [
      repository.store.getTagApplicationState(),
      repository.store.getConceptApplicationState(),
      repository.store.getTopicGraphApplicationState(),
    ]) {
      assert.equal(state?.indexHash, indexHash);
      assert.isTrue(state?.indexStale);
    }
    assert.equal(
      repository.store.getTagApplicationState()?.indexJson,
      '{"kind":"tag"}',
    );
    assert.equal(
      repository.store.getConceptApplicationState()?.indexJson,
      '{"kind":"concept"}',
    );
    assert.equal(
      repository.store.getTopicGraphApplicationState()?.indexJson,
      '{"kind":"topic"}',
    );
    await application.shutdown();
    repository.close();
  });

  for (const supersededDomain of [
    "tagVocabulary",
    "conceptKb",
    "topicGraph",
  ] as const) {
    it(`rolls back when the real SQLite ${supersededDomain} basis is superseded`, async function () {
      const root = fs.mkdtempSync(
        path.join(os.tmpdir(), `zs-knowledge-${supersededDomain}-`),
      );
      roots.push(root);
      const repository = openSynthesisSidecarIsolatedRepository({
        profileRuntimeRoot: root,
        profileId: PROFILE_ID,
        dataRootId: DATA_ROOT_ID,
        now: () => NOW,
      });
      const before = payload("basis-before");
      const beforeBases = basesFor(before);
      repository.store.replaceTagVocabularyState({
        expectedVocabularyHash: null,
        vocabularyHash: beforeBases.tagRevision,
        state: synthesisTagVocabularyStateRecordsFromCandidate(
          before.tagVocabulary,
          NOW,
        ),
        now: NOW,
      });
      repository.store.replaceConceptKbApplicationState({
        expectedManifestHash: null,
        manifestHash: beforeBases.conceptManifest,
        state: synthesisConceptKbStateRecordsFromSnapshot(before.conceptKb),
        now: NOW,
      });
      repository.store.replaceTopicGraphApplicationState({
        expectedManifestHash: null,
        manifestHash: beforeBases.topicGraphManifest,
        state: synthesisTopicGraphStateRecordsFromSnapshot(before.topicGraph),
        now: NOW,
      });
      const application = createSynthesisSidecarKnowledgeCheckpointApplication({
        repository: repository.store,
        now: () => NOW,
        createReceiptId: () => `receipt:${supersededDomain}`,
      });
      const incoming = fakeRepository(payload("basis-incoming"));
      const checkpoint = await createSynthesisKnowledgeCheckpointApplication({
        repository: incoming.repository,
        now: () => NOW,
      }).buildCheckpoint();
      const preview = await application.previewImport(checkpoint);
      const concurrent = payload(`basis-${supersededDomain}`);
      const concurrentBases = basesFor(concurrent);
      if (supersededDomain === "tagVocabulary") {
        repository.store.replaceTagVocabularyState({
          expectedVocabularyHash: beforeBases.tagRevision,
          vocabularyHash: concurrentBases.tagRevision,
          state: synthesisTagVocabularyStateRecordsFromCandidate(
            concurrent.tagVocabulary,
            NOW,
          ),
          now: NOW,
        });
      } else if (supersededDomain === "conceptKb") {
        repository.store.replaceConceptKbApplicationState({
          expectedManifestHash: beforeBases.conceptManifest,
          manifestHash: concurrentBases.conceptManifest,
          state: synthesisConceptKbStateRecordsFromSnapshot(
            concurrent.conceptKb,
          ),
          now: NOW,
        });
      } else {
        repository.store.replaceTopicGraphApplicationState({
          expectedManifestHash: beforeBases.topicGraphManifest,
          manifestHash: concurrentBases.topicGraphManifest,
          state: synthesisTopicGraphStateRecordsFromSnapshot(
            concurrent.topicGraph,
          ),
          now: NOW,
        });
      }
      const stateBeforeApply = await application.buildCheckpoint();

      await expectRejected(
        application.applyImport({
          receiptId: preview.receiptId,
          checkpointHash: checkpoint.checkpointHash,
          acknowledgeFullReplacement: true,
        }),
      );
      const stateAfterApply = await application.buildCheckpoint();
      assert.deepEqual(stateAfterApply.bases, stateBeforeApply.bases);
      assert.deepEqual(stateAfterApply.payload, stateBeforeApply.payload);
      await application.shutdown();
      repository.close();
    });
  }

  it("rolls back all SQLite domains on a row write failure", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-knowledge-rollback-"),
    );
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => NOW,
    });
    const application = createSynthesisSidecarKnowledgeCheckpointApplication({
      repository: repository.store,
      now: () => NOW,
      createReceiptId: () => "receipt:rollback",
    });
    const before = await application.buildCheckpoint();
    const source = fakeRepository(payload("will-fail"));
    const checkpoint = await createSynthesisKnowledgeCheckpointApplication({
      repository: source.repository,
      now: () => NOW,
    }).buildCheckpoint();
    const preview = await application.previewImport(checkpoint);
    const external = new DatabaseSync(repository.paths.databasePath);
    external.exec(`
      CREATE TRIGGER fail_concept_insert
      BEFORE INSERT ON synt_concept
      BEGIN
        SELECT RAISE(ABORT, 'injected concept row failure');
      END;
    `);
    external.close();

    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );
    const after = await application.buildCheckpoint();
    assert.deepEqual(after.payload, before.payload);
    assert.deepEqual(after.bases, before.bases);
    await expectRejected(
      application.applyImport({
        receiptId: preview.receiptId,
        checkpointHash: checkpoint.checkpointHash,
        acknowledgeFullReplacement: true,
      }),
    );
    await application.shutdown();
    repository.close();
  });
});
