import { assert } from "chai";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const skillRoot = path.resolve("skills_builtin/collection-collector");

function pythonCommand(args: string[]) {
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
        path.join(skillRoot, "scripts", "gate_runtime.py"),
        ...args,
      ],
    };
  }
  return {
    command: process.env.PYTHON || "python",
    args: [path.join(skillRoot, "scripts", "gate_runtime.py"), ...args],
  };
}

function runGate(runRoot: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const command = pythonCommand(args);
  return JSON.parse(
    execFileSync(command.command, command.args, {
      cwd: runRoot,
      encoding: "utf8",
      env: { ...process.env, PYTHONUTF8: "1", ...env },
    }),
  );
}

async function writeJson(target: string, value: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFakeBridge(runRoot: string) {
  const binDir = path.join(runRoot, ".zotero-bridge", "bin");
  await fs.mkdir(binDir, { recursive: true });
  const bridge = path.join(binDir, "zotero-bridge");
const source = String.raw`#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("--input")) {
  console.error("semantic reads must use --query");
  process.exit(64);
}
const queryIndex = args.indexOf("--query");
const commandArgs = args.slice(0, queryIndex >= 0 ? queryIndex : args.length);
const command = commandArgs.join(" ");
let data = {};
if (command === "bridge status") data = { status: "ok" };
else if (command === "library items list") data = {
  items: [{ libraryId: 1, key: "EXIST123", itemType: "journalArticle", title: "Existing streaming paper" }],
  hasMore: false
};
else if (command === "library snapshot") data = {
  items: [
    { libraryId: 1, key: "ITEM1234", itemType: "journalArticle", title: "Streaming perception for tunnel boring machines", tags: ["streaming"] },
    { libraryId: 1, key: "ITEM5678", itemType: "conferencePaper", title: "Multimodal fusion", tags: ["multimodal"] },
    { libraryId: 1, key: "EXIST123", itemType: "journalArticle", title: "Existing streaming paper", tags: ["streaming"] }
  ],
  hasMore: false
};
else if (command === "synthesis topic list") data = {
  topics: [{ topicId: "topic-a", title: "Multimodal perception" }],
  hasMore: false
};
else if (command === "synthesis topic get-context") data = {
  topicId: "topic-a",
  sourcePapers: ["1:ITEM5678"]
};
else if (command.startsWith("library item get")) {
  const key = commandArgs[commandArgs.indexOf("--key") + 1];
  data = { libraryId: 1, key, itemType: "journalArticle", title: key === "ITEM1234" ? "Streaming perception for tunnel boring machines" : "Multimodal fusion" };
} else {
  console.error("unsupported command: " + command);
  process.exit(2);
}
console.log(JSON.stringify({ data }));
`;
  await fs.writeFile(bridge, source, { mode: 0o755 });
  return bridge;
}

describe("collection collector skill runtime", function () {
  this.timeout(30000);

  it("scans inventory, excludes current members, assesses packets, and renders thresholded output", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection-collector-runtime-"),
    );
    const dbPath = path.join(runRoot, "runtime", "collection-collector.sqlite");
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const bridge = await createFakeBridge(runRoot);
    await writeJson(inputPath, {
      parameter: {
        collection: "1:COLL1234",
        collectionScope: "Streaming multimodal perception for TBM operations",
      },
    });
    const common = ["--db", dbPath, "--input", inputPath];
    const env = { ZOTERO_BRIDGE_BIN: bridge };

    assert.equal(runGate(runRoot, common, env).stage, "stage_00_runtime_setup");
    runGate(runRoot, [...common, "--run-stage"], env);
    assert.equal(
      runGate(runRoot, common, env).stage,
      "stage_10_inventory_collect",
    );
    runGate(runRoot, [...common, "--run-stage"], env);

    const scopeGate = runGate(runRoot, common, env);
    assert.equal(scopeGate.stage, "stage_20_scope_plan");
    await writeJson(scopeGate.payload_path, {
      scope_dimensions: ["streaming perception", "multimodal fusion"],
      positive_terms: ["streaming", "multimodal"],
      negative_terms: [],
      selected_topics: [
        {
          topic_id: "topic-a",
          relevance: 0.9,
          reason: "The topic directly covers multimodal perception.",
        },
      ],
    });
    runGate(
      runRoot,
      [...common, "--submit-stage-payload", scopeGate.payload_path],
      env,
    );
    runGate(runRoot, [...common, "--run-stage"], env);

    const assessmentGate = runGate(runRoot, common, env);
    assert.equal(assessmentGate.stage, "stage_40_paper_assessment");
    const packet = JSON.parse(
      await fs.readFile(assessmentGate.required_reads[0], "utf8"),
    );
    assert.deepEqual(
      packet.papers.map((paper: any) => paper.paper_ref).sort(),
      ["1:ITEM1234", "1:ITEM5678"],
    );
    await writeJson(assessmentGate.payload_path, {
      batch_id: packet.batch_id,
      assessments: packet.papers.map((paper: any) => ({
        paper_ref: paper.paper_ref,
        semantic_relevance: paper.paper_ref === "1:ITEM1234" ? 0.8 : 0.5,
        evidence_basis: paper.matched_topic_ids.length
          ? ["metadata", "topic"]
          : ["metadata", "tags"],
        matched_topic_ids: paper.matched_topic_ids,
        reason: "Assessed against the declared collection scope.",
        caveats: [],
      })),
    });
    runGate(
      runRoot,
      [...common, "--submit-stage-payload", assessmentGate.payload_path],
      env,
    );
    assert.equal(runGate(runRoot, common, env).stage, "stage_50_render_result");
    runGate(runRoot, [...common, "--run-stage"], env);

    const completed = runGate(runRoot, common, env);
    assert.equal(completed.stage, "completed");
    const result = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "collection-collector.result.json"),
        "utf8",
      ),
    );
    assert.equal(result.inventory_count, 3);
    assert.equal(result.existing_count, 1);
    assert.equal(result.eligible_count, 2);
    assert.equal(result.assessed_count, 2);
    assert.equal(result.selected_count, 1);
    assert.deepEqual(
      result.selected_items.map((item: any) => item.paper_ref),
      ["1:ITEM1234"],
    );
  });

  it("returns a terminal invalid_input business cancellation", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection-collector-invalid-"),
    );
    const dbPath = path.join(runRoot, "runtime", "collection-collector.sqlite");
    const inputPath = path.join(runRoot, "runtime", "input.json");
    await writeJson(inputPath, { parameter: { collection: "" } });
    runGate(runRoot, ["--db", dbPath, "--input", inputPath, "--run-stage"]);
    const result = JSON.parse(
      await fs.readFile(
        path.join(runRoot, "collection-collector.result.json"),
        "utf8",
      ),
    );
    assert.equal(result.kind, "collection_collector_canceled");
    assert.equal(result.reason, "invalid_input");
  });
});
