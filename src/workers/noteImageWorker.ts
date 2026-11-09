import {
  isNoteImageRadarRequest,
  type NoteImageProcessingRequest,
  type NoteImageProcessingResponse,
  type NoteImageRadarDimension,
} from "../platform/noteImageProcessingContract";

const worker = globalThis as unknown as {
  onmessage: (event: { data: NoteImageProcessingRequest }) => void;
  postMessage: (
    response: NoteImageProcessingResponse,
    transfer?: ArrayBuffer[],
  ) => void;
  createImageBitmap: (blob: Blob) => Promise<ImageBitmap>;
};

const RADAR_WIDTH = 640;
const RADAR_HEIGHT = 520;
const RADAR_CENTER_X = 320;
const RADAR_CENTER_Y = 250;
const RADAR_RADIUS = 175;

function radarPoint(index: number, count: number, value: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
  const distance = RADAR_RADIUS * (Math.max(0, Math.min(100, value)) / 100);
  return [
    RADAR_CENTER_X + Math.cos(angle) * distance,
    RADAR_CENTER_Y + Math.sin(angle) * distance,
  ];
}

function drawScoreRadar(
  context: OffscreenCanvasRenderingContext2D,
  dimensions: NoteImageRadarDimension[],
) {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, RADAR_WIDTH, RADAR_HEIGHT);
  context.lineWidth = 1;
  context.strokeStyle = "#c8ccd0";
  for (const value of [20, 40, 60, 80, 100]) {
    context.beginPath();
    dimensions.forEach((_, index) => {
      const [x, y] = radarPoint(index, dimensions.length, value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
  }
  dimensions.forEach((_, index) => {
    const [x, y] = radarPoint(index, dimensions.length, 100);
    context.beginPath();
    context.moveTo(RADAR_CENTER_X, RADAR_CENTER_Y);
    context.lineTo(x, y);
    context.stroke();
  });
  context.beginPath();
  dimensions.forEach((dimension, index) => {
    const [x, y] = radarPoint(index, dimensions.length, dimension.score ?? 0);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = "rgba(210, 138, 0, 0.28)";
  context.fill();
  context.strokeStyle = "#b36d00";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = "#2f3337";
  context.font = "13px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  dimensions.forEach((dimension, index) => {
    const [x, y] = radarPoint(index, dimensions.length, 116);
    const half = context.measureText(dimension.name).width / 2;
    context.fillText(
      dimension.name,
      Math.min(Math.max(x, half + 4), RADAR_WIDTH - half - 4),
      Math.min(Math.max(y, 7), RADAR_HEIGHT - 7),
    );
  });
}

worker.onmessage = async ({ data }) => {
  let bitmap: ImageBitmap | undefined;
  try {
    if (typeof OffscreenCanvas !== "function") {
      worker.postMessage({
        ok: false,
        error: "unavailable",
        message: "Worker image APIs are unavailable",
      });
      return;
    }
    const { options } = data;
    let width: number;
    let height: number;
    let output: Blob;
    if (isNoteImageRadarRequest(data)) {
      const scale = Math.min(
        1,
        options.maxLongEdge / Math.max(RADAR_WIDTH, RADAR_HEIGHT),
      );
      width = Math.max(1, Math.round(RADAR_WIDTH * scale));
      height = Math.max(1, Math.round(RADAR_HEIGHT * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext(
        "2d",
      ) as OffscreenCanvasRenderingContext2D | null;
      if (!context) throw new Error("Worker 2D context is unavailable");
      context.scale(scale, scale);
      drawScoreRadar(context, data.radar);
      output = await canvas.convertToBlob({ type: "image/png" });
    } else if (typeof worker.createImageBitmap !== "function") {
      worker.postMessage({
        ok: false,
        error: "unavailable",
        message: "Worker image APIs are unavailable",
      });
      return;
    } else {
      const { bytes, mimeType } = data;
      bitmap = await worker.createImageBitmap(
        new Blob([bytes], { type: mimeType }),
      );
      width = bitmap.width;
      height = bitmap.height;
      if (options.preserveSourceBytes) {
        output = new Blob([bytes], { type: mimeType });
      } else {
        const scale = Math.min(
          1,
          options.maxLongEdge / Math.max(width, height),
        );
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
            output = await canvas.convertToBlob({
              type: "image/jpeg",
              quality,
            });
          }
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
