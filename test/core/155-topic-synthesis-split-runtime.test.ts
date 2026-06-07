import { assert } from "chai";
import Ajv from "ajv";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import {
  assembleTopicArtifact,
  validateTopicAnalysisManifest,
  validateTopicSynthesisArtifact,
} from "../../src/modules/synthesis/topicStructuredArtifact";

const packages = {
  prepare: path.resolve("skills_builtin", "create-topic-synthesis-prepare"),
  updatePrepare: path.resolve(
    "skills_builtin",
    "update-topic-synthesis-prepare",
  ),
  core: path.resolve("skills_builtin", "topic-synthesis-core-enrichment"),
  finalize: path.resolve("skills_builtin", "topic-synthesis-finalize"),
};

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson<T = any>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function pythonArgs(scriptPath: string, args: string[]) {
  const arProject = path.join(os.homedir(), ".ar");
  const arPyproject = path.join(arProject, "pyproject.toml");
  if (fsSync.existsSync(arPyproject)) {
    return {
      command: "uv",
      args: [
        "run",
        `--project=${arProject}`,
        "--locked",
        "--",
        "python",
        scriptPath,
        ...args,
      ],
    };
  }
  return {
    command: process.env.PYTHON || "python",
    args: [scriptPath, ...args],
  };
}

function runGate(
  skillRoot: string,
  runRoot: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  const scriptPath = path.join(skillRoot, "scripts", "gate.py");
  const command = pythonArgs(scriptPath, args);
  const output = execFileSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
  return JSON.parse(output);
}

async function createFakeBridge(runRoot: string) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  const bridgeJs = path.join(binDir, "fake-zotero-bridge.mjs");
  await fs.writeFile(
    bridgeJs,
    String.raw`
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const inputRef = inputIndex >= 0 ? args[inputIndex + 1] : "";
let input = {};
if (inputRef.startsWith("@")) {
  input = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputRef.slice(1)), "utf8"));
}
const command = args.slice(0, inputIndex >= 0 ? inputIndex : args.length).join(" ");
const papers = (input.resolver?.paper_refs || ["1:DETR", "1:DINO"]).map((ref) => ({
  paper_ref: ref,
  item_key: ref.split(":")[1],
  title: ref === "1:DETR" ? "End-to-end object detection with transformers" : "DINO: DETR with improved DeNoising anchor boxes",
  match_reasons: ["explicit"]
}));
if (command === "synthesis resolve-resolver") {
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "synthesis.resolve_resolver", data: { ok: true, papers, returned: papers.length, total: papers.length } } }));
} else if (command === "synthesis get-citation-graph-metrics") {
  const refs = input.paperRefs || input.paper_refs || [];
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "synthesis.get_citation_graph_metrics", data: { ok: true, status: "ready", items: refs.map((paper_ref) => ({ paper_ref, foundation_score: 1 })) } } }));
} else if (command === "synthesis export-filtered-paper-artifacts") {
  const refs = input.paper_refs || [];
  const viewRoot = path.join(input.run_root, "runtime", "views", "filtered-paper-artifacts");
  fs.mkdirSync(viewRoot, { recursive: true });
  const manifest = { exported_by: "synthesis.export_filtered_paper_artifacts", papers: refs.map((paper_ref) => {
    const safe = paper_ref.replace(/[^A-Za-z0-9._-]/g, "_");
    const digest = path.join("runtime", "views", "filtered-paper-artifacts", safe + "-digest.md");
    fs.writeFileSync(path.join(input.run_root, digest), "# Digest\n\n" + paper_ref + "\n");
    return { paper_ref, artifacts: [{ artifact_type: "digest", payload_type: "digest-markdown", content_file: digest, status: "available" }] };
  }) };
  fs.writeFileSync(path.join(input.run_root, "runtime", "payloads", "paper-artifacts-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "synthesis.export_filtered_paper_artifacts", data: { manifest } } }));
} else {
  console.log(JSON.stringify({ ok: false, error: { code: "unknown_command", command } }));
  process.exitCode = 1;
}
`,
    "utf8",
  );
  const bridgeCmd = path.join(binDir, "zotero-bridge.cmd");
  await fs.writeFile(
    bridgeCmd,
    `@echo off\r\nnode "%~dp0fake-zotero-bridge.mjs" %*\r\n`,
    "utf8",
  );
  return bridgeCmd;
}

describe("topic synthesis split skill runtime", function () {
  this.timeout(30000);

  it("runs update prepare through topic context, resolver, triage, and handoff", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-update",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };

    const gate0 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate0.stage, "stage_00_runtime_setup");
    runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );

    await writeJson(
      path.join(runRoot, "runtime/payloads/update-topic-context.json"),
      {
        topic_context: {
          topic_id: "detr-topic",
          topic_definition: {
            id: "detr-topic",
            title: "DETR-style Object Detection",
          },
          current_hashes: {
            manifest: "sha256:old-manifest",
          },
          section_hashes: {
            summary: "sha256:old-summary",
          },
          recommended_update: {
            scope: "refresh",
            reason: "fixture update",
          },
        },
        update_assessment: {
          operation: "update_full",
          changed_sections: ["summary"],
          reason: "Fixture topic needs a refresh.",
        },
        diagnostics: [],
      },
    );
    const gate1 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate1.stage, "stage_10_update_topic_context");
    const updateContextOutput = runGate(
      packages.updatePrepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/update-topic-context.json",
      ],
      env,
    );
    assert.equal(updateContextOutput.stage, "stage_10_update_topic_context");
    assert.equal(updateContextOutput.result.operation, "update_full");

    const gate2 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate2.stage, "stage_20_resolver_and_workset");
    await writeJson(
      path.join(runRoot, "runtime/payloads/resolver-and-workset.json"),
      {
        resolver: { mode: "explicit", paper_refs: ["1:DETR", "1:DINO"] },
        resolver_reasoning: "Fixture update resolver.",
        operation_intent: "update_full",
        diagnostics: [],
      },
    );
    runGate(
      packages.updatePrepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/resolver-and-workset.json",
      ],
      env,
    );

    const gate3 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate3.stage, "stage_30_prepare_analysis_context");
    await writeJson(
      path.join(runRoot, "runtime/payloads/prepare-analysis-context.json"),
      {
        assessments: [
          {
            paper_ref: "1:DETR",
            relevance_level: "core",
            relevance_reason: "Original topic anchor.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DETR remains the update anchor.",
            caveats: [],
            diagnostics: [],
          },
          {
            paper_ref: "1:DINO",
            relevance_level: "core",
            relevance_reason: "Representative update candidate.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DINO adds update evidence.",
            caveats: [],
            diagnostics: [],
          },
        ],
      },
    );
    const prepareOutput = runGate(
      packages.updatePrepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/prepare-analysis-context.json",
      ],
      env,
    );
    assert.equal(prepareOutput.result.handoff.kind, "topic_synthesis_handoff");
    assert.equal(prepareOutput.result.handoff.operation, "update_full");

    const audit = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "audit"],
      env,
    );
    const actions = audit.audit.action_receipts.map(
      (receipt: any) => receipt.stage_id,
    );
    assert.includeMembers(actions, [
      "stage_00_runtime_setup",
      "stage_10_update_topic_context",
      "stage_20_resolver_and_workset",
      "stage_30_prepare_analysis_context",
    ]);
    assert.equal(audit.audit.paper_count, 2);

    for (const filePath of [
      "runtime/payloads/resolver.json",
      "runtime/payloads/citation-graph-metrics-batch-1.json",
      "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      "runtime/views/cross-paper-context.md",
      "runtime/views/source-paper-evidence-index.json",
      "runtime/handoff/prepare-analysis-context.json",
    ]) {
      await fs.access(path.join(runRoot, filePath));
    }
  });

  it("runs the create split-skill path through gate and runtime receipts", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-create",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };

    const gate0 = runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    assert.equal(gate0.stage, "stage_00_runtime_setup");
    runGate(
      packages.prepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );

    await writeJson(
      path.join(runRoot, "runtime/payloads/create-topic-context.json"),
      {
        topic_title: "DETR-style Object Detection",
        aliases: ["DETR"],
        definition: "Query-based object detection methods derived from DETR.",
        scope_include: ["DETR"],
        scope_exclude: [],
        duplicate_status: "none",
        duplicate_candidate_ids: [],
        duplicate_reason: "No existing topic in fixture.",
        diagnostics: [],
      },
    );
    const gate1 = runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    assert.equal(gate1.stage, "stage_10_create_topic_context");
    runGate(
      packages.prepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/create-topic-context.json",
      ],
      env,
    );

    await writeJson(
      path.join(runRoot, "runtime/payloads/resolver-and-workset.json"),
      {
        resolver: { mode: "explicit", paper_refs: ["1:DETR", "1:DINO"] },
        resolver_reasoning: "Fixture resolver.",
        operation_intent: "create",
        diagnostics: [],
      },
    );
    const gate2 = runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    assert.equal(gate2.stage, "stage_20_resolver_and_workset");
    runGate(
      packages.prepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/resolver-and-workset.json",
      ],
      env,
    );

    await writeJson(
      path.join(runRoot, "runtime/payloads/prepare-analysis-context.json"),
      {
        assessments: [
          {
            paper_ref: "1:DETR",
            relevance_level: "core",
            relevance_reason: "Baseline.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DETR baseline.",
            caveats: [],
            diagnostics: [],
          },
          {
            paper_ref: "1:DINO",
            relevance_level: "core",
            relevance_reason: "Training improvement.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DINO improves DETR training.",
            caveats: [],
            diagnostics: [],
          },
        ],
      },
    );
    const gate3 = runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    assert.equal(gate3.stage, "stage_30_prepare_analysis_context");
    const prepareOutput = runGate(
      packages.prepare,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/prepare-analysis-context.json",
      ],
      env,
    );
    assert.equal(prepareOutput.result.handoff.kind, "topic_synthesis_handoff");

    runGate(packages.core, runRoot, ["--db", dbPath], env);
    runGate(packages.core, runRoot, ["--db", dbPath, "--action", "run"], env);
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis.json"),
      {
        taxonomy: { summary: {}, nodes: [] },
        timeline_events: { summary: {}, events: [] },
        positioning: {},
        claims: [],
        improvement_dimension_summary: {},
        improvement_dimensions: [],
        concept_candidate_labels: ["DETR", "DINO"],
        debates: [],
        gaps: [],
        review_outline: {},
      },
    );
    runGate(
      packages.core,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/core-synthesis.json",
      ],
      env,
    );
    await writeJson(path.join(runRoot, "runtime/payloads/kg-enrichment.json"), {
      concept_details: [{ label: "DETR" }],
      topic_relation_candidates: [],
      topic_matching_terms: {
        include_terms: ["DETR"],
        must_have_terms: ["DETR"],
        methods: [],
        exclude_terms: [],
        diagnostics: [],
      },
      diagnostics: [],
    });
    const coreOutput = runGate(
      packages.core,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/kg-enrichment.json",
      ],
      env,
    );
    assert.equal(coreOutput.result.handoff.handoff, "core_enrichment");

    const finalizeManifest = await readJson<any>(
      path.join(runRoot, "runtime/views/finalize-context.manifest.json"),
    );
    assert.equal(
      finalizeManifest.external_literature_context.path,
      "runtime/views/external-literature-context.md",
    );

    const finalizeGate0 = runGate(
      packages.finalize,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(finalizeGate0.stage, "stage_00_runtime_state_check");
    runGate(
      packages.finalize,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    const finalizeGate60 = runGate(
      packages.finalize,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(
      finalizeGate60.stage,
      "stage_60_coverage_and_collection_suggestions",
    );
    assert.include(
      finalizeGate60.required_reads,
      "runtime/views/external-literature-context.md",
    );
    await writeJson(
      path.join(
        runRoot,
        "runtime/payloads/coverage-and-collection-suggestions.json",
      ),
      {
        coverage_verdict: "partial",
        coverage_reason: "Fixture coverage.",
        reliability_summary: "Fixture reliability.",
        coverage_caveats: [],
        external_context_summary: "Fixture external context.",
        suggested_collection_directions: [
          {
            direction: "Add more DETR variants.",
            reason: "Fixture reason.",
            example_titles_or_terms: ["DAB-DETR"],
            priority: "medium",
          },
        ],
        diagnostics: [],
      },
    );
    runGate(
      packages.finalize,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/coverage-and-collection-suggestions.json",
      ],
      env,
    );
    await writeJson(path.join(runRoot, "runtime/payloads/summary.json"), {
      summary_brief: "DETR fixture summary.",
      summary_overview: "Split runtime fixture overview.",
      key_takeaways: ["The split runtime generated this final candidate."],
      diagnostics: [],
    });
    const finalOutput = runGate(
      packages.finalize,
      runRoot,
      [
        "--db",
        dbPath,
        "--action",
        "submit",
        "--payload",
        "runtime/payloads/summary.json",
      ],
      env,
    );
    assert.equal(finalOutput.result.kind, "topic_synthesis");
    assert.equal(finalOutput.result.operation, "create");

    for (const filePath of [
      "runtime/payloads/resolver.json",
      "runtime/payloads/citation-graph-metrics-batch-1.json",
      "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      "runtime/handoff/prepare-analysis-context.json",
      "runtime/handoff/core-enrichment.json",
      "result/sidecars/concept-cards-proposal.json",
      "result/topic-analysis.json",
      "result/final-output.candidate.json",
    ]) {
      await fs.access(path.join(runRoot, filePath));
    }

    const audit = runGate(
      packages.finalize,
      runRoot,
      ["--db", dbPath, "--action", "audit"],
      env,
    );
    const actions = audit.audit.action_receipts.map(
      (receipt: any) => receipt.stage_id,
    );
    assert.includeMembers(actions, [
      "stage_00_runtime_setup",
      "stage_10_create_topic_context",
      "stage_20_resolver_and_workset",
      "stage_30_prepare_analysis_context",
      "stage_40_core_synthesis",
      "stage_50_kg_enrichment",
      "stage_60_coverage_and_collection_suggestions",
      "stage_70_summary",
    ]);
    assert.equal(audit.audit.paper_count, 2);

    const gateTranscript = await fs.readdir(
      path.join(runRoot, "runtime/gate-transcript"),
    );
    const actionTranscript = await fs.readdir(
      path.join(runRoot, "runtime/action-transcript"),
    );
    assert.isAtLeast(gateTranscript.length, 6);
    assert.isAtLeast(actionTranscript.length, 8);

    const finalCandidate = await readJson(
      path.join(runRoot, "result/final-output.candidate.json"),
    );
    assert.notProperty(finalCandidate, "__SKILL_DONE__");
    const finalSchema = await readJson(
      path.join(packages.finalize, "assets/output.schema.json"),
    );
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(finalSchema);
    assert.isTrue(validate(finalCandidate), ajv.errorsText(validate.errors));

    const analysisManifest = await readJson<Record<string, any>>(
      path.join(runRoot, "result/topic-analysis.json"),
    );
    const manifestValidation = validateTopicAnalysisManifest(analysisManifest);
    assert.isTrue(
      manifestValidation.ok,
      manifestValidation.ok
        ? ""
        : manifestValidation.errors.slice(0, 8).join("; "),
    );
    const sections: Record<string, unknown> = {};
    for (const [section, entry] of Object.entries(analysisManifest.sections)) {
      sections[section] = await readJson(path.join(runRoot, entry.path));
      assert.equal(entry.content_type, "json");
    }
    for (const entry of Object.values<any>(analysisManifest.sidecars)) {
      assert.equal(entry.content_type, "json");
      assert.isString(entry.schema_id);
    }
    const artifact = assembleTopicArtifact({
      manifest: analysisManifest,
      sections,
    });
    const artifactValidation = validateTopicSynthesisArtifact(artifact, {
      expectedLanguage: finalCandidate.language,
    });
    assert.isTrue(
      artifactValidation.ok,
      artifactValidation.ok
        ? ""
        : artifactValidation.errors.slice(0, 8).join("; "),
    );
  });
});
