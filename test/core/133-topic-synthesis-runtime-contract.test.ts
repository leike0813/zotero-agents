import { assert } from "chai";
import fs from "fs/promises";
import path from "path";

const skillRuntimeRoots = [
  path.join("skills_builtin", "create-topic-synthesis"),
  path.join("skills_builtin", "update-topic-synthesis"),
];

const referenceFiles = [
  "references/paper_analysis_playbook.md",
  "references/section_authoring_contract.md",
];

async function readRequiredRuntimeFile(runtimeRoot: string, relativePath: string) {
  const fullPath = path.join(runtimeRoot, relativePath);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch (error) {
    assert.fail(
      `expected package-local Topic Synthesis Runtime file to exist: ${fullPath}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

describe("Topic synthesis runtime contract", function () {
  it("ships package-local gated runtime resources in both create and update skills", async function () {
    const commonRequiredPaths = [
      "scripts/gate_runtime.py",
      "scripts/stage_runtime.py",
      "scripts/runtime_db.py",
      "assets/schemas/topic_analysis_manifest.schema.json",
      "assets/schemas/topic_section_patch_manifest.schema.json",
      "assets/schemas/topic_synthesis_artifact.schema.json",
      "assets/templates/export_markdown.md.j2",
      "references/paper_analysis_playbook.md",
      "references/section_authoring_contract.md",
    ];

    for (const runtimeRoot of skillRuntimeRoots) {
      for (const relativePath of commonRequiredPaths) {
        await readRequiredRuntimeFile(runtimeRoot, relativePath);
      }
    }
    await readRequiredRuntimeFile(
      path.join("skills_builtin", "create-topic-synthesis"),
      "references/create_workflow_playbook.md",
    );
    await readRequiredRuntimeFile(
      path.join("skills_builtin", "update-topic-synthesis"),
      "references/update_workflow_playbook.md",
    );
  });

  it("does not reference the retired shared runtime package from skill entrypoints or runners", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const skillText = await readRequiredRuntimeFile(runtimeRoot, "SKILL.md");
      const runnerText = await readRequiredRuntimeFile(runtimeRoot, "assets/runner.json");

      assert.notInclude(skillText, "topic-synthesis-runtime");
      assert.notInclude(runnerText, "topic-synthesis-runtime");
    }
  });

  it("defines create/update stage progression and gate-only next actions", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const gate = await readRequiredRuntimeFile(runtimeRoot, "scripts/gate_runtime.py");

      for (const stage of [
        "stage_0_bootstrap",
        "stage_1_topic_intent",
        "stage_2_resolver",
        "stage_3_paper_workset",
        "stage_4_per_paper_analysis",
        "stage_5_cross_paper_synthesis",
        "stage_6_render_and_validate",
        "stage_7_completed",
      ]) {
        assert.include(gate, stage, `${runtimeRoot} should define ${stage}`);
      }
      assert.include(gate, "next_action");
      assert.include(gate, "execution_note");
      assert.include(gate, "command_example");
      assert.include(gate, "required_reads");
      assert.include(gate, "required_writes");
      assert.include(gate, "progress");
      assert.include(gate, "paper_ref");
      assert.match(gate, /resolver[\s\S]+paper artifact/i);
      assert.match(gate, /paper workset[\s\S]+per-paper/i);
    }
  });

  it("persists failure, resume, cancellation, and schema mismatch states in SQLite", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");

      for (const state of [
        "pending",
        "running",
        "completed",
        "failed_retryable",
        "failed_terminal",
        "canceled",
      ]) {
        assert.include(runtimeDb, state);
      }
      assert.include(runtimeDb, "schema_version");
      assert.include(stageRuntime, "resume");
      assert.include(stageRuntime, "failed_retryable");
      assert.include(stageRuntime, "failed_terminal");
      assert.include(stageRuntime, "topic_synthesis_canceled");
    }
  });

  it("uses deterministic action receipts for retried external actions", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");

      assert.include(runtimeDb, "action_receipts");
      assert.match(stageRuntime, /deterministic.+action/i);
      assert.match(stageRuntime, /idempotent|idempotency/i);
    }
  });

  it("rejects partial or unregistered section, manifest, and stdout files as final outputs", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");

      assert.include(runtimeDb, "artifact_registry");
      assert.include(stageRuntime, "stage_7_completed");
      assert.match(stageRuntime, /registered[\s\S]+final stdout/i);
      assert.match(stageRuntime, /partial[\s\S]+invalid/i);
    }
  });

  it("validates section files, renders markdown export, and writes final stdout", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const outputSchema = await readRequiredRuntimeFile(runtimeRoot, "assets/output.schema.json");

      assert.include(stageRuntime, "topic-analysis.json");
      assert.include(stageRuntime, "topic-analysis.patch.json");
      assert.include(stageRuntime, "export.md");
      assert.include(stageRuntime, "paper_evidence");
      assert.include(stageRuntime, "timeline_events");
      assert.include(stageRuntime, "coverage");
      assert.match(stageRuntime, /validated result\/sections files/i);
      assert.notInclude(stageRuntime, "render_from_sqlite");
      assert.notInclude(stageRuntime, "render_placeholder_outputs");
      assert.notInclude(stageRuntime, "Pending Topic");
      assert.notInclude(stageRuntime, "待生成的 topic synthesis summary");
      assert.include(stageRuntime, "resolver_manifest_path");
      assert.notInclude(stageRuntime, '"topic_resolver": topic_resolver');
      assert.notInclude(stageRuntime, '"resolved_paper_set": resolved_paper_set');
      assert.include(runtimeDb, "topic_definition.id is required");
      assert.include(runtimeDb, "topic_definition.title is required");
      assert.include(outputSchema, '"resolver_manifest_path"');
      assert.include(outputSchema, '"required": ["id", "title"]');
      assert.notMatch(outputSchema, /"required":\s*\[[\s\S]*"topic_resolver"[\s\S]*"resolved_paper_set"/);
    }
  });

  it("provides formal stage write actions and forbids rendering before required sections exist", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const gate = await readRequiredRuntimeFile(runtimeRoot, "scripts/gate_runtime.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");

      for (const action of [
        "persist_topic_intent",
        "persist_resolver",
        "persist_citation_graph_metrics",
        "persist_filtered_artifact_manifest",
        "persist_paper_analysis",
        "persist_paper_analyses",
        "export_cross_paper_context",
        "validate_final_artifacts",
        "cancel",
      ]) {
        assert.include(stageRuntime, action, `${runtimeRoot} stage runtime should support ${action}`);
        assert.include(gate, action, `${runtimeRoot} gate should provide JIT command for ${action}`);
      }
      assert.notInclude(stageRuntime, "persist_paper_artifact_bundle");
      assert.notInclude(stageRuntime, "persist_paper_artifact_bundles");
      assert.notInclude(stageRuntime, "persist_paper_workset");
      assert.notInclude(stageRuntime, "persist_cross_paper_synthesis");
      assert.notInclude(gate, "persist_paper_artifact_bundle");
      assert.notInclude(gate, "persist_paper_artifact_bundles");
      assert.notInclude(gate, "persist_paper_workset");
      assert.notInclude(gate, "persist_cross_paper_synthesis");
      assert.include(stageRuntime, "--payload-file");
      assert.include(stageRuntime, "--paper-ref");
      if (runtimeRoot.includes("create-topic-synthesis")) {
        assert.include(stageRuntime, "persist_library_index_page");
        assert.include(gate, "persist_library_index_page");
        assert.include(stageRuntime, "library_index_pages");
        assert.match(stageRuntime, /complete paged library index receipt/i);
        assert.match(gate, /persist_library_index_page[\s\S]+synthesis\.get_library_index/);
      }
      assert.include(stageRuntime, "paper_artifact_bundles");
      assert.include(stageRuntime, "citation_graph_metrics");
      assert.include(stageRuntime, "persist_citation_graph_metrics");
      assert.include(stageRuntime, "cross-paper-context.md");
      assert.include(stageRuntime, "external-literature-context.md");
      assert.include(stageRuntime, "cross-paper-context.manifest.json");
      assert.include(stageRuntime, "missing_required_section_files");
      assert.include(stageRuntime, "artifact_registry");
      assert.match(stageRuntime, /hash[\s\S]+registry[\s\S]+mismatch/i);
      assert.match(gate, /missing_required_section_files|blocker|validate_final_artifacts/i);
    }
  });

  it("gates per-paper analysis on host artifact bundle receipts and cross-paper context export", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const gate = await readRequiredRuntimeFile(runtimeRoot, "scripts/gate_runtime.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");

      assert.include(runtimeDb, "paper_artifact_bundles");
      assert.include(runtimeDb, "citation_graph_metrics");
      assert.include(runtimeDb, "persist_citation_graph_metrics");
      assert.include(runtimeDb, "missing_citation_graph_metric_receipt_refs");
      assert.include(runtimeDb, "missing_citation_graph_metrics_action_receipts");
      assert.include(runtimeDb, "Citation Graph Metrics Summary");
      assert.include(runtimeDb, "Citation Graph External Dependency Hint");
      assert.include(runtimeDb, "graph_metrics_interpretation");
      assert.notInclude(runtimeDb, "persist_paper_artifact_bundle");
      assert.notInclude(runtimeDb, "persist_paper_artifact_bundles");
      assert.include(runtimeDb, "persist_filtered_artifact_manifest");
      assert.include(runtimeDb, "persist_paper_analyses");
      assert.include(runtimeDb, "missing_paper_artifact_bundle_refs");
      assert.include(runtimeDb, "missing_paper_artifact_bundle_receipt_refs");
      assert.include(runtimeDb, "missing_paper_analysis_receipt_refs");
      assert.include(runtimeDb, "require_stage4_action_receipts_complete");
      assert.include(runtimeDb, "missing_paper_artifact_bundle_action_receipts");
      assert.include(runtimeDb, "missing_paper_analysis_action_receipts");
      assert.include(runtimeDb, "SHA256_HASH_RE");
      assert.include(runtimeDb, "assert_valid_sha256_hash");
      assert.match(runtimeDb, /sha256:\[a-f0-9\]\{64\}/);
      assert.include(runtimeDb, "ARTIFACT_TYPE_ALIASES");
      assert.include(runtimeDb, "synthesis.export_filtered_paper_artifacts");
      assert.notInclude(runtimeDb, "synthesis.export_paper_artifact_bundle");
      assert.include(runtimeDb, "inject_digest_locator_from_bundle");
      assert.include(runtimeDb, "inject_section_digest_refs");
      assert.include(runtimeDb, "evidence_id_for_paper_ref");
      assert.include(runtimeDb, "inject_paper_evidence_ids_and_refs");
      assert.include(runtimeDb, "strip_hash_fields");
      assert.include(runtimeDb, "payload_types_seen");
      assert.include(runtimeDb, "cannot be missing when host saw");
      assert.include(runtimeDb, "export_cross_paper_context");
      assert.include(runtimeDb, "build_cross_paper_context_views");
      assert.include(runtimeDb, "validate_paper_unit_contract");
      assert.include(runtimeDb, "write_cross_paper_evidence_index");
      assert.include(runtimeDb, "cross-paper-evidence-index.json");
      assert.include(runtimeDb, "persist_cross_paper_evidence_map");
      assert.include(runtimeDb, "validate_cross_paper_evidence_map");
      assert.include(runtimeDb, "cross_paper_evidence_map must be validated before final sections");
      assert.include(runtimeDb, "library_coverage_gap");
      assert.include(runtimeDb, "_artifact_text_from_file");
      assert.include(runtimeDb, "compact_reference_row");
      assert.include(runtimeDb, "citation_analysis.report_md");
      assert.include(runtimeDb, "source_context_hash");
      assert.include(runtimeDb, "external_context_hash");
      assert.match(gate, /persist_filtered_artifact_manifest[\s\S]+synthesis\.export_filtered_paper_artifacts/);
      assert.match(gate, /persist_citation_graph_metrics[\s\S]+synthesis\.get_citation_graph_metrics/);
      assert.include(gate, "BATCH_SIZE = 25");
      assert.include(gate, "paper_refs");
      assert.include(gate, "paper-artifacts-manifest.json");
      assert.match(gate, /persist_paper_analyses[\s\S]+bundle receipt/i);
      assert.match(gate, /persist_paper_analyses[\s\S]+enhanced paper-unit/i);
      assert.match(gate, /draft_cross_paper_evidence_map[\s\S]+cross-paper-evidence-map\.json/);
      assert.match(gate, /persist_paper_analyses[\s\S]+analysis manifest/i);
      assert.include(gate, "without sending hashes through LLM tokens");
      assert.include(gate, "stage4_action_receipts_incomplete");
      assert.include(gate, "direct SQLite rows are not valid state");
      assert.match(gate, /export_cross_paper_context[\s\S]+write_final_sections/);
      assert.match(stageRuntime, /persist_paper_analysis[\s\S]+paper_artifact_bundle/i);
      assert.include(stageRuntime, "action_stage");
      assert.include(stageRuntime, "clear_failed_retryable");
      assert.include(stageRuntime, "direct SQLite rows are not valid state");
      assert.include(stageRuntime, "require_stage4_action_receipts_complete");
      assert.match(stageRuntime, /cross-paper-context\.md[\s\S]+external-literature-context\.md/);
      assert.include(stageRuntime, "validate_cross_paper_evidence_map");
      assert.match(runtimeDb, /source_context_hash[\s\S]+mismatch/i);
      assert.match(stageRuntime, /digest_ref[\s\S]+payload_hash/i);
      assert.include(stageRuntime, "evidence_refs");
      assert.include(runtimeDb, "validate_topic_section_contract");
      assert.include(runtimeDb, "paper_evidence.id is required after runtime evidence-id injection");
      assert.include(runtimeDb, "references missing paper_evidence");
      assert.include(runtimeDb, "external_literature_analysis summary is required");
      assert.include(runtimeDb, "validate_paper_analysis_against_bundle");
      assert.include(runtimeDb, "evidence_available must be false when digest is missing");
      assert.include(runtimeDb, "evidence_available must be true when digest is available");
      assert.include(runtimeDb, "claim_support_candidates when digest is missing");
      assert.include(runtimeDb, "external_references when references-json is missing");
      assert.include(runtimeDb, "citation_contexts when citation-analysis-json is missing");
      assert.notInclude(runtimeDb, "decoded_text");
      assert.include(runtimeDb, "payload_hash");
      assert.include(runtimeDb, "raw HTML");
    }
  });

  it("exports filtered Markdown contexts instead of a full artifact JSON context", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const gate = await readRequiredRuntimeFile(runtimeRoot, "scripts/gate_runtime.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");

      assert.include(runtimeDb, "build_cross_paper_context_views");
      assert.include(runtimeDb, "cross-paper-context.md");
      assert.include(runtimeDb, "external-literature-context.md");
      assert.include(runtimeDb, "cross-paper-context.manifest.json");
      assert.include(runtimeDb, "_artifact_text_from_file");
      assert.include(runtimeDb, "Compact References");
      assert.include(runtimeDb, "Citation Analysis Report");
      assert.include(runtimeDb, "citation_analysis.report_md");
      assert.include(runtimeDb, "references raw");
      assert.notMatch(runtimeDb, /paper_artifact_bundles["']\s*:\s*strip_hash_fields\(bundles\)/);
      assert.match(gate, /cross-paper-context\.md[\s\S]+external-literature-context\.md/);
      assert.notMatch(gate, /use its source_context_hash in cross-paper payload/);
      assert.include(stageRuntime, "content_type=\"markdown\"");
      assert.include(stageRuntime, "content_type=\"json\"");
    }
  });

  it("documents JIT gate-driven writes and per-paper analysis in the SKILL files", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const skillText = await readRequiredRuntimeFile(runtimeRoot, "SKILL.md");

      assert.include(skillText, "command_example");
      assert.include(skillText, "每一步看 gate");
      assert.include(skillText, "persist_topic_intent");
      if (runtimeRoot.includes("create-topic-synthesis")) {
        assert.include(skillText, "persist_library_index_page");
        assert.include(skillText, "has_more");
        assert.include(skillText, "index_hash");
      }
      assert.include(skillText, "persist_resolver");
      assert.notInclude(skillText, "persist_paper_workset");
      assert.include(skillText, "persist_citation_graph_metrics");
      assert.include(skillText, "persist_filtered_artifact_manifest");
      assert.notInclude(skillText, "persist_paper_artifact_bundles");
      assert.notInclude(skillText, "persist_paper_analysis");
      assert.include(skillText, "persist_paper_analyses");
      assert.include(skillText, "paper-level extraction");
      assert.include(skillText, "draft_cross_paper_evidence_map");
      assert.include(skillText, "cross-paper-evidence-map.json");
      assert.include(skillText, "positioning");
      assert.include(skillText, "taxonomy");
      assert.include(skillText, "comparison_matrix");
      assert.include(skillText, "evidence_map_refs");
      assert.include(skillText, "export_cross_paper_context");
      assert.notInclude(skillText, "persist_cross_paper_synthesis");
      assert.include(skillText, "synthesis.export_filtered_paper_artifacts");
      assert.notInclude(skillText, "synthesis.export_paper_artifact_bundle");
      assert.include(skillText, "批量");
      assert.notInclude(skillText, "synthesis.read_paper_artifacts");
      assert.include(skillText, "手写 `payload_hash`");
      assert.include(skillText, "runtime 会注入");
      assert.include(skillText, "paper_ref");
      assert.include(skillText, "缺 artifact");
      assert.include(skillText, "graph_metrics_interpretation");
      assert.include(skillText, "不得把 metrics row 作为 claim/timeline evidence");
      assert.include(skillText, "cross-paper-context.md");
      assert.include(skillText, "external-literature-context.md");
      assert.include(skillText, "--payload-file");
      assert.match(skillText, /filtered artifact[\s\S]+manifest/i);
      assert.notMatch(skillText, /真实语义内容必须由 agent 在渲染前整理到 run-local 结构中/);
      assert.notMatch(skillText, /占位内容/);
      assert.match(skillText, /MCP[\s\S]+artifact probe|artifact probe[\s\S]+MCP/i);
      assert.include(skillText, "final section JSON 写作");
      assert.include(skillText, "validate_final_artifacts");
      if (runtimeRoot.includes("create-topic-synthesis")) {
        assert.include(skillText, "payload 必须包含 papers[]");
        assert.include(skillText, "\"papers\"");
      }
    }
  });

  it("documents package-local script CLI support in the SKILL files", async function () {
    const createSkill = await readRequiredRuntimeFile(
      path.join("skills_builtin", "create-topic-synthesis"),
      "SKILL.md",
    );
    const updateSkill = await readRequiredRuntimeFile(
      path.join("skills_builtin", "update-topic-synthesis"),
      "SKILL.md",
    );

    for (const skillText of [createSkill, updateSkill]) {
      assert.include(skillText, "--action gate");
      assert.include(skillText, "--action validate_final_artifacts");
      assert.include(skillText, "--action cancel");
      assert.include(skillText, "runtime_db.py");
      assert.include(skillText, "没有独立 CLI");
    }
    assert.include(createSkill, "--operation create");
    assert.include(updateSkill, "--operation update_full");
    assert.include(updateSkill, "--operation update_patch");
  });

  it("keeps references Chinese, optional, and example-driven", async function () {
    const createReferences = [
      ...referenceFiles,
      "references/create_workflow_playbook.md",
    ];
    const updateReferences = [
      ...referenceFiles,
      "references/update_workflow_playbook.md",
    ];

    for (const [runtimeRoot, refs] of [
      [path.join("skills_builtin", "create-topic-synthesis"), createReferences],
      [path.join("skills_builtin", "update-topic-synthesis"), updateReferences],
    ] as const) {
      for (const relativePath of refs) {
        const text = await readRequiredRuntimeFile(runtimeRoot, relativePath);
        assert.include(text, "可选扩展材料", `${relativePath} should mark itself optional`);
        assert.include(text, "硬约束以 `SKILL.md` 为准", `${relativePath} should defer hard constraints`);
        assert.match(text, /[\u4e00-\u9fff]/, `${relativePath} should contain Chinese guidance`);
        assert.match(text, /```(json|bash)[\s\S]+```/, `${relativePath} should include concrete examples`);
      }
    }
  });

  it("keeps runtime hard contract in SKILL files instead of references", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const skillText = await readRequiredRuntimeFile(runtimeRoot, "SKILL.md");

      assert.include(skillText, "## 运行时硬合同");
      assert.include(skillText, "failed_retryable");
      assert.include(skillText, "failed_terminal");
      assert.include(skillText, "canceled");
      assert.include(skillText, "artifact_registry");
      assert.include(skillText, "partial/unregistered output");
      await fs
        .access(path.join(runtimeRoot, "references", "runtime_contract.md"))
        .then(
          () => assert.fail(`${runtimeRoot} must not keep runtime_contract.md in references`),
          () => undefined,
        );
    }
  });
});
