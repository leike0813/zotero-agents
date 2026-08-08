import { assert } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readPackagedBinaryAsset } from "../../src/modules/packagedAssetResolver";
import {
  clearHostBridgePluginSkillBundleMaterializationForTests,
  materializeHostBridgePluginSkillBundle,
} from "../../src/modules/hostBridgePluginSkillBundle";
import {
  getAcpSkillRunRecord,
  resetAcpSkillRunsForTests,
  upsertAcpSkillRun,
} from "../../src/modules/acpSkillRunStore";
import { recoverAcpSkillRunConversation } from "../../src/modules/acpSkillRunRecovery";
import { HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED } from "../../src/shared/hostBridgePluginSkillBundleContract";
import { writeRuntimeBytes } from "../../src/modules/runtimePersistence";

describe("Host Bridge plugin Skill bundle", function () {
  this.timeout(20_000);

  let runtimeRoot = "";

  beforeEach(async function () {
    runtimeRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-host-bridge-plugin-skills-"),
    );
    clearHostBridgePluginSkillBundleMaterializationForTests();
  });

  afterEach(async function () {
    clearHostBridgePluginSkillBundleMaterializationForTests();
    resetAcpSkillRunsForTests();
    await fs.rm(runtimeRoot, { recursive: true, force: true });
  });

  it("materializes the packaged seven-Skill closure and reuses its aggregate", async function () {
    const first = await materializeHostBridgePluginSkillBundle({ runtimeRoot });
    assert.isTrue(first.ok);
    if (!first.ok) return;
    assert.isFalse(first.reused);
    assert.lengthOf(first.reservedSkillIds, 7);
    assert.match(first.identity.aggregateSha256, /^[a-f0-9]{64}$/);
    for (const skillId of first.reservedSkillIds) {
      assert.strictEqual(
        await fs.readFile(path.join(first.root, skillId, "SKILL.md"), "utf8"),
        await fs.readFile(
          path.join(
            process.cwd(),
            "addon/content/host-bridge-skills",
            skillId,
            "SKILL.md",
          ),
          "utf8",
        ),
      );
    }

    const second = await materializeHostBridgePluginSkillBundle({
      runtimeRoot,
    });
    assert.isTrue(second.ok);
    if (second.ok) assert.isTrue(second.reused);
  });

  it("keeps the previous bytes out of the current registry result when staging fails", async function () {
    const first = await materializeHostBridgePluginSkillBundle({ runtimeRoot });
    assert.isTrue(first.ok);
    if (!first.ok) return;
    const marker = path.join(first.root, "diagnostic-marker.txt");
    await fs.writeFile(marker, "previous bytes", "utf8");
    await fs.rm(`${first.root}.receipt.json`, { force: true });
    let writes = 0;

    const failed = await materializeHostBridgePluginSkillBundle({
      runtimeRoot,
      dependencies: {
        readAsset: readPackagedBinaryAsset,
        writeBytes: async (...args) => {
          writes += 1;
          if (writes === 2) throw new Error("injected staging failure");
          return writeRuntimeBytes(...args);
        },
      },
    });

    assert.isFalse(failed.ok);
    assert.strictEqual(await fs.readFile(marker, "utf8"), "previous bytes");
  });

  it("rejects recovery of an ACP Skills run bound to another bundle identity", async function () {
    const materialized = await materializeHostBridgePluginSkillBundle({
      runtimeRoot,
    });
    assert.isTrue(materialized.ok);
    if (!materialized.ok) return;
    const changed = {
      ...materialized.identity,
      aggregateSha256: "0".repeat(64),
    };
    upsertAcpSkillRun({
      requestId: "identity-changed-run",
      backendId: "backend-acp",
      backendType: "acp",
      sessionId: "remote-session",
      hostBridgePluginSkillBundleIdentity: changed,
    });

    let failure: unknown;
    try {
      await recoverAcpSkillRunConversation({
        requestId: "identity-changed-run",
      });
    } catch (error) {
      failure = error;
    }

    assert.strictEqual(
      (failure as { code?: string })?.code,
      HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED,
    );
    assert.strictEqual(
      getAcpSkillRunRecord("identity-changed-run")?.lastRecoveryError,
      HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_IDENTITY_CHANGED,
    );
  });
});
