import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayAttemptReceipt,
  type PiGatewayPolicy,
} from "../../src/modules/piToolGateway";
import { createZoteroNativeToolDefinitions } from "../../src/modules/zoteroNativeToolCatalog";
import {
  ZoteroHostCapabilityError,
  type ZoteroHostCapabilityBroker,
} from "../../src/modules/zoteroHostCapabilityBroker";
import type { JsonObject } from "../../src/workflows/types";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import sourceReferenceArtifactSchema from "../../packages/synthesis-contracts/contract-set/canonical-literature-artifacts-v1/schemas/source-reference-artifact.schema.json";

const capabilityId = "context.get_current_view";
const name = "zotero_context_get_current_view";
const view = {
  target: "library" as const,
  libraryIds: [1],
  selectedSources: [],
  selectionEmpty: true,
};
const workspace = {
  materializeOrReuseMany: async (inputs: unknown[]) =>
    inputs.map((_, index) => ({
      path: `/owner/files/${index}`,
      reused: false,
    })),
  beginGeneratedTextOutput: async () => ({
    append: async (_text: string) => undefined,
    commit: async () => ({
      path: "/owner/files/output",
      sizeBytes: 2,
      sha256: "sha256:output",
    }),
    discard: async () => undefined,
  }),
};

async function turn(
  broker = createFailClosedZoteroHostCapabilityBroker({
    context: { getCurrentView: () => view },
  }),
  availableCapabilityIds = [capabilityId],
) {
  const started: { capabilityId: string; name: string }[] = [];
  const receipts: PiGatewayAttemptReceipt[] = [];
  const policy: PiGatewayPolicy = {
    mode: "interactive",
    systemAllowedEffects: ["bounded-read"],
    authorizedEffects: ["bounded-read"],
    authorizedKeys: [],
    maxCalls: 1,
    maxConcurrent: 1,
    maxCost: 1,
  };
  const gateway = await freezePiToolGatewayTurn({
    owner: { kind: "conversation", ownerId: "owner" },
    turnId: "turn",
    definitions: [...createZoteroNativeToolDefinitions({ broker, workspace })],
    policy,
    runtimeCapability: { identity: "test", availableCapabilityIds },
    hooks: {
      recordStarted: async (fact) => {
        started.push(fact);
      },
      recordReceipt: async (receipt) => {
        receipts.push(receipt);
      },
      recordPermission: async () => undefined,
    },
  });
  const call = (arguments_: JsonObject = {}) =>
    gateway.executeBatch([{ callId: "call", name, arguments: arguments_ }]);
  return { gateway, started, receipts, call };
}

describe("Pi Zotero Native Tool Catalog", function () {
  it("publishes exactly the reviewed read mappings with closed inputs and canonical dispatch", async function () {
    const ref = { libraryId: 1, key: "ABCD1234" };
    const cases = [
      [
        "context.get_selected_items",
        "zotero_context_get_selected_items",
        "context",
        "getSelectedItems",
        {},
        ["bounded-read"],
      ],
      [
        "library.list_items",
        "zotero_library_list_items",
        "library",
        "listItems",
        { limit: 2 },
        ["bounded-read"],
      ],
      [
        "library.list_collections",
        "zotero_library_list_collections",
        "library",
        "listCollections",
        {},
        ["bounded-read"],
      ],
      [
        "library.list_saved_searches",
        "zotero_library_list_saved_searches",
        "library",
        "listSavedSearches",
        { libraryId: 1 },
        ["bounded-read"],
      ],
      [
        "library.get_item_detail",
        "zotero_library_get_item_detail",
        "library",
        "getItemDetail",
        { ref },
        ["bounded-read"],
      ],
      [
        "library.get_item_notes",
        "zotero_library_get_item_notes",
        "library",
        "getItemNotes",
        { ref },
        ["bounded-read"],
      ],
      [
        "library.get_note_detail",
        "zotero_library_get_note_detail",
        "library",
        "getNoteDetail",
        { ref, format: "text" },
        ["bounded-read"],
      ],
      [
        "library.get_item_attachments",
        "zotero_library_get_item_attachments",
        "library",
        "getItemAttachments",
        { ref },
        ["bounded-read", "workspace-mutation"],
      ],
      [
        "library.list_annotations",
        "zotero_library_list_annotations",
        "library",
        "listAnnotations",
        { ref },
        ["bounded-read"],
      ],
      [
        "library.export_annotations",
        "zotero_library_export_annotations",
        "library",
        "exportAnnotations",
        { ref },
        ["bounded-read", "workspace-mutation"],
      ],
      [
        "metadata.translate_identifier",
        "zotero_metadata_translate_identifier",
        "metadata",
        "translateIdentifier",
        { type: "DOI", value: "10.1/a" },
        ["bounded-read", "external-egress"],
      ],
      [
        "library.readiness_audit",
        "zotero_library_readiness_audit",
        "library",
        "readinessAudit",
        {},
        ["bounded-read"],
      ],
      [
        "library.get_item_audit_state",
        "zotero_library_get_item_audit_state",
        "library",
        "getItemAuditState",
        { ref },
        ["bounded-read"],
      ],
      [
        "library.traverse_items",
        "zotero_library_traverse_items",
        "library",
        "traverseItems",
        { scope: "top-level-regular" },
        ["bounded-read", "workspace-mutation"],
      ],
    ] as const;
    const catalog = createZoteroNativeToolDefinitions({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      workspace,
    });
    assert.lengthOf(catalog, 15);
    assert.equal(new Set(catalog.map((item) => item.capabilityId)).size, 15);
    assert.equal(new Set(catalog.map((item) => item.name)).size, 15);
    assert.notInclude(
      catalog.map((item) => item.name),
      "zotero_library_get_note_payload",
    );
    for (const [id, toolName, domain, member, args, effects] of cases) {
      const tool = catalog.find((item) => item.capabilityId === id)!;
      assert.equal(tool.name, toolName);
      assert.equal(tool.schema.additionalProperties, false);
      assert.deepEqual(tool.minimumEffects, effects);
      let called = false;
      const broker = createFailClosedZoteroHostCapabilityBroker({
        [domain]: {
          [member]: async () => {
            called = true;
            if (member === "getItemAttachments") return { attachments: [] };
            if (member === "exportAnnotations")
              return { format: "markdown", annotations: [], markdown: "ok" };
            if (member === "traverseItems")
              return {
                outcome: "completed",
                visitedItems: 0,
                visitedBatches: 0,
                completionEvidence: { evidenceId: "e" },
              };
            return { marker: id };
          },
        },
      } as any);
      const definition = createZoteroNativeToolDefinitions({
        broker,
        workspace,
      }).find((item) => item.capabilityId === id)!;
      const execution = await definition.execute(args as any, {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
      assert.isTrue(called, id);
      assert.equal(execution.status, "completed", id);
    }
  });

  it("keeps a new canonical page within the Gateway result budget", async function () {
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listItems: async () =>
          ({ items: [{ title: "x".repeat(60000) }] }) as any,
      },
    });
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner" },
      turnId: "read-page",
      definitions: [
        ...createZoteroNativeToolDefinitions({ broker, workspace }),
      ],
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read"],
        authorizedEffects: ["bounded-read"],
        authorizedKeys: [],
        maxCalls: 1,
        maxConcurrent: 1,
        maxCost: 1,
      },
      runtimeCapability: {
        identity: "page",
        availableCapabilityIds: ["library.list_items"],
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const result = (
      await gateway.executeBatch([
        {
          callId: "page",
          name: "zotero_library_list_items",
          arguments: { limit: 1 },
        },
      ])
    ).results[0];
    assert.equal(result.failure?.code, "resource_limited");
    assert.notInclude(JSON.stringify(result), "x".repeat(100));
  });

  it("keeps source paths out of attachment page and item detail results", async function () {
    const ref = { libraryId: 1, key: "ATTACH01" };
    const sourcePath = "/private/Zotero/storage/source.pdf";
    const attachment = {
      ref,
      parentRef: null,
      revision: "r1",
      title: "PDF",
      filename: "source.pdf",
      contentType: "application/pdf",
      charset: null,
      url: null,
      linkMode: "stored_file",
      role: "ordinary",
      createdAt: "",
      file: {
        state: "available",
        path: sourcePath,
        sizeBytes: 5,
        modifiedAt: null,
      },
    };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        getItemAttachments: async () =>
          ({
            attachments: [attachment],
            limit: 25,
            returned: 1,
            total: 1,
            nextCursor: null,
            hasMore: false,
          }) as any,
        getItemDetail: async () =>
          ({ kind: "attachment", item: attachment }) as any,
      },
    });
    let copied: unknown[] = [];
    const owner = {
      ...workspace,
      materializeOrReuseMany: async (inputs: unknown[]) => {
        copied = inputs;
        return [{ path: "/owner/files/copy.pdf", reused: false }];
      },
    };
    const definitions = createZoteroNativeToolDefinitions({
      broker,
      workspace: owner,
    });
    const context = {
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    };
    const page = await definitions
      .find((item) => item.capabilityId === "library.get_item_attachments")!
      .execute({ ref }, context);
    assert.equal(page.status, "completed");
    assert.include(JSON.stringify(copied), sourcePath);
    assert.include(JSON.stringify(page.value), "/owner/files/copy.pdf");
    assert.notInclude(JSON.stringify(page.value), sourcePath);
    const detail = await definitions
      .find((item) => item.capabilityId === "library.get_item_detail")!
      .execute({ ref }, context);
    assert.equal(detail.status, "completed");
    assert.notInclude(JSON.stringify(detail.value), sourcePath);
    assert.notInclude(JSON.stringify(detail.value), "/owner/files/copy.pdf");
  });

  it("returns a page of unavailable attachments without requesting file materialization", async function () {
    const ref = { libraryId: 1, key: "PARENT01" };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        getItemAttachments: async () =>
          ({
            attachments: [{ ref, revision: "r1", file: { state: "missing" } }],
            limit: 25,
            returned: 1,
            total: 1,
            nextCursor: null,
            hasMore: false,
          }) as any,
      },
    });
    const owner = {
      ...workspace,
      materializeOrReuseMany: async () => {
        throw new Error("should not copy");
      },
    };
    const tool = createZoteroNativeToolDefinitions({
      broker,
      workspace: owner,
    }).find((item) => item.capabilityId === "library.get_item_attachments")!;
    const result = await tool.execute(
      { ref },
      {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      },
    );
    assert.equal(result.status, "completed");
    assert.equal((result.value as any).attachments[0].file.state, "missing");
  });

  it("records a completed workspace effect if cancellation follows attachment materialization", async function () {
    const ref = { libraryId: 1, key: "ATTACH01" };
    const controller = new AbortController();
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        getItemAttachments: async () =>
          ({
            attachments: [
              {
                ref,
                revision: "r1",
                file: { state: "available", path: "/private/source.pdf" },
              },
            ],
          }) as any,
      },
    });
    const owner = {
      ...workspace,
      materializeOrReuseMany: async () => {
        controller.abort();
        return [{ path: "/owner/files/copy.pdf", reused: false }];
      },
    };
    const tool = createZoteroNativeToolDefinitions({
      broker,
      workspace: owner,
    }).find((item) => item.capabilityId === "library.get_item_attachments")!;
    const result = await tool.execute(
      { ref },
      { signal: controller.signal, onUpdate: () => undefined },
    );
    assert.equal(result.status, "canceled");
    assert.equal(result.effectCertainty, "confirmed_complete");
  });

  it("rejects an oversized managed note without truncation or file fallback", async function () {
    const ref = { libraryId: 1, key: "NOTE0001" };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        getNoteDetail: async () =>
          ({
            kind: "managed",
            noteKind: "custom",
            payload: "private".repeat(10000),
          }) as any,
      },
    });
    const tool = createZoteroNativeToolDefinitions({ broker, workspace }).find(
      (item) => item.capabilityId === "library.get_note_detail",
    )!;
    const result = await tool.execute(
      { ref, format: "text" },
      {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      },
    );
    assert.equal(result.status, "failed");
    assert.equal(result.code, "resource_limited");
    assert.deepInclude(result.details as object, {
      managedType: "custom",
      limitBytes: 51200,
    });
    assert.notInclude(JSON.stringify(result), "private");
  });

  it("writes export and traversal through owner files with truthful terminal coverage", async function () {
    const ref = { libraryId: 1, key: "ITEM0001" };
    const written: string[] = [];
    let discarded = 0;
    const owner = {
      ...workspace,
      beginGeneratedTextOutput: async () => ({
        append: async (text: string) => {
          written.push(text);
        },
        commit: async () => ({
          path: "/owner/files/coverage.ndjson",
          sizeBytes: 10,
          sha256: "sha256:x",
        }),
        discard: async () => {
          discarded += 1;
        },
      }),
    };
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        exportAnnotations: async () => ({
          format: "markdown",
          annotations: [],
          markdown: "# exported",
        }),
        traverseItems: async (_request, _control, onBatch) => {
          await onBatch({ batchIndex: 0, items: [{ ref, title: "A" } as any] });
          return {
            outcome: "resource_limited",
            libraryId: 1,
            visitedItems: 1,
            visitedBatches: 1,
            reason: "max_items",
            resumeCursor: "next",
          };
        },
      },
    });
    const definitions = createZoteroNativeToolDefinitions({
      broker,
      workspace: owner,
    });
    const context = {
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    };
    const exportResult = await definitions
      .find((item) => item.capabilityId === "library.export_annotations")!
      .execute({ ref }, context);
    assert.equal(exportResult.status, "completed");
    assert.include(written, "# exported");
    assert.notInclude(JSON.stringify(exportResult.value), "# exported");
    const traversal = await definitions
      .find((item) => item.capabilityId === "library.traverse_items")!
      .execute({ scope: "top-level-regular" }, context);
    assert.equal(traversal.status, "completed");
    assert.deepInclude(traversal.value as object, {
      outcome: "resource_limited",
      resumeCursor: "next",
    });
    assert.deepInclude((traversal.value as any).artifact, {
      rowCount: 1,
      complete: false,
    });
    assert.notProperty(traversal.value as object, "completionEvidence");
    assert.equal(discarded, 0);
  });

  it("commits completed traversal evidence and discards canceled traversal output", async function () {
    const ref = { libraryId: 1, key: "ITEM0001" };
    let committed = 0;
    let discarded = 0;
    const owner = {
      ...workspace,
      beginGeneratedTextOutput: async () => ({
        append: async (_text: string) => undefined,
        commit: async () => {
          committed += 1;
          return {
            path: "/owner/complete.ndjson",
            sizeBytes: 2,
            sha256: "sha256:x",
          };
        },
        discard: async () => {
          discarded += 1;
        },
      }),
    };
    const run = async (outcome: "completed" | "canceled") => {
      const broker = createFailClosedZoteroHostCapabilityBroker({
        library: {
          traverseItems: async (_request, _control, onBatch) => {
            await onBatch({ batchIndex: 0, items: [{ ref } as any] });
            return outcome === "completed"
              ? {
                  outcome,
                  libraryId: 1,
                  visitedItems: 1,
                  visitedBatches: 1,
                  completionEvidence: {
                    evidenceId: "e",
                    criteriaDigest: "c",
                    coverageDigest: "v",
                    completedAt: "now",
                  },
                }
              : { outcome, libraryId: 1, visitedItems: 1, visitedBatches: 1 };
          },
        },
      });
      const tool = createZoteroNativeToolDefinitions({
        broker,
        workspace: owner,
      }).find((item) => item.capabilityId === "library.traverse_items")!;
      return tool.execute(
        { scope: "top-level-regular" },
        {
          signal: new AbortController().signal,
          onUpdate: () => undefined,
        },
      );
    };
    const complete = await run("completed");
    assert.deepInclude(complete.value as object, { outcome: "completed" });
    assert.deepInclude((complete.value as any).artifact, {
      complete: true,
      rowCount: 1,
    });
    assert.property(complete.value as object, "completionEvidence");
    const canceled = await run("canceled");
    assert.equal(canceled.status, "canceled");
    assert.equal(committed, 1);
    assert.equal(discarded, 1);
  });
  it("admits one reviewed current-view definition and preserves broker DTO and dual receipt identity", async function () {
    let calls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getCurrentView: () => {
          calls += 1;
          return view;
        },
      },
    });
    const { gateway, started, receipts, call } = await turn(broker);
    assert.deepEqual(
      gateway.catalog.tools.map((tool) => tool.name),
      [name],
    );
    assert.deepEqual(
      gateway.catalog.tools.map((tool) => tool.capabilityId),
      [capabilityId],
    );
    assert.deepEqual(gateway.catalog.tools[0].schema, {
      type: "object",
      properties: {},
      additionalProperties: false,
    });
    const result = (await call()).results[0];
    assert.equal(result.status, "completed");
    assert.deepEqual(result.value, view);
    assert.equal(calls, 1);
    assert.deepEqual(
      started.map(({ capabilityId, name }) => ({ capabilityId, name })),
      [{ capabilityId, name }],
    );
    assert.deepEqual(
      receipts.map(({ capabilityId, name, effects }) => ({
        capabilityId,
        name,
        effects,
      })),
      [{ capabilityId, name, effects: ["bounded-read"] }],
    );
  });

  it("rejects extra input and unavailable capability before calling the broker", async function () {
    let calls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      context: {
        getCurrentView: () => {
          calls += 1;
          return view;
        },
      },
    });
    const malformed = await turn(broker);
    assert.equal(
      (await malformed.call({ extra: true })).results[0].failure?.code,
      "invalid_request",
    );
    const unavailable = await turn(broker, []);
    assert.lengthOf(unavailable.gateway.catalog.tools, 0);
    assert.equal(
      (await unavailable.call()).results[0].failure?.code,
      "capability_unavailable",
    );
    assert.equal(calls, 0);
  });

  it("preserves canonical broker failure facts and hides unknown exceptions", async function () {
    const known = await turn(
      createFailClosedZoteroHostCapabilityBroker({
        context: {
          getCurrentView: () => {
            throw new ZoteroHostCapabilityError(
              "unavailable",
              "private broker prose",
              { reason: "navigation", kind: "library" },
              true,
            );
          },
        },
      }),
    );
    const knownResult = (await known.call()).results[0];
    assert.equal(knownResult.failure?.code, "unavailable");
    assert.equal(knownResult.failure?.retryable, true);
    assert.deepEqual(knownResult.failure?.details, {
      reason: "navigation",
      kind: "library",
    });
    assert.notInclude(JSON.stringify(knownResult), "private broker prose");
    assert.notProperty(known.receipts[0], "details");

    const unknown = await turn(
      createFailClosedZoteroHostCapabilityBroker({
        context: {
          getCurrentView: () => {
            throw new Error("private native cause");
          },
        },
      }),
    );
    const unknownResult = (await unknown.call()).results[0];
    assert.equal(unknownResult.failure?.code, "internal_error");
    assert.notProperty(unknownResult.failure || {}, "details");
    assert.notInclude(JSON.stringify(unknownResult), "private native cause");
  });

  it("requires the injected broker member and never resolves a global fallback", async function () {
    assert.throws(() => createZoteroNativeToolDefinitions({} as any));
    const { call } = await turn(createFailClosedZoteroHostCapabilityBroker());
    assert.equal((await call()).results[0].failure?.code, "unavailable");
  });
});
const MUTATION_MAPPINGS = [
  ["item.create", "zotero_item_create", false],
  ["item.update_metadata", "zotero_item_update_metadata", false],
  ["item.update_tags", "zotero_item_update_tags", false],
  ["item.add_related_items", "zotero_item_add_related_items", false],
  ["item.remove_related_items", "zotero_item_remove_related_items", false],
  ["note.create", "zotero_note_create", false],
  ["note.update_content", "zotero_note_update_content", false],
  ["collection.create", "zotero_collection_create", false],
  ["collection.update", "zotero_collection_update", false],
  [
    "collection.update_membership",
    "zotero_collection_update_membership",
    false,
  ],
  ["attachment.update_metadata", "zotero_attachment_update_metadata", false],
  ["item.change_type", "zotero_item_change_type", true],
  ["attachment.import", "zotero_attachment_import", true],
  ["attachment.replace_file", "zotero_attachment_replace_file", true],
  ["attachment.move", "zotero_attachment_move", true],
  ["trash.move_items", "zotero_trash_move_items", true],
  ["trash.restore_items", "zotero_trash_restore_items", true],
  ["managed_note.write_custom", "zotero_custom_note_write", true],
  ["managed_note.write_conversation", "zotero_conversation_note_write", true],
  [
    "literature_artifact.upsert_digest",
    "zotero_literature_digest_upsert",
    true,
  ],
  [
    "literature_artifact.upsert_references",
    "zotero_literature_references_upsert",
    true,
  ],
  [
    "literature_artifact.upsert_citation_analysis",
    "zotero_literature_citation_analysis_upsert",
    true,
  ],
  ["literature_artifact.upsert_score", "zotero_literature_score_upsert", true],
] as const;

function mutationDependencies() {
  const calls = {
    identity: 0,
    sourceIds: [] as string[][],
    results: [] as unknown[],
  };
  const dependencies = {
    identity: async () => {
      calls.identity += 1;
      return {
        operationId: "op-1",
        generatedSourceReferenceIds: [] as string[],
      };
    },
    recordSourceIds: async (_context: unknown, ids: string[]) => {
      calls.sourceIds.push(ids);
    },
    recordDomainResult: async (_context: unknown, result: unknown) => {
      calls.results.push(result);
      return "zotero-receipt-1";
    },
  };
  return { calls, dependencies };
}

function mutationCatalog(
  dependencies: ReturnType<typeof mutationDependencies>["dependencies"],
  ownerWorkspace: Record<string, unknown> = workspace,
) {
  return createZoteroNativeToolDefinitions({
    broker: createFailClosedZoteroHostCapabilityBroker(),
    workspace: ownerWorkspace as never,
    mutations: dependencies as never,
  });
}

function preflightContext() {
  return {
    owner: { kind: "conversation" as const, ownerId: "owner" },
    turnId: "turn",
    sourceTurnId: "source",
    callId: "call",
    signal: new AbortController().signal,
  };
}

function mutationTool(
  dependencies: ReturnType<typeof mutationDependencies>["dependencies"],
  capabilityId: string,
  ownerWorkspace: Record<string, unknown> = workspace,
) {
  const tool = mutationCatalog(dependencies, ownerWorkspace).find(
    (definition) => definition.capabilityId === capabilityId,
  )!;
  assert.isDefined(tool, capabilityId);
  return tool;
}

describe("Pi Zotero Native Mutation Tool Catalog", function () {
  it("registers the reviewed read and mutation schemas through the real Gateway catalog", async function () {
    const { dependencies } = mutationDependencies();
    const definitions = [...mutationCatalog(dependencies)];
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner" },
      turnId: "mutation-catalog",
      definitions,
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["bounded-read", "zotero-mutation"],
        authorizedEffects: ["bounded-read", "zotero-mutation"],
        authorizedKeys: ["zotero-mutation:enhanced"],
        maxCalls: 1,
        maxConcurrent: 1,
        maxCost: 1,
      },
      runtimeCapability: {
        identity: "mutation-catalog",
        availableCapabilityIds: definitions.map(
          (definition) => definition.capabilityId,
        ),
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    assert.lengthOf(gateway.catalog.tools, 38);
  });

  it("keeps every mutation schema self-contained and small enough for one model catalog", function () {
    const encoder = new TextEncoder();
    const catalog = mutationCatalog(mutationDependencies().dependencies);
    const mutations = catalog.filter((definition) =>
      MUTATION_MAPPINGS.some(
        ([capabilityId]) => capabilityId === definition.capabilityId,
      ),
    );
    assert.lengthOf(mutations, 23);
    let total = 0;
    for (const definition of mutations) {
      const schema = definition.schema as Record<string, unknown>;
      const defs = schema.$defs as Record<string, unknown>;
      const bytes = encoder.encode(JSON.stringify(schema)).byteLength;
      total += bytes;
      assert.isBelow(bytes, 8 * 1024, definition.capabilityId);
      const referenced = new Set<string>();
      const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
          for (const entry of value) visit(entry);
          return;
        }
        if (!value || typeof value !== "object") return;
        const node = value as Record<string, unknown>;
        if (typeof node.$ref === "string" && node.$ref.startsWith("#/$defs/")) {
          referenced.add(node.$ref.slice("#/$defs/".length));
        }
        for (const key of Object.keys(node)) {
          if (key === "$defs") continue;
          visit(node[key]);
        }
      };
      visit(schema);
      for (const name of referenced) {
        assert.property(defs, name, definition.capabilityId + " " + name);
        visit(defs[name]);
      }
    }
    assert.isBelow(total, 32 * 1024);
  });

  it("lets the model omit new source reference identities without rewriting the imported contract", function () {
    const schema = mutationTool(
      mutationDependencies().dependencies,
      "literature_artifact.upsert_references",
    ).schema as Record<string, any>;
    const sourceReference = schema.$defs.SourceReference;
    assert.property(sourceReference.properties, "sourceReferenceId");
    assert.notInclude(sourceReference.required, "sourceReferenceId");
    const imported = sourceReferenceArtifactSchema as Record<string, any>;
    assert.include(
      imported.$defs.SourceReference.required,
      "sourceReferenceId",
      "schema projection must not rewrite the imported contract",
    );
    assert.isString(imported.$id);
  });
  it("exposes the twenty-three reviewed mutation mappings with unique static identities", function () {
    const catalog = mutationCatalog(mutationDependencies().dependencies);
    assert.lengthOf(catalog, 38);
    for (const [capabilityId, name] of MUTATION_MAPPINGS) {
      const tool = catalog.find(
        (definition) => definition.capabilityId === capabilityId,
      );
      assert.isDefined(tool, capabilityId);
      assert.equal(tool!.name, name);
      assert.deepEqual(tool!.minimumEffects, ["bounded-read"]);
    }
    assert.equal(
      new Set(catalog.map((definition) => definition.capabilityId)).size,
      38,
    );
    assert.equal(
      new Set(catalog.map((definition) => definition.name)).size,
      38,
    );
    assert.notInclude(
      catalog.map((definition) => definition.name),
      "zotero_note_upsert_payload",
    );
    // Both trash tools share one canonical operation but stay distinct tools.
    assert.equal(
      mutationTool(mutationDependencies().dependencies, "trash.move_items")
        .capabilityId,
      "trash.move_items",
    );
  });

  it("keeps the reviewed read-only composition at fifteen tools", function () {
    const reads = createZoteroNativeToolDefinitions({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      workspace,
    });
    assert.lengthOf(reads, 15);
    assert.notInclude(
      reads.map((definition) => definition.capabilityId),
      "item.create",
    );
  });

  it("routes dry runs through bounded reads and ordinary runs through the domain write tier", async function () {
    const dependencies = mutationDependencies().dependencies;
    const itemRef = { libraryId: 5, key: "ITEM0001" };
    const cases: Array<[string, boolean]> = MUTATION_MAPPINGS.map(
      ([capabilityId, , enhanced]) => [capabilityId, enhanced],
    );
    for (const [capabilityId, enhanced] of cases) {
      const tool = mutationTool(dependencies, capabilityId);
      const args = {
        itemRef,
        ref: itemRef,
        collectionRef: itemRef,
        parentRef: itemRef,
        attachmentRef: itemRef,
        noteRef: itemRef,
      };
      const ordinary = await tool.classify(args as never);
      assert.deepEqual(
        [...ordinary.effects].sort(),
        ["bounded-read", "zotero-mutation"],
        capabilityId,
      );
      assert.deepEqual(
        ordinary.authorizationKeys,
        enhanced ? ["zotero-mutation:enhanced"] : [],
        capabilityId,
      );
      assert.deepEqual(ordinary.resourceKeys, ["library:5"], capabilityId);
      const preview = await tool.classify({ ...args, dryRun: true } as never);
      assert.deepEqual(preview.effects, ["bounded-read"], capabilityId);
      assert.deepEqual(preview.authorizationKeys, [], capabilityId);
      assert.deepEqual(preview.resourceKeys, [], capabilityId);
    }
  });

  it("reports pending staging cleanup instead of silently completing", async function () {
    const { dependencies } = mutationDependencies();
    const owner = {
      ...workspace,
      prepareStoredAttachment: async () => ({
        prepared: {},
        preparedFiles: {},
        manifest: { identity: "i", main: {}, companions: [] },
        dispose: async () => {
          throw new Error("pi_managed_cleanup_pending");
        },
      }),
    };
    const tool = mutationTool(dependencies, "attachment.import", owner);
    const result = await tool.preflight!(
      {
        placement: { kind: "child", parentRef: { libraryId: 1, key: "P" } },
        path: "imports/paper.pdf",
      } as never,
      preflightContext() as never,
    );
    assert.equal(result.status, "failed");
    assert.equal(
      (result as { details: { cleanupPending?: boolean } }).details
        .cleanupPending,
      true,
    );
  });
  it("closes mutation schemas and applies the shared logical list bound", function () {
    const catalog = mutationCatalog(mutationDependencies().dependencies);
    for (const [capabilityId] of MUTATION_MAPPINGS) {
      const tool = catalog.find(
        (definition) => definition.capabilityId === capabilityId,
      )!;
      const schema = tool.schema as Record<string, unknown>;
      const properties = schema.properties as Record<string, unknown>;
      assert.equal(schema.additionalProperties, false, capabilityId);
      assert.notProperty(properties, "operationId", capabilityId);
      assert.notProperty(properties, "expectedRevision", capabilityId);
      assert.property(properties, "dryRun", capabilityId);
      assert.notInclude(
        (schema.required as string[]) || [],
        "operationId",
        capabilityId,
      );
      assert.property(schema, "$defs", capabilityId);
    }
    const propertiesOf = (capabilityId: string) =>
      (
        mutationTool(mutationDependencies().dependencies, capabilityId)
          .schema as {
          properties: Record<string, never>;
        }
      ).properties;
    assert.equal(
      (propertiesOf("item.create").initialTags as { maxItems: number })
        .maxItems,
      100,
    );
    assert.equal(
      (
        propertiesOf("collection.update_membership").add as {
          maxItems: number;
        }
      ).maxItems,
      100,
    );
    assert.equal(
      (propertiesOf("trash.move_items").itemRefs as { maxItems: number })
        .maxItems,
      100,
    );
    assert.notProperty(propertiesOf("trash.move_items"), "state");
    assert.notProperty(
      propertiesOf("note.update_content").content as never,
      "embeddedImages",
    );
    assert.notProperty(propertiesOf("attachment.import"), "source");
    assert.equal(
      (propertiesOf("attachment.import").path as { type: string }).type,
      "string",
    );
    const references = mutationTool(
      mutationDependencies().dependencies,
      "literature_artifact.upsert_references",
    ).schema as Record<string, any>;
    assert.equal(
      references.$defs.sourceReferenceArtifact.properties.references.maxItems,
      100,
    );
    const score = mutationTool(
      mutationDependencies().dependencies,
      "literature_artifact.upsert_score",
    ).schema as Record<string, any>;
    assert.equal(
      score.$defs.literatureScoreArtifact.properties.dimensions.maxItems,
      6,
    );
    assert.notProperty(
      score.$defs.literatureScoreArtifact.properties,
      "schema",
    );
  });

  it("fails closed when a mutation is dispatched without a preflight", async function () {
    const tool = mutationTool(
      mutationDependencies().dependencies,
      "item.update_tags",
    );
    const execution = await tool.execute({} as never, {
      signal: new AbortController().signal,
      onUpdate: () => undefined,
    });
    assert.equal(execution.status, "failed");
    assert.equal(execution.code, "preflight_required");
    assert.equal(execution.effectCertainty, "confirmed_none");
  });

  it("rejects a combined logical list beyond the shared bound before any effect", async function () {
    const { calls, dependencies } = mutationDependencies();
    const tool = mutationTool(dependencies, "collection.update_membership");
    const refs = (offset: number) =>
      Array.from({ length: 60 }, (_, index) => ({
        libraryId: 1,
        key: "ITEM" + String(offset + index).padStart(4, "0"),
      }));
    const result = await tool.preflight!(
      {
        collectionRef: { libraryId: 1, key: "COLL0001" },
        add: refs(0),
        remove: refs(60),
      } as never,
      preflightContext() as never,
    );
    assert.equal(result.status, "failed");
    assert.equal((result as { code: string }).code, "resource_limited");
    assert.equal(calls.identity, 0);
    assert.lengthOf(calls.results, 0);
  });

  it("records the durable mutation identity before dispatch and never publishes success on failure", async function () {
    const recorded: string[][] = [];
    const { calls, dependencies } = mutationDependencies();
    const tool = mutationTool(
      {
        ...dependencies,
        identity: async () => {
          calls.identity += 1;
          return {
            operationId: "zotero-op",
            generatedSourceReferenceIds: ["source-ref-1"],
          };
        },
        recordSourceIds: async (_context, ids) => {
          recorded.push([...ids]);
        },
      },
      "item.update_tags",
    );
    const result = await tool.preflight!(
      {
        itemRef: { libraryId: 1, key: "ITEM0001" },
        add: [],
        remove: [],
      } as never,
      preflightContext() as never,
    );
    assert.equal(calls.identity, 1);
    assert.deepEqual(recorded, [["source-ref-1"]]);
    assert.equal(result.status, "failed");
    assert.equal(calls.results.length, 0);
  });

  it("refuses attachment staging when the owner workspace cannot prepare a stored attachment", async function () {
    const { calls, dependencies } = mutationDependencies();
    const tool = mutationTool(dependencies, "attachment.import");
    const result = await tool.preflight!(
      {
        placement: { kind: "child", parentRef: { libraryId: 1, key: "P" } },
        path: "imports/paper.pdf",
      } as never,
      preflightContext() as never,
    );
    assert.equal(result.status, "failed");
    assert.equal((result as { code: string }).code, "unavailable");
    assert.equal(calls.identity, 0);
  });
});
const NAVIGATION_MAPPINGS = [
  ["navigation.focus_zotero", "zotero_focus_zotero", "focusZotero", {}],
  [
    "navigation.select_library_view",
    "zotero_select_library_view",
    "selectLibraryView",
    { libraryId: 1, view: "library" },
  ],
  [
    "navigation.select_collection",
    "zotero_select_collection",
    "selectCollection",
    { libraryId: 1, key: "COLL0001" },
  ],
  [
    "navigation.select_saved_search",
    "zotero_select_saved_search",
    "selectSavedSearch",
    { libraryId: 1, key: "SEAR0001" },
  ],
  [
    "navigation.reveal_items",
    "zotero_reveal_items",
    "revealItems",
    { items: [{ libraryId: 1, key: "ITEM0001" }] },
  ],
  [
    "navigation.open_item",
    "zotero_open_item",
    "openItem",
    { libraryId: 1, key: "ITEM0001" },
  ],
  [
    "navigation.open_reader_location",
    "zotero_open_reader_location",
    "openReaderLocation",
    {
      kind: "page",
      attachment: { libraryId: 1, key: "ATTACH01" },
      pageIndex: 0,
    },
  ],
] as const;

const navigationTarget = {
  resolveAndValidate: () => null,
};

function navigationCatalog(
  broker: ZoteroHostCapabilityBroker = createFailClosedZoteroHostCapabilityBroker(),
) {
  return createZoteroNativeToolDefinitions({
    broker,
    workspace,
    navigationTarget,
  });
}

function navigationTool(
  broker: ZoteroHostCapabilityBroker,
  capabilityId: string,
) {
  const tool = navigationCatalog(broker).find(
    (definition) => definition.capabilityId === capabilityId,
  );
  assert.isDefined(tool, capabilityId);
  return tool!;
}

describe("Pi Zotero Native Navigation Tool Catalog", function () {
  it("projects the seven navigation tools only with trusted foreground authority", function () {
    const without = createZoteroNativeToolDefinitions({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      workspace,
    });
    assert.lengthOf(without, 15);
    assert.notInclude(
      without.map((definition) => definition.capabilityId),
      "navigation.focus_zotero",
    );
    const catalog = navigationCatalog();
    assert.lengthOf(catalog, 22);
    const navigation = catalog.filter((definition) =>
      definition.capabilityId.startsWith("navigation."),
    );
    assert.lengthOf(navigation, 7);
    assert.sameMembers(
      navigation.map((definition) => definition.name),
      NAVIGATION_MAPPINGS.map(([, name]) => name),
    );
    for (const definition of navigation) {
      assert.deepEqual(definition.minimumEffects, ["host-control"]);
      assert.isTrue(definition.requiresForegroundConversation);
      assert.equal(definition.batchMode, "single-per-batch");
      assert.include(definition.description.toLowerCase(), "foreground");
      const schema = definition.schema as Record<string, unknown>;
      assert.isTrue(
        schema.additionalProperties === false || Array.isArray(schema.anyOf),
        definition.capabilityId,
      );
    }
  });

  it("dispatches each navigation mapping through only its canonical Broker member", async function () {
    for (const [capabilityId, , member, args] of NAVIGATION_MAPPINGS) {
      const seen: unknown[] = [];
      const broker = createFailClosedZoteroHostCapabilityBroker({
        navigation: {
          [member]: async (...rest: unknown[]) => {
            seen.push(rest.at(-1));
            return { outcome: "dispatched" };
          },
        },
      } as never);
      const tool = navigationTool(broker, capabilityId);
      assert.deepEqual(await tool.classify(args as never), {
        effects: ["host-control"],
        authorizationKeys: [],
        resourceKeys: [],
        cost: 1,
      });
      const execution = await tool.execute(args as never, {
        signal: new AbortController().signal,
        onUpdate: () => undefined,
      });
      assert.equal(execution.status, "completed", capabilityId);
      assert.equal(execution.effectCertainty, "confirmed_complete");
      assert.lengthOf(seen, 1, capabilityId);
      const control = seen[0] as {
        target?: unknown;
        signal?: unknown;
        onEffectStarted?: unknown;
      };
      assert.equal(control.target, navigationTarget, capabilityId);
      assert.isOk(control.signal, capabilityId);
      assert.isFunction(control.onEffectStarted, capabilityId);
    }
  });

  it("conservatively reports effect certainty at the Broker first-effect boundary", async function () {
    const runOpenItem = async (
      member: (
        ref: unknown,
        control: { onEffectStarted?: () => void },
      ) => Promise<unknown>,
    ) => {
      const broker = createFailClosedZoteroHostCapabilityBroker({
        navigation: { openItem: member },
      } as never);
      return navigationTool(broker, "navigation.open_item").execute(
        { libraryId: 1, key: "ITEM0001" } as never,
        { signal: new AbortController().signal, onUpdate: () => undefined },
      );
    };
    const preEffect = await runOpenItem(async () => {
      throw new ZoteroHostCapabilityError(
        "unavailable",
        "private navigation prose",
        { reason: "navigation", kind: "library" },
        true,
      );
    });
    assert.equal(preEffect.status, "failed");
    assert.equal(preEffect.code, "unavailable");
    assert.equal(preEffect.effectCertainty, "confirmed_none");
    assert.equal(preEffect.retryable, true);
    assert.deepEqual(preEffect.details, {
      reason: "navigation",
      kind: "library",
    });
    assert.notInclude(JSON.stringify(preEffect), "private navigation prose");

    const postEffect = await runOpenItem(async (_ref, control) => {
      control.onEffectStarted?.();
      throw new ZoteroHostCapabilityError("execution_failed", "private", {
        phase: "adapter",
        recovery: "none",
      });
    });
    assert.equal(postEffect.status, "failed");
    assert.equal(postEffect.effectCertainty, "unknown");
    assert.equal(postEffect.code, "execution_failed");

    const nativeUnknown = await runOpenItem(async (_ref, control) => {
      control.onEffectStarted?.();
      throw new Error("private native cause");
    });
    assert.equal(nativeUnknown.status, "failed");
    assert.equal(nativeUnknown.effectCertainty, "unknown");
    assert.equal(nativeUnknown.code, "internal_error");
    assert.notProperty(nativeUnknown, "details");
    assert.notInclude(JSON.stringify(nativeUnknown), "private native cause");

    const settled = await runOpenItem(async (_ref, control) => {
      control.onEffectStarted?.();
      return { outcome: "dispatched" };
    });
    assert.equal(settled.status, "completed");
    assert.equal(settled.effectCertainty, "confirmed_complete");
  });

  it("rejects a raw Reader field before dispatch and admits foreground navigation without permission", async function () {
    let calls = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      navigation: {
        openReaderLocation: async () => {
          calls += 1;
          return { outcome: "reader_location_dispatched" };
        },
      },
    } as never);
    const definitions = [
      ...createZoteroNativeToolDefinitions({
        broker,
        workspace,
        navigationTarget,
      }),
    ];
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner" },
      turnId: "navigation",
      definitions,
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["host-control"],
        authorizedEffects: [],
        authorizedKeys: [],
        maxCalls: 4,
        maxConcurrent: 1,
        maxCost: 4,
      },
      runtimeCapability: {
        identity: "navigation",
        availableCapabilityIds: definitions.map(
          (definition) => definition.capabilityId,
        ),
      },
      foregroundConversation: () => true,
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    const page = {
      kind: "page",
      attachment: { libraryId: 1, key: "ATTACH01" },
      pageIndex: 0,
    };
    const admitted = await gateway.executeBatch([
      {
        callId: "navigation-1",
        name: "zotero_open_reader_location",
        arguments: page,
      },
    ]);
    assert.equal(admitted.results[0].status, "completed");
    assert.lengthOf(admitted.pending, 0);
    const malformed = await gateway.executeBatch([
      {
        callId: "navigation-2",
        name: "zotero_open_reader_location",
        arguments: { ...page, rawNative: true },
      },
    ]);
    assert.equal(malformed.results[0].failure?.code, "invalid_request");
    assert.equal(calls, 1);
    const conflicting = await gateway.executeBatch([
      {
        callId: "navigation-3",
        name: "zotero_open_reader_location",
        arguments: page,
      },
      {
        callId: "navigation-4",
        name: "zotero_open_reader_location",
        arguments: page,
      },
    ]);
    assert.equal(conflicting.results[0].failure?.code, "invalid_request");
    assert.equal(conflicting.results[1].failure?.code, "invalid_request");
    assert.equal(calls, 1);
  });

  it("omits foreground navigation from a catalog without trusted conversation context", async function () {
    const definitions = navigationCatalog();
    const gateway = await freezePiToolGatewayTurn({
      owner: { kind: "conversation", ownerId: "owner" },
      turnId: "hidden-navigation",
      definitions: [...definitions],
      policy: {
        mode: "interactive",
        systemAllowedEffects: ["host-control"],
        authorizedEffects: [],
        authorizedKeys: [],
        maxCalls: 1,
        maxConcurrent: 1,
        maxCost: 1,
      },
      runtimeCapability: {
        identity: "hidden-navigation",
        availableCapabilityIds: definitions.map(
          (definition) => definition.capabilityId,
        ),
      },
      hooks: {
        recordStarted: async () => undefined,
        recordReceipt: async () => undefined,
        recordPermission: async () => undefined,
      },
    });
    assert.lengthOf(gateway.catalog.tools, 15);
    assert.notInclude(
      gateway.catalog.tools.map((tool) => tool.capabilityId),
      "navigation.focus_zotero",
    );
  });

  it("exposes fifteen reads, twenty-three mutations and seven navigation tools together", function () {
    const catalog = createZoteroNativeToolDefinitions({
      broker: createFailClosedZoteroHostCapabilityBroker(),
      workspace,
      mutations: mutationDependencies().dependencies as never,
      navigationTarget,
    });
    assert.lengthOf(catalog, 45);
    assert.lengthOf(
      catalog.filter((definition) =>
        definition.capabilityId.startsWith("navigation."),
      ),
      7,
    );
    assert.lengthOf(
      catalog.filter((definition) =>
        MUTATION_MAPPINGS.some(
          ([capabilityId]) => capabilityId === definition.capabilityId,
        ),
      ),
      23,
    );
  });
});
