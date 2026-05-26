import { assert } from "chai";
import {
  assessSynthesisSyncRecovery,
  buildConflictCandidateActions,
  normalizeConflictCandidates,
  planStartupSyncCheck,
  validateMirrorManifestAgainstShards,
} from "../../src/modules/synthesis/syncRecovery";
import {
  buildMirrorManifest,
  type MirrorManifest,
} from "../../src/modules/synthesis/foundation";

function manifest(overrides: Partial<MirrorManifest> = {}) {
  return buildMirrorManifest({
    libraryId: 1,
    anchorKey: "ANCHOR",
    mirrorId:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    updatedAt: "2026-05-10T00:00:00.000Z",
    shards: [
      {
        kind: "topics",
        seq: 1,
        total: 1,
        noteKey: "NOTE1",
        title: "ZS Synthesis Mirror [1] topics 001/001",
        payloadHash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        encodedHash:
          "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    ],
    ...overrides,
  });
}

describe("Synthesis sync recovery", function () {
  it("does not advertise mirror recovery when canonical root is missing", function () {
    const result = assessSynthesisSyncRecovery({
      root: { state: "missing" },
      mirror: {
        manifest: manifest(),
        shards: [
          {
            library_id: 1,
            mirror_id:
              "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            kind: "topics",
            seq: 1,
            total: 1,
            note_key: "NOTE1",
            title: "ZS Synthesis Mirror [1] topics 001/001",
            payload_hash:
              "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            encoded_hash:
              "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            payload: '{"ok":true}',
          },
        ],
      },
      localIndexes: { state: "healthy" },
      conflicts: [],
    });

    assert.equal(result.status, "missing_root");
    assert.notInclude(result.allowedActions, "recover_from_shards");
    assert.isFalse(result.requiresConfirmation);
    assert.isFalse(result.autoOverwriteCanonical);
  });

  it("ignores stale mirrors during normal runtime recovery assessment", function () {
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

    assert.equal(result.status, "ready");
    assert.notInclude(result.allowedActions, "rebuild_mirror_from_canonical");
    assert.notInclude(result.allowedActions, "save_conflict_copy");
    assert.notInclude(result.allowedActions, "recover_from_shards");
    assert.isFalse(result.autoOverwriteCanonical);
  });

  it("marks a mirror degraded when manifest and shard summaries disagree", function () {
    const result = validateMirrorManifestAgainstShards({
      manifest: manifest(),
      shards: [
        {
          library_id: 1,
          mirror_id:
            "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          kind: "topics",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror [1] topics 001/001",
          payload_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encoded_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          payload: "{}",
        },
      ],
    });

    assert.isFalse(result.ok);
    assert.equal(result.state, "degraded");
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "payload_hash_mismatch",
    );
  });

  it("plans local index rebuild without marking canonical assets corrupt", function () {
    const result = assessSynthesisSyncRecovery({
      root: {
        state: "ready",
        canonical_manifest_hash: manifest().manifest_hash,
      },
      mirror: { manifest: manifest(), shards: [] },
      localIndexes: { state: "corrupt" },
      conflicts: [],
    });

    assert.equal(result.status, "index_dirty");
    assert.include(result.allowedActions, "rebuild_local_indexes");
    assert.notInclude(
      result.diagnostics.map((entry) => entry.code),
      "canonical_corrupt",
    );
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
        bundle_hash:
          "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        reason: "base_hash_mismatch",
      },
      {
        id: "new",
        topic_id: "topic-a",
        created_at: "2026-05-10T00:00:00.000Z",
        bundle_hash:
          "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        reason: "base_hash_mismatch",
      },
    ]);
    const actions = buildConflictCandidateActions(candidates[0]);

    assert.deepEqual(
      candidates.map((entry) => entry.id),
      ["new", "old"],
    );
    assert.deepEqual(
      actions.map((entry) => entry.action),
      ["retry_update", "clear_conflict_candidate"],
    );
    assert.isTrue(actions.every((entry) => entry.localOnly));
  });

  it("materializes mirror shard identity fields in manifest entries", function () {
    const result = buildMirrorManifest({
      libraryId: 1,
      anchorKey: "ANCHOR",
      mirrorId:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      updatedAt: "2026-05-10T00:00:00.000Z",
      shards: [
        {
          kind: "topic_current",
          seq: 1,
          total: 1,
          noteKey: "NOTE1",
          title: "ZS Synthesis Mirror topic current",
          payloadHash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encodedHash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          asset_id: "topic:object-detection:current-manifest",
          asset_path: "topics/object-detection/current/manifest.json",
          content_type: "json",
        } as any,
      ],
    });

    assert.equal(
      (result.shards[0] as any).asset_id,
      "topic:object-detection:current-manifest",
    );
    assert.equal(
      (result.shards[0] as any).asset_path,
      "topics/object-detection/current/manifest.json",
    );
    assert.equal((result.shards[0] as any).content_type, "json");
  });

  it("rejects unsafe recovery paths, duplicate asset ids, and asset id/path mismatches", function () {
    const invalidManifest = {
      ...manifest(),
      shards: [
        {
          kind: "topic_current",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror topic current",
          payload_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encoded_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          asset_id: "topic:object-detection:section:claims",
          asset_path: "../outside/current/sections/claims.json",
          content_type: "json",
        },
        {
          kind: "topic_current",
          seq: 2,
          total: 2,
          note_key: "NOTE2",
          title: "ZS Synthesis Mirror topic current 2",
          payload_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encoded_hash:
            "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          asset_id: "topic:object-detection:section:claims",
          asset_path: "topics/object-detection/current/sections/coverage.json",
          content_type: "json",
        },
      ],
    } as any;
    const result = validateMirrorManifestAgainstShards({
      manifest: invalidManifest,
      shards: [
        {
          library_id: 1,
          mirror_id: invalidManifest.mirror_id,
          kind: "topic_current",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror topic current",
          payload_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encoded_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          payload: "{}",
          asset_id: "topic:object-detection:section:claims",
          asset_path: "../outside/current/sections/claims.json",
          content_type: "json",
        } as any,
        {
          library_id: 1,
          mirror_id: invalidManifest.mirror_id,
          kind: "topic_current",
          seq: 2,
          total: 2,
          note_key: "NOTE2",
          title: "ZS Synthesis Mirror topic current 2",
          payload_hash:
            "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          encoded_hash:
            "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          payload: "{}",
          asset_id: "topic:object-detection:section:claims",
          asset_path: "topics/object-detection/current/sections/coverage.json",
          content_type: "json",
        } as any,
      ],
    });

    assert.isFalse(result.ok);
    assert.includeMembers(
      result.diagnostics.map((entry) => entry.code),
      ["unsafe_asset_path", "duplicate_asset_id", "asset_identity_mismatch"],
    );
  });

  it("allows recovery only for documented state files and active topic current assets", function () {
    const graphManifest = {
      ...manifest(),
      shards: [
        {
          kind: "graph",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror graph",
          payload_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encoded_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          asset_id: "state:unified-citation-graph",
          asset_path: "state/unified-citation-graph.json",
          content_type: "json",
        },
      ],
    } as any;
    const result = validateMirrorManifestAgainstShards({
      manifest: graphManifest,
      shards: [
        {
          library_id: 1,
          mirror_id: graphManifest.mirror_id,
          kind: "graph",
          seq: 1,
          total: 1,
          note_key: "NOTE1",
          title: "ZS Synthesis Mirror graph",
          payload_hash:
            "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          encoded_hash:
            "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          payload: "{}",
          asset_id: "state:unified-citation-graph",
          asset_path: "state/unified-citation-graph.json",
          content_type: "json",
        } as any,
      ],
    });

    assert.isFalse(result.ok);
    assert.include(
      result.diagnostics.map((entry) => entry.code),
      "asset_not_recoverable",
    );
  });

  it("rejects ambiguous manifests and requires temporary-directory restore before promote", async function () {
    const module = await import("../../src/modules/synthesis/syncRecovery");

    assert.isFunction((module as any).planCanonicalRecoveryFromMirror);
    const plan = (module as any).planCanonicalRecoveryFromMirror({
      canonicalRoot: { state: "missing" },
      manifests: [
        manifest({
          manifest_hash:
            "sha256:1111111111111111111111111111111111111111111111111111111111111111",
        }),
        manifest({
          manifest_hash:
            "sha256:2222222222222222222222222222222222222222222222222222222222222222",
        }),
      ],
      shards: [],
      confirm: true,
    });

    assert.equal(plan.status, "degraded");
    assert.include(
      plan.diagnostics.map((entry: any) => entry.code),
      "ambiguous_manifest",
    );
    assert.isFalse(plan.executable);
    assert.equal(plan.writeMode, "temporary_then_promote");
  });
});
