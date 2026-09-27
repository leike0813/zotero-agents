import { assert } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import { classifyChangedFiles } from "../../scripts/host-bridge/host-bridge-semantic-review-context";

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

describe("Host Bridge semantic surface review skill", function () {
  it("classifies Host Bridge spec-layer changes as requiring semantic review", function () {
    const context = classifyChangedFiles([
      "src/modules/hostBridgeCapabilityRegistry.ts",
      "src/modules/workflowExecution/sequenceRuntime.ts",
      "rust/zotero-bridge/src/commands.rs",
      "rust/zotero-bridge/src/surface.rs",
      "scripts/host-bridge/host-bridge-agent-surface.ts",
      "contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json",
      "contracts/host-bridge/surfaces.json",
      "scripts/host-bridge/host-bridge-surface-model.ts",
      "scripts/host-bridge/render-host-bridge-surfaces.ts",
      "scripts/host-bridge/check-host-bridge-skill-packages.ts",
      "scripts/host-bridge/host-bridge-release-plan.ts",
      "contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json",
      "workflows_builtin/manifest.json",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "skills_src/zotero-library-agent/skills/zotero-library-query/SKILL.md",
    ]);

    assert.equal(context.schema, "host-bridge.semantic-review-context.v1");
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.specLayerChanges, [
      "rust/zotero-bridge/src/commands.rs",
      "rust/zotero-bridge/src/surface.rs",
      "openspec/specs/host-bridge-cli-interface/spec.md",
      "contracts/host-bridge/surfaces.json",
      "contracts/host-bridge/schemas/host-bridge.agent-surface.v6.schema.json",
      "scripts/host-bridge/check-host-bridge-skill-packages.ts",
      "contracts/host-bridge/schemas/host-bridge.release-receipt.v2.schema.json",
      "scripts/host-bridge/host-bridge-agent-surface.ts",
      "scripts/host-bridge/host-bridge-release-plan.ts",
      "scripts/host-bridge/host-bridge-surface-model.ts",
      "scripts/host-bridge/render-host-bridge-surfaces.ts",
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
      "addon/content/host-bridge-skills/zotero-bridge-cli/SKILL.md",
      "profiles/hermes/zotero-librarian/SOUL.md",
      "docs/host-bridge-cli.md",
      "addon/content/host-bridge-skills/zotero-bridge-cli/assets/agent-surface.json",
      "releases/host-bridge/release-set.json",
    ]);

    assert.isFalse(context.reviewRequired);
    assert.isEmpty(context.specLayerChanges);
    assert.isEmpty(context.semanticSourceChanges);
    assert.sameMembers(context.generatedTargetChanges, [
      "docs/host-bridge-cli.md",
      "addon/content/host-bridge-skills/zotero-bridge-cli/assets/agent-surface.json",
      "releases/host-bridge/release-set.json",
      "profiles/hermes/zotero-librarian/SOUL.md",
      "addon/content/host-bridge-skills/zotero-bridge-cli/SKILL.md",
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
      "scripts/host-bridge/host-bridge-review-mirror.ts",
      "artifacts/host-bridge-review/INDEX.md",
    ]);
    assert.isTrue(context.reviewRequired);
    assert.sameMembers(context.semanticSourceChanges, [
      ".agents/skills/host-bridge-review-mirror/SKILL.md",
      ".agents/skills/host-bridge-review-mirror/references/review-operations.md",
    ]);
    assert.include(
      context.specLayerChanges,
      "scripts/host-bridge/host-bridge-review-mirror.ts",
    );
    assert.include(
      context.generatedTargetChanges,
      "artifacts/host-bridge-review/INDEX.md",
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
});
