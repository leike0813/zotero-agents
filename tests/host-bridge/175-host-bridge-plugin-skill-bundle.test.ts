import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readPackagedBinaryAsset } from "../../src/modules/packagedAssetResolver";
import {
  clearHostBridgePluginSkillBundleMaterializationForTests,
  materializeHostBridgePluginSkillBundle,
} from "../../src/modules/hostBridge/cli/hostBridgePluginSkillBundle";
import { writeRuntimeBytes } from "../../src/modules/runtimePersistence";
import {
  hostBridgePluginSkillBundleDigestPayload,
  type HostBridgePluginSkillBundleManifest,
} from "../../src/shared/hostBridgePluginSkillBundleContract";

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

  for (const field of ["surface", "runner"] as const) {
    it(`rejects a mismatched ${field} version even with a valid aggregate`, async function () {
      const result = await materializeHostBridgePluginSkillBundle({
        runtimeRoot,
        dependencies: {
          readAsset: async (relativePath) => {
            const asset = await readPackagedBinaryAsset(relativePath);
            if (!asset.ok || !relativePath.endsWith("/manifest.json"))
              return asset;
            const manifest = JSON.parse(
              new TextDecoder().decode(asset.bytes),
            ) as HostBridgePluginSkillBundleManifest;
            if (field === "surface") manifest.surfaces[0].version = "0.0.0";
            else manifest.skills[0].runnerVersion = "0.0.0";
            manifest.aggregateSha256 = createHash("sha256")
              .update(hostBridgePluginSkillBundleDigestPayload(manifest))
              .digest("hex");
            return {
              ...asset,
              bytes: new TextEncoder().encode(JSON.stringify(manifest)),
            };
          },
        },
      });

      assert.isFalse(result.ok);
      if (result.ok) return;
      assert.strictEqual(
        result.code,
        "host_bridge_plugin_skill_bundle_invalid",
      );
      assert.isFalse(
        await fs.stat(result.root).then(
          () => true,
          (error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return false;
            throw error;
          },
        ),
      );
    });
  }

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
});
