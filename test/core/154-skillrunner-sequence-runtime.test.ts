import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
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
  registerAcpWorkflowWorkspaceForReuse,
  resetAcpWorkflowWorkspaceRegistryForTests,
  writeAcpSkillRunnerInputManifest,
} from "../../src/modules/acpSkillRunnerWorkspace";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acpSkillSchemaAssets";
import { joinPath, normalizeNativeLocalPath } from "../../src/utils/path";
import {
  getAcpSkillRunRecord,
  markAcpSkillRunApplyResult,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import {
  listPluginRunStoreEntries,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
import { buildWorkflowTaskRecordFromJob } from "../../src/modules/taskRuntime";
import {
  attachSkillRunnerRequestId,
  createSkillRunnerRun,
  getSkillRunnerRunRecordByRequest,
  updateSkillRunnerRunStateByRunKey,
} from "../../src/modules/skillRunnerRunStore";
import {
  buildSkillRunnerForegroundContinuationStepJobForTests,
  continueSkillRunnerForegroundRun,
} from "../../src/modules/skillRunnerForegroundContinuation";
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
  skillName?: string;
  providerOptions?: Record<string, unknown>;
  engine?: string;
  inputUnitIdentity?: string;
  targetParentID?: number;
  executionMode?: "auto" | "interactive" | string;
}) {
  const requestPayload =
    args.request &&
    typeof args.request === "object" &&
    !Array.isArray(args.request)
      ? {
          ...(args.request as Record<string, unknown>),
          ...(args.inputUnitIdentity
            ? { inputUnitIdentity: args.inputUnitIdentity }
            : {}),
          ...(typeof args.targetParentID === "number"
            ? { targetParentID: args.targetParentID }
            : {}),
        }
      : args.request;
  const job: JobRecord = {
    id: `${args.sequenceJobId}:${args.stepId}`,
    workflowId: args.workflowId,
    request: requestPayload,
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
      providerOptions: args.providerOptions,
      engine: args.engine,
      executionMode: args.executionMode,
      taskName: `Sequence Workflow / ${args.stepId}`,
      inputUnitIdentity: args.inputUnitIdentity,
      inputUnitLabel: `Sequence Workflow / ${args.stepId}`,
      targetParentID: args.targetParentID,
      skillId: args.skillId,
      skillName: args.skillName,
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
  const run = createSkillRunnerRun({
    backendId: "skillrunner-backend",
    workflowId: args.workflowId,
    workflowRunId: args.workflowRunId,
    jobId: job.id,
    taskName: `Sequence Workflow / ${args.stepId}`,
    skillId: args.skillId,
    sequenceRunId: args.sequenceRunId,
    sequenceJobId: args.sequenceJobId,
    sequenceStepId: args.stepId,
    requestPayload,
    fetchType: "result",
    executionMode:
      args.executionMode === "interactive" ? "interactive" : "auto",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
  if (!run) {
    return;
  }
  const attached =
    attachSkillRunnerRequestId({
      runKey: run.runKey,
      requestId: args.requestId,
      updatedAt: job.updatedAt,
    }) || run;
  updateSkillRunnerRunStateByRunKey({
    runKey: attached.runKey,
    state: "request_ready",
    backendStatus: "running",
    updatedAt: job.updatedAt,
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

  it("emits prepared skill display metadata for initial sequence steps", async function () {
    const events: Array<Record<string, unknown>> = [];
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner" as const,
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" as const },
    };

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
      backend,
      providerOptions: {},
      skillDisplayById: {
        "prepare-skill": {
          skillId: "prepare-skill",
          skillName: "Prepare Skill",
        },
        "finalize-skill": {
          skillId: "finalize-skill",
          skillName: "Finalize Skill",
        },
      },
      workflowId: "sequence-workflow",
      workflowLabel: "Sequence Workflow",
      workflowRunId: "workflow-run-skill-display",
      jobId: "job-skill-display",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
      onProgress: (event) => {
        events.push(event as Record<string, unknown>);
      },
    });

    assert.deepEqual(
      events
        .filter((event) => event.type === "sequence-step-started")
        .map((event) => ({
          stepId: event.sequenceStepId,
          skillId: event.sequenceStepSkillId,
          skillName: event.sequenceStepSkillName,
        })),
      [
        {
          stepId: "prepare",
          skillId: "prepare-skill",
          skillName: "Prepare Skill",
        },
        {
          stepId: "finalize",
          skillId: "finalize-skill",
          skillName: "Finalize Skill",
        },
      ],
    );
  });

  it("emits persisted skill display metadata for continuation steps", async function () {
    const events: Array<Record<string, unknown>> = [];
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner" as const,
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" as const },
    };
    initializeSequenceRunState({
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
      backend,
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowLabel: "Sequence Workflow",
      workflowRunId: "workflow-run-continuation-skill-display",
      jobId: "job-continuation-skill-display",
      skillDisplayById: {
        "prepare-skill": {
          skillId: "prepare-skill",
          skillName: "Prepare Skill",
          skillLabel: "Prepare Skill Label",
        },
        "finalize-skill": {
          skillId: "finalize-skill",
          skillName: "Finalize Skill",
          skillLabel: "Finalize Skill Label",
        },
      },
    });
    recordSequenceStepSucceeded({
      sequenceRunId: "workflow-run-continuation-skill-display",
      stepIndex: 0,
      requestId: "prepare-request",
      output: { ok: true },
      result: {
        status: "succeeded",
        requestId: "prepare-request",
        fetchType: "result",
        resultJson: { ok: true },
        responseJson: {},
      },
    });

    await continueSkillRunnerSequence({
      sequenceRunId: "workflow-run-continuation-skill-display",
      startIndex: 1,
      backend,
      providerOptions: {},
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
      onProgress: (event) => {
        events.push(event as Record<string, unknown>);
      },
    });

    assert.deepInclude(
      events.find((event) => event.type === "sequence-step-started") || {},
      {
        sequenceStepId: "finalize",
        sequenceStepSkillId: "finalize-skill",
        sequenceStepSkillName: "Finalize Skill",
      },
    );
    assert.equal(
      getSequenceRunState("workflow-run-continuation-skill-display")?.steps[1]
        ?.skillName,
      "Finalize Skill",
    );
    const storedFinalizeStep = getSequenceRunState(
      "workflow-run-continuation-skill-display",
    )?.steps[1] as Record<string, unknown> | undefined;
    assert.isOk(storedFinalizeStep);
    assert.notProperty(storedFinalizeStep!, "skillLabel");
    const sequenceEntry = listPluginRunStoreEntries("skillrunner").find(
      (entry) =>
        entry.runKey === "sequence:workflow-run-continuation-skill-display",
    );
    assert.notInclude(sequenceEntry?.payload || "", "Skill Label");
  });

  it("builds foreground continuation steps with the full submission context", function () {
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner" as const,
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" as const },
    };
    const providerOptions = {
      engine: "context-engine",
      model: "context-model",
      effort: "low",
    };
    const sequenceRunId = "workflow-run-foreground-context";
    const sequenceJobId = "job-foreground-context";
    const sequenceRequest = {
      kind: "skillrunner.sequence.v1" as const,
      targetParentID: 42,
      taskName: "Sequence Task",
      runtime_options: {
        collect_skill_run_feedback: true,
      },
      steps: [
        {
          id: "prepare",
          skill_id: "prepare-skill",
          mode: "interactive",
          workspace: "new" as const,
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

    initializeSequenceRunState({
      request: sequenceRequest,
      backend,
      providerOptions,
      workflowId: "sequence-workflow",
      workflowLabel: "Sequence Workflow",
      workflowRunId: sequenceRunId,
      jobId: sequenceJobId,
      skillDisplayById: {
        "prepare-skill": {
          skillId: "prepare-skill",
          skillName: "Prepare Skill",
        },
        "finalize-skill": {
          skillId: "finalize-skill",
          skillName: "Finalize Skill",
        },
      },
    });
    recordSequenceStepRequestCreated({
      sequenceRunId,
      stepIndex: 0,
      requestId: "prepare-request",
    });
    upsertSkillRunnerSequenceStepRunForTest({
      requestId: "prepare-request",
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "prepare-skill",
        runtime_options: {
          execution_mode: "interactive",
        },
        fetch_type: "result",
      },
      workflowId: "sequence-workflow",
      workflowRunId: sequenceRunId,
      sequenceRunId,
      sequenceJobId,
      stepId: "prepare",
      stepIndex: 0,
      finalStepId: "finalize",
      skillId: "prepare-skill",
      skillName: "Prepare Skill",
      providerOptions,
      engine: "context-engine",
      inputUnitIdentity: "zotero:item:42",
      targetParentID: 42,
      executionMode: "interactive",
    });

    const record = getSkillRunnerRunRecordByRequest({
      backendId: backend.id,
      requestId: "prepare-request",
    });
    const sequenceState = getSequenceRunState(sequenceRunId);
    assert.isOk(record);
    assert.isOk(sequenceState);

    const finalizeRequest = {
      kind: "skillrunner.job.v1" as const,
      skill_id: "finalize-skill",
      targetParentID: 42,
      taskName: "Sequence Task / finalize",
      runtime_options: {
        collect_skill_run_feedback: true,
        execution_mode: "auto",
        workspace: {
          mode: "reuse" as const,
          request_id: "prepare-request",
        },
      },
      fetch_type: "result" as const,
    };
    const job = buildSkillRunnerForegroundContinuationStepJobForTests({
      record: record!,
      sequenceState: sequenceState!,
      backend,
      event: {
        type: "request-created",
        requestId: "finalize-request",
        sequenceStepId: "finalize",
        sequenceStepIndex: 1,
        sequenceStepSkillId: "finalize-skill",
        sequenceStepSkillName: "Finalize Skill",
        sequenceStepTaskName: "Sequence Task / finalize",
        sequenceStepRequest: finalizeRequest,
        workflowRunId: sequenceRunId,
        sequenceJobId,
      },
    });
    assert.isOk(job);

    assert.equal(job!.meta.runId, sequenceRunId);
    assert.deepEqual(job!.meta.providerOptions, providerOptions);
    assert.equal(job!.meta.engine, "context-engine");
    assert.equal(job!.meta.executionMode, "auto");
    assert.equal(job!.meta.inputUnitIdentity, "zotero:item:42");
    assert.equal(job!.meta.targetParentID, 42);
    assert.equal(job!.meta.skillName, "Finalize Skill");

    const task = buildWorkflowTaskRecordFromJob(job!);
    assert.equal(task.engine, "context-engine");
    assert.equal(task.inputUnitIdentity, "zotero:item:42");
    assert.equal(task.skillName, "Finalize Skill");

    const createdFinalizeRun = createSkillRunnerRun({
      backendId: backend.id,
      workflowId: job!.workflowId,
      workflowRunId: sequenceRunId,
      jobId: job!.id,
      taskName: String(job!.meta.taskName || job!.id),
      skillId: String(job!.meta.skillId || ""),
      sequenceRunId,
      sequenceJobId,
      sequenceStepId: "finalize",
      requestPayload: job!.request,
      fetchType: "result",
      executionMode: "auto",
      createdAt: job!.createdAt,
      updatedAt: job!.updatedAt,
    });
    const runRecord = createdFinalizeRun
      ? attachSkillRunnerRequestId({
          runKey: createdFinalizeRun.runKey,
          requestId: "finalize-request",
          updatedAt: job!.updatedAt,
        }) || createdFinalizeRun
      : null;

    assert.equal(runRecord?.executionMode, "auto");
    assert.equal((runRecord?.requestPayload as any)?.targetParentID, 42);
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

    const legacyHandoff = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                { id: "prepare", skill_id: "one", mode: "auto" },
                {
                  id: "finalize",
                  skill_id: "two",
                  mode: "auto",
                  handoff: {
                    input: { digest_markdown: "digest_path" },
                  },
                },
              ],
            },
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(legacyHandoff.manifest, null);
    assert.include(legacyHandoff.diagnostic?.reason || "", "bindings");
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

  it("validates buildRequest-driven sequence candidate steps when declared", function () {
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
                  include_if: {
                    kind: "parameter",
                    parameter: "run_prepare",
                    equals: true,
                  },
                },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
                  mode: "auto",
                  include_if: {
                    kind: "runtime",
                    condition: "prepare_output_available",
                  },
                  handoff: {
                    bindings: [
                      {
                        kind: "value",
                        step: "prepare",
                        source: "result_path",
                        target: "/input/result_path",
                      },
                    ],
                  },
                },
              ],
            },
          },
          result: {
            final_step_id: "finalize",
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
    assert.equal(
      accepted.manifest?.request?.sequence?.steps?.[0].include_if?.kind,
      "parameter",
    );
    assert.equal(
      accepted.manifest?.request?.sequence?.steps?.[1].include_if?.kind,
      "runtime",
    );

    const invalidFinal = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          result: {
            final_step_id: "missing",
          },
          hooks: {
            buildRequest: "hooks/buildRequest.js",
            applyResult: "hooks/applyResult.js",
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(invalidFinal.manifest, null);
    assert.include(
      invalidFinal.diagnostic?.reason || "",
      "final_step_id must match",
    );

    const invalidHandoff = parseWorkflowManifestFromText({
      raw: JSON.stringify(
        sequenceManifest({
          request: {
            kind: "skillrunner.sequence.v1",
            sequence: {
              steps: [
                { id: "prepare", skill_id: "prepare-skill", mode: "auto" },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
                  mode: "auto",
                  handoff: {
                    bindings: [
                      {
                        kind: "value",
                        step: "missing",
                        target: "/input/value",
                      },
                    ],
                  },
                },
              ],
            },
          },
          hooks: {
            buildRequest: "hooks/buildRequest.js",
            applyResult: "hooks/applyResult.js",
          },
        }),
      ),
      manifestPath: "workflow.json",
    });
    assert.equal(invalidHandoff.manifest, null);
    assert.include(invalidHandoff.diagnostic?.reason || "", "handoff");
  });

  it("declares candidate steps for dynamic literature sequence workflows", async function () {
    const literatureAnalysis = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "workflows_builtin",
          "literature-workbench-package",
          "literature-analysis",
          "workflow.json",
        ),
        "utf8",
      ),
    );
    const deepReading = JSON.parse(
      await fs.readFile(
        path.join(
          process.cwd(),
          "workflows_builtin",
          "literature-workbench-package",
          "literature-deep-reading",
          "workflow.json",
        ),
        "utf8",
      ),
    );

    assert.deepEqual(
      literatureAnalysis.request.sequence.steps.map(
        (step: { id: string }) => step.id,
      ),
      ["digest", "tag-regulator"],
    );
    assert.deepEqual(literatureAnalysis.request.sequence.steps[1].include_if, {
      kind: "parameter",
      parameter: "auto_tag_regulator",
      equals: true,
    });
    assert.deepEqual(
      deepReading.request.sequence.steps.map((step: { id: string }) => step.id),
      ["translate", "deep_reading"],
    );
    assert.deepEqual(deepReading.request.sequence.steps[0].include_if, {
      kind: "runtime",
      condition: "translator_alignment_missing",
    });
  });

  it("applies explicit value bindings to downstream input and parameter", async function () {
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
            handoff: {
              bindings: [
                {
                  kind: "value",
                  target: "/input/handoff",
                },
              ],
            },
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
            mode: "auto",
            workspace: "reuse-workflow",
            input: { static_value: "kept" },
            handoff: {
              bindings: [
                {
                  kind: "value",
                  step: "core",
                  source: "handoff_manifest_path",
                  target: "/input/manifest_path",
                },
                {
                  kind: "value",
                  step: "core",
                  source: "operation",
                  target: "/parameter/operation",
                },
              ],
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
    assert.deepEqual((launched[2].request.runtime_options as any).workspace, {
      mode: "reuse",
      workflow_run_id: "workflow-run-1",
    });
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

  it("does not inject handoff when no explicit bindings are declared", async function () {
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
      (launched[1].input || {}) as Record<string, unknown>,
      "handoff",
    );
  });

  it("materializes file handoff for ACP as native local input path", async function () {
    const tempRoot = await mkTempDir("zotero-skills-acp-file-handoff");
    const digestPath = joinPath(tempRoot, "digest.md");
    await fs.writeFile(digestPath, "# Digest\n", "utf8");
    const launched: Array<Record<string, unknown>> = [];

    await executeSkillRunnerSequence({
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
            handoff: {
              bindings: [
                {
                  kind: "file",
                  step: "digest",
                  source: "digest_path",
                  target: "/input/digest_markdown",
                },
              ],
            },
          },
        ],
        final_step_id: "tag",
      },
      backend: {
        id: "acp-backend",
        type: "acp",
        baseUrl: "local://acp",
        auth: { kind: "none" },
      },
      providerOptions: {},
      workflowId: "sequence-workflow",
      workflowRunId: "workflow-run-acp-file-handoff",
      jobId: "job-acp-file-handoff",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        launched.push(request as Record<string, unknown>);
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson:
            skillId === "literature-analysis"
              ? { digest_path: digestPath.replace(/\\/g, "/") }
              : { ok: true },
          responseJson: {},
        };
      },
    });

    assert.equal(
      (launched[1].input as Record<string, unknown>).digest_markdown,
      normalizeNativeLocalPath(digestPath.replace(/\\/g, "/")),
    );
    assert.notProperty(launched[1], "upload_files");

    const runnerJson = JSON.parse(
      await fs.readFile(
        "skills_builtin/tag-regulator/assets/runner.json",
        "utf8",
      ),
    );
    const validation = await validateAcpSkillRunRequestAgainstSchemas({
      request: launched[1] as any,
      runnerJson,
      skillDir: "skills_builtin/tag-regulator",
      workspaceDir: tempRoot,
    });
    assert.isTrue(validation.ok, validation.errors.join("\n"));
  });

  it("materializes reused SkillRunner file handoff as workspace file binding", async function () {
    const launched: Array<Record<string, unknown>> = [];

    await executeSkillRunnerSequence({
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
            handoff: {
              bindings: [
                {
                  kind: "file",
                  step: "digest",
                  source: "digest_path",
                  target: "/input/digest_markdown",
                },
              ],
            },
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
      workflowRunId: "workflow-run-skillrunner-file-handoff",
      jobId: "job-skillrunner-file-handoff",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        launched.push(request as Record<string, unknown>);
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson:
            skillId === "literature-analysis"
              ? { digest_path: "uploads/digest.md" }
              : { ok: true },
          responseJson: {},
        };
      },
    });

    assert.equal(
      (launched[1].input as Record<string, unknown>).digest_markdown,
      "inputs/digest_markdown/digest.md",
    );
    assert.notProperty(launched[1], "upload_files");
    assert.deepEqual((launched[1].runtime_options as any).workspace, {
      mode: "reuse",
      request_id: "literature-analysis-request",
      file_bindings: [
        {
          input_key: "digest_markdown",
          source_request_id: "literature-analysis-request",
          source_path: "uploads/digest.md",
          target_path: "inputs/digest_markdown/digest.md",
        },
      ],
    });
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

  for (const backendType of ["skillrunner", "acp"] as const) {
    it(`stops ${backendType} sequence before downstream steps when required step apply fails`, async function () {
      const launched: string[] = [];
      const sequenceRunId = `workflow-run-${backendType}-step-apply-fail`;
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
            final_step_id: "finalize",
          },
          backend: {
            id: `${backendType}-backend`,
            type: backendType,
            baseUrl:
              backendType === "skillrunner"
                ? "http://127.0.0.1:8030"
                : "local://acp",
            auth: { kind: "none" },
          },
          workflowId: "sequence-workflow",
          workflowRunId: sequenceRunId,
          jobId: `job-${backendType}-step-apply-fail`,
          appendRuntimeLog: () => {},
          executeWithProvider: async ({ request }) => {
            const skillId = String(
              (request as { skill_id?: unknown }).skill_id,
            );
            launched.push(skillId);
            return {
              status: "succeeded",
              requestId: `${skillId}-request`,
              fetchType: "result",
              resultJson: { skillId },
              responseJson: {},
            };
          },
          applySequenceStepResult: async () => {
            throw new Error("apply broke");
          },
        });
        assert.fail("expected required step apply failure to stop sequence");
      } catch (error) {
        assert.include(String(error), "apply broke");
      }

      assert.deepEqual(launched, ["prepare-skill"]);
      assert.equal(getSequenceRunState(sequenceRunId)?.status, "failed");
    });
  }

  it("marks the active sequence step failed when provider dispatch throws", async function () {
    const launched: string[] = [];
    const events: string[] = [];
    const sequenceRunId = "workflow-run-provider-throws";

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
              id: "tag",
              skill_id: "tag-regulator",
              mode: "auto",
              workspace: "reuse-workflow",
              handoff: {
                bindings: [
                  {
                    kind: "file",
                    step: "prepare",
                    source: "digest_path",
                    target: "/input/digest_markdown",
                  },
                ],
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
          id: "acp-backend",
          type: "acp",
          baseUrl: "local://acp",
          auth: { kind: "none" },
        },
        workflowId: "sequence-workflow",
        workflowRunId: sequenceRunId,
        jobId: "job-provider-throws",
        appendRuntimeLog: () => {},
        onProgress: (event) => {
          if (event.type === "sequence-step-failed") {
            events.push(
              `${event.sequenceStepId}:${event.requestId || ""}:${event.error || ""}`,
            );
          }
        },
        executeWithProvider: async ({ request, onProgress }) => {
          const skillId = String((request as { skill_id?: unknown }).skill_id);
          launched.push(skillId);
          if (skillId === "tag-regulator") {
            onProgress?.({
              type: "request-created",
              requestId: "tag-request",
            });
            throw new Error("schema validation failed");
          }
          return {
            status: "succeeded",
            requestId: "prepare-request",
            fetchType: "result",
            resultJson: { digest_path: "D:/workspace/digest.md" },
            responseJson: {},
          };
        },
      });
      assert.fail("expected provider dispatch failure to stop sequence");
    } catch (error) {
      assert.include(String(error), "schema validation failed");
    }

    assert.deepEqual(launched, ["prepare-skill", "tag-regulator"]);
    assert.deepEqual(events, ["tag:tag-request:schema validation failed"]);
    const state = getSequenceRunState(sequenceRunId);
    assert.equal(state?.status, "failed");
    assert.equal(state?.error, "schema validation failed");
    assert.equal(state?.steps[1]?.status, "failed");
    assert.equal(state?.steps[1]?.requestId, "tag-request");
    assert.equal(state?.steps[1]?.error, "schema validation failed");
    assert.isUndefined(state?.steps[2]?.status);
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

  it("keeps sequence state active when foreground continuation hits a recoverable observer failure", async function () {
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner",
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" },
    };
    const sequenceRunId = "workflow-run-foreground-detached";
    const requestId = "detached-step-request";
    initializeSequenceRunState({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          {
            id: "final",
            skill_id: "final-skill",
            mode: "auto",
          },
        ],
        final_step_id: "final",
      },
      backend,
      workflowId: "sequence-workflow",
      workflowRunId: sequenceRunId,
      jobId: "job-foreground-detached",
    });
    recordSequenceStepRequestCreated({
      sequenceRunId,
      stepIndex: 0,
      requestId,
    });
    upsertSkillRunnerSequenceStepRunForTest({
      requestId,
      request: {
        kind: "skillrunner.job.v1",
        skill_id: "final-skill",
        runtime_options: { execution_mode: "auto" },
        fetch_type: "result",
      },
      workflowId: "sequence-workflow",
      workflowRunId: sequenceRunId,
      sequenceRunId,
      sequenceJobId: "job-foreground-detached",
      stepId: "final",
      stepIndex: 0,
      finalStepId: "final",
      skillId: "final-skill",
    });

    const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch;
    (globalThis as { fetch?: typeof fetch }).fetch = (async () => {
      throw new Error("network offline");
    }) as typeof fetch;
    try {
      const outcome = await continueSkillRunnerForegroundRun({
        backend,
        requestId,
        source: "test.sequence-observer-failure",
      });

      const stored = getSkillRunnerRunRecordByRequest({
        backendId: "skillrunner-backend",
        requestId,
      });
      const state = getSequenceRunState(sequenceRunId);
      assert.equal(outcome.status, "waiting");
      assert.equal(outcome.result.detachReason, "observer_failure");
      assert.equal(stored?.status, "running");
      assert.equal(stored?.observerState, "detached");
      assert.equal(state?.status, "running_step");
      assert.equal(state?.steps[0]?.status, "running");
      assert.isUndefined(state?.steps[0]?.error);
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

  it("does not persist sequence step bundle bytes in run state", function () {
    const request = {
      kind: "skillrunner.sequence.v1" as const,
      steps: [
        {
          id: "deep_reading",
          skill_id: "literature-deep-reading",
          mode: "auto" as const,
          workspace: "new" as const,
          fetch_type: "bundle" as const,
        },
      ],
      final_step_id: "deep_reading",
    };
    const backend = {
      id: "skillrunner-backend",
      type: "skillrunner" as const,
      baseUrl: "http://127.0.0.1:8030",
      auth: { kind: "none" as const },
    };

    initializeSequenceRunState({
      request,
      backend,
      providerOptions: {},
      workflowId: "literature-deep-reading",
      workflowRunId: "workflow-run-large-bundle",
      jobId: "job-large-bundle",
    });
    recordSequenceStepSucceeded({
      sequenceRunId: "workflow-run-large-bundle",
      stepIndex: 0,
      requestId: "bundle-request",
      output: { html_path: "result/deep-reading.html" },
      result: {
        status: "succeeded",
        requestId: "bundle-request",
        fetchType: "bundle",
        bundleBytes: new Uint8Array([1, 2, 3, 4, 5]),
        bundleDir: "C:/tmp/extracted-bundle",
        resultJson: { html_path: "result/deep-reading.html" },
        resultJsonPath: "result/literature-deep-reading.1/result.json",
        workspaceDir: "/remote/workspace",
        resultArtifactBasePath: "result/literature-deep-reading.1",
        responseJson: { request_id: "bundle-request", status: "succeeded" },
      },
    });

    const state = getSequenceRunState("workflow-run-large-bundle");
    const persistedResult = state?.steps[0]?.result as
      | Record<string, unknown>
      | undefined;
    assert.equal(persistedResult?.status, "succeeded");
    assert.equal(persistedResult?.fetchType, "bundle");
    assert.notProperty(persistedResult || {}, "bundleBytes");
    assert.notProperty(persistedResult || {}, "bundleDir");
    assert.deepEqual(persistedResult?.resultJson, {
      html_path: "result/deep-reading.html",
    });

    const entry = listPluginRunStoreEntries("skillrunner").find(
      (candidate) => candidate.runKey === "sequence:workflow-run-large-bundle",
    );
    assert.isOk(entry);
    assert.notInclude(entry!.payload, "bundleBytes");
    assert.notInclude(entry!.payload, "bundleDir");
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
      bindings: [
        {
          kind: "file",
          step: "digest",
          source: "digest_path",
          target: "/input/digest_markdown",
          required: true,
        },
      ],
    });

    const emptyVocabularyRuntime = {
      ...runtime,
      hostApi: {
        ...runtime.hostApi,
        synthesis: {
          exportTagVocabularyForRegulator: async () => [],
        },
      },
    };
    const withPureInferenceTag = (await buildLiteratureDigestRequest({
      selectionContext,
      executionOptions: {
        workflowParams: {
          language: "fr-FR",
          auto_tag_regulator: true,
        },
      },
      runtime: emptyVocabularyRuntime,
    })) as any;
    const pureInferenceTagStep = withPureInferenceTag.steps[1];
    assert.equal(withPureInferenceTag.final_step_id, "tag-regulator");
    assert.notProperty(pureInferenceTagStep.input, "valid_tags");
    assert.equal(pureInferenceTagStep.parameter.tag_note_language, "fr-FR");
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
    assert.include(
      await fs.readFile(second.inputManifestPath, "utf8"),
      "second",
    );
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

  it("restores ACP workflow workspace reuse from existing runner namespaces", async function () {
    const root = await mkTempDir("zotero-skills-sequence-workspace-restore");
    const first = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "prepare-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "new",
        workflowRunId: "workflow-run-restore",
      },
    });
    await fs.mkdir(path.join(first.workspaceDir, "result", "core-skill.2"), {
      recursive: true,
    });
    await fs.mkdir(path.join(first.workspaceDir, ".audit", "prepare-skill.1"), {
      recursive: true,
    });

    resetAcpWorkflowWorkspaceRegistryForTests();
    await registerAcpWorkflowWorkspaceForReuse({
      workflowRunId: "workflow-run-restore",
      workspaceDir: first.workspaceDir,
    });

    const nextCore = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "core-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "reuse",
        workflowRunId: "workflow-run-restore",
      },
    });
    const nextPrepare = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      skillId: "prepare-skill",
      rootDir: root,
      workflowWorkspace: {
        mode: "reuse",
        workflowRunId: "workflow-run-restore",
      },
    });

    assert.equal(nextCore.workspaceDir, first.workspaceDir);
    assert.equal(nextPrepare.workspaceDir, first.workspaceDir);
    assert.match(
      nextCore.resultJsonPath.replace(/\\/g, "/"),
      /\/result\/core-skill\.3\/result\.json$/,
    );
    assert.match(
      nextPrepare.inputManifestPath.replace(/\\/g, "/"),
      /\/\.audit\/prepare-skill\.2\/input_manifest\.json$/,
    );
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
