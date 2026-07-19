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
      "cli/zotero-bridge/src/surface.rs",
      "scripts/host-bridge-agent-surface.ts",
      "schemas/host-bridge.agent-surface.v2.schema.json",
      "scripts/host-bridge-release-plan.ts",
      "schemas/host-bridge.release-receipt.v1.schema.json",
      "workflows_builtin/manifest.json",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "skills_src/zotero-bridge-cli/semantic/SKILL.md",
    ]);

    assert.equal(context.schema, "host-bridge.semantic-review-context.v1");
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.specLayerChanges, [
      "cli/zotero-bridge/src/commands.rs",
      "cli/zotero-bridge/src/surface.rs",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "schemas/host-bridge.agent-surface.v2.schema.json",
      "schemas/host-bridge.release-receipt.v1.schema.json",
      "scripts/host-bridge-agent-surface.ts",
      "scripts/host-bridge-release-plan.ts",
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
      "cli/zotero-bridge/agent-surface.json",
      "host-bridge/release-set.json",
    ]);

    assert.isFalse(context.reviewRequired);
    assert.isEmpty(context.specLayerChanges);
    assert.isEmpty(context.semanticSourceChanges);
    assert.sameMembers(context.generatedTargetChanges, [
      "doc/host-bridge-cli.md",
      "cli/zotero-bridge/agent-surface.json",
      "host-bridge/release-set.json",
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

  it("classifies Zotero Library Agent semantic and version inputs", function () {
    const semantic = classifyChangedFiles([
      "skills_src/zotero-library-agent/semantic/SKILL.md",
      "skills_src/host-bridge-shared/control-invariants.md",
    ]);
    assert.isTrue(semantic.reviewRequired);
    assert.lengthOf(semantic.semanticSourceChanges, 2);

    const version = classifyChangedFiles([
      "skills_src/zotero-library-agent/bundle-version.json",
    ]);
    assert.isFalse(version.reviewRequired);
    assert.sameMembers(version.bundleReleaseMetadataChanges, [
      "skills_src/zotero-library-agent/bundle-version.json",
    ]);
  });

  it("classifies the CLI bundle root README as a semantic surface source", function () {
    const context = classifyChangedFiles([
      "skills_src/zotero-bridge-cli/README.md",
    ]);
    assert.isTrue(context.reviewRequired);
    assert.deepEqual(context.semanticSourceChanges, [
      "skills_src/zotero-bridge-cli/README.md",
    ]);
  });

  it("includes every Profile semantic owner and Host Bridge OpenSpec surface", function () {
    const context = classifyChangedFiles([
      "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/library-maintenance.md",
      "profiles_src/hermes/zotero-librarian/skills/zotero-workflow-agent-runner/SKILL.md",
      "openspec/specs/zotero-librarian-profile/spec.md",
      "openspec/specs/zotero-librarian-profile-distribution/spec.md",
      "openspec/specs/zotero-library-agent-bundle/spec.md",
    ]);

    assert.isTrue(context.reviewRequired);
    assert.lengthOf(context.semanticSourceChanges, 2);
    assert.lengthOf(context.specLayerChanges, 3);
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
    assert.include(skill, "Agent Control Contract");
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
      "npm run prepare:host-bridge-release",
    );

    assert.isAtLeast(reviewIndex, 0);
    assert.isAtLeast(renderIndex, 0);
    assert.isBelow(reviewIndex, renderIndex);
    assert.include(releaseSkill, "npm run release:host-bridge:plan");
    assert.include(releaseSkill, "release-host-bridge.yml");
    assert.include(releaseSkill, "releaseSetId");
    assert.include(releaseSkill, "release-receipt.json");
    assert.include(releaseSkill, "host-bridge.release-receipt.v1");
    assert.include(releaseSkill, "check:host-bridge-cli-prebuild-freshness");
  });

  it("keeps the project release coordinator on the unified release-set contract", async function () {
    const coordinatorRoot = projectPath(
      ".agents",
      "skills",
      "zotero-agents-release-coordinator",
    );
    const files = await Promise.all(
      [
        "SKILL.md",
        "references/host-bridge-change-detection.md",
        "references/release-playbook.md",
        "references/failure-recovery.md",
      ].map((file) => fs.readFile(path.join(coordinatorRoot, file), "utf8")),
    );
    const contract = files.join("\n");

    assert.include(contract, "host-bridge.release-receipt.v1");
    assert.include(contract, "releaseSetId");
    assert.include(contract, "status: complete");
    assert.notInclude(contract, "build-zotero-bridge-cli.yml");
    assert.notInclude(contract, "D:\\Workspace\\Code\\JavaScript");
  });
});
