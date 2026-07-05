import { assert } from "chai";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const PROFILE_ROOT = path.join(
  process.cwd(),
  "profiles/hermes/zotero-librarian",
);

function ensureUv() {
  const check = spawnSync("uv", ["--version"], { encoding: "utf8" });
  if (check.status !== 0) {
    return null;
  }
  return "uv";
}

function runPython(script: string, args: string[], env: NodeJS.ProcessEnv) {
  const uv = ensureUv();
  assert.isNotNull(uv, "uv is required for profile script tests");
  return spawnSync(
    uv!,
    [
      "run",
      "--project",
      path.join(os.homedir(), ".ar"),
      "--locked",
      "--",
      "python",
      script,
      ...args,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

function parseStdout(proc: ReturnType<typeof spawnSync>) {
  assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
  return JSON.parse(String(proc.stdout));
}

function writeFakeBridge(root: string) {
  const bridgeJs = path.join(root, "fake-bridge.js");
  fs.writeFileSync(
    bridgeJs,
    `
const args = process.argv.slice(2);
const out = (value) => process.stdout.write(JSON.stringify(value));
const fail = (message) => { process.stderr.write(message); process.exit(2); };
if (args.includes("wait")) fail("wait must not be used");
if (args.join(" ") === "context selection get") {
  out({ result: { selectedItems: [
    { libraryId: 1, key: "ATT1", id: 101, itemType: "attachment", parent: { id: 11, key: "PARENT1" } },
    { libraryId: 1, key: "NOTE1", id: 102, itemType: "note", parent: { id: 12, key: "PARENT2" } }
  ] } });
} else if (args[0] === "library" && args[1] === "readiness") {
  out({ result: { items: [
    { libraryId: 1, key: "PARENT1", id: 11, itemType: "journalArticle" },
    { libraryId: 1, key: "PARENT2", id: 12, itemType: "journalArticle" }
  ] } });
} else if (args.join(" ").startsWith("workflow validate")) {
  out({ result: { ready: true, workflowId: args[args.indexOf("--workflow") + 1] } });
} else if (args.join(" ").startsWith("workflow submit")) {
  out({ result: { workflowRunId: "workflow-run-1", state: "running" } });
} else if (args.join(" ").startsWith("workflow agent-run")) {
  out({ result: { agentRunId: "agent-run-1", requests: [{ agentRequestId: "request-1" }], download: { outputPath: "bundle.zip" } } });
} else if (args.join(" ").startsWith("run notification list")) {
  out({ result: { events: [{ eventId: "event-1", workflowRunId: "workflow-run-1", skillRunId: "skill-run-1", type: "completed", acknowledged: false }] } });
} else if (args.join(" ").startsWith("run notification ack")) {
  out({ result: { acknowledged: true } });
} else if (args.join(" ").startsWith("library item get")) {
  const key = args[args.indexOf("--key") + 1];
  out({ result: { libraryId: 1, key, id: 99, itemType: "journalArticle" } });
} else {
  fail("unexpected command: " + args.join(" "));
}
`,
    "utf8",
  );
  if (process.platform === "win32") {
    const cmd = path.join(root, "zotero-bridge.cmd");
    fs.writeFileSync(
      cmd,
      `@echo off\r\nnode "%~dp0fake-bridge.js" %*\r\n`,
      "utf8",
    );
    return cmd;
  }
  const sh = path.join(root, "zotero-bridge");
  fs.writeFileSync(
    sh,
    `#!/usr/bin/env sh\nnode "$(dirname "$0")/fake-bridge.js" "$@"\n`,
    "utf8",
  );
  fs.chmodSync(sh, 0o755);
  return sh;
}

describe("zotero-librarian profile helper scripts", function () {
  const workflowScript = path.join(
    PROFILE_ROOT,
    "scripts/zotero_librarian_workflow_service.py",
  );
  const notificationScript = path.join(
    PROFILE_ROOT,
    "scripts/zotero_librarian_notification_service.py",
  );

  it("normalizes context selection to parent item refs", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-scripts-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "index.sqlite");
    const proc = runPython(
      workflowScript,
      ["--bridge", bridge, "--db", db, "parent-selection", "--from-context"],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const payload = parseStdout(proc);
    assert.deepEqual(payload.parentItemRefs, [
      { key: "PARENT1", libraryId: 1 },
      { key: "PARENT2", libraryId: 1 },
    ]);
    assert.deepEqual(payload.unresolved, []);
  });

  it("plans host workflow submissions and gates explicit concurrency", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-scripts-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "index.sqlite");
    const planProc = runPython(
      workflowScript,
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "plan",
        "--workflow",
        "literature-analysis",
        "--mode",
        "host",
        "--from-context",
      ],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const plan = parseStdout(planProc);
    assert.strictEqual(plan.defaultConcurrency, 1);
    assert.lengthOf(plan.submissions, 2);
    assert.isTrue(plan.requiresConcurrencyConfirmation);

    const planPath = path.join(temp, "plan.json");
    fs.writeFileSync(planPath, JSON.stringify(plan), "utf8");
    const submitProc = runPython(
      workflowScript,
      ["--bridge", bridge, "--db", db, "submit", "--plan", planPath],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const submitted = parseStdout(submitProc);
    assert.strictEqual(submitted.launchedCount, 1);
    assert.strictEqual(submitted.remainingSubmissions, 1);
    assert.strictEqual(submitted.launched[0].workflowRunId, "workflow-run-1");

    const blocked = runPython(
      workflowScript,
      [
        "--bridge",
        bridge,
        "--db",
        db,
        "submit",
        "--plan",
        planPath,
        "--concurrency",
        "2",
      ],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    assert.notStrictEqual(blocked.status, 0);
    assert.include(blocked.stdout, "concurrency_confirmation_required");
  });

  it("syncs and acknowledges notification inbox events without wait", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-scripts-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "index.sqlite");
    const syncProc = runPython(
      notificationScript,
      ["--bridge", bridge, "--db", db, "sync", "--report-empty"],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const synced = parseStdout(syncProc);
    assert.strictEqual(synced.inserted, 1);

    const inboxProc = runPython(
      notificationScript,
      ["--bridge", bridge, "--db", db, "inbox", "--report-empty"],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const inbox = parseStdout(inboxProc);
    assert.strictEqual(inbox.events[0].eventId, "event-1");

    const ackProc = runPython(
      notificationScript,
      ["--bridge", bridge, "--db", db, "ack", "--event", "event-1"],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    const acked = parseStdout(ackProc);
    assert.deepEqual(acked.acknowledged, ["event-1"]);
  });
});
