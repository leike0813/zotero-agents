import { assert } from "chai";
import { parseWorkflowManifestFromText } from "../../src/workflows/loaderContracts";
import { executeSkillRunnerSequence } from "../../src/modules/workflowExecution/sequenceRuntime";
import { getSequenceRunStateByStepRequest } from "../../src/modules/workflowExecution/sequenceStateStore";
import { createAcpSkillRunnerWorkspace } from "../../src/modules/acpSkillRunnerWorkspace";
import { resetPluginStateStoreForTests } from "../../src/modules/pluginStateStore";
import { mkTempDir } from "./workflow-test-utils";
import { buildRequest as buildLiteratureDigestRequest } from "../../workflows_builtin/literature-workbench-package/literature-digest/hooks/buildRequest.mjs";

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
    resetPluginStateStoreForTests();
  });

  it("accepts ACP sequence manifests and rejects invalid sequence references", function () {
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
    assert.equal(nonAcp.manifest, null);
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
      (launched[2].request.runtime_options as any).workflow_workspace,
      {
        mode: "reuse",
        workflow_run_id: "workflow-run-1",
      },
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

  it("builds literature-digest one-step and auto-tag two-step sequence requests", async function () {
    const tempRoot = await mkTempDir(
      "zotero-skills-literature-digest-sequence",
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
      rootDir: root,
      workflowWorkspace: {
        mode: "new",
        workflowRunId: "workflow-run-2",
      },
    });
    const second = await createAcpSkillRunnerWorkspace({
      backendId: "acp-backend",
      rootDir: root,
      workflowWorkspace: {
        mode: "reuse",
        workflowRunId: "workflow-run-2",
      },
    });

    assert.notEqual(first.requestId, second.requestId);
    assert.equal(first.workspaceDir, second.workspaceDir);

    try {
      await createAcpSkillRunnerWorkspace({
        backendId: "acp-backend",
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

  it("fails closed when executing sequence on a non-ACP backend", async function () {
    try {
      await executeSkillRunnerSequence({
        request: {
          kind: "skillrunner.sequence.v1",
          steps: [{ id: "digest", skill_id: "literature-digest" }],
          final_step_id: "digest",
        },
        backend: {
          id: "skillrunner-backend",
          type: "skillrunner",
          baseUrl: "http://127.0.0.1:8030",
          auth: { kind: "none" },
        },
        providerOptions: {},
        workflowId: "sequence-workflow",
        workflowRunId: "workflow-run-non-acp",
        jobId: "job-non-acp",
        appendRuntimeLog: () => {},
        executeWithProvider: async () => {
          throw new Error("should not launch");
        },
      });
      assert.fail("expected non-ACP sequence execution to fail");
    } catch (error) {
      assert.include(String(error), "only supported on ACP");
    }
  });
});
