import { assert } from "chai";
import fs from "fs/promises";
import { validateAcpSkillFinalPayload } from "../../src/modules/acpSkillOutputValidator";
import { scanPluginSkillRegistry } from "../../src/modules/pluginSkillRegistry";
import { buildWorkflowSettingsUiDescriptor } from "../../src/modules/workflowSettings";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/collection-collector/hooks/applyResult.mjs";

function successResult(items: Array<Record<string, unknown>> = []) {
  return {
    kind: "collection_membership_selection",
    collection: "1:COLL1234",
    collection_scope: "streaming multimodal perception",
    inventory_count: 100,
    existing_count: 4,
    eligible_count: items.length,
    assessed_count: items.length,
    selected_count: items.length,
    selected_items: items,
    diagnostics: [],
  };
}

function selectedItem(paperRef = "1:ITEM1234") {
  return {
    paper_ref: paperRef,
    title: "Streaming Multimodal Perception",
    semantic_relevance: 0.8,
    evidence_basis: ["metadata", "tags"],
    matched_topic_ids: [],
    reason: "Directly addresses the declared collection scope.",
    caveats: [],
  };
}

describe("collection collector workflow", function () {
  it("loads as a required-parameter automatic no-selection workflow", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "collection-collector",
    )?.manifest;

    assert.isOk(workflow);
    assert.equal(workflow?.provider, "skillrunner");
    assert.isFalse(workflow?.display?.core);
    assert.equal(workflow?.trigger?.requiresSelection, false);
    assert.equal(workflow?.request?.create?.mode, "auto");
    assert.isTrue(workflow?.parameters?.collection?.required);
    assert.isFalse(workflow?.parameters?.collection?.allowCustom);
    assert.equal(
      workflow?.parameters?.collection?.optionsSource?.kind,
      "zotero.collections",
    );
    assert.isFalse(
      workflow?.parameters?.collection?.optionsSource?.includeEmpty,
    );
    assert.isTrue(workflow?.parameters?.collectionScope?.required);
    assert.deepEqual(Object.keys(workflow?.parameters || {}), [
      "collection",
      "collectionScope",
    ]);
  });

  it("exposes required descriptors and builds the declared request", async function () {
    const loaded = await loadWorkflowManifests("workflows_builtin", {
      workflowSourceKind: "builtin",
    });
    const workflow = loaded.workflows.find(
      (entry) => entry.manifest.id === "collection-collector",
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
      draft: {
        workflowParams: {
          collection: "1:COLL1234",
          collectionScope: "streaming multimodal perception",
        },
      },
      resolveDynamicOptions: false,
    });
    assert.deepEqual(descriptor.missingRequiredWorkflowParams, []);
    assert.isTrue(
      descriptor.workflowSchemaEntries.find(
        (entry) => entry.key === "collection",
      )?.required,
    );
    assert.isTrue(
      descriptor.workflowSchemaEntries.find(
        (entry) => entry.key === "collectionScope",
      )?.required,
    );

    const requests = (await executeBuildRequests({
      workflow: workflow!,
      selectionContext: { items: { attachments: [] } },
      executionOptions: {
        workflowParams: {
          collection: "1:COLL1234",
          collectionScope: "streaming multimodal perception",
        },
      },
    })) as Array<{ parameter?: Record<string, unknown> }>;
    assert.lengthOf(requests, 1);
    assert.equal(requests[0].parameter?.collection, "1:COLL1234");
    assert.equal(
      requests[0].parameter?.collectionScope,
      "streaming multimodal perception",
    );
  });

  it("ships a self-contained skill and validates empty and populated selections", async function () {
    const registry = await scanPluginSkillRegistry({ cwd: process.cwd() });
    const entry = registry.entriesById["collection-collector"];
    assert.isOk(entry);
    const runner = JSON.parse(await fs.readFile(entry.runnerJsonPath, "utf8"));
    assert.deepEqual(runner.execution_modes, ["auto"]);
    const primarySkillDir = entry.sourceDir;

    for (const payload of [
      successResult(),
      successResult([selectedItem()]),
      {
        kind: "collection_collector_canceled",
        status: "canceled",
        reason: "invalid_input",
        message: "collection and collectionScope are required",
      },
    ]) {
      const validated = await validateAcpSkillFinalPayload({
        payload,
        runnerJson: runner,
        primarySkillDir,
      });
      assert.isTrue(validated.ok, validated.errors.join("; "));
    }
  });

  it("deduplicates current membership and applies one validated batch", async function () {
    const mutations: any[] = [];
    const result = successResult([
      selectedItem("1:ITEM1234"),
      { ...selectedItem("1:EXIST123"), title: "Existing paper" },
    ]);
    const applied = await applyResult({
      request: {
        parameter: {
          collection: "1:COLL1234",
          collectionScope: "streaming multimodal perception",
        },
      },
      resultContext: { resultJson: result },
      runtime: {
        hostApiVersion: 8,
        hostApi: {
          library: {
            async listItems() {
              return {
                items: [{ libraryId: 1, key: "EXIST123" }],
                hasMore: false,
              };
            },
            async getItemDetail(ref: string) {
              return {
                libraryId: 1,
                key: ref.split(":")[1],
                itemType: "journalArticle",
              };
            },
          },
          mutations: {
            async execute(value: unknown) {
              mutations.push(value);
              return {};
            },
          },
        },
      },
    } as any);

    assert.equal(applied.status, "added");
    assert.equal(applied.addedCount, 1);
    assert.equal(applied.alreadyPresentCount, 1);
    assert.deepEqual(mutations, [
      {
        operation: "collection.addItems",
        collection: "1:COLL1234",
        items: ["1:ITEM1234"],
      },
    ]);
  });

  it("omits the first cursor and passes through opaque membership cursors", async function () {
    const calls: any[] = [];
    const opaqueCursor = "eyJ2ZXJzaW9uIjoxfQ";
    const applied = await applyResult({
      request: {
        parameter: {
          collection: "1:COLL1234",
          collectionScope: "scope",
        },
      },
      resultContext: {
        resultJson: successResult([selectedItem("1:EXIST123")]),
      },
      runtime: {
        hostApiVersion: 8,
        hostApi: {
          library: {
            async listItems(args: unknown) {
              calls.push(args);
              return calls.length === 1
                ? { items: [], hasMore: true, nextCursor: opaqueCursor }
                : {
                    items: [{ libraryId: 1, key: "EXIST123" }],
                    hasMore: false,
                    nextCursor: "",
                  };
            },
            async getItemDetail() {
              throw new Error("existing item must not be hydrated");
            },
          },
          mutations: {
            async execute() {
              throw new Error("existing item must not be added");
            },
          },
        },
      },
    } as any);

    assert.strictEqual(applied.status, "noop");
    assert.notProperty(calls[0], "cursor");
    assert.strictEqual(calls[1].cursor, opaqueCursor);
  });

  it("rejects cross-library results before mutation", async function () {
    let mutationCount = 0;
    let error: unknown;
    try {
      await applyResult({
        request: {
          parameter: {
            collection: "1:COLL1234",
            collectionScope: "scope",
          },
        },
        resultContext: {
          resultJson: successResult([selectedItem("2:ITEM1234")]),
        },
        runtime: {
          hostApiVersion: 8,
          hostApi: {
            library: {
              async listItems() {
                return { items: [], hasMore: false };
              },
              async getItemDetail() {
                return null;
              },
            },
            mutations: {
              async execute() {
                mutationCount += 1;
              },
            },
          },
        },
      } as any);
    } catch (caught) {
      error = caught;
    }
    assert.instanceOf(error, Error);
    assert.include(String((error as Error).message), "cross-library");
    assert.equal(mutationCount, 0);
  });
});
