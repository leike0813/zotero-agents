import { assert } from "chai";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildHostBridgeReleaseSet,
  classifyHostBridgeReleaseChanges,
  verifyHostBridgeReleaseSetSurfaces,
} from "../../scripts/host-bridge-release-set";
import { collectHostBridgeReleaseChangedFiles } from "../../scripts/host-bridge-release-plan";
import { materializeHostBridgeSurfaces } from "../../scripts/materialize-host-bridge-surfaces";

describe("Host Bridge release coordinator", function () {
  it("collects committed feature changes from a clean checkout", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-plan-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-b", "main");
    git("config", "user.name", "Host Bridge Test");
    git("config", "user.email", "host-bridge@example.invalid");
    writeFileSync(join(root, "README.md"), "base\n");
    git("add", "README.md");
    git("commit", "-m", "base");
    git("checkout", "-b", "feature");
    writeFileSync(join(root, "surface.ts"), "export {};\n");
    git("add", "surface.ts");
    git("commit", "-m", "surface");

    const changed = collectHostBridgeReleaseChangedFiles(root);
    assert.deepEqual(changed.files, ["surface.ts"]);
  });

  it("classifies release inputs independently from generated drift", function () {
    const plan = classifyHostBridgeReleaseChanges([
      "cli/zotero-bridge/src/commands.rs",
      "cli/zotero-bridge/scripts/install.sh",
      "skills_src/zotero-bridge-cli/semantic/SKILL.md",
      "skills_src/zotero-library-agent/semantic/SKILL.md",
      "profiles_src/hermes/zotero-librarian/SOUL.md",
      "profiles/hermes/zotero-librarian/assets/profile-manifest-source.json",
    ]);

    assert.isTrue(plan.cliBinaryInputs);
    assert.isTrue(plan.installers);
    assert.isTrue(plan.surfaces.cliBundle);
    assert.isTrue(plan.surfaces.libraryAgent);
    assert.isTrue(plan.surfaces.librarianProfile);
    assert.deepEqual(plan.generatedOnly, [
      "profiles/hermes/zotero-librarian/assets/profile-manifest-source.json",
    ]);
  });

  it("creates a deterministic release set from exact CLI and surface identities", function () {
    const input = {
      sourceCommit: "abc123",
      protocol: "host-bridge.v1",
      cliSchema: "zotero-bridge.cli.v1",
      cli: {
        version: "0.2.2",
        buildFingerprint: "f".repeat(64),
        commandCatalogChecksum: "c".repeat(64),
        binaryAggregateSha256: "b".repeat(64),
        binariesBuildFingerprint: "f".repeat(64),
        binaries: [
          {
            platform: "linux-x64",
            binary: "zotero-bridge",
            sha256: "a".repeat(64),
            bytes: 12,
          },
        ],
      },
      surfaces: {
        cliBundle: {
          version: "1.0.0",
          contentDigest: "1".repeat(64),
          repository: "host-bridge/zotero-bridge-cli-bundle",
        },
        libraryAgent: {
          version: "0.2.1",
          contentDigest: "2".repeat(64),
          repository: "leike0813/zotero-library-agent-bundle",
        },
        librarianProfile: {
          version: "0.2.3",
          contentDigest: "3".repeat(64),
          repository: "leike0813/zotero-librarian-profile",
        },
      },
    } as const;

    const first = buildHostBridgeReleaseSet(input);
    const second = buildHostBridgeReleaseSet(input);
    assert.strictEqual(first.schema, "host-bridge.release-set.v1");
    assert.strictEqual(first.releaseSetId, second.releaseSetId);
    assert.match(first.releaseSetId, /^hbrs-[a-f0-9]{24}$/);
    assert.strictEqual(
      buildHostBridgeReleaseSet({ ...input, sourceCommit: "another-commit" })
        .releaseSetId,
      first.releaseSetId,
    );
    assert.strictEqual(
      first.surfaces.libraryAgent.cliIdentity.buildFingerprint,
      input.cli.buildFingerprint,
    );

    const changed = buildHostBridgeReleaseSet({
      ...input,
      cli: { ...input.cli, buildFingerprint: "e".repeat(64) },
    });
    assert.notStrictEqual(changed.releaseSetId, first.releaseSetId);
  });

  it("rejects equal SemVer surfaces carrying a different CLI identity", function () {
    const releaseSet = buildHostBridgeReleaseSet({
      sourceCommit: "abc123",
      protocol: "host-bridge.v1",
      cliSchema: "zotero-bridge.cli.v1",
      cli: {
        version: "0.2.2",
        buildFingerprint: "f".repeat(64),
        commandCatalogChecksum: "c".repeat(64),
        binaryAggregateSha256: "b".repeat(64),
        binariesBuildFingerprint: "f".repeat(64),
        binaries: [],
      },
      surfaces: {
        cliBundle: {
          version: "1.0.0",
          contentDigest: "1".repeat(64),
          repository: "host-bridge/zotero-bridge-cli-bundle",
        },
        libraryAgent: {
          version: "0.2.1",
          contentDigest: "2".repeat(64),
          repository: "leike0813/zotero-library-agent-bundle",
        },
        librarianProfile: {
          version: "0.2.3",
          contentDigest: "3".repeat(64),
          repository: "leike0813/zotero-librarian-profile",
        },
      },
    });

    const manifests = Object.values(releaseSet.surfaces).map((surface) => ({
      releaseSetId: releaseSet.releaseSetId,
      cliIdentity: { ...surface.cliIdentity },
    }));
    manifests[1].cliIdentity.buildFingerprint = "0".repeat(64);

    assert.throws(
      () => verifyHostBridgeReleaseSetSurfaces(releaseSet, manifests),
      /build fingerprint/i,
    );
  });

  it("materializes one release envelope and all seven CLI binaries for every surface", function () {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "host-bridge-materialize-"),
    );
    const outputRoot = join(temporaryRoot, "release");
    try {
      const result = materializeHostBridgeSurfaces({ outputRoot });
      const manifests = result.surfaces.map((surface) =>
        JSON.parse(readFileSync(join(surface.path, "manifest.json"), "utf8")),
      );
      assert.lengthOf(manifests, 3);
      for (const manifest of manifests) {
        assert.strictEqual(manifest.releaseSetId, result.releaseSetId);
        assert.deepEqual(manifest.cliIdentity, manifests[0].cliIdentity);
        assert.lengthOf(manifest.releaseSet.cli.binaries, 7);
      }
      for (const surface of result.surfaces) {
        const binaryRoot =
          surface.name === "librarianProfile"
            ? join(surface.path, "assets/zotero-bridge/bin")
            : join(surface.path, "bin");
        for (const binary of manifests[0].releaseSet.cli.binaries) {
          assert.isTrue(
            existsSync(join(binaryRoot, binary.platform, binary.binary)),
          );
        }
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});
