export type HostHttpRequestReadLimits = {
  maxHeaderBytes: number;
  maxBodyBytes: number;
  idleTimeoutMs: number;
  totalTimeoutMs: number;
};

export type HostHttpRequestReadResult = {
  bytes: Uint8Array;
  headerBytes: number;
  bodyBytes: number;
  contentLength: number;
  fragments: number;
  waits: number;
  durationMs: number;
  maxCallbackDurationMs: number;
};

export type HostHttpRequestReadErrorCode =
  | "async_stream_unavailable"
  | "header_too_large"
  | "body_too_large"
  | "idle_timeout"
  | "total_timeout"
  | "invalid_content_length"
  | "transfer_encoding_unsupported"
  | "invalid_framing"
  | "early_eof"
  | "aborted"
  | "read_failed";

export type HostHttpRequestReadStats = Omit<
  HostHttpRequestReadResult,
  "bytes"
> & {
  inputBytes: number;
};

export class HostHttpRequestReadError extends Error {
  readonly name = "HostHttpRequestReadError";

  constructor(
    readonly code: HostHttpRequestReadErrorCode,
    message: string,
    readonly stats: HostHttpRequestReadStats,
    options: { cause?: unknown } = {},
  ) {
    super(message, options);
  }
}

export const DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS: Readonly<HostHttpRequestReadLimits> =
  Object.freeze({
    maxHeaderBytes: 64 * 1024,
    maxBodyBytes: 16 * 1024 * 1024,
    idleTimeoutMs: 500,
    totalTimeoutMs: 30_000,
  });

type ReadOptions = {
  limits?: HostHttpRequestReadLimits;
  signal?: AbortSignal;
};

type Framing = {
  headerBytes: number;
  contentLength: number;
};

type ReadOutcome =
  | { kind: "success"; framing: Framing }
  | {
      kind: "error";
      code: HostHttpRequestReadErrorCode;
      message: string;
      cause?: unknown;
    };

function getComponents() {
  const runtime = globalThis as typeof globalThis & {
    Components?: any;
    Cc?: any;
    Ci?: any;
  };
  return {
    classes: runtime.Components?.classes || runtime.Cc,
    interfaces: runtime.Components?.interfaces || runtime.Ci,
  };
}

function getMainThread() {
  return (globalThis as any).Services?.tm?.mainThread;
}

function isClosedStreamError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return (
    message.includes("NS_BASE_STREAM_CLOSED") || message.includes("0x80470002")
  );
}

function bytesToLatin1String(bytes: Uint8Array) {
  let output = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    output += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
  }
  return output;
}

function concatBytes(chunks: readonly Uint8Array[], totalLength: number) {
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function concatPrefix(chunks: readonly Uint8Array[], prefixLength: number) {
  const output = new Uint8Array(prefixLength);
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = prefixLength - offset;
    if (remaining <= 0) break;
    const included = chunk.subarray(0, remaining);
    output.set(included, offset);
    offset += included.byteLength;
  }
  return output;
}

function parseFraming(headerBytes: Uint8Array):
  | { ok: true; contentLength: number }
  | {
      ok: false;
      code: HostHttpRequestReadErrorCode;
      message: string;
    } {
  const lines = bytesToLatin1String(headerBytes).split("\r\n");
  const contentLengths: string[] = [];
  let hasTransferEncoding = false;
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name === "content-length") {
      contentLengths.push(value);
    } else if (name === "transfer-encoding" && value) {
      hasTransferEncoding = true;
    }
  }
  if (hasTransferEncoding) {
    return {
      ok: false,
      code: "transfer_encoding_unsupported",
      message: "Host HTTP request transfer encoding is unsupported",
    };
  }
  if (!contentLengths.length) {
    return { ok: true, contentLength: 0 };
  }
  if (
    contentLengths.some((value) => !/^(0|[1-9]\d*)$/.test(value)) ||
    contentLengths.some((value) => value !== contentLengths[0])
  ) {
    return {
      ok: false,
      code: "invalid_content_length",
      message: "Host HTTP request Content-Length is invalid",
    };
  }
  const contentLength = Number(contentLengths[0]);
  if (!Number.isSafeInteger(contentLength)) {
    return {
      ok: false,
      code: "invalid_content_length",
      message: "Host HTTP request Content-Length is invalid",
    };
  }
  return { ok: true, contentLength };
}

function resolveAsyncInputStream(inputStream: any) {
  if (typeof inputStream?.asyncWait === "function") {
    return inputStream;
  }
  const { interfaces } = getComponents();
  if (typeof inputStream?.QueryInterface === "function") {
    try {
      const queried = inputStream.QueryInterface(
        interfaces?.nsIAsyncInputStream,
      );
      if (typeof queried?.asyncWait === "function") {
        return queried;
      }
    } catch {
      // The caller receives the stable unavailable classification below.
    }
  }
  return null;
}

function createBinaryInputStream(inputStream: any) {
  const { classes, interfaces } = getComponents();
  const factory = classes?.["@mozilla.org/binaryinputstream;1"];
  if (!factory || !interfaces?.nsIBinaryInputStream) {
    throw new Error("Zotero binary input stream is unavailable");
  }
  const stream = factory.createInstance(interfaces.nsIBinaryInputStream);
  stream.setInputStream(inputStream);
  return stream;
}

export function readHostHttpRequest(
  inputStream: any,
  options: ReadOptions = {},
): Promise<HostHttpRequestReadResult> {
  const limits = options.limits || DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS;
  const startedAt = Date.now();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  let fragments = 0;
  let waits = 0;
  let maxCallbackDurationMs = 0;
  let headerMatch = 0;
  let framing: Framing | null = null;
  let settled = false;
  let inputClosed = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let totalTimer: ReturnType<typeof setTimeout> | null = null;
  let asyncStream: any;
  let binaryStream: any;

  const stats = (): HostHttpRequestReadStats => ({
    inputBytes: totalLength,
    headerBytes: framing?.headerBytes || 0,
    bodyBytes: framing ? Math.max(0, totalLength - framing.headerBytes) : 0,
    contentLength: framing?.contentLength || 0,
    fragments,
    waits,
    durationMs: Math.max(0, Date.now() - startedAt),
    maxCallbackDurationMs,
  });

  return new Promise<HostHttpRequestReadResult>((resolve, reject) => {
    const closeInputOnce = () => {
      if (inputClosed) return;
      inputClosed = true;
      try {
        binaryStream?.close?.();
      } catch {
        try {
          asyncStream?.close?.();
        } catch {
          // Best-effort request cleanup.
        }
      }
      if (!binaryStream && !asyncStream) {
        try {
          inputStream?.close?.();
        } catch {
          // Best-effort request cleanup.
        }
      }
    };

    const cleanup = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (totalTimer) clearTimeout(totalTimer);
      idleTimer = null;
      totalTimer = null;
      options.signal?.removeEventListener("abort", onAbort);
      try {
        asyncStream?.asyncWait?.(null, 0, 0, null);
      } catch {
        // A closed stream can reject readiness cancellation.
      }
      closeInputOnce();
    };

    const settleError = (
      code: HostHttpRequestReadErrorCode,
      message: string,
      cause?: unknown,
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new HostHttpRequestReadError(code, message, stats(), { cause }));
    };

    const settleSuccess = () => {
      if (settled || !framing) return;
      settled = true;
      const bytes = concatBytes(chunks, totalLength);
      const result: HostHttpRequestReadResult = {
        bytes,
        headerBytes: framing.headerBytes,
        bodyBytes: totalLength - framing.headerBytes,
        contentLength: framing.contentLength,
        fragments,
        waits,
        durationMs: Math.max(0, Date.now() - startedAt),
        maxCallbackDurationMs,
      };
      cleanup();
      resolve(result);
    };

    function onAbort() {
      settleError("aborted", "Host HTTP request read was aborted");
    }

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(
        () =>
          settleError(
            "idle_timeout",
            "Host HTTP request read exceeded its idle timeout",
          ),
        limits.idleTimeoutMs,
      );
    };

    const inspectChunk = (
      chunk: Uint8Array,
      previousLength: number,
    ): ReadOutcome | null => {
      if (!framing) {
        for (let index = 0; index < chunk.byteLength; index += 1) {
          const value = chunk[index];
          if (headerMatch === 0) {
            headerMatch = value === 13 ? 1 : 0;
          } else if (headerMatch === 1) {
            headerMatch = value === 10 ? 2 : value === 13 ? 1 : 0;
          } else if (headerMatch === 2) {
            headerMatch = value === 13 ? 3 : 0;
          } else if (value === 10) {
            const headerBytes = previousLength + index + 1;
            if (headerBytes > limits.maxHeaderBytes) {
              return {
                kind: "error",
                code: "header_too_large",
                message: "Host HTTP request header is too large",
              };
            }
            const parsed = parseFraming(concatPrefix(chunks, headerBytes - 4));
            if (!parsed.ok) {
              return { kind: "error", ...parsed };
            }
            if (parsed.contentLength > limits.maxBodyBytes) {
              return {
                kind: "error",
                code: "body_too_large",
                message: "Host HTTP request body is too large",
              };
            }
            framing = { headerBytes, contentLength: parsed.contentLength };
            break;
          } else {
            headerMatch = value === 13 ? 1 : 0;
          }
        }
      }

      if (!framing) {
        if (totalLength > limits.maxHeaderBytes) {
          return {
            kind: "error",
            code: "header_too_large",
            message: "Host HTTP request header is too large",
          };
        }
        return null;
      }

      const bodyBytes = totalLength - framing.headerBytes;
      if (bodyBytes > limits.maxBodyBytes) {
        return {
          kind: "error",
          code: "body_too_large",
          message: "Host HTTP request body is too large",
        };
      }
      if (bodyBytes > framing.contentLength) {
        return {
          kind: "error",
          code: "invalid_framing",
          message: "Host HTTP request contains bytes beyond Content-Length",
        };
      }
      return bodyBytes === framing.contentLength
        ? { kind: "success", framing }
        : null;
    };

    const registerWait = () => {
      if (settled) return;
      waits += 1;
      try {
        asyncStream.asyncWait(callback, 0, 0, getMainThread());
      } catch (error) {
        settleError(
          "read_failed",
          "Host HTTP request readiness registration failed",
          error,
        );
      }
    };

    const callback = {
      onInputStreamReady() {
        if (settled) return;
        const callbackStartedAt = Date.now();
        let outcome: ReadOutcome | null = null;
        try {
          const available = Number(binaryStream.available?.() || 0);
          if (available > 0) {
            const chunk = Uint8Array.from(
              binaryStream.readByteArray(available) || [],
            );
            if (!chunk.byteLength) {
              outcome = {
                kind: "error",
                code: "read_failed",
                message: "Host HTTP request read returned no bytes",
              };
            } else {
              const previousLength = totalLength;
              chunks.push(chunk);
              totalLength += chunk.byteLength;
              fragments += 1;
              resetIdleTimer();
              outcome = inspectChunk(chunk, previousLength);
            }
          }
        } catch (error) {
          outcome = isClosedStreamError(error)
            ? {
                kind: "error",
                code: "early_eof",
                message: "Host HTTP request ended before framing completed",
                cause: error,
              }
            : {
                kind: "error",
                code: "read_failed",
                message: "Host HTTP request input read failed",
                cause: error,
              };
        } finally {
          maxCallbackDurationMs = Math.max(
            maxCallbackDurationMs,
            Math.max(0, Date.now() - callbackStartedAt),
          );
        }
        if (outcome?.kind === "success") {
          settleSuccess();
        } else if (outcome?.kind === "error") {
          settleError(outcome.code, outcome.message, outcome.cause);
        } else {
          registerWait();
        }
      },
    };

    asyncStream = resolveAsyncInputStream(inputStream);
    if (!asyncStream) {
      settleError(
        "async_stream_unavailable",
        "Host HTTP request requires nsIAsyncInputStream",
      );
      return;
    }
    try {
      binaryStream = createBinaryInputStream(inputStream);
    } catch (error) {
      settleError(
        "read_failed",
        "Host HTTP request binary input stream is unavailable",
        error,
      );
      return;
    }
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    options.signal?.addEventListener("abort", onAbort, { once: true });
    resetIdleTimer();
    totalTimer = setTimeout(
      () =>
        settleError(
          "total_timeout",
          "Host HTTP request read exceeded its total timeout",
        ),
      limits.totalTimeoutMs,
    );
    registerWait();
  });
}
