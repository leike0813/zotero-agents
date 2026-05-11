import { assert } from "chai";
import {
  assessSynthesisSyncRecovery,
  buildConflictCandidateActions,
  normalizeConflictCandidates,
  planStartupSyncCheck,
  validateMirrorManifestAgainstShards,
} from "../../src/modules/synthesis/syncRecovery";
import { buildMirrorManifest, type MirrorManifest } from "../../src/modules/synthesis/foundation";

function manifest(overrides: Partial<MirrorManifest> = {}) {
  return buildMirrorManifest({
    libraryId: 1,
    anchorKey: "ANCHOR",
    mirrorId: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedAt: "2026-05-10T00:00:00.000Z",
    shards: [
      {
        kind: "topics",
        seq: 1,
        total: 1,
        noteKey: "NOTE1",
        title: "ZS Synthesis Mirror [1] topics 001/001",
        payloadHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        encodedHash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    ],
    ...overrides,
  });
}

describe("Synthesis sync recovery", function () {
  it("requires confirmation before recovering a missing canonical root from valid shards", function () {
    const result = assessSynthesisSyncRecovery({
      root: { state: "missing" },
      mirror: {
        manifest: manifest(),
        shards: [
          {
            library_id: 1,
            mirror_id: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            kind: "topics",
            seq: 1,
            total: 1,
            note_key: "NOTE1",
            title: "ZS Synthesis Mirror [1] topics 001/001",
            payload_hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            encoded_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            payload: "{\"ok\":true}",
          },
        ],
      },
      localIndexes: { state: "healthy" },
      conflicts: [],
    });

    assert.equal(result.status, "missing_root");
    assert.include(result.allowedActions, "recover_from_shards");
    assert.isTrue(result.requiresConfirmation);
    assert.isFalse(result.autoOverwriteCanonical);
  });

  it("prefers canonical assets over stale mirrors", function () {
    const result = assessSynthesisSyncRecovery({
      root: {
        state: "ready",
        canonical_manifest_hash:
          "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      },
      mirror: {
        manifest: {
          ...manifest(),
          manifest_hash:
            "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        },
        shards: [],
      },
      localIndexes: { state: "healthy" },
      conflicts: [],
    });

    assert.equal(result.status, "divergent");
    assert.include(result.allowedActions, "rebuild_mirror_from_canonical");
    assert.include(result.allowedActions, "save_conflict_copy");
    assert.notInclude(result.allowedActions, "recover_from_shards");
    assert.isFalse(result.autoOverwriteCanonical);
  });

  it("marks a mirror degraded when manifest and shard summaries disagree", function () {
    const result = validateMirrorManifestAgainstShards({
      manifest: manifest(),
      shards: [
        {
          library_id: 1,
          mirror_id: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          kind: "topics",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror [1] topics 001/001",
          payload_hash: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encoded_hash: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          payload: "{}",
        },
      ],
    });

    assert.isFalse(result.ok);
    assert.equal(result.state, "degraded");
    assert.include(result.diagnostics.map((entry) => entry.code), "payload_hash_mismatch");
  });

  it("plans local index rebuild without marking canonical assets corrupt", function () {
    const result = assessSynthesisSyncRecovery({
      root: { state: "ready", canonical_manifest_hash: manifest().manifest_hash },
      mirror: { manifest: manifest(), shards: [] },
      localIndexes: { state: "corrupt" },
      conflicts: [],
    });

    assert.equal(result.status, "index_dirty");
    assert.include(result.allowedActions, "rebuild_local_indexes");
    assert.notInclude(result.diagnostics.map((entry) => entry.code), "canonical_corrupt");
  });

  it("skips startup checks when the preference is disabled", function () {
    const result = planStartupSyncCheck({
      runHashCheckOnStartup: false,
      assessment: {
        root: { state: "ready" },
        mirror: { manifest: manifest(), shards: [] },
        localIndexes: { state: "healthy" },
        conflicts: [],
      },
    });

    assert.equal(result.status, "check_skipped");
    assert.deepEqual(result.allowedActions, []);
  });

  it("sorts conflict candidates newest first and exposes local-only actions", function () {
    const candidates = normalizeConflictCandidates([
      {
        id: "old",
        topic_id: "topic-a",
        created_at: "2026-05-09T00:00:00.000Z",
        bundle_hash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        reason: "base_hash_mismatch",
      },
      {
        id: "new",
        topic_id: "topic-a",
        created_at: "2026-05-10T00:00:00.000Z",
        bundle_hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        reason: "base_hash_mismatch",
      },
    ]);
    const actions = buildConflictCandidateActions(candidates[0]);

    assert.deepEqual(candidates.map((entry) => entry.id), ["new", "old"]);
    assert.deepEqual(actions.map((entry) => entry.action), [
      "retry_update",
      "clear_conflict_candidate",
    ]);
    assert.isTrue(actions.every((entry) => entry.localOnly));
  });
});
