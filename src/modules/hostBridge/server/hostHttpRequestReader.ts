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

export type HostHttpRequestReadHead = {
  bytes: Uint8Array;
  headerBytes: number;
  contentLength: number;
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
  deferBody?: boolean;
};

type ReadCompletion = Promise<HostHttpRequestReadResult>;

export type HostHttpRequestReadOperation = {
  head: Promise<HostHttpRequestReadHead>;
  completion: ReadCompletion;
  continue: (maxBodyBytes: number) => void;
  abort: () => void;
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
  const { classes, interfaces } = getComponents();
  const factory = classes?.["@mozilla.org/thread-manager;1"];
  if (!factory || !interfaces?.nsIThreadManager) {
    return null;
  }
  try {
    return factory.getService(interfaces.nsIThreadManager)?.mainThread || null;
  } catch {
    return null;
  }
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

export function safeDecodeHostHttpPath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseHostHttpPath(rawPath: string) {
  const query: Record<string, string> = {};
  const queryIndex = rawPath.indexOf("?");
  const path = queryIndex >= 0 ? rawPath.slice(0, queryIndex) : rawPath;
  const queryText = queryIndex >= 0 ? rawPath.slice(queryIndex + 1) : "";
  let parseError = "";
  for (const part of queryText.split("&")) {
    if (!part) continue;
    const separator = part.indexOf("=");
    const name = separator >= 0 ? part.slice(0, separator) : part;
    const value = separator >= 0 ? part.slice(separator + 1) : "";
    const decodedName = safeDecodeHostHttpPath(name);
    const decodedValue = safeDecodeHostHttpPath(value);
    if (decodedName === null || decodedValue === null) {
      parseError = "malformed_query_encoding";
      continue;
    }
    query[decodedName] = decodedValue;
  }
  return { path: path || "/", query, parseError };
}

function findHeaderSeparator(bytes: Uint8Array) {
  for (let index = 0; index <= bytes.length - 4; index += 1) {
    if (
      bytes[index] === 13 &&
      bytes[index + 1] === 10 &&
      bytes[index + 2] === 13 &&
      bytes[index + 3] === 10
    ) {
      return index;
    }
  }
  return -1;
}

function decodeUtf8Body(bytes: Uint8Array) {
  try {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    return decodeURIComponent(escape(bytesToLatin1String(bytes)));
  } catch {
    return null;
  }
}

function parseHttpHeaders(head: string) {
  const lines = head.split("\r\n");
  const [method = "", rawPath = ""] = String(lines[0] || "").split(/\s+/);
  const parsedPath = parseHostHttpPath(rawPath);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    headers[line.slice(0, separator).trim().toLowerCase()] = line
      .slice(separator + 1)
      .trim();
  }
  return { method, parsedPath, headers };
}

export function parseHostHttpRequestBytes(raw: Uint8Array): HostHttpRequest {
  const splitIndex = findHeaderSeparator(raw);
  const headBytes = splitIndex >= 0 ? raw.slice(0, splitIndex) : raw;
  const bodyBytes =
    splitIndex >= 0 ? raw.slice(splitIndex + 4) : new Uint8Array();
  const head = bytesToLatin1String(headBytes);
  const { method, parsedPath, headers } = parseHttpHeaders(head);
  const contentLength = Math.max(
    0,
    Number(headers["content-length"] || bodyBytes.length),
  );
  const boundedBodyBytes =
    contentLength > 0 ? bodyBytes.slice(0, contentLength) : new Uint8Array();
  const body = decodeUtf8Body(boundedBodyBytes);
  const bodyParseError =
    body === null && parsedPath.path !== "/bridge/v2/files/upload"
      ? "invalid_utf8_body"
      : "";
  return {
    method: method.toUpperCase(),
    path: parsedPath.path,
    query: parsedPath.query,
    headers,
    body: body || "",
    bodyBytes: boundedBodyBytes,
    bodyByteLength: boundedBodyBytes.byteLength,
    parseError: parsedPath.parseError || bodyParseError,
  };
}

export function hostHttpUtf8ByteLength(text: string) {
  return typeof TextEncoder === "function"
    ? new TextEncoder().encode(text).length
    : text.length;
}

export function parseHostHttpJsonBody(body: string): unknown {
  const trimmed = String(body || "").trim();
  return trimmed ? JSON.parse(trimmed) : {};
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

export function beginHostHttpRequestRead(
  inputStream: any,
  options: ReadOptions = {},
): HostHttpRequestReadOperation {
  const limits = options.limits || DEFAULT_HOST_HTTP_REQUEST_READ_LIMITS;
  const startedAt = Date.now();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  let fragments = 0;
  let waits = 0;
  let maxCallbackDurationMs = 0;
  let headerMatch = 0;
  let framing: Framing | null = null;
  let bodyLimit: number | null = options.deferBody ? null : limits.maxBodyBytes;
  let settled = false;
  let inputClosed = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let totalTimer: ReturnType<typeof setTimeout> | null = null;
  let asyncStream: any;
  let binaryStream: any;
  let mainThread: any;
  let abortRead: () => void = () => undefined;
  let continueRead: (maxBodyBytes: number) => void = () => undefined;
  let resolveHead: (head: HostHttpRequestReadHead) => void = () => undefined;
  let rejectHead: (error: unknown) => void = () => undefined;
  const head = new Promise<HostHttpRequestReadHead>((resolve, reject) => {
    resolveHead = resolve;
    rejectHead = reject;
  });
  void head.catch(() => undefined);

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

  const completion: ReadCompletion = new Promise((resolve, reject) => {
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
      const error = new HostHttpRequestReadError(code, message, stats(), {
        cause,
      });
      rejectHead(error);
      reject(error);
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

    abortRead = onAbort;

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
            resolveHead({
              bytes: concatPrefix(chunks, headerBytes),
              headerBytes,
              contentLength: parsed.contentLength,
            });
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
      if (bodyLimit === null) {
        return null;
      }
      if (
        framing.contentLength > bodyLimit ||
        bodyBytes > bodyLimit ||
        bodyBytes > limits.maxBodyBytes
      ) {
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
        asyncStream.asyncWait(callback, 0, 0, mainThread);
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
            const readLength =
              options.deferBody && !framing
                ? Math.min(available, 4 * 1024)
                : available;
            const chunk = Uint8Array.from(
              binaryStream.readByteArray(readLength) || [],
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
        } else if (!(framing && bodyLimit === null)) {
          registerWait();
        }
      },
    };

    continueRead = (maxBodyBytes) => {
      if (settled || !framing) return;
      bodyLimit = Math.max(0, Math.min(limits.maxBodyBytes, maxBodyBytes));
      const bodyBytes = totalLength - framing.headerBytes;
      if (framing.contentLength > bodyLimit || bodyBytes > bodyLimit) {
        settleError("body_too_large", "Host HTTP request body is too large");
      } else if (bodyBytes === framing.contentLength) {
        settleSuccess();
      } else {
        registerWait();
      }
    };

    asyncStream = resolveAsyncInputStream(inputStream);
    if (!asyncStream) {
      settleError(
        "async_stream_unavailable",
        "Host HTTP request requires nsIAsyncInputStream",
      );
      return;
    }
    mainThread = getMainThread();
    if (!mainThread) {
      settleError(
        "async_stream_unavailable",
        "Host HTTP request main-thread event target is unavailable",
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
  return {
    head,
    completion,
    continue(maxBodyBytes: number) {
      continueRead(maxBodyBytes);
    },
    abort() {
      abortRead();
    },
  };
}
import type { CancellationSignal } from "../../../utils/wait";

export type HostHttpRequest = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
  bodyBytes: Uint8Array;
  bodyByteLength: number;
  signal?: CancellationSignal;
  parseError?: string;
};
