import { assert } from "chai";
import {
  isTerminal,
  isWaiting,
  normalizeStatus,
  normalizeStatusWithGuard,
  validateEventOrder,
  validateTransition,
} from "../../src/modules/skillRunner/run/skillRunnerProviderStateMachine";

describe("skillrunner provider state machine", function () {
  it("normalizes known statuses and degrades unknown status to running", function () {
    assert.equal(normalizeStatus("queued"), "queued");
    assert.equal(normalizeStatus("waiting_user"), "waiting_user");
    assert.equal(normalizeStatus("succeeded"), "succeeded");
    assert.equal(normalizeStatus("UNKNOWN"), "running");
    assert.equal(normalizeStatus("UNKNOWN", "queued"), "queued");
  });

  it("returns unknown-status violation for guarded normalization", function () {
    const normalized = normalizeStatusWithGuard({
      value: "unexpected-status",
      fallback: "running",
      requestId: "req-1",
    });
    assert.equal(normalized.status, "running");
    assert.equal(normalized.violation?.ruleId, "status.unknown");
    assert.equal(normalized.violation?.action, "degraded");
    assert.equal(normalized.violation?.requestId, "req-1");
  });

  it("validates legal and illegal transitions", function () {
    const legal = validateTransition({
      prev: "queued",
      next: "succeeded",
      requestId: "req-2",
    });
    assert.isTrue(legal.ok);
    assert.equal(legal.prevState, "queued");
    assert.equal(legal.nextState, "succeeded");

    const illegal = validateTransition({
      prev: "succeeded",
      next: "running",
      requestId: "req-3",
    });
    assert.isFalse(illegal.ok);
    assert.equal(illegal.violation?.ruleId, "transition.illegal");
    assert.equal(illegal.violation?.action, "degraded");
    assert.equal(illegal.violation?.prevState, "succeeded");
    assert.equal(illegal.violation?.nextState, "running");
  });

  it("validates event-order invariants", function () {
    const deferredViolation = validateEventOrder({
      events: [{ kind: "deferred" }],
      requestId: "req-4",
    });
    assert.lengthOf(deferredViolation, 1);
    assert.equal(
      deferredViolation[0].ruleId,
      "event.deferred_without_request_created",
    );

    const applyViolations = validateEventOrder({
      events: [
        { kind: "request-created" },
        { kind: "deferred" },
        { kind: "waiting" },
        { kind: "waiting-resumed" },
        { kind: "terminal", status: "succeeded" },
        { kind: "apply-succeeded" },
        { kind: "apply-succeeded" },
      ],
      requestId: "req-5",
    });
    assert.lengthOf(applyViolations, 1);
    assert.equal(applyViolations[0].ruleId, "event.apply_multiple_times");

    const applyBeforeTerminal = validateEventOrder({
      events: [{ kind: "apply-succeeded" }],
      requestId: "req-6",
    });
    assert.equal(
      applyBeforeTerminal[0].ruleId,
      "event.apply_without_terminal_success",
    );
  });

  it("classifies waiting and terminal statuses from canonical state", function () {
    assert.isTrue(isWaiting("waiting_user"));
    assert.isTrue(isWaiting("waiting_auth"));
    assert.isFalse(isWaiting("running"));
    assert.isTrue(isTerminal("succeeded"));
    assert.isTrue(isTerminal("failed"));
    assert.isTrue(isTerminal("canceled"));
    assert.isFalse(isTerminal("running"));
    assert.isFalse(isTerminal("waiting_user"));
  });
});
