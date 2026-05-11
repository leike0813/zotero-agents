import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import {
  decideSynthesisApply,
  validateSynthesisResultBundle,
} from "../../src/modules/synthesis/workflow";

function validBundle() {
  return {
    kind: "topic_synthesis",
    mode: "create",
    base_hashes: {
      artifact: "sha256:a",
      metadata: "sha256:b",
      index: "sha256:c",
    },
    topic_definition: {
      id: "topic:test",
      title: "Test Topic",
      description: "A topic",
    },
    topic_resolver: {
      mode: "tag_query",
      query: "topic:test",
    },
    resolved_paper_set: {
      papers: ["1:ABCD1234"],
    },
    resolver_diagnostics: {
      final_count: 1,
    },
    artifact_metadata: {
      depends_on: {
        papers: ["1:ABCD1234"],
        artifacts: [],
      },
    },
    markdown: "# Test Topic\n\nBody",
    timeline: "2024: topic begins",
  };
}

function validSkillOutputBundle() {
  const { markdown: _markdown, ...bundle } = validBundle();
  return {
    ...bundle,
    markdown_path: "result/synthesis.md",
  };
}

describe("Synthesize topic workflow contract", function () {
  it("declares the builtin synthesize-topic ACP skill as its backend", async function () {
    const workflowManifest = JSON.parse(
      await fs.readFile(
        "workflows_builtin/synthesis-layer/synthesize-topic/workflow.json",
        "utf8",
      ),
    );

    assert.equal(workflowManifest.request?.create?.skill_id, "synthesize-topic");
  });

  it("loads synthesize-topic from the builtin synthesis-layer workflow package", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "synthesize-topic",
    );

    assert.isOk(
      workflow,
      `synthesize-topic should load; diagnostics=${JSON.stringify(loaded.diagnostics)}`,
    );
    assert.equal(workflow?.packageId, "synthesis-layer");
    assert.equal(workflow?.manifest.request?.create?.skill_id, "synthesize-topic");
  });

  it("registers a builtin synthesize-topic skill with an output schema", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["synthesize-topic"];

    assert.isOk(entry);
    assert.equal(entry.sourceKind, "builtin");

    const validation = await validateAcpSkillFinalPayload({
      payload: validSkillOutputBundle(),
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isTrue(validation.ok, validation.errors.join("; "));
  });

  it("validates ACP skill output without relying on global console", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["synthesize-topic"];
    const originalConsole = (globalThis as { console?: Console }).console;

    try {
      delete (globalThis as { console?: Console }).console;
      const validation = await validateAcpSkillFinalPayload({
        payload: validSkillOutputBundle(),
        runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
        primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
      });

      assert.isTrue(validation.ok, validation.errors.join("; "));
    } finally {
      (globalThis as { console?: Console }).console = originalConsole;
    }
  });

  it("ships and documents the canonical topic resolver schema", async function () {
    const skillText = await fs.readFile("skills_builtin/synthesize-topic/SKILL.md", "utf8");
    const resolverSchema = JSON.parse(
      await fs.readFile(
        "skills_builtin/synthesize-topic/assets/resolver.schema.json",
        "utf8",
      ),
    );

    assert.include(skillText, "assets/resolver.schema.json");
    assert.include(skillText, "markdown_path");
    assert.include(skillText, "result/synthesis.md");
    assert.notInclude(skillText, "synthesis.validate_resolver");
    assert.notInclude(skillText, "synthesis.query_citation_graph");
    assert.notInclude(skillText, "`markdown` must contain");
    assert.deepEqual(resolverSchema.required, ["mode"]);
    assert.equal(resolverSchema.oneOf.length, 4);

    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const manifest = await buildAcpSkillResourceManifest(
      registry.entriesById["synthesize-topic"],
    );
    assert.include(
      manifest.files.map((file) => file.relativePath),
      "assets/resolver.schema.json",
    );
  });

  it("rejects ACP skill output that embeds markdown in final JSON", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["synthesize-topic"];
    const validation = await validateAcpSkillFinalPayload({
      payload: {
        ...validSkillOutputBundle(),
        markdown: "# Should not be embedded",
      },
      runnerJson: JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8")),
      primarySkillDir: path.dirname(path.dirname(entry.runnerJsonPath)),
    });

    assert.isFalse(validation.ok);
    assert.match(validation.errors.join("\n"), /must NOT be valid|markdown/i);
  });

  it("accepts valid topic synthesis result bundles", function () {
    const result = validateSynthesisResultBundle(validBundle());

    assert.isTrue(result.ok);
    assert.equal(result.bundle.kind, "topic_synthesis");
  });

  it("rejects unsupported synthesis kinds", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...validBundle(),
          kind: "method_synthesis",
        }),
      /topic_synthesis/i,
    );
  });

  it("rejects direct write instructions from agents", function () {
    assert.throws(
      () =>
        validateSynthesisResultBundle({
          ...validBundle(),
          write_zotero_raw_source: true,
        }),
      /direct write/i,
    );
  });

  it("allows apply when base hashes match", function () {
    const decision = decideSynthesisApply({
      bundle: validBundle(),
      currentHashes: {
        artifact: "sha256:a",
        metadata: "sha256:b",
        index: "sha256:c",
      },
    });

    assert.equal(decision.action, "persist");
  });

  it("allows create when only the aggregate index hash changed", function () {
    const decision = decideSynthesisApply({
      bundle: {
        ...validBundle(),
        mode: "create",
        base_hashes: {
          artifact: "",
          metadata: "",
          index: "",
        },
      },
      currentHashes: {
        artifact: "",
        metadata: "",
        index: "sha256:existing-topic-index",
      },
    });

    assert.equal(decision.action, "persist");
  });

  it("returns conflict when base hashes mismatch", function () {
    const decision = decideSynthesisApply({
      bundle: validBundle(),
      currentHashes: {
        artifact: "sha256:changed",
        metadata: "sha256:b",
        index: "sha256:c",
      },
    });

    assert.equal(decision.action, "conflict");
    assert.deepEqual(decision.mismatches, [
      {
        name: "artifact",
        base: "sha256:a",
        current: "sha256:changed",
      },
    ]);
  });
});
