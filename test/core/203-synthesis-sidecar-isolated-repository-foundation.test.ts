import { assert } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
  SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
  SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
  SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_META_KEY,
  SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_VERSION,
  SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_META_KEY,
  SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_VERSION,
  createSynthesisRepositoryFoundationStore,
  getSynthesisReferenceMatchingPreparation,
  upsertSynthesisReferenceMatchingPreparation,
} from "../../packages/synthesis-repository/src/index";
import { openSynthesisNodeSqliteAdapter } from "../../apps/synthesis-service/src/repositoryNodeSqlite";
import { openSynthesisSidecarIsolatedRepository } from "../../apps/synthesis-service/src/isolatedRepository";
import { openSynthesisSidecarTopicCanonicalStore } from "../../apps/synthesis-service/src/topicCanonicalStoreNode";

const PROFILE_ID = "1".repeat(64);
const DATA_ROOT_ID = "2".repeat(64);

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "zs-sidecar-repository-"));
}

describe("Synthesis sidecar isolated repository foundation", function () {
  const roots: string[] = [];

  afterEach(function () {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses real node:sqlite with an idempotent exact four-table foundation schema", function () {
    const root = tempRoot();
    roots.push(root);
    const databasePath = path.join(root, "synthesis.db");
    const connection = openSynthesisNodeSqliteAdapter(databasePath);
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });

    store.initialize();
    store.initialize();

    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_%' ORDER BY name",
      )
      .map((row) => row.name);
    assert.deepEqual(tables, [
      "synt_cache_basis",
      "synt_operation",
      "synt_schema_meta",
      "synt_topic_deleted_artifact",
    ]);
    assert.equal(
      store.getSchemaVersion(),
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    connection.close();
  });

  it("migrates an isolated v1 foundation idempotently and marks cache bases stale", function () {
    const root = tempRoot();
    roots.push(root);
    const databasePath = path.join(root, "synthesis.db");
    const connection = openSynthesisNodeSqliteAdapter(databasePath);
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    store.initialize();
    store.upsertCacheBasis({
      cacheKey: "citation:layout",
      cacheKind: "citation_layout",
      status: "ready",
    });
    connection.adapter.run(
      "UPDATE synt_schema_meta SET value=@value WHERE key=@key",
      {
        key: "repository_foundation_schema_version",
        value: "synthesis-repository-foundation.v1",
      },
    );
    connection.close();

    const reopened = openSynthesisNodeSqliteAdapter(databasePath);
    const migrated = createSynthesisRepositoryFoundationStore({
      db: reopened.adapter,
      now: () => "2026-07-17T00:01:00.000Z",
    });
    migrated.initialize();
    migrated.initialize();
    assert.equal(
      migrated.getSchemaVersion(),
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    assert.equal(migrated.getCacheBasis("citation:layout")?.status, "stale");
    assert.equal(
      migrated.getCacheBasis("citation:layout")?.staleReason,
      "repository_foundation_v2",
    );
    reopened.close();
  });

  it("installs the isolated Citation Graph application schema without changing the foundation snapshot", function () {
    const root = tempRoot();
    roots.push(root);
    const connection = openSynthesisNodeSqliteAdapter(
      path.join(root, "synthesis.db"),
    );
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    store.initializeCitationGraphApplication();
    store.initializeCitationGraphApplication();
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_%' ORDER BY name",
      )
      .map((row) => row.name);
    assert.deepEqual(tables, [
      "synt_cache_basis",
      "synt_citation_edge",
      "synt_citation_graph_application_state",
      "synt_citation_incoming_group",
      "synt_citation_layout_state",
      "synt_citation_metrics_complex",
      "synt_citation_metrics_light",
      "synt_citation_node",
      "synt_citation_source_ownership",
      "synt_operation",
      "synt_schema_meta",
      "synt_topic_deleted_artifact",
    ]);
    assert.equal(
      connection.adapter.get(
        "SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1",
        {
          key: SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_META_KEY,
        },
      )?.value,
      SYNTHESIS_CITATION_GRAPH_APPLICATION_REPOSITORY_SCHEMA_VERSION,
    );
    assert.equal(
      store.getSchemaVersion(),
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    connection.close();
  });

  it("installs the isolated Reference Refresh projection schema idempotently", function () {
    const root = tempRoot();
    roots.push(root);
    const connection = openSynthesisNodeSqliteAdapter(
      path.join(root, "synthesis.db"),
    );
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    store.initializeReferenceRefreshApplication();
    store.initializeReferenceRefreshApplication();
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_reference_%' ORDER BY name",
      )
      .map((row) => row.name);
    assert.deepEqual(tables, [
      "synt_reference_application_state",
      "synt_reference_artifact",
      "synt_reference_binding",
      "synt_reference_canonical",
      "synt_reference_raw",
      "synt_reference_redirect",
      "synt_reference_revision_review",
      "synt_reference_source",
    ]);
    assert.equal(
      connection.adapter.get(
        "SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1",
        { key: SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_META_KEY },
      )?.value,
      SYNTHESIS_REFERENCE_REFRESH_REPOSITORY_SCHEMA_VERSION,
    );
    assert.equal(
      store.getSchemaVersion(),
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    connection.close();
  });

  it("installs the isolated Reference Matching/Review schema idempotently", function () {
    const root = tempRoot();
    roots.push(root);
    const connection = openSynthesisNodeSqliteAdapter(
      path.join(root, "synthesis.db"),
    );
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    store.initializeReferenceMatchingReviewApplication();
    store.initializeReferenceMatchingReviewApplication();
    const tables = connection.adapter
      .all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'synt_reference_match%' ORDER BY name",
      )
      .map((row) => row.name);
    assert.deepEqual(tables, [
      "synt_reference_match_proposal",
      "synt_reference_matching_preparation",
      "synt_reference_matching_state",
    ]);
    assert.equal(
      connection.adapter.get(
        "SELECT value FROM synt_schema_meta WHERE key=@key LIMIT 1",
        {
          key: SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_META_KEY,
        },
      )?.value,
      SYNTHESIS_REFERENCE_MATCHING_REVIEW_REPOSITORY_SCHEMA_VERSION,
    );
    assert.equal(
      store.getSchemaVersion(),
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    connection.close();
  });

  it("supersedes an interrupted matching preparation during restart recovery", function () {
    const root = tempRoot();
    roots.push(root);
    const repository = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    const writer = openSynthesisNodeSqliteAdapter(
      repository.paths.databasePath,
    );
    upsertSynthesisReferenceMatchingPreparation(writer.adapter, {
      preparationId: "prep:interrupted",
      referenceHash: null,
      repositoryBasisHash: `sha256:${"1".repeat(64)}`,
      hostBasisHash: `sha256:${"2".repeat(64)}`,
      status: "prepared",
      diagnosticsJson: "[]",
      createdAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });
    writer.close();
    repository.close();

    const recovered = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: root,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    const reader = openSynthesisNodeSqliteAdapter(recovered.paths.databasePath);
    assert.equal(
      getSynthesisReferenceMatchingPreparation(
        reader.adapter,
        "prep:interrupted",
      )?.status,
      "superseded",
    );
    reader.close();
    recovered.close();
  });

  it("commits, rolls back, and isolates nested savepoints", function () {
    const root = tempRoot();
    roots.push(root);
    const connection = openSynthesisNodeSqliteAdapter(
      path.join(root, "synthesis.db"),
    );
    const store = createSynthesisRepositoryFoundationStore({
      db: connection.adapter,
      now: () => "2026-07-17T00:00:00.000Z",
    });
    store.initialize();

    connection.adapter.transaction(() => {
      store.upsertCacheBasis({ cacheKey: "outer", cacheKind: "test" });
      assert.throws(() =>
        connection.adapter.transaction(() => {
          store.upsertCacheBasis({ cacheKey: "inner", cacheKind: "test" });
          throw new Error("rollback inner");
        }),
      );
      store.upsertCacheBasis({ cacheKey: "outer-2", cacheKind: "test" });
    });
    assert.isNull(store.getCacheBasis("inner"));
    assert.isNotNull(store.getCacheBasis("outer"));
    assert.isNotNull(store.getCacheBasis("outer-2"));

    assert.throws(() =>
      connection.adapter.transaction(() => {
        store.upsertCacheBasis({ cacheKey: "rollback", cacheKind: "test" });
        throw new Error("rollback outer");
      }),
    );
    assert.isNull(store.getCacheBasis("rollback"));
    connection.close();
  });

  it("persists foundation rows and reconciles only running operations on restart", function () {
    const root = tempRoot();
    roots.push(root);
    const profileRuntimeRoot = path.join(root, "profile-runtime");
    const nowValues = [
      "2026-07-17T00:00:00.000Z",
      "2026-07-17T00:00:01.000Z",
      "2026-07-17T00:00:02.000Z",
    ];
    const first = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => nowValues.shift() || "2026-07-17T00:00:03.000Z",
    });
    first.store.upsertCacheBasis({ cacheKey: "basis", cacheKind: "layout" });
    first.store.upsertOperation({
      operationId: "running",
      operationType: "canary",
      status: "running",
    });
    first.store.upsertOperation({
      operationId: "completed",
      operationType: "canary",
      status: "completed",
    });
    const repositoryId = first.snapshot().repositoryId;
    first.close();

    const second = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
      now: () => "2026-07-17T00:01:00.000Z",
    });
    assert.equal(second.snapshot().repositoryId, repositoryId);
    const interrupted = second.store.getOperation("running");
    assert.include(interrupted, {
      status: "canceled",
      phase: "service_restart",
      phaseLabel: "Service restarted",
    });
    assert.deepEqual(JSON.parse(interrupted?.diagnosticsJson || "[]"), [
      {
        code: "synthesis_operation_stale_after_restart",
        severity: "warning",
      },
    ]);
    assert.equal(second.store.getOperation("completed")?.status, "completed");
    assert.isNotNull(second.store.getCacheBasis("basis"));
    second.close();
  });

  it("fails closed on marker corruption and keeps paths out of snapshots", function () {
    const root = tempRoot();
    roots.push(root);
    const profileRuntimeRoot = path.join(root, "profile-runtime");
    const first = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot,
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    const snapshot = first.snapshot();
    assert.deepEqual(Object.keys(snapshot).sort(), [
      "mode",
      "repositoryId",
      "schemaVersion",
      "state",
    ]);
    assert.notInclude(JSON.stringify(snapshot), profileRuntimeRoot);
    const markerPath = first.paths.markerPath;
    const databasePath = first.paths.databasePath;
    first.close();
    fs.writeFileSync(markerPath, '{"schema":"corrupt"}\n', "utf8");

    assert.throws(
      () =>
        openSynthesisSidecarIsolatedRepository({
          profileRuntimeRoot,
          profileId: PROFILE_ID,
          dataRootId: DATA_ROOT_ID,
        }),
      /repository_identity_invalid/,
    );
    assert.isTrue(fs.existsSync(databasePath));
  });

  it("fails closed on an unsupported persisted foundation schema", function () {
    const root = tempRoot();
    roots.push(root);
    const options = {
      profileRuntimeRoot: path.join(root, "profile-runtime"),
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    };
    const owner = openSynthesisSidecarIsolatedRepository(options);
    const databasePath = owner.paths.databasePath;
    owner.close();
    const connection = openSynthesisNodeSqliteAdapter(databasePath);
    connection.adapter.run(
      "UPDATE synt_schema_meta SET value=@value WHERE key=@key",
      {
        key: "repository_foundation_schema_version",
        value: "synthesis-repository-foundation.v999",
      },
    );
    connection.close();

    assert.throws(
      () => openSynthesisSidecarIsolatedRepository(options),
      /repository_foundation_schema_unsupported/,
    );
  });

  it("uses owner-only POSIX permissions and releases the database promptly", function () {
    const root = tempRoot();
    roots.push(root);
    const startedAt = Date.now();
    const owner = openSynthesisSidecarIsolatedRepository({
      profileRuntimeRoot: path.join(root, "profile-runtime"),
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    });
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(owner.paths.root).mode & 0o777, 0o700);
      assert.equal(fs.statSync(owner.paths.databasePath).mode & 0o777, 0o600);
    }
    owner.close();
    assert.isBelow(Date.now() - startedAt, 500);

    const reopened = openSynthesisNodeSqliteAdapter(owner.paths.databasePath);
    assert.equal(
      reopened.adapter.get(
        "SELECT value FROM synt_schema_meta WHERE key=@key",
        { key: "repository_foundation_schema_version" },
      )?.value,
      SYNTHESIS_REPOSITORY_FOUNDATION_SCHEMA_VERSION,
    );
    reopened.close();
  });

  it("keeps repository and Topic canonical shadow owners independent", function () {
    const root = tempRoot();
    roots.push(root);
    const options = {
      profileRuntimeRoot: path.join(root, "profile-runtime"),
      profileId: PROFILE_ID,
      dataRootId: DATA_ROOT_ID,
    };
    const repository = openSynthesisSidecarIsolatedRepository(options);
    const canonicalStore = openSynthesisSidecarTopicCanonicalStore(options);
    assert.notEqual(repository.paths.root, canonicalStore.paths.root);
    assert.equal(repository.snapshot().state, "ready");
    assert.equal(canonicalStore.snapshot().state, "ready");
    canonicalStore.close();
    assert.equal(repository.snapshot().state, "ready");
    repository.close();
    assert.equal(canonicalStore.snapshot().state, "stopping");
  });
});
