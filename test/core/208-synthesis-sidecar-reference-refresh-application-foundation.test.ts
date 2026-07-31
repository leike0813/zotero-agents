import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS,
  rebuildSynthesisReferenceRefreshApplyRequest,
  rebuildSynthesisReferenceRefreshPageRequest,
  rebuildSynthesisReferenceRefreshPrepareRequest,
  rebuildSynthesisReferenceRefreshInspectResult,
  rebuildSynthesisReferenceRefreshMutationResult,
} from "../../packages/synthesis-contracts/src/referenceRefreshApplication";
import { createSynthesisReferenceRefreshApplication } from "../../packages/synthesis-application/src/referenceRefreshApplication";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisNodeSqliteAdapter } from "../../apps/synthesis-service/src/repositoryNodeSqlite";
import { createSynthesisSidecarReferenceRefreshApplication } from "../../apps/synthesis-service/src/referenceRefreshApplicationNode";

const PROFILE_ID = "e".repeat(64);
const DATA_ROOT_ID = "f".repeat(64);

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zs-reference-refresh-"));
}

function item(paperRef: string, title: string) {
  const [libraryId, itemKey] = paperRef.split(":");
  return {
    paperRef,
    libraryId: Number(libraryId),
    itemKey,
    itemType: "journalArticle",
    title,
    year: "2024",
    date: "2024",
    creators: ["Author"],
    tags: [],
    collections: [],
    doi: "",
    arxiv: "",
    isbn: "",
    url: "",
    citekey: itemKey.toLowerCase(),
    dateAdded: "2026-07-17",
  };
}

function descriptors(paperRef: string, version = "1") {
  const hashPrefix = {
    digest: "a",
    references: "b",
    citation_analysis: "c",
  } as const;
  return (["digest", "references", "citation_analysis"] as const).map(
    (artifactType) => ({
      paperRef,
      artifactType,
      payloadType:
        artifactType === "digest"
          ? "text/markdown"
          : artifactType === "references"
            ? "references-json"
            : "citation-analysis-json",
      status: "available" as const,
      locator: `${paperRef}/${artifactType}/${version}`,
      payloadHash: `sha256:${(hashPrefix[artifactType] + version)
        .repeat(64)
        .slice(0, 64)}`,
      diagnostics: [],
    }),
  );
}

function prepareInput(args: {
  expectedReferenceHash: string | null;
  sourceRefs?: string[];
  version?: string;
  force?: boolean;
}) {
  const sourceRefs = args.sourceRefs ?? ["1:A", "1:B"];
  return {
    expectedReferenceHash: args.expectedReferenceHash,
    force: args.force ?? false,
    scope:
      args.sourceRefs === undefined
        ? ({ kind: "full" } as const)
        : ({ kind: "sources", sourceRefs } as const),
    items: sourceRefs.map((paperRef) => item(paperRef, `Title ${paperRef}`)),
    artifacts: sourceRefs.flatMap((paperRef) =>
      descriptors(paperRef, args.version),
    ),
  };
}

function materialize(
  preparation: Extract<
    Awaited<
      ReturnType<
        ReturnType<
          typeof createSynthesisReferenceRefreshApplication
        >["prepareRefresh"]
      >
    >,
    { status: "prepared" }
  >,
) {
  return preparation.reads.map((read) => ({
    locator: read.locator,
    expectedHash: read.expectedHash,
    result: {
      status: "available" as const,
      payloadHash: read.expectedHash,
      content: {
        kind: "json" as const,
        value:
          read.artifactType === "references"
            ? {
                references: [
                  {
                    id: `${read.paperRef}-ref`,
                    title: `Target ${read.paperRef}`,
                    year: "2020",
                    authors: ["Target Author"],
                    citekey: `target-${read.paperRef}`,
                  },
                ],
              }
            : { citations: [{ reference_index: 0, role: "background" }] },
      },
      diagnostics: [],
    },
  }));
}

describe("Synthesis sidecar Reference Refresh application foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("strictly rebuilds bounded prepare, apply, and page requests", function () {
    assert.equal(
      SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.preparationBytes,
      8 * 1024 * 1024,
    );
    assert.isAbove(
      SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.materializedBatchBytes,
      SYNTHESIS_REFERENCE_REFRESH_APPLICATION_LIMITS.preparationBytes,
    );
    const rebuilt = rebuildSynthesisReferenceRefreshPrepareRequest(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(rebuilt.items.length, 2);
    assert.equal(rebuilt.artifacts.length, 6);
    assert.deepEqual(rebuildSynthesisReferenceRefreshPageRequest({}), {
      cursor: "",
      limit: 50,
    });
    assert.deepEqual(
      rebuildSynthesisReferenceRefreshInspectResult({
        referenceHash: null,
        inputHash: null,
        sourceCount: 0,
        referenceCount: 0,
        canonicalCount: 0,
        bindingCount: 0,
        referenceReady: false,
        graphReady: false,
        relatedItemsReady: false,
      }).sourceCount,
      0,
    );
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshMutationResult({
        status: "promoted",
        referenceHash: null,
        inputHash: null,
        warnings: [],
        affectedSourceRefs: [],
        unknown: true,
      }),
    );
    assert.deepEqual(
      rebuildSynthesisReferenceRefreshPrepareRequest({
        expectedReferenceHash: null,
        force: false,
        scope: { kind: "full" },
        items: [],
        artifacts: [],
      }).items,
      [],
    );
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshPrepareRequest({
        ...prepareInput({ expectedReferenceHash: null }),
        unknown: true,
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshPrepareRequest({
        ...prepareInput({ expectedReferenceHash: null }),
        artifacts: descriptors("1:A"),
      }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshPageRequest({ limit: 101 }),
    );
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshApplyRequest({
        preparationId: "prep:1",
        payloads: [],
        unknown: true,
      }),
    );
  });

  it("plans changed payloads, promotes exactly once, pages stably, and persists", async function () {
    const root = tempRoot();
    roots.push(root);
    const first = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T13:00:00.000Z",
    });
    const application = createSynthesisReferenceRefreshApplication({
      repository: first.store,
      now: () => "2026-07-17T13:00:00.000Z",
      createPreparationId: () => "prep:first",
    });
    const prepared = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    assert.deepEqual(
      prepared.reads.map((read) => read.artifactType),
      ["citation_analysis", "references", "citation_analysis", "references"],
    );
    assert.equal(application.inspect().referenceReady, false);

    const promoted = await application.applyRefresh({
      preparationId: prepared.preparationId,
      payloads: materialize(prepared),
    });
    assert.equal(promoted.status, "promoted");
    assert.match(promoted.referenceHash, /^sha256:/);
    assert.deepInclude(application.inspect(), {
      referenceReady: true,
      sourceCount: 2,
      referenceCount: 2,
    });
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: prepared.preparationId,
          payloads: materialize(prepared),
        })
      ).status,
      "preparation_missing",
    );
    const page1 = application.readSources({ limit: 1 });
    const page2 = application.readSources({
      cursor: page1.nextCursor,
      limit: 1,
    });
    assert.deepEqual(
      [...page1.rows, ...page2.rows].map((row) => row.paperRef),
      ["1:A", "1:B"],
    );

    const unchanged = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: promoted.referenceHash }),
    );
    assert.equal(unchanged.status, "unchanged");
    const forced = await application.prepareRefresh(
      prepareInput({
        expectedReferenceHash: promoted.referenceHash,
        force: true,
      }),
    );
    assert.equal(forced.status, "prepared");
    if (forced.status !== "prepared") return;
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: forced.preparationId,
          payloads: materialize(forced),
        })
      ).status,
      "promoted",
    );
    first.close();

    const second = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const reopened = createSynthesisReferenceRefreshApplication({
      repository: second.store,
    });
    assert.equal(reopened.inspect().referenceHash, promoted.referenceHash);
    assert.equal(reopened.readReferences({ limit: 100 }).rows.length, 2);
    second.close();
  });

  it("rejects stale materialization without writes and retains unrelated source rows", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let sequence = 0;
    const application = createSynthesisReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => `prep:${++sequence}`,
    });
    const initial = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(initial.status, "prepared");
    if (initial.status !== "prepared") return;
    const created = await application.applyRefresh({
      preparationId: initial.preparationId,
      payloads: materialize(initial),
    });
    assert.equal(created.status, "promoted");

    const stale = await application.prepareRefresh(
      prepareInput({
        expectedReferenceHash: created.referenceHash,
        sourceRefs: ["1:A"],
        version: "2",
      }),
    );
    assert.equal(stale.status, "prepared");
    if (stale.status !== "prepared") return;
    const badPayloads = materialize(stale).slice(1);
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: stale.preparationId,
          payloads: badPayloads,
        })
      ).status,
      "payload_stale",
    );
    assert.equal(application.inspect().referenceHash, created.referenceHash);
    assert.equal(application.readReferences({ limit: 100 }).rows.length, 2);

    const scoped = await application.prepareRefresh(
      prepareInput({
        expectedReferenceHash: created.referenceHash,
        sourceRefs: ["1:A"],
        version: "2",
      }),
    );
    assert.equal(scoped.status, "prepared");
    if (scoped.status !== "prepared") return;
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: scoped.preparationId,
          payloads: materialize(scoped),
        })
      ).status,
      "promoted",
    );
    assert.deepEqual(
      application
        .readReferences({ limit: 100 })
        .rows.map((row) => row.sourceRef),
      ["1:A", "1:B"],
    );

    const beforeSweep = application.inspect();
    const sweep = await application.prepareRefresh({
      expectedReferenceHash: beforeSweep.referenceHash,
      force: false,
      scope: { kind: "full" },
      items: [],
      artifacts: [],
    });
    assert.equal(sweep.status, "prepared");
    if (sweep.status !== "prepared") return;
    assert.deepEqual(sweep.reads, []);
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: sweep.preparationId,
          payloads: [],
        })
      ).status,
      "promoted",
    );
    assert.equal(application.inspect().sourceCount, 0);
    repository.close();
  });

  it("serializes preparation, supports discard, and stops admission", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => "prep:lifecycle",
    });
    const prepared = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(prepared.status, "prepared");
    assert.equal(
      (
        await application.prepareRefresh(
          prepareInput({ expectedReferenceHash: null }),
        )
      ).status,
      "reference_refresh_busy",
    );
    assert.equal(application.discardPreparation(), true);
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: "prep:lifecycle",
          payloads: [],
        })
      ).status,
      "preparation_missing",
    );
    application.stopAdmission();
    assert.equal(
      (
        await application.prepareRefresh(
          prepareInput({ expectedReferenceHash: null }),
        )
      ).status,
      "stopping",
    );
    await application.shutdown();
    repository.close();
  });

  it("keeps downstream readiness for descriptor-only changes and warns on post-commit receipt failure", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let sequence = 0;
    const application = createSynthesisReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => `prep:receipt:${++sequence}`,
    });
    const initial = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(initial.status, "prepared");
    if (initial.status !== "prepared") return;
    const created = await application.applyRefresh({
      preparationId: initial.preparationId,
      payloads: materialize(initial),
    });
    const stateConnection = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    stateConnection.adapter.run(
      "UPDATE synt_reference_application_state SET graph_ready=1, related_items_ready=1 WHERE singleton_id=1",
    );
    stateConnection.close();

    const descriptorOnlyInput = prepareInput({
      expectedReferenceHash: created.referenceHash,
      sourceRefs: ["1:A"],
    });
    descriptorOnlyInput.artifacts = descriptorOnlyInput.artifacts.map(
      (descriptor) =>
        descriptor.artifactType === "digest"
          ? descriptors("1:A", "2").find(
              (candidate) => candidate.artifactType === "digest",
            )!
          : descriptor,
    );
    const descriptorOnly =
      await application.prepareRefresh(descriptorOnlyInput);
    assert.equal(descriptorOnly.status, "prepared");
    if (descriptorOnly.status !== "prepared") return;
    assert.deepEqual(descriptorOnly.reads, []);

    const receiptFailure = createSynthesisReferenceRefreshApplication({
      repository: {
        ...repository.store,
        updateOperationStatus(args) {
          if (args.status === "completed") {
            throw new Error("forced operation receipt failure");
          }
          return repository.store.updateOperationStatus(args);
        },
      },
      createPreparationId: () => "unused",
    });
    application.discardPreparation();
    const prepared = await receiptFailure.prepareRefresh(descriptorOnlyInput);
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    const promoted = await receiptFailure.applyRefresh({
      preparationId: prepared.preparationId,
      payloads: [],
    });
    assert.equal(promoted.status, "promoted");
    assert.deepEqual(promoted.warnings, [
      "reference_refresh_operation_receipt_failed",
    ]);
    assert.isTrue(receiptFailure.inspect().graphReady);
    assert.isTrue(receiptFailure.inspect().relatedItemsReady);
    repository.close();
  });

  it("drains an active apply during shutdown before repository closure", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const application = createSynthesisReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => "prep:shutdown",
    });
    const prepared = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    const apply = application.applyRefresh({
      preparationId: prepared.preparationId,
      payloads: materialize(prepared),
    });
    const shutdown = application.shutdown();
    assert.equal((await apply).status, "promoted");
    await shutdown;
    assert.isTrue(application.inspect().referenceReady);
    repository.close();
  });

  it("enforces create/update CAS and rolls back a failed scoped replacement", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let sequence = 0;
    const application = createSynthesisSidecarReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => `prep:cas:${++sequence}`,
    });
    const initial = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(initial.status, "prepared");
    if (initial.status !== "prepared") return;
    const created = await application.applyRefresh({
      preparationId: initial.preparationId,
      payloads: materialize(initial),
    });
    assert.equal(created.status, "promoted");
    assert.equal(
      (
        await application.prepareRefresh(
          prepareInput({ expectedReferenceHash: null, force: true }),
        )
      ).status,
      "basis_mismatch",
    );
    assert.equal(
      (
        await application.prepareRefresh(
          prepareInput({
            expectedReferenceHash: `sha256:${"0".repeat(64)}`,
            force: true,
          }),
        )
      ).status,
      "basis_mismatch",
    );

    const prepared = await application.prepareRefresh(
      prepareInput({
        expectedReferenceHash: created.referenceHash,
        sourceRefs: ["1:A"],
        version: "2",
      }),
    );
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    const trigger = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    trigger.adapter.run(`CREATE TRIGGER fail_reference_replace
      BEFORE INSERT ON synt_reference_raw
      BEGIN SELECT RAISE(ABORT, 'forced reference replacement failure'); END`);
    trigger.close();
    const failed = await application.applyRefresh({
      preparationId: prepared.preparationId,
      payloads: materialize(prepared),
    });
    assert.equal(failed.status, "repair_required");
    assert.equal(application.inspect().referenceHash, created.referenceHash);
    assert.deepEqual(
      application
        .readReferences({ limit: 100 })
        .rows.map((row) => row.sourceRef),
      ["1:A", "1:B"],
    );
    repository.close();
  });

  it("preserves a manual binding and records protected canonical revision review", async function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    let sequence = 0;
    const application = createSynthesisReferenceRefreshApplication({
      repository: repository.store,
      createPreparationId: () => `prep:protected:${++sequence}`,
    });
    const initial = await application.prepareRefresh(
      prepareInput({ expectedReferenceHash: null }),
    );
    assert.equal(initial.status, "prepared");
    if (initial.status !== "prepared") return;
    const created = await application.applyRefresh({
      preparationId: initial.preparationId,
      payloads: materialize(initial),
    });
    const oldCanonicalId = application
      .readReferences({ limit: 100 })
      .rows.find((row) => row.sourceRef === "1:A")!.canonicalReferenceId!;
    const connection = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    connection.adapter.run(
      `INSERT INTO synt_reference_binding (
        binding_id, canonical_reference_id, library_id, item_key, status,
        confidence, reviewer, basis_hash, diagnostics_json, created_at, updated_at
      ) VALUES (
        'binding:manual', @canonical_reference_id, 1, 'A', 'accepted',
        'manual', 'user', '', '[]', @timestamp, @timestamp
      )`,
      {
        canonical_reference_id: oldCanonicalId,
        timestamp: "2026-07-17T13:30:00.000Z",
      },
    );
    connection.close();

    const prepared = await application.prepareRefresh(
      prepareInput({
        expectedReferenceHash: created.referenceHash,
        sourceRefs: ["1:A"],
        version: "2",
      }),
    );
    assert.equal(prepared.status, "prepared");
    if (prepared.status !== "prepared") return;
    const payloads = materialize(prepared);
    const references = payloads.find((payload) =>
      payload.locator.includes("/references/"),
    )!;
    references.result.content = {
      kind: "json",
      value: {
        references: [
          {
            title: "A completely revised target",
            year: "2025",
            authors: ["New Author"],
          },
        ],
      },
    };
    assert.equal(
      (
        await application.applyRefresh({
          preparationId: prepared.preparationId,
          payloads,
        })
      ).status,
      "promoted",
    );
    const inspection = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    assert.equal(
      inspection.adapter.get(
        "SELECT COUNT(*) AS count FROM synt_reference_binding WHERE binding_id='binding:manual'",
      )?.count,
      1,
    );
    assert.equal(
      inspection.adapter.get(
        "SELECT COUNT(*) AS count FROM synt_reference_revision_review WHERE canonical_reference_id=@canonical_reference_id AND status='open'",
        { canonical_reference_id: oldCanonicalId },
      )?.count,
      1,
    );
    inspection.close();
    repository.close();
  });

  it("keeps the Rust Reference Refresh owner scope-aware and represented in the parity corpus", function () {
    const projectRoot = path.resolve(process.cwd());
    const source = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-application/src/reference_refresh.rs",
      ),
      "utf8",
    );
    const repository = fs.readFileSync(
      path.join(
        projectRoot,
        "native/synthesis-sidecar/crates/synthesis-repository/src/citation_reference.rs",
      ),
      "utf8",
    );
    const corpus = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "packages/synthesis-contracts/contract-set/synthesis-citation-reference-application-parity-v1/corpus.json",
        ),
        "utf8",
      ),
    );
    assert.include(source, "pub fn prepare_refresh");
    assert.include(source, "pub fn discard_preparation");
    assert.include(repository, "pub enum ReferenceProjectionScope");
    assert.notInclude(repository, "list_reference_application_rows");
    assert.include(corpus.coverage.referenceRefresh, "protected_decisions");
  });
});
