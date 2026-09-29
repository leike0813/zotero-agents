import { assert } from "chai";
import {
  freezePiToolGatewayTurn,
  type PiGatewayAttemptReceipt,
  type PiGatewayPolicy,
} from "../../src/modules/piToolGateway";
import { createZoteroNativeToolDefinitions } from "../../src/modules/zoteroNativeToolCatalog";
import { ZoteroHostCapabilityError } from "../../src/modules/zoteroHostCapabilityBroker";
import type { JsonObject } from "../../src/workflows/types";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";

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
    assert.lengthOf(catalog, 14);
    assert.equal(new Set(catalog.map((item) => item.capabilityId)).size, 14);
    assert.equal(new Set(catalog.map((item) => item.name)).size, 14);
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
