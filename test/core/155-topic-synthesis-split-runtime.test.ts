import { assert } from "chai";
import Ajv from "ajv";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import { parse as parseYaml } from "yaml";
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

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function portablePath(filePath: string) {
  return path.resolve(filePath).replace(/\\/g, "/");
}

function absRunPath(runRoot: string, relativePath: string) {
  return portablePath(path.join(runRoot, relativePath));
}

async function readBridgeCalls(runRoot: string): Promise<any[]> {
  const callsPath = path.join(runRoot, "runtime", "bridge-calls.jsonl");
  if (!(await exists(callsPath))) {
    return [];
  }
  return (await fs.readFile(callsPath, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeDownloadedPaperArtifactManifest(
  runRoot: string,
  paperRefs: string[],
) {
  const artifactDir = path.join(runRoot, "runtime", "payloads", "artifacts");
  await fs.mkdir(artifactDir, { recursive: true });
  const papers = [];
  for (const paperRef of paperRefs) {
    const safe = paperRef.replace(/[^A-Za-z0-9._-]/g, "_");
    const digest = path.join(
      "runtime",
      "payloads",
      "artifacts",
      `${safe}-digest.md`,
    );
    const references = path.join(
      "runtime",
      "payloads",
      "artifacts",
      `${safe}-references.json`,
    );
    const citation = path.join(
      "runtime",
      "payloads",
      "artifacts",
      `${safe}-citation-analysis.json`,
    );
    await fs.writeFile(
      path.join(runRoot, digest),
      `# Downloaded Digest\n\n${paperRef} digest.\n`,
      "utf8",
    );
    await fs.writeFile(
      path.join(runRoot, references),
      JSON.stringify(
        {
          references: [
            {
              id: `ref-${safe}`,
              year: 2024,
              authors: ["Downloaded Author"],
              title: `Downloaded reference for ${paperRef}`,
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    await fs.writeFile(
      path.join(runRoot, citation),
      JSON.stringify(
        {
          report_md: `Downloaded citation analysis for ${paperRef}.`,
        },
        null,
        2,
      ),
      "utf8",
    );
    papers.push({
      paper_ref: paperRef,
      artifacts: [
        {
          artifact_type: "digest",
          payload_type: "digest-markdown",
          content_file: digest,
          status: "available",
        },
        {
          artifact_type: "references",
          payload_type: "references-json",
          content_file: references,
          status: "available",
        },
        {
          artifact_type: "citation_analysis",
          payload_type: "citation-analysis-json",
          content_file: citation,
          status: "available",
        },
      ],
    });
  }
  await writeJson(
    path.join(runRoot, "runtime", "payloads", "paper-artifacts-manifest.json"),
    {
      exported_by: "paper_artifacts.export_filtered.downloaded",
      papers,
    },
  );
}

async function readGuidanceExample(
  stageId: string,
): Promise<Record<string, any>> {
  const guidance = parseYaml(
    await fs.readFile(
      path.join(
        "skills_src",
        "topic-synthesis",
        "contracts",
        "stage-guidance.yaml",
      ),
      "utf8",
    ),
  ) as any;
  const example = guidance?.stages?.[stageId]?.example;
  assert.isObject(example, `missing guidance example for ${stageId}`);
  return example;
}

function assertStage30HardRules(gateInstruction: any) {
  assert.equal(gateInstruction.stage, "stage_30_prepare_analysis_context");
  const requiredReads = gateInstruction.required_reads.map((entry: string) =>
    entry.replace(/\\/g, "/"),
  );
  assert.isTrue(
    requiredReads.some((entry: string) =>
      entry.endsWith("/runtime/payloads/paper-artifacts-manifest-batch-1.json"),
    ),
  );
  assert.isTrue(
    requiredReads.some((entry: string) =>
      entry.endsWith("/runtime/payloads/artifacts"),
    ),
  );
  assert.notInclude(
    gateInstruction.required_reads,
    "runtime/views/filtered-paper-artifacts/",
  );
  assert.isArray(gateInstruction.hard_rules);
  const hardRules = gateInstruction.hard_rules.join("\n");
  assert.include(hardRules, "逐篇阅读 runtime 导出的 paper artifacts");
  assert.include(hardRules, "不得编写或运行脚本");
  assert.include(hardRules, "relevance、quality、core_digest 和 caveats");
  assert.isObject(gateInstruction.subagent_delegation);
  assert.include(
    gateInstruction.subagent_delegation.recommendation,
    "推荐把 paper triage 按 paper_ref 分批委派",
  );
  assert.include(
    gateInstruction.subagent_delegation.constraints.join("\n"),
    "subagent 只返回 assessment row 草案",
  );
  assert.include(
    gateInstruction.subagent_delegation.prompt,
    "只返回 JSON 数组",
  );
}

async function assertRichPrepareContexts(runRoot: string) {
  const cross = await fs.readFile(
    path.join(runRoot, "runtime/views/cross-paper-context.md"),
    "utf8",
  );
  const external = await fs.readFile(
    path.join(runRoot, "runtime/views/external-literature-context.md"),
    "utf8",
  );
  const manifest = await readJson<Record<string, any>>(
    path.join(runRoot, "runtime/views/cross-paper-context.manifest.json"),
  );
  const evidence = await readJson<Record<string, any>>(
    path.join(runRoot, "runtime/views/source-paper-evidence-index.json"),
  );

  assert.include(cross, "Filtered Digest");
  assert.include(cross, "Paper Triage");
  assert.include(cross, "Citation Graph Metrics");
  assert.include(cross, "End-to-end object detection with transformers");
  assert.include(cross, "DETR digest section one");
  assert.include(external, "Compact References");
  assert.include(external, "| id | year | authors | title |");
  assert.include(external, "Citation Analysis Report");
  assert.include(external, "External citation signal for 1:DETR");
  assert.notInclude(
    external,
    "No external network literature was fetched by the split runtime",
  );
  assert.equal(
    manifest.context_paths.main,
    "runtime/views/cross-paper-context.md",
  );
  assert.equal(
    manifest.context_paths.external_literature,
    "runtime/views/external-literature-context.md",
  );
  assert.include(manifest.selected_core_refs, "1:DETR");
  assert.include(manifest.selected_external_refs, "1:DETR");
  assert.equal(manifest.papers[0].digest_status, "available");
  assert.equal(manifest.papers[0].references_status, "available");
  assert.equal(manifest.papers[0].citation_analysis_status, "available");
  assert.lengthOf(evidence.items, 2);
  assert.containsAllKeys(evidence.items[0], [
    "paper_ref",
    "short_evidence",
    "digest_ref",
  ]);
}

async function assertFlatHandoffManifest(
  runRoot: string,
  relativePath: string,
  expectedKeys: string[],
) {
  const manifest = await readJson<Record<string, unknown>>(
    path.join(runRoot, relativePath),
  );
  for (const removedKey of [
    "schema_id",
    "schema_version",
    "handoff",
    "stage",
    "artifacts",
  ]) {
    assert.notProperty(manifest, removedKey);
  }
  assert.containsAllKeys(manifest, expectedKeys);
  for (const [key, value] of Object.entries(manifest)) {
    assert.isString(value, `${relativePath}.${key} should be a path string`);
    const artifactPath = value as string;
    assert.isTrue(path.isAbsolute(artifactPath), `${key} should be absolute`);
    assert.isTrue(
      portablePath(artifactPath).startsWith(portablePath(runRoot) + "/"),
      `${artifactPath} should stay under the run root`,
    );
    await fs.access(artifactPath);
  }
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

function runGateStatus(
  skillRoot: string,
  runRoot: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  const scriptPath = path.join(skillRoot, "scripts", "gate.py");
  const command = pythonArgs(scriptPath, args);
  return spawnSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "pipe",
  }).status;
}

function runGateProcess(
  skillRoot: string,
  runRoot: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  const scriptPath = path.join(skillRoot, "scripts", "gate.py");
  const command = pythonArgs(scriptPath, args);
  return spawnSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, ...env },
    stdio: "pipe",
  });
}

function runGateInCwd(
  skillRoot: string,
  cwd: string,
  args: string[],
  env: NodeJS.ProcessEnv,
) {
  const scriptPath = path.join(skillRoot, "scripts", "gate.py");
  const command = pythonArgs(scriptPath, args);
  const output = execFileSync(command.command, command.args, {
    cwd,
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
fs.mkdirSync(path.join(process.cwd(), "runtime"), { recursive: true });
fs.appendFileSync(path.join(process.cwd(), "runtime", "bridge-calls.jsonl"), JSON.stringify({ command, input }) + "\n");
const papers = (input.paper_refs || ["1:DETR", "1:DINO"]).map((ref) => ({
  paper_ref: ref,
  item_key: ref.split(":")[1],
  title: ref === "1:DETR" ? "End-to-end object detection with transformers" : "DINO: DETR with improved DeNoising anchor boxes",
  year: ref === "1:DETR" ? 2020 : 2022,
  match_reasons: ["explicit"]
}));
if (command === "topics get-context") {
  if (input.topicId === "missing-topic") {
    console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "topics.get_context", data: { ok: false, status: "not_found", topic_id: input.topicId } } }));
  } else if (input.view === "digest") {
    console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "topics.get_context", data: { schema_id: "synthesis.topic_context", view: "digest", topic_id: input.topicId, digest: {
      topic_id: input.topicId,
      title: "DETR-style Object Detection",
      definition: "Query-based object detection methods derived from DETR.",
      language: "zh-CN",
      paper_count: 1
    } } } }));
  } else if (input.view === "audit") {
    const linkedRefs = input.topicId === "partial-triage-topic" ? ["1:DETR", "1:DINO"] : ["1:DETR"];
    const linkedPapers = linkedRefs.map((ref) => ({
      paper_ref: ref,
      item_key: ref.split(":")[1],
      title: ref === "1:DETR" ? "End-to-end object detection with transformers" : "DINO: DETR with improved DeNoising anchor boxes",
      year: ref === "1:DETR" ? 2020 : 2022
    }));
    const savedTriage = input.topicId === "no-triage-topic" ? {} : {
      "1:DETR": {
        paper_ref: "1:DETR",
        relevance_level: "core",
        relevance_reason: "Original topic anchor.",
        paper_quality_level: "high",
        paper_quality_reason: "Fixture quality.",
        core_digest: "DETR remains the update anchor.",
        caveats: []
      }
    };
    console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "topics.get_context", data: { schema_id: "synthesis.topic_context", view: "audit", topic_id: input.topicId, audit: {
      topic_id: input.topicId,
      language: "zh-CN",
      current_hashes: {
        artifact: "sha256:artifact",
        manifest: "sha256:manifest",
        metadata: "sha256:metadata"
      },
      section_hashes: { summary: "sha256:summary" },
      topic_resolver: { paper_refs: linkedRefs, combine: "union" },
      resolved_paper_set: { papers: linkedPapers, returned: linkedPapers.length, total: linkedPapers.length },
      source_papers: linkedPapers.map((paper) => ({
        ...paper,
        summary: paper.paper_ref === "1:DETR" ? "DETR remains the update anchor." : "DINO was already linked but lacks saved triage.",
        synthesis_role: paper.paper_ref === "1:DETR" ? "core" : "supporting",
        quality: paper.paper_ref === "1:DETR" ? "high" : "unknown",
        caveats: []
      })),
      source_paper_triage: savedTriage,
      source_materials: { status: "complete", percent: 100 },
      discovery: { status: "candidates", candidate_count: 1, hints: [{ literature_item_id: "1:DINO" }] }
    } } } }));
  } else {
    console.log(JSON.stringify({ ok: false, error: { code: "invalid_view" } }));
    process.exitCode = 1;
  }
} else if (command === "resolvers resolve") {
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "resolvers.resolve", data: { ok: true, papers, returned: papers.length, total: papers.length } } }));
} else if (command === "citation-graph get-metrics") {
  const refs = input.paperRefs || input.paper_refs || [];
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "citation_graph.get_metrics", data: { ok: true, status: "ready", items: refs.map((paper_ref) => ({
    paper_ref,
    status: "ready",
    foundation_score: 1,
    frontier_score: paper_ref.endsWith("DINO") ? 0.9 : 0.7,
    internal_pagerank: 0.5,
    internal_in_degree: 2,
    internal_out_degree: 3,
    external_reference_count: 2,
    unresolved_reference_count: 1,
    synthesis_role_hints: ["core", "external-heavy"]
  })) } } }));
} else if (command === "paper-artifacts export-filtered") {
  if (process.env.ZS_FAKE_BRIDGE_REMOTE_EXPORT === "1") {
    console.log(JSON.stringify({
      ok: true,
      data: {
        approval: "none",
        capability: "paper_artifacts.export_filtered",
        data: {
          delivery: {
            mode: "bridge-download",
            downloadCommand: "zotero-bridge file download file-123 --output paper-artifacts.zip",
            unpackHint: "tar -xf paper-artifacts.zip -C .",
            manifest_file: "runtime/payloads/paper-artifacts-manifest.json"
          }
        }
      }
    }));
    process.exit(0);
  }
  const refs = input.paper_refs || [];
  const viewRoot = path.join(input.run_root, "runtime", "payloads", "artifacts");
  fs.mkdirSync(viewRoot, { recursive: true });
  const manifest = { exported_by: "paper_artifacts.export_filtered", papers: refs.map((paper_ref) => {
    const safe = paper_ref.replace(/[^A-Za-z0-9._-]/g, "_");
    const digest = path.join("runtime", "payloads", "artifacts", safe + "-digest.md");
    const references = path.join("runtime", "payloads", "artifacts", safe + "-references.json");
    const citation = path.join("runtime", "payloads", "artifacts", safe + "-citation-analysis.json");
    fs.writeFileSync(path.join(input.run_root, digest), "# Digest\n\n## Contribution\n\n" + paper_ref + " digest section one.\n\n## Method\n\nFiltered digest method evidence.\n");
    fs.writeFileSync(path.join(input.run_root, references), JSON.stringify({ references: [
      { id: "ref-" + safe, year: 2024, authors: ["Author One", "Author Two"], title: "External citation signal for " + paper_ref }
    ] }, null, 2));
    fs.writeFileSync(path.join(input.run_root, citation), JSON.stringify({ report_md: "External citation signal for " + paper_ref + " indicates related DETR-family literature." }, null, 2));
    return { paper_ref, artifacts: [
      { artifact_type: "digest", payload_type: "digest-markdown", content_file: digest, status: "available" },
      { artifact_type: "references", payload_type: "references-json", content_file: references, status: "available" },
      { artifact_type: "citation_analysis", payload_type: "citation-analysis-json", content_file: citation, status: "available" }
    ] };
  }) };
  fs.writeFileSync(path.join(input.run_root, "runtime", "payloads", "paper-artifacts-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: true, data: { approval: "none", capability: "paper_artifacts.export_filtered", data: { manifest } } }));
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
  const bridgePosix = path.join(binDir, "zotero-bridge");
  await fs.writeFile(
    bridgePosix,
    '#!/usr/bin/env sh\nexec node "$(dirname "$0")/fake-zotero-bridge.mjs" "$@"\n',
    "utf8",
  );
  await fs.chmod(bridgePosix, 0o755);
  return process.platform === "win32" ? bridgeCmd : bridgePosix;
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
    await writeJson(path.join(runRoot, "runtime/input.json"), {
      topicId: "detr-topic",
    });

    const gate0 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate0.stage, "stage_00_runtime_setup");
    const preflightOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(preflightOutput.result.status, "ready");
    assert.equal(preflightOutput.result.linked_paper_count, 1);
    assert.equal(preflightOutput.result.saved_triage_count, 1);
    assert.deepEqual(preflightOutput.result.base_hashes, {
      artifact: "sha256:artifact",
      manifest: "sha256:manifest",
      metadata: "sha256:metadata",
    });
    assert.deepEqual(
      (await readBridgeCalls(runRoot)).map((call) => call.command),
      ["topics get-context", "topics get-context"],
    );
    const updateAuditReport = await readJson<any>(
      path.join(runRoot, "runtime/payloads/update-audit-report.json"),
    );
    assert.notProperty(updateAuditReport, "baseline_resolve");
    assert.deepEqual(updateAuditReport.current_linked_papers.paper_refs, [
      "1:DETR",
    ]);
    assert.deepEqual(updateAuditReport.saved_triage.missing_refs, []);

    await writeJson(
      path.join(runRoot, "runtime/payloads/update-topic-context.json"),
      {
        update_decision: {
          action: "continue",
          reason: "Fixture audit found one new candidate.",
          message: "Proceeding with update.",
        },
        resolver: { paper_refs: ["1:DETR", "1:DINO"], combine: "union" },
        resolver_reasoning: "Fixture update resolver keeps DETR and adds DINO.",
      },
    );
    const gate1 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate1.stage, "stage_10_update_topic_context");
    await writeJson(
      path.join(runRoot, "runtime/payloads/update-topic-context-invalid.json"),
      {
        update_decision: {
          action: "continue",
          reason: "Invalid fixture removes the current resolver ref.",
          message: "Proceeding with update.",
        },
        resolver: { paper_refs: ["1:DINO"], combine: "union" },
        resolver_reasoning: "Invalid update resolver.",
      },
    );
    assert.equal(
      runGateStatus(
        packages.updatePrepare,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/update-topic-context-invalid.json",
        ],
        env,
      ),
      2,
    );
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
    assert.deepEqual(updateContextOutput.result.triage_required_refs, [
      "1:DINO",
    ]);
    assert.equal(updateContextOutput.result.triage_mode, "missing_triage");

    const gate2 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assertStage30HardRules(gate2);
    assert.deepEqual(gate2.triage_required_refs, ["1:DINO"]);
    const resolverManifest = await readJson<any>(
      path.join(runRoot, "runtime/payloads/resolver.json"),
    );
    assert.deepEqual(resolverManifest.base_hashes, {
      artifact: "sha256:artifact",
      manifest: "sha256:manifest",
      metadata: "sha256:metadata",
    });
    assert.deepEqual(resolverManifest.resolve_diff.added_refs, ["1:DINO"]);

    const gate3 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assertStage30HardRules(gate3);
    await writeJson(
      path.join(runRoot, "runtime/payloads/prepare-analysis-context.json"),
      {
        assessments: [
          {
            paper_ref: "1:DINO",
            relevance_level: "core",
            relevance_reason: "Representative update candidate.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DINO adds update evidence.",
            caveats: [],
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

    for (const filePath of [
      "runtime/payloads/resolver.json",
      "runtime/payloads/citation-graph-metrics-batch-1.json",
      "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      "runtime/views/cross-paper-context.md",
      "runtime/views/external-literature-context.md",
      "runtime/views/cross-paper-context.manifest.json",
      "runtime/views/source-paper-evidence-index.json",
      "runtime/handoff/prepare-analysis-context.json",
    ]) {
      await fs.access(path.join(runRoot, filePath));
    }
    await assertRichPrepareContexts(runRoot);

    const auditStatus = runGateStatus(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "audit"],
      env,
    );
    assert.notEqual(auditStatus, 0);
  });

  it("reads the update topic id from the ACP request parameter envelope", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-update-parameter",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };
    await writeJson(path.join(runRoot, "runtime/input.json"), {
      parameter: { topicId: "detr-topic" },
    });

    const gate0 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate0.stage, "stage_00_runtime_setup");
    const preflightOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(preflightOutput.result.status, "ready");
    assert.equal(preflightOutput.result.topic_id, "detr-topic");
    assert.notProperty(preflightOutput.result, "canceled_output");
  });

  it("locks the run root from an absolute db path even when cwd is the skill package", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-absolute-db-"),
    );
    const runRoot = path.join(tempRoot, "workspace");
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { PYTHONUTF8: "1" };

    const gate0 = runGateInCwd(
      packages.prepare,
      packages.prepare,
      ["--db", dbPath],
      env,
    );
    assert.equal(
      gate0.db_path,
      absRunPath(runRoot, "runtime/topic-synthesis.sqlite"),
    );

    const run0 = runGateInCwd(
      packages.prepare,
      packages.prepare,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(run0.result.run_root, absRunPath(runRoot, "."));
    await fs.access(path.join(runRoot, "runtime", "topic-synthesis.sqlite"));
  });

  it("reads the update topic id from the ACP input manifest when runtime input is absent", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-update-input-manifest",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };
    await writeJson(
      path.join(
        runRoot,
        ".audit/update-topic-synthesis-prepare.1/input_manifest.json",
      ),
      {
        kind: "acp.skill.run.v1",
        skill_id: "update-topic-synthesis-prepare",
        taskName: "Update synthesis: detr-topic / prepare",
        sourceAttachmentPaths: [],
        parameter: { topicId: "detr-topic" },
        runtime_options: {
          workspace: {
            mode: "new",
            workflow_run_id: "workflow-run",
          },
        },
        fetch_type: "result",
      },
    );
    assert.isFalse(await exists(path.join(runRoot, "runtime/input.json")));

    const gate0 = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(gate0.stage, "stage_00_runtime_setup");
    const preflightOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(preflightOutput.result.status, "ready");
    assert.equal(preflightOutput.result.topic_id, "detr-topic");
    assert.notProperty(preflightOutput.result, "canceled_output");
  });

  it("requires full update triage when the topic has no saved triage", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-update-no-triage",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };
    await writeJson(path.join(runRoot, "runtime/input.json"), {
      topicId: "no-triage-topic",
    });

    runGate(packages.updatePrepare, runRoot, ["--db", dbPath], env);
    const preflightOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(preflightOutput.result.saved_triage_count, 0);

    await writeJson(
      path.join(runRoot, "runtime/payloads/update-topic-context.json"),
      {
        update_decision: {
          action: "continue",
          reason: "Fixture topic lacks reusable triage.",
          message: "Proceeding with full triage.",
        },
        resolver: { paper_refs: ["1:DETR", "1:DINO"], combine: "union" },
        resolver_reasoning: "Fixture resolver keeps DETR and adds DINO.",
      },
    );
    const updateOutput = runGate(
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
    assert.equal(updateOutput.result.triage_mode, "full");
    assert.deepEqual(updateOutput.result.triage_required_refs, [
      "1:DETR",
      "1:DINO",
    ]);
  });

  it("cancels update prepare when the updated resolver adds no papers", async function () {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "topic-synthesis-split-runtime-"),
    );
    const runRoot = path.join(
      tempRoot,
      "runtime",
      "acp",
      "skill-runs",
      "acp-skill-split-runtime-update-partial-triage",
    );
    await fs.mkdir(path.join(runRoot, "runtime", "payloads"), {
      recursive: true,
    });
    const bridgeBin = await createFakeBridge(runRoot);
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");
    const env = { ZOTERO_BRIDGE_BIN: bridgeBin };
    await writeJson(path.join(runRoot, "runtime/input.json"), {
      topicId: "partial-triage-topic",
    });

    runGate(packages.updatePrepare, runRoot, ["--db", dbPath], env);
    const preflightOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    assert.equal(preflightOutput.result.linked_paper_count, 2);
    assert.equal(preflightOutput.result.saved_triage_count, 1);
    assert.equal(preflightOutput.result.saved_triage_missing_count, 1);

    await writeJson(
      path.join(runRoot, "runtime/payloads/update-topic-context.json"),
      {
        update_decision: {
          action: "continue",
          reason: "Fixture topic has incomplete persisted triage.",
          message: "Proceeding with gap triage.",
        },
        resolver: { paper_refs: ["1:DETR", "1:DINO"], combine: "union" },
        resolver_reasoning: "Fixture resolver keeps the persisted workset.",
      },
    );
    const updateOutput = runGate(
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
    assert.equal(updateOutput.result.status, "canceled");
    assert.equal(
      updateOutput.result.canceled_output.reason,
      "no_new_resolved_papers",
    );
    assert.deepEqual(updateOutput.result.resolve_diff.added_refs, []);

    const completedOutput = runGate(
      packages.updatePrepare,
      runRoot,
      ["--db", dbPath],
      env,
    );
    assert.equal(completedOutput.stage, "completed");
    assert.equal(completedOutput.output.kind, "topic_synthesis_canceled");
    assert.equal(completedOutput.output.reason, "no_new_resolved_papers");
    assert.isFalse(
      await exists(path.join(runRoot, "runtime/payloads/resolver.json")),
    );
    assert.isFalse(
      await exists(
        path.join(
          runRoot,
          "runtime/payloads/paper-artifacts-manifest-batch-1.json",
        ),
      ),
    );
    assert.deepEqual(
      (await readBridgeCalls(runRoot)).map((call) => call.command),
      ["topics get-context", "topics get-context", "resolvers resolve"],
    );
  });

  it("runs the create split-skill path through the minimal runtime contract", async function () {
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
      path.join(runRoot, "runtime/payloads/create-topic-context-invalid.json"),
      {
        topic_title: "DETR-style Object Detection",
        aliases: ["DETR"],
        definition: "Query-based object detection methods derived from DETR.",
        scope_include: ["DETR"],
        scope_exclude: [],
        duplicate_status: "maybe",
        duplicate_candidate_ids: [],
        duplicate_reason: "Invalid enum fixture.",
      },
    );
    assert.equal(
      runGateStatus(
        packages.prepare,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/create-topic-context-invalid.json",
        ],
        env,
      ),
      2,
    );
    assert.equal(
      runGate(packages.prepare, runRoot, ["--db", dbPath], env).stage,
      "stage_10_create_topic_context",
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
      path.join(runRoot, "runtime/payloads/resolver-and-workset-invalid.json"),
      {
        resolver: { paper_refs: [] },
        resolver_reasoning: "Invalid resolver fixture.",
        operation_intent: "update_full",
      },
    );
    assert.equal(
      runGateStatus(
        packages.prepare,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/resolver-and-workset-invalid.json",
        ],
        env,
      ),
      2,
    );
    assert.equal(
      runGate(packages.prepare, runRoot, ["--db", dbPath], env).stage,
      "stage_20_resolver_and_workset",
    );

    await writeJson(
      path.join(runRoot, "runtime/payloads/resolver-and-workset.json"),
      {
        resolver: { paper_refs: ["1:DETR", "1:DINO"], combine: "union" },
        resolver_reasoning: "Fixture resolver.",
        operation_intent: "create",
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
      path.join(
        runRoot,
        "runtime/payloads/prepare-analysis-context-invalid.json",
      ),
      {
        assessments: [
          {
            paper_ref: "1:DETR",
            relevance_level: "primary",
            relevance_reason: "Invalid enum fixture.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DETR baseline.",
            caveats: [],
          },
        ],
      },
    );
    assert.equal(
      runGateStatus(
        packages.prepare,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/prepare-analysis-context-invalid.json",
        ],
        env,
      ),
      2,
    );
    await writeJson(
      path.join(
        runRoot,
        "runtime/payloads/prepare-analysis-context-duplicate.json",
      ),
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
          },
          {
            paper_ref: "1:DETR",
            relevance_level: "related",
            relevance_reason: "Duplicate fixture.",
            paper_quality_level: "medium",
            paper_quality_reason: "Fixture quality.",
            core_digest: "Duplicate DETR.",
            caveats: [],
          },
        ],
      },
    );
    assert.equal(
      runGateStatus(
        packages.prepare,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/prepare-analysis-context-duplicate.json",
        ],
        env,
      ),
      2,
    );
    assertStage30HardRules(
      runGate(packages.prepare, runRoot, ["--db", dbPath], env),
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
          },
          {
            paper_ref: "1:DINO",
            relevance_level: "core",
            relevance_reason: "Training improvement.",
            paper_quality_level: "high",
            paper_quality_reason: "Fixture quality.",
            core_digest: "DINO improves DETR training.",
            caveats: [],
          },
        ],
      },
    );
    const gate3 = runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    assertStage30HardRules(gate3);
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
    await assertRichPrepareContexts(runRoot);

    runGate(packages.core, runRoot, ["--db", dbPath], env);
    runGate(packages.core, runRoot, ["--db", dbPath, "--action", "run"], env);
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis-invalid.json"),
      {
        taxonomy: {
          summary: {
            text: "Invalid route fixture.",
          },
          nodes: [
            {
              id: "route-missing-source",
              title: "Missing source refs",
              definition: "A route without source refs.",
              core_problem: "Fixture.",
              mechanism: "Fixture.",
              strengths: ["Fixture."],
              limitations: ["Fixture."],
              maturity: "unknown",
            },
          ],
        },
        timeline_events: {
          summary: {},
          events: [
            {
              id: "event-detr",
              description: "Fixture event.",
              phase: "foundation",
              source_paper_refs: ["1:DETR"],
            },
          ],
        },
        claims: [
          {
            id: "claim-detr",
            text: "Fixture claim.",
            source_paper_refs: ["1:DETR"],
          },
        ],
        improvement_dimension_summary: {},
        improvement_dimensions: [
          {
            id: "dim-detr",
            source_paper_refs: ["1:DETR"],
          },
        ],
        concept_candidate_labels: ["DETR"],
        debates: [
          {
            id: "debate-detr",
            source_paper_refs: ["1:DETR"],
          },
        ],
        future_directions: [
          {
            id: "future-detr",
            title: "Efficient DETR training",
            direction_type: "method_limitation",
            current_limitation:
              "Training cost remains visible in the fixture evidence.",
            future_direction: "Future work can improve convergence objectives.",
            rationale:
              "The source paper fixture supports a training-efficiency direction.",
            source_paper_refs: ["1:DETR"],
          },
        ],
        review_outline: {
          topic_importance: "Fixture topic importance.",
          writing_strategies: [
            {
              id: "strategy-fixture",
              title: "Fixture writing strategy",
              review_thesis: "Fixture thesis.",
              writing_strategy: "Fixture strategy.",
              section_plan: ["Fixture section."],
              best_for: "Fixture review.",
              risks: "Fixture risk.",
              source_paper_refs: ["1:DETR"],
            },
          ],
          recommended_strategy_id: "strategy-fixture",
        },
      },
    );
    assert.equal(
      runGateStatus(
        packages.core,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/core-synthesis-invalid.json",
        ],
        env,
      ),
      2,
    );
    const validCorePayload = await readGuidanceExample(
      "stage_40_core_synthesis",
    );
    const invalidAxisPayload = JSON.parse(JSON.stringify(validCorePayload));
    invalidAxisPayload.taxonomy.axes[0].axis_type = "unsupported_axis";
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis-invalid-axis.json"),
      invalidAxisPayload,
    );
    assert.equal(
      runGateStatus(
        packages.core,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/core-synthesis-invalid-axis.json",
        ],
        env,
      ),
      2,
    );
    const emptyAxesPayload = JSON.parse(JSON.stringify(validCorePayload));
    emptyAxesPayload.taxonomy.axes = [];
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis-empty-axes.json"),
      emptyAxesPayload,
    );
    assert.equal(
      runGateStatus(
        packages.core,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/core-synthesis-empty-axes.json",
        ],
        env,
      ),
      2,
    );
    const axisWithoutNodesPayload = JSON.parse(
      JSON.stringify(validCorePayload),
    );
    axisWithoutNodesPayload.taxonomy.axes[0].nodes = [];
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis-axis-no-nodes.json"),
      axisWithoutNodesPayload,
    );
    assert.equal(
      runGateStatus(
        packages.core,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/core-synthesis-axis-no-nodes.json",
        ],
        env,
      ),
      2,
    );
    const stillGate40 = runGate(packages.core, runRoot, ["--db", dbPath], env);
    assert.equal(stillGate40.stage, "stage_40_core_synthesis");
    await writeJson(
      path.join(runRoot, "runtime/payloads/core-synthesis.json"),
      validCorePayload,
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
    await writeJson(
      path.join(runRoot, "runtime/payloads/kg-enrichment-invalid.json"),
      {
        concept_details: [{ label: "DETR" }],
        existing_topic_relation_proposals: [
          {
            target_topic_id: "existing-topic",
            relation_type: "not_a_relation",
            confidence: 2,
            rationale: "Invalid relation fixture.",
            source_paper_refs: ["1:UNKNOWN"],
          },
        ],
        prospective_topic_relation_proposals: [
          {
            target_topic_seed: "query-centric object detection",
            relation_type: "related_topic_candidate",
            extra: "not allowed",
          },
        ],
        topic_matching_terms: {
          include_terms: ["DETR"],
          must_have_terms: ["DETR"],
          methods: [],
          exclude_terms: [],
        },
      },
    );
    assert.equal(
      runGateStatus(
        packages.core,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/kg-enrichment-invalid.json",
        ],
        env,
      ),
      2,
    );
    assert.equal(
      runGate(packages.core, runRoot, ["--db", dbPath], env).stage,
      "stage_50_kg_enrichment",
    );
    await writeJson(
      path.join(runRoot, "runtime/payloads/kg-enrichment.json"),
      await readGuidanceExample("stage_50_kg_enrichment"),
    );
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
    const existingRelationSidecar = await readJson<any>(
      path.join(runRoot, "result/sidecars/topic-graph-relation-proposals.json"),
    );
    const prospectiveRelationSidecar = await readJson<any>(
      path.join(
        runRoot,
        "result/sidecars/prospective-topic-relation-proposals.json",
      ),
    );
    assert.deepEqual(
      existingRelationSidecar.proposals,
      (await readGuidanceExample("stage_50_kg_enrichment"))
        .existing_topic_relation_proposals,
    );
    assert.deepEqual(
      prospectiveRelationSidecar.proposals,
      (await readGuidanceExample("stage_50_kg_enrichment"))
        .prospective_topic_relation_proposals,
    );

    const finalizeManifest = await readJson<any>(
      path.join(runRoot, "runtime/views/finalize-context.manifest.json"),
    );
    assert.equal(
      finalizeManifest.external_literature_context.path,
      "runtime/views/external-literature-context.md",
    );
    assert.equal(
      finalizeManifest.sidecars.prospective_topic_relation_proposals.path,
      "result/sidecars/prospective-topic-relation-proposals.json",
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
    assert.isTrue(
      finalizeGate60.required_reads
        .map((entry: string) => entry.replace(/\\/g, "/"))
        .some((entry: string) =>
          entry.endsWith("/runtime/views/external-literature-context.md"),
        ),
    );
    await writeJson(
      path.join(
        runRoot,
        "runtime/payloads/coverage-and-collection-suggestions-invalid.json",
      ),
      {
        coverage_verdict: "mostly_good",
        coverage_reason: "",
        coverage_caveats: [],
        external_context_summary: "",
        suggested_collection_directions: [],
      },
    );
    assert.equal(
      runGateStatus(
        packages.finalize,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/coverage-and-collection-suggestions-invalid.json",
        ],
        env,
      ),
      2,
    );
    assert.equal(
      runGate(packages.finalize, runRoot, ["--db", dbPath], env).stage,
      "stage_60_coverage_and_collection_suggestions",
    );
    await writeJson(
      path.join(
        runRoot,
        "runtime/payloads/coverage-and-collection-suggestions-legacy.json",
      ),
      {
        coverage_verdict: "partial",
        coverage_reason: "当前库内材料覆盖核心路线。",
        reliability_summary: "旧字段不属于当前 payload。",
        coverage_caveats: [],
        external_context_summary: "外部 context 支撑后续补充方向。",
        suggested_collection_directions: [
          {
            direction: "补充效率导向文献。",
            reason: "改善部署覆盖。",
            example_titles_or_terms: ["Deformable DETR"],
            priority: "medium",
          },
        ],
      },
    );
    assert.equal(
      runGateStatus(
        packages.finalize,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/coverage-and-collection-suggestions-legacy.json",
        ],
        env,
      ),
      2,
    );
    await writeJson(
      path.join(
        runRoot,
        "runtime/payloads/coverage-and-collection-suggestions.json",
      ),
      await readGuidanceExample("stage_60_coverage_and_collection_suggestions"),
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
    await writeJson(
      path.join(runRoot, "runtime/payloads/summary-invalid.json"),
      {
        summary_brief: "",
        summary_overview: "",
        key_takeaways: [],
      },
    );
    assert.equal(
      runGateStatus(
        packages.finalize,
        runRoot,
        [
          "--db",
          dbPath,
          "--action",
          "submit",
          "--payload",
          "runtime/payloads/summary-invalid.json",
        ],
        env,
      ),
      2,
    );
    assert.equal(
      runGate(packages.finalize, runRoot, ["--db", dbPath], env).stage,
      "stage_70_summary",
    );
    await writeJson(
      path.join(runRoot, "runtime/payloads/summary.json"),
      await readGuidanceExample("stage_70_summary"),
    );
    await writeJson(path.join(runRoot, "result/final-output.candidate.json"), {
      kind: "topic_synthesis_handoff",
      forged: true,
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
      "result/topic-synthesis-artifacts.json",
      "result/final-output.candidate.json",
    ]) {
      await fs.access(path.join(runRoot, filePath));
    }

    await assertFlatHandoffManifest(
      runRoot,
      "runtime/handoff/prepare-analysis-context.json",
      [
        "db_path",
        "resolver_manifest",
        "paper_artifacts_manifest_batch_1",
        "cross_paper_context",
        "external_literature_context",
        "cross_paper_context_manifest",
        "source_paper_evidence_index",
      ],
    );
    await assertFlatHandoffManifest(
      runRoot,
      "runtime/handoff/core-enrichment.json",
      [
        "db_path",
        "stage_40_core_synthesis_payload",
        "stage_50_kg_enrichment_payload",
        "concept_cards_proposal",
        "topic_graph_relation_proposals",
        "prospective_topic_relation_proposals",
        "topic_interest_metadata",
        "finalize_context_manifest",
      ],
    );

    for (const removedRuntimeArtifact of [
      "runtime/artifact-registry.json",
      "runtime/gate-transcript",
      "runtime/action-transcript",
      "runtime/stage-receipts",
      "runtime/views/synthesis-report.md",
      "runtime/views/synthesis-report.manifest.json",
    ]) {
      assert.isFalse(
        await exists(path.join(runRoot, removedRuntimeArtifact)),
        `${removedRuntimeArtifact} should not be generated`,
      );
    }

    const finalCandidate = await readJson(
      path.join(runRoot, "result/final-output.candidate.json"),
    );
    assert.notProperty(finalCandidate, "__SKILL_DONE__");
    assert.notProperty(finalCandidate, "forged");
    assert.notProperty(finalCandidate, "analysis_manifest_path");
    assert.notProperty(finalCandidate, "candidate_output_path");
    assert.equal(finalCandidate.kind, "topic_synthesis");
    assert.equal(
      finalCandidate.artifact_manifest_path,
      absRunPath(runRoot, "result/topic-synthesis-artifacts.json"),
    );
    const artifactManifest = await readJson<Record<string, string>>(
      path.join(runRoot, "result/topic-synthesis-artifacts.json"),
    );
    assert.equal(
      artifactManifest.topic_analysis,
      absRunPath(runRoot, "result/topic-analysis.json"),
    );
    assert.equal(
      artifactManifest.final_output_candidate,
      absRunPath(runRoot, "result/final-output.candidate.json"),
    );
    for (const artifactPath of Object.values(artifactManifest)) {
      assert.isTrue(path.isAbsolute(artifactPath));
      assert.isTrue(
        portablePath(artifactPath).startsWith(portablePath(runRoot) + "/"),
        `${artifactPath} should stay under the run root`,
      );
      await fs.access(artifactPath);
    }
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
    const synthesisReport = sections.synthesis_report as Record<string, any>;
    assert.include(synthesisReport.body, "# DETR-style Object Detection");
    assert.include(synthesisReport.body, "## 技术路线");
    assert.include(synthesisReport.body, "## 时间线");
    assert.include(synthesisReport.body, "## 核心结论");
    assert.include(synthesisReport.body, "## 文献列表");
    assert.include(
      synthesisReport.body,
      "[\\[1\\]](#ref-1), [\\[2\\]](#ref-2)",
    );
    assert.include(
      synthesisReport.body,
      '<a id="ref-1"></a>[1] *End-to-end object detection with transformers* (2020) {1:DETR}',
    );
    assert.notInclude(synthesisReport.body, "generated artifact");
    assert.notInclude(synthesisReport.body, "Host apply");
    assert.notInclude(synthesisReport.body, "sidecars");
    assert.notInclude(synthesisReport.body, "Runtime fallback");
    for (const entry of Object.values<any>(analysisManifest.sidecars)) {
      assert.equal(entry.content_type, "json");
      assert.isString(entry.schema_id);
    }
    assert.notProperty(sections, "paper_evidence");
    assert.notProperty(sections, "evidence_map");
    assert.notProperty(sections, "improvement_dimension_summary");
    assert.notProperty(sections, "external_literature_analysis");
    assert.notProperty(sections, "gaps");
    assert.notProperty(sections, "positioning");
    assert.notProperty(analysisManifest.sections, "gaps");
    assert.notProperty(analysisManifest.sections, "positioning");
    assert.notProperty(sections.summary as any, "long_summary");
    assert.notProperty(
      analysisManifest.sections,
      "improvement_dimension_summary",
    );
    assert.notProperty(
      analysisManifest.sections,
      "external_literature_analysis",
    );
    assert.deepEqual(
      (sections.source_papers as any[]).map((row) => row.paper_ref).sort(),
      ["1:DETR", "1:DINO"],
    );
    assert.property(analysisManifest.sections, "future_directions");
    assert.isArray(sections.future_directions);
    assert.include(
      (sections.future_directions as any[])[0].source_paper_refs,
      "1:DETR",
    );
    assert.equal(
      (sections.future_directions as any[])[0].direction_type,
      "method_limitation",
    );
    assert.notInclude(
      JSON.stringify(sections.future_directions),
      JSON.stringify((sections.coverage as any).coverage_caveats || []),
    );
    assert.deepEqual(
      Object.fromEntries(
        (sections.source_papers as any[]).map((row) => [
          row.paper_ref,
          row.year,
        ]),
      ),
      {
        "1:DETR": "2020",
        "1:DINO": "2022",
      },
    );
    const detrSourcePaper = (sections.source_papers as any[]).find(
      (row) => row.paper_ref === "1:DETR",
    );
    assert.equal(detrSourcePaper?.summary, "DETR baseline.");
    assert.equal(detrSourcePaper?.synthesis_role, "core");
    assert.equal(detrSourcePaper?.quality, "high");
    assert.deepEqual(detrSourcePaper?.caveats, []);
    assert.notProperty(detrSourcePaper, "triage");
    assert.deepEqual((sections.statistics as any).time_span, {
      earliest: "2020",
      latest: "2022",
    });
    assert.deepEqual((sections.claims as any[])[0].source_paper_refs, [
      "1:DETR",
      "1:DINO",
    ]);
    assert.deepEqual(
      (sections.timeline_events as any).events.map(
        (row: any) => row.source_paper_refs[0],
      ),
      ["1:DETR"],
    );
    assert.deepEqual(
      ((sections.taxonomy as any).nodes as any[]).map(
        (row) => row.source_paper_refs[0],
      ),
      ["1:DETR", "1:DINO"],
    );
    assert.isArray((sections.taxonomy as any).axes);
    assert.isAtLeast((sections.taxonomy as any).axes.length, 2);
    assert.include(
      (sections.taxonomy as any).axes.map((axis: any) => axis.axis_type),
      "research_route",
    );
    assert.deepEqual(
      (sections.taxonomy as any).axes[0].nodes.map(
        (row: any) => row.source_paper_refs[0],
      ),
      ["1:DETR", "1:DINO"],
    );
    assert.isObject((sections.improvement_dimensions as any).summary);
    assert.isArray((sections.improvement_dimensions as any).dimensions);
    assert.isString(
      (sections.improvement_dimensions as any).dimensions[0].analysis,
    );
    assert.notProperty(
      (sections.improvement_dimensions as any).dimensions[0],
      "summary",
    );
    assert.notProperty(
      (sections.improvement_dimensions as any).dimensions[0],
      "label",
    );
    assert.isString((sections.coverage as any).external_context_summary);
    assert.isArray((sections.coverage as any).suggested_collection_directions);
    assert.notProperty(sections.coverage as any, "external_literature");
    assert.notProperty(sections.coverage as any, "reliability_summary");
    assert.notProperty(sections.coverage as any, "route_coverage_summary");
    assert.notProperty(sections.coverage as any, "claim_coverage_summary");
    assert.notProperty(sections.coverage as any, "timeline_coverage_summary");
    assert.include(
      (sections.debates as any[])[0].current_judgment,
      "当前库内证据",
    );
    assert.notInclude(
      JSON.stringify(sections.debates),
      "Runtime-normalized topic synthesis row.",
    );
    assert.property(sections.review_outline as any, "topic_importance");
    assert.isArray((sections.review_outline as any).writing_strategies);
    assert.equal(
      (sections.review_outline as any).recommended_strategy_id,
      "strategy:method-evolution",
    );
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

  it("surfaces remote artifact export download instructions at stage 20", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-topic-remote-export-"),
    );
    const bridgeBin = await createFakeBridge(runRoot);
    const env = {
      ZOTERO_BRIDGE_BIN: bridgeBin,
      ZS_FAKE_BRIDGE_REMOTE_EXPORT: "1",
    };
    const dbPath = path.join(runRoot, "runtime", "topic-synthesis.sqlite");

    runGate(packages.prepare, runRoot, ["--db", dbPath], env);
    runGate(
      packages.prepare,
      runRoot,
      ["--db", dbPath, "--action", "run"],
      env,
    );
    await writeJson(
      path.join(runRoot, "runtime/payloads/create-topic-context.json"),
      {
        topic_title: "Object Detection",
        definition:
          "Object detection identifies and localizes object instances in images.",
        aliases: ["Detection"],
        scope_include: ["DETR"],
        scope_exclude: ["segmentation"],
        duplicate_status: "none",
        duplicate_candidate_ids: [],
        duplicate_reason: "No existing topic in fixture.",
      },
    );
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
        resolver: { paper_refs: ["1:DETR"], combine: "union" },
        resolver_reasoning: "Fixture resolver.",
        operation_intent: "create",
      },
    );

    const result = runGateProcess(
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
    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 2);
    assert.include(combinedOutput, "bridge-download");
    assert.include(combinedOutput, "downloadCommand");
    assert.include(combinedOutput, "unpackHint");
    assert.include(combinedOutput, "paper-artifacts-export-delivery.json");
    const delivery = await readJson<any>(
      path.join(
        runRoot,
        "runtime/payloads/paper-artifacts-export-delivery.json",
      ),
    );
    assert.equal(delivery.delivery.mode, "bridge-download");
    assert.include(
      delivery.delivery.downloadCommand,
      "zotero-bridge file download",
    );
    assert.property(delivery, "export_data");

    await writeDownloadedPaperArtifactManifest(runRoot, ["1:DETR"]);
    const recovered = runGate(
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
    assert.equal(recovered.stage, "stage_20_resolver_and_workset");
    assert.equal(
      runGate(packages.prepare, runRoot, ["--db", dbPath], env).stage,
      "stage_30_prepare_analysis_context",
    );
    const recoveredManifest = await readJson<Record<string, any>>(
      path.join(
        runRoot,
        "runtime/payloads/paper-artifacts-manifest-batch-1.json",
      ),
    );
    assert.equal(recoveredManifest.papers?.[0]?.paper_ref, "1:DETR");
    const recoveredArtifacts = recoveredManifest.papers?.[0]?.artifacts || [];
    assert.lengthOf(recoveredArtifacts, 3);
    for (const artifact of recoveredArtifacts) {
      assert.isTrue(path.isAbsolute(artifact.content_file));
      assert.isTrue(
        portablePath(artifact.content_file).startsWith(
          portablePath(runRoot) + "/",
        ),
      );
      await fs.access(artifact.content_file);
    }
    const calls = await readBridgeCalls(runRoot);
    assert.equal(
      calls.filter(
        (entry) => entry.command === "paper-artifacts export-filtered",
      ).length,
      1,
    );
  });
});
