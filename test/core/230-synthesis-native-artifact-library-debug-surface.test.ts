import { assert } from "chai";
import fs from "node:fs";
import path from "node:path";
import { SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES } from "../../packages/synthesis-contracts/src/sidecarSystem";
import { inspectSynthesisArtifactLibraryDebugSurfaceParity } from "../../scripts/check-synthesis-artifact-library-debug-surface-parity";
import { createScopedSynthesisReverseHostHandlers } from "../../src/modules/synthesisReverseHostHandlers";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OWNED = [
  "client.debugSynthesisCacheList",
  "client.debugSynthesisDiff",
  "client.debugSynthesisOperationsList",
  "client.debugSynthesisPaperInspect",
  "client.debugSynthesisProfilerList",
  "client.debugSynthesisSnapshot",
  "client.debugSynthesisTopicInspect",
  "client.exportFilteredPaperArtifacts",
  "client.getLibraryIndex",
  "client.getPaperArtifactManifest",
  "client.getSchemas",
  "client.readPaperArtifacts",
] as const;

describe("Synthesis native Artifact/Library/Debug surface", function () {
  it("keeps its durable corpus complete, bounded, and ready", function () {
    assert.deepEqual(inspectSynthesisArtifactLibraryDebugSurfaceParity(), {
      ok: true,
      operations: 12,
      errors: [],
    });
  });

  it("uses one closed Rust compatibility surface for every owned operation", function () {
    const source = fs.readFileSync(
      path.join(
        ROOT,
        "native/synthesis-sidecar/crates/synthesis-sidecar/src/runtime_artifact_library_debug.rs",
      ),
      "utf8",
    );
    for (const capability of OWNED) {
      assert.include(source, `"${capability}"`);
      assert.include(
        SYNTHESIS_SIDECAR_READY_PRODUCTION_CLIENT_CAPABILITIES,
        capability,
      );
    }
    assert.include(source, '"[redacted-path]"');
    assert.include(source, "delivery.export.publish_archive");
    assert.include(source, "library.artifacts.scan_page");
  });

  it("keeps the language-neutral schema contract out of the dispatcher", function () {
    const schema = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "packages/synthesis-contracts/contract-set/synthesis-artifact-library-debug-surface-v1/schemas.json",
        ),
        "utf8",
      ),
    );
    assert.equal(schema.schema, "synthesis-artifact-library-debug-schemas.v1");
    assert.equal(schema.redaction.local_paths, "[redacted-path]");
  });

  it("injects the plugin library scope and rejects a native-selected scope", async function () {
    const received: Array<Record<string, unknown>> = [];
    const handlers = createScopedSynthesisReverseHostHandlers({
      libraryId: 7,
      hostReadPort: {
        library: {
          async listItemsPage(request) {
            received.push(request);
            return {
              items: [],
              cursor: request.cursor || "",
              nextCursor: request.cursor ? "" : "host-cursor",
              hasMore: !request.cursor,
              returned: 0,
              limit: 50,
            };
          },
          async getItemsByRef() {
            return { items: [], missingPaperRefs: [] };
          },
        },
        artifacts: {
          async scanPage() {
            return {
              artifacts: [],
              cursor: "",
              nextCursor: "",
              hasMore: false,
              returned: 0,
              limit: 50,
            };
          },
          async read() {
            return { status: "missing", diagnostics: [] };
          },
        },
      },
      exportDeliveryPort: {} as never,
      representativeImagePort: {} as never,
      relatedItemsEffectPort: {} as never,
      stagedTagBindingPort: {} as never,
      tagEffectPort: {} as never,
      webDavPort: {} as never,
    });
    const first = (await handlers["library.items.list_page"](
      {},
      {
        requestId: "test",
        operationId: "test",
        deadlineAtMs: Date.now() + 1_000,
      },
    )) as { nextCursor: string };
    assert.deepEqual(received, [{ libraryId: 7, cursor: "" }]);
    assert.match(first.nextCursor, /^host-snapshot-/);
    await handlers["library.items.list_page"](
      { cursor: first.nextCursor },
      {
        requestId: "test",
        operationId: "test-next",
        deadlineAtMs: Date.now() + 1_000,
      },
    );
    assert.deepEqual(received[1], { libraryId: 7, cursor: "host-cursor" });
    let failure: unknown;
    try {
      await handlers["library.items.list_page"](
        { libraryId: 9 },
        {
          requestId: "test",
          operationId: "test",
          deadlineAtMs: Date.now() + 1_000,
        },
      );
    } catch (error) {
      failure = error;
    }
    assert.exists(failure);
  });
});
