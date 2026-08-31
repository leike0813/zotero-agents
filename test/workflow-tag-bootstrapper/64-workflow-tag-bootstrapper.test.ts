import { assert } from "chai";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { getBuiltinStatusPolicy } from "../../src/modules/synthesis/builtinTagPolicy";
import {
  createWorkflowHostApi,
  WORKFLOW_HOST_API_VERSION,
} from "../../src/workflows/hostApi";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { workflowsPath } from "../zotero/workflow-test-utils";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/applyResult.mjs";

async function makeRuntime() {
  const facets = [
    "field",
    "topic",
    "method",
    "model",
    "ai_task",
    "data",
    "tool",
    "status",
  ];
  const builtinEntries = Object.values(getBuiltinStatusPolicy()).map((tag) => ({
    tag,
    facet: "status",
    source: "builtin",
  }));
  let entries: Array<Record<string, any>> = builtinEntries;
  let staged: Array<Record<string, any>> = [];
  const service = {
    async loadTagVocabulary() {
      return {
        entries: entries.map((entry) => ({ ...entry })),
        aliases: {},
        abbrev: {},
        protocol: {
          facets,
          tag_pattern: "^[a-z_]+:[a-zA-Z0-9/_.-]+$",
          max_tag_length: 120,
        },
      };
    },
    async saveTagVocabulary(input: { entries?: Array<Record<string, any>> }) {
      const next = Array.isArray(input.entries) ? input.entries : [];
      const invalid = next.find((entry) => {
        const tag = String(entry?.tag || "").trim();
        const facet = String(entry?.facet || tag.split(":")[0] || "").trim();
        return (
          !facets.includes(facet) ||
          !/^[a-z_]+:[a-zA-Z0-9/_.-]+$/.test(tag) ||
          tag.length > 120
        );
      });
      if (invalid) {
        throw new Error("tag vocabulary validation failed");
      }
      const builtinByTag = new Map(
        builtinEntries.map((entry) => [entry.tag.toLowerCase(), entry]),
      );
      const byTag = new Map<string, Record<string, any>>(
        builtinEntries.map((entry) => [entry.tag.toLowerCase(), entry]),
      );
      for (const entry of next) {
        const key = String(entry.tag).toLowerCase();
        if (!byTag.has(key) && !builtinByTag.has(key)) {
          byTag.set(key, { ...entry });
        }
      }
      entries = Array.from(byTag.values()).sort((left, right) =>
        String(left.tag).localeCompare(String(right.tag), "en", {
          sensitivity: "base",
        }),
      );
    },
    async listStagedTagSuggestions() {
      return staged.map((entry) => ({
        ...entry,
        parent_bindings: Array.isArray(entry.parent_bindings)
          ? entry.parent_bindings.map((binding: Record<string, any>) => ({
              ...binding,
            }))
          : undefined,
      }));
    },
    async stageTagSuggestions(input: { entries?: Array<Record<string, any>> }) {
      const byTag = new Map(
        staged.map((entry) => [String(entry.tag).toLowerCase(), entry]),
      );
      for (const entry of input.entries || []) {
        byTag.set(String(entry.tag).toLowerCase(), { ...entry });
      }
      staged = Array.from(byTag.values());
    },
  };
  const base = createWorkflowHostApi();
  return {
    service,
    runtime: {
      hostApiVersion: WORKFLOW_HOST_API_VERSION,
      hostApi: {
        ...base,
        synthesis: {
          ...base.synthesis,
          tags: {
            ...base.synthesis.tags,
            loadVocabulary: service.loadTagVocabulary,
            saveVocabulary: service.saveTagVocabulary,
            listStagedSuggestions: service.listStagedTagSuggestions,
            stageSuggestions: service.stageTagSuggestions,
          },
        },
        statusTags: {
          ...base.statusTags,
          getPolicy: getBuiltinStatusPolicy,
        },
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

function customVocabularyEntries<T extends { source?: string }>(entries: T[]) {
  return entries.filter((entry) => entry.source !== "builtin");
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
    assert.include(skill, "synthesis index library get");
    assert.include(skill, "data.data.pagination.<section>");
    assert.include(skill, "hasMore");
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
    assert.include(
      runner.entrypoint.prompts.common,
      "synthesis index library get",
    );
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
    assert.equal(workflow?.manifest.inputs.member.kind, "selection");
    assert.equal(workflow?.manifest.inputs.grouping.mode, "all");
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
    assert.deepInclude(
      request.input.existing_tags.find(
        (entry: any) => entry.tag === "field:CS/AI",
      ),
      { tag: "field:CS/AI", facet: "field", note: "AI" },
    );
    assert.includeMembers(
      request.input.existing_tags.map((entry: any) => entry.tag),
      Object.values(getBuiltinStatusPolicy()),
    );
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
      customVocabularyEntries(snapshot.entries).map((entry) => entry.tag),
      ["field:CS/AI", "method:survey", "model:DL/Transformer"],
    );
    assert.deepEqual(result.added, ["method:survey", "model:DL/Transformer"]);
    assert.deepEqual(result.skipped_existing, ["field:cs/ai"]);
  });

  it("does not add bootstrapper tags that duplicate staged suggestions", async function () {
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
    await service.stageTagSuggestions({
      entries: [
        {
          tag: "ai_task:detection",
          facet: "ai_task",
          note: "staged detection task",
          source_flow: "tag-regulator-suggest",
          parent_bindings: [{ libraryId: 1, itemKey: "ITEM0042" }],
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
              {
                tag: "ai_task:detection",
                facet: "ai_task",
                note: "duplicate staged task",
              },
              { tag: "method:survey", note: "Survey study" },
            ],
            warnings: [],
            error: null,
          },
        },
      },
    })) as Record<string, any>;

    const snapshot = await service.loadTagVocabulary();
    assert.deepEqual(
      customVocabularyEntries(snapshot.entries).map((entry) => entry.tag),
      ["field:CS/AI", "method:survey"],
    );
    const staged = await service.listStagedTagSuggestions();
    assert.deepEqual(
      staged.map((entry) => entry.tag),
      ["ai_task:detection"],
    );
    assert.deepEqual(staged[0]?.parent_bindings, [
      { libraryId: 1, itemKey: "ITEM0042" },
    ]);
    assert.deepEqual(result.added, ["method:survey"]);
    assert.deepEqual(result.skipped_existing, ["field:cs/ai"]);
    assert.deepEqual(result.skipped_staged, ["ai_task:detection"]);
    assert.equal(result.applied, true);
    assert.equal(result.skipped, false);
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
      customVocabularyEntries(snapshot.entries).map((entry) => entry.tag),
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

  it("filters plugin builtin statuses without modifying or counting them", async function () {
    const { runtime, service } = await makeRuntime();
    const before = await service.loadTagVocabulary();
    const builtinTag = "status:need-analysis";
    const original = before.entries.find((entry) => entry.tag === builtinTag);

    const applied = (await applyResult({
      runtime: runtime as never,
      runResult: {
        resultJson: {
          data: {
            add_tags: [
              { tag: builtinTag, facet: "topic", note: "overwrite" },
              { tag: "topic:custom-workflow", note: "Custom workflow" },
            ],
            warnings: [],
            error: null,
          },
        },
      },
    })) as Record<string, any>;

    const after = await service.loadTagVocabulary();
    assert.deepEqual(
      after.entries.find((entry) => entry.tag === builtinTag),
      original,
    );
    assert.deepEqual(applied.added, ["topic:custom-workflow"]);
    assert.deepEqual(applied.skipped_builtin, [builtinTag]);
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
    assert.deepEqual(customVocabularyEntries(snapshot.entries), []);
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
    assert.deepEqual(customVocabularyEntries(snapshot.entries), []);
  });
});
