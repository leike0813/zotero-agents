import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import { scanPluginSkillRegistry } from "../../src/modules/workflow/catalog/pluginSkillRegistry";
import { buildAcpSkillResourceManifest } from "../../src/modules/acp/skillRun/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acp/skillRun/acpSkillOutputValidator";
import { lockSelection } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import {
  decideSynthesisApply,
  validateSynthesisResultBundle,
} from "../../packages/synthesis-application/src/topicApplyDecision";
import { createWorkflowSynthesisHostApi } from "../../src/modules/synthesisClient/workflowHostClient";
import { createNativeSynthesisClientComposition } from "../../src/modules/synthesisClient/nativeComposition";

function validSkillOutputBundle() {
  return v2CompleteBundle();
}

function canceledSkillOutputBundle() {
  return {
    __SKILL_DONE__: true,
    kind: "topic_synthesis_canceled",
    status: "canceled",
    reason: "user_cancelled_duplicate_topic",
    message: "User canceled after duplicate topic confirmation.",
    duplicate_topic_id: "detr-detection-transformer",
    topic_seed: "DETR",
  };
}

function topicSourceSelection() {
  const parentRef = { libraryId: 1, key: "PARENT08" };
  return lockSelection([
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACHMD" },
      itemType: "attachment",
      parentRef,
      title: "conditional-detr.md",
      filename: "conditional-detr.md",
      contentType: "text/markdown",
      createdAt: "2026-01-01T00:00:00Z",
      fileState: "available",
    },
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACHPDF" },
      itemType: "attachment",
      parentRef,
      title: "conditional-detr.pdf",
      filename: "conditional-detr.pdf",
      contentType: "application/pdf",
      createdAt: "2026-01-02T00:00:00Z",
      fileState: "available",
    },
  ]);
}

function plannedTopicSnapshot() {
  return {
    topic_id: "planned-detr",
    lifecycle: "planned",
    topic_definition: {
      id: "planned-detr",
      title: "Planned DETR",
      definition: "Query-based object detectors.",
      aliases: ["DETR family"],
      scope_include: ["object detection"],
      scope_exclude: ["language modeling"],
    },
    topic_resolver: {
      paper_refs: ["1:DETR", "1:DINO"],
      combine: "union",
    },
    planning: {
      lifecycle: "planned",
      revision: 2,
    },
  };
}

function topicContextResult(semantic: unknown = plannedTopicSnapshot()) {
  return {
    schema_id: "synthesis.topic_context",
    schema_version: "2.0.0",
    topic_id: "planned-detr",
    view: "semantic",
    ...(semantic ? { semantic } : {}),
  };
}

async function collectWorkflowJsonFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectWorkflowJsonFiles(fullPath)));
    } else if (entry.isFile() && entry.name === "workflow.json") {
      files.push(fullPath);
    }
  }
  return files;
}

let pluginSkillRegistryPromise:
  | Promise<Awaited<ReturnType<typeof scanPluginSkillRegistry>>>
  | undefined;

function getPluginSkillRegistry() {
  pluginSkillRegistryPromise ||= scanPluginSkillRegistry({
    cwd: process.cwd(),
  });
  return pluginSkillRegistryPromise;
}

describe("Synthesize topic workflow contract", function () {
  this.timeout(10_000);

  it("does not ship built-in workflow manifests with execution.supportedBackends", async function () {
    const workflowFiles = await collectWorkflowJsonFiles("workflows_builtin");
    assert.isAtLeast(workflowFiles.length, 1);
    for (const workflowFile of workflowFiles) {
      const workflow = JSON.parse(await fs.readFile(workflowFile, "utf8"));
      assert.notProperty(
        workflow.execution || {},
        "supportedBackends",
        `${workflowFile} should use provider-derived backend compatibility`,
      );
    }
  });

  it("declares create and update topic synthesis as split ACP skill sequences", async function () {
    const createWorkflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json",
        "utf8",
      ),
    );
    const updateWorkflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json",
        "utf8",
      ),
    );

    assert.equal(createWorkflow.request?.kind, "skillrunner.sequence.v1");
    assert.equal(updateWorkflow.request?.kind, "skillrunner.sequence.v1");
    assert.deepInclude(createWorkflow.parameters?.usePlannedTopic, {
      type: "boolean",
      required: true,
      default: false,
    });
    assert.deepInclude(createWorkflow.parameters?.plannedTopicId, {
      type: "string",
      required: true,
      visible_if: { parameter: "usePlannedTopic", equals: true },
      optionsSource: {
        kind: "synthesis.topics",
        valueFormat: "topicId",
        labelFormat: "title",
        filter: "planned",
      },
    });
    assert.deepInclude(createWorkflow.parameters?.topicSeed, {
      type: "string",
      required: true,
      visible_if: { parameter: "usePlannedTopic", equals: false },
    });
    assert.deepEqual(
      createWorkflow.request?.sequence?.steps?.[0]?.short_circuit,
      {
        when: { path: "status", equals: "canceled" },
        result: "step_output",
      },
    );
    assert.deepEqual(
      updateWorkflow.request?.sequence?.steps?.[0]?.short_circuit,
      {
        when: { path: "status", equals: "canceled" },
        result: "step_output",
      },
    );
    assert.deepEqual(
      createWorkflow.request?.sequence?.steps?.map((step: any) => ({
        id: step.id,
        skill_id: step.skill_id,
        workspace: step.workspace,
      })),
      [
        {
          id: "prepare",
          skill_id: "create-topic-synthesis-prepare",
          workspace: "new",
        },
        {
          id: "core",
          skill_id: "topic-synthesis-core-enrichment",
          workspace: "reuse-workflow",
        },
        {
          id: "finalize",
          skill_id: "topic-synthesis-finalize",
          workspace: "reuse-workflow",
        },
      ],
    );
    assert.deepEqual(
      updateWorkflow.request?.sequence?.steps?.map((step: any) => ({
        id: step.id,
        skill_id: step.skill_id,
        workspace: step.workspace,
      })),
      [
        {
          id: "prepare",
          skill_id: "update-topic-synthesis-prepare",
          workspace: "new",
        },
        {
          id: "core",
          skill_id: "topic-synthesis-core-enrichment",
          workspace: "reuse-workflow",
        },
        {
          id: "finalize",
          skill_id: "topic-synthesis-finalize",
          workspace: "reuse-workflow",
        },
      ],
    );
    assert.equal(createWorkflow.result?.final_step_id, "finalize");
    assert.equal(updateWorkflow.result?.final_step_id, "finalize");
    assert.equal(createWorkflow.result?.fetch?.type, "bundle");
    assert.equal(updateWorkflow.result?.fetch?.type, "bundle");
    assert.equal(
      createWorkflow.request?.sequence?.steps?.find(
        (step: any) => step.id === "finalize",
      )?.fetch_type,
      "bundle",
    );
    assert.equal(
      updateWorkflow.request?.sequence?.steps?.find(
        (step: any) => step.id === "finalize",
      )?.fetch_type,
      "bundle",
    );
    for (const workflow of [createWorkflow, updateWorkflow]) {
      for (const stepId of ["core", "finalize"]) {
        assert.deepEqual(
          workflow.request?.sequence?.steps?.find(
            (step: any) => step.id === stepId,
          )?.handoff,
          {
            bindings: [
              {
                kind: "value",
                target: "/input/handoff",
              },
            ],
          },
        );
      }
    }
    assert.deepInclude(createWorkflow.inputs, {
      member: { kind: "selection" },
      grouping: { mode: "all" },
    });
    assert.deepInclude(updateWorkflow.inputs, {
      member: { kind: "selection" },
      grouping: { mode: "all" },
    });
    assert.equal(
      createWorkflow.taskNameTemplate,
      "Create synthesis: {topic seed}",
    );
    assert.equal(
      updateWorkflow.taskNameTemplate,
      "Update synthesis: {topicId}",
    );
    assert.equal(createWorkflow.provider, "skillrunner");
    assert.equal(updateWorkflow.provider, "skillrunner");
    assert.notProperty(createWorkflow.execution || {}, "supportedBackends");
    assert.notProperty(updateWorkflow.execution || {}, "supportedBackends");
    assert.isTrue(createWorkflow.execution?.zoteroHostAccess?.required);
    assert.isTrue(updateWorkflow.execution?.zoteroHostAccess?.required);
    assert.notProperty(createWorkflow.execution || {}, "mcp");
    assert.notProperty(updateWorkflow.execution || {}, "mcp");
  });

  it("builds one create-topic-synthesis request for a mixed attachment selection", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    );
    assert.isOk(workflow);

    let topicContextReads = 0;

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: topicSourceSelection(),
      executionOptions: {
        workflowParams: {
          topicSeed: "DETR",
          language: "zh-CN",
        },
      },
      runtime: {
        hostApi: {
          synthesis: {
            topics: {
              async getContext() {
                topicContextReads += 1;
                return topicContextResult();
              },
            },
          },
        },
        hostApiVersion: 12,
      } as any,
    })) as Array<{
      taskName?: string;
      sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
      targetParentRef?: { libraryId: number; key: string };
      parameter?: Record<string, unknown>;
      kind?: string;
      steps?: Array<{
        id: string;
        skill_id: string;
        workspace?: string;
        fetch_type?: string;
        short_circuit?: Record<string, unknown>;
      }>;
      final_step_id?: string;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "skillrunner.sequence.v1");
    assert.equal(requests[0].taskName, "Create synthesis: DETR");
    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
    assert.isUndefined((requests[0] as any).runtime_options?.workflow_mcp);
    assert.deepEqual(requests[0].targetParentRef, {
      libraryId: 1,
      key: "PARENT08",
    });
    assert.deepEqual(requests[0].sourceAttachmentRefs, [
      { libraryId: 1, key: "ATTACHMD" },
      { libraryId: 1, key: "ATTACHPDF" },
    ]);
    assert.equal(requests[0].parameter?.topicSeed, "DETR");
    assert.equal(requests[0].parameter?.language, "zh-CN");
    assert.notProperty(requests[0].parameter || {}, "plannedTopicId");
    assert.equal(topicContextReads, 0);
    assert.notProperty(requests[0].steps?.[0] || {}, "input");
    assert.equal(requests[0].final_step_id, "finalize");
    assert.deepEqual(requests[0].steps?.[0]?.short_circuit, {
      when: { path: "status", equals: "canceled" },
      result: "step_output",
    });
    assert.deepEqual(
      requests[0].steps?.map((step) => [
        step.id,
        step.skill_id,
        step.workspace,
      ]),
      [
        ["prepare", "create-topic-synthesis-prepare", "new"],
        ["core", "topic-synthesis-core-enrichment", "reuse-workflow"],
        ["finalize", "topic-synthesis-finalize", "reuse-workflow"],
      ],
    );
    assert.equal(
      requests[0].steps?.find((step) => step.id === "finalize")?.fetch_type,
      "bundle",
    );
  });

  it("builds a create request from the complete active planned topic snapshot", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    );
    assert.isOk(workflow);

    const reads: unknown[] = [];
    const semantic = plannedTopicSnapshot();
    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: topicSourceSelection(),
      executionOptions: {
        workflowParams: {
          usePlannedTopic: true,
          plannedTopicId: "planned-detr",
          topicSeed: "must not survive",
          language: "en-US",
        },
      },
      runtime: {
        hostApi: {
          synthesis: {
            topics: {
              async getContext(request: unknown) {
                reads.push(request);
                return topicContextResult(semantic);
              },
            },
          },
        },
        hostApiVersion: 12,
      } as any,
    })) as any[];

    assert.deepEqual(reads, [{ topicId: "planned-detr", view: "semantic" }]);
    assert.lengthOf(requests, 1);
    assert.equal(requests[0].taskName, "Create synthesis: Planned DETR");
    assert.deepEqual(requests[0].parameter, {
      usePlannedTopic: true,
      plannedTopicId: "planned-detr",
      language: "en-US",
    });
    semantic.topic_definition.title = "Mutated after request build";
    semantic.topic_resolver.paper_refs.push("1:MUTATED");
    semantic.planning.revision = 99;
    assert.deepEqual(requests[0].steps[0].input, {
      planned_topic: plannedTopicSnapshot(),
    });
    for (const step of requests[0].steps.slice(1)) {
      assert.notProperty(step, "input");
    }
    assert.deepEqual(
      requests[0].steps.map((step: any) => step.skill_id),
      workflow!.manifest.request?.sequence?.steps?.map((step) => step.skill_id),
    );
  });

  it("fails before Agent dispatch when the planned topic is missing, stale, or incomplete", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    );
    assert.isOk(workflow);

    const complete = plannedTopicSnapshot();
    const cases: Array<[string, unknown]> = [
      ["missing", null],
      ["stale", { ...complete, lifecycle: "stale" }],
      [
        "incomplete",
        {
          ...complete,
          topic_definition: {
            ...complete.topic_definition,
            title: "",
          },
        },
      ],
      [
        "empty definition",
        {
          ...complete,
          topic_definition: {
            ...complete.topic_definition,
            definition: " ",
          },
        },
      ],
      [
        "resolver without a selector",
        { ...complete, topic_resolver: { combine: "union" } },
      ],
      [
        "inactive planning",
        {
          ...complete,
          planning: { ...complete.planning, lifecycle: "stale" },
        },
      ],
      [
        "missing planning revision",
        { ...complete, planning: { lifecycle: "planned" } },
      ],
      [
        "zero planning revision",
        { ...complete, planning: { ...complete.planning, revision: 0 } },
      ],
    ];
    for (const [name, semantic] of cases) {
      let failure: unknown;
      try {
        await executeBuildRequests({
          workflow: workflow!,
          selectionContext: topicSourceSelection(),
          executionOptions: {
            workflowParams: {
              usePlannedTopic: true,
              plannedTopicId: "planned-detr",
              language: "en-US",
            },
          },
          runtime: {
            hostApi: {
              synthesis: {
                topics: {
                  async getContext() {
                    return topicContextResult(semantic);
                  },
                },
              },
            },
            hostApiVersion: 12,
          } as any,
        });
      } catch (error) {
        failure = error;
      }
      assert.instanceOf(failure, Error, name);
      assert.match(
        (failure as Error).message,
        /Planned Topic is missing, stale, or incomplete: planned-detr/,
        name,
      );
    }
  });

  it("uses the update-topic-synthesis workflow title template for workflow-unit requests", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "update-topic-synthesis",
    );
    assert.isOk(workflow);

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: topicSourceSelection(),
      executionOptions: {
        workflowParams: {
          topicId: "object-detection",
        },
      },
    })) as Array<{
      taskName?: string;
      sourceAttachmentRefs?: Array<{ libraryId: number; key: string }>;
      targetParentRef?: { libraryId: number; key: string };
      parameter?: Record<string, unknown>;
      kind?: string;
      steps?: Array<{
        id: string;
        skill_id: string;
        workspace?: string;
        fetch_type?: string;
        short_circuit?: Record<string, unknown>;
      }>;
      final_step_id?: string;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].kind, "skillrunner.sequence.v1");
    assert.equal(requests[0].taskName, "Update synthesis: object-detection");
    assert.deepEqual(requests[0].targetParentRef, {
      libraryId: 1,
      key: "PARENT08",
    });
    assert.deepEqual(requests[0].sourceAttachmentRefs, [
      { libraryId: 1, key: "ATTACHMD" },
      { libraryId: 1, key: "ATTACHPDF" },
    ]);
    assert.equal(requests[0].parameter?.topicId, "object-detection");
    assert.notProperty(requests[0].parameter || {}, "language");
    assert.notProperty(requests[0].parameter || {}, "updateScope");
    assert.notProperty(requests[0].parameter || {}, "updateMode");
    assert.equal(requests[0].final_step_id, "finalize");
    assert.deepEqual(requests[0].steps?.[0]?.short_circuit, {
      when: { path: "status", equals: "canceled" },
      result: "step_output",
    });
    assert.deepEqual(
      requests[0].steps?.map((step) => [
        step.id,
        step.skill_id,
        step.workspace,
      ]),
      [
        ["prepare", "update-topic-synthesis-prepare", "new"],
        ["core", "topic-synthesis-core-enrichment", "reuse-workflow"],
        ["finalize", "topic-synthesis-finalize", "reuse-workflow"],
      ],
    );
    assert.equal(
      requests[0].steps?.find((step) => step.id === "finalize")?.fetch_type,
      "bundle",
    );
  });

  it("loads planner/create/update topic workflows from the builtin synthesis-layer package", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const createWorkflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    );
    const updateWorkflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "update-topic-synthesis",
    );
    const plannerWorkflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "topic-planner",
    );

    assert.isOk(
      plannerWorkflow,
      `topic-planner should load; diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
    assert.isOk(
      createWorkflow,
      `create-topic-synthesis should load; diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
    assert.isOk(
      updateWorkflow,
      `update-topic-synthesis should load; diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
    assert.equal(createWorkflow?.packageId, "synthesis-layer");
    assert.equal(updateWorkflow?.packageId, "synthesis-layer");
    assert.equal(plannerWorkflow?.packageId, "synthesis-layer");
    assert.equal(plannerWorkflow?.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      plannerWorkflow?.manifest.request?.create?.skill_id,
      "topic-planner",
    );
    assert.equal(
      createWorkflow?.manifest.request?.kind,
      "skillrunner.sequence.v1",
    );
    assert.equal(
      updateWorkflow?.manifest.request?.kind,
      "skillrunner.sequence.v1",
    );
    assert.equal(
      createWorkflow?.manifest.request?.sequence?.steps?.[0]?.skill_id,
      "create-topic-synthesis-prepare",
    );
    assert.equal(
      updateWorkflow?.manifest.request?.sequence?.steps?.[0]?.skill_id,
      "update-topic-synthesis-prepare",
    );
  });

  it("ships planner/create/update topic workflows in the packaged builtin manifest", async function () {
    const builtinManifest = JSON.parse(
      await fs.readFile("workflows_builtin/manifest.json", "utf8"),
    );
    const files = Array.isArray(builtinManifest.files)
      ? builtinManifest.files
      : [];

    assert.include(
      files,
      "synthesis-layer/create-topic-synthesis/workflow.json",
    );
    assert.include(files, "synthesis-layer/topic-planner/workflow.json");
    assert.include(
      files,
      "synthesis-layer/update-topic-synthesis/workflow.json",
    );
    assert.include(
      files,
      "synthesis-layer/hooks/applyTopicSynthesisResult.mjs",
    );
    assert.include(files, "synthesis-layer/hooks/applyTopicPlanResult.mjs");
    assert.notInclude(
      files,
      "synthesis-layer/update-topic-synthesis/hooks/buildRequest.mjs",
    );
    assert.notInclude(files, "synthesis-layer/synthesize-topic/workflow.json");
  });

  it("registers the planner and split topic synthesis skills with output schemas", async function () {
    const registry = await getPluginSkillRegistry();
    const expected = [
      "create-topic-synthesis-prepare",
      "update-topic-synthesis-prepare",
      "topic-synthesis-core-enrichment",
      "topic-synthesis-finalize",
      "topic-planner",
    ];

    for (const skillId of expected) {
      const entry = registry.entriesById[skillId];
      assert.isOk(entry, `${skillId} should be registered`);
      assert.equal(entry.sourceKind, "official");
      const runnerJson = JSON.parse(
        await fs.readFile(entry.runnerJsonPath, "utf8"),
      );
      assert.equal(runnerJson.id, skillId);
      assert.equal(runnerJson.schemas.output, "assets/output.schema.json");
    }
    assert.notProperty(registry.entriesById, "create-topic-synthesis");
    assert.notProperty(registry.entriesById, "update-topic-synthesis");
  });

  it("applies one complete planner result through the synthesis host API", async function () {
    const hookUrl = pathToFileURL(
      path.resolve(
        "workflows_builtin/synthesis-layer/hooks/applyTopicPlanResult.mjs",
      ),
    ).href;
    const hook = await import(`${hookUrl}?t=${Date.now()}`);
    const plan = {
      kind: "topic_plan",
      operation: "reconcile",
      base_graph_hash: "graph-v1",
      library_index_hash: "library-v1",
      topic_actions: [],
      relation_proposals: [],
      recommended_updates: [],
    };
    let received: unknown;
    const result = await hook.applyResult({
      resultContext: { resultJson: plan },
      runtime: {
        hostApi: {
          synthesis: {
            workflowApply: {
              async applyTopicPlan(value: unknown) {
                received = value;
                return { status: "no_change", graph_hash: "graph-v1" };
              },
            },
          },
        },
      },
    });

    assert.deepEqual(received, plan);
    assert.equal(result.status, "no_change");
  });

  it("accepts canceled create-topic-synthesis prepare output without requiring a markdown artifact", async function () {
    const registry = await getPluginSkillRegistry();
    const entry = registry.entriesById["create-topic-synthesis-prepare"];

    assert.isOk(entry);
    const businessPayload = {
      ...canceledSkillOutputBundle(),
    } as Record<string, unknown>;
    delete businessPayload.__SKILL_DONE__;
    const validation = await validateAcpSkillFinalPayload({
      payload: businessPayload,
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isTrue(validation.ok, validation.errors.join("; "));
  });

  it("validates ACP skill output without relying on global console", async function () {
    const registry = await getPluginSkillRegistry();
    const entry = registry.entriesById["topic-synthesis-finalize"];
    const originalConsole = (globalThis as { console?: Console }).console;

    try {
      delete (globalThis as { console?: Console }).console;
      const validation = await validateAcpSkillFinalPayload({
        payload: {
          kind: "topic_synthesis_canceled",
          status: "canceled",
          reason: "user_cancelled_duplicate_topic",
          message: "User canceled after duplicate topic confirmation.",
          duplicate_topic_id: "detr-detection-transformer",
          topic_seed: "DETR",
        },
        runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
        primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
      });

      assert.isTrue(validation.ok, validation.errors.join("; "));
    } finally {
      (globalThis as { console?: Console }).console = originalConsole;
    }
  });

  it("exposes create target resolution through the package contract", async function () {
    const targetSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis-prepare/assets/schemas/stage-10-create-topic-context.schema.json",
        "utf8",
      ),
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis-prepare/assets/runner.json",
        "utf8",
      ),
    );

    assert.sameMembers(
      targetSchema.properties.target_decision.properties.action.enum,
      ["create_new", "use_planned_topic", "cancel_materialized_duplicate"],
    );
    assert.include(
      runner.entrypoint.prompts.common,
      "assets/output.schema.json",
    );
    assert.include(runner.entrypoint.prompts.common, "SKILL.md");
    assert.include(runner.entrypoint.prompts.common, "scripts/gate.py");
    assert.notInclude(
      runner.entrypoint.prompts.common,
      "topic-synthesis-runtime",
    );
  });

  it("ships package-local runtime resources for split topic synthesis skills", async function () {
    const requiredBySkill: Record<string, string[]> = {
      "skills_builtin/create-topic-synthesis-prepare": [
        "scripts/gate.py",
        "scripts/topic_synthesis_db.py",
        "assets/schemas/stage-10-create-topic-context.schema.json",
        "assets/schemas/stage-20-resolver-and-workset.schema.json",
        "assets/schemas/stage-30-prepare-analysis-context.schema.json",
        "assets/schemas/handoff.schema.json",
      ],
      "skills_builtin/update-topic-synthesis-prepare": [
        "scripts/gate.py",
        "scripts/topic_synthesis_db.py",
        "assets/schemas/stage-10-update-topic-context.schema.json",
        "assets/schemas/stage-30-prepare-analysis-context.schema.json",
        "assets/schemas/handoff.schema.json",
      ],
      "skills_builtin/topic-synthesis-core-enrichment": [
        "scripts/gate.py",
        "scripts/topic_synthesis_db.py",
        "assets/schemas/stage-40-core-synthesis.schema.json",
        "assets/schemas/stage-50-kg-enrichment.schema.json",
        "assets/schemas/handoff.schema.json",
      ],
      "skills_builtin/topic-synthesis-finalize": [
        "scripts/gate.py",
        "scripts/topic_synthesis_db.py",
        "assets/schemas/stage-60-coverage-and-collection-suggestions.schema.json",
        "assets/schemas/stage-70-summary.schema.json",
        "assets/schemas/handoff.schema.json",
      ],
    };
    const skillRoots = [
      "skills_builtin/create-topic-synthesis-prepare",
      "skills_builtin/update-topic-synthesis-prepare",
      "skills_builtin/topic-synthesis-core-enrichment",
      "skills_builtin/topic-synthesis-finalize",
    ];

    for (const skillRoot of skillRoots) {
      for (const relativePath of requiredBySkill[skillRoot]) {
        await fs.readFile(path.join(skillRoot, relativePath), "utf8");
      }
      const skillText = await fs.readFile(
        path.join(skillRoot, "SKILL.md"),
        "utf8",
      );
      const runnerText = await fs.readFile(
        path.join(skillRoot, "assets/runner.json"),
        "utf8",
      );
      assert.notInclude(skillText, "topic-synthesis-runtime");
      assert.notInclude(runnerText, "topic-synthesis-runtime");
      assert.notInclude(runnerText, '"required_tools"');
      assert.notInclude(runnerText, "synthesis.read_paper_artifacts");
    }
  });

  it("rejects ACP skill output that embeds markdown in final JSON", async function () {
    const registry = await getPluginSkillRegistry();
    const entry = registry.entriesById["topic-synthesis-finalize"];
    const validation = await validateAcpSkillFinalPayload({
      payload: {
        kind: "topic_synthesis",
        operation: "create",
        language: "zh-CN",
        topic_definition: {
          id: "object-detection",
          title: "Object Detection",
        },
        artifact_manifest_path: "result/topic-synthesis-artifacts.json",
        markdown: "# Should not be embedded",
      },
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isFalse(validation.ok);
    assert.match(validation.errors.join("\n"), /must NOT be valid|markdown/i);
  });

  it("rejects new create skill output that includes base_hashes", async function () {
    const registry = await getPluginSkillRegistry();
    const entry = registry.entriesById["topic-synthesis-finalize"];
    const validation = await validateAcpSkillFinalPayload({
      payload: {
        kind: "topic_synthesis",
        operation: "create",
        language: "zh-CN",
        topic_definition: {
          id: "object-detection",
          title: "Object Detection",
        },
        artifact_manifest_path: "result/topic-synthesis-artifacts.json",
        base_hashes: {
          manifest: "sha256:legacy-manifest",
        },
      },
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isFalse(validation.ok);
    assert.match(
      validation.errors.join("\n"),
      /base_hashes|additional properties/i,
    );
  });

  it("accepts valid topic synthesis result bundles", function () {
    const result = validateSynthesisResultBundle(v2CompleteBundle());

    assert.isTrue(result.ok);
    assert.equal(result.bundle.kind, "topic_synthesis");
  });

  it("rejects unsupported synthesis kinds", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...v2CompleteBundle(),
          kind: "method_synthesis",
        }),
      /topic_synthesis/i,
    );
  });

  it("rejects direct write instructions from agents", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...v2CompleteBundle(),
          write_zotero_raw_source: true,
        }),
      /direct write/i,
    );
  });

  it("allows apply when base hashes match", function () {
    const decision = decideSynthesisApply({
      bundle: v2CompleteBundle({
        operation: "update_full",
        base_hashes: {
          artifact: "sha256:a",
          manifest: "sha256:m",
          metadata: "sha256:b",
          index: "sha256:c",
        },
      }),
      currentHashes: {
        artifact: "sha256:a",
        manifest: "sha256:m",
        metadata: "sha256:b",
        index: "sha256:c",
      },
    });

    assert.equal(decision.action, "persist");
  });

  it("allows create when only the aggregate index hash changed", function () {
    const decision = decideSynthesisApply({
      bundle: {
        ...v2CompleteBundle(),
        base_hashes: {
          artifact: "",
          metadata: "",
          index: "",
        },
      },
      currentHashes: {
        artifact: "",
        metadata: "",
        index: "sha256:existing-topic-index",
      },
    });

    assert.equal(decision.action, "persist");
  });

  it("returns conflict when base hashes mismatch", function () {
    const decision = decideSynthesisApply({
      bundle: v2CompleteBundle({
        operation: "update_full",
        base_hashes: {
          artifact: "sha256:a",
          manifest: "sha256:m",
          metadata: "sha256:b",
          index: "sha256:c",
        },
      }),
      currentHashes: {
        artifact: "sha256:changed",
        manifest: "sha256:m",
        metadata: "sha256:b",
        index: "sha256:c",
      },
    });

    assert.equal(decision.action, "conflict");
    assert.deepEqual(decision.mismatches, [
      {
        name: "artifact",
        base: "sha256:a",
        current: "sha256:changed",
      },
    ]);
  });
});

function v2CompleteBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "create",
    language: "zh-CN",
    topic_definition: {
      id: "topic:object-detection",
      title: "Object Detection",
      description: "Object detection synthesis",
    },
    resolver_manifest_path: "runtime/payloads/resolver.json",
    resolver_diagnostics: {
      final_count: 1,
      manifest_hash: "sha256:resolver",
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:DETR"],
        artifacts: [
          "digest-markdown",
          "references-json",
          "citation-analysis-json",
        ],
      },
    },
    analysis_manifest_path: "result/topic-analysis.json",
    ...overrides,
  };
}

function v2ManifestOnlyBundle(overrides: Record<string, unknown> = {}) {
  return v2CompleteBundle({
    resolver_manifest_path: "",
    analysis_manifest_path: "",
    artifact_manifest_path: "result/topic-synthesis-artifacts.json",
    ...overrides,
  });
}

function v2PatchBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "update_patch",
    topic_id: "object-detection",
    language: "zh-CN",
    read_section_hashes: {
      claims: "sha256:old-claims",
    },
    analysis_manifest_path: "result/topic-analysis.patch.json",
    artifact_metadata: {
      update_reason: "digest_changed",
    },
    ...overrides,
  };
}

const SYNTHESIS_RUN_ROOT = "/workspace/runs/topic-apply";

function closedV12TopicBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "create",
    language: "zh-CN",
    topic_definition: {
      id: "object-detection",
      title: "Object Detection",
    },
    artifact_manifest_path: `${SYNTHESIS_RUN_ROOT}/result/topic-synthesis-artifacts.json`,
    ...overrides,
  };
}

function closedV12RunFiles(): Map<string, string> {
  return new Map([
    [
      `${SYNTHESIS_RUN_ROOT}/result/topic-synthesis-artifacts.json`,
      JSON.stringify({
        resolver_manifest: `${SYNTHESIS_RUN_ROOT}/runtime/payloads/resolver.json`,
        topic_analysis: `${SYNTHESIS_RUN_ROOT}/result/topic-analysis.json`,
        topic_section: `${SYNTHESIS_RUN_ROOT}/result/sections/topic.json`,
      }),
    ],
    [
      `${SYNTHESIS_RUN_ROOT}/runtime/payloads/resolver.json`,
      JSON.stringify({
        schema_id: "synthesis.topic_synthesis_resolver_manifest",
        topic_resolver: { combine: "union" },
        resolved_paper_set: { papers: [] },
      }),
    ],
    [
      `${SYNTHESIS_RUN_ROOT}/result/topic-analysis.json`,
      JSON.stringify({
        schema_id: "synthesis.topic_analysis_manifest",
        topic_id: "object-detection",
        sections: { topic: { path: "result/sections/topic.json" } },
        sidecars: {},
      }),
    ],
    [
      "result/sections/topic.json",
      JSON.stringify({ id: "object-detection", title: "Object Detection" }),
    ],
    [
      `${SYNTHESIS_RUN_ROOT}/result/sections/topic.json`,
      JSON.stringify({ id: "object-detection", title: "Object Detection" }),
    ],
  ]);
}

async function loadTopicSynthesisHook(): Promise<{
  applyResult: (args: Record<string, unknown>) => Promise<{
    status: string;
    skipped?: boolean;
  }>;
}> {
  const hookUrl = pathToFileURL(
    path.resolve(
      "workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs",
    ),
  ).href;
  return import(`${hookUrl}?t=${Date.now()}`);
}

function createTopicApplyHarness() {
  const rpcCalls: Array<{ capability: string; payload: any }> = [];
  const reads: string[] = [];
  const files = closedV12RunFiles();
  const composition = createNativeSynthesisClientComposition({
    getReadyConnection: () => ({
      discovery: {
        host: "127.0.0.1",
        port: 1234,
        profileId: "1".repeat(64),
        serviceInstanceId: "service-1",
      },
      clientToken: "token",
    }),
    rpcClient: {
      async call(args: any) {
        rpcCalls.push({ capability: args.capability, payload: args.payload });
        return args.rebuildResult({
          ok: true,
          status: "persisted",
          topicId: "object-detection",
          operationId: "operation-1",
          hashes: {},
          mismatches: [],
          warnings: [],
        });
      },
    },
  });
  return {
    rpcCalls,
    reads,
    runtime: {
      hostApi: {
        synthesis: createWorkflowSynthesisHostApi({
          resolveClient: async () => composition.client,
          notifyChanged: () => {},
        }),
      },
    },
    resultContext: {
      async resolveArtifact({ rawPath }: { rawPath?: unknown }) {
        const key = String(rawPath ?? "");
        reads.push(key);
        const text = files.get(key);
        if (text === undefined) {
          throw new Error(`missing artifact: ${key}`);
        }
        return { text, entryPath: key, candidates: [key] };
      },
    },
    dispose: () => composition.dispose(),
  };
}

describe("Synthesize topic workflow v2 structured contract", function () {
  this.timeout(10_000);

  it("declares separate create and update topic synthesis workflows backed by split skills", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const registry = await getPluginSkillRegistry();
    const workflowIds = loaded.workflows.map((entry) => entry.manifest.id);

    assert.include(workflowIds, "create-topic-synthesis");
    assert.include(workflowIds, "update-topic-synthesis");
    assert.notProperty(registry.entriesById, "create-topic-synthesis");
    assert.notProperty(registry.entriesById, "update-topic-synthesis");
    for (const skillId of [
      "create-topic-synthesis-prepare",
      "update-topic-synthesis-prepare",
      "topic-synthesis-core-enrichment",
      "topic-synthesis-finalize",
    ]) {
      assert.property(registry.entriesById, skillId);
    }
    assert.notProperty(registry.entriesById, "synthesize-topic");
    assert.isFalse(
      registry.diagnostics.some((entry) => entry.level === "error"),
      `registry should not report error diagnostics: ${JSON.stringify(registry.diagnostics)}`,
    );
  });

  it("accepts create and full-update bundles with operation-specific CAS contracts", function () {
    for (const operation of ["create", "update_full"] as const) {
      const result = validateSynthesisResultBundle(
        v2CompleteBundle({
          operation,
          ...(operation === "update_full"
            ? {
                base_hashes: {
                  manifest: "sha256:manifest",
                  artifact: "sha256:artifact",
                  export: "sha256:export",
                  metadata: "sha256:metadata",
                  index: "sha256:index",
                },
              }
            : {}),
        }),
      );

      assert.isTrue(result.ok);
      assert.equal((result.bundle as any).operation, operation);
      if (operation === "create") {
        assert.notProperty(result.bundle, "base_hashes");
      } else {
        assert.property(result.bundle, "base_hashes");
      }
      assert.equal(
        (result.bundle as any).analysis_manifest_path,
        "result/topic-analysis.json",
      );
      assert.equal(
        (result.bundle as any).resolver_manifest_path,
        "runtime/payloads/resolver.json",
      );
      assert.equal((result.bundle as any).language, "zh-CN");
      assert.notProperty(result.bundle, "markdown_path");
      assert.notProperty(result.bundle, "topic_resolver");
      assert.notProperty(result.bundle, "resolved_paper_set");
    }
  });

  it("accepts manifest-only create and full-update bundles", function () {
    for (const operation of ["create", "update_full"] as const) {
      const result = validateSynthesisResultBundle(
        v2ManifestOnlyBundle({
          operation,
          ...(operation === "update_full"
            ? {
                base_hashes: {
                  manifest: "sha256:manifest",
                  artifact: "sha256:artifact",
                  metadata: "sha256:metadata",
                },
              }
            : {}),
        }),
      );

      assert.isTrue(result.ok);
      assert.equal(
        (result.bundle as any).artifact_manifest_path,
        "result/topic-synthesis-artifacts.json",
      );
      assert.equal((result.bundle as any).analysis_manifest_path, "");
      assert.equal((result.bundle as any).resolver_manifest_path, "");
    }
  });

  it("tolerates legacy create base hashes but marks them ignored", function () {
    const result = validateSynthesisResultBundle(
      v2CompleteBundle({
        base_hashes: {
          manifest: "sha256:legacy-manifest",
          artifact: "sha256:legacy-artifact",
        },
      }),
    );

    assert.isTrue(result.ok);
    assert.notProperty(result.bundle, "base_hashes");
    assert.equal(result.bundle.create_base_hashes_ignored, true);
  });

  it("requires base hashes for full updates", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            operation: "update_full",
          }),
        ),
      /base_hashes/i,
    );
  });

  it("rejects create and full-update bundles that still depend on markdown_path", function () {
    for (const operation of ["create", "update_full"] as const) {
      assert.throws(
        () =>
          validateSynthesisResultBundle(
            v2CompleteBundle({
              operation,
              markdown_path: "result/preview.md",
            }),
          ),
        /markdown_path/i,
      );
    }
  });

  it("rejects v2 final bundles without topic_definition.id or any artifact manifest", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            topic_definition: { title: "Object Detection" },
          }),
        ),
      /topic_definition\.id/i,
    );
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            analysis_manifest_path: "",
            artifact_manifest_path: "",
          }),
        ),
      /analysis_manifest_path|artifact_manifest_path/i,
    );
  });

  it("accepts update patch bundles with read section hashes and no markdown dependency", function () {
    const result = validateSynthesisResultBundle(v2PatchBundle());

    assert.isTrue(result.ok);
    assert.equal((result.bundle as any).operation, "update_patch");
    assert.deepEqual((result.bundle as any).read_section_hashes, {
      claims: "sha256:old-claims",
    });
    assert.notProperty(result.bundle, "markdown_path");
  });

  it("tolerates legacy top-level discovery and KG proposal sidecar paths", function () {
    const result = validateSynthesisResultBundle(
      v2CompleteBundle({
        topic_interest_metadata_path:
          "result/sidecars/topic-interest-metadata.json",
        concept_cards_proposal_path:
          "result/sidecars/concept-cards-proposal.json",
        topic_graph_relation_proposals_path:
          "result/sidecars/topic-graph-relation-proposals.json",
      }),
    );
    const patch = validateSynthesisResultBundle(
      v2PatchBundle({
        topic_interest_metadata_path:
          "result/sidecars/topic-interest-metadata.json",
        topic_graph_relation_proposals_path:
          "result/sidecars/topic-graph-relation-proposals.json",
      }),
    );

    assert.equal(
      result.bundle.concept_cards_proposal_path,
      "result/sidecars/concept-cards-proposal.json",
    );
    assert.equal(
      result.bundle.topic_interest_metadata_path,
      "result/sidecars/topic-interest-metadata.json",
    );
    assert.equal(
      result.bundle.topic_graph_relation_proposals_path,
      "result/sidecars/topic-graph-relation-proposals.json",
    );
    assert.equal(
      patch.bundle.topic_graph_relation_proposals_path,
      "result/sidecars/topic-graph-relation-proposals.json",
    );
    assert.equal(
      patch.bundle.topic_interest_metadata_path,
      "result/sidecars/topic-interest-metadata.json",
    );
    assert.notProperty(result.bundle, "topic_graph_relation_proposals");
    assert.notProperty(result.bundle, "concept_cards");
  });

  it("rejects embedded markdown in v2 final bundles", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            markdown: "# Embedded Markdown is no longer a final bundle field",
          }),
        ),
      /markdown/i,
    );
  });

  it("rejects v2 final bundles missing required section or artifact manifest paths", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            analysis_manifest_path: "",
            artifact_manifest_path: "",
          }),
        ),
      /analysis_manifest_path|artifact_manifest_path|section manifest/i,
    );
  });

  it("keeps update workflow user input limited to topicId and derives update context in prepare", async function () {
    const createWorkflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/create-topic-synthesis/workflow.json",
        "utf8",
      ),
    );
    const updateWorkflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/update-topic-synthesis/workflow.json",
        "utf8",
      ),
    );

    assert.include(JSON.stringify(createWorkflow), "language");
    assert.sameMembers(Object.keys(updateWorkflow.parameters || {}), [
      "topicId",
    ]);
    assert.equal(
      updateWorkflow.parameters?.topicId?.optionsSource?.kind,
      "synthesis.topics",
    );
    assert.equal(
      updateWorkflow.parameters?.topicId?.optionsSource?.filter,
      "updatable",
    );
    assert.isFalse(updateWorkflow.parameters?.topicId?.allowCustom);
    assert.notProperty(updateWorkflow.hooks || {}, "buildRequest");
    assert.equal(updateWorkflow.request?.kind, "skillrunner.sequence.v1");
    assert.equal(
      updateWorkflow.request?.sequence?.steps?.[0]?.skill_id,
      "update-topic-synthesis-prepare",
    );
  });

  it("applies a real topic synthesis hook result as a closed bundle and asset request", async function () {
    const harness = createTopicApplyHarness();
    try {
      const hook = await loadTopicSynthesisHook();
      const result = await hook.applyResult({
        runResult: { json: closedV12TopicBundle() },
        resultContext: harness.resultContext,
        runtime: harness.runtime,
      });

      assert.equal(result.status, "persisted");
      assert.lengthOf(harness.rpcCalls, 1);
      const call = harness.rpcCalls[0];
      assert.equal(call.capability, "client.applyTopicSynthesisResult");
      const request = call.payload.args[0];
      assert.deepEqual(Object.keys(request).sort(), ["assets", "bundle"]);
      assert.deepEqual(Object.keys(request.bundle).sort(), [
        "artifact_manifest_path",
        "artifact_metadata",
        "kind",
        "language",
        "operation",
        "topic_definition",
      ]);
      assert.deepEqual(request.bundle.artifact_metadata, {});
      assert.lengthOf(request.assets, 5);

      const assetsById = new Map<string, { mediaType: string; text: string }>(
        request.assets.map((asset: { id: string }) => [asset.id, asset]),
      );
      const assetText = (locator: string) => {
        assert.match(locator, /^asset\/\d{4}$/);
        const asset = assetsById.get(locator);
        assert.isOk(asset, `${locator} should be a submitted asset`);
        return JSON.parse(asset!.text);
      };
      const artifactManifest = assetText(request.bundle.artifact_manifest_path);
      assert.equal(
        assetsById.get(artifactManifest.resolver_manifest)?.mediaType,
        "application/json",
      );
      const analysis = assetText(artifactManifest.topic_analysis);
      assert.equal(
        assetText(analysis.sections.topic.path).id,
        "object-detection",
      );
      assert.equal(
        assetText(artifactManifest.topic_section).title,
        "Object Detection",
      );

      const serialized = JSON.stringify(call.payload);
      assert.notInclude(serialized, SYNTHESIS_RUN_ROOT);
      assert.notInclude(serialized, "result/");
      assert.deepEqual(harness.reads, [
        `${SYNTHESIS_RUN_ROOT}/result/topic-synthesis-artifacts.json`,
        `${SYNTHESIS_RUN_ROOT}/runtime/payloads/resolver.json`,
        `${SYNTHESIS_RUN_ROOT}/result/topic-analysis.json`,
        "result/sections/topic.json",
        `${SYNTHESIS_RUN_ROOT}/result/sections/topic.json`,
      ]);
    } finally {
      await harness.dispose();
    }
  });

  it("keeps canceled topic synthesis output outside the closed apply request", async function () {
    const harness = createTopicApplyHarness();
    try {
      const hook = await loadTopicSynthesisHook();
      const result = await hook.applyResult({
        runResult: { json: canceledSkillOutputBundle() },
        resultContext: harness.resultContext,
        runtime: harness.runtime,
      });

      assert.equal(result.status, "canceled");
      assert.isTrue(result.skipped);
      assert.deepEqual(harness.reads, []);
      assert.deepEqual(harness.rpcCalls, []);
    } finally {
      await harness.dispose();
    }
  });
});
