import { assert } from "chai";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROFILE_SOURCE = path.join(
  process.cwd(),
  "profiles_src/hermes/zotero-librarian",
);
const SERVICE = path.join(
  PROFILE_SOURCE,
  "scripts/zotero_librarian_service.py",
);

function runPython(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(
    "uv",
    [
      "run",
      "--project",
      path.join(os.homedir(), ".ar"),
      "--locked",
      "--",
      "python",
      SERVICE,
      ...args,
    ],
    { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, ...env } },
  );
}

function payload(proc: ReturnType<typeof spawnSync>) {
  assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(String(proc.stdout));
}

function writeFakeBridge(root: string) {
  const bridgeJs = path.join(root, "fake-bridge.js");
  fs.writeFileSync(
    bridgeJs,
    `
const fs = require("fs");
const args = process.argv.slice(2);
const out = (value) => process.stdout.write(JSON.stringify(value));
const fail = (message) => { process.stderr.write(message); process.exit(2); };
if (process.env.FAKE_BRIDGE_LOG) {
  fs.appendFileSync(process.env.FAKE_BRIDGE_LOG, JSON.stringify(args) + "\\n");
}
if (args.includes("wait")) fail("wait must not be used");
if (args.join(" ") === "context selection get") {
  out({ result: { selectedItems: [
    { libraryId: 1, key: "ATT1", id: 101, itemType: "attachment", parent: { id: 11, key: "PARENT1" } },
    { libraryId: 1, key: "ATT2", id: 103, itemType: "attachment", parent: { id: 13, key: "PARENT3" } },
    { libraryId: 1, key: "NOTE1", id: 102, itemType: "note", parent: { id: 12, key: "PARENT2" } }
  ] } });
} else if (args[0] === "library" && args[1] === "snapshot") {
  out({ result: { items: [{ libraryId: 1, key: "PARENT1", id: 11, itemType: "journalArticle", title: "One" }], hasMore: false } });
} else if (args.join(" ").startsWith("workflow describe")) {
  out({ result: {
    workflowId: args[args.indexOf("--workflow") + 1],
    selection: { inputUnit: "attachment", acceptsNoSelection: false },
    provider: { required: false },
    options: { required: [] }
  } });
} else if (args.join(" ").startsWith("workflow validate")) {
  if (!args.includes("--selection")) fail("workflow validate requires --selection");
  out({ result: { ready: true, workflowId: args[args.indexOf("--workflow") + 1] } });
} else if (args.join(" ").startsWith("workflow submit")) {
  const refs = JSON.parse(args[args.indexOf("--items") + 1]);
  const key = refs[0].key;
  if (process.env.FAKE_BRIDGE_FAIL_SUBMIT_KEY === key) fail("uncertain submit for " + key);
  out({ result: { workflowRunId: "workflow-run-" + key, state: "running" } });
} else if (args.join(" ").startsWith("run notification list")) {
  out({ result: { events: [{ eventId: "event-1", workflowRunId: "workflow-run-1", type: "completed", acknowledged: false }] } });
} else if (args.join(" ").startsWith("run notification ack")) {
  out({ result: { acknowledged: true } });
} else if (args.join(" ").startsWith("library item get")) {
  const key = args[args.indexOf("--key") + 1];
  out({ result: { libraryId: 1, key, id: 99, itemType: "journalArticle" } });
} else if (args.join(" ").startsWith("run get")) {
  out({ result: { state: "succeeded" } });
} else if (args.join(" ").startsWith("synthesis insight attention-queue")) {
  out({ result: { items: [] } });
} else fail("unexpected command: " + args.join(" "));
`,
    "utf8",
  );
  const sh = path.join(root, "zotero-bridge");
  fs.writeFileSync(
    sh,
    `#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-bridge.js" "$@"\n`,
    "utf8",
  );
  fs.chmodSync(sh, 0o755);
  return sh;
}

describe("zotero-librarian resident service", function () {
  this.timeout(15_000);

  it("uses one state database and emits operation receipts", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");
    const refreshed = payload(
      runPython(["--bridge", bridge, "--db", db, "index", "refresh"], {}),
    );
    assert.strictEqual(
      refreshed.schema,
      "zotero-librarian.operation-receipt.v1",
    );
    assert.strictEqual(refreshed.operation, "index.refresh");
    assert.strictEqual(refreshed.status, "changed");
    assert.isTrue(fs.existsSync(db));

    const second = payload(
      runPython(["--bridge", bridge, "--db", db, "index", "refresh"], {}),
    );
    assert.strictEqual(second.status, "unchanged");
    const quiet = runPython(
      ["--bridge", bridge, "--db", db, "--quiet", "index", "refresh"],
      {},
    );
    assert.strictEqual(quiet.status, 0);
    assert.strictEqual(quiet.stdout.trim(), "[SILENT]");
  });

  it("validates live attachment selection and requires explicit submit authority", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");
    const planPath = path.join(temp, "plan.json");
    const log = path.join(temp, "bridge.log");
    const selected = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "plan",
          "--workflow",
          "literature-analysis",
          "--from-context",
          "--output",
          planPath,
        ],
        { FAKE_BRIDGE_LOG: log },
      ),
    );
    assert.deepEqual(selected.data.selectionRefs, [
      { key: "ATT1", libraryId: 1 },
      { key: "ATT2", libraryId: 1 },
    ]);
    assert.strictEqual(selected.data.path, planPath);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(planPath, "utf8")),
      selected.data.plan,
    );
    assert.strictEqual(
      selected.data.plan.schema,
      "zotero-librarian.workflow-plan.v2",
    );
    assert.isString(selected.data.plan.planId);
    assert.isString(selected.data.plan.planDigest);
    const validateCalls = fs
      .readFileSync(log, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
      .filter((args) => args[0] === "workflow" && args[1] === "validate");
    assert.lengthOf(validateCalls, 2);
    for (const args of validateCalls) assert.include(args, "--selection");

    const relative = runPython(
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "workflow",
        "plan",
        "--workflow",
        "literature-analysis",
        "--from-context",
        "--output",
        "plan.json",
      ],
      {},
    );
    assert.notStrictEqual(relative.status, 0);
    assert.include(relative.stdout, "absolute_output_required");

    const blocked = runPython(
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "workflow",
        "submit",
        "--plan",
        planPath,
      ],
      {},
    );
    assert.notStrictEqual(blocked.status, 0);
    assert.include(blocked.stdout, "submit_authority_required");

    const submitted = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "submit",
          "--plan",
          planPath,
          "--allow-submit",
          "--concurrency",
          "1",
        ],
        { FAKE_BRIDGE_LOG: log },
      ),
    );
    assert.strictEqual(submitted.status, "changed");
    assert.strictEqual(
      submitted.data.launched[0].workflowRunId,
      "workflow-run-ATT1",
    );
    const second = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "submit",
          "--plan",
          planPath,
          "--allow-submit",
          "--concurrency",
          "1",
        ],
        { FAKE_BRIDGE_LOG: log },
      ),
    );
    assert.strictEqual(
      second.data.launched[0].workflowRunId,
      "workflow-run-ATT2",
    );
    const exhausted = runPython(
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "workflow",
        "submit",
        "--plan",
        planPath,
        "--allow-submit",
      ],
      { FAKE_BRIDGE_LOG: log },
    );
    assert.notStrictEqual(exhausted.status, 0);
    assert.include(exhausted.stdout, "plan_no_pending_entries");
  });

  it("fails closed on plan tampering and never replays uncertain submissions", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");
    const planPath = path.join(temp, "plan.json");
    const log = path.join(temp, "bridge.log");
    payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "plan",
          "--workflow",
          "literature-analysis",
          "--from-context",
          "--output",
          planPath,
        ],
        { FAKE_BRIDGE_LOG: log },
      ),
    );
    const original = fs.readFileSync(planPath, "utf8");
    const tampered = JSON.parse(original);
    tampered.workflowId = "other-workflow";
    fs.writeFileSync(planPath, JSON.stringify(tampered));
    const before = fs.readFileSync(log, "utf8").split("workflow submit").length;
    const rejected = runPython(
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "workflow",
        "submit",
        "--plan",
        planPath,
        "--allow-submit",
      ],
      { FAKE_BRIDGE_LOG: log },
    );
    assert.notStrictEqual(rejected.status, 0);
    assert.include(rejected.stdout, "plan_identity_mismatch");
    const after = fs.readFileSync(log, "utf8").split("workflow submit").length;
    assert.strictEqual(after, before);

    fs.writeFileSync(planPath, original);
    const attention = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "submit",
          "--plan",
          planPath,
          "--allow-submit",
          "--concurrency",
          "2",
        ],
        {
          FAKE_BRIDGE_LOG: log,
          FAKE_BRIDGE_FAIL_SUBMIT_KEY: "ATT2",
        },
      ),
    );
    assert.strictEqual(attention.status, "attention");
    assert.strictEqual(
      attention.data.launched[0].workflowRunId,
      "workflow-run-ATT1",
    );
    assert.strictEqual(attention.data.unknown.ordinal, 1);
    const retry = runPython(
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "workflow",
        "submit",
        "--plan",
        planPath,
        "--allow-submit",
      ],
      { FAKE_BRIDGE_LOG: log },
    );
    assert.notStrictEqual(retry.status, 0);
    assert.include(retry.stdout, "plan_no_pending_entries");
  });

  it("projects notifications and keeps scheduled domains one-pass", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");
    const synced = payload(
      runPython(["--bridge", bridge, "--db", db, "notification", "sync"], {}),
    );
    assert.strictEqual(synced.status, "changed");
    assert.strictEqual(synced.data.inserted, 1);
    const inbox = payload(
      runPython(["--bridge", bridge, "--db", db, "notification", "inbox"], {}),
    );
    assert.strictEqual(inbox.data.events[0].eventId, "event-1");
    const attention = payload(
      runPython(
        ["--bridge", bridge, "--db", db, "synthesis", "attention-queue"],
        {},
      ),
    );
    assert.strictEqual(attention.status, "unchanged");
  });
});
