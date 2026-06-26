import { assert } from "chai";
import { spawn } from "child_process";
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

async function validateBootstrapperOutput(payload: Record<string, unknown>) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "zs-tb-validate-"));
  const outputPath = path.join(tempDir, "output.json");
  await fs.writeFile(outputPath, JSON.stringify(payload), "utf8");
  return new Promise<{
    exitCode: number | null;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    const child = spawn("uv", [
      "run",
      "--project",
      path.join(os.homedir(), ".ar"),
      "--locked",
      "--",
      "python",
      "skills_builtin/tag-bootstrapper/scripts/validate_output.py",
      "--output",
      outputPath,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ exitCode: 1, stdout, stderr: String(error.message || error) });
    });
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function validBootstrapperOutput(overrides: Record<string, unknown> = {}) {
  return {
    add_tags: [{ tag: "method:survey", note: "Survey study" }],
    warnings: [],
    error: {},
    provenance: {},
    ...overrides,
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

  it("loads builtin workflow as a no-selection auxiliary workflow", async function () {
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
    assert.equal(workflow?.manifest.inputs?.unit, "workflow");
    assert.equal(workflow?.manifest.display?.core, false);
    assert.isTrue(workflow?.manifest.execution?.zoteroHostAccess?.required);
    assert.equal(workflow?.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      workflow?.manifest.request?.create?.skill_id,
      "tag-bootstrapper",
    );
    assert.equal(workflow?.manifest.request?.create?.mode, "interactive");
  });

  it("validates tag-bootstrapper output against schema-aligned error and provenance rules", async function () {
    assert.equal(
      (await validateBootstrapperOutput(validBootstrapperOutput())).exitCode,
      0,
    );
    assert.equal(
      (
        await validateBootstrapperOutput(
          validBootstrapperOutput({
            error: { message: "user canceled" },
          }),
        )
      ).exitCode,
      0,
    );
    assert.equal(
      (
        await validateBootstrapperOutput(
          validBootstrapperOutput({
            provenance: { generated_at: "not-an-iso-timestamp" },
          }),
        )
      ).exitCode,
      0,
    );

    const nullError = await validateBootstrapperOutput(
      validBootstrapperOutput({ error: null }),
    );
    assert.notEqual(nullError.exitCode, 0);
    assert.include(nullError.stderr, "error must be an object");

    const nonStringGeneratedAt = await validateBootstrapperOutput(
      validBootstrapperOutput({ provenance: { generated_at: 123 } }),
    );
    assert.notEqual(nonStringGeneratedAt.exitCode, 0);
    assert.include(
      nonStringGeneratedAt.stderr,
      "provenance.generated_at must be a string when present",
    );

    const duplicateTag = await validateBootstrapperOutput(
      validBootstrapperOutput({
        add_tags: [
          { tag: "method:survey", note: "Survey study" },
          { tag: "METHOD:SURVEY", note: "Duplicate" },
        ],
      }),
    );
    assert.notEqual(duplicateTag.exitCode, 0);
    assert.include(duplicateTag.stderr, "duplicate add_tags tag");
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

  it("applies valid additions when skill output includes a non-null error diagnostic", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({
      entries: [
        {
          tag: "field:CS/AI",
          facet: "field",
        },
      ],
    });

    const applied = (await applyResult({
      parent: null,
      bundleReader: { readText: async () => "" },
      manifest: {} as never,
      runtime: runtime as never,
      runResult: {
        resultJson: {
          data: {
            add_tags: [
              {
                tag: "method:survey",
                facet: "method",
                note: "Survey method",
              },
            ],
            warnings: ["diagnostic warning"],
            status: "failed",
            error: { message: "model reported a recoverable issue" },
          },
        },
      },
    })) as Record<string, any>;

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      snapshot.entries.map((entry) => entry.tag),
      ["field:CS/AI", "method:survey"],
    );
    assert.deepEqual(applied.added, ["method:survey"]);
    assert.deepEqual(applied.warnings, ["diagnostic warning"]);
    assert.equal(applied.skill_diagnostics?.status, "failed");
    assert.equal(
      applied.skill_diagnostics?.error?.message,
      "model reported a recoverable issue",
    );
  });

  it("skips empty additions while preserving non-null error diagnostics", async function () {
    const { runtime, service } = await makeRuntime();
    await service.saveTagVocabulary({ entries: [] });

    const applied = (await applyResult({
      parent: null,
      bundleReader: { readText: async () => "" },
      manifest: {} as never,
      runtime: runtime as never,
      runResult: {
        resultJson: {
          data: {
            add_tags: [],
            warnings: [],
            error: { message: "no additions suggested" },
          },
        },
      },
    })) as Record<string, any>;

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(snapshot.entries, []);
    assert.equal(applied.applied, false);
    assert.equal(applied.skipped, true);
    assert.deepEqual(applied.added, []);
    assert.equal(
      applied.skill_diagnostics?.error?.message,
      "no additions suggested",
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
