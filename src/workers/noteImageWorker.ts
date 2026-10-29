import type {
  NoteImageProcessingRequest,
  NoteImageProcessingResponse,
} from "../platform/noteImageProcessingContract";

const worker = globalThis as unknown as {
  onmessage: (event: { data: NoteImageProcessingRequest }) => void;
  postMessage: (
    response: NoteImageProcessingResponse,
    transfer?: ArrayBuffer[],
  ) => void;
  createImageBitmap: (blob: Blob) => Promise<ImageBitmap>;
};

worker.onmessage = async ({ data }) => {
  let bitmap: ImageBitmap | undefined;
  try {
    if (
      typeof worker.createImageBitmap !== "function" ||
      typeof OffscreenCanvas !== "function"
    ) {
      worker.postMessage({
        ok: false,
        error: "unavailable",
        message: "Worker image APIs are unavailable",
      });
      return;
    }
    const { bytes, mimeType, options } = data;
    bitmap = await worker.createImageBitmap(
      new Blob([bytes], { type: mimeType }),
    );
    let width = bitmap.width;
    let height = bitmap.height;
    let output: Blob;
    if (options.preserveSourceBytes) {
      output = new Blob([bytes], { type: mimeType });
    } else {
      const scale = Math.min(1, options.maxLongEdge / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext(
        "2d",
      ) as OffscreenCanvasRenderingContext2D | null;
      if (!context) throw new Error("Worker 2D context is unavailable");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);
      output = await canvas.convertToBlob({
        type: options.outputMimeType,
        quality: 0.82,
      });
      if (options.outputMimeType === "image/jpeg") {
        for (const quality of [0.78, 0.74, 0.7]) {
          if (output.size <= options.targetBytes) break;
          output = await canvas.convertToBlob({ type: "image/jpeg", quality });
        }
      }
    }
    if (output.size > options.hardMaxBytes) {
      worker.postMessage({
        ok: false,
        error: "bytes",
        message: "Prepared image exceeds hard cap",
        observed: output.size,
      });
      return;
    }
    const outputBytes = new Uint8Array(await output.arrayBuffer());
    worker.postMessage(
      {
        ok: true,
        result: {
          bytes: outputBytes,
          mimeType: output.type as "image/jpeg" | "image/png",
          width,
          height,
        },
      },
      [outputBytes.buffer],
    );
  } catch (error) {
    worker.postMessage({ ok: false, error: "decode", message: String(error) });
  } finally {
    bitmap?.close();
  }
};
