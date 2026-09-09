import { assert } from "chai";
import type { BackendInstance } from "../../src/backends/types";
import type {
  ProviderExecutionResult,
  SkillRunnerSequenceRequestV1,
} from "../../src/providers/contracts";
import {
  applySequenceRunEvent,
  getSequenceRunState,
  initializeSequenceRunState,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";

const backend: BackendInstance = {
  id: "reducer-backend",
  type: "acp",
  baseUrl: "local://acp",
  auth: { kind: "none" },
};

function sequenceRequest(
  overrides: Partial<SkillRunnerSequenceRequestV1> = {},
): SkillRunnerSequenceRequestV1 {
  return {
    kind: "skillrunner.sequence.v1",
    steps: [
      {
        id: "prepare",
        skill_id: "prepare-skill",
        mode: "auto",
        workspace: "new",
      },
      {
        id: "finalize",
        skill_id: "finalize-skill",
        mode: "auto",
        workspace: "reuse-workflow",
      },
    ],
    final_step_id: "finalize",
    ...overrides,
  };
}

function succeededResult(
  requestId: string,
  output: unknown = { ok: true },
): ProviderExecutionResult {
  return {
    status: "succeeded",
    requestId,
    fetchType: "result",
    resultJson: output,
    responseJson: { provider: "acp" },
  };
}

function initialize(overrides: Partial<SkillRunnerSequenceRequestV1> = {}) {
  resetPluginStateStoreForTests();
  const state = initializeSequenceRunState({
    request: sequenceRequest(overrides),
    backend,
    workflowId: "reducer-workflow",
    workflowRunId: "run-reducer",
    jobId: "job-reducer",
  });
  assert.isOk(state);
  return state;
}

describe("sequence state reducer", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
  });

  it("derives step started state from a fact event", function () {
    initialize();
    const state = applySequenceRunEvent({
      type: "sequence.step.started",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
    });
    assert.equal(state?.status, "running_step");
    assert.equal(state?.steps[0]?.status, "running");
    assert.isUndefined(state?.error);
  });

  it("records request identity once and throws on conflict", function () {
    initialize();
    applySequenceRunEvent({
      type: "sequence.step.request_created",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
    });
    const state = getSequenceRunState("run-reducer");
    assert.equal(state?.rootRequestId, "prepare-request");
    assert.equal(state?.steps[0]?.requestId, "prepare-request");

    assert.throws(
      () =>
        applySequenceRunEvent({
          type: "sequence.step.request_created",
          sequenceRunId: "run-reducer",
          stepIndex: 0,
          requestId: "other-request",
        }),
      /request identity conflict/,
    );
  });

  it("stores a non-final success without completing the run", function () {
    initialize();
    const state = applySequenceRunEvent({
      type: "sequence.step.succeeded",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
      output: { draft: true },
      result: succeededResult("prepare-request", { draft: true }),
    });
    assert.equal(state?.status, "running_step");
    assert.equal(state?.steps[0]?.status, "succeeded");
    assert.equal(state?.steps[0]?.output?.draft, true);
    assert.isUndefined(state?.terminalStepId);
  });

  it("derives completed and terminal step id for the declared final step", function () {
    initialize();
    applySequenceRunEvent({
      type: "sequence.step.request_created",
      sequenceRunId: "run-reducer",
      stepIndex: 1,
      requestId: "finalize-request",
    });
    const state = applySequenceRunEvent({
      type: "sequence.step.succeeded",
      sequenceRunId: "run-reducer",
      stepIndex: 1,
      requestId: "finalize-request",
      output: { done: true },
      result: succeededResult("finalize-request", { done: true }),
    });
    assert.equal(state?.status, "completed");
    assert.equal(state?.terminalStepId, "finalize");
  });

  it("derives short-circuit completion from the step short_circuit rule", function () {
    initialize({
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "auto",
          workspace: "new",
          short_circuit: {
            result: "step_output",
            when: { path: "status", equals: "short_circuit" },
          },
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
          mode: "auto",
          workspace: "reuse-workflow",
        },
      ],
    });
    const state = applySequenceRunEvent({
      type: "sequence.step.succeeded",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
      output: { status: "short_circuit" },
      result: succeededResult("prepare-request", { status: "short_circuit" }),
    });
    assert.equal(state?.status, "completed");
    assert.equal(state?.terminalStepId, "prepare");
  });

  it("derives waiting interaction and deferred step state", function () {
    initialize();
    const state = applySequenceRunEvent({
      type: "sequence.step.waiting",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
      result: {
        status: "deferred",
        requestId: "prepare-request",
        fetchType: "result",
        backendStatus: "waiting_user",
        responseJson: { provider: "acp" },
      },
    });
    assert.equal(state?.status, "waiting_interaction");
    assert.equal(state?.steps[0]?.status, "deferred");
    assert.equal(state?.rootRequestId, "prepare-request");
  });

  it("derives run terminal from a provider step terminal fact", function () {
    initialize();
    const state = applySequenceRunEvent({
      type: "sequence.step.terminal",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
      status: "failed",
      error: "provider failed",
    });
    assert.equal(state?.status, "failed");
    assert.equal(state?.steps[0]?.status, "failed");
    assert.equal(state?.error, "provider failed");
  });

  it("derives run failure when apply_result fails under fail_sequence", function () {
    initialize({
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "auto",
          workspace: "new",
          apply_result: {
            workflow_id: "prepare-workflow",
            on_failure: "fail_sequence",
          },
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
          mode: "auto",
          workspace: "reuse-workflow",
        },
      ],
    });
    const state = applySequenceRunEvent({
      type: "sequence.step.apply_result",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      workflowId: "prepare-workflow",
      status: "failed",
      error: "apply failed",
    });
    assert.equal(state?.status, "failed");
    assert.equal(state?.error, "apply failed");
    assert.equal(state?.steps[0]?.applyResult?.status, "failed");
  });

  it("lets fail_sequence apply failure override early completed state", function () {
    initialize({
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "auto",
          workspace: "new",
          short_circuit: {
            result: "step_output",
            when: { path: "status", equals: "short_circuit" },
          },
          apply_result: {
            workflow_id: "prepare-workflow",
            on_failure: "fail_sequence",
          },
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
          mode: "auto",
          workspace: "reuse-workflow",
        },
      ],
    });
    const completed = applySequenceRunEvent({
      type: "sequence.step.succeeded",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      requestId: "prepare-request",
      output: { status: "short_circuit" },
      result: succeededResult("prepare-request", {
        status: "short_circuit",
      }),
    });
    assert.equal(completed?.status, "completed");

    const state = applySequenceRunEvent({
      type: "sequence.step.apply_result",
      sequenceRunId: "run-reducer",
      stepIndex: 0,
      workflowId: "prepare-workflow",
      status: "failed",
      error: "apply failed after short circuit",
    });
    assert.equal(state?.status, "failed");
    assert.equal(state?.error, "apply failed after short circuit");
  });

  it("keeps run terminal idempotent", function () {
    initialize();
    applySequenceRunEvent({
      type: "sequence.run.terminal",
      sequenceRunId: "run-reducer",
      status: "failed",
      error: "first failure",
    });
    const state = applySequenceRunEvent({
      type: "sequence.run.terminal",
      sequenceRunId: "run-reducer",
      status: "canceled",
      error: "later cancel",
    });
    assert.equal(state?.status, "failed");
    assert.equal(state?.error, "first failure");
  });

  it("moves a non-terminal run to continuing", function () {
    initialize();
    const state = applySequenceRunEvent({
      type: "sequence.run.continuing",
      sequenceRunId: "run-reducer",
    });
    assert.equal(state?.status, "continuing");
    assert.isUndefined(state?.error);
  });
});
