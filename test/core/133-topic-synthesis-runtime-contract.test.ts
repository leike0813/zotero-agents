import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRuntimeRoots = [
  path.join("skills_builtin", "create-topic-synthesis"),
  path.join("skills_builtin", "update-topic-synthesis"),
];

const referenceFiles = [
  "references/step_00_runtime_gate.md",
  "references/step_01_topic_context.md",
  "references/step_02_resolver_workset.md",
  "references/step_03_metrics_artifacts.md",
  "references/step_04_paper_units.md",
  "references/step_05_cross_paper_map.md",
  "references/step_06_taxonomy_timeline.md",
  "references/step_07_core_sections.md",
  "references/step_08_external_statistics_report.md",
  "references/step_09_render_validate.md",
  "references/section_examples.md",
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

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function runStageAction(runtimeRoot: string, runRoot: string, args: string[]) {
  const python = process.env.PYTHON || "python";
  const output = execFileSync(
    python,
    [path.resolve(runtimeRoot, "scripts/stage_runtime.py"), ...args],
    { cwd: runRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

async function createMinimalRuntimeWorkspace(runtimeRoot: string) {
  const runRoot = await fs.mkdtemp(path.join(os.tmpdir(), "topic-synthesis-runtime-"));
  const dbPath = path.join("runtime", "topic-synthesis.sqlite");
  const operation = runtimeRoot.includes("update-topic-synthesis") ? "update_full" : "create";
  const hashA = "sha256:" + "a".repeat(64);
  const hashB = "sha256:" + "b".repeat(64);
  const paperRef = "1:DETR";

  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--run-root",
    ".",
    "--operation",
    operation,
    "--language",
    "zh-CN",
    "--action",
    "confirm_runtime_setup",
  ]);

  await writeJsonFile(path.join(runRoot, "runtime/payloads/topic-context.json"), {
    topic_seed: "object detection",
    language: "zh-CN",
    operation,
    topic_definition: { id: "object-detection", title: "Object Detection" },
    duplicate_check: { status: "unique", candidates: [] },
    base_hashes: { manifest: "", artifact: "", export: "", metadata: "", index: "" },
  });
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_topic_context",
    "--payload-file",
    "runtime/payloads/topic-context.json",
  ]);

  await writeJsonFile(path.join(runRoot, "runtime/payloads/library-index-page-0.json"), {
    cursor: "0",
    next_cursor: "",
    has_more: false,
    returned: 1,
    total_papers: 1,
    index_hash: hashA,
    papers: [{ paper_ref: paperRef, item_key: "DETR", title: "DETR" }],
  });
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_library_index_page",
    "--payload-file",
    "runtime/payloads/library-index-page-0.json",
  ]);

  await writeJsonFile(path.join(runRoot, "runtime/payloads/resolver.json"), {
    operation,
    topic_resolver: { mode: "explicit", paper_refs: [paperRef] },
    resolved_paper_set: {
      papers: [{ paper_ref: paperRef, item_key: "DETR", title: "DETR" }],
    },
    resolver_diagnostics: { final_count: 1, warnings: [] },
    base_hashes: { manifest: "", artifact: "", export: "", metadata: "", index: hashA },
  });
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_resolver",
    "--payload-file",
    "runtime/payloads/resolver.json",
  ]);

  await writeJsonFile(path.join(runRoot, "runtime/payloads/citation-graph-metrics-batch.json"), {
    paper_refs: [paperRef],
    result: {
      ok: true,
      status: "ready",
      graph_hash: hashA,
      metrics_hash: hashB,
      items: [{ paper_ref: paperRef, status: "ready", internal_in_degree: 0 }],
    },
  });
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_citation_graph_metrics",
    "--payload-file",
    "runtime/payloads/citation-graph-metrics-batch.json",
  ]);

  await writeJsonFile(path.join(runRoot, "runtime/payloads/paper-artifacts-manifest.json"), {
    exported_by: "synthesis.export_filtered_paper_artifacts",
    papers: [
      {
        paper_ref: paperRef,
        artifacts: [
          {
            paper_ref: paperRef,
            artifact_type: "digest",
            status: "missing",
            payload_type: "digest-markdown",
            missing_reason: "fixture_missing",
            payload_types_seen: [],
          },
          {
            paper_ref: paperRef,
            artifact_type: "references",
            status: "missing",
            payload_type: "references-json",
            missing_reason: "fixture_missing",
            payload_types_seen: [],
          },
          {
            paper_ref: paperRef,
            artifact_type: "citation_analysis",
            status: "missing",
            payload_type: "citation-analysis-json",
            missing_reason: "fixture_missing",
            payload_types_seen: [],
          },
        ],
      },
    ],
  });
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--run-root",
    ".",
    "--action",
    "persist_filtered_artifact_manifest",
    "--payload-file",
    "runtime/payloads/paper-artifacts-manifest.json",
  ]);

  return { runRoot, dbPath };
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
      "assets/schemas/topic_context_payload.schema.json",
      "assets/schemas/resolver_manifest.schema.json",
      "assets/schemas/citation_graph_metrics_receipt.schema.json",
      "assets/schemas/filtered_artifact_manifest.schema.json",
      "assets/schemas/route_timeline_synthesis.schema.json",
      "assets/schemas/core_analytical_sections.schema.json",
      "references/topic_synthesis_content_contract.md",
      ...referenceFiles,
    ];

    for (const runtimeRoot of skillRuntimeRoots) {
      for (const relativePath of commonRequiredPaths) {
        await readRequiredRuntimeFile(runtimeRoot, relativePath);
      }
    }
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
        "stage_0_runtime_setup",
        "stage_1_topic_context",
        "stage_2_resolver_and_workset",
        "stage_3_graph_metrics",
        "stage_4_evidence_collection",
        "stage_5_paper_units",
        "stage_6_cross_paper_map",
        "stage_7_route_timeline",
        "stage_8_core_sections",
        "stage_9_external_statistics_report",
        "stage_10_render_and_validate",
        "stage_11_completed",
      ]) {
        assert.include(gate, stage, `${runtimeRoot} should define ${stage}`);
      }
      assert.include(gate, "next_action");
      assert.include(gate, "execution_note");
      assert.include(gate, "command_example");
      assert.include(gate, "required_reads");
      assert.include(gate, "required_writes");
      assert.include(gate, "core_instruction");
      assert.include(gate, "semantic_goal");
      assert.include(gate, "quality_focus");
      assert.include(gate, "common_pitfalls");
      assert.include(gate, "SEMANTIC_HINTS_BY_STAGE");
      assert.include(gate, "instruction_refs");
      assert.include(gate, "schema_refs");
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

  it("records external-action receipts before checking receipt-gated stage completion", async function () {
    this.timeout(15000);
    for (const runtimeRoot of [path.join("skills_builtin", "create-topic-synthesis")]) {
      const { runRoot, dbPath } = await createMinimalRuntimeWorkspace(runtimeRoot);
      const audit = runStageAction(runtimeRoot, runRoot, [
        "--db",
        dbPath,
        "--run-root",
        ".",
        "--action",
        "audit_runtime_integrity",
      ]);
      assert.deepEqual(audit, { errors: [], ok: true });

      const gate = runStageAction(runtimeRoot, runRoot, ["--db", dbPath, "--action", "gate"]);
      assert.equal(gate.status, "ready");
      assert.equal(gate.stage, "stage_5_paper_units");
      assert.equal(gate.next_action, "persist_paper_units");
    }
  });

  it("rejects partial or unregistered section, manifest, and stdout files as final outputs", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");

      assert.include(runtimeDb, "artifact_registry");
      assert.include(stageRuntime, "stage_11_completed");
      assert.match(stageRuntime, /registered[\s\S]+final stdout/i);
      assert.match(stageRuntime, /partial[\s\S]+invalid/i);
    }
  });

  it("validates section files, writes structured manifests, and leaves markdown export to the host", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const stageRuntime = await readRequiredRuntimeFile(runtimeRoot, "scripts/stage_runtime.py");
      const runtimeDb = await readRequiredRuntimeFile(runtimeRoot, "scripts/runtime_db.py");
      const outputSchema = await readRequiredRuntimeFile(runtimeRoot, "assets/output.schema.json");

      assert.include(stageRuntime, "topic-analysis.json");
      assert.include(stageRuntime, "topic-analysis.patch.json");
      assert.include(stageRuntime, "paper_evidence");
      assert.include(stageRuntime, "timeline_events");
      assert.include(stageRuntime, "coverage");
      assert.include(stageRuntime, "statistics");
      assert.include(stageRuntime, "synthesis_report");
      assert.include(stageRuntime, "manifest_path");
      assert.include(stageRuntime, "result/result.json");
      assert.notInclude(stageRuntime, "render_from_sqlite");
      assert.notInclude(stageRuntime, "render_placeholder_outputs");
      assert.notInclude(stageRuntime, "Pending Topic");
      assert.notInclude(stageRuntime, "待生成的 topic synthesis summary");
      assert.include(stageRuntime, "resolver_manifest_path");
      assert.notInclude(stageRuntime, '"topic_resolver": topic_resolver');
      assert.notInclude(stageRuntime, '"resolved_paper_set": resolved_paper_set');
      assert.include(runtimeDb, "topic_definition.id is required");
      assert.include(runtimeDb, "topic_definition.title is required");
      assert.include(runtimeDb, "isinstance(resolved, list)");
      assert.include(runtimeDb, "non-empty resolved paper set");
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
        "persist_topic_context",
        "persist_resolver",
        "persist_citation_graph_metrics",
        "persist_filtered_artifact_manifest",
        "persist_paper_units",
        "export_cross_paper_context",
        "persist_cross_paper_evidence_map",
        "persist_route_timeline",
        "persist_core_sections",
        "persist_external_statistics_report",
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
        assert.match(gate, /persist_library_index_page[\s\S]+zotero-bridge synthesis get-library-index/);
      }
      assert.include(stageRuntime, "paper_artifact_bundles");
      assert.include(stageRuntime, "citation_graph_metrics");
      assert.include(stageRuntime, "persist_citation_graph_metrics");
      assert.include(stageRuntime, "cross-paper-context.md");
      assert.include(stageRuntime, "external-literature-context.md");
      assert.include(stageRuntime, "cross-paper-context.manifest.json");
      assert.include(stageRuntime, "missing_required_section_files");
      assert.include(stageRuntime, "unknown_section_files");
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
      assert.include(runtimeDb, "ACTION_ALIASES");
      assert.include(runtimeDb, "persist_paper_units requires payload object with non-empty analyses[]");
      assert.include(runtimeDb, "missing_paper_artifact_bundle_refs");
      assert.include(runtimeDb, "missing_paper_artifact_bundle_receipt_refs");
      assert.include(runtimeDb, "missing_paper_analysis_receipt_refs");
      assert.include(runtimeDb, "audit_runtime_integrity");
      assert.include(runtimeDb, "runtime_integrity_non_monotonic_stage_state");
      assert.include(runtimeDb, "runtime_integrity_registered_file_hash_mismatch");
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
      assert.include(runtimeDb, "cross_paper_evidence_map must be validated before final sections");
      assert.include(runtimeDb, "library_coverage_gap");
      assert.include(runtimeDb, "_artifact_text_from_file");
      assert.include(runtimeDb, "compact_reference_row");
      assert.include(runtimeDb, "citation_analysis.report_md");
      assert.include(runtimeDb, "source_context_hash");
      assert.include(runtimeDb, "external_context_hash");
      assert.match(gate, /persist_filtered_artifact_manifest[\s\S]+zotero-bridge synthesis export-filtered-paper-artifacts/);
      assert.match(gate, /persist_citation_graph_metrics[\s\S]+zotero-bridge synthesis get-citation-graph-metrics/);
      assert.include(gate, "BATCH_SIZE = 25");
      assert.include(gate, "RULE_SUMMARY");
      assert.include(gate, "audit_runtime_integrity");
      assert.include(gate, "paper_refs");
      assert.include(gate, "paper-artifacts-manifest.json");
      assert.match(gate, /persist_paper_units[\s\S]+bundle receipt/i);
      assert.match(gate, /persist_paper_units[\s\S]+enhanced paper-unit/i);
      assert.match(gate, /persist_cross_paper_evidence_map[\s\S]+cross-paper-evidence-map\.json/);
      assert.match(gate, /persist_paper_units[\s\S]+analysis manifest/i);
      assert.include(gate, "without sending hashes through LLM tokens");
      assert.include(gate, "single-paper facts");
      assert.include(gate, "historical progression");
      assert.include(gate, "research route");
      assert.include(gate, "continuous synthesis report");
      assert.include(gate, "library coverage gaps");
      assert.include(gate, "stage4_action_receipts_incomplete");
      assert.include(gate, "direct SQLite rows are not valid state");
      assert.match(gate, /export_cross_paper_context[\s\S]+persist_cross_paper_evidence_map/);
      assert.include(gate, "persist_cross_paper_evidence_map");
      assert.include(gate, "persist_route_timeline");
      assert.include(gate, "persist_core_sections");
      assert.include(gate, "persist_external_statistics_report");
      assert.match(stageRuntime, /persist_paper_units[\s\S]+artifact bundle receipts/i);
      assert.include(stageRuntime, "audit_runtime_integrity");
      assert.include(stageRuntime, "persist_paper_unit");
      assert.include(stageRuntime, "action_stage");
      assert.include(stageRuntime, "clear_failed_retryable");
      assert.include(stageRuntime, "direct SQLite rows are not valid state");
      assert.include(stageRuntime, "require_stage4_action_receipts_complete");
      assert.match(stageRuntime, /cross-paper-context\.md[\s\S]+external-literature-context\.md/);
      assert.match(runtimeDb, /source_context_hash[\s\S]+mismatch/i);
      assert.match(stageRuntime, /digest_ref[\s\S]+payload_hash/i);
      assert.include(stageRuntime, "evidence_refs");
      assert.include(runtimeDb, "validate_topic_section_contract");
      assert.include(runtimeDb, "taxonomy route");
      assert.include(runtimeDb, "taxonomy.summary is required");
      assert.include(runtimeDb, "timeline_events must be an object with summary and events");
      assert.include(runtimeDb, "timeline_events.summary is required");
      assert.include(runtimeDb, "external_literature_analysis coverage_verdict is required");
      assert.include(runtimeDb, "statistics.");
      assert.include(runtimeDb, "paper_count");
      assert.include(runtimeDb, "synthesis_report.title is required");
      assert.include(runtimeDb, "synthesis_report body must contain at least");
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
      assert.include(skillText, "persist_topic_context");
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
      assert.notInclude(skillText, "persist_paper_analysis --paper-ref");
      assert.include(skillText, "persist_paper_units");
      assert.include(skillText, "paper unit");
      assert.include(skillText, "persist_cross_paper_evidence_map");
      assert.include(skillText, "cross-paper-evidence-map.json");
      assert.include(skillText, "positioning");
      assert.include(skillText, "taxonomy");
      assert.include(skillText, "comparison_matrix");
      assert.include(skillText, "evidence_map_refs");
      assert.include(skillText, "Topic Synthesis 内容合同");
      assert.include(skillText, "研究路线分析");
      assert.include(skillText, "历史沿革分析");
      assert.include(skillText, "coverage_verdict");
      assert.include(skillText, "statistics");
      assert.include(skillText, "synthesis_report");
      assert.include(skillText, "信息密集型 topic 知识窗口");
      assert.include(skillText, "不是字段填空");
      assert.include(skillText, "支持综述写作");
      assert.include(skillText, "语义目标");
      assert.include(skillText, "提供可组合证据");
      assert.include(skillText, "候选证据网络");
      assert.include(skillText, "连续知识报告");
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
      assert.match(skillText, /bounded artifact probe|artifact probe/i);
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

  it("documents runtime-required topic synthesis payload fields in skill guidance", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const skillText = await readRequiredRuntimeFile(runtimeRoot, "SKILL.md");
      const step03 = await readRequiredRuntimeFile(runtimeRoot, "references/step_03_metrics_artifacts.md");
      const step04 = await readRequiredRuntimeFile(runtimeRoot, "references/step_04_paper_units.md");
      const step05 = await readRequiredRuntimeFile(runtimeRoot, "references/step_05_cross_paper_map.md");

      for (const text of [skillText, step03]) {
        assert.include(text, "paper_refs");
        assert.include(text, "payload_types_seen");
      }
      for (const text of [skillText, step04]) {
        assert.include(text, "analyses");
        assert.include(text, "evidence_available");
        assert.include(text, "bibliographic.authors");
        assert.include(text, "core");
        assert.include(text, "related");
        assert.include(text, "peripheral");
        assert.include(text, "excluded");
        assert.include(text, "digest_locator");
      }
      for (const text of [skillText, step05]) {
        assert.include(text, "synthesis.cross_paper_evidence_map");
        assert.include(text, "evidence_limits");
        assert.include(text, "comparison_dimensions");
        assert.include(text, "supporting_paper_unit_refs");
        assert.include(text, "evidence_type");
        assert.include(text, "library_coverage_gap");
      }
    }
  });

  it("keeps references Chinese, optional, and example-driven", async function () {
    const createReferences = [...referenceFiles];
    const updateReferences = [...referenceFiles];

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

  it("keeps topic synthesis references focused on semantic analysis quality", async function () {
    const semanticReferenceExpectations: Array<[string, string[]]> = [
      [
        "references/step_04_paper_units.md",
        ["字段语义与写作标准", "合格内容示例", "不合格反例", "单篇事实"],
      ],
      [
        "references/step_05_cross_paper_map.md",
        ["聚合策略", "候选类型语义", "证据路由表", "不合格反例"],
      ],
      [
        "references/step_06_taxonomy_timeline.md",
        ["路线发现 heuristics", "Event、Phase 与 Milestone", "历史递进逻辑", "不合格写法"],
      ],
      [
        "references/step_07_core_sections.md",
        ["Claim 类型与深度", "Comparison dimension", "Debate 与 Gap 的区分", "不合格反例"],
      ],
      [
        "references/step_08_external_statistics_report.md",
        ["Coverage rubric", "Report 写作建议", "统计解读", "不合格反例"],
      ],
      [
        "references/section_examples.md",
        ["合格内容示例", "常见反例速查", "研究路线边界", "连续报告"],
      ],
    ];

    for (const runtimeRoot of skillRuntimeRoots) {
      for (const [relativePath, snippets] of semanticReferenceExpectations) {
        const text = await readRequiredRuntimeFile(runtimeRoot, relativePath);
        for (const snippet of snippets) {
          assert.include(text, snippet, `${runtimeRoot}/${relativePath} should include ${snippet}`);
        }
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
