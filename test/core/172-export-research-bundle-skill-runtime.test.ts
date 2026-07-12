import { assert } from "chai";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRoot = path.resolve("skills_builtin/export-research-bundle");

function pythonCommand(script: string, args: string[]) {
  const arProject = path.join(os.homedir(), ".ar");
  const uv = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (uv.status === 0) {
    return {
      command: "uv",
      args: [
        "run",
        `--project=${arProject}`,
        "--locked",
        "--",
        "python",
        script,
        ...args,
      ],
    };
  }
  return { command: process.env.PYTHON || "python", args: [script, ...args] };
}

function runGate(runRoot: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const command = pythonCommand(
    path.join(skillRoot, "scripts", "gate_runtime.py"),
    args,
  );
  const stdout = execFileSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1", ...env },
  });
  return JSON.parse(stdout);
}

function runGateProcess(
  runRoot: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
) {
  const command = pythonCommand(
    path.join(skillRoot, "scripts", "gate_runtime.py"),
    args,
  );
  return spawnSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: { ...process.env, PYTHONUTF8: "1", ...env },
  });
}

async function writeJson(target: string, value: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function exists(target: string) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function createFakeBridge(runRoot: string) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  const bridge = path.join(binDir, "zotero-bridge");
  const source = String.raw`#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
let input = {};
if (inputIndex >= 0) {
  const raw = args[inputIndex + 1] || "{}";
  input = raw.startsWith("@")
    ? JSON.parse(fs.readFileSync(path.resolve(raw.slice(1)), "utf8"))
    : JSON.parse(raw);
}
const command = args.slice(0, inputIndex >= 0 ? inputIndex : args.length).join(" ");
let data = {};
if (command === "bridge status") data = { status: "ok" };
else if (command === "synthesis topic list") {
  const cursor = Number(input.cursor || 0);
  data = cursor === 0
    ? { topics: [{ topic_id: "topic-a", title: "Graph Evidence", definition: "Citation graph evidence selection" }], cursor: "0", next_cursor: "1", has_more: true }
    : { topics: [{ topic_id: "topic-b", title: "Unrelated", definition: "Other research" }], cursor: "1", next_cursor: "", has_more: false };
}
else if (command === "library item search") data = input.query.includes("graph")
  ? [{ key: "AAAA1111", libraryId: 1, title: "Graph-grounded synthesis", creators: ["A"], year: "2024" }, { key: "BBBB2222", libraryId: 1, title: "Evidence selection", creators: ["B"], year: "2023" }]
  : [{ key: "BBBB2222", libraryId: 1, title: "Evidence selection", creators: ["B"], year: "2023" }];
else if (command === "synthesis topic get-review-input") data = { topic: { topic_id: input.topicId, markdown: "# Graph Evidence" }, resolved_paper_set: { papers: [{ paper_ref: "1:AAAA1111" }] }, citation_graph_slice: { nodes: [], edges: [] }, diagnostics: { warnings: [] } };
else if (command === "synthesis graph query-cluster") data = { ok: true, nodes: [{ node_id: "zotero:item:CCCC3333", kind: "library_paper", library_id: 1, item_key: "CCCC3333", title: "Graph frontier" }], edges: [], diagnostics: { graph_status: "ready" } };
else if (command === "synthesis index reference get") data = { rows: [], cursor: "0", next_cursor: "", has_more: false, diagnostics: { stale: false, warnings: [] } };
else if (command === "synthesis artifact export-filtered") {
  const refs = input.paper_refs || [];
  const manifest_file = "runtime/payloads/paper-artifacts-manifest.json";
  if (process.env.FAKE_REMOTE === "1" && !fs.existsSync(path.resolve(manifest_file))) {
    data = { paper_refs: refs, manifest_file, delivery: { mode: "bridge-download", downloadCommand: "download fixture", unpackHint: "unpack fixture" } };
    console.log(JSON.stringify({ ok: true, data: { data } }));
    process.exit(0);
  }
  const papers = refs.map((paper_ref, index) => {
    const content_file = "runtime/payloads/artifacts/digest-" + (index + 1) + ".md";
    const absolute = path.resolve(content_file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "# Digest " + paper_ref + "\nGraph evidence and research relevance.\n");
    return { paper_ref, artifacts: [{ artifact_type: "digest", payload_type: "digest-markdown", status: "available", content_file }] };
  });
  fs.mkdirSync(path.dirname(path.resolve(manifest_file)), { recursive: true });
  fs.writeFileSync(path.resolve(manifest_file), JSON.stringify({ schema_id: "synthesis.filtered_paper_artifacts_manifest", papers }));
  data = { paper_refs: refs, manifest_file, artifact_statuses: [] };
}
else if (command === "library item get") data = { key: input.key, libraryId: Number(input.libraryId || 1), title: "Detail " + input.key, fields: { abstractNote: "Graph evidence abstract" } };
else if (command === "synthesis graph get-metrics") data = { ok: true, status: "ready", graph_hash: "sha256:graph", metrics_hash: "sha256:metrics", items: (input.paperRefs || []).map((paper_ref, index) => ({ paper_ref, foundation_score: 0.9 - index * 0.1, frontier_score: 0.7, pagerank_norm: 0.6, in_degree_norm: 0.5 })), cursor: "0", nextCursor: "", hasMore: false, diagnostics: { stale: false, warnings: [] } };
else if (command === "library readiness audit") data = { items: [{ key: input.query, libraryId: Number(input.libraryId), readiness: input.query === "BBBB2222" ? { markdown: "missing", pdf: "present", analysis: "present" } : { markdown: "present", pdf: "present", analysis: "present" }, evidence: {} }], hasMore: false, nextCursor: "" };
else { console.error("unsupported fake command: " + command); process.exit(2); }
console.log(JSON.stringify({ ok: true, data: { data } }));
`;
  await fs.writeFile(bridge, source, "utf8");
  await fs.chmod(bridge, 0o755);
  return bridge;
}

async function advanceToEvidenceStage(
  runRoot: string,
  dbPath: string,
  inputPath: string,
  env: NodeJS.ProcessEnv,
) {
  const common = ["--db", dbPath, "--input", inputPath];
  assert.equal(runGate(runRoot, common, env).stage, "stage_00_runtime_setup");
  runGate(runRoot, [...common, "--action", "run"], env);

  const intentGate = runGate(runRoot, common, env);
  assert.equal(intentGate.stage, "stage_10_intent_query_plan");
  await writeJson(intentGate.payload_path, {
    research_dimensions: ["citation graph", "evidence selection"],
    queries: [
      { query: "graph evidence", focus: "graph-grounded research" },
      { query: "evidence selection", focus: "selection methods" },
    ],
  });
  runGate(
    runRoot,
    [...common, "--action", "submit", "--payload", intentGate.payload_path],
    env,
  );

  assert.equal(
    runGate(runRoot, common, env).stage,
    "stage_20_discovery_collect",
  );
  runGate(runRoot, [...common, "--action", "run"], env);

  const topicGate = runGate(runRoot, common, env);
  assert.equal(topicGate.stage, "stage_30_topic_assessment");
  await writeJson(topicGate.payload_path, {
    topics: [
      {
        topic_id: "topic-a",
        relevance: 0.95,
        reason: "Directly covers graph evidence selection.",
      },
    ],
  });
  runGate(
    runRoot,
    [...common, "--action", "submit", "--payload", topicGate.payload_path],
    env,
  );
  assert.equal(
    runGate(runRoot, common, env).stage,
    "stage_40_evidence_prepare",
  );
  return common;
}

describe("export research bundle skill runtime", function () {
  this.timeout(30000);

  it("documents a minimum complete executable contract in SKILL.md", async function () {
    const skillText = await fs.readFile(
      path.join(skillRoot, "SKILL.md"),
      "utf8",
    );
    for (const stage of [
      "stage_00_runtime_setup",
      "stage_10_intent_query_plan",
      "stage_20_discovery_collect",
      "stage_30_topic_assessment",
      "stage_40_evidence_prepare",
      "stage_50_paper_assessment",
      "stage_60_enrich_and_select",
      "stage_70_render_result",
    ]) {
      assert.include(skillText, stage);
    }
    for (const action of [
      "run_stage",
      "submit_stage_payload",
      "complete_bridge_download",
      "return_final_output",
    ]) {
      assert.include(skillText, action);
    }
    for (const schema of [
      "assets/schemas/stage-10-intent-query-plan.schema.json",
      "assets/schemas/stage-30-topic-assessment.schema.json",
      "assets/schemas/stage-50-paper-assessment.schema.json",
    ]) {
      assert.include(skillText, schema);
    }
    for (const contractField of [
      "research_dimensions",
      "matched_topic_ids",
      "evidence_basis",
      "topic_context",
      "research_bundle_selection",
      "research_bundle_canceled",
      "host_unavailable",
      "invalid_input",
      "no_related_literature",
      "__SKILL_DONE__",
      "resume_packet",
    ]) {
      assert.include(skillText, contractField);
    }
    assert.notInclude(skillText, "references/");
    assert.isFalse(await exists(path.join(skillRoot, "references")));
  });

  it("runs discovery, batched semantic assessment, deterministic scoring, and rendering", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-runtime-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const bridge = await createFakeBridge(runRoot);
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Graph-grounded review",
        articleType: "original research",
        researchContent: "Select citation graph evidence for synthesis",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const env = { ZOTERO_BRIDGE_BIN: bridge };
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      env,
    );
    runGate(runRoot, [...common, "--action", "run"], env);

    while (
      runGate(runRoot, common, env).stage === "stage_50_paper_assessment"
    ) {
      const batchGate = runGate(runRoot, common, env);
      const packet = JSON.parse(
        await fs.readFile(batchGate.required_reads[0], "utf8"),
      );
      await writeJson(batchGate.payload_path, {
        batch_id: packet.batch_id,
        assessments: packet.candidates.map((candidate: any, index: number) => ({
          paper_ref: candidate.paper_ref,
          semantic_relevance: 0.9 - index * 0.1,
          matched_topic_ids: ["topic-a"],
          reason: "Relevant to the requested graph evidence research.",
          evidence_basis: ["digest", "metadata"],
          caveats: [],
        })),
      });
      runGate(
        runRoot,
        [...common, "--action", "submit", "--payload", batchGate.payload_path],
        env,
      );
    }

    assert.equal(
      runGate(runRoot, common, env).stage,
      "stage_60_enrich_and_select",
    );
    runGate(runRoot, [...common, "--action", "run"], env);
    assert.equal(runGate(runRoot, common, env).stage, "stage_70_render_result");
    runGate(runRoot, [...common, "--action", "run"], env);

    const completed = runGate(runRoot, common, env);
    assert.equal(completed.stage, "completed");
    assert.equal(completed.output.kind, "research_bundle_selection");
    const selection = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "result", "research-selection.json"),
        "utf8",
      ),
    );
    assert.lengthOf(selection.topics, 1);
    assert.lengthOf(selection.papers, 3);
    assert.equal(selection.papers[0].role, "core");
    assert.equal(selection.papers[1].role, "related");
    assert.equal(
      selection.papers.filter((row: any) => row.role === "core").length,
      1,
    );
    assert.deepEqual(
      selection.papers.map((row: any) => row.paper_ref),
      [...selection.papers]
        .sort(
          (a: any, b: any) =>
            b.score - a.score || a.paper_ref.localeCompare(b.paper_ref),
        )
        .map((row: any) => row.paper_ref),
    );
  });

  it("publishes bounded semantic relevance in the paper assessment contract", async function () {
    const schema = JSON.parse(
      await fs.readFile(
        path.join(
          skillRoot,
          "assets",
          "schemas",
          "stage-50-paper-assessment.schema.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      schema.properties.assessments.items.properties.semantic_relevance.maximum,
      1,
    );
    assert.equal(
      schema.properties.assessments.items.properties.semantic_relevance.minimum,
      0,
    );
  });

  it("pauses for remote artifact delivery and resumes the same stage", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-remote-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const bridge = await createFakeBridge(runRoot);
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Remote graph review",
        researchContent: "Select graph evidence",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const env = { ZOTERO_BRIDGE_BIN: bridge, FAKE_REMOTE: "1" };
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      env,
    );

    const blocked = runGateProcess(
      runRoot,
      [...common, "--action", "run"],
      env,
    );
    assert.equal(blocked.status, 3);
    const gate = runGate(runRoot, common, env);
    assert.equal(gate.status, "external_action_required");
    assert.equal(gate.next_action, "complete_bridge_download");

    const candidates = JSON.parse(
      await fs.readFile(
        path.join(
          runRoot,
          "runtime",
          "views",
          "04-library-search-candidates.json",
        ),
        "utf8",
      ),
    ).papers;
    const digestPath = path.join(
      runRoot,
      "runtime",
      "payloads",
      "artifacts",
      "remote-digest.md",
    );
    await fs.mkdir(path.dirname(digestPath), { recursive: true });
    await fs.writeFile(digestPath, "# Remote digest\n", "utf8");
    await writeJson(
      path.join(
        runRoot,
        "runtime",
        "payloads",
        "paper-artifacts-manifest.json",
      ),
      {
        papers: candidates.map((candidate: any) => ({
          paper_ref: candidate.paper_ref,
          artifacts: [
            {
              artifact_type: "digest",
              status: "available",
              content_file: path.relative(runRoot, digestPath),
            },
          ],
        })),
      },
    );
    const resumed = runGate(runRoot, [...common, "--action", "run"], env);
    assert.isTrue(resumed.result.resumed_delivery);
    assert.equal(
      runGate(runRoot, common, env).stage,
      "stage_50_paper_assessment",
    );
  });

  it("renders a stable cancellation for invalid runner input", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-invalid-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    await writeJson(inputPath, {
      parameter: { paperTitle: "Missing content" },
    });
    const common = ["--db", dbPath, "--input", inputPath];

    const receipt = runGate(runRoot, [...common, "--action", "run"]);
    assert.equal(receipt.result.kind, "research_bundle_canceled");
    assert.equal(receipt.result.reason, "invalid_input");
    const completed = runGate(runRoot, common);
    assert.equal(completed.stage, "completed");
    assert.equal(completed.output.reason, "invalid_input");
    await fs.access(
      path.join(runRoot, "result", "export-research-bundle-artifacts.json"),
    );
  });
});
