import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { createSynthesisTagVocabularyService } from "../../src/modules/synthesis/tagVocabulary";
import { WORKFLOW_HOST_API_VERSION } from "../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { workflowsPath } from "../zotero/workflow-test-utils";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs";

async function makeRuntimeRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), "zs-tag-bootstrapper-"));
}

async function makeRuntime() {
  const service = createSynthesisTagVocabularyService({
    root: await makeRuntimeRoot(),
  });
  return {
    service,
    runtime: {
      hostApiVersion: WORKFLOW_HOST_API_VERSION,
      hostApi: {
        synthesis: service,
      },
    },
  };
}

describe("workflow: tag-bootstrapper", function () {
  it("documents tag standard routing and deterministic output scripts", async function () {
    const skill = await fs.readFile(
      "skills_builtin/tag-bootstrapper/SKILL.md",
      "utf8",
    );
    const schema = JSON.parse(
      await fs.readFile(
        "skills_builtin/tag-bootstrapper/assets/output.schema.json",
        "utf8",
      ),
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/tag-bootstrapper/assets/runner.json",
        "utf8",
      ),
    );

    assert.include(skill, "references/tag_standard.md");
    assert.include(skill, "zotero-bridge-cli");
    assert.include(skill, "library-index get");
    assert.include(skill, "has_more");
    assert.include(skill, "Zotero DB/storage");
    assert.include(skill, "scripts/normalize_output.py");
    assert.include(skill, "scripts/validate_output.py");
    assert.deepEqual(schema.properties.add_tags.items.required, [
      "tag",
      "note",
    ]);
    assert.notProperty(schema.properties.error, "required");
    assert.notProperty(schema.properties.provenance, "required");
    assert.property(schema.properties.provenance.properties, "library_index");
    assert.equal(schema.additionalProperties, true);
    assert.include(
      runner.entrypoint.prompts.common,
      "references/tag_standard.md",
    );
    assert.include(runner.entrypoint.prompts.common, "zotero-bridge-cli");
    assert.include(runner.entrypoint.prompts.common, "library-index get");
    assert.include(
      runner.entrypoint.prompts.common,
      "scripts/normalize_output.py",
    );
  });

  it("loads builtin workflow as a no-selection core workflow", async function () {
    const loaded = await loadWorkflowManifests(workflowsPath());
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "tag-bootstrapper",
    );

    assert.isOk(
      workflow,
      `tag-bootstrapper not loaded; loaded=${loaded.workflows
        .map((entry) => entry.manifest.id)
        .join(
          ",",
        )} warnings=${JSON.stringify(loaded.warnings)} errors=${JSON.stringify(loaded.errors)}`,
    );
    assert.equal(workflow?.manifest.trigger?.requiresSelection, false);
    assert.isTrue(workflow?.manifest.display?.core);
    assert.isTrue(workflow?.manifest.execution?.zoteroHostAccess?.required);
    assert.equal(
      workflow?.manifest.request?.create?.skill_id,
      "tag-bootstrapper",
    );
    assert.equal(workflow?.manifest.request?.create?.mode, "interactive");
  });

  it("builds an interactive request from current vocabulary state", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "field:CS/AI",
          facet: "field",
          note: "AI",
        },
      ],
    });

    const request = (await buildRequest({
      selectionContext: {},
      manifest: {} as never,
      runtime: runtime as never,
      executionOptions: {
        workflowParams: {
          tag_note_language: "en-US",
        },
      },
    })) as Record<string, any>;

    assert.equal(request.skill_id, "tag-bootstrapper");
    assert.equal(request.mode, "interactive");
    assert.equal(request.fetch_type, "result");
    assert.notProperty(request.input, "library_index");
    assert.notProperty(request.input, "papers");
    assert.deepEqual(request.input.existing_tags, [
      {
        tag: "field:CS/AI",
        facet: "field",
        note: "AI",
      },
    ]);
    assert.include(request.input.protocol.facets, "field");
    assert.equal(request.parameter.tag_note_language, "en-US");
  });

  it("writes returned additions directly to controlled vocabulary with stable dedupe", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "field:CS/AI",
          facet: "field",
          note: "AI",
        },
      ],
    });

    const result = (await applyResult({
      parent: null,
      bundleReader: { readText: async () => "" },
      manifest: {} as never,
      runtime: runtime as never,
      runResult: {
        resultJson: {
          data: {
            add_tags: [
              { tag: "field:cs/ai", facet: "field", note: "duplicate" },
              { tag: "method:survey", note: "Survey study" },
              { tag: "method:survey", note: "Duplicate in result" },
              {
                tag: "model:DL/Transformer",
                facet: "model",
                note: "Transformer model",
              },
            ],
            warnings: ["review generated vocabulary"],
            error: null,
          },
        },
      },
    })) as Record<string, any>;

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.tag),
      ["field:CS/AI", "method:survey", "model:DL/Transformer"],
    );
    assert.deepEqual(result.added, ["method:survey", "model:DL/Transformer"]);
    assert.deepEqual(result.skipped_existing, ["field:cs/ai"]);
  });

  it("does not write vocabulary when skill output reports an error", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "field:CS/AI",
          facet: "field",
        },
      ],
    });

    try {
      await applyResult({
        parent: null,
        bundleReader: { readText: async () => "" },
        manifest: {} as never,
        runtime: runtime as never,
        runResult: {
          resultJson: {
            data: {
              add_tags: [{ tag: "method:survey", facet: "method" }],
              warnings: [],
              error: { message: "user canceled" },
            },
          },
        },
      });
      assert.fail("expected skill error to reject");
    } catch (error) {
      assert.match(String((error as Error).message), /user canceled/);
    }

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.tag),
      ["field:CS/AI"],
    );
  });

  it("lets vocabulary validation reject invalid additions without partial writes", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({ entries: [] });

    try {
      await applyResult({
        parent: null,
        bundleReader: { readText: async () => "" },
        manifest: {} as never,
        runtime: runtime as never,
        runResult: {
          resultJson: {
            data: {
              add_tags: [{ tag: "unknown:value", facet: "unknown" }],
              warnings: [],
              error: null,
            },
          },
        },
      });
      assert.fail("expected validation failure");
    } catch (error) {
      assert.match(String((error as Error).message), /validation failed/);
    }

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(snapshot.entries, []);
  });
});
