import { assert } from "chai";
import { createWorkflowPreparedImageScope } from "../../../../src/workflows/workflowNoteImagePreparation";

const runtime = globalThis as unknown as {
  Zotero?: typeof Zotero & { __parity?: { runtime?: string } };
};
const describeZotero =
  runtime.Zotero && runtime.Zotero.__parity?.runtime !== "node-mock"
    ? describe
    : describe.skip;
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describeZotero(
  `Note image worker real runtime (${runtime.Zotero?.version})`,
  function () {
    this.timeout(35_000);

    it("resizes a real image to 720px and compresses within the JPEG target", async function () {
      const canvas = Zotero.getMainWindow().document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "canvas",
      ) as HTMLCanvasElement;
      canvas.width = 1440;
      canvas.height = 720;
      const context = canvas.getContext("2d")!;
      for (let x = 0; x < canvas.width; x += 4) {
        context.fillStyle = `rgb(${x % 256},${(x * 7) % 256},${(x * 13) % 256})`;
        context.fillRect(x, 0, 4, canvas.height);
      }
      const source = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("fixture encoding failed")),
          "image/png",
        ),
      );
      const scope = createWorkflowPreparedImageScope({
        runScopeId: "real-resize",
        readResourceBlob: async () =>
          new Blob([await source.arrayBuffer()], { type: source.type }),
      });
      try {
        const dto = await scope.owner.prepareForNoteEmbedding({
          source: {
            kind: "resource",
            resourceRef: { kind: "workflow_resource", id: "synthetic" },
          },
        });
        assert.include(dto, {
          width: 720,
          height: 360,
          mimeType: "image/jpeg",
        });
        assert.isAtMost(dto.bytes, 180 * 1024);
        const bytes = new Uint8Array(
          await scope.resolve(dto.ref).blob.arrayBuffer(),
        );
        assert.deepEqual(Array.from(bytes.slice(0, 3)), [255, 216, 255]);
      } finally {
        scope.dispose();
      }
    });

    it("decodes and encodes after a preferences window has closed", async function () {
      const preferences = Zotero.getMainWindow().openDialog(
        "chrome://zotero/content/preferences/preferences.xhtml",
        "note-image-test-preferences",
        "chrome,dialog=no,resizable=yes",
      );
      try {
        await new Promise<void>((resolve) => {
          if (preferences.document.readyState === "complete") resolve();
          else
            preferences.addEventListener("load", () => resolve(), {
              once: true,
            });
        });
      } finally {
        preferences.close();
      }
      const scope = createWorkflowPreparedImageScope({
        runScopeId: "real-worker",
      });
      try {
        const jpeg = await scope.owner.prepareForNoteEmbedding({
          source: { kind: "base64", data: PNG, mimeType: "image/png" },
        });
        assert.include(jpeg, { mimeType: "image/jpeg", width: 1, height: 1 });
        assert.isAtMost(jpeg.bytes, 180 * 1024);
        const bytes = new Uint8Array(
          await scope.resolve(jpeg.ref).blob.arrayBuffer(),
        );
        assert.deepEqual(Array.from(bytes.slice(0, 3)), [255, 216, 255]);
        const preserved = await scope.owner.prepareForNoteEmbedding({
          source: { kind: "base64", data: PNG },
          options: { preserveSourceBytes: true },
        });
        assert.include(preserved, {
          mimeType: "image/png",
          width: 1,
          height: 1,
          bytes: 68,
        });
        const png = await scope.owner.prepareForNoteEmbedding({
          source: { kind: "base64", data: PNG },
          options: { outputFormat: "png" },
        });
        assert.equal(png.mimeType, "image/png");
        assert.deepEqual(
          Array.from(
            new Uint8Array(
              await scope.resolve(png.ref).blob.arrayBuffer(),
            ).slice(0, 8),
          ),
          [137, 80, 78, 71, 13, 10, 26, 10],
        );
        Zotero.debug(`[note-image-worker] accepted Zotero ${Zotero.version}`);
      } finally {
        scope.dispose();
      }
    });
  },
);
