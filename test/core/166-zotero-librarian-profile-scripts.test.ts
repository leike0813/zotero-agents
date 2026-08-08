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

function runInstaller(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(
    "uv",
    [
      "run",
      "--project",
      path.join(os.homedir(), ".ar"),
      "--locked",
      "--",
      "python",
      path.join(PROFILE_SOURCE, "scripts/install_zotero_bridge_cli.py"),
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
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === "--profile" ? rawArgs.slice(2) : rawArgs;
const out = (value) => process.stdout.write(JSON.stringify(value));
const fail = (message) => { process.stderr.write(message); process.exit(2); };
if (process.env.FAKE_BRIDGE_LOG) {
  fs.appendFileSync(process.env.FAKE_BRIDGE_LOG, JSON.stringify(rawArgs) + "\\n");
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
} else if (args.join(" ") === "workflow list") {
  out({ result: { workflows: [{ id: "literature-analysis", label: "Literature Analysis" }] } });
} else if (args.join(" ").startsWith("workflow describe")) {
  out({ result: {
    workflowId: args[args.indexOf("--workflow") + 1],
    selection: {
      acceptsNoSelection: false,
      inputs: {
        member: { kind: "attachment" },
        grouping: { mode: "each" }
      },
      validateSelection: {
        select: { policy: "input-member", source: "selected" },
        filters: []
      }
    },
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
      runPython(["--bridge", bridge, "--db", db, "index", "refresh"], {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      }),
    );
    assert.strictEqual(
      refreshed.schema,
      "zotero-librarian.operation-receipt.v1",
    );
    assert.strictEqual(refreshed.operation, "index.refresh");
    assert.strictEqual(refreshed.status, "changed");
    assert.isTrue(fs.existsSync(db));

    const second = payload(
      runPython(["--bridge", bridge, "--db", db, "index", "refresh"], {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      }),
    );
    assert.strictEqual(second.status, "unchanged");
    const quiet = runPython(
      ["--bridge", bridge, "--db", db, "--quiet", "index", "refresh"],
      { ZOTERO_LIBRARIAN_STATE_DIR: temp },
    );
    assert.strictEqual(quiet.status, 0);
    assert.strictEqual(quiet.stdout.trim(), "[SILENT]");
  });

  it("rejects removed profile-owned workflow queue commands", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");

    for (const command of ["plan", "submit"]) {
      const rejected = runPython(
        ["--bridge", bridge, "--db", db, "workflow", command],
        { ZOTERO_LIBRARIAN_STATE_DIR: temp },
      );
      assert.notStrictEqual(rejected.status, 0);
      assert.include(rejected.stderr, "invalid choice");
    }

    const sourceText = fs.readFileSync(SERVICE, "utf8");
    assert.notInclude(sourceText, "zotero-librarian.workflow-plan");
    assert.notInclude(sourceText, "workflow_plans");
    assert.notInclude(sourceText, "workflow_plan_entries");
    assert.notInclude(sourceText, "--allow-submit");
  });

  it("preserves workflow catalog and watched-run resident operations", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");

    const refreshed = payload(
      runPython(
        ["--bridge", bridge, "--db", db, "workflow", "catalog-refresh"],
        { ZOTERO_LIBRARIAN_STATE_DIR: temp },
      ),
    );
    assert.strictEqual(refreshed.operation, "workflow.catalog-refresh");
    assert.strictEqual(refreshed.status, "changed");

    const shown = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "workflow",
          "show",
          "literature-analysis",
        ],
        { ZOTERO_LIBRARIAN_STATE_DIR: temp },
      ),
    );
    assert.strictEqual(shown.data.workflow.workflowId, "literature-analysis");

    const registered = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--db",
          db,
          "run",
          "register",
          "--run-id",
          "workflow-run-1",
          "--workflow-id",
          "literature-analysis",
        ],
        { ZOTERO_LIBRARIAN_STATE_DIR: temp },
      ),
    );
    assert.strictEqual(registered.operation, "run.register");

    const watched = payload(
      runPython(["--bridge", bridge, "--db", db, "run", "watch"], {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      }),
    );
    assert.strictEqual(watched.operation, "run.watch");
    assert.deepEqual(watched.data.runs, [
      { runId: "workflow-run-1", state: "succeeded" },
    ]);
  });

  it("projects notifications and keeps scheduled domains one-pass", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-service-"),
    );
    const bridge = writeFakeBridge(temp);
    const db = path.join(temp, "state.sqlite");
    const synced = payload(
      runPython(["--bridge", bridge, "--db", db, "notification", "sync"], {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      }),
    );
    assert.strictEqual(synced.status, "changed");
    assert.strictEqual(synced.data.inserted, 1);
    const inbox = payload(
      runPython(["--bridge", bridge, "--db", db, "notification", "inbox"], {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      }),
    );
    assert.strictEqual(inbox.data.events[0].eventId, "event-1");
    const attention = payload(
      runPython(
        ["--bridge", bridge, "--db", db, "synthesis", "attention-queue"],
        { ZOTERO_LIBRARIAN_STATE_DIR: temp },
      ),
    );
    assert.strictEqual(attention.status, "unchanged");
  });

  it("isolates explicit profile workspaces and preserves default state", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-profile-"),
    );
    const bridge = writeFakeBridge(temp);
    const profileA = path.join(temp, "profiles", "a.json");
    const profileB = path.join(temp, "profiles", "b.json");
    fs.mkdirSync(path.dirname(profileA), { recursive: true });
    fs.writeFileSync(profileA, '{"endpoint":"a","token":"one"}');
    fs.writeFileSync(profileB, '{"endpoint":"b","token":"two"}');
    const env = { ZOTERO_LIBRARIAN_STATE_DIR: temp };

    const refreshed = payload(
      runPython(
        ["--bridge", bridge, "--profile", profileA, "index", "refresh"],
        env,
      ),
    );
    assert.strictEqual(refreshed.status, "changed");
    const workspaceDir = fs.readdirSync(path.join(temp, "workspaces"))[0];
    fs.mkdirSync(
      path.join(temp, "workspaces", workspaceDir, ".zotero-bridge", "bin"),
      { recursive: true },
    );
    fs.copyFileSync(
      bridge,
      path.join(
        temp,
        "workspaces",
        workspaceDir,
        ".zotero-bridge",
        "bin",
        "zotero-bridge",
      ),
    );
    fs.copyFileSync(
      path.join(temp, "fake-bridge.js"),
      path.join(
        temp,
        "workspaces",
        workspaceDir,
        ".zotero-bridge",
        "bin",
        "fake-bridge.js",
      ),
    );
    const localPreferred = payload(
      runPython(["--profile", profileA, "workflow", "catalog-refresh"], env),
    );
    assert.strictEqual(localPreferred.operation, "workflow.catalog-refresh");
    const bSearch = payload(
      runPython(
        ["--bridge", bridge, "--profile", profileB, "index", "search", "One"],
        env,
      ),
    );
    assert.deepEqual(bSearch.data.items, []);
    const aSearch = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--profile",
          path.join(temp, "profiles", ".", "a.json"),
          "index",
          "search",
          "One",
        ],
        env,
      ),
    );
    assert.lengthOf(aSearch.data.items, 1);
    const profileLink = path.join(temp, "profiles", "a-link.json");
    fs.symlinkSync(profileA, profileLink);
    fs.writeFileSync(profileA, '{"endpoint":"a","token":"changed"}');
    const linkedSearch = payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--profile",
          profileLink,
          "index",
          "search",
          "One",
        ],
        env,
      ),
    );
    assert.lengthOf(linkedSearch.data.items, 1);
    assert.lengthOf(fs.readdirSync(path.join(temp, "workspaces")), 2);

    const outside = path.join(temp, "outside.sqlite");
    const rejected = runPython(
      [
        "--bridge",
        bridge,
        "--profile",
        profileA,
        "--db",
        outside,
        "index",
        "stats",
      ],
      env,
    );
    assert.notStrictEqual(rejected.status, 0);
    assert.include(rejected.stdout, "workspace_path_outside_profile");
    assert.isFalse(fs.existsSync(outside));

    const missing = runPython(
      [
        "--bridge",
        bridge,
        "--profile",
        path.join(temp, "missing.json"),
        "index",
        "stats",
      ],
      env,
    );
    assert.notStrictEqual(missing.status, 0);
    assert.include(missing.stdout, "profile_path_unavailable");
  });

  it("passes explicit profile identity to the bridge and keeps catalog, runs, and notifications local", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-profile-"),
    );
    const bridgeLog = path.join(temp, "bridge.log");
    const bridge = writeFakeBridge(temp);
    const profile = path.join(temp, "profile.json");
    fs.writeFileSync(profile, "{}");
    const env = {
      ZOTERO_LIBRARIAN_STATE_DIR: temp,
      FAKE_BRIDGE_LOG: bridgeLog,
    };
    payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--profile",
          profile,
          "workflow",
          "catalog-refresh",
        ],
        env,
      ),
    );
    payload(
      runPython(
        [
          "--bridge",
          bridge,
          "--profile",
          profile,
          "run",
          "register",
          "--run-id",
          "r1",
          "--workflow-id",
          "w1",
        ],
        env,
      ),
    );
    payload(
      runPython(
        ["--bridge", bridge, "--profile", profile, "notification", "sync"],
        env,
      ),
    );
    const logged = fs.readFileSync(bridgeLog, "utf8");
    assert.include(logged, `"--profile"`);
    assert.include(logged, path.resolve(profile));
    const workspaceRoot = path.join(temp, "workspaces");
    assert.strictEqual(fs.readdirSync(workspaceRoot).length, 1);
  });

  it("installs an explicit profile CLI locally without changing the well-known link", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-installer-"),
    );
    const profile = path.join(temp, "profile.json");
    fs.writeFileSync(profile, "{}");
    const sourceRoot = path.join(temp, "source");
    const binary = path.join(
      sourceRoot,
      "assets",
      "zotero-bridge",
      "bin",
      "linux-x64",
      "zotero-bridge",
    );
    fs.mkdirSync(path.dirname(binary), { recursive: true });
    fs.writeFileSync(binary, "binary");
    const result = runInstaller(
      [
        "--source-root",
        sourceRoot,
        "--profile",
        profile,
        "--no-link-well-known-profile",
      ],
      {
        ZOTERO_LIBRARIAN_STATE_DIR: temp,
      },
    );
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const workspaceDirs = fs.readdirSync(path.join(temp, "workspaces"));
    assert.lengthOf(workspaceDirs, 1);
    assert.isTrue(
      fs.existsSync(
        path.join(
          temp,
          "workspaces",
          workspaceDirs[0],
          ".zotero-bridge",
          "bin",
          "zotero-bridge",
        ),
      ),
    );
  });

  it("keeps the default install and well-known link behavior", function () {
    const temp = fs.mkdtempSync(
      path.join(os.tmpdir(), "zotero-librarian-installer-default-"),
    );
    const sourceRoot = path.join(temp, "source");
    const binary = path.join(
      sourceRoot,
      "assets",
      "zotero-bridge",
      "bin",
      "linux-x64",
      "zotero-bridge",
    );
    fs.mkdirSync(path.dirname(binary), { recursive: true });
    fs.writeFileSync(binary, "binary");
    const hostProfile = path.join(temp, "host-profile.json");
    fs.writeFileSync(hostProfile, "{}");
    const result = runInstaller(["--source-root", sourceRoot], {
      HOME: path.join(temp, "home"),
      ZOTERO_LIBRARIAN_STATE_DIR: path.join(temp, "state"),
      ZOTERO_BRIDGE_HOST_PROFILE: hostProfile,
    });
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    assert.isTrue(
      fs.existsSync(
        path.join(temp, "state", ".zotero-bridge", "bin", "zotero-bridge"),
      ),
    );
    const link = path.join(
      temp,
      "home",
      ".local",
      "share",
      "zotero-agents",
      "bridge-profile.json",
    );
    assert.isTrue(fs.lstatSync(link).isSymbolicLink());
    assert.strictEqual(fs.realpathSync(link), fs.realpathSync(hostProfile));
  });
});
