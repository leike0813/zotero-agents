import { readRuntimeBytes } from "../modules/runtimePersistence";
import { resolveRuntimeZotero } from "../utils/runtimeBridge";
import type {
  WorkflowImagePreparationOptions,
  WorkflowPreparedNoteImage,
} from "./types";

export type WorkflowNoteImageSource =
  | string
  | {
      path?: string;
      blob?: Blob;
      bytes?: Uint8Array | ArrayBuffer;
      mimeType?: string;
    };

type DecodedWorkflowNoteImage = {
  image: unknown;
  width: number;
  height: number;
  close: () => void;
};

type WorkflowNoteImageEncoder = {
  encode: (
    mimeType: "image/jpeg" | "image/png",
    quality?: number,
  ) => Promise<Blob>;
};

export type WorkflowNoteImageRuntimeAdapter = {
  readPathBlob: (path: string, mimeType: string) => Promise<Blob>;
  decode: (blob: Blob) => Promise<DecodedWorkflowNoteImage>;
  createEncoder: (args: {
    image: unknown;
    width: number;
    height: number;
    background: string;
  }) => WorkflowNoteImageEncoder;
};

const DEFAULT_OPTIONS = {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
  hardMaxBytes: 320 * 1024,
  initialQuality: 0.82,
  minQuality: 0.7,
  background: "#ffffff",
};

function getBlobCtor() {
  const BlobCtor = (globalThis as typeof globalThis & { Blob?: typeof Blob })
    .Blob;
  if (typeof BlobCtor !== "function") {
    throw new Error("Blob is unavailable in workflow host api");
  }
  return BlobCtor;
}

function inferImageMimeType(pathOrMime?: string) {
  const text = String(pathOrMime || "").toLowerCase();
  if (text.includes("image/")) return text;
  if (/\.(jpe?g)(?:[?#].*)?$/i.test(text)) return "image/jpeg";
  if (/\.png(?:[?#].*)?$/i.test(text)) return "image/png";
  if (/\.gif(?:[?#].*)?$/i.test(text)) return "image/gif";
  if (/\.webp(?:[?#].*)?$/i.test(text)) return "image/webp";
  if (/\.bmp(?:[?#].*)?$/i.test(text)) return "image/bmp";
  return "application/octet-stream";
}

function normalizeOptions(options?: WorkflowImagePreparationOptions) {
  const merged = { ...DEFAULT_OPTIONS, ...(options || {}) };
  const initialQuality = Math.min(
    1,
    Math.max(0.01, Number(merged.initialQuality) || 0.82),
  );
  return {
    maxLongEdge: Math.max(1, Math.floor(Number(merged.maxLongEdge) || 720)),
    targetBytes: Math.max(1, Math.floor(Number(merged.targetBytes) || 1)),
    hardMaxBytes: Math.max(1, Math.floor(Number(merged.hardMaxBytes) || 1)),
    initialQuality,
    minQuality: Math.min(
      initialQuality,
      Math.min(1, Math.max(0.01, Number(merged.minQuality) || 0.7)),
    ),
    background: String(merged.background || "#ffffff").trim() || "#ffffff",
    outputMimeType:
      merged.outputMimeType === "image/png" ? "image/png" : "image/jpeg",
  } as const;
}

async function normalizeSource(
  source: WorkflowNoteImageSource,
  adapter: WorkflowNoteImageRuntimeAdapter,
) {
  if (typeof source === "string") {
    const path = source.trim();
    const mimeType = inferImageMimeType(path);
    const blob = await adapter.readPathBlob(path, mimeType);
    return {
      blob,
      mimeType: blob.type || mimeType,
      originalBytes: blob.size,
      fileName: path.split(/[\\/]/).filter(Boolean).pop() || "image",
    };
  }
  if (source?.blob) {
    const mimeType = source.blob.type || inferImageMimeType(source.mimeType);
    return {
      blob: source.blob.type
        ? source.blob
        : source.blob.slice(0, source.blob.size, mimeType),
      mimeType,
      originalBytes: source.blob.size,
      fileName: source.path?.split(/[\\/]/).filter(Boolean).pop(),
    };
  }
  if (source?.bytes) {
    const bytes =
      source.bytes instanceof Uint8Array
        ? source.bytes
        : new Uint8Array(source.bytes);
    const mimeType = inferImageMimeType(source.mimeType || source.path);
    return {
      blob: new (getBlobCtor())([bytes], { type: mimeType }),
      mimeType,
      originalBytes: bytes.byteLength,
      fileName: source.path?.split(/[\\/]/).filter(Boolean).pop(),
    };
  }
  if (source?.path) return normalizeSource(source.path, adapter);
  throw new Error("Image source must provide a path, blob, or bytes");
}

function computeBoundedSize(width: number, height: number, maxLongEdge: number) {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const longEdge = Math.max(safeWidth, safeHeight);
  if (longEdge <= maxLongEdge) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function resolveCanvasDocument() {
  const runtime = globalThis as typeof globalThis & { document?: Document };
  return (
    runtime.document || resolveRuntimeZotero()?.getMainWindow?.()?.document || null
  );
}

const defaultRuntimeAdapter: WorkflowNoteImageRuntimeAdapter = {
  async readPathBlob(path, mimeType) {
    const zotero = resolveRuntimeZotero() as
      | (typeof Zotero & {
          File?: { pathToFileURI?: (path: string) => string };
        })
      | undefined;
    const uri = zotero?.File?.pathToFileURI?.(path);
    if (uri && typeof globalThis.fetch === "function") {
      try {
        const response = await globalThis.fetch(uri);
        if (response.ok || response.status === 0) {
          const blob = await response.blob();
          return blob.type ? blob : blob.slice(0, blob.size, mimeType);
        }
      } catch {
        // Fall through to the cross-runtime persistence adapter.
      }
    }
    const bytes = await readRuntimeBytes(path);
    return new (getBlobCtor())([bytes], { type: mimeType });
  },

  async decode(blob) {
    const runtime = globalThis as typeof globalThis & {
      createImageBitmap?: (blob: Blob) => Promise<ImageBitmap>;
      URL?: typeof URL;
    };
    if (typeof runtime.createImageBitmap === "function") {
      const bitmap = await runtime.createImageBitmap(blob);
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      };
    }
    const doc = resolveCanvasDocument();
    const URLCtor = runtime.URL || globalThis.URL;
    if (!doc || typeof URLCtor?.createObjectURL !== "function") {
      throw new Error("Canvas image decoder is unavailable");
    }
    const image = doc.createElement("img");
    const url = URLCtor.createObjectURL(blob);
    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to decode image"));
        image.src = url;
      });
      return {
        image,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        close: () => undefined,
      };
    } finally {
      URLCtor.revokeObjectURL(url);
    }
  },

  createEncoder(args) {
    const runtime = globalThis as typeof globalThis & {
      OffscreenCanvas?: typeof OffscreenCanvas;
    };
    const canvas =
      typeof runtime.OffscreenCanvas === "function"
        ? new runtime.OffscreenCanvas(args.width, args.height)
        : (() => {
            const doc = resolveCanvasDocument();
            if (!doc) throw new Error("Canvas is unavailable");
            const element = doc.createElement("canvas");
            element.width = args.width;
            element.height = args.height;
            return element;
          })();
    const context = canvas.getContext("2d") as
      | CanvasRenderingContext2D
      | OffscreenCanvasRenderingContext2D
      | null;
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.fillStyle = args.background;
    context.fillRect(0, 0, args.width, args.height);
    context.drawImage(
      args.image as CanvasImageSource,
      0,
      0,
      args.width,
      args.height,
    );
    return {
      async encode(mimeType, quality) {
        const anyCanvas = canvas as HTMLCanvasElement & {
          convertToBlob?: (options: {
            type: string;
            quality?: number;
          }) => Promise<Blob>;
        };
        if (typeof anyCanvas.convertToBlob === "function") {
          return anyCanvas.convertToBlob({ type: mimeType, quality });
        }
        if (typeof anyCanvas.toBlob === "function") {
          return new Promise<Blob>((resolve, reject) => {
            anyCanvas.toBlob(
              (blob) =>
                blob
                  ? resolve(blob)
                  : reject(new Error("Canvas JPEG encoding failed")),
              mimeType,
              quality,
            );
          });
        }
        throw new Error("Canvas image encoder is unavailable");
      },
    };
  },
};

export function createWorkflowNoteImagePreparation(
  adapter: WorkflowNoteImageRuntimeAdapter = defaultRuntimeAdapter,
) {
  return async function prepareForNoteEmbedding(
    source: WorkflowNoteImageSource,
    options?: WorkflowImagePreparationOptions,
  ): Promise<WorkflowPreparedNoteImage> {
    const normalizedOptions = normalizeOptions(options);
    const normalizedSource = await normalizeSource(source, adapter);
    const decoded = await adapter.decode(normalizedSource.blob);
    try {
      const target = computeBoundedSize(
        decoded.width,
        decoded.height,
        normalizedOptions.maxLongEdge,
      );
      const encoder = adapter.createEncoder({
        image: decoded.image,
        width: target.width,
        height: target.height,
        background: normalizedOptions.background,
      });
      const qualities = Array.from(
        new Set(
          [
            normalizedOptions.initialQuality,
            0.78,
            0.74,
            normalizedOptions.minQuality,
          ]
            .map((quality) => Number(quality.toFixed(2)))
            .filter(
              (quality) =>
                quality <= normalizedOptions.initialQuality &&
                quality >= normalizedOptions.minQuality,
            ),
        ),
      ).sort((a, b) => b - a);

      let selectedBlob: Blob | null = null;
      let selectedQuality = qualities[qualities.length - 1];
      if (normalizedOptions.outputMimeType === "image/png") {
        selectedBlob = await encoder.encode("image/png");
        selectedQuality = 1;
      } else {
        for (const quality of qualities) {
          selectedBlob = await encoder.encode("image/jpeg", quality);
          selectedQuality = quality;
          if (selectedBlob.size <= normalizedOptions.targetBytes) break;
        }
      }
      if (!selectedBlob) throw new Error("Image encoding produced no image");
      if (selectedBlob.size > normalizedOptions.hardMaxBytes) {
        throw new Error(
          `Prepared image exceeds hard cap: ${selectedBlob.size} > ${normalizedOptions.hardMaxBytes}`,
        );
      }
      return {
        blob: selectedBlob,
        mimeType: normalizedOptions.outputMimeType,
        width: target.width,
        height: target.height,
        originalBytes: normalizedSource.originalBytes,
        compressedBytes: selectedBlob.size,
        fileName: normalizedSource.fileName,
        diagnostics: {
          quality: selectedQuality,
          sourceMimeType: normalizedSource.mimeType,
          maxLongEdge: normalizedOptions.maxLongEdge,
          targetBytes: normalizedOptions.targetBytes,
          hardMaxBytes: normalizedOptions.hardMaxBytes,
        },
      };
    } finally {
      decoded.close();
    }
  };
}

export const prepareWorkflowNoteImage =
  createWorkflowNoteImagePreparation();
