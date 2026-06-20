import { assert } from "chai";
import fs from "node:fs/promises";
import type { JobRecord } from "../../src/jobQueue/manager";
import { parseWorkflowManifestFromText } from "../../src/workflows/loaderContracts";
import { compileDeclarativeRequest } from "../../src/workflows/declarativeRequestCompiler";
import { assertRequestPayloadContract } from "../../src/providers/requestContracts";
import {
  continueSkillRunnerSequence,
  executeSkillRunnerSequence,
} from "../../src/modules/workflowExecution/sequenceRuntime";
import {
  getSequenceRunState,
  getSequenceRunStateByStepRequest,
  initializeSequenceRunState,
  recordSequenceStepApplyResult,
  recordSequenceStepRequestCreated,
  recordSequenceStepSucceeded,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import {
  createAcpSkillRunnerWorkspace,
  writeAcpSkillRunnerInputManifest,
} from "../../src/modules/acpSkillRunnerWorkspace";
import {
  getAcpSkillRunRecord,
  markAcpSkillRunApplyResult,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { buildWorkflowTaskRecordFromJob } from "../../src/modules/taskRuntime";
import {
  getSkillRunnerRunRecordByRequest,
  upsertSkillRunnerRunFromTask,
} from "../../src/modules/skillRunnerRunStore";
import { continueSkillRunnerForegroundRun } from "../../src/modules/skillRunnerForegroundContinuation";
import { mkTempDir } from "./workflow-test-utils";
import { buildRequest as buildLiteratureDigestRequest } from "../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs";

let previousZotero: any;

function createJsonResponse(payload: unknown, status = 200): Response {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "ERROR",
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as unknown as Response;
}

function sequenceManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: "sequence-workflow",
    label: "Sequence Workflow",
    provider: "acp",
    request: {
      kind: "skillrunner.sequence.v1",
      sequence: {
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
      },
    },
    result: {
      final_step_id: "finalize",
    },
    hooks: {
      applyResult: "hooks/applyResult.js",
    },
    ...overrides,
  };
}

function upsertSkillRunnerSequenceStepRunForTest(args: {
  requestId: string;
  request: unknown;
  workflowId: string;
  workflowRunId: string;
  sequenceRunId: string;
  sequenceJobId: string;
  stepId: string;
  stepIndex: number;
  finalStepId: string;
  skillId: string;
}) {
  const job: JobRecord = {
    id: `${args.sequenceJobId}:${args.stepId}`,
    workflowId: args.workflowId,
    request: args.request,
    meta: {
      runId: args.workflowRunId,
      localRunId: `${args.workflowRunId}:${args.sequenceJobId}:${args.stepId}`,
      workflowRunId: args.workflowRunId,
      workflowLabel: "Sequence Workflow",
      requestId: args.requestId,
      requestKind: "skillrunner.job.v1",
      backendId: "skillrunner-backend",
      backendType: "skillrunner",
      backendBaseUrl: "http://127.0.0.1:8030",
      providerId: "skillrunner",
      taskName: `Sequence Workflow / ${args.stepId}`,
      inputUnitLabel: `Sequence Workflow / ${args.stepId}`,
      skillId: args.skillId,
      sequenceStepId: args.stepId,
      sequenceStepIndex: args.stepIndex,
      sequenceJobId: args.sequenceJobId,
    },
    state: "running",
    createdAt: "2026-04-18T00:00:00.000Z",
    updatedAt: "2026-04-18T00:00:01.000Z",
    result: {
      requestId: args.requestId,
    },
  };
  upsertSkillRunnerRunFromTask(buildWorkflowTaskRecordFromJob(job), {
    role: "sequence_step",
    requestPayload: args.request,
    fetchType: "result",
    apply: {
      state: "idle",
      attempt: 0,
      maxAttempt: 5,
    },
    sequence: {
      sequenceRunId: args.sequenceRunId,
      workflowRunId: args.workflowRunId,
      jobId: args.sequenceJobId,
      stepId: args.stepId,
      stepIndex: args.stepIndex,
      finalStepId: args.finalStepId,
    },
  });
}

describe("skillrunner.sequence.v1 runtime", function () {
  beforeEach(function () {
    previousZotero = (globalThis as any).Zotero;
    if (!previousZotero) {
      Object.defineProperty(globalThis, "Zotero", {
        configurable: true,
        writable: true,
        value: {
          Prefs: {
            get: (_prefKey: string) => undefined,
            set: () => undefined,
            clear: () => undefined,
          },
        },
      });
    }
    resetPluginStateStoreForTests();
    resetAcpSkillRunsForTests();
  });

  it("does not create ACP skill-run rows when applying unknown request ids", function () {
    markAcpSkillRunApplyResult({
      requestId: "skillrunner-request",
      state: "succeeded",
    });

    assert.isNull(getAcpSkillRunRecord("skillrunner-request"));

    upsertAcpSkillRun({
      requestId: "acp-request",
      status: "running",
      backendType: "acp",
    });
    markAcpSkillRunApplyResult({
      requestId: "acp-request",
      state: "succeeded",
    });

    assert.equal(
      getAcpSkillRunRecord("acp-request")?.applyResultState,
      "succeeded",
    );
  });

  afterEach(function () {
    if (
      previousZotero === undefined &&
      Object.getOwnPropertyDescriptor(globalThis, "Zotero")?.configurable
    ) {
      delete (globalThis as any).Zotero;
    }
  });

  it("accepts ACP and SkillRunner sequence manifests and rejects invalid sequence references", function () {
    const accepted = parseWorkflowManifestFromText({
      raw: JSON.stringify(sequenceManifest()),
      manifestPath: "workflow.json",
    });
    assert.equal(accepted.diagnostic, null);
    assert.equal(accepted.manifest?.request?.kind, "skillrunner.sequence.v1");

    const duplicate = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                { id: "dup", skill_id: "one", mode: "auto" },
                { id: "dup", skill_id: "two", mode: "auto" },
              ],
            },
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(duplicate.manifest, null);
    assert.include(duplicate.diagnostic?.reason || "", "duplicated id");

    const nonAcp = parseWorkflowManifestFromText({
      raw: JSON.stringify(sequenceManifest({ provider: "skillrunner" })),
      manifestPath: "workflow.json",
    });
    assert.equal(nonAcp.diagnostic, null);
    assert.equal(nonAcp.manifest?.provider, "skillrunner");
  });

  it("accepts and compiles sequence step short-circuit rules", function () {
    const accepted = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                {
                  id: "prepare",
                  skill_id: "prepare-skill",
                  mode: "auto",
                  workspace: "new",
                  short_circuit: {
                    when: { path: "status", equals: "canceled" },
                    result: "step_output",
                  },
                },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
                  mode: "auto",
                  workspace: "reuse-workflow",
                },
              ],
            },
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(accepted.diagnostic, null);
    assert.isOk(accepted.manifest);

    const request = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {
        items: {
          parents: [{ item: { id: 1 } }],
        },
      },
      manifest: accepted.manifest!,
    }) as any;

    assert.deepEqual(request.steps[0].short_circuit, {
      when: { path: "status", equals: "canceled" },
      result: "step_output",
    });
    assert.doesNotThrow(() =>
      assertRequestPayloadContract({
        requestKind: "skillrunner.sequence.v1",
        request,
      }),
    );
  });

  it("accepts and compiles sequence step apply_result declarations", function () {
    const accepted = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                {
                  id: "prepare",
                  skill_id: "prepare-skill",
                  mode: "auto",
                  workspace: "new",
                  apply_result: {
                    workflow_id: "prepare-workflow",
                    on_failure: "continue",
                  },
                },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
                  mode: "auto",
                  workspace: "reuse-workflow",
                },
              ],
            },
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(accepted.diagnostic, null);

    const request = compileDeclarativeRequest({
      kind: "skillrunner.sequence.v1",
      selectionContext: {
        items: {
          parents: [{ item: { id: 1 } }],
        },
      },
      manifest: accepted.manifest!,
    }) as any;

    assert.deepEqual(request.steps[0].apply_result, {
      workflow_id: "prepare-workflow",
      on_failure: "continue",
    });
    assert.doesNotThrow(() =>
      assertRequestPayloadContract({
        requestKind: "skillrunner.sequence.v1",
        request,
      }),
    );
  });

  it("rejects invalid sequence step short-circuit rules", function () {
    const missingPath = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                {
                  id: "prepare",
                  skill_id: "prepare-skill",
                  mode: "auto",
                  short_circuit: {
                    when: { equals: "canceled" },
                    result: "step_output",
                  },
                },
                { id: "finalize", skill_id: "finalize-skill", mode: "auto" },
              ],
            },
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    const unknownResult = {
      kind: "skillrunner.sequence.v1",
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "auto",
          short_circuit: {
            when: { path: "status", equals: "canceled" },
            result: "final_output",
          },
        },
        { id: "finalize", skill_id: "finalize-skill", mode: "auto" },
      ],
      final_step_id: "finalize",
    };

    assert.equal(missingPath.manifest, null);
    assert.match(missingPath.diagnostic?.reason || "", /short_circuit|path/i);
    assert.throws(
      () =>
        assertRequestPayloadContract({
          requestKind: "skillrunner.sequence.v1",
          request: unknownResult,
        }),
      /short_circuit.*result.*step_output/i,
    );
  });

  it("accepts buildRequest-driven sequence manifests without static steps", function () {
    const accepted = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
          },
          result: {
            fetch: { type: "bundle" },
          },
          hooks: {
            buildRequest: "hooks/buildRequest.js",
            applyResult: "hooks/applyResult.js",
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(accepted.diagnostic, null);
    assert.equal(accepted.manifest?.request?.kind, "skillrunner.sequence.v1");
  });

  it("passes previous handoff by default and applies explicit mapping to downstream input", async function () {
    const launched: Array<{
      request: Record<string, unknown>;
      orchestrationContext: Record<string, unknown>;
    }> = [];
    const result = await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        taskName: "Sequence Task",
        steps: [
          {
            id: "prepare",
            skill_id: "prepare-skill",
            mode: "auto",
            workspace: "new",
          },
          {
            id: "core",
            skill_id: "core-skill",
            mode: "auto",
            workspace: "reuse-workflow",
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
            mode: "auto",
            workspace: "reuse-workflow",
            input: { static_value: "kept" },
            handoff: {
              from_step: "core",
              input: {
                manifest_path: "handoff_manifest_path",
              },
              parameter: {
                operation: "operation",
              },
            },
          },
        ],
        final_step_id: "finalize",
        parameter: { language: "zh-CN" },
      },
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-1",
      jobId: "job-1",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request, orchestrationContext }) => {
        launched.push({
          request: request as Record<string, unknown>,
          orchestrationContext: (orchestrationContext || {}) as Record<
            string,
            unknown
          >,
        });
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson:
            skillId === "finalize-skill"
              ? { kind: "final", ok: true }
              : {
                  kind: "topic_synthesis_handoff",
                  operation: "create",
                  handoff_manifest_path: `${skillId}.handoff.json`,
                },
          responseJson: {},
        };
      },
    });

    assert.equal(result.requestId, "finalize-skill-request");
    assert.deepEqual(
      result.sequence?.steps?.map((entry) => ({
        step_id: entry.step_id,
        request_id: entry.request_id,
        output: entry.output,
      })),
      [
        {
          step_id: "prepare",
          request_id: "prepare-skill-request",
          output: {
            kind: "topic_synthesis_handoff",
            operation: "create",
            handoff_manifest_path: "prepare-skill.handoff.json",
          },
        },
        {
          step_id: "core",
          request_id: "core-skill-request",
          output: {
            kind: "topic_synthesis_handoff",
            operation: "create",
            handoff_manifest_path: "core-skill.handoff.json",
          },
        },
        {
          step_id: "finalize",
          request_id: "finalize-skill-request",
          output: { kind: "final", ok: true },
        },
      ],
    );
    assert.lengthOf(launched, 3);
    assert.deepInclude(
      (launched[1].request.input as Record<string, unknown>).handoff as Record<
        string,
        unknown
      >,
      {
        handoff_manifest_path: "prepare-skill.handoff.json",
      },
    );
    assert.deepInclude(launched[2].request.input as Record<string, unknown>, {
      static_value: "kept",
      manifest_path: "core-skill.handoff.json",
    });
    assert.deepInclude(
      launched[2].request.parameter as Record<string, unknown>,
      {
        language: "zh-CN",
        operation: "create",
      },
    );
    assert.deepEqual(
      (launched[2].request.runtime_options as any).workspace,
      {
        mode: "reuse",
        workflow_run_id: "workflow-run-1",
      },
    );
    assert.notProperty(
      launched[2].request.runtime_options as Record<string, unknown>,
      "workflow_workspace",
    );
    assert.notProperty(
      launched[2].request.parameter as Record<string, unknown>,
      "workflowId",
    );
    assert.deepEqual(
      launched.map((entry) => entry.orchestrationContext),
      [
        {
          workflowId: "sequence-workflow",
          workflowLabel: undefined,
          workflowRunId: "workflow-run-1",
          jobId: "job-1:prepare",
          sequenceStepId: "prepare",
          sequenceStepIndex: 0,
          skillId: "prepare-skill",
          finalStepId: "finalize",
        },
        {
          workflowId: "sequence-workflow",
          workflowLabel: undefined,
          workflowRunId: "workflow-run-1",
          jobId: "job-1:core",
          sequenceStepId: "core",
          sequenceStepIndex: 1,
          skillId: "core-skill",
          finalStepId: "finalize",
        },
        {
          workflowId: "sequence-workflow",
          workflowLabel: undefined,
          workflowRunId: "workflow-run-1",
          jobId: "job-1:finalize",
          sequenceStepId: "finalize",
          sequenceStepIndex: 2,
          skillId: "finalize-skill",
          finalStepId: "finalize",
        },
      ],
    );
  });

  it("does not inject handoff when pass_through is false without explicit mapping", async function () {
    const launched: Array<Record<string, unknown>> = [];
    await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        taskName: "No Handoff Passthrough",
        steps: [
          {
            id: "first",
            skill_id: "first-skill",
            mode: "auto",
            workspace: "new",
          },
          {
            id: "second",
            skill_id: "second-skill",
            mode: "auto",
            workspace: "reuse-workflow",
            input: {},
            handoff: {
              pass_through: false,
              required: false,
            },
          },
        ],
        final_step_id: "second",
      },
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-1",
      jobId: "job-1",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        launched.push(request as Record<string, unknown>);
        return {
          status: "succeeded",
          requestId: `${String((request as any).skill_id)}-request`,
          fetchType: "result",
          resultJson: { ok: true, from: String((request as any).skill_id) },
          responseJson: {},
        };
      },
    });

    assert.lengthOf(launched, 2);
    assert.notProperty(
      ((launched[1].input || {}) as Record<string, unknown>),
      "handoff",
    );
  });

  it("applies opt-in steps before launching downstream steps", async function () {
    const events: string[] = [];
    const result = await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        targetParentID: 42,
        steps: [
          {
            id: "prepare",
            skill_id: "prepare-skill",
            mode: "auto",
            workspace: "new",
            apply_result: {
              workflow_id: "prepare-workflow",
              on_failure: "continue",
            },
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
            mode: "auto",
            workspace: "reuse-workflow",
          },
        ],
        final_step_id: "finalize",
      },
      backend: {
        id: "skillrunner-backend",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-apply",
      jobId: "job-apply",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request, orchestrationContext }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        const requestId = `${skillId}-request`;
        events.push(`run:${skillId}`);
        upsertSkillRunnerSequenceStepRunForTest({
          requestId,
          request,
          workflowId: "sequence-workflow",
          workflowRunId: "workflow-run-apply",
          sequenceRunId: "workflow-run-apply",
          sequenceJobId: "job-apply",
          stepId: String(orchestrationContext?.sequenceStepId || ""),
          stepIndex: Number(orchestrationContext?.sequenceStepIndex || 0),
          finalStepId: "finalize",
          skillId,
        });
        return {
          status: "succeeded",
          requestId,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
      applySequenceStepResult: async (args) => {
        events.push(`apply:${args.applyWorkflowId}:${args.step.id}`);
        assert.equal(args.stepRequest.targetParentID, 42);
        return { applied: args.step.id };
      },
    });

    assert.deepEqual(events, [
      "run:prepare-skill",
      "apply:prepare-workflow:prepare",
      "run:finalize-skill",
    ]);
    assert.equal(
      result.sequence?.steps?.[0]?.apply_result?.status,
      "succeeded",
    );
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-backend",
        requestId: "prepare-skill-request",
      })?.apply.state,
      "succeeded",
    );
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-backend",
        requestId: "finalize-skill-request",
      })?.apply.state,
      "skipped",
    );
  });

  it("records non-blocking step apply failures and continues downstream", async function () {
    const events: string[] = [];
    const result = await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "prepare",
            skill_id: "prepare-skill",
            mode: "auto",
            workspace: "new",
            apply_result: {
              workflow_id: "prepare-workflow",
              on_failure: "continue",
            },
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
            mode: "auto",
            workspace: "reuse-workflow",
          },
        ],
        final_step_id: "finalize",
      },
      backend: {
        id: "skillrunner-backend",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-apply-failure",
      jobId: "job-apply-failure",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request, orchestrationContext }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        const requestId = `${skillId}-request`;
        events.push(`run:${skillId}`);
        upsertSkillRunnerSequenceStepRunForTest({
          requestId,
          request,
          workflowId: "sequence-workflow",
          workflowRunId: "workflow-run-apply-failure",
          sequenceRunId: "workflow-run-apply-failure",
          sequenceJobId: "job-apply-failure",
          stepId: String(orchestrationContext?.sequenceStepId || ""),
          stepIndex: Number(orchestrationContext?.sequenceStepIndex || 0),
          finalStepId: "finalize",
          skillId,
        });
        return {
          status: "succeeded",
          requestId,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
      applySequenceStepResult: async () => {
        events.push("apply:failed");
        throw new Error("apply broke");
      },
    });

    assert.deepEqual(events, [
      "run:prepare-skill",
      "apply:failed",
      "run:finalize-skill",
    ]);
    assert.equal(result.status, "succeeded");
    assert.equal(result.sequence?.steps?.[0]?.apply_result?.status, "failed");
    assert.include(
      String(result.sequence?.steps?.[0]?.apply_result?.error || ""),
      "apply broke",
    );
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-backend",
        requestId: "prepare-skill-request",
      })?.apply.state,
      "failed",
    );
    assert.equal(
      getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-backend",
        requestId: "finalize-skill-request",
      })?.apply.state,
      "skipped",
    );
  });

  it("marks the final request root apply skipped when foreground continuation sees final step apply_result", async function () {
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" },
    };
    const sequenceRunId = "workflow-run-root-skip";
    const finalRequestId = "final-request";
    const finalStepRequest = {
      kind: "skillrunner.job.v1",
      skill_id: "final-skill",
      runtime_options: { execution_mode: "auto" },
      fetch_type: "result",
    };
    initializeSequenceRunState({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "final",
            skill_id: "final-skill",
            mode: "auto",
            apply_result: { workflow_id: "final-workflow" },
          },
        ],
        final_step_id: "final",
      },
      backend,
      workflowId: "sequence-workflow",
      workflowRunId: sequenceRunId,
      jobId: "job-root-skip",
    });
    recordSequenceStepRequestCreated({
      sequenceRunId,
      stepIndex: 0,
      requestId: finalRequestId,
    });
    recordSequenceStepApplyResult({
      sequenceRunId,
      stepIndex: 0,
      workflowId: "final-workflow",
      status: "succeeded",
      result: { applied: true },
    });
    upsertSkillRunnerSequenceStepRunForTest({
      requestId: finalRequestId,
      request: finalStepRequest,
      workflowId: "sequence-workflow",
      workflowRunId: sequenceRunId,
      sequenceRunId,
      sequenceJobId: "job-root-skip",
      stepId: "final",
      stepIndex: 0,
      finalStepId: "final",
      skillId: "final-skill",
    });

    const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = (async (url: unknown) => {
      const target = String(url);
      if (target.endsWith(`/v1/jobs/${finalRequestId}`)) {
        return createJsonResponse({
          request_id: finalRequestId,
          status: "succeeded",
        });
      }
      if (target.endsWith(`/v1/jobs/${finalRequestId}/result`)) {
        return createJsonResponse({
          request_id: finalRequestId,
          result: { done: true },
        });
      }
      return createJsonResponse({ error: "not found" }, 404);
    }) as typeof fetch;
    try {
      const outcome = await continueSkillRunnerForegroundRun({
        backend,
        requestId: finalRequestId,
        source: "test.foreground-root-skip",
      });

      assert.equal(outcome.status, "succeeded");
      assert.equal(
        getSkillRunnerRunRecordByRequest({
          backendId: "skillrunner-backend",
          requestId: finalRequestId,
        })?.apply.state,
        "skipped",
      );
      assert.equal(getSequenceRunState(sequenceRunId)?.status, "completed");
    } finally {
      (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
    }
  });

  it("short-circuits downstream steps when a successful step output matches the rule", async function () {
    const launched: string[] = [];
    const canceledOutput = {
      kind: "topic_synthesis_canceled",
      status: "canceled",
      reason: "duplicate_topic",
    };
    const result = await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        taskName: "Sequence Task",
        steps: [
          {
            id: "prepare",
            skill_id: "prepare-skill",
            mode: "auto",
            workspace: "new",
            short_circuit: {
              when: { path: "status", equals: "canceled" },
              result: "step_output",
            },
          },
          {
            id: "core",
            skill_id: "core-skill",
            mode: "auto",
            workspace: "reuse-workflow",
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
            mode: "auto",
            workspace: "reuse-workflow",
          },
        ],
        final_step_id: "finalize",
      },
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-short-circuit",
      jobId: "job-short-circuit",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        launched.push(skillId);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: canceledOutput,
          responseJson: {},
        };
      },
    });

    assert.deepEqual(launched, ["prepare-skill"]);
    assert.equal(result.status, "succeeded");
    assert.equal(result.requestId, "prepare-skill-request");
    assert.deepEqual(result.resultJson, canceledOutput);
    assert.deepInclude(result.sequence || {}, {
      short_circuited: true,
      short_circuit_step_id: "prepare",
      declared_final_step_id: "finalize",
      final_step_id: "finalize",
    });
    assert.deepEqual(
      result.sequence?.steps?.map((entry) => entry.step_id),
      ["prepare"],
    );
    assert.equal(
      getSequenceRunState("workflow-run-short-circuit")?.status,
      "completed",
    );
  });

  it("stops before downstream steps when an upstream step is canceled", async function () {
    const launched: string[] = [];
    try {
      await executeSkillRunnerSequence({
        request: {
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
        },
        backend: {
          id: "acp-backend",
          type: "acp",
          baseUrl: "local://acp",
          auth: { kind: "none" },
        },
        providerOptions: {},
        workflowId: "sequence-workflow",
        workflowRunId: "workflow-run-canceled",
        jobId: "job-canceled",
        appendRuntimeLog: () => {},
        executeWithProvider: async ({ request }) => {
          const skillId = String((request as { skill_id?: unknown }).skill_id);
          launched.push(skillId);
          return {
            status: "canceled",
            requestId: `${skillId}-request`,
            fetchType: "result",
            responseJson: {
              status: "canceled",
            },
          };
        },
      });
      assert.fail("expected canceled upstream step to stop sequence");
    } catch (error) {
      assert.include(String(error), "step 'prepare' did not succeed");
    }

    assert.deepEqual(launched, ["prepare-skill"]);
  });

  it("fails successful step handoff when provider omits canonical resultJson", async function () {
    try {
      await executeSkillRunnerSequence({
        request: {
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
        },
        backend: {
          id: "skillrunner-backend",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8000",
          auth: { kind: "none" },
        },
        providerOptions: {},
        workflowId: "sequence-workflow",
        workflowRunId: "workflow-run-missing-result-json",
        jobId: "job-missing-result-json",
        appendRuntimeLog: () => {},
        executeWithProvider: async ({ request }) => {
          const skillId = String((request as { skill_id?: unknown }).skill_id);
          return {
            status: "succeeded",
            requestId: `${skillId}-request`,
            fetchType: "result",
            responseJson: {
              result: { status: "success", data: { stale: true } },
            },
          };
        },
      });
      assert.fail("expected missing canonical resultJson to fail sequence");
    } catch (error) {
      assert.include(String(error), "did not expose resultJson");
    }
  });

  it("short-circuits recovered non-final steps before launching downstream continuation", async function () {
    const canceledOutput = {
      kind: "topic_synthesis_canceled",
      status: "canceled",
      reason: "missing_topic",
    };
    const request = {
      kind: "skillrunner.sequence.v1" as const,
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "auto",
          workspace: "new" as const,
          short_circuit: {
            when: { path: "status", equals: "canceled" },
            result: "step_output" as const,
          },
        },
        {
          id: "core",
          skill_id: "core-skill",
          mode: "auto",
          workspace: "reuse-workflow" as const,
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
          mode: "auto",
          workspace: "reuse-workflow" as const,
        },
      ],
      final_step_id: "finalize",
    };
    const backend = {
      id: "acp-backend",
      type: "acp",
      baseUrl: "local://acp",
      auth: { kind: "none" as const },
    };
    initializeSequenceRunState({
      request,
      backend,
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-recovered-short-circuit",
      jobId: "job-recovered-short-circuit",
    });
    recordSequenceStepRequestCreated({
      sequenceRunId: "workflow-run-recovered-short-circuit",
      stepIndex: 0,
      requestId: "prepare-request",
    });
    recordSequenceStepSucceeded({
      sequenceRunId: "workflow-run-recovered-short-circuit",
      stepIndex: 0,
      requestId: "prepare-request",
      output: canceledOutput,
      result: {
        status: "succeeded",
        requestId: "prepare-request",
        fetchType: "result",
        resultJson: canceledOutput,
        responseJson: { provider: "acp", recovered: true },
      },
    });

    const result = await continueSkillRunnerSequence({
      sequenceRunId: "workflow-run-recovered-short-circuit",
      startIndex: 1,
      backend,
      providerOptions: {},
      appendRuntimeLog: () => {},
      executeWithProvider: async () => {
        assert.fail("downstream continuation should not launch");
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.requestId, "prepare-request");
    assert.deepEqual(result.resultJson, canceledOutput);
    assert.deepInclude(result.sequence || {}, {
      short_circuited: true,
      short_circuit_step_id: "prepare",
      declared_final_step_id: "finalize",
      final_step_id: "finalize",
    });
    assert.equal(
      getSequenceRunState("workflow-run-recovered-short-circuit")?.status,
      "completed",
    );
  });

  it("parks sequence state when a middle step is deferred", async function () {
    const launched: string[] = [];
    const result = await executeSkillRunnerSequence({
      request: {
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
      },
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: { mode: "test" },
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-deferred",
      jobId: "job-deferred",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request, onProgress }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        launched.push(skillId);
        onProgress?.({
          type: "request-created",
          requestId: `${skillId}-request`,
        });
        return {
          status: "deferred",
          requestId: `${skillId}-request`,
          fetchType: "result",
          backendStatus: "running",
          responseJson: {},
        };
      },
    });

    assert.equal(result.status, "deferred");
    assert.equal(result.requestId, "prepare-skill-request");
    assert.deepInclude((result.responseJson as any)?.sequence || {}, {
      workflow_run_id: "workflow-run-deferred",
      final_step_id: "finalize",
      pending_step_id: "prepare",
      pending_step_index: 0,
      pending_step_job_id: "job-deferred:prepare",
    });
    assert.deepEqual((result.responseJson as any)?.sequence?.steps, []);
    assert.deepEqual(launched, ["prepare-skill"]);
    const state = getSequenceRunStateByStepRequest("prepare-skill-request");
    assert.equal(state?.status, "waiting_interaction");
    assert.equal(state?.rootRequestId, "prepare-skill-request");
    assert.equal(state?.steps[0].status, "deferred");
    assert.equal(state?.steps[1].requestId, undefined);
    assert.deepEqual(state?.providerOptions, { mode: "test" });
  });

  it("builds literature-analysis one-step and auto-tag two-step sequence requests", async function () {
    const tempRoot = await mkTempDir(
      "zotero-skills-literature-analysis-sequence",
    );
    const parentItem = {
      id: 42,
      key: "PARENT42",
      itemType: "journalArticle",
      libraryID: 1,
      getCreators: () => [{ firstName: "Ada", lastName: "Lovelace" }],
      getField: (field: string) => (field === "title" ? "Sequence Paper" : ""),
      getTags: () => [{ tag: "legacy:tag" }],
    };
    const runtime = {
      hostApiVersion: 5,
      helpers: {
        resolveItemRef: () => parentItem,
        getAttachmentFilePath: (entry: any) => String(entry.filePath || ""),
      },
      hostApi: {
        synthesis: {
          exportTagVocabularyForRegulator: async () => [
            { tag: "topic:sequence" },
          ],
        },
        file: {
          getTempDirectoryPath: () => tempRoot,
        },
        logging: {},
      },
    };
    const selectionContext = {
      items: {
        attachments: [
          {
            filePath: "D:/papers/sequence.md",
            parent: { id: 42 },
          },
        ],
      },
    };

    const digestOnly = (await buildLiteratureDigestRequest({
      selectionContext,
      executionOptions: {
        workflowParams: {
          language: "en-US",
          auto_tag_regulator: false,
        },
      },
      runtime,
    })) as any;
    assert.equal(digestOnly.kind, "skillrunner.sequence.v1");
    assert.equal(digestOnly.final_step_id, "digest");
    assert.lengthOf(digestOnly.steps, 1);
    assert.equal(
      digestOnly.steps[0].input.source_path,
      "D:/papers/sequence.md",
    );
    assert.equal(digestOnly.steps[0].parameter.language, "en-US");

    const withTag = (await buildLiteratureDigestRequest({
      selectionContext,
      executionOptions: {
        workflowParams: {
          language: "fr-FR",
          auto_tag_regulator: true,
          auto_tag_infer_tag: false,
        },
      },
      runtime,
    })) as any;
    assert.equal(withTag.final_step_id, "tag-regulator");
    assert.lengthOf(withTag.steps, 2);
    const tagStep = withTag.steps[1];
    assert.equal(tagStep.workspace, "reuse-workflow");
    assert.equal(tagStep.parameter.infer_tag, false);
    assert.equal(tagStep.parameter.tag_note_language, "fr-FR");
    assert.match(
      String(tagStep.input.valid_tags || ""),
      /valid_tags-parent-42/,
    );
    assert.deepEqual(tagStep.handoff, {
      from_step: "digest",
      required: true,
      pass_through: false,
      input: {
        digest_markdown: "digest_path",
      },
    });
  });

  it("reuses ACP workflow workspace while preserving independent request ids", async function () {
    const root = await mkTempDir("zotero-skills-sequence-workspace");
    const first = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "prepare-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "new",
        workflowRunId: "workflow-run-2",
      },
    });
    const second = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "core-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "reuse",
        workflowRunId: "workflow-run-2",
      },
    });
    const third = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "core-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "reuse",
        workflowRunId: "workflow-run-2",
      },
    });

    assert.notEqual(first.requestId, second.requestId);
    assert.notEqual(second.requestId, third.requestId);
    assert.equal(first.workspaceDir, second.workspaceDir);
    assert.equal(second.workspaceDir, third.workspaceDir);
    assert.match(
      first.resultJsonPath.replace(/\\/g, "/"),
      /\/result\/prepare-skill\.1\/result\.json$/,
    );
    assert.match(
      first.inputManifestPath.replace(/\\/g, "/"),
      /\/\.audit\/prepare-skill\.1\/input_manifest\.json$/,
    );
    assert.match(
      second.resultJsonPath.replace(/\\/g, "/"),
      /\/result\/core-skill\.1\/result\.json$/,
    );
    assert.match(
      third.resultJsonPath.replace(/\\/g, "/"),
      /\/result\/core-skill\.2\/result\.json$/,
    );
    assert.notEqual(first.inputManifestPath, second.inputManifestPath);
    assert.notEqual(second.inputManifestPath, third.inputManifestPath);

    await writeAcpSkillRunnerInputManifest({
      workspace: first,
      request: { skill_id: "prepare-skill", marker: "first" },
    });
    await writeAcpSkillRunnerInputManifest({
      workspace: second,
      request: { skill_id: "core-skill", marker: "second" },
    });
    await writeAcpSkillRunnerInputManifest({
      workspace: third,
      request: { skill_id: "core-skill", marker: "third" },
    });
    assert.include(await fs.readFile(first.inputManifestPath, "utf8"), "first");
    assert.include(await fs.readFile(second.inputManifestPath, "utf8"), "second");
    assert.include(await fs.readFile(third.inputManifestPath, "utf8"), "third");

    try {
      await createAcpSkillRunnerWorkspace({
        backendId: "acp-backend",
        skillId: "missing-skill",
        rootDir: root,
        workflowWorkspace: {
          mode: "reuse",
          workflowRunId: "missing-workflow-run",
        },
      });
      assert.fail("expected missing workflow workspace reuse to fail");
    } catch (error) {
      assert.include(String(error), "reuse target not found");
    }
  });

  it("compiles SkillRunner sequence steps with request_id reuse and step identity", async function () {
    const launched: Array<{
      requestKind: string;
      request: any;
      orchestrationContext: any;
    }> = [];
    const progressEvents: any[] = [];
    const result = await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "digest",
            skill_id: "literature-analysis",
            mode: "auto",
            workspace: "new",
          },
          {
            id: "tag",
            skill_id: "tag-regulator",
            mode: "auto",
            workspace: "reuse-workflow",
          },
        ],
        final_step_id: "tag",
      },
      backend: {
        id: "skillrunner-backend",
        type: "skillrunner",
        baseUrl: "http://127.0.0.1:8030",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-skillrunner",
      jobId: "job-skillrunner",
      appendRuntimeLog: () => {},
      applySequenceStepResult: async () => {
        assert.fail("sequence steps without apply_result should not apply");
      },
      onProgress: (event) => {
        progressEvents.push(event);
      },
      executeWithProvider: async ({
        requestKind,
        request,
        orchestrationContext,
        onProgress,
      }) => {
        launched.push({ requestKind, request, orchestrationContext });
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        onProgress?.({
          type: "request-created",
          requestId: `${skillId}-request`,
        });
        onProgress?.({
          type: "request-ready",
          requestId: `${skillId}-request`,
        });
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
    });

    assert.equal(result.status, "succeeded");
    assert.equal(result.requestId, "tag-regulator-request");
    assert.deepEqual(
      launched.map((entry) => entry.requestKind),
      ["skillrunner.job.v1", "skillrunner.job.v1"],
    );
    assert.equal(launched[0].request.kind, "skillrunner.job.v1");
    assert.notProperty(launched[0].request.runtime_options, "workspace");
    assert.equal(launched[1].request.kind, "skillrunner.job.v1");
    assert.deepEqual(launched[1].request.runtime_options.workspace, {
      mode: "reuse",
      request_id: "literature-analysis-request",
    });
    assert.notProperty(
      launched[1].request.runtime_options,
      "workflow_workspace",
    );
    assert.deepEqual(
      launched.map((entry) => entry.orchestrationContext.jobId),
      ["job-skillrunner:digest", "job-skillrunner:tag"],
    );
    assert.deepEqual(
      launched.map((entry) => entry.orchestrationContext.skillId),
      ["literature-analysis", "tag-regulator"],
    );
    assert.deepEqual(
      progressEvents
        .filter((entry) => entry.type === "request-ready")
        .map((entry) => ({
          requestId: entry.requestId,
          sequenceStepId: entry.sequenceStepId,
          sequenceStepSkillId: entry.sequenceStepSkillId,
          hasStepRequest: !!entry.sequenceStepRequest,
        })),
      [
        {
          requestId: "literature-analysis-request",
          sequenceStepId: "digest",
          sequenceStepSkillId: "literature-analysis",
          hasStepRequest: true,
        },
        {
          requestId: "tag-regulator-request",
          sequenceStepId: "tag",
          sequenceStepSkillId: "tag-regulator",
          hasStepRequest: true,
        },
      ],
    );
  });
});
