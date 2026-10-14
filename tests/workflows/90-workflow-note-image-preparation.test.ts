import { assert } from "chai";
import {
  createWorkflowPreparedImageScope,
  shutdownWorkflowNoteImagePreparation,
} from "../../src/workflows/workflowNoteImagePreparation";
import {
  createWorkflowHostApi,
  withWorkflowHostLeafScope,
} from "../../src/workflows/hostApi";
import { createCancellationController } from "../../src/utils/wait";
import {
  processNoteImage,
  type NoteImageWorker,
} from "../../src/platform/noteImageProcessing";

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function createPortableImageAdapter(encodedBytes = 32) {
  return {
    async readPathBlob(path: string, mimeType: string) {
      assert.isNotEmpty(path);
      return new Blob([PNG_SIGNATURE], { type: mimeType });
    },
    async process(
      request: import("../../src/platform/noteImageProcessingContract").NoteImageProcessingRequest,
    ) {
      return {
        bytes: request.options.preserveSourceBytes
          ? request.bytes
          : new Uint8Array(encodedBytes),
        mimeType: request.options.preserveSourceBytes
          ? (request.mimeType as "image/png" | "image/jpeg")
          : request.options.outputMimeType,
        width: 20,
        height: 10,
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
  it("inherits hook cancellation unless the caller explicitly supplies control", async function () {
    const defaultControl = { signal: createCancellationController().signal };
    const seen: unknown[] = [];
    const host = createWorkflowHostApi({
      defaultControl,
      owners: {
        images: {
          async prepareForNoteEmbedding(_input, control) {
            seen.push(control);
            return {} as any;
          },
        },
      },
    });
    const input = { source: { kind: "base64" as const, data: "iVBORw0KGgo=" } };
    await host.images.prepareForNoteEmbedding(input);
    const explicit = {};
    await host.images.prepareForNoteEmbedding(input, explicit);
    assert.strictEqual(seen[0], defaultControl);
    assert.strictEqual(seen[1], explicit);
  });

  it("enforces one deadline across reading and processing", async function () {
    const originalNow = Date.now;
    let now = originalNow();
    let processCalls = 0;
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "total-budget",
      adapter: {
        async readPathBlob() {
          now += 20_000;
          return new Blob([PNG_SIGNATURE], { type: "image/png" });
        },
        async process(request) {
          processCalls++;
          now += 10_001;
          return createPortableImageAdapter().process(request);
        },
      },
    });
    Date.now = () => now;
    try {
      const error = await captureAsyncError(() =>
        scope.owner.prepareForNoteEmbedding({
          source: { kind: "file", path: "image.png" },
        }),
      );
      assert.equal(error.code, "resource_limited");
      assert.equal(processCalls, 1);
    } finally {
      Date.now = originalNow;
      scope.dispose();
    }
  });
  for (const terminal of ["caller", "shutdown", "timeout"] as const) {
    it(`ends a pending read on ${terminal} and ignores its late result`, async function () {
      const controller = createCancellationController();
      let release!: (blob: Blob) => void;
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let processed = 0;
      const scope = createWorkflowPreparedImageScope({
        runScopeId: terminal,
        adapter: {
          readPathBlob() {
            entered();
            return new Promise((resolve) => {
              release = resolve;
            });
          },
          async process(request) {
            processed++;
            return createPortableImageAdapter().process(request);
          },
        },
      });
      const originalSetTimeout = globalThis.setTimeout;
      if (terminal === "timeout")
        globalThis.setTimeout = ((callback, delay, ...args) =>
          originalSetTimeout(
            callback,
            delay === 30_000 ? 5 : delay,
            ...args,
          )) as typeof setTimeout;
      try {
        const pending = captureAsyncError(() =>
          scope.owner.prepareForNoteEmbedding(
            { source: { kind: "file", path: "image.png" } },
            { signal: controller.signal },
          ),
        );
        await started;
        if (terminal === "caller") controller.abort();
        if (terminal === "shutdown") shutdownWorkflowNoteImagePreparation();
        const error = await pending;
        assert.equal(
          error.code,
          terminal === "timeout" ? "resource_limited" : "canceled",
        );
        if (terminal === "timeout")
          assert.include((error as any).details, {
            resource: "duration_ms",
            limit: 30_000,
          });
        release(new Blob([PNG_SIGNATURE], { type: "image/png" }));
        await new Promise((resolve) => originalSetTimeout(resolve, 0));
        assert.equal(processed, 0);
      } finally {
        globalThis.setTimeout = originalSetTimeout;
        scope.dispose();
      }
    });
  }

  it("preserves source bytes while still validating dimensions through the processor", async function () {
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "preserved",
      adapter: createPortableImageAdapter(),
    });
    const dto = await scope.owner.prepareForNoteEmbedding({
      source: { kind: "base64", data: "iVBORw0KGgo=" },
      options: { preserveSourceBytes: true },
    });
    assert.equal(dto.mimeType, "image/png");
    assert.deepEqual(
      new Uint8Array(await scope.resolve(dto.ref).blob.arrayBuffer()),
      PNG_SIGNATURE,
    );
    scope.dispose();
  });

  for (const outcome of [
    "success",
    "error",
    "messageerror",
    "cancel",
  ] as const) {
    it(`terminates the owned worker and clears handlers on ${outcome}`, async function () {
      let terminated = 0;
      const controller = createCancellationController();
      const worker: NoteImageWorker = {
        onmessage: null,
        onerror: null,
        onmessageerror: null,
        postMessage() {},
        terminate() {
          terminated++;
        },
      };
      const pending = processNoteImage(
        {
          bytes: PNG_SIGNATURE.slice(),
          mimeType: "image/png",
          options: {
            maxLongEdge: 720,
            targetBytes: 180 * 1024,
            hardMaxBytes: 320 * 1024,
            outputMimeType: "image/jpeg",
            preserveSourceBytes: false,
          },
        },
        controller.signal,
        () => worker,
      );
      const late = worker.onmessage!;
      const result = {
        bytes: new Uint8Array(20),
        mimeType: "image/jpeg" as const,
        width: 20,
        height: 10,
      };
      if (outcome === "success")
        worker.onmessage!({ data: { ok: true, result } });
      if (outcome === "error")
        worker.onerror!({
          message: "decode failed",
          preventDefault() {},
        } as ErrorEvent);
      if (outcome === "messageerror") worker.onmessageerror!();
      if (outcome === "cancel") controller.abort();
      if (outcome === "success") assert.deepEqual(await pending, result);
      else
        assert.equal(
          (await captureAsyncError(() => pending)).code,
          outcome === "cancel" ? "canceled" : "execution_failed",
        );
      late({ data: { ok: true, result } });
      assert.equal(terminated, 1);
      assert.isNull(worker.onmessage);
      assert.isNull(worker.onerror);
      assert.isNull(worker.onmessageerror);
    });
  }

  it("terminates a nonresponding worker when the total budget expires", async function () {
    let terminated = 0;
    const worker: NoteImageWorker = {
      onmessage: null,
      onerror: null,
      onmessageerror: null,
      postMessage() {},
      terminate() {
        terminated++;
      },
    };
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "worker-timeout",
      adapter: {
        ...createPortableImageAdapter(),
        process: (request, control) =>
          processNoteImage(request, control?.signal, () => worker),
      },
    });
    const original = globalThis.setTimeout;
    globalThis.setTimeout = ((callback, delay, ...args) =>
      original(
        callback,
        delay === 30_000 ? 5 : delay,
        ...args,
      )) as typeof setTimeout;
    try {
      const error = await captureAsyncError(() =>
        scope.owner.prepareForNoteEmbedding({
          source: { kind: "base64", data: "iVBORw0KGgo=" },
        }),
      );
      assert.equal(error.code, "resource_limited");
      assert.equal(terminated, 1);
      assert.isNull(worker.onmessage);
    } finally {
      globalThis.setTimeout = original;
      scope.dispose();
    }
  });
  it("cancels an in-flight preparation when its scope is disposed", async function () {
    let decode!: (value: any) => void;
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    let registered = 0;
    const scope = createWorkflowPreparedImageScope({
      runScopeId: "disposed-inflight",
      createRefId: () => {
        registered += 1;
        return "late";
      },
      adapter: {
        ...createPortableImageAdapter(),
        process() {
          entered();
          return new Promise((resolve) => {
            decode = resolve;
          });
        },
      },
    });
    const pending = scope.owner
      .prepareForNoteEmbedding({
        source: { kind: "base64", data: "iVBORw0KGgo=" },
      })
      .then(
        () => "succeeded",
        (error) => error.code,
      );
    await started;
    scope.dispose();
    const outcome = await Promise.race([
      pending,
      new Promise((resolve) => setTimeout(() => resolve("still-pending"), 50)),
    ]);
    decode({
      bytes: new Uint8Array(32),
      mimeType: "image/jpeg",
      width: 20,
      height: 10,
    });
    await pending;
    assert.equal(outcome, "canceled");
    assert.equal(registered, 0);
  });

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
      async process(request) {
        decoded = true;
        return createPortableImageAdapter().process(request);
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
        async process(request) {
          decodedOversizedInput = true;
          return createPortableImageAdapter().process(request);
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
        async process() {
          return {
            bytes: new Uint8Array(await sharedOutput.arrayBuffer()),
            mimeType: "image/png",
            width: 8192,
            height: 4096,
          };
        },
      },
    });
    let first: Awaited<
      ReturnType<typeof liveScope.owner.prepareForNoteEmbedding>
    > | null = null;
    for (let index = 0; index < 7; index += 1) {
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
    const concurrent = await Promise.allSettled(
      [0, 1].map(() =>
        liveScope.owner.prepareForNoteEmbedding({
          source: { kind: "base64", data: "iVBORw0KGgo=" },
          options: {
            targetBytes: 8 * MiB,
            hardMaxBytes: 8 * MiB,
            outputFormat: "png",
          },
        }),
      ),
    );
    assert.equal(
      concurrent.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      concurrent.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason.code === "resource_limited",
      ).length,
      1,
    );
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
});
