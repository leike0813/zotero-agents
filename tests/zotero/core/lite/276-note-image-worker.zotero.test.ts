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

type DecodedPixels = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

async function decodePng(blob: Blob): Promise<DecodedPixels> {
  const window = Zotero.getMainWindow();
  const bitmap = await window.createImageBitmap(blob);
  try {
    const canvas = window.document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "canvas",
    ) as HTMLCanvasElement;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    return { width: image.width, height: image.height, data: image.data };
  } finally {
    bitmap.close();
  }
}

function orangePixels(pixels: DecodedPixels) {
  let count = 0;
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    if (red > green && green > blue && red - blue > 30) count += 1;
  }
  return count;
}

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

    it("renders a score radar as a PNG whose pixels follow the scores", async function () {
      const scope = createWorkflowPreparedImageScope({
        runScopeId: "real-radar",
      });
      try {
        const dimensions = [
          { name: "Dimension one", score: 90 },
          { name: "Dimension two", score: 70 },
          { name: "Dimension three", score: null },
          { name: "Dimension four", score: 40 },
          { name: "Dimension five", score: 60 },
          { name: "Dimension six", score: 30 },
        ];
        const dto = await scope.prepareLiteratureScoreRadar(dimensions);
        assert.include(dto, { mimeType: "image/png", width: 640, height: 520 });
        const blob = scope.resolve(dto.ref).blob;
        assert.deepEqual(
          Array.from(new Uint8Array(await blob.arrayBuffer()).slice(0, 8)),
          [137, 80, 78, 71, 13, 10, 26, 10],
        );
        const high = await decodePng(blob);
        assert.equal(high.width, 640);
        assert.equal(high.height, 520);
        const highOrange = orangePixels(high);
        assert.isAbove(highOrange, 0);

        const lowDto = await scope.prepareLiteratureScoreRadar(
          dimensions.map((dimension) => ({
            ...dimension,
            score: dimension.score === null ? null : 10,
          })),
        );
        const low = await decodePng(scope.resolve(lowDto.ref).blob);
        assert.isBelow(orangePixels(low), highOrange);
      } finally {
        scope.dispose();
      }
    });
  },
);
