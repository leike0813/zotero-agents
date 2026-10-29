import { assert } from "chai";
import { getCiGateStages } from "../../scripts/ci-gate-plan";
import { runCiGate } from "../../scripts/run-ci-gate";

describe("routine test gates", function () {
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

  it("stops a gate at the first failing stage and preserves its exit code", async function () {
    const invoked: string[] = [];
    const result = await runCiGate("full", {
      runScript: async (script) => {
        invoked.push(script);
        return script === "test:node" ? 17 : 0;
      },
    });
    assert.equal(result, 17);
    assert.equal(invoked.at(-1), "test:node");
    assert.notInclude(invoked, "test:zotero:full");
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
