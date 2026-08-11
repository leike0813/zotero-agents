import { assert } from "chai";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  startHostBridgeCliFixtureHarness,
  type HostBridgeCliFixtureHarness,
} from "../helpers/hostBridgeCliHarness";

const skillRoot = path.resolve("skills_builtin/export-research-bundle");
const activeHarnesses = new Set<HostBridgeCliFixtureHarness>();

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

async function createBridgeHarness(
  runRoot: string,
  options: {
    remote?: boolean;
    topicInventory?: "ok" | "error";
    topicContext?: "ok" | "empty" | "missing" | "error";
    libraryMode?: "normal" | "fallback" | "empty" | "malformed" | "truncated";
  } = {},
) {
  const fixtureRoot = path.join(runRoot, "runtime", "test-fixtures");
  await fs.mkdir(fixtureRoot, { recursive: true });
  const provider = path.join(fixtureRoot, "host-bridge-provider.cjs");
  const source = String.raw`#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { command, input } = JSON.parse(process.argv[2]);
const topicInventoryMode = ${JSON.stringify(options.topicInventory || "ok")};
const topicContextMode = ${JSON.stringify(options.topicContext || "ok")};
const libraryMode = ${JSON.stringify(options.libraryMode || "normal")};
fs.appendFileSync(path.resolve("bridge-calls.jsonl"), JSON.stringify({ command, input }) + "\n");
let data = {};
if (command === "synthesis topic list") {
  if (topicInventoryMode === "error") { console.error("topic inventory unavailable"); process.exit(2); }
  const cursor = Number(input.cursor || 0);
  data = cursor === 0
    ? { topics: [{ topic_id: "topic-a", title: "Graph Evidence", definition: "Citation graph evidence selection" }], nextCursor: "1", hasMore: true, returned: 1, total: 2, limit: Number(input.limit || 25) }
    : { topics: [{ topic_id: "topic-b", title: "Unrelated", definition: "Other research" }], nextCursor: "", hasMore: false, returned: 1, total: 2, limit: Number(input.limit || 25) };
}
else if (command === "library items list") {
  const query = String(input.query || "");
  const cursor = String(input.cursor || "");
  let items = [];
  let nextCursor = "";
  let hasMore = false;
  if (libraryMode === "malformed") {
    items = [{ title: "Missing canonical identity" }];
  }
  else if (libraryMode === "fallback") {
    if (query === "citation graph") items = [{ key: "AAAA1111", libraryId: 1, title: "Graph-grounded synthesis", creators: ["A"], year: "2024" }];
    if (query === "selection methods") items = [{ key: "BBBB2222", libraryId: 1, title: "Evidence selection", creators: ["B"], year: "2023" }];
  }
  else if (libraryMode === "normal" || libraryMode === "truncated") {
    if (query.includes("graph")) {
      if (!cursor) {
        items = [{ key: "AAAA1111", libraryId: 1, title: "Graph-grounded synthesis", creators: ["A"], year: "2024" }];
        nextCursor = "graph-page-2";
        hasMore = true;
      }
      else if (cursor === "graph-page-2") {
        items = [{ key: "BBBB2222", libraryId: 1, title: "Evidence selection", creators: ["B"], year: "2023" }];
        if (libraryMode === "truncated") {
          nextCursor = "graph-page-3";
          hasMore = true;
        }
      }
    }
    else {
      items = [{ key: "BBBB2222", libraryId: 1, title: "Evidence selection", creators: ["B"], year: "2023" }];
    }
  }
  data = { items, nextCursor, hasMore, returned: items.length, total: items.length + (hasMore ? 1 : 0), limit: Number(input.limit || 50) };
}
else if (command === "synthesis topic get-context") {
  if (topicContextMode === "error") { console.error("topic context unavailable"); process.exit(2); }
  data = topicContextMode === "missing"
    ? { topic: { topic_id: input.topicId, markdown: "# Graph Evidence" }, diagnostics: { warnings: [] } }
    : { topic: { topic_id: input.topicId, markdown: "# Graph Evidence" }, resolved_paper_set: { papers: topicContextMode === "empty" ? [] : ["1:AAAA1111"] }, diagnostics: { warnings: [] } };
}
else if (command === "synthesis index reference get") data = { entries: [], nextCursor: "", hasMore: false, returned: 0, total: 0, limit: Number(input.limit || 25), diagnostics: { stale: false, warnings: [] } };
else if (command === "synthesis artifact manifest") {
  const papers = (input.paper_refs || []).map((paper_ref, index) => ({ paper_ref, artifacts: [
    { artifact_type: "digest", payload_type: "digest-markdown", status: "available" },
    { artifact_type: "references", payload_type: "references-json", status: "available" },
    { artifact_type: "citation_analysis", payload_type: "citation-analysis-json", status: "available" },
    { artifact_type: "literature_score", payload_type: "literature-score-json", status: "available", literature_quality: { status: "available", schema: "literature_score.v1", rubric_id: "rubric.v1", paper_type: "empirical", overall_score: index ? 60 : 90, confidence: 0.8, confidence_adjusted_score: index ? 58 : 85, quality_prior: index ? 0.58 : 0.82, payload_hash: "sha256:score-" + index, diagnostics: [] } }
  ] }));
  data = { papers, total: papers.length, returned: papers.length, limit: 100, nextCursor: "", hasMore: false, diagnostics: [] };
}
else if (command === "synthesis artifact export-filtered") {
  const refs = input.paper_refs || [];
  const manifest_file = "runtime/payloads/paper-artifacts-manifest.json";
  if (${JSON.stringify(options.remote === true)} && !fs.existsSync(path.resolve(manifest_file))) {
    data = { paper_refs: refs, manifest_file, delivery: { mode: "bridge-download", downloadCommand: "download fixture", unpackHint: "unpack fixture" } };
    console.log(JSON.stringify(data));
    process.exit(0);
  }
  const papers = refs.map((paper_ref, index) => {
    if (index === refs.length - 1) return { paper_ref, artifacts: [] };
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
else if (command === "library item get") {
  const key = input.key;
  const libraryId = Number(input.libraryId);
  data = { key, libraryId, title: "Detail " + key, fields: { abstractNote: "Graph evidence abstract" } };
}
else if (command === "synthesis graph get-metrics") {
  const metrics = (input.paperRefs || []).map((paper_ref, index) => ({ paper_ref, foundation_score: 0.9 - index * 0.1, frontier_score: 0.7, pagerank_norm: 0.6, in_degree_norm: 0.5 }));
  data = { ok: true, status: "ready", graph_hash: "sha256:graph", metrics_hash: "sha256:metrics", metrics, nextCursor: "", hasMore: false, returned: metrics.length, total: metrics.length, limit: Number(input.limit || 25), diagnostics: { stale: false, warnings: [] } };
}
else if (command === "library readiness audit") data = { items: [{ key: input.query, libraryId: Number(input.libraryId), readiness: input.query === "BBBB2222" ? { markdown: "missing", pdf: "present", analysis: "present" } : { markdown: "present", pdf: "present", analysis: "present" }, evidence: {} }], nextCursor: "", hasMore: false, returned: 1, total: 1, limit: Number(input.limit || 25) };
else { console.error("unsupported fake command: " + command); process.exit(2); }
console.log(JSON.stringify(data));
`;
  await fs.writeFile(provider, source, "utf8");
  const harness = await startHostBridgeCliFixtureHarness({
    commands: [
      "synthesis topic list",
      "library items list",
      "synthesis topic get-context",
      "synthesis index reference get",
      "synthesis artifact manifest",
      "synthesis artifact export-filtered",
      "library item get",
      "synthesis graph get-metrics",
      "library readiness audit",
    ],
    providerPath: provider,
    cwd: runRoot,
  });
  activeHarnesses.add(harness);
  return harness;
}

async function advanceToEvidenceStage(
  runRoot: string,
  dbPath: string,
  inputPath: string,
  env: NodeJS.ProcessEnv,
  options: { automaticTopicSkip?: boolean } = {},
) {
  const common = ["--db", dbPath, "--input", inputPath];
  assert.equal(runGate(runRoot, common, env).stage, "stage_00_runtime_setup");
  runGate(runRoot, [...common, "--action", "run"], env);

  const intentGate = runGate(runRoot, common, env);
  assert.equal(intentGate.stage, "stage_10_intent_query_plan");
  await writeJson(intentGate.payload_path, {
    research_dimensions: ["citation graph", "evidence selection"],
    queries: [
      {
        query: "graph evidence",
        focus: "graph-grounded research",
        fallback_queries: ["citation graph"],
      },
      {
        query: "evidence selection",
        focus: "selection methods",
        fallback_queries: ["selection methods"],
      },
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
  const discoveryCalls = (
    await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
  )
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.notInclude(
    discoveryCalls.map((call) => call.command),
    "library items list",
  );

  const topicGate = runGate(runRoot, common, env);
  if (options.automaticTopicSkip) {
    assert.equal(topicGate.stage, "stage_40_evidence_prepare");
    return common;
  }
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

  afterEach(async function () {
    await Promise.all(
      Array.from(activeHarnesses, async (harness) => {
        await harness.close();
        activeHarnesses.delete(harness);
      }),
    );
  });

  it("runs discovery through the CLI fixture, batched assessment, scoring, and rendering", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-runtime-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot);
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
    const env = harness.env;
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
      const overlap = packet.candidates.find(
        (candidate: any) => candidate.paper_ref === "1:AAAA1111",
      );
      if (overlap) {
        assert.include(overlap.sources, "topic:topic-a");
        assert.include(overlap.sources, "query:graph evidence");
        assert.include(overlap.topic_ids, "topic-a");
      }
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
    assert.lengthOf(selection.papers, 2);
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
            b.selection_score - a.selection_score ||
            a.paper_ref.localeCompare(b.paper_ref),
        )
        .map((row: any) => row.paper_ref),
    );
    assert.equal(selection.schema_version, "2.0.0");
    assert.equal(selection.papers[0].literature_quality.status, "available");
    assert.lengthOf(selection.papers[0].artifact_manifest, 4);
    assert.containsAllKeys(selection.papers[0].selection_components, [
      "semantic_relevance",
      "quality_prior",
      "graph",
      "topic_coverage",
      "material_readiness",
    ]);
    const bridgeCalls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const searchCalls = bridgeCalls.filter(
      (call) => call.command === "library items list",
    );
    assert.isNotEmpty(searchCalls);
    const topicContextIndex = bridgeCalls.findIndex(
      (call) => call.command === "synthesis topic get-context",
    );
    const firstSearchIndex = bridgeCalls.findIndex(
      (call) => call.command === "library items list",
    );
    assert.isAtLeast(topicContextIndex, 0);
    assert.isAbove(firstSearchIndex, topicContextIndex);
    assert.notInclude(
      bridgeCalls.map((call) => call.command),
      "synthesis graph query-cluster",
    );
    for (const call of searchCalls) {
      assert.isString(call.input.query);
      assert.notProperty(call.input, "text");
    }
    assert.deepEqual(
      searchCalls
        .filter((call) => call.input.query === "graph evidence")
        .map((call) => call.input.cursor || ""),
      ["", "graph-page-2"],
    );
    assert.notInclude(
      searchCalls.map((call) => call.input.query),
      "citation graph",
    );
    const itemGetCalls = bridgeCalls.filter(
      (call) => call.command === "library item get",
    );
    assert.isNotEmpty(itemGetCalls);
    for (const call of itemGetCalls) {
      assert.isString(call.input.key);
      assert.equal(call.input.libraryId, 1);
    }
  });

  it("retains low-score Topic papers beyond the non-Topic related limit", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-topic-mandatory-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot);
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Graph-grounded review",
        researchContent: "Select citation graph evidence for synthesis",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 1,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    while (
      runGate(runRoot, common, harness.env).stage ===
      "stage_50_paper_assessment"
    ) {
      const batchGate = runGate(runRoot, common, harness.env);
      const packet = JSON.parse(
        await fs.readFile(batchGate.required_reads[0], "utf8"),
      );
      const semantic = (ref: string) =>
        ref.endsWith("AAAA1111") ? 0.2 : ref.endsWith("BBBB2222") ? 0.9 : 0.8;
      await writeJson(batchGate.payload_path, {
        batch_id: packet.batch_id,
        assessments: packet.candidates.map((candidate: any) => ({
          paper_ref: candidate.paper_ref,
          semantic_relevance: semantic(candidate.paper_ref),
          matched_topic_ids: candidate.paper_ref.endsWith("AAAA1111")
            ? ["topic-a"]
            : [],
          reason: "Assessment for mandatory Topic regression.",
          evidence_basis: ["metadata"],
          caveats: [],
        })),
      });
      runGate(
        runRoot,
        [...common, "--action", "submit", "--payload", batchGate.payload_path],
        harness.env,
      );
    }
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    const preview = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "06-selection-preview.json"),
        "utf8",
      ),
    );
    assert.sameMembers(
      preview.papers.map((paper: any) => paper.paper_ref),
      ["1:AAAA1111", "1:BBBB2222"],
    );
    assert.isBelow(
      preview.papers.find((paper: any) => paper.paper_ref === "1:AAAA1111")
        .semantic_relevance,
      0.45,
    );
    assert.equal(
      preview.papers.find((paper: any) => paper.paper_ref === "1:AAAA1111")
        .role,
      "related",
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
  });

  it("diagnoses a missing Topic paper set and continues with library candidates", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-topic-missing-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "missing",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Library-only continuation",
        researchContent: "Continue when Topic context is incomplete",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    while (
      runGate(runRoot, common, harness.env).stage ===
      "stage_50_paper_assessment"
    ) {
      const batchGate = runGate(runRoot, common, harness.env);
      const packet = JSON.parse(
        await fs.readFile(batchGate.required_reads[0], "utf8"),
      );
      await writeJson(batchGate.payload_path, {
        batch_id: packet.batch_id,
        assessments: packet.candidates.map((candidate: any) => ({
          paper_ref: candidate.paper_ref,
          semantic_relevance: 0.8,
          matched_topic_ids: [],
          reason: "Library evidence remains available.",
          evidence_basis: ["metadata"],
          caveats: ["Topic paper membership was unavailable."],
        })),
      });
      runGate(
        runRoot,
        [...common, "--action", "submit", "--payload", batchGate.payload_path],
        harness.env,
      );
    }
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    const preview = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "runtime", "views", "06-selection-preview.json"),
        "utf8",
      ),
    );
    assert.isNotEmpty(preview.papers);
    assert.include(
      preview.diagnostics.map((entry: any) => entry.code),
      "topic_resolved_papers_unavailable",
    );
  });

  it("executes bounded fallback anchors after confirmed empty primaries", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-fallback-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "empty",
      libraryMode: "fallback",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Fallback metadata anchors",
        researchContent: "Find graph evidence using bounded metadata anchors",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    const receipt = runGate(
      runRoot,
      [...common, "--action", "run"],
      harness.env,
    );
    assert.equal(receipt.result.discovery_summary.status, "ready");
    assert.equal(receipt.result.candidate_count, 2);
    const calls = (
      await fs.readFile(path.join(runRoot, "bridge-calls.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((call) => call.command === "library items list");
    assert.deepEqual(
      calls.map((call) => call.input.query),
      [
        "graph evidence",
        "citation graph",
        "evidence selection",
        "selection methods",
      ],
    );
  });

  it("keeps discovered candidates while recording the two-page anchor boundary", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-truncated-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "empty",
      libraryMode: "truncated",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Bounded metadata paging",
        researchContent: "Retain canonical candidates within the page budget",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    const receipt = runGate(
      runRoot,
      [...common, "--action", "run"],
      harness.env,
    );
    assert.equal(receipt.result.discovery_summary.status, "ready");
    const graphAnchor = receipt.result.discovery_summary.anchor_receipts.find(
      (entry: any) => entry.anchor === "graph evidence",
    );
    assert.equal(graphAnchor.pages, 2);
    assert.isFalse(graphAnchor.complete);
  });

  it("cancels only after discovery is confirmed empty", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-empty-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "empty",
      libraryMode: "empty",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "No matching metadata",
        researchContent: "Confirm the bounded Zotero discovery result",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    const receipt = runGate(
      runRoot,
      [...common, "--action", "run"],
      harness.env,
    );
    assert.equal(receipt.result.discovery_summary.status, "empty_confirmed");
    assert.equal(
      runGate(runRoot, common, harness.env).stage,
      "stage_60_enrich_and_select",
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    const completed = runGate(runRoot, common, harness.env);
    assert.equal(completed.output.kind, "research_bundle_canceled");
    assert.equal(completed.output.reason, "no_related_literature");
  });

  it("cancels after real assessments place every non-Topic candidate below threshold", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-assessed-empty-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "empty",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Low relevance metadata candidates",
        researchContent: "Assess candidates before concluding none are related",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    const batchGate = runGate(runRoot, common, harness.env);
    const packet = JSON.parse(
      await fs.readFile(batchGate.required_reads[0], "utf8"),
    );
    await writeJson(batchGate.payload_path, {
      batch_id: packet.batch_id,
      assessments: packet.candidates.map((candidate: any) => ({
        paper_ref: candidate.paper_ref,
        semantic_relevance: 0.2,
        matched_topic_ids: [],
        reason: "The available evidence does not match the manuscript intent.",
        evidence_basis: ["metadata"],
        caveats: [],
      })),
    });
    runGate(
      runRoot,
      [...common, "--action", "submit", "--payload", batchGate.payload_path],
      harness.env,
    );
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    runGate(runRoot, [...common, "--action", "run"], harness.env);
    const completed = runGate(runRoot, common, harness.env);
    assert.equal(completed.output.kind, "research_bundle_canceled");
    assert.equal(completed.output.reason, "no_related_literature");
  });

  it("keeps malformed candidate discovery at Stage 40", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-incomplete-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicContext: "empty",
      libraryMode: "malformed",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Malformed discovery evidence",
        researchContent:
          "Do not convert protocol failures into business cancellation",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
    );
    const failed = runGateProcess(
      runRoot,
      [...common, "--action", "run"],
      harness.env,
    );
    assert.notEqual(failed.status, 0);
    const gate = runGate(runRoot, common, harness.env);
    assert.equal(gate.stage, "stage_40_evidence_prepare");
    assert.isUndefined(gate.output);
  });

  it("keeps an unavailable Topic inventory from becoming a confirmed empty cancellation", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "export-research-bundle-topic-incomplete-"),
    );
    const dbPath = path.join(
      runRoot,
      "runtime",
      "export-research-bundle.sqlite",
    );
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot, {
      topicInventory: "error",
      libraryMode: "empty",
    });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Unavailable Topic inventory",
        researchContent:
          "Do not convert missing Topic state into an empty result",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const common = await advanceToEvidenceStage(
      runRoot,
      dbPath,
      inputPath,
      harness.env,
      { automaticTopicSkip: true },
    );
    const failed = runGateProcess(
      runRoot,
      [...common, "--action", "run"],
      harness.env,
    );
    assert.notEqual(failed.status, 0);
    const gate = runGate(runRoot, common, harness.env);
    assert.equal(gate.stage, "stage_40_evidence_prepare");
    assert.isUndefined(gate.output);
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
    const harness = await createBridgeHarness(runRoot, { remote: true });
    await writeJson(inputPath, {
      parameter: {
        paperTitle: "Remote graph review",
        researchContent: "Select graph evidence",
        maxTopics: 1,
        maxCorePapers: 1,
        maxRelatedPapers: 3,
      },
    });
    const env = harness.env;
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
