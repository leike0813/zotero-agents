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
  writeHostBridgeReleasePlan,
} from "../../scripts/host-bridge-release-plan";
import { materializeHostBridgeSurfaces } from "../../scripts/materialize-host-bridge-surfaces";
import { resolveExactCliReleaseIntent } from "../../scripts/host-bridge-version-intent";
import { renderHostBridgeReleaseSet } from "../../scripts/render-host-bridge-release-set";
import {
  readImmutablePublicationSource,
  selectDispatchedHostBridgeRun,
} from "../../scripts/dispatch-host-bridge-release";
import {
  advanceHostBridgeReleaseReceipt,
  createHostBridgeReleaseReceipt,
} from "../../scripts/host-bridge-release-controller";

function releaseBinaries(buildFingerprint = "f".repeat(64)) {
  return [
    "darwin-arm64",
    "darwin-x64",
    "linux-arm",
    "linux-arm64",
    "linux-x64",
    "linux-x86",
    "win32-x64",
  ].map((platform, index) => ({
    platform,
    binary: platform.startsWith("win32")
      ? "zotero-bridge.exe"
      : "zotero-bridge",
    sha256: String(index + 1).repeat(64),
    bytes: 12 + index,
    buildFingerprint,
  }));
}

describe("Host Bridge release coordinator", function () {
  this.timeout(30_000);

  it("advances a resumable v2 receipt only from verified remote facts", function () {
    const releaseSet = {
      schema: "host-bridge.release-set.v2" as const,
      releaseSetId: `hbrs-${"a".repeat(24)}`,
      payloadDigest: `sha256:${"b".repeat(64)}`,
      source: { commit: "abc1234" },
      surfaces: {
        cliBundle: { contentDigest: "1".repeat(64) },
        libraryAgent: { contentDigest: "2".repeat(64) },
        librarianProfile: { contentDigest: "3".repeat(64) },
      },
    };
    let receipt = createHostBridgeReleaseReceipt({
      releaseSet,
      sourceCommit: "abc1234",
      workflowRun: "run-1",
      pipelineRevision: "workflow-sha",
      prebuildCommit: "prebuild-sha",
      now: "2026-01-01T00:00:00.000Z",
    });
    assert.strictEqual(receipt.status, "partial");
    receipt = advanceHostBridgeReleaseReceipt(receipt, {
      step: "publish",
      status: "pending",
      surfaces: {
        cliBundle: {
          status: "published",
          commit: "cli-sha",
          contentDigest: "1".repeat(64),
        },
      },
    });
    assert.strictEqual(receipt.surfaces.cliBundle.status, "published");
    assert.strictEqual(receipt.surfaces.libraryAgent.status, "pending");
    assert.throws(
      () =>
        advanceHostBridgeReleaseReceipt(receipt, {
          step: "publish",
          status: "complete",
        }),
      /all immutable surface facts/,
    );
    receipt = advanceHostBridgeReleaseReceipt(receipt, {
      step: "publish",
      status: "complete",
      surfaces: {
        libraryAgent: {
          status: "published",
          commit: "library-sha",
          contentDigest: "2".repeat(64),
        },
        librarianProfile: {
          status: "published",
          commit: "profile-sha",
          contentDigest: "3".repeat(64),
        },
      },
    });
    receipt = advanceHostBridgeReleaseReceipt(receipt, {
      step: "verify",
      status: "complete",
      surfaces: {
        cliBundle: {
          status: "verified",
          commit: "cli-sha",
          contentDigest: "1".repeat(64),
        },
        libraryAgent: {
          status: "verified",
          commit: "library-sha",
          contentDigest: "2".repeat(64),
        },
        librarianProfile: {
          status: "verified",
          commit: "profile-sha",
          contentDigest: "3".repeat(64),
        },
      },
    });
    receipt = advanceHostBridgeReleaseReceipt(receipt, {
      step: "mutablePointers",
      status: "complete",
    });
    receipt = advanceHostBridgeReleaseReceipt(receipt, {
      step: "finalize",
      status: "complete",
    });
    assert.strictEqual(receipt.status, "complete");
  });

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
      join(root, "host-bridge/latest-complete-release-receipt.json"),
      `${JSON.stringify({ status: "complete", sourceCommit: released })}\n`,
    );
    writeFileSync(join(root, "one.txt"), "one\n");
    git("add", ".");
    git("commit", "-m", "first unreleased change");
    writeFileSync(join(root, "two.txt"), "two\n");
    git("add", ".");
    git("commit", "-m", "second unreleased change");

    assert.strictEqual(resolveHostBridgeReleaseBase(root), released);
    assert.sameMembers(collectHostBridgeReleaseChangedFiles(root).files, [
      "host-bridge/latest-complete-release-receipt.json",
      "one.txt",
      "two.txt",
    ]);
  });

  it("does not treat a planned release set as a completed baseline", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-planned-base-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git("init", "-b", "main");
    git("config", "user.name", "Host Bridge Test");
    git("config", "user.email", "host-bridge@example.invalid");
    mkdirSync(join(root, "host-bridge"));
    writeFileSync(join(root, "base.txt"), "base\n");
    git("add", ".");
    git("commit", "-m", "base");
    const base = git("rev-parse", "HEAD");
    writeFileSync(
      join(root, "host-bridge/release-set.json"),
      `${JSON.stringify({ status: "planned", source: { commit: base } })}\n`,
    );
    git("add", ".");
    git("commit", "-m", "prepare release");

    assert.notStrictEqual(resolveHostBridgeReleaseBase(root), base);
  });

  it("writes release plans atomically to an explicit output file", function () {
    const root = mkdtempSync(join(tmpdir(), "host-bridge-plan-output-"));
    const output = join(root, "plan.json");
    const plan = { schema: "test.plan.v1", prebuildRequired: false };
    writeHostBridgeReleasePlan(output, plan);
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), plan);
    assert.isFalse(existsSync(`${output}.tmp`));
  });

  it("correlates a manual Host Bridge dispatch by request, release set, and workflow revision", function () {
    const selected = selectDispatchedHostBridgeRun(
      [
        {
          databaseId: 1,
          displayTitle: "Host Bridge hbrs-target (request-old)",
          headSha: "workflow",
          url: "old",
        },
        {
          databaseId: 2,
          displayTitle: "Host Bridge hbrs-target (request-new)",
          headSha: "workflow",
          url: "new",
        },
      ],
      {
        releaseSetId: "hbrs-target",
        requestId: "request-new",
        workflowSha: "workflow",
      },
    );
    assert.strictEqual(selected?.databaseId, 2);
  });

  it("uses an existing immutable manifest's historical source for a release-set resume", function () {
    assert.strictEqual(
      readImmutablePublicationSource(
        JSON.stringify({
          releaseSetId: "hbrs-target",
          sourceCommit: "a".repeat(40),
        }),
        "hbrs-target",
      ),
      "a".repeat(40),
    );
    assert.throws(
      () =>
        readImmutablePublicationSource(
          JSON.stringify({
            releaseSetId: "hbrs-other",
            sourceCommit: "a".repeat(40),
          }),
          "hbrs-target",
        ),
      /invalid manifest/i,
    );
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

  it("accepts only an exact current, next-patch, or next-minor CLI target", function () {
    assert.strictEqual(resolveExactCliReleaseIntent("0.3.0", "0.3.0"), "auto");
    assert.strictEqual(resolveExactCliReleaseIntent("0.3.0", "0.3.1"), "patch");
    assert.strictEqual(resolveExactCliReleaseIntent("0.3.9", "0.4.0"), "minor");
    assert.throws(
      () => resolveExactCliReleaseIntent("0.3.0", "0.3.2"),
      /next patch/i,
    );
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
    assert.notMatch(workflow, /GITEE_TOKEN|gitee\.com/i);
    assert.include(workflow, "host-bridge-release-controller.ts");
    assert.notInclude(workflow, "  push:");
    assert.include(workflow, "workflow_dispatch:");
  });

  it("keeps prepared release sets independent of ambient workflow run identity", function () {
    const releaseSet = JSON.parse(
      readFileSync("host-bridge/release-set.json", "utf8"),
    );
    const previousRunId = process.env.GITHUB_RUN_ID;
    try {
      delete process.env.GITHUB_RUN_ID;
      const expected = renderHostBridgeReleaseSet({
        root: process.cwd(),
        sourceCommit: releaseSet.source.commit,
      });
      process.env.GITHUB_RUN_ID =
        "ambient-ci-run-must-not-change-prepared-identity";
      const actual = renderHostBridgeReleaseSet({
        root: process.cwd(),
        sourceCommit: releaseSet.source.commit,
      });

      assert.strictEqual(actual, expected);
      assert.notProperty(JSON.parse(actual), "workflowRun");
    } finally {
      if (previousRunId === undefined) {
        delete process.env.GITHUB_RUN_ID;
      } else {
        process.env.GITHUB_RUN_ID = previousRunId;
      }
    }
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
        path: "skills_src/zotero-bridge-cli/README.md",
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
      cliSchema: "zotero-bridge.cli.v3",
      cli: {
        version: "0.2.2",
        buildFingerprint: "f".repeat(64),
        commandCatalogChecksum: "c".repeat(64),
        binaryAggregateSha256: "b".repeat(64),
        binariesBuildFingerprint: "f".repeat(64),
        binaries: releaseBinaries(),
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
    assert.strictEqual(first.schema, "host-bridge.release-set.v2");
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
      cli: {
        ...input.cli,
        buildFingerprint: "e".repeat(64),
        binariesBuildFingerprint: "e".repeat(64),
      },
    });
    assert.notStrictEqual(changed.releaseSetId, first.releaseSetId);
  });

  it("rejects equal SemVer surfaces carrying a different CLI identity", function () {
    const releaseSet = buildHostBridgeReleaseSet({
      sourceCommit: "abc123",
      protocol: "host-bridge.v1",
      cliSchema: "zotero-bridge.cli.v3",
      cli: {
        version: "0.2.2",
        buildFingerprint: "f".repeat(64),
        commandCatalogChecksum: "c".repeat(64),
        binaryAggregateSha256: "b".repeat(64),
        binariesBuildFingerprint: "f".repeat(64),
        binaries: releaseBinaries(),
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
      for (const surface of result.surfaces.filter(
        (entry) => entry.name !== "librarianProfile",
      )) {
        assert.isFalse(
          existsSync(join(surface.path, "skills/zotero-bridge-cli/README.md")),
          surface.name,
        );
      }
      const readmeSources = {
        cliBundle: "skills_src/zotero-bridge-cli/README.md",
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
    assert.include(cliPublisher, "skills_src/zotero-bridge-cli/README.md");
    assert.notInclude(cliPublisher, "Join-Path $SkillDir 'README.md'");
    assert.include(libraryPublisher, 'Join-Path $agentSkillRoot "README.md"');
    assert.notInclude(cliPublisher, "# Zotero Host Bridge CLI Bundle");
    assert.notInclude(libraryPublisher, "# Zotero Library Agent Bundle");
  });
});
