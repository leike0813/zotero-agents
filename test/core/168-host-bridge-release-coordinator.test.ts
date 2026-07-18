import { assert } from "chai";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
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
import {
  collectHostBridgeReleaseChangedFiles,
  createHostBridgeReleasePlan,
  resolveHostBridgeReleaseBase,
} from "../../scripts/host-bridge-release-plan";
import { materializeHostBridgeSurfaces } from "../../scripts/materialize-host-bridge-surfaces";

describe("Host Bridge release coordinator", function () {
  this.timeout(30_000);

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

  it("uses the committed completed release identity as the accumulated baseline", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-baseline-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git("init", "-b", "main");
    git("config", "user.name", "Host Bridge Test");
    git("config", "user.email", "host-bridge@example.invalid");
    writeFileSync(join(root, "base.txt"), "released\n");
    git("add", "base.txt");
    git("commit", "-m", "released");
    const released = git("rev-parse", "HEAD");
    mkdirSync(join(root, "host-bridge"));
    writeFileSync(
      join(root, "host-bridge/release-set.json"),
      `${JSON.stringify({ source: { commit: released } })}\n`,
    );
    writeFileSync(join(root, "one.txt"), "one\n");
    git("add", ".");
    git("commit", "-m", "first unreleased change");
    writeFileSync(join(root, "two.txt"), "two\n");
    git("add", ".");
    git("commit", "-m", "second unreleased change");

    assert.strictEqual(resolveHostBridgeReleaseBase(root), released);
    assert.sameMembers(collectHostBridgeReleaseChangedFiles(root).files, [
      "host-bridge/release-set.json",
      "one.txt",
      "two.txt",
    ]);
  });

  it("plans one explicit minor release without writing version state", function () {
    const paths = [
      "cli/zotero-bridge/release.json",
      "skills_src/zotero-bridge-cli/runner.json",
      "skills_src/zotero-library-agent/bundle-version.json",
      "profiles_src/hermes/zotero-librarian/profile-version.json",
      "host-bridge/release-set.json",
    ];
    const before = paths.map((path) =>
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    );
    const plan = createHostBridgeReleasePlan(process.cwd(), "minor");
    assert.deepEqual(plan.versionBumps, {
      cli: "minor",
      cliBundle: "minor",
      libraryAgent: "minor",
      librarianProfile: "minor",
    });
    const after = paths.map((path) =>
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    );
    assert.deepEqual(after, before);
  });

  it("keeps content rendering version-neutral and publication release-set-gated", function () {
    const identityPaths = [
      "cli/zotero-bridge/release.json",
      "skills_src/zotero-bridge-cli/runner.json",
      "skills_src/zotero-library-agent/bundle-version.json",
      "profiles_src/hermes/zotero-librarian/profile-version.json",
      "host-bridge/release-set.json",
    ];
    const before = identityPaths.map((path) => readFileSync(path, "utf8"));
    execFileSync("npm", ["run", "render:host-bridge-content"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    assert.deepEqual(
      identityPaths.map((path) => readFileSync(path, "utf8")),
      before,
    );

    const workflow = readFileSync(
      ".github/workflows/release-host-bridge.yml",
      "utf8",
    );
    const pushPaths = workflow.slice(
      workflow.indexOf("  push:"),
      workflow.indexOf("  workflow_dispatch:"),
    );
    assert.include(pushPaths, '"host-bridge/release-set.json"');
    assert.notInclude(pushPaths, "skills_src/");
    assert.notInclude(pushPaths, "cli/zotero-bridge/**");
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

  it("classifies README semantic sources by their published surfaces", function () {
    const cases = [
      {
        path: "skills_src/zotero-bridge-cli/semantic/README.md",
        surfaces: {
          cliBundle: true,
          libraryAgent: true,
          librarianProfile: false,
        },
      },
      {
        path: "skills_src/zotero-library-agent/semantic/README.md",
        surfaces: {
          cliBundle: false,
          libraryAgent: true,
          librarianProfile: false,
        },
      },
      {
        path: "profiles_src/hermes/zotero-librarian/README.md",
        surfaces: {
          cliBundle: false,
          libraryAgent: false,
          librarianProfile: true,
        },
      },
    ];

    for (const entry of cases) {
      assert.deepEqual(
        classifyHostBridgeReleaseChanges([entry.path]).surfaces,
        entry.surfaces,
        entry.path,
      );
    }
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
        assert.isTrue(existsSync(join(surface.path, "README.md")));
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
      const readmeSources = {
        cliBundle: "skills_builtin/zotero-bridge-cli/README.md",
        libraryAgent: "skills_builtin/zotero-library-agent/README.md",
        librarianProfile: "profiles/hermes/zotero-librarian/README.md",
      } as const;
      for (const surface of result.surfaces) {
        assert.strictEqual(
          readFileSync(join(surface.path, "README.md"), "utf8"),
          readFileSync(readmeSources[surface.name], "utf8"),
        );
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("keeps legacy publishers on the rendered README sources", function () {
    const cliPublisher = readFileSync(
      "scripts/publish-host-bridge-cli-bundle.ps1",
      "utf8",
    );
    const libraryPublisher = readFileSync(
      "scripts/publish-zotero-library-agent-bundle.ps1",
      "utf8",
    );
    assert.include(cliPublisher, "Join-Path $SkillDir 'README.md'");
    assert.include(libraryPublisher, 'Join-Path $agentSkillRoot "README.md"');
    assert.notInclude(cliPublisher, "# Zotero Host Bridge CLI Bundle");
    assert.notInclude(libraryPublisher, "# Zotero Library Agent Bundle");
  });
});
