import { assert } from "chai";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { pythonRuntimeCommand } from "../helpers/pythonRuntime";
import { startHostBridgeCliFixtureHarness } from "../helpers/hostBridgeCliHarness";

const skillRoot = path.resolve("skills_builtin/collection-collector");

function pythonCommand(args: string[]) {
  return pythonRuntimeCommand([
    path.join(skillRoot, "scripts", "gate_runtime.py"),
    ...args,
  ]);
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

async function createBridgeHarness(runRoot: string) {
  const fixtureRoot = path.join(runRoot, "runtime", "test-fixtures");
  await fs.mkdir(fixtureRoot, { recursive: true });
  const provider = path.join(fixtureRoot, "host-bridge-provider.cjs");
  const source = String.raw`#!/usr/bin/env node
const { command, input } = JSON.parse(process.argv[2]);
let data = {};
if (command === "library items list") {
  if (input.cursor !== undefined && input.cursor !== "opaque-page-2") throw new Error("invalid_library_cursor");
  data = {
    items: [{ libraryId: 1, key: input.cursor ? "EXIST456" : "EXIST123", itemType: "journalArticle", title: "Existing streaming paper" }],
    nextCursor: input.cursor ? null : "opaque-page-2", hasMore: input.cursor === undefined,
    returned: 1, total: 2, limit: Number(input.limit || 25)
  };
}
else if (command === "library snapshot") data = {
  schema: "zotero-agents.library-full-index.v1",
  snapshotId: "snapshot-1",
  libraryId: 1,
  scope: "top-level-regular",
  order: "stable_identity",
  batchSize: 500,
  batchIndex: 0,
  items: [
    ["ITEM1234", "journalArticle", "Streaming perception for tunnel boring machines", ["streaming"]],
    ["ITEM5678", "conferencePaper", "Industrial optics", ["optics"]],
    ["ITEM9998", "conferencePaper", "An unresolved selector", []],
    ["EXIST123", "journalArticle", "Existing streaming paper", ["streaming"]],
    ["EXIST456", "journalArticle", "Another existing streaming paper", ["streaming"]]
  ].map(([key, itemType, title, tags]) => ({
    ref: { libraryId: 1, key }, kind: "regular", itemType, title,
    parentRef: null, state: "active", revision: "1", tags, collectionRefs: [],
    creators: [], date: "", year: null, publicationTitle: "",
    identifiers: { doi: null, isbn: null, issn: null, arxiv: null, pmid: null },
    url: null, noteCount: 0, attachmentCount: 0, annotationCount: 0,
    modifiedAt: "2026-08-31T00:00:00.000Z"
  })),
  nextCursor: null, hasMore: false, returned: 5,
  deliveredItems: 5, deliveredBatches: 1, outcome: "completed",
  completionEvidence: {
    snapshotId: "snapshot-1", schema: "zotero-agents.library-full-index.v1",
    libraryId: 1, scope: "top-level-regular", totalItems: 5, totalBatches: 1,
    order: "stable_identity",
    contentDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    completedAt: "2026-08-31T00:00:00.000Z"
  }
};
else if (command === "synthesis topic list") data = {
  topics: [{ topicId: "topic-a", title: "Multimodal perception" }],
  nextCursor: "", hasMore: false, returned: 1, total: 1, limit: Number(input.limit || 25)
};
else if (command === "synthesis topic get-context") data = {
  topic_id: "topic-a",
  topic_resolver: { paper_refs: ["1:ITEM9998"] },
  resolved_paper_set: { papers: [{ paper_ref: "1:ITEM5678" }] }
};
else if (command === "library item get") {
  const key = input.key;
  data = { libraryId: 1, key, itemType: "journalArticle", title: key === "ITEM1234" ? "Streaming perception for tunnel boring machines" : "Multimodal fusion" };
} else {
  console.error("unsupported command: " + command);
  process.exit(2);
}
console.log(JSON.stringify(data));
`;
  await fs.writeFile(provider, source, "utf8");
  return startHostBridgeCliFixtureHarness({
    commands: [
      "library items list",
      "library snapshot",
      "synthesis topic list",
      "synthesis topic get-context",
      "library item get",
    ],
    providerPath: provider,
    cwd: runRoot,
  });
}

function selectBridgeExecutable(
  runRoot: string,
  options: { env?: NodeJS.ProcessEnv; pathOverride?: string } = {},
) {
  const command = pythonRuntimeCommand([
    "-B",
    "-",
    runRoot,
    options.pathOverride || "",
    path.join(skillRoot, "scripts", "stage_runtime.py"),
  ]);
  const execution = spawnSync(command.command, command.args, {
    cwd: runRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
      ZOTERO_BRIDGE_BIN: options.env?.ZOTERO_BRIDGE_BIN || "",
      PYTHONUTF8: "1",
    },
    input: String.raw`import importlib.util
import json
import os
import sys
from pathlib import Path

module_path = Path(sys.argv[3])
spec = importlib.util.spec_from_file_location("collection_collector_runtime", module_path)
runtime = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(runtime)
if sys.argv[2]:
    os.environ["PATH"] = sys.argv[2]
print(json.dumps(str(runtime.bridge_executable(Path(sys.argv[1])))))
`,
  });
  assert.equal(
    execution.status,
    0,
    `${execution.stdout || ""}\n${execution.stderr || ""}`,
  );
  return JSON.parse(execution.stdout.trim()) as string;
}

function runBridgeDriver(args: {
  runRoot: string;
  operation: string;
  bridgeArgs: string[];
  payload?: unknown;
  env?: NodeJS.ProcessEnv;
}) {
  const dbPath = path.join(args.runRoot, "runtime", "transport.sqlite");
  const command = pythonRuntimeCommand([
    "-B",
    "-",
    args.runRoot,
    dbPath,
    JSON.stringify({
      operation: args.operation,
      bridgeArgs: args.bridgeArgs,
      payload: args.payload,
      hasPayload: Object.prototype.hasOwnProperty.call(args, "payload"),
    }),
    path.join(skillRoot, "scripts", "stage_runtime.py"),
  ]);
  const execution = spawnSync(command.command, command.args, {
    cwd: args.runRoot,
    encoding: "utf8",
    env: { ...process.env, ...args.env, PYTHONUTF8: "1" },
    input: String.raw`import importlib.util
import json
import sqlite3
import sys
from pathlib import Path

module_path = Path(sys.argv[4])
spec = importlib.util.spec_from_file_location("collection_collector_runtime", module_path)
runtime = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(runtime)
request = json.loads(sys.argv[3])
db_path = Path(sys.argv[2])
db_path.parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(db_path)
conn.execute(
    "CREATE TABLE IF NOT EXISTS action_receipts "
    "(operation TEXT, request_json TEXT, response_json TEXT, created_at TEXT)"
)
result = runtime.run_bridge(
    conn,
    Path(sys.argv[1]),
    request["operation"],
    request["bridgeArgs"],
    request["payload"] if request["hasPayload"] else None,
)
stored = conn.execute(
    "SELECT request_json FROM action_receipts ORDER BY rowid DESC LIMIT 1"
).fetchone()
conn.close()
print(json.dumps({
    "result": result,
    "receipt": json.loads(stored[0]),
}, ensure_ascii=False))
`,
  });
  assert.equal(
    execution.status,
    0,
    `${execution.stdout || ""}\n${execution.stderr || ""}`,
  );
  return JSON.parse(execution.stdout.trim()) as {
    result: unknown;
    receipt: { command: string[]; payload: Record<string, unknown> };
  };
}

describe("collection collector skill runtime", function () {
  this.timeout(30000);

  it("scans inventory, excludes current members, assesses packets, and renders thresholded output", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection-collector-runtime-"),
    );
    const dbPath = path.join(runRoot, "runtime", "collection-collector.sqlite");
    const inputPath = path.join(runRoot, "runtime", "input.json");
    const harness = await createBridgeHarness(runRoot);
    await writeJson(inputPath, {
      parameter: {
        collection: "1:COLL1234",
        collectionScope: "Streaming multimodal perception for TBM operations",
      },
    });
    const common = ["--db", dbPath, "--input", inputPath];
    const env = harness.env;

    try {
      assert.equal(
        runGate(runRoot, common, env).stage,
        "stage_00_runtime_setup",
      );
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
      assert.deepEqual(
        packet.papers.find((paper: any) => paper.paper_ref === "1:ITEM5678")
          .matched_topic_ids,
        ["topic-a"],
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
      assert.equal(
        runGate(runRoot, common, env).stage,
        "stage_50_render_result",
      );
      runGate(runRoot, [...common, "--run-stage"], env);

      const completed = runGate(runRoot, common, env);
      assert.equal(completed.stage, "completed");
      const result = JSON.parse(
        await fs.readFile(
          path.join(runRoot, "collection-collector.result.json"),
          "utf8",
        ),
      );
      assert.equal(result.inventory_count, 5);
      assert.equal(result.existing_count, 2);
      assert.equal(result.eligible_count, 2);
      assert.equal(result.assessed_count, 2);
      assert.equal(result.selected_count, 1);
      assert.deepEqual(
        result.selected_items.map((item: any) => item.paper_ref),
        ["1:ITEM1234"],
      );
      const pages = (await harness.readRequests()).filter(
        (request) => request.command === "library items list",
      );
      assert.equal(pages.length, 2);
      assert.notProperty(pages[0].input, "cursor");
      assert.equal(pages[1].input.cursor, "opaque-page-2");
    } finally {
      await harness.close();
    }
  });

  for (const code of ["invalid_library_cursor", "collection_not_found"]) {
    it(`preserves ${code} as the appropriate runtime or business failure`, async function () {
      if (process.platform === "win32") this.skip(); // POSIX executable fixture.
      const runRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), "collection-collector-error-"),
      );
      const dbPath = path.join(
        runRoot,
        "runtime",
        "collection-collector.sqlite",
      );
      const inputPath = path.join(runRoot, "runtime", "input.json");
      const bridgePath = path.join(runRoot, "zotero-bridge");
      await fs.writeFile(
        bridgePath,
        `#!${process.execPath}
if (process.argv[2] === "bridge") {
  console.log(JSON.stringify({ ok: true }));
} else {
  console.log(JSON.stringify({ ok: false, error: { code: ${JSON.stringify(code)}, message: "Host read failed" } }));
  process.exitCode = 1;
}
`,
        { mode: 0o700 },
      );
      await writeJson(inputPath, {
        parameter: { collection: "1:COLL1234", collectionScope: "Perception" },
      });
      const common = ["--db", dbPath, "--input", inputPath];
      const env = { ZOTERO_BRIDGE_BIN: bridgePath };
      runGate(runRoot, [...common, "--run-stage"], env);
      const command = pythonCommand([...common, "--run-stage"]);
      const execution = spawnSync(command.command, command.args, {
        cwd: runRoot,
        encoding: "utf8",
        env: { ...process.env, ...env },
      });
      const resultPath = path.join(runRoot, "collection-collector.result.json");
      if (code === "collection_not_found") {
        assert.equal(execution.status, 0);
        const result = JSON.parse(await fs.readFile(resultPath, "utf8"));
        assert.equal(result.reason, "target_collection_not_found");
        assert.equal(runGate(runRoot, common, env).stage, "completed");
      } else {
        assert.equal(execution.status, 1);
        assert.equal(
          JSON.parse(execution.stderr).kind,
          "collection_collector_runtime_failed",
        );
        assert.include(JSON.parse(execution.stderr).error, code);
        assert.isFalse(
          await fs.access(resultPath).then(
            () => true,
            () => false,
          ),
        );
        assert.equal(
          runGate(runRoot, common, env).stage,
          "stage_10_inventory_collect",
        );
      }
    });
  }

  it("selects the platform-appropriate Bridge executable with override and PATH fallbacks", async function () {
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection collector launcher "),
    );
    const emptyRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection collector path "),
    );
    const binDir = path.join(runRoot, ".zotero-bridge", "bin");
    const pathDir = path.join(emptyRoot, "path with spaces");
    const posixShim = path.join(binDir, "zotero-bridge");
    const cmdShim = path.join(binDir, "zotero-bridge.cmd");
    const exeShim = path.join(binDir, "zotero-bridge.exe");
    const override = path.join(runRoot, "explicit bridge");
    const pathShim = path.join(pathDir, "zotero-bridge");
    const pathCmd = path.join(pathDir, "zotero-bridge.cmd");
    try {
      await fs.mkdir(binDir, { recursive: true });
      await fs.mkdir(pathDir, { recursive: true });
      await Promise.all([
        fs.writeFile(posixShim, "#!/bin/sh\nexit 0\n", { mode: 0o700 }),
        fs.writeFile(cmdShim, "@echo off\r\n"),
        fs.writeFile(exeShim, ""),
        fs.writeFile(override, "explicit"),
        fs.writeFile(pathShim, "#!/bin/sh\nexit 0\n", { mode: 0o700 }),
        fs.writeFile(pathCmd, "@echo off\r\n", { mode: 0o700 }),
      ]);

      if (process.platform === "win32") {
        assert.equal(
          path.normalize(selectBridgeExecutable(runRoot)),
          path.normalize(cmdShim),
        );
        await fs.unlink(cmdShim);
        assert.equal(
          path.normalize(selectBridgeExecutable(runRoot)),
          path.normalize(exeShim),
        );
      } else {
        assert.equal(
          path.normalize(selectBridgeExecutable(runRoot)),
          path.normalize(posixShim),
        );
        await fs.unlink(posixShim);
        assert.equal(
          path.normalize(
            selectBridgeExecutable(runRoot, {
              pathOverride: pathDir,
            }),
          ),
          path.normalize(pathShim),
        );
      }

      assert.equal(
        path.normalize(
          selectBridgeExecutable(runRoot, {
            env: { ZOTERO_BRIDGE_BIN: override },
          }),
        ),
        path.normalize(override),
      );

      const pathSelected = selectBridgeExecutable(emptyRoot, {
        pathOverride: pathDir,
      });
      assert.equal(
        path.dirname(path.normalize(pathSelected)),
        path.normalize(pathDir),
      );
    } finally {
      await Promise.all([
        fs.rm(runRoot, { recursive: true, force: true }),
        fs.rm(emptyRoot, { recursive: true, force: true }),
      ]);
    }
  });

  it("executes a Windows CMD Bridge shim without changing query JSON", async function () {
    if (process.platform !== "win32") this.skip();
    const runRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "collection collector cmd "),
    );
    const fixtureRoot = path.join(runRoot, "runtime", "test-fixtures");
    const provider = path.join(fixtureRoot, "host-bridge-provider.cjs");
    const binDir = path.join(runRoot, ".zotero-bridge", "bin");
    const posixShim = path.join(binDir, "zotero-bridge");
    const cmdShim = path.join(binDir, "zotero-bridge.cmd");
    const fixedEnvName = "COLLECTION_COLLECTOR_CMD_FIXED_ENV";
    await fs.mkdir(fixtureRoot, { recursive: true });
    await fs.writeFile(
      provider,
      String.raw`#!/usr/bin/env node
const { command, input } = JSON.parse(process.argv[2]);
if (command !== "library items list") process.exit(2);
console.log(JSON.stringify({ items: [], nextCursor: null, hasMore: false, returned: 0, total: 0, limit: Number(input.limit || 25) }));
`,
      "utf8",
    );
    const harness = await startHostBridgeCliFixtureHarness({
      commands: ["library items list"],
      providerPath: provider,
      cwd: runRoot,
    });
    try {
      await fs.mkdir(binDir, { recursive: true });
      await fs.writeFile(posixShim, "not a Windows executable\n", {
        mode: 0o700,
      });
      await fs.writeFile(
        cmdShim,
        `@echo off\r\n"${harness.cliPath}" %*\r\n`,
        "utf8",
      );
      const env = {
        ...harness.env,
        [fixedEnvName]: "EXPANDED",
        ZOTERO_BRIDGE_BIN: "",
      };
      const payload = {
        libraryId: 1,
        limit: 25,
        filter: `中文 with spaces "quoted" %${fixedEnvName}% & | < > ^`,
      };
      const observed = runBridgeDriver({
        runRoot,
        operation: "transport",
        bridgeArgs: ["library", "items", "list"],
        payload,
        env,
      });

      assert.deepEqual(observed.receipt.payload, payload);
      const requests = await harness.readRequests();
      assert.lengthOf(requests, 1);
      assert.deepEqual(requests[0].input, payload);

      const noPayload = runBridgeDriver({
        runRoot,
        operation: "bridge-status",
        bridgeArgs: ["bridge", "status"],
        env,
      });
      assert.deepEqual(noPayload.receipt.payload, {});
    } finally {
      await harness.close();
      await fs.rm(runRoot, { recursive: true, force: true });
    }
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
