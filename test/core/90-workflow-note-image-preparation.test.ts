import { assert } from "chai";
import { createWorkflowNoteImagePreparation } from "../../src/workflows/workflowNoteImagePreparation";

describe("Workflow Note Image Preparation", function () {
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
