import { assert } from "chai";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  buildHostBridgeReviewMirrorInventory,
  checkHostBridgeReviewMirror,
  finalizeHostBridgeReviewMirror,
  prepareHostBridgeReviewMirror,
} from "../../scripts/host-bridge-review-mirror";

function write(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, "utf8");
}

function markdown(name: string, title = "Title") {
  return `---\nname: ${name}\ndescription: Example. Use when testing.\n---\n\n# ${title}\n\nRead \`value\` at [link](https://example.test).\n\n<!-- contract:keep -->\n\n\`\`\`bash\necho fixed\n\`\`\`\n`;
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "host-bridge-review-fixture-"));
  const surfaces = {
    schema: "host-bridge.surface-definitions.v1",
    cliRelease: "cli/zotero-bridge/release.json",
    surfaces: [
      {
        id: "zotero-bridge-cli",
        kind: "minimum-core",
        patch: 1,
        sourceRoot: "source/minimum",
        generatedRoot: "generated/minimum",
        materializedRoot: "minimum",
        skills: [
          {
            id: "zotero-bridge-cli",
            mount: "skills/zotero-bridge-cli",
            source: ".",
          },
        ],
      },
      {
        id: "zotero-library-agent",
        kind: "generic-agent",
        extends: "zotero-bridge-cli",
        patch: 1,
        sourceRoot: "source/generic",
        generatedRoot: "generated/generic",
        materializedRoot: "generic",
        skills: [
          {
            id: "zotero-library-agent",
            mount: "skills/zotero-library-agent",
            source: "skills/zotero-library-agent",
          },
        ],
      },
      {
        id: "zotero-librarian",
        kind: "hosted-agent",
        facet: "hermes",
        extends: "zotero-library-agent",
        patch: 1,
        sourceRoot: "source/hermes",
        generatedRoot: "generated/hermes",
        materializedRoot: "hermes",
        skills: [
          {
            id: "zotero-librarian",
            mount: "skills/zotero-librarian",
            source: "skills/zotero-librarian",
          },
        ],
      },
    ],
  };
  write(
    join(root, "host-bridge/surfaces.json"),
    `${JSON.stringify(surfaces)}\n`,
  );
  write(join(root, "cli/zotero-bridge/release.json"), '{"version":"7.4.0"}\n');
  write(
    join(root, "host-bridge/release-set.json"),
    '{"schema":"host-bridge.release-set.v2","releaseSetId":"candidate","payloadDigest":"payload","sourceCommit":"source"}\n',
  );
  write(
    join(root, "host-bridge/latest-complete-release-receipt.json"),
    '{"schema":"host-bridge.release-receipt.v2","status":"complete","releaseSetId":"complete","sourceCommit":"complete-source"}\n',
  );
  write(
    join(root, "generated/minimum/SKILL.md"),
    markdown("zotero-bridge-cli"),
  );
  write(
    join(root, "generated/generic/zotero-library-agent/SKILL.md"),
    markdown("zotero-library-agent"),
  );
  write(join(root, "generated/hermes/README.md"), "# Profile\n");
  write(join(root, "generated/hermes/SOUL.md"), "# Persona\n");
  write(
    join(root, "generated/hermes/skills/zotero-librarian/SKILL.md"),
    markdown("zotero-librarian"),
  );
  return root;
}

function translatePrepared(stagingRoot: string) {
  const inventory = JSON.parse(
    readFileSync(join(stagingRoot, "inventory.json"), "utf8"),
  );
  for (const entry of inventory.files) {
    const source = join(stagingRoot, "source", entry.artifactPath);
    const target = join(stagingRoot, "translated", entry.artifactPath);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target);
  }
  const summaries = Object.fromEntries(
    inventory.files.map((entry: { artifactPath: string }) => [
      entry.artifactPath,
      "审阅摘要",
    ]),
  );
  write(
    join(stagingRoot, "summaries.json"),
    `${JSON.stringify({ schema: "host-bridge.review-summaries.v1", summaries })}\n`,
  );
}

describe("Host Bridge review mirror", function () {
  it("discovers owned current-state documents once and records effective composition", function () {
    const inventory = buildHostBridgeReviewMirrorInventory({
      root: process.cwd(),
    });
    assert.strictEqual(
      inventory.files.length,
      inventory.surfaces.reduce(
        (total, surface) => total + surface.ownedFileCount,
        0,
      ),
    );
    const byId = new Map(
      inventory.surfaces.map((surface) => [surface.id, surface]),
    );
    const minimum = byId.get("zotero-bridge-cli");
    const generic = byId.get("zotero-library-agent");
    const hosted = byId.get("zotero-librarian");
    assert.isDefined(minimum);
    assert.isDefined(generic);
    assert.isDefined(hosted);
    assert.strictEqual(generic?.ownedFileCount, 13);
    assert.strictEqual(
      generic?.effectiveFileCount,
      (minimum?.ownedFileCount || 0) + (generic?.ownedFileCount || 0),
    );
    assert.strictEqual(
      hosted?.effectiveFileCount,
      (minimum?.ownedFileCount || 0) +
        (generic?.ownedFileCount || 0) +
        (hosted?.ownedFileCount || 0),
    );
    assert.include(
      inventory.files.map((entry) => entry.sourcePath),
      "skills_builtin/zotero-library-agent/references/workflow-catalog.md",
    );
    assert.lengthOf(
      new Set(inventory.files.map((entry) => entry.sourcePath)),
      inventory.files.length,
    );
  });

  it("finalizes and checks a frozen exact inventory", function () {
    const root = createFixture();
    const stagingRoot = join(root, "staging");
    const targetRoot = join(root, "artifact");
    prepareHostBridgeReviewMirror({ root, stagingRoot });
    translatePrepared(stagingRoot);
    const provenance = finalizeHostBridgeReviewMirror({
      root,
      stagingRoot,
      targetRoot,
      sourceCommit: "test-commit",
    });
    assert.strictEqual(provenance.schema, "host-bridge.review-mirror.v2");
    assert.strictEqual(provenance.fileCount, 5);
    assert.isTrue(existsSync(join(targetRoot, "INDEX.md")));
    assert.strictEqual(
      checkHostBridgeReviewMirror({ root, targetRoot }).fileCount,
      5,
    );
  });

  it("rejects source drift and preserves the previous artifact", function () {
    const root = createFixture();
    const stagingRoot = join(root, "staging");
    const targetRoot = join(root, "artifact");
    write(join(targetRoot, "sentinel.txt"), "preserve\n");
    prepareHostBridgeReviewMirror({ root, stagingRoot });
    translatePrepared(stagingRoot);
    write(
      join(root, "generated/minimum/SKILL.md"),
      `${markdown("zotero-bridge-cli")}changed\n`,
    );
    assert.throws(
      () =>
        finalizeHostBridgeReviewMirror({
          root,
          stagingRoot,
          targetRoot,
          sourceCommit: "test-commit",
        }),
      /source changed since prepare/i,
    );
    assert.strictEqual(
      readFileSync(join(targetRoot, "sentinel.txt"), "utf8"),
      "preserve\n",
    );
  });

  it("rejects protected structure changes and equal-count inventory substitution", function () {
    const root = createFixture();
    const stagingRoot = join(root, "staging");
    prepareHostBridgeReviewMirror({ root, stagingRoot });
    translatePrepared(stagingRoot);
    const translated = join(
      stagingRoot,
      "translated/zotero-bridge-cli/skills/zotero-bridge-cli/SKILL.md",
    );
    write(
      translated,
      readFileSync(translated, "utf8").replace("# Title", "## Title"),
    );
    assert.throws(
      () =>
        finalizeHostBridgeReviewMirror({
          root,
          stagingRoot,
          targetRoot: join(root, "artifact"),
          sourceCommit: "test-commit",
        }),
      /protected markdown structure/i,
    );

    const original = join(
      root,
      "generated/generic/zotero-library-agent/SKILL.md",
    );
    const replacement = join(
      root,
      "generated/generic/zotero-library-agent/references/playbook.md",
    );
    mkdirSync(dirname(replacement), { recursive: true });
    renameSync(original, replacement);
    const current = buildHostBridgeReviewMirrorInventory({ root });
    assert.strictEqual(current.files.length, 5);
    const frozen = JSON.parse(
      readFileSync(join(stagingRoot, "inventory.json"), "utf8"),
    );
    assert.notDeepEqual(
      current.files.map((entry) => entry.sourcePath),
      frozen.files.map((entry: { sourcePath: string }) => entry.sourcePath),
    );
  });

  it("defines a minimum-complete Skill with one comprehensive reference", function () {
    const skill = readFileSync(
      join(process.cwd(), ".agents/skills/host-bridge-review-mirror/SKILL.md"),
      "utf8",
    );
    for (const heading of [
      "Goal",
      "Inputs",
      "Workflow",
      "Hard constraints",
      "LLM And Script Responsibilities",
      "Completion",
      "Failure handling",
      "References",
    ]) {
      assert.include(skill, `## ${heading}`);
    }
    assert.include(skill, "references/review-operations.md");
    assert.include(skill, "host-bridge/surfaces.json");
    assert.notInclude(skill, "cli-wrapper");
    assert.notInclude(skill, "librarian-profile");
  });
});
