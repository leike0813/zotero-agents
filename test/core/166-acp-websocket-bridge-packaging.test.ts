import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  verifyPluginHostBridgeAssets,
  type HostBridgeCliReleaseManifest,
} from "../../scripts/check-plugin-host-bridge-assets";
import {
  HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA,
  hostBridgePluginSkillBundleDigestPayload,
  type HostBridgePluginSkillBundleManifest,
} from "../../src/shared/hostBridgePluginSkillBundleContract";

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
const SKILL_MANIFEST_PATH = "content/host-bridge-skills/manifest.json";
const hostBytes = Buffer.from("host-bridge");
const acpBytes = Buffer.from("acp-bridge");
const hostBridgeRelease: HostBridgeCliReleaseManifest = {
  schema: "zotero-bridge-cli-release.v1",
  version: "1.2.3",
  buildFingerprint: "b".repeat(64),
  binaries: [
    {
      platform: "win32-x64",
      binary: "zotero-bridge.exe",
      sha256: sha256(hostBytes),
      bytes: hostBytes.length,
    },
  ],
};

function validSkillBundleEntries() {
  const files = [
    {
      path: "zotero-bridge-cli/SKILL.md",
      bytes: Buffer.from("# Skill\n"),
    },
    {
      path: "zotero-bridge-cli/assets/runner.json",
      bytes: Buffer.from('{"version":"1.2.3"}\n'),
    },
  ].map((file) => ({
    path: file.path,
    bytes: file.bytes.length,
    sha256: sha256(file.bytes),
    content: file.bytes,
  }));
  const withoutDigest: Omit<
    HostBridgePluginSkillBundleManifest,
    "aggregateSha256"
  > = {
    schema: HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA,
    cli: {
      version: hostBridgeRelease.version,
      buildFingerprint: hostBridgeRelease.buildFingerprint,
      commandCatalogChecksum: "c".repeat(64),
    },
    surfaces: [
      { id: "zotero-bridge-cli", kind: "minimum-core", version: "1.2.3" },
    ],
    skills: [
      {
        id: "zotero-bridge-cli",
        mount: "skills/zotero-bridge-cli",
        runnerVersion: "1.2.3",
      },
    ],
    files: files.map(({ content: _content, ...file }) => file),
  };
  const manifest = {
    ...withoutDigest,
    aggregateSha256: sha256(
      Buffer.from(hostBridgePluginSkillBundleDigestPayload(withoutDigest)),
    ),
  };
  return [
    ...files.map((file) => ({
      name: `content/host-bridge-skills/${file.path}`,
      bytes: file.content,
    })),
    {
      name: SKILL_MANIFEST_PATH,
      bytes: Buffer.from(`${JSON.stringify(manifest)}\n`),
    },
    {
      name: "bin/zotero-bridge-release.json",
      bytes: Buffer.from(`${JSON.stringify(hostBridgeRelease)}\n`),
    },
  ];
}

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
    ...validSkillBundleEntries(),
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

    const result = verifyPluginHostBridgeAssets({
      xpiPath,
      hostBridgeRelease,
      expectedSkillIds: ["zotero-bridge-cli"],
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
      {
        name: "missing Skill bundle manifest",
        entries: validNativeEntries().filter(
          (entry) => entry.name !== SKILL_MANIFEST_PATH,
        ),
        code: "skill_bundle_manifest_missing",
      },
      {
        name: "unexpected Skill bundle file",
        entries: [
          ...validNativeEntries(),
          {
            name: "content/host-bridge-skills/unexpected.txt",
            bytes: Buffer.from("unexpected"),
          },
        ],
        code: "skill_bundle_inventory_extra",
      },
      {
        name: "Skill bundle file digest mismatch",
        entries: validNativeEntries().map((entry) =>
          entry.name === "content/host-bridge-skills/zotero-bridge-cli/SKILL.md"
            ? { ...entry, bytes: Buffer.from("changed") }
            : entry,
        ),
        code: "skill_bundle_digest_mismatch",
      },
      {
        name: "Skill bundle CLI identity mismatch",
        entries: validNativeEntries().map((entry) =>
          entry.name === "bin/zotero-bridge-release.json"
            ? {
                ...entry,
                bytes: Buffer.from(
                  `${JSON.stringify({ ...hostBridgeRelease, version: "9.9.9" })}\n`,
                ),
              }
            : entry,
        ),
        code: "skill_bundle_identity_mismatch",
      },
    ];

    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "zs-native-xpi-"));
    for (const testCase of cases) {
      const xpiPath = path.join(root, `${testCase.code}.xpi`);
      await fsp.writeFile(xpiPath, createStoredZip(testCase.entries));
      const result = verifyPluginHostBridgeAssets({
        xpiPath,
        hostBridgeRelease,
        expectedSkillIds: ["zotero-bridge-cli"],
      });
      assert.isFalse(result.ok, testCase.name);
      assert.include(
        result.issues.map((issue) => issue.code),
        testCase.code,
        testCase.name,
      );
    }
  });

  it("rejects duplicate and path-traversing XPI entries", async function () {
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), "zs-native-xpi-"));
    for (const [name, entries, pattern] of [
      [
        "duplicate",
        [...validNativeEntries(), validNativeEntries()[0]],
        /Duplicate ZIP entry/,
      ],
      [
        "traversal",
        [
          ...validNativeEntries(),
          {
            name: "content/host-bridge-skills/../escaped",
            bytes: Buffer.from("x"),
          },
        ],
        /Unsafe ZIP entry/,
      ],
    ] as const) {
      const xpiPath = path.join(root, `${name}.xpi`);
      await fsp.writeFile(xpiPath, createStoredZip([...entries]));
      assert.throws(
        () =>
          verifyPluginHostBridgeAssets({
            xpiPath,
            hostBridgeRelease,
            expectedSkillIds: ["zotero-bridge-cli"],
          }),
        pattern,
      );
    }
  });
});
