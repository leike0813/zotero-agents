import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import {
  decideSynthesisApply,
  validateSynthesisResultBundle,
} from "../../src/modules/synthesis/workflow";

function validBundle() {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes: {
      artifact: "sha256:a",
      metadata: "sha256:b",
      index: "sha256:c",
    },
    topic_definition: {
      id: "topic:test",
      title: "Test Topic",
      description: "A topic",
    },
    topic_resolver: {
      mode: "tag_query",
      query: "topic:test",
    },
    resolved_paper_set: {
      papers: ["1:ABCD1234"],
    },
    resolver_diagnostics: {
      final_count: 1,
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:ABCD1234"],
        artifacts: [],
      },
    },
    markdown: "# Test Topic\n\nBody",
    timeline: "2024: topic begins",
  };
}

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

describe("Synthesize topic workflow contract", function () {
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

  it("declares separate builtin create and update topic synthesis ACP skills as backends", async function () {
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

    assert.equal(
      createWorkflow.request?.create?.skill_id,
      "create-topic-synthesis",
    );
    assert.equal(
      updateWorkflow.request?.create?.skill_id,
      "update-topic-synthesis",
    );
    assert.equal(createWorkflow.inputs?.unit, "workflow");
    assert.equal(updateWorkflow.inputs?.unit, "workflow");
    assert.equal(
      createWorkflow.taskNameTemplate,
      "Create synthesis: {topic seed}",
    );
    assert.equal(
      updateWorkflow.taskNameTemplate,
      "Update synthesis: {topicId}",
    );
    assert.equal(createWorkflow.provider, "acp");
    assert.equal(updateWorkflow.provider, "acp");
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

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: {
        items: {
          attachments: [
            {
              filePath: "D:/papers/conditional-detr.md",
              mimeType: "text/markdown",
              parent: { id: 8, title: "Conditional DETR" },
            },
            {
              filePath: "D:/papers/conditional-detr.pdf",
              mimeType: "application/pdf",
              parent: { id: 8, title: "Conditional DETR" },
            },
          ],
        },
      },
      executionOptions: {
        workflowParams: {
          topicSeed: "DETR",
          language: "zh-CN",
        },
      },
    })) as Array<{
      taskName?: string;
      sourceAttachmentPaths?: string[];
      targetParentID?: number;
      parameter?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].taskName, "Create synthesis: DETR");
    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
    assert.isUndefined((requests[0] as any).runtime_options?.workflow_mcp);
    assert.equal(requests[0].targetParentID, 8);
    assert.deepEqual(requests[0].sourceAttachmentPaths, [
      "D:/papers/conditional-detr.md",
      "D:/papers/conditional-detr.pdf",
    ]);
    assert.equal(requests[0].parameter?.topicSeed, "DETR");
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
      selectionContext: {
        items: {
          attachments: [
            {
              filePath: "D:/papers/conditional-detr.md",
              mimeType: "text/markdown",
              parent: { id: 8, title: "Conditional DETR" },
            },
            {
              filePath: "D:/papers/conditional-detr.pdf",
              mimeType: "application/pdf",
              parent: { id: 8, title: "Conditional DETR" },
            },
          ],
        },
      },
      executionOptions: {
        workflowParams: {
          topicId: "object-detection",
        },
      },
      runtime: {
        hostApi: {
          synthesis: {
            async getTopicContext() {
              return {
                language: "zh-CN",
                recommended_update: {
                  scope: "refresh",
                  mode: "update_full",
                  reason: "manual",
                  prefill: {
                    topicId: "object-detection",
                    language: "zh-CN",
                    updateScope: "refresh",
                    updateMode: "update_full",
                    updateReason: "manual",
                  },
                },
              };
            },
          },
        } as any,
      },
    })) as Array<{
      taskName?: string;
      sourceAttachmentPaths?: string[];
      targetParentID?: number;
      parameter?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].taskName, "Update synthesis: object-detection");
    assert.equal(requests[0].targetParentID, 8);
    assert.deepEqual(requests[0].sourceAttachmentPaths, [
      "D:/papers/conditional-detr.md",
      "D:/papers/conditional-detr.pdf",
    ]);
    assert.equal(requests[0].parameter?.topicId, "object-detection");
    assert.equal(requests[0].parameter?.language, "zh-CN");
    assert.equal(requests[0].parameter?.updateScope, "refresh");
    assert.equal(requests[0].parameter?.updateMode, "update_full");
  });

  it("loads create/update topic synthesis from the builtin synthesis-layer workflow package", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const createWorkflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "create-topic-synthesis",
    );
    const updateWorkflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "update-topic-synthesis",
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
    assert.equal(
      createWorkflow?.manifest.request?.create?.skill_id,
      "create-topic-synthesis",
    );
    assert.equal(
      updateWorkflow?.manifest.request?.create?.skill_id,
      "update-topic-synthesis",
    );
  });

  it("ships create/update topic synthesis workflows in the packaged builtin manifest", async function () {
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
    assert.include(
      files,
      "synthesis-layer/update-topic-synthesis/workflow.json",
    );
    assert.include(
      files,
      "synthesis-layer/hooks/applyTopicSynthesisResult.mjs",
    );
    assert.notInclude(files, "synthesis-layer/synthesize-topic/workflow.json");
  });

  it("registers a builtin create-topic-synthesis skill with an output schema", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["create-topic-synthesis"];

    assert.isOk(entry);
    assert.equal(entry.sourceKind, "builtin");

    const validation = await validateAcpSkillFinalPayload({
      payload: validSkillOutputBundle(),
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isTrue(validation.ok, validation.errors.join("; "));
  });

  it("accepts canceled create-topic-synthesis output without requiring a markdown artifact", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["create-topic-synthesis"];
    const validation = await validateAcpSkillFinalPayload({
      payload: canceledSkillOutputBundle(),
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isTrue(validation.ok, validation.errors.join("; "));
  });

  it("validates ACP skill output without relying on global console", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["create-topic-synthesis"];
    const originalConsole = (globalThis as { console?: Console }).console;

    try {
      delete (globalThis as { console?: Console }).console;
      const validation = await validateAcpSkillFinalPayload({
        payload: validSkillOutputBundle(),
        runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
        primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
      });

      assert.isTrue(validation.ok, validation.errors.join("; "));
    } finally {
      (globalThis as { console?: Console }).console = originalConsole;
    }
  });

  it("ships and documents the create topic synthesis section-manifest contract", async function () {
    const skillText = await fs.readFile(
      "skills_builtin/create-topic-synthesis/SKILL.md",
      "utf8",
    );
    const resolverSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis/assets/schemas/topic_analysis_manifest.schema.json",
        "utf8",
      ),
    );

    assert.include(skillText, "zotero-bridge synthesis list-topics");
    assert.include(skillText, "title/description/aliases");
    assert.include(skillText, "ACP interactive confirmation");
    assert.include(skillText, "analysis_manifest_path");
    assert.include(skillText, "result/topic-analysis.json");
    assert.include(
      skillText,
      "zotero-bridge synthesis get-citation-graph-metrics",
    );
    assert.include(skillText, "persist_citation_graph_metrics");
    assert.include(
      skillText,
      "zotero-bridge synthesis export-filtered-paper-artifacts",
    );
    assert.include(skillText, "persist_filtered_artifact_manifest");
    assert.include(skillText, "export_cross_paper_context");
    assert.include(skillText, "cross-paper-context.md");
    assert.include(skillText, "external-literature-context.md");
    assert.include(skillText, "result/sections/*.json");
    assert.include(skillText, "statistics");
    assert.include(skillText, "synthesis_report");
    assert.include(skillText, "研究路线分析");
    assert.include(skillText, "历史沿革分析");
    assert.include(skillText, "coverage_verdict");
    assert.include(skillText, "digest-markdown");
    assert.include(skillText, "references-json");
    assert.include(skillText, "citation-analysis-json");
    assert.include(skillText, "graph_metrics_interpretation");
    assert.include(skillText, "不能替代 digest evidence");
    assert.include(skillText, "bounded");
    assert.notInclude(skillText, "synthesis.validate_resolver");
    assert.notInclude(skillText, "synthesis.query_citation_graph");
    assert.include(
      skillText,
      "zotero-bridge synthesis export-filtered-paper-artifacts",
    );
    assert.notInclude(skillText, "synthesis.export_paper_artifact_bundle");
    assert.notInclude(skillText, "synthesis.read_paper_artifacts");
    assert.notInclude(skillText, "`markdown` must contain");
    assert.include(resolverSchema.required, "sections");
    assert.include(resolverSchema.required, "language");

    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const manifest = await buildAcpSkillResourceManifest(
      registry.entriesById["create-topic-synthesis"],
    );
    assert.include(
      manifest.files.map((file) => file.relativePath),
      "assets/output.schema.json",
    );
  });

  it("documents semantic duplicate detection before create-mode synthesis", async function () {
    const skillText = await fs.readFile(
      "skills_builtin/create-topic-synthesis/SKILL.md",
      "utf8",
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis/assets/runner.json",
        "utf8",
      ),
    );

    assert.match(
      skillText,
      /topicSeed[\s\S]+zotero-bridge synthesis list-topics/,
    );
    assert.match(skillText, /title\/description\/aliases/);
    assert.match(skillText, /疑似重复[\s\S]+topic_synthesis_canceled/);
    assert.notInclude(skillText, "可建议改用 update-topic-synthesis");
    assert.match(skillText, /取消[\s\S]+topic_synthesis_canceled/);
    assert.match(skillText, /不得内嵌 `markdown`/);
    assert.match(skillText, /zotero-bridge synthesis resolve-resolver/);
    assert.include(runner.entrypoint.prompts.common, "SKILL.md");
    assert.include(runner.entrypoint.prompts.common, "next_action");
    assert.include(runner.entrypoint.prompts.common, "instruction_refs");
    assert.include(runner.entrypoint.prompts.common, "schema_refs");
    assert.include(runner.entrypoint.prompts.common, "scripts/gate_runtime.py");
    assert.notInclude(
      runner.entrypoint.prompts.common,
      "topic-synthesis-runtime",
    );
  });

  it("ships package-local runtime resources for create and update topic synthesis skills", async function () {
    const requiredRelativePaths = [
      "scripts/gate_runtime.py",
      "scripts/stage_runtime.py",
      "scripts/runtime_db.py",
      "references/step_05_paper_units.md",
      "references/step_06_cross_paper_map.md",
      "references/step_07_taxonomy_timeline.md",
      "references/step_08_core_sections.md",
      "references/step_09_kg_proposals.md",
      "references/step_10_external_statistics_report.md",
      "references/step_11_render_validate.md",
      "references/topic_synthesis_content_contract.md",
      "references/section_examples.md",
      "assets/schemas/topic_context_payload.schema.json",
      "assets/schemas/resolver_manifest.schema.json",
      "assets/schemas/citation_graph_metrics_receipt.schema.json",
      "assets/schemas/filtered_artifact_manifest.schema.json",
      "assets/schemas/route_timeline_synthesis.schema.json",
      "assets/schemas/core_analytical_sections.schema.json",
      "assets/schemas/topic_analysis_manifest.schema.json",
      "assets/schemas/topic_section_patch_manifest.schema.json",
      "assets/schemas/topic_synthesis_artifact.schema.json",
    ];
    const skillRoots = [
      "skills_builtin/create-topic-synthesis",
      "skills_builtin/update-topic-synthesis",
    ];

    for (const skillRoot of skillRoots) {
      for (const relativePath of requiredRelativePaths) {
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

  it("documents minimum executable SKILL instructions, host dependency, script calls, and optional references", async function () {
    const createSkill = await fs.readFile(
      "skills_builtin/create-topic-synthesis/SKILL.md",
      "utf8",
    );
    const updateSkill = await fs.readFile(
      "skills_builtin/update-topic-synthesis/SKILL.md",
      "utf8",
    );

    for (const skillText of [createSkill, updateSkill]) {
      assert.include(skillText, "## 产品目标与质量标准");
      assert.include(skillText, "## 核心执行指令");
      assert.include(skillText, "## 输入输出硬契约");
      assert.include(skillText, "## 运行时硬合同");
      assert.include(skillText, "## 状态机与 Gate 纪律");
      assert.include(skillText, "## 最小执行主路径");
      assert.include(skillText, "禁止");
      assert.include(skillText, "信息密集型 topic 知识窗口");
      assert.include(skillText, "Introduction");
      assert.include(skillText, "Related Work");
      assert.include(skillText, "不是字段填空");
      assert.include(skillText, "支持综述写作");
      assert.include(skillText, "研究路线分析");
      assert.include(skillText, "历史递进逻辑");
      assert.include(skillText, "synthesis-level finding");
      assert.include(skillText, "库内覆盖不足");
      assert.include(skillText, "外部文献用于背景、覆盖判断和入库建议");
      assert.include(skillText, "topic_synthesis_canceled");
      assert.include(skillText, "zotero-bridge synthesis");
      assert.include(skillText, "scripts/gate_runtime.py");
      assert.include(skillText, "scripts/stage_runtime.py");
      assert.include(
        skillText,
        'python scripts/gate_runtime.py --db "runtime/topic-synthesis.sqlite"',
      );
      assert.include(
        skillText,
        'python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --action cancel',
      );
      assert.include(skillText, "SQLite");
      assert.include(skillText, "runtime/topic-synthesis.sqlite");
      assert.include(skillText, "prompt memory");
      assert.include(skillText, "stage_0_runtime_setup");
      assert.include(skillText, "stage_12_completed");
      assert.include(skillText, "artifact_registry");
      assert.include(skillText, "只执行 gate 返回的 `next_action`");
      assert.include(
        skillText,
        "zotero-bridge synthesis get-citation-graph-metrics",
      );
      assert.include(skillText, "persist_citation_graph_metrics");
      assert.include(skillText, "graph_metrics_interpretation");
      assert.include(skillText, "Topic Synthesis 内容合同");
      assert.include(skillText, "synthesis_report");
      assert.include(skillText, "语义目标");
      assert.include(skillText, "提供可组合证据");
      assert.include(skillText, "候选证据网络");
      assert.include(skillText, "连续知识报告");
      assert.include(skillText, "按需读取附录");
      assert.notInclude(skillText, "references/runtime_contract.md");
      assert.include(skillText, "references/step_05_paper_units.md");
      assert.include(skillText, "sidecars");
      assert.include(skillText, "concept_cards_proposal");
      assert.include(skillText, "topic_graph_relation_proposals");
      assert.include(
        skillText,
        "references/topic_synthesis_content_contract.md",
      );
      assert.notInclude(skillText, "后台自动化纪律");
      assert.notInclude(skillText, "不得向用户提问");
      assert.notInclude(skillText, "host preflight 注入");
      assert.notInclude(skillText, ".claude/settings");
      assert.notMatch(skillText, /详见\s+references?[\s\S]{0,20}后再执行/);
    }

    assert.include(createSkill, "topicSeed");
    assert.include(createSkill, "zotero-bridge synthesis list-topics");
    assert.include(createSkill, "zotero-bridge synthesis resolve-resolver");
    assert.include(createSkill, "zotero-bridge synthesis get-library-index");
    assert.include(
      createSkill,
      "zotero-bridge synthesis get-citation-graph-metrics",
    );
    assert.include(createSkill, "persist_library_index_page");
    assert.include(createSkill, "has_more");
    assert.include(createSkill, "index_hash");
    assert.include(createSkill, "duplicate check");
    assert.include(createSkill, "不要用全文相似度臆断重复");
    assert.notInclude(createSkill, "update_full");
    assert.notInclude(createSkill, "update_patch");
    assert.include(
      createSkill,
      'python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation create --language "zh-CN" --action validate_final_artifacts',
    );

    assert.include(updateSkill, "topicId");
    assert.include(updateSkill, "updateScope");
    assert.include(updateSkill, "updateMode");
    assert.include(updateSkill, "updateReason");
    assert.include(updateSkill, "zotero-bridge synthesis get-topic-context");
    assert.include(updateSkill, "zotero-bridge synthesis resolve-resolver");
    assert.include(updateSkill, "recommended_update");
    assert.include(updateSkill, "Patch 模式不得静默改变 paper set");
    assert.notInclude(updateSkill, "synthesis list-topics --input '{}'");
    assert.notInclude(updateSkill, "duplicate check。写");
    assert.include(
      updateSkill,
      'python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation update_full --language "zh-CN" --action validate_final_artifacts',
    );
    assert.include(
      updateSkill,
      'python scripts/stage_runtime.py --db "runtime/topic-synthesis.sqlite" --run-root "." --operation update_patch --language "zh-CN" --action validate_final_artifacts',
    );
  });

  it("documents update topic synthesis context, mode selection, and section patch rules", async function () {
    const skillText = await fs.readFile(
      "skills_builtin/update-topic-synthesis/SKILL.md",
      "utf8",
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/update-topic-synthesis/assets/runner.json",
        "utf8",
      ),
    );

    assert.include(skillText, "zotero-bridge synthesis get-topic-context");
    assert.include(skillText, "recommended_update");
    assert.include(skillText, "update_full");
    assert.include(skillText, "update_patch");
    assert.include(skillText, "section_patch");
    assert.include(skillText, "read_section_hashes");
    assert.include(skillText, "result/topic-analysis.patch.json");
    assert.match(skillText, /不得内嵌 `markdown`/);
    assert.include(runner.entrypoint.prompts.common, "SKILL.md");
    assert.include(runner.entrypoint.prompts.common, "next_action");
    assert.include(runner.entrypoint.prompts.common, "instruction_refs");
    assert.include(runner.entrypoint.prompts.common, "scripts/gate_runtime.py");
    assert.notInclude(
      runner.entrypoint.prompts.common,
      "topic-synthesis-runtime",
    );
  });

  it("rejects ACP skill output that embeds markdown in final JSON", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["create-topic-synthesis"];
    const validation = await validateAcpSkillFinalPayload({
      payload: {
        ...validSkillOutputBundle(),
        markdown: "# Should not be embedded",
      },
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isFalse(validation.ok);
    assert.match(validation.errors.join("\n"), /must NOT be valid|markdown/i);
  });

  it("accepts valid topic synthesis result bundles", function () {
    const result = validateSynthesisResultBundle(validBundle());

    assert.isTrue(result.ok);
    assert.equal(result.bundle.kind, "topic_synthesis");
  });

  it("rejects unsupported synthesis kinds", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...validBundle(),
          kind: "method_synthesis",
        }),
      /topic_synthesis/i,
    );
  });

  it("rejects direct write instructions from agents", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...validBundle(),
          write_zotero_raw_source: true,
        }),
      /direct write/i,
    );
  });

  it("allows apply when base hashes match", function () {
    const decision = decideSynthesisApply({
      bundle: validBundle(),
      currentHashes: {
        artifact: "sha256:a",
        metadata: "sha256:b",
        index: "sha256:c",
      },
    });

    assert.equal(decision.action, "persist");
  });

  it("allows create when only the aggregate index hash changed", function () {
    const decision = decideSynthesisApply({
      bundle: {
        ...validBundle(),
        mode: "create",
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
      bundle: validBundle(),
      currentHashes: {
        artifact: "sha256:changed",
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
    base_hashes: {
      manifest: "",
      artifact: "",
      export: "",
      metadata: "",
      index: "",
    },
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

function v2PatchBundle(overrides: Record<string, unknown> = {}) {
  return {
    kind: "topic_synthesis",
    operation: "update_patch",
    topic_id: "object-detection",
    language: "zh-CN",
    base_hashes: {
      manifest: "sha256:manifest",
      artifact: "sha256:artifact",
      export: "sha256:export",
      metadata: "sha256:metadata",
      index: "sha256:index",
    },
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

describe("Synthesize topic workflow v2 structured contract", function () {
  it("declares separate create and update topic synthesis skills", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const workflowIds = loaded.workflows.map((entry) => entry.manifest.id);

    assert.include(workflowIds, "create-topic-synthesis");
    assert.include(workflowIds, "update-topic-synthesis");
    assert.property(registry.entriesById, "create-topic-synthesis");
    assert.property(registry.entriesById, "update-topic-synthesis");
    assert.notProperty(registry.entriesById, "synthesize-topic");
    assert.isFalse(
      registry.diagnostics.some((entry) => entry.level === "error"),
      `registry should not report error diagnostics: ${JSON.stringify(registry.diagnostics)}`,
    );
  });

  it("accepts create and full-update bundles with section manifests and no markdown preview dependency", function () {
    for (const operation of ["create", "update_full"] as const) {
      const result = validateSynthesisResultBundle(
        v2CompleteBundle({
          operation,
        }),
      );

      assert.isTrue(result.ok);
      assert.equal((result.bundle as any).operation, operation);
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

  it("rejects v2 final bundles without topic_definition.id or resolver manifest path", function () {
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
            resolver_manifest_path: "",
          }),
        ),
      /resolver_manifest_path/i,
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

  it("rejects v2 final bundles missing required section manifest paths", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle(
          v2CompleteBundle({
            analysis_manifest_path: "",
          }),
        ),
      /analysis_manifest_path|section manifest/i,
    );
  });

  it("keeps update workflow user input limited to topicId and derives update parameters in the build hook", async function () {
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
    assert.equal(updateWorkflow.hooks?.buildRequest, "hooks/buildRequest.mjs");
  });

  it("documents and packages required KG proposal sidecars", async function () {
    const createSkill = await fs.readFile(
      "skills_builtin/create-topic-synthesis/SKILL.md",
      "utf8",
    );
    const updateSkill = await fs.readFile(
      "skills_builtin/update-topic-synthesis/SKILL.md",
      "utf8",
    );
    const createRuntime = await fs.readFile(
      "skills_builtin/create-topic-synthesis/scripts/stage_runtime.py",
      "utf8",
    );
    const createSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis/assets/output.schema.json",
        "utf8",
      ),
    );
    const createKgSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis/assets/schemas/kg_proposals.schema.json",
        "utf8",
      ),
    );
    const updateKgSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/update-topic-synthesis/assets/schemas/kg_proposals.schema.json",
        "utf8",
      ),
    );

    assert.include(createSkill, "persist_kg_proposals");
    assert.include(createSkill, "result/sidecars/concept-cards-proposal.json");
    assert.include(
      createSkill,
      "result/sidecars/topic-graph-relation-proposals.json",
    );
    assert.include(createSkill, "topic_interest_metadata");
    assert.include(createSkill, "result/sidecars/topic-interest-metadata.json");
    assert.include(updateSkill, "topic_interest_metadata");
    assert.include(updateSkill, "result/sidecars/topic-interest-metadata.json");
    assert.notInclude(createSkill, "stage_5_6_topic_graph_relation_proposals");
    assert.notInclude(createSkill, "stage_5_5_concept_cards");
    assert.include(createSkill, "sidecars");
    assert.include(updateSkill, "broader_topic_candidate");
    assert.include(updateSkill, "canonical concept");
    assert.include(createRuntime, "topic_graph_relation_proposals_path");
    assert.include(createRuntime, "topic_interest_metadata_path");
    assert.include(createRuntime, "concept_cards_proposal_path");
    assert.include(createRuntime, "persist_kg_proposals");
    assert.notInclude(
      JSON.stringify(createSchema),
      "topic_graph_relation_proposals_path",
    );
    assert.notInclude(
      JSON.stringify(createSchema),
      "topic_interest_metadata_path",
    );
    assert.notInclude(
      JSON.stringify(createSchema),
      "concept_cards_proposal_path",
    );
    assert.include(JSON.stringify(createKgSchema), "topic_interest_metadata");
    assert.include(JSON.stringify(updateKgSchema), "topic_interest_metadata");
  });
});
