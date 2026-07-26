import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS,
  rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest,
  rebuildSynthesisTagVocabularyApplicationCandidate,
  rebuildSynthesisTagVocabularyApplicationMutationResult,
  rebuildSynthesisTagVocabularyApplicationPageRequest,
  rebuildSynthesisTagVocabularyApplicationSaveRequest,
  rebuildSynthesisTagVocabularyApplicationStageRequest,
  rebuildSynthesisTagVocabularyApplicationStagedPage,
  rebuildSynthesisTagVocabularyApplicationState,
} from "../../packages/synthesis-contracts/src/tagVocabularyApplication";
import { createSynthesisTagVocabularyApplication } from "../../packages/synthesis-application/src/tagVocabularyApplication";
import { createInProcessSynthesisTagVocabularyEngine } from "../../packages/synthesis-engine/src/tagVocabulary";
import {
  SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_VERSION,
  SYNTHESIS_TAG_VOCABULARY_APPLICATION_TABLES,
} from "../../packages/synthesis-repository/src/tagVocabulary";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";

const PROFILE_ID = "7".repeat(64);
const DATA_ROOT_ID = "8".repeat(64);

const candidate = () => ({
  entries: [
    {
      tag: "topic:vision",
      facet: "topic",
      note: "Vision",
      aliases: [],
      abbrev: [],
    },
  ],
  aliases: {},
  abbrev: {},
  protocol: {
    version: "1.0.0",
    tagPattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
    maxTagLength: 120,
    facets: ["topic", "method"],
  },
});

describe("Synthesis sidecar Tag Vocabulary application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded private Tag requests", function () {
    assert.equal(SYNTHESIS_TAG_VOCABULARY_APPLICATION_LIMITS.page, 100);
    assert.equal(
      rebuildSynthesisTagVocabularyApplicationCandidate(candidate()).entries[0]
        ?.tag,
      "topic:vision",
    );
    assert.deepEqual(
      rebuildSynthesisTagVocabularyApplicationPageRequest({
        cursor: "",
        limit: 100,
      }),
      { cursor: "", limit: 100 },
    );
    assert.deepEqual(
      rebuildSynthesisTagVocabularyApplicationState({
        vocabularyHash: null,
        stagedRevision: 0,
        indexHash: null,
        indexBasisHash: null,
        indexStale: true,
        entryCount: 0,
        stagedCount: 0,
        auditCount: 0,
        pendingEffectCount: 0,
      }),
      {
        vocabularyHash: null,
        stagedRevision: 0,
        indexHash: null,
        indexBasisHash: null,
        indexStale: true,
        entryCount: 0,
        stagedCount: 0,
        auditCount: 0,
        pendingEffectCount: 0,
      },
    );
    assert.deepEqual(
      rebuildSynthesisTagVocabularyApplicationStagedPage({
        entries: [],
        nextCursor: null,
        stagedRevision: 0,
      }),
      { entries: [], nextCursor: null, stagedRevision: 0 },
    );
    assert.equal(
      rebuildSynthesisTagVocabularyApplicationMutationResult({
        status: "unchanged",
        vocabularyHash: null,
        stagedRevision: 0,
        warnings: [],
        changedTags: [],
        diagnostics: [],
      }).status,
      "unchanged",
    );
    assert.equal(
      rebuildSynthesisTagVocabularyApplicationStageRequest({
        expectedStagedRevision: 0,
        entries: [
          {
            tag: "method:review",
            facet: "method",
            parentBindings: [{ libraryId: 1, itemKey: "A" }],
          },
        ],
      }).entries[0]?.parentBindings[0]?.itemKey,
      "A",
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyApplicationSaveRequest({
        expectedVocabularyHash: null,
        candidate: candidate(),
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyApplicationPageRequest({
        cursor: "",
        limit: 101,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyApplicationAuditReplaceRequest({
        libraryId: 1,
        entries: [
          {
            itemKey: "A",
            needsTagRegulation: true,
            nonCompliantTags: [],
          },
          {
            itemKey: "A",
            needsTagRegulation: false,
            nonCompliantTags: [],
          },
        ],
      }),
    );
    assert.throws(() =>
      rebuildSynthesisTagVocabularyApplicationMutationResult({
        status: "unchanged",
        vocabularyHash: null,
        stagedRevision: 0,
        warnings: [],
        changedTags: [],
        diagnostics: [],
        unknown: true,
      }),
    );
  });

  it("persists vocabulary, staged promotion, effects, index, and audits in isolated SQLite", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-application-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-18T00:00:00.000Z",
    });
    const engine = createInProcessSynthesisTagVocabularyEngine();
    const application = createSynthesisTagVocabularyApplication({
      repository: repository.store,
      compute: {
        validate: async (request) => engine.validate(request),
        buildIndex: async (request) => engine.buildIndex(request),
      },
      tagEffectPort: {
        async applyBatch(request) {
          return {
            receipts: request.effects.map((effect) => ({
              effectId: effect.effectId,
              action: effect.action,
              status: "already_satisfied" as const,
              occurredAt: "2026-07-18T00:00:01.000Z",
              diagnostics: [],
            })),
          };
        },
      },
      now: () => "2026-07-18T00:00:00.000Z",
    });

    const saved = await application.save({
      expectedVocabularyHash: null,
      candidate: candidate(),
    });
    assert.equal(saved.status, "committed");
    assert.match(saved.vocabularyHash || "", /^sha256:/);

    const staged = await application.stage({
      expectedStagedRevision: 0,
      entries: [
        {
          tag: "method:review",
          facet: "method",
          parentBindings: [{ libraryId: 1, itemKey: "A" }],
        },
      ],
    });
    assert.equal(staged.status, "committed");
    assert.equal(staged.stagedRevision, 1);

    const promoted = await application.promote({
      expectedVocabularyHash: saved.vocabularyHash,
      expectedStagedRevision: 1,
      tags: ["method:review"],
    });
    assert.equal(promoted.status, "committed");
    assert.deepEqual(promoted.changedTags, ["method:review"]);
    assert.equal(
      repository.store.listTagEffects()[0]?.status,
      "already_satisfied",
    );

    const rebuilt = await application.rebuildIndex({
      expectedVocabularyHash: promoted.vocabularyHash,
    });
    assert.equal(rebuilt.status, "committed");
    assert.isFalse(application.inspect().indexStale);
    assert.deepEqual(application.exportRegulatorTags(), [
      "method:review",
      "topic:vision",
    ]);

    assert.deepEqual(
      application.replaceAudit({
        libraryId: 1,
        entries: [
          {
            itemKey: "A",
            needsTagRegulation: true,
            nonCompliantTags: ["free-tag"],
          },
        ],
      }),
      { libraryId: 1, audited: 1 },
    );
    assert.deepEqual(application.clearAudit({ libraryId: 1, itemKey: "A" }), {
      ok: true,
    });
    assert.isFalse(
      repository.store.listTagAuditRecords({ libraryId: 1 })[0]
        ?.needsTagRegulation,
    );

    await application.shutdown();
    repository.close();

    const reopened = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      reopened.store.getTagApplicationState()?.vocabularyHash,
      promoted.vocabularyHash,
    );
    assert.includeMembers(
      reopened.store.listTagVocabularyEntries().map((row) => row.tag),
      ["topic:vision", "method:review"],
    );
    reopened.close();
  });

  it("preserves last-good state on stale basis and failed post-commit Host effects", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-last-good-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const engine = createInProcessSynthesisTagVocabularyEngine();
    const application = createSynthesisTagVocabularyApplication({
      repository: repository.store,
      compute: {
        validate: async (request) => engine.validate(request),
        buildIndex: async (request) => engine.buildIndex(request),
      },
      tagEffectPort: {
        async applyBatch() {
          throw new Error("private Host failure");
        },
      },
    });
    const saved = await application.save({
      expectedVocabularyHash: null,
      candidate: candidate(),
    });
    assert.equal(
      (
        await application.save({
          expectedVocabularyHash: `sha256:${"0".repeat(64)}`,
          candidate: candidate(),
        })
      ).status,
      "basis_mismatch",
    );
    assert.equal(application.inspect().vocabularyHash, saved.vocabularyHash);

    await application.stage({
      expectedStagedRevision: 0,
      entries: [
        {
          tag: "method:failed_effect",
          facet: "method",
          parentBindings: [{ libraryId: 1, itemKey: "B" }],
        },
      ],
    });
    const promoted = await application.promote({
      expectedVocabularyHash: saved.vocabularyHash,
      expectedStagedRevision: 1,
      tags: ["method:failed_effect"],
    });
    assert.equal(promoted.status, "committed");
    assert.deepInclude(promoted.diagnostics, {
      code: "staged_tag_host_effect_unavailable",
      severity: "error",
    });
    assert.equal(repository.store.listTagEffects()[0]?.status, "pending");

    application.stopAdmission();
    assert.equal(
      (
        await application.save({
          expectedVocabularyHash: promoted.vocabularyHash,
          candidate: candidate(),
        })
      ).status,
      "stopping",
    );
    let auditError: unknown;
    try {
      application.clearAudit({ libraryId: 1, itemKey: "B" });
    } catch (error) {
      auditError = error;
    }
    assert.equal(
      (auditError as { code?: string } | undefined)?.code,
      "stopping",
    );
    await application.shutdown();
    repository.close();
  });

  it("migrates legacy staged bindings before promotion and leaves them unchanged on resolver failure", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-migration-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const engine = createInProcessSynthesisTagVocabularyEngine();
    const createApplication = (resolve: () => Promise<unknown>) =>
      createSynthesisTagVocabularyApplication({
        repository: repository.store,
        compute: {
          validate: async (request) => engine.validate(request),
          buildIndex: async (request) => engine.buildIndex(request),
        },
        legacyLibraryId: 1,
        bindingMigrationPort: { resolve } as never,
      });
    const application = createApplication(async () => {
      throw new Error("resolver unavailable");
    });
    const saved = await application.save({
      expectedVocabularyHash: null,
      candidate: candidate(),
    });
    repository.store.replaceTagStagedSuggestions({
      expectedStagedRevision: 0,
      rows: [
        {
          tag: "method:legacy",
          facet: "method",
          parentBindingsJson: "[42]",
        },
      ],
      now: "2026-07-18T00:00:00.000Z",
    });
    const blocked = await application.promote({
      expectedVocabularyHash: saved.vocabularyHash,
      expectedStagedRevision: 1,
      tags: ["method:legacy"],
    });
    assert.equal(blocked.status, "invalid_request");
    assert.equal(
      repository.store.listTagStagedSuggestions()[0]?.parentBindingsJson,
      "[42]",
    );
    await application.shutdown();

    const migrated = createApplication(async (request: unknown) => {
      const input = request as { itemIds: number[] };
      return {
        resolved: input.itemIds.map((itemId) => ({
          itemId,
          ref: { libraryId: 1, itemKey: "LEGACY" },
        })),
        missingItemIds: [],
        diagnostics: [],
      };
    });
    const promoted = await migrated.promote({
      expectedVocabularyHash: saved.vocabularyHash,
      expectedStagedRevision: 1,
      tags: ["method:legacy"],
    });
    assert.equal(promoted.status, "committed");
    assert.deepInclude(repository.store.listTagEffects()[0], {
      itemKey: "LEGACY",
      tag: "method:legacy",
      status: "pending",
    });
    await migrated.shutdown();
    repository.close();
  });

  it("rolls back staged replacement and drains active worker work before close", async function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-drain-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      repository.store.replaceTagStagedSuggestions({
        expectedStagedRevision: 0,
        rows: [
          {
            tag: "method:stable",
            facet: "method",
            parentBindingsJson: "[]",
          },
        ],
        now: "2026-07-18T00:00:00.000Z",
      }),
      1,
    );
    assert.throws(() =>
      repository.store.replaceTagStagedSuggestions({
        expectedStagedRevision: 1,
        rows: [
          {
            tag: "method:replacement",
            facet: "method",
            parentBindingsJson: "[]",
          },
          { tag: "", facet: "method", parentBindingsJson: "[]" },
        ],
        now: "2026-07-18T00:00:01.000Z",
      }),
    );
    assert.equal(repository.store.getTagApplicationState()?.stagedRevision, 1);
    assert.deepEqual(
      repository.store.listTagStagedSuggestions().map((row) => row.tag),
      ["method:stable"],
    );

    const application = createSynthesisTagVocabularyApplication({
      repository: repository.store,
      compute: {
        validate: async (_request, options) =>
          await new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              "abort",
              () => {
                reject(
                  Object.assign(new Error("canceled"), {
                    code: "worker_canceled",
                  }),
                );
              },
              { once: true },
            );
          }),
        buildIndex: async () => {
          throw new Error("not reached");
        },
      },
    });
    const pending = application.save({
      expectedVocabularyHash: null,
      candidate: candidate(),
    });
    await application.shutdown();
    assert.equal((await pending).status, "stopping");
    repository.close();
  });

  it("installs an independently versioned Tag application table family", function () {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zs-tag-schema-"));
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    assert.equal(
      SYNTHESIS_TAG_VOCABULARY_APPLICATION_REPOSITORY_SCHEMA_VERSION,
      "synthesis-tag-vocabulary-application-repository.v1",
    );
    assert.includeMembers(
      [...SYNTHESIS_TAG_VOCABULARY_APPLICATION_TABLES],
      ["synt_tag_application_state", "synt_tag_effect"],
    );
    assert.equal(repository.snapshot().mode, "isolated_shadow");
    repository.close();
  });

  it("keeps the Rust Tag owner typed and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/tag_vocabulary.rs",
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
    assert.include(source, "pub trait TagVocabularyComputePort");
    assert.include(source, "pub fn promote");
    assert.include(repository, "pub struct TagVocabularyReplacement");
    assert.include(repository, "pub struct TagVocabularyPromotion");
    assert.notInclude(repository, "list_tag_application_rows");
    assert.include(corpus.coverage.tagVocabulary, "busy_cancel_drain_reopen");
  });
});
