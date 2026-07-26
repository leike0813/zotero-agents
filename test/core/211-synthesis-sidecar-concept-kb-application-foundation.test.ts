import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS,
  rebuildSynthesisConceptKbApplicationIngestRequest,
  rebuildSynthesisConceptKbApplicationQueryRequest,
  rebuildSynthesisConceptKbApplicationSnapshot,
  rebuildSynthesisConceptKbApplicationState,
} from "../../packages/synthesis-contracts/src/conceptKbApplication";
import { createSynthesisConceptKbApplication } from "../../packages/synthesis-application/src/conceptKbApplication";
import { createInProcessSynthesisConceptKbIndexEngine } from "../../packages/synthesis-engine/src/conceptKbIndex";
import {
  SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_VERSION,
  SYNTHESIS_CONCEPT_KB_APPLICATION_TABLES,
} from "../../packages/synthesis-repository/src/conceptKb";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";

const PROFILE_ID = "9".repeat(64);
const DATA_ROOT_ID = "a".repeat(64);

const proposal = (
  label: string,
  confidence: "high" | "medium" | "low" = "high",
) => ({
  label,
  aliases: [`${label} alias`],
  conceptType: "method",
  domain: "research",
  shortDefinition: `${label} short`,
  definition: `${label} definition`,
  evidence: [],
  relations: [],
  mergeHints: [],
  confidence,
});

const compute = () => {
  const engine = createInProcessSynthesisConceptKbIndexEngine();
  return {
    buildIndex: (request: Parameters<typeof engine.buildIndex>[0]) =>
      engine.buildIndex(request),
    query: (request: Parameters<typeof engine.query>[0]) =>
      engine.query(request),
  };
};

describe("Synthesis sidecar Concept KB application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded Concept DTOs and rejects unknown or duplicate facts", function () {
    assert.equal(SYNTHESIS_CONCEPT_KB_APPLICATION_LIMITS.queryLabels, 100);
    assert.deepEqual(
      rebuildSynthesisConceptKbApplicationQueryRequest({ labels: ["Vision"] }),
      { labels: ["Vision"] },
    );
    assert.deepEqual(
      rebuildSynthesisConceptKbApplicationState({
        manifestHash: null,
        revision: 0,
        indexHash: null,
        indexBasisHash: null,
        indexStale: true,
        conceptCount: 0,
        senseCount: 0,
        aliasCount: 0,
        relationCount: 0,
        reviewItemCount: 0,
        topicLinkCount: 0,
      }).revision,
      0,
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbApplicationIngestRequest({
        expectedManifestHash: null,
        topicId: "topic:1",
        topicPathId: "topic-1",
        proposals: [proposal("Vision")],
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbApplicationQueryRequest({
        labels: Array.from({ length: 101 }, (_, index) => `label-${index}`),
      }),
    );
    assert.throws(() =>
      rebuildSynthesisConceptKbApplicationSnapshot({
        concepts: [
          {
            conceptId: "concept:duplicate",
            label: "One",
            aliases: [],
            conceptType: "method",
            domain: "research",
            status: "active",
            senseIds: [],
          },
          {
            conceptId: "concept:duplicate",
            label: "Two",
            aliases: [],
            conceptType: "method",
            domain: "research",
            status: "active",
            senseIds: [],
          },
        ],
        senses: [],
        aliases: [],
        relations: [],
        reviewItems: [],
        topicLinks: [],
      }),
    );
  });

  it("persists create, exact merge, review transitions, index and query across restart", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-concept-application-"),
    );
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-18T00:00:00.000Z",
    });
    const application = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: compute(),
      now: () => "2026-07-18T00:00:00.000Z",
    });

    const created = await application.ingestProposals({
      expectedManifestHash: null,
      topicId: "topic:vision",
      topicPathId: "topic-vision",
      proposals: [proposal("Computer Vision")],
    });
    assert.equal(created.status, "committed");
    assert.lengthOf(application.load().snapshot.concepts, 1);

    const merged = await application.ingestProposals({
      expectedManifestHash: created.manifestHash,
      topicId: "topic:vision-2",
      topicPathId: "topic-vision-2",
      proposals: [{ ...proposal("CV"), aliases: ["Computer Vision"] }],
    });
    assert.equal(merged.status, "committed");
    assert.lengthOf(application.load().snapshot.concepts, 1);

    const reviewed = await application.ingestProposals({
      expectedManifestHash: merged.manifestHash,
      topicId: "topic:review",
      topicPathId: "topic-review",
      proposals: [proposal("Uncertain Method", "low")],
    });
    assert.equal(reviewed.status, "committed");
    const reviewId = application.load().snapshot.reviewItems[0]!.reviewId;
    const approved = await application.review({
      expectedManifestHash: reviewed.manifestHash,
      reviewId,
      action: "approve",
    });
    assert.equal(approved.status, "committed");
    assert.lengthOf(application.load().snapshot.concepts, 2);

    const rebuilt = await application.rebuildIndex({
      expectedManifestHash: approved.manifestHash,
    });
    assert.equal(rebuilt.status, "committed");
    assert.isFalse(application.inspect().indexStale);
    const beforeQuery = application.inspect();
    const queried = await application.query({ labels: ["Computer Vision"] });
    assert.deepEqual(queried.matches[0]?.exactConceptIds, [
      "concept:research:computer-vision",
    ]);
    assert.deepEqual(application.inspect(), beforeQuery);

    await application.shutdown();
    repository.close();
    const reopened = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      reopened.store.getConceptApplicationState()?.manifestHash,
      approved.manifestHash,
    );
    assert.lengthOf(reopened.store.listConcepts(), 2);
    assert.isFalse(reopened.store.getConceptApplicationState()?.indexStale);
    reopened.close();
  });

  it("handles merge/reject/display/delete cascades under manifest CAS", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-cascade-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: compute(),
    });
    const first = await application.ingestProposals({
      expectedManifestHash: null,
      topicId: "topic:one",
      topicPathId: "one",
      proposals: [proposal("One")],
    });
    const low = await application.ingestProposals({
      expectedManifestHash: first.manifestHash,
      topicId: "topic:two",
      topicPathId: "two",
      proposals: [proposal("Two", "low"), proposal("Three", "low")],
    });
    const reviews = application.load().snapshot.reviewItems;
    const merged = await application.review({
      expectedManifestHash: low.manifestHash,
      reviewId: reviews[0]!.reviewId,
      action: "merge",
      targetConceptId: "concept:research:one",
    });
    const rejected = await application.review({
      expectedManifestHash: merged.manifestHash,
      reviewId: reviews[1]!.reviewId,
      action: "reject",
    });
    const updated = await application.updateDisplayText({
      expectedManifestHash: rejected.manifestHash,
      conceptId: "concept:research:one",
      label: "One Updated",
      shortDefinition: "updated",
    });
    assert.equal(application.load().snapshot.concepts[0]?.label, "One Updated");
    assert.equal(
      (
        await application.deleteConcepts({
          expectedManifestHash: `sha256:${"0".repeat(64)}`,
          conceptIds: ["concept:research:one"],
        })
      ).status,
      "basis_mismatch",
    );
    const deleted = await application.deleteConcepts({
      expectedManifestHash: updated.manifestHash,
      conceptIds: ["concept:research:one"],
    });
    assert.equal(deleted.status, "committed");
    const snapshot = application.load().snapshot;
    assert.lengthOf(snapshot.concepts, 0);
    assert.lengthOf(snapshot.senses, 0);
    assert.lengthOf(snapshot.aliases, 0);
    assert.lengthOf(snapshot.topicLinks, 0);
    assert.deepEqual(
      snapshot.reviewItems.flatMap((row) => row.candidateConceptIds),
      [],
    );
    await application.shutdown();
    repository.close();
  });

  it("replaces complete snapshots, reviews ambiguous matches, persists relations, and rolls back row failure", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-replace-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: compute(),
    });
    const concept = (conceptId: string, label: string) => ({
      conceptId,
      label,
      aliases: ["Shared"],
      conceptType: "method",
      domain: "research",
      status: "active" as const,
      senseIds: [],
    });
    const replaced = await application.replaceSnapshot({
      expectedManifestHash: null,
      snapshot: {
        concepts: [
          concept("concept:research:one", "One"),
          concept("concept:research:two", "Two"),
        ],
        senses: [],
        aliases: [],
        relations: [],
        reviewItems: [],
        topicLinks: [],
      },
    });
    assert.equal(replaced.status, "committed");
    const ambiguous = await application.ingestProposals({
      expectedManifestHash: replaced.manifestHash,
      topicId: "topic:ambiguous",
      topicPathId: "ambiguous",
      proposals: [proposal("Shared")],
    });
    assert.equal(ambiguous.status, "committed");
    assert.deepInclude(application.load().snapshot.reviewItems[0], {
      reason: "ambiguous_concept_match",
      candidateConceptIds: ["concept:research:one", "concept:research:two"],
    });
    const related = await application.ingestProposals({
      expectedManifestHash: ambiguous.manifestHash,
      topicId: "topic:three",
      topicPathId: "three",
      proposals: [
        {
          ...proposal("Three"),
          relations: [
            {
              targetConceptId: "concept:research:one",
              relation: "uses",
              confidence: "high",
              provenance: [{ topicId: "topic:three" }],
            },
          ],
        },
      ],
    });
    assert.equal(related.status, "committed");
    assert.deepInclude(application.load().snapshot.relations[0], {
      sourceConceptId: "concept:research:three",
      targetConceptId: "concept:research:one",
      relation: "uses",
    });

    const before = application.load();
    assert.throws(() =>
      repository.store.replaceConceptKbApplicationState({
        expectedManifestHash: related.manifestHash,
        manifestHash: `sha256:${"c".repeat(64)}`,
        state: {
          concepts: [
            {
              conceptId: "concept:invalid",
              label: "",
              conceptType: "method",
              domain: "research",
              status: "active",
            },
          ],
          senses: [],
          aliases: [],
          relations: [],
          reviewItems: [],
          topicLinks: [],
        },
        now: "2026-07-18T00:00:00.000Z",
      }),
    );
    assert.deepEqual(application.load(), before);
    const deleted = await application.deleteConcepts({
      expectedManifestHash: related.manifestHash,
      conceptIds: ["concept:research:one"],
    });
    assert.equal(deleted.status, "committed");
    assert.lengthOf(application.load().snapshot.relations, 0);
    assert.deepEqual(
      application.load().snapshot.reviewItems[0]?.candidateConceptIds,
      ["concept:research:two"],
    );
    await application.shutdown();
    repository.close();
  });

  it("preserves last-good index on worker failure and drains active work before close", async function () {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "zs-concept-last-good-"),
    );
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const engine = createInProcessSynthesisConceptKbIndexEngine();
    const healthy = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: compute(),
    });
    const created = await healthy.ingestProposals({
      expectedManifestHash: null,
      topicId: "topic:one",
      topicPathId: "one",
      proposals: [proposal("One")],
    });
    await healthy.rebuildIndex({ expectedManifestHash: created.manifestHash });
    const lastGood = repository.store.getConceptApplicationState();
    await healthy.shutdown();

    let releaseCompute = () => undefined;
    const computeGate = new Promise<void>((resolve) => {
      releaseCompute = resolve;
    });
    const superseded = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: {
        buildIndex: async (request) => {
          await computeGate;
          return engine.buildIndex(request);
        },
        query: (request) => engine.query(request),
      },
    });
    const writer = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: compute(),
    });
    const pendingSuperseded = superseded.rebuildIndex({
      expectedManifestHash: created.manifestHash,
    });
    const changed = await writer.updateDisplayText({
      expectedManifestHash: created.manifestHash,
      conceptId: "concept:research:one",
      label: "One changed",
    });
    releaseCompute();
    assert.equal((await pendingSuperseded).status, "basis_mismatch");
    assert.equal(
      repository.store.getConceptApplicationState()?.indexHash,
      lastGood?.indexHash,
    );
    await superseded.shutdown();
    await writer.shutdown();

    const failing = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: {
        buildIndex: async () => ({ malformed: true }) as never,
        query: (request) => engine.query(request),
      },
    });
    assert.equal(
      (
        await failing.rebuildIndex({
          expectedManifestHash: changed.manifestHash,
        })
      ).status,
      "worker_failed",
    );
    assert.equal(
      repository.store.getConceptApplicationState()?.indexHash,
      lastGood?.indexHash,
    );
    await failing.shutdown();

    const draining = createSynthesisConceptKbApplication({
      repository: repository.store,
      compute: {
        buildIndex: async (_request, options) =>
          await new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              "abort",
              () =>
                reject(
                  Object.assign(new Error("canceled"), {
                    code: "worker_canceled",
                  }),
                ),
              { once: true },
            ),
          ),
        query: async (_request, options) =>
          await new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              "abort",
              () =>
                reject(
                  Object.assign(new Error("canceled"), {
                    code: "worker_canceled",
                  }),
                ),
              { once: true },
            ),
          ),
      },
    });
    const pending = draining.rebuildIndex({
      expectedManifestHash: changed.manifestHash,
    });
    const pendingQuery = draining.query({ labels: ["One"] });
    const queryStatus = pendingQuery.then(
      () => "resolved",
      (error: unknown) =>
        String((error as { code?: unknown } | undefined)?.code),
    );
    await draining.shutdown();
    assert.equal((await pending).status, "stopping");
    assert.equal(await queryStatus, "worker_canceled");
    assert.equal(
      (
        await draining.ingestProposals({
          expectedManifestHash: changed.manifestHash,
          topicId: "topic:new",
          topicPathId: "new",
          proposals: [],
        })
      ).status,
      "stopping",
    );
    repository.close();
  });

  it("installs an independently versioned Concept application table family", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-concept-schema-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      SYNTHESIS_CONCEPT_KB_APPLICATION_REPOSITORY_SCHEMA_VERSION,
      "synthesis-concept-kb-application-repository.v1",
    );
    assert.includeMembers(
      [...SYNTHESIS_CONCEPT_KB_APPLICATION_TABLES],
      [
        "synt_concept_application_state",
        "synt_concept_review_item",
        "synt_topic_concept_link",
      ],
    );
    assert.equal(repository.snapshot().mode, "isolated_shadow");
    repository.close();
  });

  it("keeps the Rust Concept owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/concept_kb.rs",
      ),
      "utf8",
    );
    const repository = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-repository/src/tag_concept_topic_graph.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-tag-concept-topic-graph-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub trait ConceptKbComputePort");
    assert.include(source, "pub fn query");
    assert.include(repository, "pub struct ConceptKbReplacement");
    assert.include(repository, "promote_concept_kb_index");
    assert.notInclude(repository, "list_concept_application_rows");
    assert.include(corpus.coverage.conceptKb, "concurrent_query_cancel");
    assert.include(corpus.coverage.conceptKb, "review_reopen");
  });
});
