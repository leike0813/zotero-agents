import { assert } from "chai";
import fs from "node:fs/promises";
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
  recordSequenceStepRequestCreated,
  recordSequenceStepSucceeded,
} from "../../src/modules/workflowExecution/sequenceStateStore";
import {
  createAcpSkillRunnerWorkspace,
  writeAcpSkillRunnerInputManifest,
} from "../../src/modules/acpSkillRunnerWorkspace";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { mkTempDir } from "./workflow-test-utils";
import { buildRequest as buildLiteratureDigestRequest } from "../../workflows_builtin/literature-workbench-package/literature-analysis/hooks/buildRequest.mjs";

let previousZotero: any;

function sequenceManifest(overrides: Record<string, unknown> = {}) {
  return {
    id: "sequence-workflow",
    label: "Sequence Workflow",
    provider: "acp",
    execution: {
      skillrunner_mode: "auto",
    },
    request: {
      kind: "skillrunner.sequence.v1",
      sequence: {
        steps: [
          { id: "prepare", skill_id: "prepare-skill", workspace: "new" },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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

describe("skillrunner.sequence.v1 runtime", function () {
  beforeEach(function () {
    previousZotero = (globalThis as any).Zotero;
    (globalThis as any).Zotero = {
      ...(previousZotero || {}),
      Prefs: {
        ...(previousZotero?.Prefs || {}),
        get: previousZotero?.Prefs?.get || ((_prefKey: string) => undefined),
        set: previousZotero?.Prefs?.set || (() => undefined),
        clear: previousZotero?.Prefs?.clear || (() => undefined),
      },
    };
    resetPluginStateStoreForTests();
  });

  afterEach(function () {
    if (previousZotero === undefined) {
      delete (globalThis as any).Zotero;
    } else {
      (globalThis as any).Zotero = previousZotero;
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
                { id: "dup", skill_id: "one" },
                { id: "dup", skill_id: "two" },
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
                  workspace: "new",
                  short_circuit: {
                    when: { path: "status", equals: "canceled" },
                    result: "step_output",
                  },
                },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
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
                  workspace: "new",
                  apply_result: {
                    workflow_id: "prepare-workflow",
                    on_failure: "continue",
                  },
                },
                {
                  id: "finalize",
                  skill_id: "finalize-skill",
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
                  short_circuit: {
                    when: { equals: "canceled" },
                    result: "step_output",
                  },
                },
                { id: "finalize", skill_id: "finalize-skill" },
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
          short_circuit: {
            when: { path: "status", equals: "canceled" },
            result: "final_output",
          },
        },
        { id: "finalize", skill_id: "finalize-skill" },
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
            workspace: "new",
          },
          {
            id: "core",
            skill_id: "core-skill",
            workspace: "reuse-workflow",
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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
          jobId: "job-1",
          sequenceStepId: "prepare",
          finalStepId: "finalize",
        },
        {
          workflowId: "sequence-workflow",
          workflowLabel: undefined,
          workflowRunId: "workflow-run-1",
          jobId: "job-1",
          sequenceStepId: "core",
          finalStepId: "finalize",
        },
        {
          workflowId: "sequence-workflow",
          workflowLabel: undefined,
          workflowRunId: "workflow-run-1",
          jobId: "job-1",
          sequenceStepId: "finalize",
          finalStepId: "finalize",
        },
      ],
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
            workspace: "new",
            apply_result: {
              workflow_id: "prepare-workflow",
              on_failure: "continue",
            },
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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
      workflowRunId: "workflow-run-apply",
      jobId: "job-apply",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        events.push(`run:${skillId}`);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
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
            workspace: "new",
            apply_result: {
              workflow_id: "prepare-workflow",
              on_failure: "continue",
            },
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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
      workflowRunId: "workflow-run-apply-failure",
      jobId: "job-apply-failure",
      appendRuntimeLog: () => {},
      executeWithProvider: async ({ request }) => {
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        events.push(`run:${skillId}`);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
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
            workspace: "new",
            short_circuit: {
              when: { path: "status", equals: "canceled" },
              result: "step_output",
            },
          },
          {
            id: "core",
            skill_id: "core-skill",
            workspace: "reuse-workflow",
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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
              workspace: "new",
            },
            {
              id: "finalize",
              skill_id: "finalize-skill",
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
          workspace: "new" as const,
          short_circuit: {
            when: { path: "status", equals: "canceled" },
            result: "step_output" as const,
          },
        },
        {
          id: "core",
          skill_id: "core-skill",
          workspace: "reuse-workflow" as const,
        },
        {
          id: "finalize",
          skill_id: "finalize-skill",
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
            workspace: "new",
          },
          {
            id: "finalize",
            skill_id: "finalize-skill",
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
    assert.deepEqual(launched, ["prepare-skill"]);
    const state = getSequenceRunStateByStepRequest("prepare-skill-request");
    assert.equal(state?.status, "waiting_recovery");
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

  it("compiles sequence steps to SkillRunner jobs with request_id workspace reuse", async function () {
    const launched: Array<{ requestKind: string; request: any }> = [];
    await executeSkillRunnerSequence({
      request: {
        kind: "skillrunner.sequence.v1",
        steps: [
          { id: "digest", skill_id: "literature-analysis", workspace: "new" },
          {
            id: "tag",
            skill_id: "tag-regulator",
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
      executeWithProvider: async ({ requestKind, request }) => {
        launched.push({ requestKind, request });
        const skillId = String((request as { skill_id?: unknown }).skill_id);
        return {
          status: "succeeded",
          requestId: `${skillId}-request`,
          fetchType: "result",
          resultJson: { skillId },
          responseJson: {},
        };
      },
    });

    assert.deepEqual(
      launched.map((entry) => entry.requestKind),
      ["skillrunner.job.v1", "skillrunner.job.v1"],
    );
    assert.equal(launched[0].request.kind, "skillrunner.job.v1");
    assert.notProperty(launched[0].request.runtime_options, "workspace");
    assert.deepEqual(launched[1].request.runtime_options.workspace, {
      mode: "reuse",
      request_id: "literature-analysis-request",
    });
    assert.notProperty(
      launched[1].request.runtime_options,
      "workflow_workspace",
    );
  });
});
