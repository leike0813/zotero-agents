import { assert } from "chai";
import fs from "fs/promises";
import path from "path";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { buildWorkflowSettingsUiDescriptor } from "../../src/modules/workflowSettings";
import { resolveWorkflowParameterOptionsSource } from "../../src/modules/workflowParameterOptions";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";

const REQUIRED_TOOLS = [
  "list_library_items",
  "search_items",
  "synthesis.list_topics",
  "synthesis.get_library_index",
  "ingest_papers",
];

function completedPayload() {
  return {
    __SKILL_DONE__: true,
    kind: "literature_search_ingest",
    query: "foundation models for visual inspection",
    search_mode: "topic_expansion",
    confirmed_papers: [
      {
        title: "A Survey of Visual Inspection Foundation Models",
        doi: "10.5555/example",
      },
    ],
    summary: {
      requested: 1,
      created: 1,
      existing: 0,
      failed: 0,
      pdf_attached: 0,
      pdf_skipped: 1,
      pdf_failed: 0,
    },
    results: [
      {
        index: 1,
        title: "A Survey of Visual Inspection Foundation Models",
        status: "created",
        attachmentStatus: "skipped",
      },
    ],
  };
}

function canceledPayload() {
  return {
    __SKILL_DONE__: true,
    kind: "literature_search_ingest_canceled",
    status: "canceled",
    reason: "user_cancelled",
    message: "User cancelled before ingest.",
  };
}

async function createCollection(name: string, parentId?: number) {
  const collection = new Zotero.Collection();
  collection.name = name;
  (collection as any).libraryID = Zotero.Libraries.userLibraryID;
  if (parentId) {
    (collection as any).parentID = parentId;
  }
  await collection.saveTx();
  return collection;
}

describe("Literature Search Ingest workflow contract", function () {
  it("ships an ACP-only interactive literature search ingest workflow", async function () {
    const workflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json",
        "utf8",
      ),
    );

    assert.equal(workflow.id, "literature-search-ingest");
    assert.equal(workflow.provider, "acp");
    assert.equal(workflow.request?.create?.skill_id, "literature-search-ingest");
    assert.equal(workflow.taskNameTemplate, "Search and ingest literature: {query}");
    assert.equal(workflow.execution?.skillrunner_mode, "interactive");
    assert.notProperty(workflow.execution || {}, "supportedBackends");
    assert.sameMembers(workflow.execution?.mcp?.requiredTools || [], REQUIRED_TOOLS);
    assert.equal(workflow.parameters?.query?.type, "string");
    assert.isUndefined(workflow.parameters?.language);
    assert.equal(workflow.parameters?.targetCollection?.type, "string");
    assert.isTrue(workflow.parameters?.targetCollection?.allowCustom);
    assert.equal(
      workflow.parameters?.targetCollection?.optionsSource?.kind,
      "zotero.collections",
    );
  });

  it("resolves targetCollection options from Zotero collections without exposing keys as labels", async function () {
    const parent = await createCollection("Vision");
    const child = await createCollection("Object Detection", parent.id);
    const resolved = await resolveWorkflowParameterOptionsSource({
      kind: "zotero.collections",
      includeEmpty: true,
      valueFormat: "collectionRef",
      labelFormat: "path",
    });

    const option = resolved.options.find((entry) =>
      entry.value === `${Zotero.Libraries.userLibraryID}:${child.key}`,
    );
    assert.isOk(option);
    assert.equal(option?.label, "Vision / Object Detection");
    assert.notEqual(option?.label, child.key);
    assert.equal(option?.meta?.collectionKey, child.key);
  });

  it("keeps unsupported dynamic option sources recoverable", async function () {
    const resolved = await resolveWorkflowParameterOptionsSource({
      kind: "zotero.unknown",
    });

    assert.deepEqual(resolved.options, []);
    assert.equal(resolved.diagnostics[0]?.code, "unsupported_options_source");
  });

  it("injects dynamic collection options into workflow settings descriptors", async function () {
    const collection = await createCollection("Descriptor Collection");
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: workflow!,
      candidateBackends: [
        {
          id: "acp-test",
          type: "acp",
          displayName: "ACP Test",
          baseUrl: "http://127.0.0.1",
        } as any,
      ],
    });
    const targetCollection = descriptor.workflowSchemaEntries.find(
      (entry) => entry.key === "targetCollection",
    );
    const option = targetCollection?.options?.find((entry) =>
      entry.value === `${Zotero.Libraries.userLibraryID}:${collection.key}`,
    );

    assert.isOk(option);
    assert.equal(option?.label, "Descriptor Collection");
    assert.isTrue(targetCollection?.allowCustom);
  });

  it("loads from the builtin literature workbench package and builds one ACP request", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: { items: { attachments: [] } },
      executionOptions: {
        workflowParams: {
          query: "retrieval augmented generation evaluation",
          targetCollection: "RAG",
        },
      },
    })) as Array<{
      taskName?: string;
      parameter?: Record<string, unknown>;
      runtime_options?: Record<string, unknown>;
    }>;

    assert.lengthOf(requests, 1);
    assert.equal(
      requests[0].taskName,
      "Search and ingest literature: retrieval augmented generation evaluation",
    );
    assert.equal(
      requests[0].parameter?.query,
      "retrieval augmented generation evaluation",
    );
    assert.deepEqual((requests[0] as any).runtime_options?.workflow_mcp, {
      required_tools: REQUIRED_TOOLS,
    });
  });

  it("registers the workflow package files and skill resource manifest", async function () {
    const packageJson = JSON.parse(
      await fs.readFile(
        "workflows_builtin/literature-workbench-package/workflow-package.json",
        "utf8",
      ),
    );
    const manifest = JSON.parse(await fs.readFile("workflows_builtin/manifest.json", "utf8"));
    assert.include(
      packageJson.workflows,
      "literature-search-ingest/workflow.json",
    );
    assert.include(
      manifest.files,
      "literature-workbench-package/literature-search-ingest/workflow.json",
    );
    assert.include(
      manifest.files,
      "literature-workbench-package/literature-search-ingest/hooks/applyResult.mjs",
    );

    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["literature-search-ingest"];
    assert.isOk(entry);
    const skillManifest = await buildAcpSkillResourceManifest(entry);
    const files = skillManifest.files.map((file) => file.relativePath);
    assert.include(files, "SKILL.md");
    assert.include(files, "assets/runner.json");
    assert.include(files, "assets/output.schema.json");
  });

  it("validates completed and canceled skill output payloads", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["literature-search-ingest"];
    const runnerJson = JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8"));
    const primarySkillDir = path.dirname(path.dirname(entry.runnerJsonPath));

    const completed = await validateAcpSkillFinalPayload({
      payload: completedPayload(),
      runnerJson,
      primarySkillDir,
    });
    const canceled = await validateAcpSkillFinalPayload({
      payload: canceledPayload(),
      runnerJson,
      primarySkillDir,
    });

    assert.isTrue(completed.ok, completed.errors.join("; "));
    assert.isTrue(canceled.ok, canceled.errors.join("; "));
  });

  it("documents two confirmation gates, MCP context, and no browser automation", async function () {
    const skill = await fs.readFile(
      "skills_builtin/literature-search-ingest/SKILL.md",
      "utf8",
    );
    const runner = JSON.parse(
      await fs.readFile(
        "skills_builtin/literature-search-ingest/assets/runner.json",
        "utf8",
      ),
    );
    const prompt = runner.entrypoint?.prompts?.common || "";

    for (const text of [skill, prompt]) {
      assert.include(text, "synthesis.list_topics");
      assert.include(text, "synthesis.get_library_index");
      assert.include(text, "ingest_papers");
      assert.include(text, "best-effort");
      assert.include(text, "Connector");
      assert.include(text, "CDP");
    }
    assert.include(skill, "等待用户明确确认后再进入搜索");
    assert.include(skill, "等待用户确认");
    assert.include(skill, "最终只输出 result/result.json");
    assert.sameMembers(runner.mcp?.required_tools || [], REQUIRED_TOOLS);
  });
});
