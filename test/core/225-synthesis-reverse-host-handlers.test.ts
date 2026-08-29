import { assert } from "chai";
import {
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
  SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
  SYNTHESIS_REVERSE_HOST_CAPABILITIES,
  canonicalizeSynthesisContractJsonArtifact,
  hashSynthesisContractCanonicalJson,
} from "../../packages/synthesis-contracts/src";
import {
  createScopedSynthesisReverseHostHandlers,
  createSynthesisReverseHostHandlers,
} from "../../src/modules/synthesisReverseHostHandlers";

describe("Synthesis reverse Host handlers", function () {
  it("maps every declared operation to one typed Host port method", async function () {
    const calls: string[] = [];
    const result = (name: string) => {
      calls.push(name);
      return Promise.resolve({});
    };
    const entries = [
      {
        path: "runtime/payloads/paper-artifacts-manifest.json",
        text: "{}\n",
      },
    ];
    const content = canonicalizeSynthesisContractJsonArtifact({ entries });
    const rows = [content.text];
    const pageArtifact = canonicalizeSynthesisContractJsonArtifact(rows);
    const descriptor = {
      kind: "content",
      pageIndex: 0,
      rowCount: 1,
      byteLength: pageArtifact.byteLength,
      sha256: pageArtifact.sha256,
    };
    const manifestBody = {
      transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
      encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
      direction: "output" as const,
      header: {
        target: "host_export_entries",
        capability: "paper_artifacts.export_filtered",
        byteLength: content.byteLength,
        sha256: hashSynthesisContractCanonicalJson(content.text),
      },
      pages: [descriptor],
    };
    const rootSha256 = hashSynthesisContractCanonicalJson(manifestBody);
    const handlers = createSynthesisReverseHostHandlers({
      hostReadPort: {
        library: {
          listItemsPage: () => result("library.listItemsPage") as never,
          getItemsByRef: () => result("library.getItemsByRef") as never,
        },
        artifacts: {
          scanPage: () => result("artifacts.scanPage") as never,
          read: () => result("artifacts.read") as never,
        },
      },
      exportDeliveryPort: {
        publishArchive: () => result("delivery.publishArchive") as never,
      },
      runWorkspaceMaterializationPort: {
        materialize: () => result("workspace.materialize") as never,
      },
      representativeImagePort: {
        read: () => result("image.read") as never,
      },
      relatedItemsEffectPort: {
        applyBatch: () => result("related.applyBatch") as never,
      },
      stagedTagBindingPort: {
        resolve: () => result("staged.resolve") as never,
      },
      tagEffectPort: {
        applyBatch: () => result("tags.applyBatch") as never,
      },
      webDavPort: {
        describe: () => result("webdav.describe") as never,
        readText: () => result("webdav.readText") as never,
        writeText: () => result("webdav.writeText") as never,
        ensureCollection: () => result("webdav.ensureCollection") as never,
      },
      exportTransfer: {
        getConnection: () => ({
          baseUrl: "http://127.0.0.1:1",
          profileId: "profile",
          clientToken: "token",
          serviceInstanceId: "service",
        }),
        rpcClient: {
          async call({ payload }: any) {
            if (payload.action === "get_output_manifest") {
              return { ...manifestBody, rootSha256 };
            }
            if (payload.action === "get_output_page") {
              return { descriptor, rows };
            }
            if (payload.action === "cancel") {
              return { canceled: true };
            }
            throw new Error("unexpected transfer action");
          },
        },
      },
    });
    assert.deepEqual(
      Object.keys(handlers).sort(),
      [...SYNTHESIS_REVERSE_HOST_CAPABILITIES].sort(),
    );
    await handlers["library.items.list_page"]({ libraryId: 1 }, {} as never);
    await handlers["library.items.get_by_ref"](
      { libraryId: 1, paperRefs: [] },
      {} as never,
    );
    await handlers["library.artifacts.scan_page"](
      { libraryId: 1 },
      {} as never,
    );
    await handlers["library.artifacts.read"](
      { locator: "x", expectedHash: "y" },
      {} as never,
    );
    await handlers["webdav.describe"]({}, {} as never);
    await handlers["delivery.export.materialize_run_workspace"](
      {
        capability: "paper_artifacts.export_filtered",
        runRoot: "/runtime/acp/skill-runs/acp-skill-test",
        contentTransfer: {
          sessionId: "native-transfer:1",
          rootSha256,
        },
      },
      {} as never,
    );
    assert.deepEqual(calls, [
      "library.listItemsPage",
      "library.getItemsByRef",
      "artifacts.scanPage",
      "artifacts.read",
      "webdav.describe",
      "workspace.materialize",
    ]);
  });

  it("rejects an invalid export transfer before any delivery write", async function () {
    let deliveryCalls = 0;
    const handlers = createSynthesisReverseHostHandlers({
      hostReadPort: {} as never,
      exportDeliveryPort: {
        async publishArchive() {
          deliveryCalls += 1;
          return {} as never;
        },
      },
      runWorkspaceMaterializationPort: {
        async materialize() {
          deliveryCalls += 1;
          return {} as never;
        },
      },
      representativeImagePort: {} as never,
      relatedItemsEffectPort: {} as never,
      stagedTagBindingPort: {} as never,
      tagEffectPort: {} as never,
      webDavPort: {} as never,
      exportTransfer: {
        getConnection: () => ({
          baseUrl: "http://127.0.0.1:1",
          profileId: "profile",
          clientToken: "token",
          serviceInstanceId: "service",
        }),
        rpcClient: {
          async call({ payload }: any) {
            if (payload.action === "get_output_manifest") {
              return {
                transferVersion: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_VERSION,
                encoding: SYNTHESIS_PRODUCTION_CONTENT_TRANSFER_ENCODING,
                direction: "output",
                header: {
                  target: "host_export_entries",
                  capability: "paper_artifacts.export_filtered",
                  byteLength: 2,
                  sha256: `sha256:${"a".repeat(64)}`,
                },
                pages: [],
                rootSha256: `sha256:${"b".repeat(64)}`,
              };
            }
            if (payload.action === "cancel") {
              return { canceled: true };
            }
            throw new Error("unexpected transfer action");
          },
        },
      },
    });
    let failure: unknown;
    try {
      await handlers["delivery.export.materialize_run_workspace"](
        {
          capability: "paper_artifacts.export_filtered",
          runRoot: "/runtime/acp/skill-runs/acp-skill-test",
          contentTransfer: {
            sessionId: "native-transfer:bad",
            rootSha256: `sha256:${"c".repeat(64)}`,
          },
        },
        {} as never,
      );
    } catch (error) {
      failure = error;
    }
    assert.exists(failure);
    assert.equal(deliveryCalls, 0);
  });

  it("rejects undeclared payload authority before calling a Host port", async function () {
    let called = false;
    const handlers = createSynthesisReverseHostHandlers({
      hostReadPort: {
        library: {
          listItemsPage: async () => {
            called = true;
            return {} as never;
          },
          getItemsByRef: async () => ({}) as never,
        },
        artifacts: {
          scanPage: async () => ({}) as never,
          read: async () => ({}) as never,
        },
      },
      exportDeliveryPort: {} as never,
      runWorkspaceMaterializationPort: {} as never,
      representativeImagePort: {} as never,
      relatedItemsEffectPort: {} as never,
      stagedTagBindingPort: {} as never,
      tagEffectPort: {} as never,
      webDavPort: {} as never,
    });
    let failure: unknown;
    try {
      await handlers["library.items.list_page"](
        { libraryId: 1, path: "/unsafe" },
        {} as never,
      );
    } catch (error) {
      failure = error;
    }
    assert.exists(failure);
    assert.isFalse(called);
  });

  it("injects library authority and keeps one revision across a paged snapshot", async function () {
    const pageRequests: Array<{
      libraryId: number;
      cursor?: string;
      limit?: number;
    }> = [];
    const byRefRequests: Array<{
      libraryId: number;
      paperRefs: string[];
    }> = [];
    const handlers = createScopedSynthesisReverseHostHandlers({
      libraryId: 7,
      hostReadPort: {
        library: {
          async listItemsPage(request) {
            pageRequests.push(request);
            return {
              items: [],
              cursor: request.cursor || "",
              nextCursor: request.cursor ? "" : "source-next",
              hasMore: !request.cursor,
              returned: 0,
              limit: request.limit || 100,
            };
          },
          async getItemsByRef(request) {
            byRefRequests.push(request);
            return {
              items: [],
              missingPaperRefs: [...request.paperRefs],
            };
          },
        },
        artifacts: {
          scanPage: async () => ({}) as never,
          read: async () => ({}) as never,
        },
      },
      exportDeliveryPort: {} as never,
      runWorkspaceMaterializationPort: {} as never,
      representativeImagePort: {} as never,
      relatedItemsEffectPort: {} as never,
      stagedTagBindingPort: {} as never,
      tagEffectPort: {} as never,
      webDavPort: {} as never,
    });

    const first = (await handlers["library.items.list_page"](
      { limit: 100 },
      {} as never,
    )) as {
      nextCursor: string;
      snapshotRevision: string;
    };
    const second = (await handlers["library.items.list_page"](
      { cursor: first.nextCursor, limit: 100 },
      {} as never,
    )) as {
      nextCursor: string;
      snapshotRevision: string;
    };
    await handlers["library.items.get_by_ref"](
      { paperRefs: ["7:AAAA1111"] },
      {} as never,
    );

    assert.isNotEmpty(first.nextCursor);
    assert.equal(second.nextCursor, "");
    assert.isNotEmpty(first.snapshotRevision);
    assert.equal(second.snapshotRevision, first.snapshotRevision);
    assert.deepEqual(pageRequests, [
      { libraryId: 7, cursor: "", limit: 100 },
      { libraryId: 7, cursor: "source-next", limit: 100 },
    ]);
    assert.deepEqual(byRefRequests, [
      { libraryId: 7, paperRefs: ["7:AAAA1111"] },
    ]);

    let failure: unknown;
    try {
      await handlers["library.items.get_by_ref"](
        { libraryId: 8, paperRefs: [] },
        {} as never,
      );
    } catch (error) {
      failure = error;
    }
    assert.exists(failure);
  });
});
