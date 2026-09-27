import { assert } from "chai";
import {
  createWorkflowNoteImagePreparation,
  createWorkflowPreparedImageScope,
} from "../../src/workflows/workflowNoteImagePreparation";
import { withWorkflowHostLeafScope } from "../../src/workflows/hostApi";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function createPortableImageAdapter(encodedBytes = 32) {
  return {
    async readPathBlob(path: string, mimeType: string) {
      assert.isNotEmpty(path);
      return new Blob([PNG_SIGNATURE], { type: mimeType });
    },
    async decode() {
      return { image: {}, width: 20, height: 10, close() {} };
    },
    createEncoder() {
      return {
        async encode(mimeType: "image/jpeg" | "image/png") {
          return new Blob([new Uint8Array(encodedBytes)], { type: mimeType });
        },
      };
    },
  };
}

function captureError(fn: () => unknown) {
  let captured: unknown;
  try {
    fn();
  } catch (error) {
    captured = error;
  }
  assert.instanceOf(captured, Error);
  return captured as Error & {
    code?: string;
    details?: { reason?: string };
  };
}

async function captureAsyncError(fn: () => Promise<unknown>) {
  let captured: unknown;
  try {
    await fn();
  } catch (error) {
    captured = error;
  }
  assert.instanceOf(captured, Error);
  return captured as Error & { code?: string };
}

describe("Workflow Note Image Preparation", function () {
  it("prepares portable sources as opaque run-scoped refs and cleans them at terminal", async function () {
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "run-a",
      adapter: createPortableImageAdapter(),
      async readResourceBlob(ref) {
        assert.strictEqual(ref.id, "input-image");
        return new Blob([PNG_SIGNATURE], { type: "image/png" });
      },
      createScopeToken: () => "scope-a",
      createRefId: () => "prepared-1",
    });

    const prepared = await scope.owner.prepareForNoteEmbedding({
      source: {
        kind: "base64",
        data: "iVBORw0KGgo=",
        mimeType: "image/png",
      },
      options: { outputFormat: "png" },
    });

    assert.deepEqual(prepared.ref, {
      kind: "prepared_note_image",
      id: "scope-a:prepared-1",
    });
    assert.strictEqual(prepared.mimeType, "image/png");
    assert.strictEqual(prepared.bytes, 32);
    assert.match(prepared.sha256, /^[a-f0-9]{64}$/);
    assert.strictEqual(scope.resolve(prepared.ref).blob.size, 32);

    scope.dispose();
    assert.strictEqual(
      captureError(() => scope.resolve(prepared.ref)).code,
      "not_found",
    );
    scope.dispose();
  });

  it("routes file and managed-resource sources through their owned readers", async function () {
    const seen: string[] = [];
    const adapter = createPortableImageAdapter();
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "run-readers",
      adapter: {
        ...adapter,
        async readPathBlob(path, mimeType) {
          seen.push(`file:${path}:${mimeType}`);
          return new Blob([PNG_SIGNATURE], { type: "image/png" });
        },
      },
      async readResourceBlob(ref) {
        seen.push(`resource:${ref.id}`);
        return new Blob([PNG_SIGNATURE], { type: "image/png" });
      },
    });

    await scope.owner.prepareForNoteEmbedding({
      source: { kind: "file", path: "/tmp/input.png" },
      options: { outputFormat: "png" },
    });
    await scope.owner.prepareForNoteEmbedding({
      source: {
        kind: "resource",
        resourceRef: { kind: "workflow_resource", id: "resource-a" },
      },
      options: { outputFormat: "png" },
    });

    assert.deepEqual(seen, [
      "file:/tmp/input.png:image/png",
      "resource:resource-a",
    ]);
  });

  it("rejects invalid options and source signatures before decoding", async function () {
    let decoded = false;
    const adapter = {
      ...createPortableImageAdapter(),
      async decode() {
        decoded = true;
        return { image: {}, width: 1, height: 1, close() {} };
      },
    };
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "run-invalid",
      adapter,
    });

    for (const request of [
      {
        source: { kind: "base64" as const, data: "bm90LWltYWdl" },
      },
      {
        source: {
          kind: "base64" as const,
          data: "iVBORw0KGgo=",
          mimeType: "image/jpeg",
        },
      },
      {
        source: { kind: "base64" as const, data: "iVBORw0KGgo=" },
        options: { maxLongEdge: 8193 },
      },
      {
        source: { kind: "base64" as const, data: "iVBORw0KGgo=" },
        options: { targetBytes: 11, hardMaxBytes: 10 },
      },
    ]) {
      await captureAsyncError(() =>
        scope.owner.prepareForNoteEmbedding(request),
      );
    }
    assert.isFalse(decoded);
  });

  it("enforces the encoded input, output, dimension, and live-run hard bounds", async function () {
    this.timeout(30_000);
    const MiB = 1024 * 1024;
    let decodedOversizedInput = false;
    const inputScope = createWorkflowPreparedImageScope({
      runScopeId: "run-input-bound",
      adapter: {
        ...createPortableImageAdapter(),
        async readPathBlob() {
          return new Blob(
            [
              PNG_SIGNATURE,
              new Uint8Array(32 * MiB + 1 - PNG_SIGNATURE.byteLength),
            ],
            { type: "image/png" },
          );
        },
        async decode() {
          decodedOversizedInput = true;
          return { image: {}, width: 1, height: 1, close() {} };
        },
      },
    });
    assert.strictEqual(
      (
        await captureAsyncError(() =>
          inputScope.owner.prepareForNoteEmbedding({
            source: { kind: "file", path: "/tmp/large.png" },
          }),
        )
      ).code,
      "resource_limited",
    );
    assert.isFalse(decodedOversizedInput);

    const oversizedOutput = createWorkflowPreparedImageScope({
      runScopeId: "run-output-bound",
      adapter: createPortableImageAdapter(8 * MiB + 1),
    });
    assert.strictEqual(
      (
        await captureAsyncError(() =>
          oversizedOutput.owner.prepareForNoteEmbedding({
            source: { kind: "base64", data: "iVBORw0KGgo=" },
            options: {
              maxLongEdge: 8192,
              targetBytes: 8 * MiB,
              hardMaxBytes: 8 * MiB,
              outputFormat: "png",
            },
          }),
        )
      ).code,
      "resource_limited",
    );

    const sharedOutput = new Blob([new Uint8Array(8 * MiB)], {
      type: "image/png",
    });
    const liveScope = createWorkflowPreparedImageScope({
      runScopeId: "run-live-bound",
      adapter: {
        ...createPortableImageAdapter(),
        async decode() {
          return { image: {}, width: 16_000, height: 8_000, close() {} };
        },
        createEncoder() {
          return {
            async encode() {
              return sharedOutput;
            },
          };
        },
      },
    });
    let first: Awaited<
      ReturnType<typeof liveScope.owner.prepareForNoteEmbedding>
    > | null = null;
    for (let index = 0; index < 8; index += 1) {
      const prepared = await liveScope.owner.prepareForNoteEmbedding({
        source: { kind: "base64", data: "iVBORw0KGgo=" },
        options: {
          maxLongEdge: 8192,
          targetBytes: 8 * MiB,
          hardMaxBytes: 8 * MiB,
          outputFormat: "png",
        },
      });
      first ||= prepared;
    }
    assert.deepInclude(first, { width: 8192, height: 4096 });
    assert.strictEqual(
      (
        await captureAsyncError(() =>
          liveScope.owner.prepareForNoteEmbedding({
            source: { kind: "base64", data: "iVBORw0KGgo=" },
            options: {
              targetBytes: 8 * MiB,
              hardMaxBytes: 8 * MiB,
              outputFormat: "png",
            },
          }),
        )
      ).code,
      "resource_limited",
    );
    inputScope.dispose();
    oversizedOutput.dispose();
    liveScope.dispose();
  });

  it("distinguishes foreign, forged, and expired prepared refs", async function () {
    const scopeA = createWorkflowPreparedImageScope({
      runScopeId: "run-a",
      adapter: createPortableImageAdapter(),
      createRefId: () => "a",
    });
    const scopeB = createWorkflowPreparedImageScope({
      runScopeId: "run-b",
      adapter: createPortableImageAdapter(),
    });
    const prepared = await scopeA.owner.prepareForNoteEmbedding({
      source: { kind: "base64", data: "iVBORw0KGgo=" },
    });

    assert.strictEqual(
      captureError(() => scopeB.resolve(prepared.ref)).details?.reason,
      "foreign_scope",
    );
    assert.strictEqual(
      captureError(() =>
        scopeA.resolve({
          kind: "prepared_note_image",
          id: `${prepared.ref.id.split(":")[0]}:forged`,
        }),
      ).details?.reason,
      "forged",
    );
    scopeA.dispose();
    assert.strictEqual(
      captureError(() => scopeA.resolve(prepared.ref)).code,
      "not_found",
    );
  });

  it("cleans staged prepared refs on success, failure, and cancellation", async function () {
    for (const outcome of ["success", "failure", "canceled"] as const) {
      let captured: {
        resolve: ReturnType<typeof createWorkflowPreparedImageScope>["resolve"];
      } | null = null;
      let preparedRef:
        | Awaited<
            ReturnType<
              ReturnType<
                typeof createWorkflowPreparedImageScope
              >["owner"]["prepareForNoteEmbedding"]
            >
          >["ref"]
        | null = null;
      try {
        await withWorkflowHostLeafScope(
          {
            interactionMode: "interactive",
            runScopeId: `run-${outcome}`,
            logBinding: {
              workflowId: "workflow-a",
              packageId: "package-a",
            },
            imageAdapter: createPortableImageAdapter(),
          },
          async (scope) => {
            captured = scope.preparedImages;
            const prepared = await scope.owners.images.prepareForNoteEmbedding({
              source: { kind: "base64", data: "iVBORw0KGgo=" },
            });
            preparedRef = prepared.ref;
            if (outcome === "failure") throw new Error("expected failure");
            if (outcome === "canceled") {
              await scope.owners.images.prepareForNoteEmbedding(
                { source: { kind: "base64", data: "iVBORw0KGgo=" } },
                { signal: AbortSignal.abort() },
              );
            }
          },
        );
      } catch (error) {
        if (outcome === "success") throw error;
      }
      assert.isOk(captured);
      assert.isOk(preparedRef);
      assert.strictEqual(
        captureError(() => captured!.resolve(preparedRef!)).code,
        "not_found",
      );
    }
  });

  it("bounds a byte source and selects an encoded image within the target", async function () {
    let decodedImageClosed = false;
    const prepare = createWorkflowNoteImagePreparation({
      async readPathBlob() {
        throw new Error("path reads are not expected");
      },
      async decode() {
        return {
          image: {},
          width: 1440,
          height: 720,
          close() {
            decodedImageClosed = true;
          },
        };
      },
      createEncoder(args) {
        assert.strictEqual(args.width, 720);
        assert.strictEqual(args.height, 360);
        assert.strictEqual(args.background, "#ffffff");
        return {
          async encode(mimeType, quality) {
            assert.strictEqual(mimeType, "image/jpeg");
            const size = Number(quality) > 0.78 ? 200 : 120;
            return new Blob([new Uint8Array(size)], { type: mimeType });
          },
        };
      },
    });

    const prepared = await prepare(
      {
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png",
      },
      {
        maxLongEdge: 720,
        targetBytes: 150,
        hardMaxBytes: 300,
      },
    );

    assert.strictEqual(prepared.width, 720);
    assert.strictEqual(prepared.height, 360);
    assert.strictEqual(prepared.originalBytes, 3);
    assert.isAtMost(prepared.compressedBytes, 150);
    assert.strictEqual(prepared.mimeType, "image/jpeg");
    assert.strictEqual(prepared.diagnostics?.sourceMimeType, "image/png");
    assert.isTrue(decodedImageClosed);
  });

  it("materializes a path source through the runtime adapter and preserves its file name", async function () {
    let requestedPath = "";
    const prepare = createWorkflowNoteImagePreparation({
      async readPathBlob(path, mimeType) {
        requestedPath = path;
        return new Blob([new Uint8Array(40)], { type: mimeType });
      },
      async decode() {
        return { image: {}, width: 20, height: 10, close() {} };
      },
      createEncoder() {
        return {
          async encode(mimeType) {
            return new Blob([new Uint8Array(30)], { type: mimeType });
          },
        };
      },
    });

    const prepared = await prepare("/tmp/figure.png", {
      outputMimeType: "image/png",
    });

    assert.strictEqual(requestedPath, "/tmp/figure.png");
    assert.strictEqual(prepared.fileName, "figure.png");
    assert.strictEqual(prepared.mimeType, "image/png");
    assert.strictEqual(prepared.originalBytes, 40);
  });

  it("rejects an encoded image above the hard cap and releases the decoder", async function () {
    let decodedImageClosed = false;
    const prepare = createWorkflowNoteImagePreparation({
      async readPathBlob() {
        throw new Error("path reads are not expected");
      },
      async decode() {
        return {
          image: {},
          width: 10,
          height: 10,
          close() {
            decodedImageClosed = true;
          },
        };
      },
      createEncoder() {
        return {
          async encode(mimeType) {
            return new Blob([new Uint8Array(101)], { type: mimeType });
          },
        };
      },
    });

    try {
      await prepare(
        { blob: new Blob([new Uint8Array(8)], { type: "image/webp" }) },
        { targetBytes: 50, hardMaxBytes: 100 },
      );
      assert.fail("expected the hard cap to reject the image");
    } catch (error) {
      assert.include(String(error), "exceeds hard cap");
    }
    assert.isTrue(decodedImageClosed);
  });

  it("surfaces an unavailable decoding runtime without creating an encoder", async function () {
    let encoderCreated = false;
    const prepare = createWorkflowNoteImagePreparation({
      async readPathBlob() {
        throw new Error("path reads are not expected");
      },
      async decode() {
        throw new Error("Canvas image decoder is unavailable");
      },
      createEncoder() {
        encoderCreated = true;
        throw new Error("encoder should not be created");
      },
    });

    try {
      await prepare({ bytes: new Uint8Array([1]) });
      assert.fail("expected the unavailable decoder to fail");
    } catch (error) {
      assert.include(String(error), "decoder is unavailable");
    }
    assert.isFalse(encoderCreated);
  });
});
