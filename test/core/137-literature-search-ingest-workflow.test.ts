import { assert } from "chai";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildAcpSkillResourceManifest } from "../../src/modules/acpSkillResourceManifest";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { buildWorkflowSettingsUiDescriptor } from "../../src/modules/workflowSettings";
import { resolveWorkflowParameterOptionsSource } from "../../src/modules/workflowParameterOptions";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";

function completedPayload() {
  return {
    __SKILL_DONE__: true,
    kind: "literature_search_ingest",
    query: "foundation models for visual inspection",
    search_mode: "topic_expansion",
    confirmed_references: [
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
    missing_pdf_references: [
      {
        index: 1,
        title: "A Survey of Visual Inspection Foundation Models",
        status: "created",
        attachmentStatus: "skipped",
        doi: "10.5555/example",
        landingUrl: "https://doi.org/10.5555/example",
        manualSearchLinks: [
          "https://doi.org/10.5555/example",
          "https://scholar.google.com/scholar?q=%22A%20Survey%20of%20Visual%20Inspection%20Foundation%20Models%22",
        ],
        reason: "no_public_pdf_url",
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
  it("ships a SkillRunner interactive literature search ingest workflow", async function () {
    const workflow = JSON.parse(
      await fs.readFile(
        "workflows_builtin/literature-workbench-package/literature-search-ingest/workflow.json",
        "utf8",
      ),
    );

    assert.equal(workflow.id, "literature-search-ingest");
    assert.equal(workflow.provider, "skillrunner");
    assert.equal(
      workflow.request?.create?.skill_id,
      "literature-search-ingest",
    );
    assert.equal(
      workflow.taskNameTemplate,
      "Search and ingest literature: {query}",
    );
    assert.equal(workflow.execution?.skillrunner_mode, "interactive");
    assert.notProperty(workflow.execution || {}, "supportedBackends");
    assert.isTrue(workflow.execution?.zoteroHostAccess?.required);
    assert.isTrue(
      workflow.execution?.zoteroHostAccess?.allowWriteApprovalBypass,
    );
    assert.notProperty(workflow.execution || {}, "mcp");
    assert.equal(workflow.parameters?.query?.type, "string");
    assert.equal(workflow.parameters?.searchMode?.type, "string");
    assert.deepEqual(workflow.parameters?.searchMode?.enum, [
      "auto",
      "topic_expansion",
      "paper_seed_expansion",
      "targeted_ingest",
    ]);
    assert.equal(workflow.parameters?.searchMode?.default, "auto");
    assert.isUndefined(workflow.parameters?.language);
    assert.equal(workflow.parameters?.targetCollection?.type, "string");
    assert.isFalse(workflow.parameters?.targetCollection?.allowCustom);
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

    const option = resolved.options.find(
      (entry) =>
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

  it("resolves synthesis topic options through the bounded service facade", async function () {
    let requestedFilter = "";
    const resolved = await resolveWorkflowParameterOptionsSource(
      {
        kind: "synthesis.topics",
        filter: "updatable",
      },
      {
        synthesisService: {
          async listWorkflowTopicOptions(args) {
            requestedFilter = String(args?.filter || "");
            return {
              options: [
                {
                  value: "topic-alpha",
                  label: "Alpha",
                  description: "Update · freshness stale · topic-alpha",
                  meta: {
                    kind: "synthesis.topic",
                    topicId: "topic-alpha",
                  },
                },
              ],
              diagnostics: [],
            };
          },
        },
      },
    );

    assert.equal(requestedFilter, "updatable");
    assert.deepEqual(
      resolved.options.map((entry) => entry.value),
      ["topic-alpha"],
    );
    assert.deepEqual(resolved.diagnostics, []);
  });

  it("blocks strict dynamic workflow parameters when no selectable options are available", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: {
        ...workflow!,
        manifest: {
          ...workflow!.manifest,
          parameters: {
            topicId: {
              type: "string",
              title: "Topic ID",
              allowCustom: false,
              optionsSource: {
                kind: "zotero.unknown",
              },
            },
          },
        },
      } as any,
      candidateBackends: [
        {
          id: "acp-test",
          type: "acp",
          displayName: "ACP Test",
          baseUrl: "http://127.0.0.1",
        } as any,
      ],
    });

    assert.include(
      descriptor.blockedReason || "",
      "Unsupported workflow parameter options source",
    );
    assert.isTrue(descriptor.workflowSchemaEntries[0]?.disabled);
  });

  it("can build lightweight descriptors without resolving dynamic options", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: {
        ...workflow!,
        manifest: {
          ...workflow!.manifest,
          parameters: {
            topicId: {
              type: "string",
              title: "Topic ID",
              allowCustom: false,
              optionsSource: {
                kind: "zotero.unknown",
              },
            },
          },
        },
      } as any,
      candidateBackends: [
        {
          id: "acp-test",
          type: "acp",
          displayName: "ACP Test",
          baseUrl: "http://127.0.0.1",
        } as any,
      ],
      resolveDynamicOptions: false,
    });

    assert.isUndefined(descriptor.blockedReason);
    assert.isFalse(descriptor.workflowSchemaEntries[0]?.disabled === true);
    assert.isUndefined(descriptor.workflowSchemaEntries[0]?.options);
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
    const autoApprove = descriptor.runSchemaEntries.find(
      (entry) => entry.key === "autoApproveZoteroWrites",
    );
    const option = targetCollection?.options?.find(
      (entry) =>
        entry.value === `${Zotero.Libraries.userLibraryID}:${collection.key}`,
    );

    assert.isOk(option);
    assert.equal(option?.label, "Descriptor Collection");
    assert.isFalse(targetCollection?.allowCustom);
    assert.equal(autoApprove?.type, "boolean");
    assert.isFalse(autoApprove?.defaultValue as boolean);
    assert.isUndefined(
      descriptor.workflowSchemaEntries.find(
        (entry) => entry.key === "autoApproveZoteroWrites",
      ),
    );
  });

  it("does not expose write auto-approval for workflows that do not opt in", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "literature-search-ingest",
    );
    assert.isOk(workflow);

    const descriptor = await buildWorkflowSettingsUiDescriptor({
      workflow: {
        ...workflow!,
        manifest: {
          ...workflow!.manifest,
          execution: {
            ...workflow!.manifest.execution,
            zoteroHostAccess: {
              required: true,
            },
          },
        },
      } as any,
      candidateBackends: [
        {
          id: "acp-test",
          type: "acp",
          displayName: "ACP Test",
          baseUrl: "http://127.0.0.1",
        } as any,
      ],
    });

    assert.isUndefined(
      descriptor.runSchemaEntries.find(
        (entry) => entry.key === "autoApproveZoteroWrites",
      ),
    );
  });

  it("does not send ZoteroHostAccess runtime options in the SkillRunner-compatible build request", async function () {
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
        },
      },
    })) as Array<{
      runtime_options?: Record<string, unknown>;
    }>;

    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
  });

  it("does not treat write auto-approval as a workflow parameter", async function () {
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
          autoApproveZoteroWrites: true,
        },
      },
    })) as Array<{
      parameter?: Record<string, unknown>;
      runtime_options?: Record<string, unknown>;
    }>;

    assert.isUndefined(requests[0].parameter?.autoApproveZoteroWrites);
    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
  });

  it("loads from the builtin literature workbench package and builds one SkillRunner-compatible request", async function () {
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
          searchMode: "targeted_ingest",
          targetCollection: "RAG",
        },
        runOptions: {
          zoteroHostAccess: {
            autoApproveWrites: true,
          },
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
    assert.equal(requests[0].parameter?.searchMode, "targeted_ingest");
    assert.isUndefined(requests[0].parameter?.autoApproveZoteroWrites);
    assert.isUndefined(
      (requests[0] as any).runtime_options?.zotero_host_access,
    );
    assert.isUndefined((requests[0] as any).runtime_options?.workflow_mcp);
  });

  it("registers the workflow package files and skill resource manifest", async function () {
    const packageJson = JSON.parse(
      await fs.readFile(
        "workflows_builtin/literature-workbench-package/workflow-package.json",
        "utf8",
      ),
    );
    const manifest = JSON.parse(
      await fs.readFile("workflows_builtin/manifest.json", "utf8"),
    );
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
    assert.include(
      manifest.files,
      "literature-workbench-package/lib/representativeImage.mjs",
    );

    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["literature-search-ingest"];
    assert.isOk(entry);
    const skillManifest = await buildAcpSkillResourceManifest(entry);
    const files = skillManifest.files.map((file) => file.relativePath);
    assert.include(files, "SKILL.md");
    assert.include(files, "assets/runner.json");
    assert.include(files, "assets/parameter.schema.json");
    assert.include(files, "assets/output.schema.json");
  });

  it("loads literature workbench workflows after syncing only packaged manifest files", async function () {
    const copyRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "zs-literature-workbench-manifest-"),
    );
    const manifest = JSON.parse(
      await fs.readFile("workflows_builtin/manifest.json", "utf8"),
    ) as { files?: string[] };
    for (const relativePath of manifest.files || []) {
      const sourcePath = path.join("workflows_builtin", relativePath);
      const targetPath = path.join(copyRoot, relativePath);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.copyFile(sourcePath, targetPath);
    }

    const loaded = await loadWorkflowManifests(copyRoot, {
      workflowSourceKind: "builtin",
    });
    const ids = loaded.workflows.map((entry) => entry.manifest.id);

    assert.include(ids, "literature-analysis");
    assert.include(ids, "literature-search-ingest");
    assert.deepEqual(
      loaded.diagnostics.filter(
        (entry) => entry.entry === "literature-workbench-package",
      ),
      [],
    );
  });

  it("validates completed and canceled skill output payloads", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["literature-search-ingest"];
    const runnerJson = JSON.parse(
      await fs.readFile(entry.runnerJsonPath, "utf8"),
    );
    const primarySkillDir = path.dirname(path.dirname(entry.runnerJsonPath));

    const completed = await validateAcpSkillFinalPayload({
      payload: completedPayload(),
      runnerJson,
      primarySkillDir,
    });
    const strippedCompleted = completedPayload();
    delete (strippedCompleted as any).__SKILL_DONE__;
    const completedAfterConvergence = await validateAcpSkillFinalPayload({
      payload: strippedCompleted,
      runnerJson,
      primarySkillDir,
    });
    const canceled = await validateAcpSkillFinalPayload({
      payload: canceledPayload(),
      runnerJson,
      primarySkillDir,
    });

    assert.isTrue(completed.ok, completed.errors.join("; "));
    assert.isTrue(
      completedAfterConvergence.ok,
      completedAfterConvergence.errors.join("; "),
    );
    assert.isTrue(canceled.ok, canceled.errors.join("; "));
  });

  it("documents two confirmation gates, host context, and no browser automation", async function () {
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
      assert.include(text, "topics list");
      assert.include(text, "library-index get");
      assert.include(text, "literature ingest");
      assert.include(text, "targeted_ingest");
      assert.include(text, "paper-artifacts read");
      assert.include(text, "best-effort");
      assert.include(text, "filetype:pdf");
      assert.include(text, "missing_pdf_references");
      assert.include(text, "Connector");
      assert.include(text, "CDP");
    }
    assert.include(skill, "等待用户明确确认后再进入搜索");
    assert.include(skill, "等待用户确认");
    assert.include(skill, "逐篇调用");
    assert.include(skill, "ingest-paper-001.json");
    assert.include(skill, "禁止生成包含 `papers`");
    assert.include(skill, "最终只输出合法 JSON object");
    assert.include(skill, "成功入库但未获得 PDF");
    assert.include(skill, "manualSearchLinks");
    assert.include(skill, '"missing_pdf_references"');
    assert.include(skill, '"literature_search_ingest"');
    assert.include(skill, '"literature_search_ingest_canceled"');
    assert.notInclude(skill, "confirmed-papers.json");
    assert.notInclude(prompt, "confirmed-papers.json");
    assert.isUndefined(runner.mcp);
    assert.notInclude(skill, "MCP");
    assert.notInclude(prompt, "MCP");
  });
});
