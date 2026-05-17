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

describe("Synthesize topic workflow contract", function () {
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

    assert.equal(createWorkflow.request?.create?.skill_id, "create-topic-synthesis");
    assert.equal(updateWorkflow.request?.create?.skill_id, "update-topic-synthesis");
    assert.equal(createWorkflow.inputs?.unit, "workflow");
    assert.equal(updateWorkflow.inputs?.unit, "workflow");
    assert.equal(createWorkflow.taskNameTemplate, "Create synthesis: {topic seed}");
    assert.equal(updateWorkflow.taskNameTemplate, "Update synthesis: {topicId}");
    assert.deepEqual(createWorkflow.execution?.supportedBackends, ["acp"]);
    assert.deepEqual(updateWorkflow.execution?.supportedBackends, ["acp"]);
    assert.sameMembers(createWorkflow.execution?.mcp?.requiredTools || [], [
      "synthesis.list_topics",
      "synthesis.get_library_index",
      "synthesis.resolve_resolver",
      "synthesis.export_paper_artifact_bundle",
    ]);
    assert.sameMembers(updateWorkflow.execution?.mcp?.requiredTools || [], [
      "synthesis.get_topic_context",
      "synthesis.resolve_resolver",
      "synthesis.export_paper_artifact_bundle",
    ]);
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
    assert.deepEqual((requests[0] as any).runtime_options?.workflow_mcp, {
      required_tools: [
        "synthesis.list_topics",
        "synthesis.get_library_index",
        "synthesis.resolve_resolver",
        "synthesis.export_paper_artifact_bundle",
      ],
    });
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
    assert.equal(requests[0].taskName, "Update synthesis: object-detection");
    assert.equal(requests[0].targetParentID, 8);
    assert.deepEqual(requests[0].sourceAttachmentPaths, [
      "D:/papers/conditional-detr.md",
      "D:/papers/conditional-detr.pdf",
    ]);
    assert.equal(requests[0].parameter?.topicId, "object-detection");
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
    assert.equal(createWorkflow?.manifest.request?.create?.skill_id, "create-topic-synthesis");
    assert.equal(updateWorkflow?.manifest.request?.create?.skill_id, "update-topic-synthesis");
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
    assert.include(files, "synthesis-layer/hooks/applyTopicSynthesisResult.mjs");
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
    const skillText = await fs.readFile("skills_builtin/create-topic-synthesis/SKILL.md", "utf8");
    const resolverSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/create-topic-synthesis/assets/schemas/topic_analysis_manifest.schema.json",
        "utf8",
      ),
    );

    assert.include(skillText, "synthesis.list_topics");
    assert.include(skillText, "title/description/aliases");
    assert.include(skillText, "ACP interactive confirmation");
    assert.include(skillText, "analysis_manifest_path");
    assert.include(skillText, "result/topic-analysis.json");
    assert.include(skillText, "synthesis.export_paper_artifact_bundle");
    assert.include(skillText, "persist_paper_artifact_bundle");
    assert.include(skillText, "export_cross_paper_context");
    assert.include(skillText, "digest-markdown");
    assert.include(skillText, "references-json");
    assert.include(skillText, "citation-analysis-json");
    assert.include(skillText, "bounded");
    assert.notInclude(skillText, "synthesis.validate_resolver");
    assert.notInclude(skillText, "synthesis.query_citation_graph");
    assert.include(skillText, "`synthesis.export_paper_artifact_bundle`");
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
    const skillText = await fs.readFile("skills_builtin/create-topic-synthesis/SKILL.md", "utf8");
    const runner = JSON.parse(
      await fs.readFile("skills_builtin/create-topic-synthesis/assets/runner.json", "utf8"),
    );

    assert.match(skillText, /topicSeed[\s\S]+synthesis\.list_topics/);
    assert.match(skillText, /title\/description\/aliases/);
    assert.match(skillText, /疑似重复[\s\S]+update-topic-synthesis/);
    assert.match(skillText, /取消[\s\S]+topic_synthesis_canceled/);
    assert.match(skillText, /不得内嵌 `markdown`/);
    assert.match(skillText, /synthesis\.resolve_resolver/);
    assert.include(runner.entrypoint.prompts.common, "synthesis.list_topics");
    assert.include(runner.entrypoint.prompts.common, "title/description/aliases");
    assert.include(runner.entrypoint.prompts.common, "scripts/gate_runtime.py");
    assert.include(runner.entrypoint.prompts.common, "references/create_workflow_playbook.md");
    assert.notInclude(runner.entrypoint.prompts.common, "topic-synthesis-runtime");
  });

  it("ships package-local runtime resources for create and update topic synthesis skills", async function () {
    const requiredRelativePaths = [
      "scripts/gate_runtime.py",
      "scripts/stage_runtime.py",
      "scripts/runtime_db.py",
      "references/paper_analysis_playbook.md",
      "references/section_authoring_contract.md",
      "assets/schemas/topic_analysis_manifest.schema.json",
      "assets/schemas/topic_section_patch_manifest.schema.json",
      "assets/schemas/topic_synthesis_artifact.schema.json",
      "assets/templates/export_markdown.md.j2",
    ];
    const skillRoots = [
      "skills_builtin/create-topic-synthesis",
      "skills_builtin/update-topic-synthesis",
    ];

    for (const skillRoot of skillRoots) {
      for (const relativePath of requiredRelativePaths) {
        await fs.readFile(path.join(skillRoot, relativePath), "utf8");
      }
      const skillText = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
      const runnerText = await fs.readFile(path.join(skillRoot, "assets/runner.json"), "utf8");
      assert.notInclude(skillText, "topic-synthesis-runtime");
      assert.notInclude(runnerText, "topic-synthesis-runtime");
      assert.include(runnerText, "\"required_tools\"");
      assert.notInclude(runnerText, "synthesis.read_paper_artifacts");
    }

    await fs.readFile(
      "skills_builtin/create-topic-synthesis/references/create_workflow_playbook.md",
      "utf8",
    );
    await fs.readFile(
      "skills_builtin/update-topic-synthesis/references/update_workflow_playbook.md",
      "utf8",
    );
  });

  it("documents minimum executable SKILL instructions, MCP dependency, script calls, and optional references", async function () {
    const createSkill = await fs.readFile("skills_builtin/create-topic-synthesis/SKILL.md", "utf8");
    const updateSkill = await fs.readFile("skills_builtin/update-topic-synthesis/SKILL.md", "utf8");

    for (const skillText of [createSkill, updateSkill]) {
      assert.include(skillText, "## 输入契约");
      assert.include(skillText, "## 输出契约");
      assert.include(skillText, "## MCP 服务依赖");
      assert.include(skillText, "## 包内脚本调用");
      assert.include(skillText, "## 运行时硬合同");
      assert.include(skillText, "## 最小执行主路径");
      assert.include(skillText, "禁止");
      assert.include(skillText, "MCP 服务提供");
      assert.include(skillText, "Host 会在正式执行前完成 MCP availability check 和 callable smoke");
      assert.include(skillText, "不要自行搜索");
      assert.include(skillText, "topic_synthesis_canceled");
      assert.match(skillText, /mcp_unavailable|required_mcp_tool_unavailable/);
      assert.include(skillText, "scripts/gate_runtime.py");
      assert.include(skillText, "scripts/stage_runtime.py");
      assert.include(skillText, "scripts/runtime_db.py");
      assert.include(skillText, "python scripts/gate_runtime.py --db \"runtime/topic-synthesis.sqlite\"");
      assert.include(skillText, "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --action gate");
      assert.include(skillText, "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --action cancel");
      assert.include(skillText, "没有独立 CLI");
      assert.include(skillText, "不要直接运行");
      assert.include(skillText, "SQLite SSOT");
      assert.include(skillText, "runtime/topic-synthesis.sqlite");
      assert.include(skillText, "prompt memory");
      assert.include(skillText, "stage_0_bootstrap");
      assert.include(skillText, "stage_7_completed");
      assert.include(skillText, "pending");
      assert.include(skillText, "running");
      assert.include(skillText, "completed");
      assert.include(skillText, "failed_retryable");
      assert.include(skillText, "failed_terminal");
      assert.include(skillText, "canceled");
      assert.include(skillText, "artifact_registry");
      assert.include(skillText, "partial/unregistered output");
      assert.include(skillText, "只执行 gate 返回的 `next_action`");
      assert.include(skillText, "可选扩展");
      assert.include(skillText, "不是执行硬约束");
      assert.notInclude(skillText, "references/runtime_contract.md");
      assert.include(skillText, "references/paper_analysis_playbook.md");
      assert.include(skillText, "references/section_authoring_contract.md");
      assert.notInclude(skillText, "后台自动化纪律");
      assert.notInclude(skillText, "不得向用户提问");
      assert.notInclude(skillText, "host preflight 注入");
      assert.notInclude(skillText, ".claude/settings");
      assert.notMatch(skillText, /详见\s+references?[\s\S]{0,20}后再执行/);
    }

    assert.include(createSkill, "topicSeed");
    assert.include(createSkill, "synthesis.list_topics");
    assert.include(createSkill, "synthesis.resolve_resolver");
    assert.include(createSkill, "synthesis.get_library_index");
    assert.include(createSkill, "persist_library_index_page");
    assert.include(createSkill, "has_more");
    assert.include(createSkill, "index_hash");
    assert.include(createSkill, "references/create_workflow_playbook.md");
    assert.include(
      createSkill,
      "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --run-root \".\" --operation create --language \"zh-CN\" --action render",
    );

    assert.include(updateSkill, "topicId");
    assert.include(updateSkill, "updateScope");
    assert.include(updateSkill, "updateMode");
    assert.include(updateSkill, "updateReason");
    assert.include(updateSkill, "synthesis.get_topic_context");
    assert.include(updateSkill, "synthesis.resolve_resolver");
    assert.include(updateSkill, "recommended_update");
    assert.include(updateSkill, "references/update_workflow_playbook.md");
    assert.include(
      updateSkill,
      "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --run-root \".\" --operation update_full --language \"zh-CN\" --action render",
    );
    assert.include(
      updateSkill,
      "python scripts/stage_runtime.py --db \"runtime/topic-synthesis.sqlite\" --run-root \".\" --operation update_patch --language \"zh-CN\" --action render",
    );
  });

  it("documents update topic synthesis context, mode selection, and section patch rules", async function () {
    const skillText = await fs.readFile("skills_builtin/update-topic-synthesis/SKILL.md", "utf8");
    const runner = JSON.parse(
      await fs.readFile("skills_builtin/update-topic-synthesis/assets/runner.json", "utf8"),
    );

    assert.include(skillText, "synthesis.get_topic_context");
    assert.include(skillText, "recommended_update");
    assert.include(skillText, "update_full");
    assert.include(skillText, "update_patch");
    assert.include(skillText, "section_patch");
    assert.include(skillText, "read_section_hashes");
    assert.include(skillText, "result/topic-analysis.patch.json");
    assert.match(skillText, /不得内嵌 `markdown`/);
    assert.include(runner.entrypoint.prompts.common, "synthesis.get_topic_context");
    assert.include(runner.entrypoint.prompts.common, "recommended_update");
    assert.include(runner.entrypoint.prompts.common, "scripts/gate_runtime.py");
    assert.include(runner.entrypoint.prompts.common, "references/update_workflow_playbook.md");
    assert.notInclude(runner.entrypoint.prompts.common, "topic-synthesis-runtime");
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
    topic_resolver: {
      mode: "tag_query",
      query: { and: ["topic:object-detection"] },
    },
    resolved_paper_set: {
      papers: [{ paper_ref: "1:DETR", match_reasons: ["tag"] }],
    },
    resolver_diagnostics: {
      final_count: 1,
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:DETR"],
        artifacts: ["digest-markdown", "references-json", "citation-analysis-json"],
      },
    },
    analysis_manifest_path: "result/topic-analysis.json",
    markdown_path: "result/preview.md",
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

  it("accepts create and full-update bundles with section manifests and optional markdown preview paths", function () {
    for (const operation of ["create", "update_full"] as const) {
      const result = validateSynthesisResultBundle(
        v2CompleteBundle({
          operation,
          markdown_path: "result/preview.md",
        }),
      );

      assert.isTrue(result.ok);
      assert.equal((result.bundle as any).operation, operation);
      assert.equal((result.bundle as any).analysis_manifest_path, "result/topic-analysis.json");
      assert.equal((result.bundle as any).language, "zh-CN");
    }
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

  it("propagates language through create and update workflow parameters", async function () {
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
    assert.include(JSON.stringify(updateWorkflow), "language");
    assert.include(JSON.stringify(updateWorkflow), "updateScope");
    assert.include(JSON.stringify(updateWorkflow), "updateMode");
  });
});
