import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import { classifyChangedFiles } from "../../scripts/host-bridge-semantic-review-context";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

describe("Host Bridge semantic surface review skill", function () {
  it("classifies Host Bridge spec-layer changes as requiring semantic review", function () {
    const context = classifyChangedFiles([
      "src/modules/hostBridgeCapabilityRegistry.ts",
      "src/modules/workflowExecution/sequenceRuntime.ts",
      "cli/zotero-bridge/src/commands.rs",
      "workflows_builtin/manifest.json",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "skills_src/zotero-bridge-cli/semantic/SKILL.md",
    ]);

    assert.equal(context.schema, "host-bridge.semantic-review-context.v1");
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.specLayerChanges, [
      "cli/zotero-bridge/src/commands.rs",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "src/modules/hostBridgeCapabilityRegistry.ts",
      "src/modules/workflowExecution/sequenceRuntime.ts",
      "workflows_builtin/manifest.json",
    ]);
    assert.sameMembers(context.semanticSourceChanges, [
      "skills_src/zotero-bridge-cli/semantic/SKILL.md",
    ]);
    assert.include(
      context.recommendedFocus.join("\n"),
      "Review Host Bridge wrapper semantic source",
    );
  });

  it("reports generated-target drift without requiring semantic review", function () {
    const context = classifyChangedFiles([
      "skills_builtin/zotero-bridge-cli/SKILL.md",
      "profiles/hermes/zotero-librarian/SOUL.md",
      "doc/host-bridge-cli.md",
    ]);

    assert.isFalse(context.reviewRequired);
    assert.isEmpty(context.specLayerChanges);
    assert.isEmpty(context.semanticSourceChanges);
    assert.sameMembers(context.generatedTargetChanges, [
      "doc/host-bridge-cli.md",
      "profiles/hermes/zotero-librarian/SOUL.md",
      "skills_builtin/zotero-bridge-cli/SKILL.md",
    ]);
    assert.include(
      context.recommendedFocus.join("\n"),
      "Generated targets changed without spec or semantic source changes",
    );
  });

  it("classifies profile version metadata without requiring semantic review", function () {
    const context = classifyChangedFiles([
      "profiles_src/hermes/zotero-librarian/profile-version.json",
    ]);

    assert.isFalse(context.reviewRequired);
    assert.sameMembers(context.profileReleaseMetadataChanges, [
      "profiles_src/hermes/zotero-librarian/profile-version.json",
    ]);
    assert.isEmpty(context.semanticSourceChanges);
  });

  it("defines a runnable meta skill with direct references", async function () {
    const skill = await fs.readFile(
      projectPath(
        ".agents",
        "skills",
        "host-bridge-semantic-surface-review",
        "SKILL.md",
      ),
      "utf8",
    );

    assert.include(skill, "name: host-bridge-semantic-surface-review");
    assert.include(skill, "Host Bridge capability");
    assert.include(
      skill,
      "npx tsx scripts/host-bridge-semantic-review-context.ts",
    );
    assert.include(skill, "references/surface-map.md");
    assert.include(skill, "references/review-playbook.md");
    assert.include(skill, "references/nested-call-contract.md");
  });

  it("requires semantic review before Host Bridge surface rendering in the release pipeline", async function () {
    const releaseSkill = await fs.readFile(
      projectPath(
        ".agents",
        "skills",
        "host-bridge-release-pipeline",
        "SKILL.md",
      ),
      "utf8",
    );

    const reviewIndex = releaseSkill.indexOf(
      "$host-bridge-semantic-surface-review",
    );
    const renderIndex = releaseSkill.indexOf(
      "npm run render:host-bridge-surface",
    );

    assert.isAtLeast(reviewIndex, 0);
    assert.isAtLeast(renderIndex, 0);
    assert.isBelow(reviewIndex, renderIndex);
    assert.include(releaseSkill, "semantic source files changed");
    assert.include(releaseSkill, "inspect:zotero-librarian-profile-version");
    assert.include(releaseSkill, "bump:zotero-librarian-profile");
    assert.include(releaseSkill, "references/profile-versioning.md");
  });
});
