import { assert } from "chai";
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import {
  verifyPluginHostBridgeAssets,
  type HostBridgeCliReleaseManifest,
} from "../../scripts/host-bridge/check-plugin-host-bridge-assets";
import {
  HOST_BRIDGE_PLUGIN_SKILL_BUNDLE_SCHEMA,
  hostBridgePluginSkillBundleDigestPayload,
  type HostBridgePluginSkillBundleManifest,
} from "../../src/shared/hostBridgePluginSkillBundleContract";

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createAcpFreshnessFixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "zs-acp-freshness-"));
  const load = (name: string) =>
    import(pathToFileURL(path.resolve("scripts/acp-ws-bridge", name)).href);
  const artifacts = await load("acp-ws-bridge-build.mjs");
  const checker = await load("check-acp-ws-bridge-freshness.mjs");
  for (const [file, contents] of Object.entries({
    "rust/acp-ws-bridge/Cargo.toml": '[package]\nname = "zotero-acp-bridge"\n',
    "rust/acp-ws-bridge/Cargo.lock": "version = 4\n",
    "rust/acp-ws-bridge/src/main.rs": "fn main() {}\n",
    "scripts/acp-ws-bridge/build-acp-ws-bridge.mjs": "// build\n",
    "scripts/acp-ws-bridge/package-acp-ws-bridge.mjs": "// package\n",
    "scripts/acp-ws-bridge/acp-ws-bridge-build.mjs": "// evidence\n",
    "scripts/acp-ws-bridge/check-acp-ws-bridge-freshness.mjs": "// check\n",
  })) {
    await fsp.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fsp.writeFile(path.join(root, file), contents);
  }
  const binary = Buffer.from("fixture ACP binary");
  const directory = path.join(root, "addon/bin/win32-x64");
  await fsp.mkdir(directory, { recursive: true });
  const fingerprint = await artifacts.computeAcpBridgeBuildFingerprint(root);
  const record = {
    schema: "acp-ws-bridge-build.v1",
    target: "x86_64-pc-windows-msvc",
    platform: "win32-x64",
    buildFingerprint: fingerprint.fingerprint,
    sourceHead: "a".repeat(40),
    binary: {
      name: "zotero-acp-bridge.exe",
      sha256: sha256(binary),
      bytes: binary.length,
    },
  };
  await fsp.writeFile(path.join(directory, record.binary.name), binary);
  await fsp.writeFile(
    path.join(directory, `${record.binary.name}.sha256`),
    `${record.binary.sha256}  ${record.binary.name}\n`,
  );
  const recordPath = path.join(directory, "zotero-acp-bridge.build.json");
  await fsp.writeFile(recordPath, JSON.stringify(record));
  return { root, directory, recordPath, record, artifacts, checker, load };
}

describe("ACP bridge source freshness", function () {
  const roots: string[] = [];
  afterEach(async function () {
    await Promise.all(
      roots
        .splice(0)
        .map((root) => fsp.rm(root, { recursive: true, force: true })),
    );
  });

  it("accepts a source-bound executable and matching checksum", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    const result = await fixture.checker.checkAcpWsBridgeFreshness({
      root: fixture.root,
    });
    assert.isTrue(result.ok);
    assert.equal(result.buildFingerprint, fixture.record.buildFingerprint);
    assert.equal(result.sourceHead, fixture.record.sourceHead);
  });

  it("builds, packages and verifies unchanged Windows inputs", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    const builder = await fixture.load("build-acp-ws-bridge.mjs");
    const result = await builder.buildAcpWsBridge({
      root: fixture.root,
      platform: "win32",
      runCommand: async (command: string, args: string[]) => {
        if (command === "git") return { status: 0, stdout: "b".repeat(40) };
        assert.equal(command, "cargo");
        assert.include(args, "--locked");
        assert.equal(
          args[args.indexOf("--target-dir") + 1],
          path.join(fixture.root, "rust/acp-ws-bridge/target"),
        );
        const output = path.join(
          fixture.root,
          fixture.artifacts.ACP_BRIDGE_LOCAL_OUTPUT,
        );
        await fsp.mkdir(output, { recursive: true });
        await fsp.writeFile(
          path.join(output, "zotero-acp-bridge.exe"),
          "newly compiled bridge",
        );
        return { status: 0 };
      },
    });
    assert.isTrue(result.ok);
    const checked = await fixture.checker.checkAcpWsBridgeFreshness({
      root: fixture.root,
    });
    assert.isTrue(checked.ok);
    assert.equal(checked.sourceHead, "b".repeat(40));
    assert.equal(
      checked.binary.sha256,
      sha256(Buffer.from("newly compiled bridge")),
    );
  });

  for (const relative of [
    "rust/acp-ws-bridge/src/main.rs",
    "rust/acp-ws-bridge/src/new.rs",
    "rust/acp-ws-bridge/Cargo.toml",
    "rust/acp-ws-bridge/Cargo.lock",
    "scripts/acp-ws-bridge/build-acp-ws-bridge.mjs",
    "scripts/acp-ws-bridge/package-acp-ws-bridge.mjs",
    "scripts/acp-ws-bridge/acp-ws-bridge-build.mjs",
    "scripts/acp-ws-bridge/check-acp-ws-bridge-freshness.mjs",
    ".cargo/config.toml",
    "rust-toolchain.toml",
    "rust/acp-ws-bridge/build.rs",
  ]) {
    it(`rejects changed or added input ${relative}`, async function () {
      const fixture = await createAcpFreshnessFixture();
      roots.push(fixture.root);
      const file = path.join(fixture.root, relative);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.appendFile(file, "changed build input\n");
      const result = await fixture.checker.checkAcpWsBridgeFreshness({
        root: fixture.root,
      });
      assert.isFalse(result.ok);
      assert.equal(result.code, "build_fingerprint_mismatch");
    });
  }

  it("detects removed source files and ignores unrelated work and line endings", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    await fsp.writeFile(path.join(fixture.root, "README.md"), "unrelated work");
    await fsp.writeFile(
      path.join(fixture.root, "rust/acp-ws-bridge/src/main.rs"),
      "fn main() {}\r\n",
    );
    fixture.record.sourceHead = "c".repeat(40);
    await fsp.writeFile(fixture.recordPath, JSON.stringify(fixture.record));
    assert.isTrue(
      (await fixture.checker.checkAcpWsBridgeFreshness({ root: fixture.root }))
        .ok,
    );
    await fsp.unlink(path.join(fixture.root, "rust/acp-ws-bridge/src/main.rs"));
    assert.equal(
      (await fixture.checker.checkAcpWsBridgeFreshness({ root: fixture.root }))
        .code,
      "build_fingerprint_mismatch",
    );
  });

  for (const scenario of [
    {
      file: "zotero-acp-bridge.build.json",
      content: null,
      code: "build_record_missing",
    },
    {
      file: "zotero-acp-bridge.build.json",
      content: "{",
      code: "build_record_unreadable",
    },
    {
      file: "zotero-acp-bridge.build.json",
      content: "null",
      code: "build_record_invalid",
    },
    {
      file: "zotero-acp-bridge.exe",
      content: null,
      code: "native_binary_unreadable",
    },
    {
      file: "zotero-acp-bridge.exe",
      content: "corrupted",
      code: "binary_identity_mismatch",
    },
    {
      file: "zotero-acp-bridge.exe.sha256",
      content: null,
      code: "native_sidecar_unreadable",
    },
    {
      file: "zotero-acp-bridge.exe.sha256",
      content: "invalid",
      code: "native_sidecar_invalid",
    },
    {
      file: "zotero-acp-bridge.exe.sha256",
      content: `${"0".repeat(64)}  zotero-acp-bridge.exe\n`,
      code: "native_checksum_mismatch",
    },
  ]) {
    it(`reports ${scenario.code} without repairing files`, async function () {
      const fixture = await createAcpFreshnessFixture();
      roots.push(fixture.root);
      const file = path.join(fixture.directory, scenario.file);
      if (scenario.content === null) await fsp.unlink(file);
      else await fsp.writeFile(file, scenario.content);
      const result = await fixture.checker.checkAcpWsBridgeFreshness({
        root: fixture.root,
      });
      assert.isFalse(result.ok);
      assert.equal(result.code, scenario.code);
      if (scenario.content === null) assert.isFalse(fs.existsSync(file));
      else assert.equal(await fsp.readFile(file, "utf8"), scenario.content);
    });
  }

  it("rejects substituted executable even when its checksum sidecar is updated", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    const bytes = Buffer.from("replacement executable");
    await fsp.writeFile(
      path.join(fixture.directory, "zotero-acp-bridge.exe"),
      bytes,
    );
    await fsp.writeFile(
      path.join(fixture.directory, "zotero-acp-bridge.exe.sha256"),
      `${sha256(bytes)}  zotero-acp-bridge.exe\n`,
    );
    assert.equal(
      (await fixture.checker.checkAcpWsBridgeFreshness({ root: fixture.root }))
        .code,
      "binary_identity_mismatch",
    );
  });

  for (const failure of ["cargo_build_failed", "build_inputs_changed"]) {
    it(`preserves packaged output and invalidates local evidence after ${failure}`, async function () {
      const fixture = await createAcpFreshnessFixture();
      roots.push(fixture.root);
      const builder = await fixture.load("build-acp-ws-bridge.mjs");
      const localDir = path.join(
        fixture.root,
        fixture.artifacts.ACP_BRIDGE_LOCAL_OUTPUT,
      );
      await fsp.mkdir(localDir, { recursive: true });
      const localRecord = path.join(localDir, "zotero-acp-bridge.build.json");
      await fsp.writeFile(localRecord, JSON.stringify(fixture.record));
      let caught: { code?: string } | undefined;
      try {
        await builder.buildAcpWsBridge({
          root: fixture.root,
          platform: "win32",
          runCommand: async (command: string) => {
            if (command === "git") return { status: 0, stdout: "b".repeat(40) };
            if (failure === "cargo_build_failed") return { status: 1 };
            await fsp.appendFile(
              path.join(fixture.root, "rust/acp-ws-bridge/src/main.rs"),
              "// edit during compilation",
            );
            await fsp.writeFile(
              path.join(localDir, "zotero-acp-bridge.exe"),
              "compiled output",
            );
            return { status: 0 };
          },
        });
      } catch (error) {
        caught = error as { code?: string };
      }
      assert.equal(caught?.code, failure);
      assert.isFalse(fs.existsSync(localRecord));
      assert.deepEqual(
        JSON.parse(await fsp.readFile(fixture.recordPath, "utf8")),
        fixture.record,
      );
      assert.equal(
        await fsp.readFile(
          path.join(fixture.directory, "zotero-acp-bridge.exe"),
          "utf8",
        ),
        "fixture ACP binary",
      );
    });
  }

  it("refuses standalone packaging without current build evidence", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    const packager = await fixture.load("package-acp-ws-bridge.mjs");
    const localDir = path.join(
      fixture.root,
      fixture.artifacts.ACP_BRIDGE_LOCAL_OUTPUT,
    );
    await fsp.mkdir(localDir, { recursive: true });
    await fsp.writeFile(
      path.join(localDir, "zotero-acp-bridge.exe"),
      "old local binary",
    );
    let code;
    try {
      await packager.packageAcpWsBridge({ root: fixture.root });
    } catch (error) {
      code = (error as { code?: string }).code;
    }
    assert.equal(code, "build_record_missing");
    assert.equal(
      await fsp.readFile(
        path.join(fixture.directory, "zotero-acp-bridge.exe"),
        "utf8",
      ),
      "fixture ACP binary",
    );
  });

  it("exposes JSON and exit status through the read-only CLI", async function () {
    const fixture = await createAcpFreshnessFixture();
    roots.push(fixture.root);
    const script = path.resolve(
      "scripts/acp-ws-bridge/check-acp-ws-bridge-freshness.mjs",
    );
    const invoke = () =>
      spawnSync(process.execPath, [script], {
        cwd: fixture.root,
        encoding: "utf8",
      });
    const fresh = invoke();
    assert.equal(fresh.status, 0);
    assert.isTrue(JSON.parse(fresh.stdout).ok);
    await fsp.unlink(fixture.recordPath);
    const missing = invoke();
    assert.equal(missing.status, 1);
    assert.equal(JSON.parse(missing.stdout).code, "build_record_missing");
  });
});

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
      path.join(process.cwd(), "scripts/acp-ws-bridge/build-acp-ws-bridge.mjs"),
      "utf8",
    );
    const packageScript = fs.readFileSync(
      path.join(
        process.cwd(),
        "scripts/acp-ws-bridge/package-acp-ws-bridge.mjs",
      ),
      "utf8",
    );
    const cargoToml = fs.readFileSync(
      path.join(process.cwd(), "rust/acp-ws-bridge/Cargo.toml"),
      "utf8",
    );

    assert.equal(
      packageJson.scripts["prebuild:acp-ws-bridge"],
      "node scripts/acp-ws-bridge/build-acp-ws-bridge.mjs",
    );
    assert.equal(
      packageJson.scripts["package:acp-ws-bridge"],
      "node scripts/acp-ws-bridge/package-acp-ws-bridge.mjs",
    );
    assert.equal(
      packageJson.scripts["check:acp-ws-bridge-freshness"],
      "node scripts/acp-ws-bridge/check-acp-ws-bridge-freshness.mjs",
    );
    assert.include(cargoToml, 'name = "zotero-acp-bridge"');
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
