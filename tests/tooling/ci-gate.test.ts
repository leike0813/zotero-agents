import { assert } from "chai";
import { getCiGateStages } from "../../scripts/ci-gate-plan";
import { runCiGate } from "../../scripts/run-ci-gate";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

describe("routine test gates", function () {
  it("runs the actual CLI quietly through every stage after a child fails", async function () {
    this.timeout(30000);
    const root = await mkdtemp(path.join(os.tmpdir(), "gate-cli-"));
    const scripts = Object.fromEntries(
      getCiGateStages("full").map((stage) => [
        stage.script,
        `node child.cjs ${stage.id}`,
      ]),
    );
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "gate-fixture", version: "1.0.0", scripts }),
    );
    await writeFile(
      path.join(root, "child.cjs"),
      'require("node:fs").appendFileSync("invoked.txt", process.argv[2]+"\\n"); if(process.argv[2]==="test-node"){console.error("PRIVATE_CHILD_STACK");process.exitCode=9;}',
    );
    const result = await new Promise<{
      code: number;
      stdout: string;
      stderr: string;
    }>((resolve) => {
      execFile(
        process.execPath,
        [
          path.resolve("node_modules/tsx/dist/cli.mjs"),
          path.resolve("scripts/run-ci-gate.ts"),
          "full",
        ],
        { cwd: root, env: { ...process.env, NO_COLOR: "1" }, timeout: 25000 },
        (error, stdout, stderr) => {
          resolve({
            code: typeof error?.code === "number" ? error.code : error ? -1 : 0,
            stdout,
            stderr,
          });
        },
      );
    });
    assert.equal(result.code, 9);
    const invoked = (await readFile(path.join(root, "invoked.txt"), "utf8"))
      .trim()
      .split("\n");
    assert.lengthOf(invoked, 10);
    assert.equal(invoked.at(-1), "test-zotero-full");
    assert.notInclude(result.stdout + result.stderr, "PRIVATE_CHILD_STACK");
    const { directory } = JSON.parse(
      await readFile(
        path.join(root, "artifacts/test-diagnostics/npm-test/latest.json"),
        "utf8",
      ),
    );
    assert.include(
      await readFile(path.join(directory, "failures.md"), "utf8"),
      "PRIVATE_CHILD_STACK",
    );
  });

  it("runs every routine layer without recursively invoking npm test", function () {
    const scripts = getCiGateStages("full").map((stage) => stage.script);
    assert.includeMembers(scripts, [
      "test:node",
      "test:synthesis-native:stage1",
      "test:synthesis-rust-sidecar",
      "test:host-bridge:rust",
      "test:acp-ws-bridge:rust",
      "test:zotero:full",
    ]);
    assert.notInclude(scripts, "test");
    assert.equal(new Set(scripts).size, scripts.length);
    assert.include(
      getCiGateStages("pr").map((stage) => stage.script),
      "test:zotero:e2e:workflow",
    );
  });

  it("finishes the full gate after failures and preserves the first exit code", async function () {
    const invoked: string[] = [];
    const result = await runCiGate("full", {
      reportRoot: false,
      runScript: async (script) => {
        invoked.push(script);
        if (script === "test:host-bridge:rust") throw new Error("spawn failed");
        return script === "test:node" ? 17 : 0;
      },
    });
    assert.equal(result, 17);
    assert.equal(invoked.at(-1), "test:zotero:full");
    assert.include(invoked, "test:acp-ws-bridge:rust");
  });

  for (const gate of ["pr", "release"] as const) {
    it(`keeps ${gate} fail-fast`, async function () {
      const invoked: string[] = [];
      const result = await runCiGate(gate, {
        runScript: async (script) => {
          invoked.push(script);
          return script === "test:node" ? 17 : 0;
        },
      });
      assert.equal(result, 17);
      assert.equal(invoked.at(-1), "test:node");
    });
  }

  it("publishes all stage verdicts and keeps diagnostics out of console output", async function () {
    const root = await mkdtemp(path.join(os.tmpdir(), "gate-report-"));
    const lines: string[] = [];
    const original = console.log;
    console.log = (...args) => {
      lines.push(args.join(" "));
    };
    try {
      const code = await runCiGate("full", {
        reportRoot: root,
        runScript: async (script, env) => {
          await writeFile(
            path.join(
              env.ZOTERO_TEST_REPORT_DIR!,
              "logs",
              `${env.ZOTERO_TEST_REPORT_SCOPE}.log`,
            ),
            script === "test:node" ? "PRIVATE_FAILURE_STACK" : "passed",
          );
          return script === "test:node" ? 5 : 0;
        },
      });
      assert.equal(code, 5);
      const { directory } = JSON.parse(
        await readFile(path.join(root, "latest.json"), "utf8"),
      );
      const summary = JSON.parse(
        await readFile(path.join(directory, "summary.json"), "utf8"),
      );
      assert.lengthOf(summary.stages, 10);
      assert.equal(summary.stages.at(-1).status, "passed");
      assert.include(
        await readFile(path.join(directory, "failures.md"), "utf8"),
        "PRIVATE_FAILURE_STACK",
      );
      assert.notInclude(lines.join("\n"), "PRIVATE_FAILURE_STACK");
      assert.include(lines.join("\n"), "FAIL");
    } finally {
      console.log = original;
    }
  });

  it("selects the complete WF family through the existing E2E runner", async function () {
    const invoked: string[] = [];
    assert.equal(
      await runCiGate("workflow", {
        runScript: async (script, env) => {
          invoked.push(script);
          assert.equal(env.ZOTERO_SYSTEM_E2E_FAMILIES, "WF");
          assert.equal(env.ZOTERO_WORKFLOW_E2E_MODE, "offline");
          return 0;
        },
      }),
      0,
    );
    assert.deepEqual(invoked, ["test:zotero:e2e"]);
  });

  it("uses offline complete membership despite inherited capture and filtering inputs", async function () {
    const environments: NodeJS.ProcessEnv[] = [];
    await runCiGate("pr", {
      env: {
        ZOTERO_WORKFLOW_E2E_MODE: "live",
        ZOTERO_WORKFLOW_E2E_SOURCE: "/private/source",
        ZOTERO_WORKFLOW_E2E_CONTINUE_FROM: "/private/capture",
        ZOTERO_TEST_GREP: "one case",
        ZOTERO_SYSTEM_E2E_FAMILIES: "SL",
        ZOTERO_SYSTEM_E2E_COMPLETED_CASES: '["WF-01"]',
        ZOTERO_SYSTEM_E2E_RESUME_ROOT: "/private/resume",
        ZOTERO_E2E_FIXTURE: "gold",
        ZOTERO_E2E_GOLD_DATA_DIR: "/private/library",
        ZOTERO_PLUGIN_ZOTERO_BIN_PATH: "/test/zotero",
      },
      runScript: async (_script, env) => {
        environments.push(env);
        return 0;
      },
    });
    assert.isNotEmpty(environments);
    for (const env of environments) {
      assert.equal(env.ZOTERO_WORKFLOW_E2E_MODE, "offline");
      assert.equal(env.ZOTERO_PLUGIN_ZOTERO_BIN_PATH, "/test/zotero");
      for (const key of [
        "ZOTERO_WORKFLOW_E2E_SOURCE",
        "ZOTERO_WORKFLOW_E2E_CONTINUE_FROM",
        "ZOTERO_TEST_GREP",
        "ZOTERO_SYSTEM_E2E_FAMILIES",
        "ZOTERO_SYSTEM_E2E_COMPLETED_CASES",
        "ZOTERO_SYSTEM_E2E_RESUME_ROOT",
        "ZOTERO_E2E_GOLD_DATA_DIR",
      ])
        assert.isUndefined(env[key], key);
      assert.notEqual(env.ZOTERO_E2E_FIXTURE, "gold");
    }
  });
});
