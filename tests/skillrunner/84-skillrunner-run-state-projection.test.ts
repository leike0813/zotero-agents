import { assert } from "chai";
import { projectSkillRunnerRunState } from "../../src/modules/skillRunner/run/skillRunnerRunStateProjection";

describe("skillrunner run state projection", function () {
  it("keeps explicit waiting status from jobs as first-class waiting state", function () {
    const projected = projectSkillRunnerRunState({
      runStatus: "waiting_user",
      pending: null,
      fallback: "running",
      requestId: "req-proj-1",
    });
    assert.equal(projected.status, "waiting_user");
    assert.equal(projected.shouldClearPending, false);
    assert.equal(projected.derivedFromPendingOwner, false);
  });

  it("promotes running to waiting by pending_owner semantics", function () {
    const projected = projectSkillRunnerRunState({
      runStatus: "running",
      pending: {
        pending_owner: "waiting_auth.challenge_active",
      },
      fallback: "running",
      requestId: "req-proj-2",
    });
    assert.equal(projected.status, "waiting_auth");
    assert.equal(projected.waitingOwner, "waiting_auth");
    assert.equal(projected.shouldClearPending, false);
    assert.equal(projected.derivedFromPendingOwner, true);
  });

  it("keeps terminal state and clears pending view regardless of pending payload", function () {
    const projected = projectSkillRunnerRunState({
      runStatus: "failed",
      pending: {
        pending_owner: "waiting_user",
      },
      fallback: "running",
      requestId: "req-proj-3",
    });
    assert.equal(projected.status, "failed");
    assert.equal(projected.shouldClearPending, true);
  });

  it("falls back to last known status when backend is unavailable or status is unknown", function () {
    const projected = projectSkillRunnerRunState({
      runStatus: "not-a-known-status",
      pending: null,
      fallback: "waiting_user",
      requestId: "req-proj-4",
    });
    assert.equal(projected.status, "waiting_user");
    assert.equal(projected.shouldClearPending, false);
    assert.equal(projected.derivedFromPendingOwner, false);
  });
});
