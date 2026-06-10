import { assert } from "chai";
import { execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

type AnyModule = Record<string, any> & { __loadError?: unknown };

const skillRuntimeRoots = [
  path.join("skills_builtin", "create-topic-synthesis"),
  path.join("skills_builtin", "update-topic-synthesis"),
];
const createRuntimeRoot = path.join("skills_builtin", "create-topic-synthesis");

const referenceFiles = [
  "references/step_05_paper_triage.md",
  "references/step_06_cross_paper_map.md",
  "references/step_07_taxonomy_timeline.md",
  "references/step_08_core_synthesis.md",
  "references/step_09_kg_enrichment.md",
  "references/step_10_summary_coverage.md",
  "references/step_11_render_validate.md",
  "references/section_examples.md",
  "references/topic_synthesis_content_contract.md",
];

const schemaFiles = [
  "assets/schemas/topic_analysis_manifest.schema.json",
  "assets/schemas/topic_section_patch_manifest.schema.json",
  "assets/schemas/topic_synthesis_artifact.schema.json",
  "assets/schemas/topic_context_payload.schema.json",
  "assets/schemas/resolver_proposal.schema.json",
  "assets/schemas/resolver_manifest.schema.json",
  "assets/schemas/paper_analysis_row.schema.json",
  "assets/schemas/cross_paper_evidence_map.schema.json",
  "assets/schemas/core_analytical_sections.schema.json",
  "assets/schemas/kg_enrichment.schema.json",
];

function token(...parts: string[]) {
  return parts.join("_");
}

const retiredContractFragments = [
  token("comparison", "matrix"),
  token("comparison", "dimensions"),
  token("comparison", "matrix", "section"),
  token("route", "timeline", "synthesis"),
  token("persist", "paper", "units"),
  token("persist", "route", "timeline", "synthesis"),
  token("persist", "core", "sections"),
  token("persist", "kg", "proposals"),
  token("persist", "external", "statistics", "report"),
  token("stage", "5", "paper", "units"),
  token("stage", "7", "route", "timeline"),
  token("stage", "8", "core", "sections"),
  token("stage", "9", "kg", "proposals"),
  token("stage", "10", "external", "statistics", "report"),
  token("stage", "3", "graph", "metrics"),
  token("stage", "4", "evidence", "collection"),
  token("persist", "citation", "graph", "metrics"),
  token("persist", "filtered", "artifact", "manifest"),
  token("step", "05", "paper", "units"),
  token("step", "08", "core", "sections"),
  token("step", "09", "kg", "proposals"),
  token("step", "10", "external", "statistics", "report"),
  ["leg", "acy"].join(""),
  ["fall", "back"].join(""),
  ["com", "pat"].join(""),
  "不" + "再接受",
  "旧" + "字段",
  "旧" + "协议",
];

async function importOptional(modulePath: string): Promise<AnyModule> {
  try {
    return (await import(modulePath)) as AnyModule;
  } catch (error) {
    return { __loadError: error };
  }
}

function requireExport(module: AnyModule, exportName: string) {
  assert.isUndefined(
    module.__loadError,
    `expected module to load before checking ${exportName}: ${
      module.__loadError instanceof Error
        ? module.__loadError.message
        : String(module.__loadError)
    }`,
  );
  assert.isFunction(module[exportName]);
  return module[exportName] as (...args: any[]) => any;
}

async function readRequiredRuntimeFile(
  runtimeRoot: string,
  relativePath: string,
) {
  const fullPath = path.join(runtimeRoot, relativePath);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch (error) {
    assert.fail(
      `expected package-local topic synthesis runtime file to exist: ${fullPath}; ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function createFakeZoteroBridge(
  runRoot: string,
  papers: Array<Record<string, unknown>>,
) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  const fakeScript = path.join(binDir, "fake-zotero-bridge.cjs");
  await fs.writeFile(
    fakeScript,
    [
      "const fs = require('fs');",
      "const path = require('path');",
      "const args = process.argv.slice(2);",
      "const inputIndex = args.indexOf('--input');",
      "if (inputIndex < 0 || !args[inputIndex + 1]) {",
      "  process.stdout.write(JSON.stringify({ ok: false, error: { code: 'missing_input' } }));",
      "  process.exit(2);",
      "}",
      "const inputArg = args[inputIndex + 1];",
      "const inputText = inputArg.startsWith('@') ? fs.readFileSync(path.resolve(process.cwd(), inputArg.slice(1)), 'utf8') : inputArg;",
      "const input = JSON.parse(inputText);",
      "fs.mkdirSync(path.join(process.cwd(), 'runtime'), { recursive: true });",
      "fs.mkdirSync(path.join(process.cwd(), 'runtime', 'payloads'), { recursive: true });",
      "const command = args.slice(0, inputIndex).join(' ');",
      "fs.appendFileSync(path.join(process.cwd(), 'runtime', 'host-bridge-inputs.jsonl'), JSON.stringify({ command, input }) + '\\n');",
      "function send(data) {",
      "  process.stdout.write(JSON.stringify({ ok: true, data, meta: { cli: 'zotero-bridge', schema: 'zotero-bridge.cli.v1' } }));",
      "}",
      "function missingArtifacts(paperRef) {",
      "  return ['digest', 'references', 'citation_analysis'].map((artifactType) => ({",
      "    paper_ref: paperRef,",
      "    artifact_type: artifactType,",
      "    status: 'missing',",
      "    payload_type: artifactType === 'digest' ? 'digest-markdown' : artifactType === 'references' ? 'references-json' : 'citation-analysis-json',",
      "    missing_reason: 'fixture_missing',",
      "    payload_types_seen: []",
      "  }));",
      "}",
      "if (command === 'resolvers resolve') {",
      "  fs.appendFileSync(path.join(process.cwd(), 'runtime', 'host-resolver-inputs.jsonl'), JSON.stringify(input) + '\\n');",
      "  send({",
      "    ok: true,",
      `    papers: ${JSON.stringify(papers)},`,
      "    normalized_resolver: input.resolver,",
      "    cursor: input.cursor || '0',",
      "    next_cursor: '',",
      "    has_more: false,",
      `    returned: ${papers.length},`,
      `    total_papers: ${papers.length},`,
      "    diagnostics: {",
      `      final_count: ${papers.length},`,
      `      total_candidates: ${papers.length},`,
      "      warnings: []",
      "    }",
      "  });",
      "  process.exit(0);",
      "}",
      "if (command === 'citation-graph get-metrics') {",
      "  const refs = input.paperRefs || input.paper_refs || [];",
      "  send({",
      "    ok: true,",
      "    status: 'ready',",
      "    graph_hash: 'sha256:' + 'a'.repeat(64),",
      "    metrics_hash: 'sha256:' + 'b'.repeat(64),",
      "    items: refs.map((paper_ref) => ({ paper_ref, status: 'ready', internal_in_degree: 0 }))",
      "  });",
      "  process.exit(0);",
      "}",
      "if (command === 'paper-artifacts export-filtered') {",
      "  const refs = input.paper_refs || input.paperRefs || [];",
      "  const manifest = {",
      "    exported_by: 'paper_artifacts.export_filtered',",
      "    papers: refs.map((paper_ref) => ({ paper_ref, artifacts: missingArtifacts(paper_ref) }))",
      "  };",
      "  fs.writeFileSync(path.join(process.cwd(), 'runtime', 'payloads', 'paper-artifacts-manifest.json'), JSON.stringify(manifest, null, 2));",
      "  send(manifest);",
      "  process.exit(0);",
      "}",
      "process.stdout.write(JSON.stringify({ ok: false, error: { code: 'unsupported_command', command } }));",
      "process.exit(2);",
      "",
    ].join("\n"),
    "utf8",
  );
  const shellShim = path.join(binDir, "zotero-bridge");
  await fs.writeFile(
    shellShim,
    [
      "#!/usr/bin/env sh",
      'DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
      'exec node "$DIR/fake-zotero-bridge.cjs" "$@"',
      "",
    ].join("\n"),
    "utf8",
  );
  await fs.chmod(shellShim, 0o755);
  await fs.writeFile(
    path.join(binDir, "zotero-bridge.cmd"),
    '@echo off\r\nnode "%~dp0\\fake-zotero-bridge.cjs" %*\r\n',
    "utf8",
  );
}

async function assertMissing(filePath: string) {
  try {
    await fs.access(filePath);
    assert.fail(
      `expected retired topic synthesis runtime file to be absent: ${filePath}`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

function pythonCommand() {
  return process.env.PYTHON || "python";
}

function runStageAction(runtimeRoot: string, runRoot: string, args: string[]) {
  const output = execFileSync(
    pythonCommand(),
    [path.resolve(runtimeRoot, "scripts/stage_runtime.py"), ...args],
    { cwd: runRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

function runStageActionFromCwd(
  runtimeRoot: string,
  cwd: string,
  args: string[],
) {
  const output = execFileSync(
    pythonCommand(),
    [path.resolve(runtimeRoot, "scripts/stage_runtime.py"), ...args],
    { cwd, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

function runGate(runtimeRoot: string, runRoot: string, dbPath: string) {
  const output = execFileSync(
    pythonCommand(),
    [path.resolve(runtimeRoot, "scripts/gate_runtime.py"), "--db", dbPath],
    { cwd: runRoot, encoding: "utf8", stdio: "pipe" },
  );
  return JSON.parse(output);
}

async function createMinimalRuntimeWorkspace(runtimeRoot: string) {
  const runRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "topic-synthesis-runtime-"),
  );
  const dbPath = path.join("runtime", "topic-synthesis.sqlite");
  const operation = runtimeRoot.includes("update-topic-synthesis")
    ? "update_full"
    : "create";
  const hashA = "sha256:" + "a".repeat(64);
  const hashB = "sha256:" + "b".repeat(64);
  const paperRef = "1:DETR";

  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--operation",
    operation,
    "--language",
    "zh-CN",
    "--action",
    "confirm_runtime_setup",
  ]);

  await writeJsonFile(
    path.join(runRoot, "runtime/payloads/topic-context.json"),
    runtimeRoot.includes("update-topic-synthesis")
      ? {
          topic_context: {
            topic_id: "object-detection",
            language: "zh-CN",
            topic_definition: {
              title: "Object Detection",
              aliases: ["DETR-style detection"],
              scope_boundary: {
                include: ["query-based object detection"],
                exclude: ["generic image classification"],
              },
            },
            current_hashes: {
              manifest: hashA,
              artifact: hashA,
              export: hashA,
              metadata: hashA,
              index: hashA,
            },
            section_hashes: {
              claims: hashB,
            },
            recommended_update: {
              operation,
              changed_sections: ["claims"],
            },
          },
          update_assessment: {
            operation,
            changed_sections: ["claims"],
            reason: "fixture update",
          },
          diagnostics: [],
        }
      : {
          topic_title: "Object Detection",
          aliases: ["DETR-style detection"],
          definition: "Query-based object detection methods derived from DETR.",
          scope_include: ["query-based object detection"],
          scope_exclude: ["generic image classification"],
          duplicate_status: "none",
          duplicate_candidate_ids: [],
          duplicate_reason: "",
          diagnostics: [],
        },
  );
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_topic_context",
    "--payload-file",
    "runtime/payloads/topic-context.json",
  ]);

  await createFakeZoteroBridge(runRoot, [
    { paper_ref: paperRef, item_key: "DETR", title: "DETR" },
  ]);
  await writeJsonFile(
    path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
    {
      resolver: { mode: "explicit", paper_refs: [paperRef] },
      resolver_reasoning:
        "Fixture resolver selects the representative DETR paper.",
      operation_intent: operation,
      diagnostics: [],
    },
  );
  runStageAction(runtimeRoot, runRoot, [
    "--db",
    dbPath,
    "--action",
    "persist_resolver",
    "--payload-file",
    "runtime/payloads/resolver-proposal.json",
  ]);

  return { runRoot, dbPath, paperRef };
}

describe("Topic synthesis runtime contract", function () {
  this.timeout(30000);

  it("ships current package-local runtime resources in both create and update skills", async function () {
    const requiredPaths = [
      "SKILL.md",
      "assets/runner.json",
      "scripts/gate_runtime.py",
      "scripts/stage_runtime.py",
      "scripts/runtime_db.py",
      ...referenceFiles,
      ...schemaFiles,
    ];

    for (const runtimeRoot of skillRuntimeRoots) {
      for (const relativePath of requiredPaths) {
        await readRequiredRuntimeFile(runtimeRoot, relativePath);
      }

      await assertMissing(
        path.join(
          runtimeRoot,
          `assets/schemas/${token("route", "timeline", "synthesis")}.schema.json`,
        ),
      );
      await assertMissing(
        path.join(
          runtimeRoot,
          `assets/schemas/${token("comparison", "matrix", "section")}.schema.json`,
        ),
      );
    }
  });

  it("derives create Stage 1 topic definition from flat agent payload", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage1-create-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_title: "DETR-style Object Detection",
        aliases: ["query detector"],
        definition: "Query-based object detection methods derived from DETR.",
        scope_include: ["DETR-style detection"],
        scope_exclude: ["generic image classification"],
        duplicate_status: "none",
        duplicate_candidate_ids: [],
        duplicate_reason: "",
        diagnostics: [],
      },
    );

    const result = runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);

    assert.equal(result.result.topic_id, "detr-style-object-detection");
    assert.equal(result.result.topic_title, "DETR-style Object Detection");
    assert.include(result.result.stored_keys, "topic_definition");
  });

  it("rejects legacy create Stage 1 payloads with agent-authored topic_definition", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage1-create-old-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_definition: {
          id: "object-detection",
          title: "Object Detection",
        },
        duplicate_check: { decision: "none" },
      },
    );

    assert.throws(
      () =>
        runStageAction(createRuntimeRoot, runRoot, [
          "--db",
          dbPath,
          "--action",
          "persist_topic_context",
          "--payload-file",
          "runtime/payloads/topic-context.json",
        ]),
      /runtime-owned or unknown fields|topic_definition/i,
    );
  });

  it("derives update Stage 1 topic state from host topic_context", async function () {
    const runtimeRoot = path.join("skills_builtin", "update-topic-synthesis");
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage1-update-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    const hashA = "sha256:" + "a".repeat(64);
    const hashB = "sha256:" + "b".repeat(64);
    runStageAction(runtimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "update_patch",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_context: {
          topic_id: "object-detection",
          topic_definition: {
            title: "Object Detection",
            definition: "Existing topic definition from host.",
          },
          current_hashes: {
            manifest: hashA,
            artifact: hashA,
            export: hashA,
            metadata: hashA,
            index: hashA,
          },
          section_hashes: {
            claims: hashB,
          },
          recommended_update: {
            operation: "update_patch",
          },
        },
        update_assessment: {
          operation: "update_patch",
          changed_sections: ["claims"],
          reason: "fixture patch",
        },
        diagnostics: [],
      },
    );

    const result = runStageAction(runtimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);

    assert.equal(result.result.topic_id, "object-detection");
    assert.equal(result.result.topic_title, "Object Detection");
    assert.include(result.result.stored_keys, "base_hashes");
    assert.include(result.result.stored_keys, "read_section_hashes");
    assert.include(result.result.stored_keys, "changed_sections");
  });

  it("exposes Stage 2 resolver proposal and materializes execution manifest via Host Bridge", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage2-create-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    const paperRef = "1:DETR";
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_title: "DETR-style Object Detection",
        duplicate_status: "none",
      },
    );
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);

    const gate = runGate(createRuntimeRoot, runRoot, dbPath);
    assert.equal(gate.stage, "stage_2_resolver_and_workset");
    assert.equal(gate.next_action, "persist_resolver");
    assert.include(
      JSON.stringify(gate.schema_refs),
      "assets/schemas/resolver_proposal.schema.json",
    );
    assert.notInclude(JSON.stringify(gate.schema_refs), "resolver_manifest");
    assert.include(gate.command_example, "resolver-proposal.json");

    await createFakeZoteroBridge(runRoot, [
      { paper_ref: paperRef, item_key: "DETR", title: "DETR" },
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
      {
        resolver: { mode: "explicit", paper_refs: [paperRef] },
        resolver_reasoning: "Explicit fixture resolver.",
        operation_intent: "create",
        diagnostics: [],
      },
    );
    const result = runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_resolver",
      "--payload-file",
      "runtime/payloads/resolver-proposal.json",
    ]);

    assert.deepEqual(result.result.paper_refs, [paperRef]);
    assert.deepEqual(result.result.resolver_cascade, {
      metrics_batches: 1,
      artifact_batches: 1,
    });
    assert.equal(
      result.result.resolver_manifest_path,
      "runtime/payloads/resolver.json",
    );
    const manifestText = await fs.readFile(
      path.join(runRoot, "runtime/payloads/resolver.json"),
      "utf8",
    );
    const manifest = JSON.parse(manifestText);
    assert.deepEqual(
      manifest.resolved_paper_set.papers.map((paper: any) => paper.paper_ref),
      [paperRef],
    );
    const hostInputs = await fs.readFile(
      path.join(runRoot, "runtime/host-resolver-inputs.jsonl"),
      "utf8",
    );
    assert.include(hostInputs, '"resolver":{"mode":"explicit"');
    await fs.access(
      path.join(
        runRoot,
        "runtime/payloads/citation-graph-metrics-batch-1.json",
      ),
    );
    await fs.access(
      path.join(
        runRoot,
        "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      ),
    );
    const nextGate = runGate(createRuntimeRoot, runRoot, dbPath);
    assert.equal(nextGate.stage, "stage_5_paper_triage");
    assert.equal(nextGate.next_action, "persist_paper_triage");
    assert.notInclude(JSON.stringify(nextGate), "stage_3_graph_metrics");
    assert.notInclude(JSON.stringify(nextGate), "stage_4_evidence_collection");
  });

  it("rejects legacy Stage 2 payloads with agent-authored resolver execution results", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage2-old-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_title: "Object Detection",
        duplicate_status: "none",
      },
    );
    runStageAction(createRuntimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
      {
        resolver: { mode: "explicit", paper_refs: ["1:DETR"] },
        resolved_paper_set: { papers: [{ paper_ref: "1:DETR" }] },
      },
    );

    assert.throws(
      () =>
        runStageAction(createRuntimeRoot, runRoot, [
          "--db",
          dbPath,
          "--action",
          "persist_resolver",
          "--payload-file",
          "runtime/payloads/resolver-proposal.json",
        ]),
      /runtime execution result fields|resolved_paper_set/i,
    );
  });

  it("locks run_root at Stage 0 and resolves Host Bridge from that directory across cwd changes", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage2-cwd-"),
    );
    const otherCwd = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-other-cwd-"),
    );
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const paperRef = "1:DETR";

    runStageActionFromCwd(createRuntimeRoot, otherCwd, [
      "--db",
      dbPath,
      "--operation",
      "create",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_title: "DETR-style Object Detection",
        duplicate_status: "none",
      },
    );
    runStageActionFromCwd(createRuntimeRoot, otherCwd, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);
    await createFakeZoteroBridge(runRoot, [
      { paper_ref: paperRef, item_key: "DETR", title: "DETR" },
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
      {
        resolver: { mode: "explicit", paper_refs: [paperRef] },
        resolver_reasoning: "Explicit fixture resolver.",
        operation_intent: "create",
        diagnostics: [],
      },
    );

    const result = runStageActionFromCwd(createRuntimeRoot, otherCwd, [
      "--db",
      dbPath,
      "--action",
      "persist_resolver",
      "--payload-file",
      "runtime/payloads/resolver-proposal.json",
    ]);

    assert.deepEqual(result.result.paper_refs, [paperRef]);
    await fs.access(
      path.join(
        runRoot,
        "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      ),
    );
  });

  it("materializes update Stage 2 resolver manifest from proposal and host context hashes", async function () {
    const runtimeRoot = path.join("skills_builtin", "update-topic-synthesis");
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-stage2-update-"),
    );
    const dbPath = path.join("runtime", "topic-synthesis.sqlite");
    const hashA = "sha256:" + "a".repeat(64);
    const hashB = "sha256:" + "b".repeat(64);
    const paperRef = "1:DETR";
    runStageAction(runtimeRoot, runRoot, [
      "--db",
      dbPath,
      "--operation",
      "update_patch",
      "--language",
      "zh-CN",
      "--action",
      "confirm_runtime_setup",
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/topic-context.json"),
      {
        topic_context: {
          topic_id: "object-detection",
          topic_definition: { title: "Object Detection" },
          current_hashes: {
            manifest: hashA,
            artifact: hashA,
            export: hashA,
            metadata: hashA,
            index: hashA,
          },
          section_hashes: { claims: hashB },
          recommended_update: { operation: "update_patch" },
        },
        update_assessment: {
          operation: "update_patch",
          changed_sections: ["claims"],
          reason: "fixture patch",
        },
        diagnostics: [],
      },
    );
    runStageAction(runtimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_topic_context",
      "--payload-file",
      "runtime/payloads/topic-context.json",
    ]);
    await createFakeZoteroBridge(runRoot, [
      { paper_ref: paperRef, item_key: "DETR", title: "DETR" },
    ]);
    await writeJsonFile(
      path.join(runRoot, "runtime/payloads/resolver-proposal.json"),
      {
        resolver: { mode: "explicit", paper_refs: [paperRef] },
        resolver_reasoning: "Reuse fixture paper set for patch.",
        operation_intent: "update_patch",
        diagnostics: [],
      },
    );

    runStageAction(runtimeRoot, runRoot, [
      "--db",
      dbPath,
      "--action",
      "persist_resolver",
      "--payload-file",
      "runtime/payloads/resolver-proposal.json",
    ]);
    const manifest = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime/payloads/resolver.json"),
        "utf8",
      ),
    );

    assert.equal(manifest.operation, "update_patch");
    assert.equal(manifest.base_hashes.manifest, hashA);
    assert.equal(manifest.read_section_hashes.claims, hashB);
    assert.deepEqual(
      manifest.resolved_paper_set.papers.map((paper: any) => paper.paper_ref),
      [paperRef],
    );
  });

  it("keeps agent-facing instructions and schemas on the current contract", async function () {
    const agentFacingPaths = [
      "SKILL.md",
      "assets/runner.json",
      "scripts/gate_runtime.py",
      "scripts/stage_runtime.py",
      ...referenceFiles,
      ...schemaFiles,
    ];

    for (const runtimeRoot of [createRuntimeRoot]) {
      for (const relativePath of agentFacingPaths) {
        const text = await readRequiredRuntimeFile(runtimeRoot, relativePath);
        for (const fragment of retiredContractFragments) {
          assert.notInclude(
            text,
            fragment,
            `${path.join(runtimeRoot, relativePath)} should not expose retired topic synthesis contract fragment`,
          );
        }
      }
    }
  });

  it("uses current stage names, actions, and instruction references in gate output", async function () {
    for (const runtimeRoot of [createRuntimeRoot]) {
      const { runRoot, dbPath } =
        await createMinimalRuntimeWorkspace(runtimeRoot);
      const gate = runGate(runtimeRoot, runRoot, dbPath);

      assert.equal(gate.stage, "stage_5_paper_triage");
      assert.equal(gate.next_action, "persist_paper_triage");
      assert.include(
        JSON.stringify(gate.schema_refs),
        "assets/schemas/paper_analysis_row.schema.json",
      );
      assert.includeMembers(gate.instruction_refs, [
        "references/step_05_paper_triage.md",
      ]);
      assert.include(gate.execution_note, "paper triage row");
      assert.notInclude(gate.execution_note, "paper unit");
    }
  });

  it("derives cross-paper evidence maps from triage rows and improvement dimensions", async function () {
    for (const runtimeRoot of [createRuntimeRoot]) {
      const { runRoot, dbPath, paperRef } =
        await createMinimalRuntimeWorkspace(runtimeRoot);
      await writeJsonFile(
        path.join(runRoot, "runtime/payloads/paper-triage-batch.json"),
        {
          analyses: [
            {
              paper_ref: paperRef,
              topic_relevance: {
                level: "core",
                reason: "Directly defines DETR-style object detection.",
              },
              paper_quality: {
                level: "high",
                reason: "Representative method paper in the fixture.",
              },
              core_digest:
                "DETR formulates object detection as direct set prediction with object queries and bipartite matching.",
            },
          ],
        },
      );

      runStageAction(runtimeRoot, runRoot, [
        "--db",
        dbPath,
        "--action",
        "persist_paper_triage",
        "--payload-file",
        "runtime/payloads/paper-triage-batch.json",
      ]);
      runStageAction(runtimeRoot, runRoot, [
        "--db",
        dbPath,
        "--action",
        "export_cross_paper_context",
      ]);
      runStageAction(runtimeRoot, runRoot, [
        "--db",
        dbPath,
        "--action",
        "derive_cross_paper_evidence_map",
      ]);

      const evidenceMap = JSON.parse(
        await fs.readFile(
          path.join(runRoot, "runtime/payloads/cross-paper-evidence-map.json"),
          "utf8",
        ),
      );

      assert.isArray(evidenceMap.improvement_dimension_candidates);
      assert.notProperty(evidenceMap, token("comparison", "dimensions"));
      assert.match(
        evidenceMap.taxonomy_candidates[0].triage_refs[0],
        /^triage:/,
      );
      assert.match(
        evidenceMap.evidence_limits.known_triage_refs[0],
        /^triage:/,
      );
    }
  });

  it("exposes current runtime helper names for KG enrichment and summary coverage", async function () {
    for (const runtimeRoot of skillRuntimeRoots) {
      const stageRuntime = await readRequiredRuntimeFile(
        runtimeRoot,
        "scripts/stage_runtime.py",
      );
      const runtimeDb = await readRequiredRuntimeFile(
        runtimeRoot,
        "scripts/runtime_db.py",
      );
      const evidenceMapSchema = JSON.parse(
        await readRequiredRuntimeFile(
          runtimeRoot,
          "assets/schemas/cross_paper_evidence_map.schema.json",
        ),
      );

      assert.include(stageRuntime, "persist_kg_enrichment_payload");
      assert.include(stageRuntime, "persist_summary_coverage_payload");
      assert.notInclude(
        stageRuntime,
        `${token("persist", "kg", "proposals")}_payload`,
      );
      assert.notInclude(
        stageRuntime,
        `${token("persist", "external", "statistics", "report")}_payload`,
      );
      assert.include(runtimeDb, "validate_paper_triage_contract");
      assert.include(runtimeDb, "triage_candidate_id_for_paper_ref");
      assert.notInclude(
        runtimeDb,
        `${token("paper", "unit")}_id_for_paper_ref`,
      );
      assert.include(
        evidenceMapSchema.required,
        "improvement_dimension_candidates",
      );
      assert.notProperty(
        evidenceMapSchema.properties,
        token("comparison", "dimensions"),
      );
    }
  });

  it("rejects topic synthesis bundles without the current operation manifest contract", async function () {
    const workflowModule = await importOptional(
      "../../src/modules/synthesis/workflow",
    );
    const validateSynthesisResultBundle = requireExport(
      workflowModule,
      "validateSynthesisResultBundle",
    );

    assert.throws(
      () =>
        validateSynthesisResultBundle({
          kind: "topic_synthesis",
          mode: "create",
          language: "zh-CN",
          topic_definition: { id: "object-detection" },
          resolver_diagnostics: {},
          artifact_metadata: {},
          markdown: "# preview",
        }),
      /operation and analysis_manifest_path/,
    );
  });
});
