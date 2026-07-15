import { assert } from "chai";
import {
  assessSynthesisSyncRecovery,
  buildConflictCandidateActions,
  normalizeConflictCandidates,
  planStartupSyncCheck,
} from "../../src/modules/synthesis/syncRecovery";

describe("Synthesis sync recovery", function () {
  it("reports a missing canonical root without mirror recovery actions", function () {
    const result = assessSynthesisSyncRecovery({
      root: { state: "missing" },
      localIndexes: { state: "healthy" },
      conflicts: [],
    });

    assert.equal(result.status, "missing_root");
    assert.deepEqual(result.allowedActions, ["rebind_root"]);
    assert.isFalse(result.requiresConfirmation);
    assert.isFalse(result.autoOverwriteCanonical);
    assert.notProperty(result, "mirrorValidation");
  });

  it("plans local index rebuild without marking canonical assets corrupt", function () {
    const result = assessSynthesisSyncRecovery({
      root: { state: "ready" },
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
        localIndexes: { state: "healthy" },
        conflicts: [],
      },
    });

    assert.equal(result.status, "check_skipped");
    assert.deepEqual(result.allowedActions, []);
    assert.notProperty(result, "mirrorValidation");
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

  it("does not export mirror validators or shard recovery planners", async function () {
    const module = await import("../../src/modules/synthesis/syncRecovery");

    assert.notProperty(module, "validateMirrorManifestAgainstShards");
    assert.notProperty(module, "planCanonicalRecoveryFromMirror");
  });
});
