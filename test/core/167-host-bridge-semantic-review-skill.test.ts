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
      "schemas/host-bridge.agent-surface.v5.schema.json",
      "host-bridge/surfaces.json",
      "scripts/host-bridge-surface-model.ts",
      "scripts/render-host-bridge-surfaces.ts",
      "scripts/check-host-bridge-skill-packages.ts",
      "scripts/host-bridge-release-plan.ts",
      "schemas/host-bridge.release-receipt.v2.schema.json",
      "workflows_builtin/manifest.json",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md",
    ]);

    assert.equal(context.schema, "host-bridge.semantic-review-context.v1");
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.specLayerChanges, [
      "cli/zotero-bridge/src/commands.rs",
      "cli/zotero-bridge/src/surface.rs",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "host-bridge/surfaces.json",
      "schemas/host-bridge.agent-surface.v5.schema.json",
      "scripts/check-host-bridge-skill-packages.ts",
      "schemas/host-bridge.release-receipt.v2.schema.json",
      "scripts/host-bridge-agent-surface.ts",
      "scripts/host-bridge-release-plan.ts",
      "scripts/host-bridge-surface-model.ts",
      "scripts/render-host-bridge-surfaces.ts",
      "src/modules/hostBridgeCapabilityRegistry.ts",
      "src/modules/workflowExecution/sequenceRuntime.ts",
      "workflows_builtin/manifest.json",
    ]);
    assert.sameMembers(context.semanticSourceChanges, [
      "skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md",
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
      "skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md",
      "skills_src/zotero-library-agent/skills/zotero-library-curation/SKILL.md",
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

  it("classifies semantic-review operations as governed semantic source", function () {
    const context = classifyChangedFiles([
      ".agents/skills/host-bridge-semantic-surface-review/references/review-operations.md",
    ]);
    assert.isTrue(context.reviewRequired);
    assert.deepEqual(context.semanticSourceChanges, [
      ".agents/skills/host-bridge-semantic-surface-review/references/review-operations.md",
    ]);
  });

  it("classifies review-mirror governance and generated artifacts", function () {
    const context = classifyChangedFiles([
      ".agents/skills/host-bridge-review-mirror/SKILL.md",
      ".agents/skills/host-bridge-review-mirror/references/review-operations.md",
      "scripts/host-bridge-review-mirror.ts",
      "artifact/host-bridge-review/INDEX.md",
    ]);
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.semanticSourceChanges, [
      ".agents/skills/host-bridge-review-mirror/SKILL.md",
      ".agents/skills/host-bridge-review-mirror/references/review-operations.md",
    ]);
    assert.include(
      context.specLayerChanges,
      "scripts/host-bridge-review-mirror.ts",
    );
    assert.include(
      context.generatedTargetChanges,
      "artifact/host-bridge-review/INDEX.md",
    );
  });

  it("includes every Profile semantic owner and Host Bridge OpenSpec surface", function () {
    const context = classifyChangedFiles([
      "profiles_src/hermes/zotero-librarian/skills/zotero-librarian/references/automation-policy.md",
      "profiles_src/hermes/zotero-librarian/scripts/zotero_librarian_service.py",
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
    assert.include(skill, "three agent-facing surfaces");
    assert.include(skill, "Agent Control Contract");
    assert.include(
      skill,
      "npx tsx scripts/host-bridge-semantic-review-context.ts",
    );
    assert.include(skill, "references/review-operations.md");
    assert.notInclude(skill, "references/surface-map.md");
    assert.notInclude(skill, "references/review-playbook.md");
    assert.notInclude(skill, "references/nested-call-contract.md");
    assert.include(skill, "minimum-core result");
    assert.include(skill, "semantic parity result");
    assert.include(skill, "unmapped semantic count");
    assert.include(skill, "intra-package duplicate count");
    assert.include(skill, "unauthorized dropped semantic count");
    assert.include(skill, "instruction-depth warnings");
    assert.include(skill, "explicit deletion");
    assert.include(skill, "compression");
    assert.include(skill, "accepted or expanded");
    assert.include(skill, "blocker only when blocked");
    for (const heading of [
      "Goal",
      "Inputs",
      "Workflow",
      "Hard constraints",
      "Completion",
      "Failure handling",
      "References",
    ]) {
      assert.include(skill, `## ${heading}`);
    }
    assert.notInclude(skill, "semantic/SKILL.md");

    const operations = await fs.readFile(
      projectPath(
        ".agents",
        "skills",
        "host-bridge-semantic-surface-review",
        "references",
        "review-operations.md",
      ),
      "utf8",
    );
    assert.include(operations, "--baseline-ref");
    assert.include(operations, "normalized prose");
    assert.match(operations, /95(?:%| percent)/);
    assert.include(operations, "unauthorized dropped semantic count");
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
    const contentGateIndex = releaseSkill.indexOf(
      "npm run check:host-bridge-content",
    );

    assert.isAtLeast(reviewIndex, 0);
    assert.isAtLeast(renderIndex, 0);
    assert.isAtLeast(contentGateIndex, 0);
    assert.isBelow(reviewIndex, renderIndex);
    assert.isBelow(contentGateIndex, renderIndex);
    assert.include(releaseSkill, "npm run release:host-bridge:plan");
    assert.include(releaseSkill, "releaseSetId");
    assert.include(releaseSkill, "host-bridge.release-receipt.v2");
    assert.include(releaseSkill, "check:host-bridge-cli-prebuild-freshness");
    assert.include(releaseSkill, "host-bridge/surfaces.json");
    assert.include(releaseSkill, "check-host-bridge-skill-packages.ts");
    assert.include(releaseSkill, "$host-bridge-review-mirror");
    assert.include(releaseSkill, "npm run check:host-bridge-review-mirror");
    assert.include(releaseSkill, "npm run prebuild:zotero-bridge-cli");
    assert.include(releaseSkill, "--resume-run-id");
    assert.include(releaseSkill, "host-bridge-cli-prebuild-result.v1");
    assert.include(releaseSkill, "build-only");
    assert.include(releaseSkill, "synchronized `main`");
    assert.notInclude(releaseSkill, "profile-versioning.md");

    const operations = await fs.readFile(
      projectPath(
        ".agents",
        "skills",
        "host-bridge-release-pipeline",
        "references",
        "release-set-operations.md",
      ),
      "utf8",
    );
    assert.include(operations, "npm run build:local:zotero-bridge-cli");
    assert.include(operations, "--source-sha");
    assert.include(operations, "--resume-run-id");
    assert.include(operations, "host-bridge-cli-prebuild-result.v1");
    assert.include(operations, "prepares a release set");
    assert.include(operations, "Formal publication remains");
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

    assert.include(contract, "host-bridge.release-receipt.v2");
    assert.include(contract, "releaseSetId");
    assert.include(contract, "status: complete");
    assert.notInclude(contract, "build-zotero-bridge-cli.yml");
    assert.notInclude(contract, "D:\\Workspace\\Code\\JavaScript");
  });
});
