import { readRuntimeBytes } from "../modules/runtimePersistence";
import { sha256Hex } from "../utils/sha256";
import {
  resolveRuntimeWindowCandidates,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";
import {
  createWorkflowHostError,
  type WorkflowHostErrorCode,
  type WorkflowHostErrorDetailsByCode,
} from "./workflowHostErrorContract";
import type {
  PrepareNoteImageRequestDto,
  PreparedNoteImageDto,
  PreparedNoteImageRef,
  ResourceRef,
  WorkflowCallControl,
  WorkflowImagePreparationOptions,
  WorkflowPreparedImageOwner,
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

const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const MAX_LONG_EDGE = 8192;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_RUN_BYTES = 64 * 1024 * 1024;

type WorkflowPreparedImageRecord = {
  dto: PreparedNoteImageDto;
  blob: Blob;
};

export type WorkflowPreparedImageScope = {
  owner: WorkflowPreparedImageOwner;
  resolve: (ref: PreparedNoteImageRef) => WorkflowPreparedImageRecord;
  dispose: () => void;
};

type WorkflowPreparedImageScopeArgs = {
  runScopeId: string;
  adapter?: WorkflowNoteImageRuntimeAdapter;
  readResourceBlob?: (
    ref: ResourceRef,
    control?: WorkflowCallControl,
  ) => Promise<Blob>;
  createScopeToken?: () => string;
  createRefId?: () => string;
};

function imageError<Code extends WorkflowHostErrorCode>(
  code: Code,
  message: string,
  details: WorkflowHostErrorDetailsByCode[Code],
) {
  return createWorkflowHostError(code, message, details);
}

function requireNotCanceled(control?: WorkflowCallControl) {
  if (control?.signal?.aborted) {
    throw imageError("canceled", "Image preparation was canceled", {
      reason: "caller_signal",
    });
  }
}

function invalidImageRequest(message: string, field?: string) {
  return imageError("invalid_request", message, {
    reason: "invalid_value",
    ...(field ? { field } : {}),
  });
}

function imageResourceLimit(limit: number, observed?: number) {
  return imageError("resource_limited", "Prepared image exceeds a byte limit", {
    resource: "bytes",
    limit,
    ...(observed === undefined ? {} : { observed }),
  });
}

function createOpaqueToken() {
  const runtime = globalThis as typeof globalThis & {
    crypto?: { getRandomValues?: (bytes: Uint8Array) => Uint8Array };
  };
  if (typeof runtime.crypto?.getRandomValues !== "function") {
    throw imageError("unavailable", "Secure random ids are unavailable", {
      reason: "runtime",
      kind: "prepared_image",
    });
  }
  const bytes = runtime.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function estimateBase64Bytes(data: string) {
  const normalized = data.replace(/\s+/g, "");
  if (!normalized || normalized.length % 4 !== 0) {
    throw invalidImageRequest("Image base64 is invalid", "source.data");
  }
  const padding = normalized.endsWith("==")
    ? 2
    : normalized.endsWith("=")
      ? 1
      : 0;
  return { normalized, bytes: (normalized.length / 4) * 3 - padding };
}

function decodeBase64(data: string) {
  const estimated = estimateBase64Bytes(data);
  if (estimated.bytes > MAX_INPUT_BYTES) {
    throw imageResourceLimit(MAX_INPUT_BYTES, estimated.bytes);
  }
  const decoder = (globalThis as typeof globalThis & { atob?: typeof atob })
    .atob;
  if (typeof decoder !== "function") {
    throw imageError("unavailable", "Base64 decoder is unavailable", {
      reason: "runtime",
      kind: "prepared_image",
    });
  }
  let binary: string;
  try {
    binary = decoder(estimated.normalized);
  } catch {
    throw invalidImageRequest("Image base64 is invalid", "source.data");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function detectImageMimeType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  const header = String.fromCharCode(...bytes.slice(0, 12));
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) {
    return "image/gif";
  }
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") {
    return "image/webp";
  }
  if (header.startsWith("BM")) return "image/bmp";
  return null;
}

function normalizePreparedImageOptions(
  input: PrepareNoteImageRequestDto["options"],
) {
  const maxLongEdge = input?.maxLongEdge ?? DEFAULT_OPTIONS.maxLongEdge;
  const targetBytes = input?.targetBytes ?? DEFAULT_OPTIONS.targetBytes;
  const hardMaxBytes = input?.hardMaxBytes ?? DEFAULT_OPTIONS.hardMaxBytes;
  for (const [field, value] of [
    ["options.maxLongEdge", maxLongEdge],
    ["options.targetBytes", targetBytes],
    ["options.hardMaxBytes", hardMaxBytes],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0) {
      throw invalidImageRequest("Image option must be a positive integer", field);
    }
  }
  if (maxLongEdge > MAX_LONG_EDGE) {
    throw invalidImageRequest(
      "Image long-edge option exceeds its maximum",
      "options.maxLongEdge",
    );
  }
  if (hardMaxBytes > MAX_OUTPUT_BYTES) {
    throw imageResourceLimit(MAX_OUTPUT_BYTES, hardMaxBytes);
  }
  if (targetBytes > hardMaxBytes) {
    throw invalidImageRequest(
      "Image targetBytes must not exceed hardMaxBytes",
      "options.targetBytes",
    );
  }
  const outputFormat = input?.outputFormat ?? "auto";
  if (!(["auto", "jpeg", "png"] as const).includes(outputFormat)) {
    throw invalidImageRequest(
      "Image output format is invalid",
      "options.outputFormat",
    );
  }
  return {
    maxLongEdge,
    targetBytes,
    hardMaxBytes,
    preserveSourceBytes: input?.preserveSourceBytes === true,
    outputMimeType:
      outputFormat === "png" ? ("image/png" as const) : ("image/jpeg" as const),
  };
}

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
  if (runtime.document) {
    return runtime.document;
  }
  for (const candidate of resolveRuntimeWindowCandidates()) {
    const document = (candidate as { document?: Document })?.document;
    if (document) {
      return document;
    }
  }
  return null;
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
        throw imageError(
          "resource_limited",
          `Prepared image exceeds hard cap: ${selectedBlob.size} > ${normalizedOptions.hardMaxBytes}`,
          {
            resource: "bytes",
            limit: normalizedOptions.hardMaxBytes,
            observed: selectedBlob.size,
          },
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

export function createWorkflowPreparedImageScope(
  args: WorkflowPreparedImageScopeArgs,
): WorkflowPreparedImageScope {
  if (!String(args.runScopeId || "").trim()) {
    throw invalidImageRequest("Prepared-image run scope is required");
  }
  const adapter = args.adapter || defaultRuntimeAdapter;
  const scopeToken = String(
    args.createScopeToken?.() || createOpaqueToken(),
  ).trim();
  if (!scopeToken || scopeToken.includes(":")) {
    throw invalidImageRequest("Prepared-image scope token is invalid");
  }
  const createRefId = args.createRefId || createOpaqueToken;
  const legacyPrepare = createWorkflowNoteImagePreparation(adapter);
  const records = new Map<string, WorkflowPreparedImageRecord>();
  const expiredRefs = new Set<string>();
  let liveBytes = 0;
  let disposed = false;

  const owner: WorkflowPreparedImageOwner = {
    async prepareForNoteEmbedding(input, control) {
      requireNotCanceled(control);
      if (disposed) {
        throw imageError("not_found", "Prepared-image run has ended", {
          kind: "prepared_image",
        });
      }
      if (!input || typeof input !== "object" || !input.source) {
        throw invalidImageRequest("Prepared-image source is required", "source");
      }
      const options = normalizePreparedImageOptions(input.options);
      let sourceBlob: Blob;
      let declaredMimeType = "";
      switch (input.source.kind) {
        case "file": {
          const path = String(input.source.path || "").trim();
          if (!path) {
            throw invalidImageRequest("Image file path is required", "source.path");
          }
          declaredMimeType = inferImageMimeType(path);
          sourceBlob = await adapter.readPathBlob(path, declaredMimeType);
          break;
        }
        case "resource": {
          if (typeof args.readResourceBlob !== "function") {
            throw imageError("unavailable", "Resource reader is unavailable", {
              reason: "capability",
              kind: "resource",
            });
          }
          sourceBlob = await args.readResourceBlob(
            input.source.resourceRef,
            control,
          );
          declaredMimeType = sourceBlob.type;
          break;
        }
        case "base64": {
          const sourceBytes = decodeBase64(input.source.data);
          declaredMimeType = String(input.source.mimeType || "").toLowerCase();
          sourceBlob = new (getBlobCtor())([sourceBytes], {
            type: declaredMimeType,
          });
          break;
        }
        default:
          throw invalidImageRequest(
            "Prepared-image source kind is invalid",
            "source.kind",
          );
      }
      requireNotCanceled(control);
      if (!(sourceBlob instanceof getBlobCtor())) {
        throw imageError("execution_failed", "Image reader returned no blob", {
          phase: "read",
          recovery: "none",
        });
      }
      if (sourceBlob.size > MAX_INPUT_BYTES) {
        throw imageResourceLimit(MAX_INPUT_BYTES, sourceBlob.size);
      }
      const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
      const detectedMimeType = detectImageMimeType(sourceBytes);
      if (!detectedMimeType) {
        throw invalidImageRequest(
          "Image signature is unsupported",
          "source",
        );
      }
      if (
        declaredMimeType &&
        declaredMimeType !== "application/octet-stream" &&
        declaredMimeType !== detectedMimeType
      ) {
        throw invalidImageRequest(
          "Image MIME type does not match its signature",
          "source.mimeType",
        );
      }
      requireNotCanceled(control);
      let prepared: WorkflowPreparedNoteImage;
      if (options.preserveSourceBytes) {
        if (
          detectedMimeType !== "image/jpeg" &&
          detectedMimeType !== "image/png"
        ) {
          throw invalidImageRequest(
            "Preserved image format is unsupported",
            "source",
          );
        }
        if (sourceBlob.size > options.hardMaxBytes) {
          throw imageResourceLimit(options.hardMaxBytes, sourceBlob.size);
        }
        const decoded = await adapter.decode(sourceBlob);
        try {
          prepared = {
            blob: sourceBlob,
            mimeType: detectedMimeType,
            width: decoded.width,
            height: decoded.height,
            originalBytes: sourceBlob.size,
            compressedBytes: sourceBlob.size,
          };
        } finally {
          decoded.close();
        }
      } else {
        prepared = await legacyPrepare(
          { blob: sourceBlob, mimeType: detectedMimeType },
          options,
        );
      }
      requireNotCanceled(control);
      if (!prepared.blob) {
        throw imageError("execution_failed", "Image encoder returned no blob", {
          phase: "staging",
          recovery: "none",
        });
      }
      const preparedBytes = new Uint8Array(await prepared.blob.arrayBuffer());
      if (liveBytes + preparedBytes.byteLength > MAX_RUN_BYTES) {
        throw imageResourceLimit(
          MAX_RUN_BYTES,
          liveBytes + preparedBytes.byteLength,
        );
      }
      const digest = await sha256Hex(preparedBytes);
      if (!digest) {
        throw imageError("unavailable", "SHA-256 is unavailable", {
          reason: "runtime",
          kind: "prepared_image",
        });
      }
      const localId = String(createRefId()).trim();
      if (!localId || localId.includes(":")) {
        throw imageError("execution_failed", "Prepared-image id is invalid", {
          phase: "staging",
          recovery: "none",
        });
      }
      const ref: PreparedNoteImageRef = {
        kind: "prepared_note_image",
        id: `${scopeToken}:${localId}`,
      };
      if (records.has(ref.id) || expiredRefs.has(ref.id)) {
        throw imageError("execution_failed", "Prepared-image id collided", {
          phase: "staging",
          recovery: "retry_same_operation",
        });
      }
      const dto: PreparedNoteImageDto = {
        ref,
        mimeType:
          prepared.mimeType === "image/png" ? "image/png" : "image/jpeg",
        width: prepared.width,
        height: prepared.height,
        bytes: preparedBytes.byteLength,
        sha256: digest,
      };
      records.set(ref.id, { dto, blob: prepared.blob });
      liveBytes += preparedBytes.byteLength;
      return dto;
    },
  };

  return {
    owner,
    resolve(ref) {
      if (!ref || ref.kind !== "prepared_note_image" || !ref.id) {
        throw imageError("invalid_ref", "Prepared-image ref is invalid", {
          kind: "prepared_image",
          reason: "wrong_kind",
        });
      }
      const separator = ref.id.indexOf(":");
      if (separator < 1 || ref.id.slice(0, separator) !== scopeToken) {
        throw imageError("invalid_ref", "Prepared-image ref is foreign", {
          kind: "prepared_image",
          reason: "foreign_scope",
        });
      }
      const record = records.get(ref.id);
      if (record) return record;
      if (expiredRefs.has(ref.id) || disposed) {
        throw imageError("not_found", "Prepared image has expired", {
          kind: "prepared_image",
        });
      }
      throw imageError("invalid_ref", "Prepared-image ref is forged", {
        kind: "prepared_image",
        reason: "forged",
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const refId of records.keys()) expiredRefs.add(refId);
      records.clear();
      liveBytes = 0;
    },
  };
}

export const prepareWorkflowNoteImage =
  createWorkflowNoteImagePreparation();
