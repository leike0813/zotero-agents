import {
  readRuntimeBytes,
  statRuntimePath,
} from "../modules/runtimePersistence";
import { sha256Hex } from "../utils/sha256";
import { processNoteImage } from "../platform/noteImageProcessing";
import type {
  NoteImageProcessingRequest,
  NoteImageProcessingResult,
} from "../platform/noteImageProcessingContract";
import {
  createCancellationController,
  waitForBoundedPromise,
  BoundedWaitError,
} from "../utils/wait";
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
  WorkflowPreparedImageOwner,
} from "./types";

export type WorkflowNoteImageRuntimeAdapter = {
  readPathBlob: (
    path: string,
    mimeType: string,
    control?: WorkflowCallControl,
  ) => Promise<Blob>;
  process: (
    request: NoteImageProcessingRequest,
    control?: WorkflowCallControl,
  ) => Promise<NoteImageProcessingResult>;
};
const DEFAULT_OPTIONS = {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
  hardMaxBytes: 320 * 1024,
};
const PREPARATION_BUDGET_MS = 30_000;
const pendingPreparations = new Set<() => void>();
export function shutdownWorkflowNoteImagePreparation() {
  for (const cancel of Array.from(pendingPreparations)) cancel();
}

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
      throw invalidImageRequest(
        "Image option must be a positive integer",
        field,
      );
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

export async function readWorkflowNoteImageBlob(
  path: string,
  mimeType: string,
  control?: WorkflowCallControl,
) {
  requireNotCanceled(control);
  const stat = await statRuntimePath(path);
  requireNotCanceled(control);
  if (stat.size > MAX_INPUT_BYTES)
    throw imageResourceLimit(MAX_INPUT_BYTES, stat.size);
  const bytes = await readRuntimeBytes(path);
  requireNotCanceled(control);
  if (bytes.byteLength > MAX_INPUT_BYTES)
    throw imageResourceLimit(MAX_INPUT_BYTES, bytes.byteLength);
  return new (getBlobCtor())([bytes], { type: mimeType });
}

const defaultRuntimeAdapter: WorkflowNoteImageRuntimeAdapter = {
  readPathBlob: readWorkflowNoteImageBlob,
  process: (request, control) => processNoteImage(request, control?.signal),
};

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
  const records = new Map<string, WorkflowPreparedImageRecord>();
  const expiredRefs = new Set<string>();
  let liveBytes = 0;
  let disposed = false;
  const inFlight = new Set<() => void>();

  const owner: WorkflowPreparedImageOwner = {
    async prepareForNoteEmbedding(input, control) {
      const controller = createCancellationController();
      const cancel = () => controller.abort();
      const callerSignal = control?.signal;
      callerSignal?.addEventListener("abort", cancel, { once: true });
      if (callerSignal?.aborted) cancel();
      inFlight.add(cancel);
      pendingPreparations.add(cancel);
      const effectiveControl = { signal: controller.signal };
      const deadline = Date.now() + PREPARATION_BUDGET_MS;
      const check = () => {
        requireNotCanceled(effectiveControl);
        if (Date.now() >= deadline)
          throw imageError("resource_limited", "Image preparation timed out", {
            resource: "duration_ms",
            limit: PREPARATION_BUDGET_MS,
          });
      };
      const prepare = async () => {
        check();
        if (disposed) {
          throw imageError("not_found", "Prepared-image run has ended", {
            kind: "prepared_image",
          });
        }
        if (!input || typeof input !== "object" || !input.source) {
          throw invalidImageRequest(
            "Prepared-image source is required",
            "source",
          );
        }
        const options = normalizePreparedImageOptions(input.options);
        let sourceBlob: Blob;
        let declaredMimeType = "";
        switch (input.source.kind) {
          case "file": {
            const path = String(input.source.path || "").trim();
            if (!path) {
              throw invalidImageRequest(
                "Image file path is required",
                "source.path",
              );
            }
            declaredMimeType = inferImageMimeType(path);
            sourceBlob = await adapter.readPathBlob(
              path,
              declaredMimeType,
              effectiveControl,
            );
            break;
          }
          case "resource": {
            if (typeof args.readResourceBlob !== "function") {
              throw imageError(
                "unavailable",
                "Resource reader is unavailable",
                {
                  reason: "capability",
                  kind: "resource",
                },
              );
            }
            sourceBlob = await args.readResourceBlob(
              input.source.resourceRef,
              effectiveControl,
            );
            declaredMimeType = sourceBlob.type;
            break;
          }
          case "base64": {
            const sourceBytes = decodeBase64(input.source.data);
            declaredMimeType = String(
              input.source.mimeType || "",
            ).toLowerCase();
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
        check();
        if (!(sourceBlob instanceof getBlobCtor())) {
          throw imageError(
            "execution_failed",
            "Image reader returned no blob",
            {
              phase: "read",
              recovery: "none",
            },
          );
        }
        if (sourceBlob.size > MAX_INPUT_BYTES) {
          throw imageResourceLimit(MAX_INPUT_BYTES, sourceBlob.size);
        }
        const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
        const detectedMimeType = detectImageMimeType(sourceBytes);
        if (!detectedMimeType) {
          throw invalidImageRequest("Image signature is unsupported", "source");
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
        check();
        if (
          options.preserveSourceBytes &&
          detectedMimeType !== "image/jpeg" &&
          detectedMimeType !== "image/png"
        )
          throw invalidImageRequest(
            "Preserved image format is unsupported",
            "source",
          );
        if (
          options.preserveSourceBytes &&
          sourceBytes.byteLength > options.hardMaxBytes
        )
          throw imageResourceLimit(
            options.hardMaxBytes,
            sourceBytes.byteLength,
          );
        const prepared = await adapter.process(
          { bytes: sourceBytes, mimeType: detectedMimeType, options },
          effectiveControl,
        );
        check();
        const preparedBytes = prepared.bytes;
        if (preparedBytes.byteLength > options.hardMaxBytes)
          throw imageResourceLimit(
            options.hardMaxBytes,
            preparedBytes.byteLength,
          );
        if (
          !Number.isInteger(prepared.width) ||
          !Number.isInteger(prepared.height) ||
          prepared.width < 1 ||
          prepared.height < 1 ||
          !["image/jpeg", "image/png"].includes(prepared.mimeType)
        )
          throw imageError(
            "execution_failed",
            "Image processor returned invalid output",
            { phase: "staging", recovery: "none" },
          );
        const digest = await sha256Hex(preparedBytes);
        if (!digest) {
          throw imageError("unavailable", "SHA-256 is unavailable", {
            reason: "runtime",
            kind: "prepared_image",
          });
        }
        check();
        if (liveBytes + preparedBytes.byteLength > MAX_RUN_BYTES)
          throw imageResourceLimit(
            MAX_RUN_BYTES,
            liveBytes + preparedBytes.byteLength,
          );
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
        records.set(ref.id, {
          dto,
          blob: new (getBlobCtor())([preparedBytes], {
            type: prepared.mimeType,
          }),
        });
        liveBytes += preparedBytes.byteLength;
        return dto;
      };
      try {
        return await waitForBoundedPromise(prepare(), {
          signal: controller.signal,
          timeoutMs: PREPARATION_BUDGET_MS,
          phase: "note image preparation",
        });
      } catch (error) {
        if (error instanceof BoundedWaitError) {
          if (error.kind === "timed-out")
            throw imageError(
              "resource_limited",
              "Image preparation timed out",
              { resource: "duration_ms", limit: PREPARATION_BUDGET_MS },
            );
          throw imageError("canceled", "Image preparation was canceled", {
            reason: "caller_signal",
          });
        }
        throw error;
      } finally {
        cancel();
        callerSignal?.removeEventListener("abort", cancel);
        inFlight.delete(cancel);
        pendingPreparations.delete(cancel);
      }
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
      for (const cancel of Array.from(inFlight)) cancel();
      for (const refId of records.keys()) expiredRefs.add(refId);
      records.clear();
      liveBytes = 0;
    },
  };
}
