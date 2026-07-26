import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  verifyPluginNativeAssets,
  type HostBridgeCliReleaseManifest,
} from "../../scripts/check-plugin-native-assets";

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function createStoredZip(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const bytes = Buffer.from(entry.bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, bytes);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, name);
    localOffset += local.length + name.length + bytes.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

const HOST_BINARY_PATH = "bin/win32-x64/zotero-bridge.exe";
const ACP_BINARY_PATH = "bin/win32-x64/zotero-acp-bridge.exe";
const hostBytes = Buffer.from("host-bridge");
const acpBytes = Buffer.from("acp-bridge");
const hostBridgeRelease: HostBridgeCliReleaseManifest = {
  schema: "zotero-bridge-cli-release.v1",
  binaries: [
    {
      platform: "win32-x64",
      binary: "zotero-bridge.exe",
      sha256: sha256(hostBytes),
      bytes: hostBytes.length,
    },
  ],
};

function validNativeEntries() {
  return [
    { name: HOST_BINARY_PATH, bytes: hostBytes },
    {
      name: `${HOST_BINARY_PATH}.sha256`,
      bytes: Buffer.from(`${sha256(hostBytes)}  zotero-bridge.exe\n`),
    },
    { name: ACP_BINARY_PATH, bytes: acpBytes },
    {
      name: `${ACP_BINARY_PATH}.sha256`,
      bytes: Buffer.from(`${sha256(acpBytes)}  zotero-acp-bridge.exe\n`),
    },
  ];
}

describe("acp websocket bridge packaging", function () {
  it("keeps ACP WebSocket bridge packaging independent from Host Bridge CLI", function () {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    const buildScript = fs.readFileSync(
      path.join(process.cwd(), "scripts/build-acp-ws-bridge.mjs"),
      "utf8",
    );
    const packageScript = fs.readFileSync(
      path.join(process.cwd(), "scripts/package-acp-ws-bridge.mjs"),
      "utf8",
    );
    const cargoToml = fs.readFileSync(
      path.join(process.cwd(), "native/acp-ws-bridge/Cargo.toml"),
      "utf8",
    );

    assert.equal(
      packageJson.scripts["prebuild:acp-ws-bridge"],
      "node scripts/build-acp-ws-bridge.mjs",
    );
    assert.equal(
      packageJson.scripts["package:acp-ws-bridge"],
      "node scripts/package-acp-ws-bridge.mjs",
    );
    assert.include(cargoToml, 'name = "zotero-acp-bridge"');
    assert.include(packageScript, "zotero-acp-bridge.exe");
    assert.include(packageScript, "addon");
    assert.include(packageScript, "win32-x64");
    assert.include(buildScript, "native/acp-ws-bridge/Cargo.toml");
    assert.notInclude(buildScript, "cli/zotero-bridge");
    assert.notInclude(packageScript, "cli/zotero-bridge");
  });

  it("verifies Host Bridge and ACP native assets in the final XPI", async function () {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "zs-native-xpi-"));
    const xpiPath = path.join(root, "valid.xpi");
    await fsp.writeFile(xpiPath, createStoredZip(validNativeEntries()));

    const result = verifyPluginNativeAssets({
      xpiPath,
      hostBridgeRelease,
    });

    assert.isTrue(result.ok);
    assert.deepEqual(result.issues, []);
  });

  it("reports structured final-XPI native asset failures", async function () {
    const cases = [
      {
        name: "missing ACP binary",
        entries: validNativeEntries().filter(
          (entry) => entry.name !== ACP_BINARY_PATH,
        ),
        code: "native_binary_missing",
      },
      {
        name: "missing Host Bridge sidecar",
        entries: validNativeEntries().filter(
          (entry) => entry.name !== `${HOST_BINARY_PATH}.sha256`,
        ),
        code: "native_sidecar_missing",
      },
      {
        name: "ACP checksum mismatch",
        entries: validNativeEntries().map((entry) =>
          entry.name === `${ACP_BINARY_PATH}.sha256`
            ? { ...entry, bytes: Buffer.from(`${"0".repeat(64)}\n`) }
            : entry,
        ),
        code: "native_checksum_mismatch",
      },
      {
        name: "Host Bridge release digest mismatch",
        entries: validNativeEntries().map((entry) =>
          entry.name === HOST_BINARY_PATH
            ? { ...entry, bytes: Buffer.from("different-host-bridge") }
            : entry,
        ),
        code: "host_bridge_release_mismatch",
      },
    ];

    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "zs-native-xpi-"));
    for (const testCase of cases) {
      const xpiPath = path.join(root, `${testCase.code}.xpi`);
      await fsp.writeFile(xpiPath, createStoredZip(testCase.entries));
      const result = verifyPluginNativeAssets({
        xpiPath,
        hostBridgeRelease,
      });
      assert.isFalse(result.ok, testCase.name);
      assert.include(
        result.issues.map((issue) => issue.code),
        testCase.code,
        testCase.name,
      );
    }
  });
});
