export const RUNTIME_HTTP_RESPONSE_POLICY = Object.freeze({
  chunkBytes: 0x8000,
});

export type PreparedMemoryHttpResponse = {
  kind: "memory";
  headers: string;
  bodyBytes: Uint8Array;
  bodyCharLength: number;
  bodyByteLength: number;
  wireByteLength: number;
  contentType: string;
};

export type RuntimeMemoryResponseTransfer = {
  completion: Promise<void>;
  abort: () => void;
};

type ResponseArgs = {
  status: number;
  reason: string;
  contentType?: string;
  headers?: Record<string, string>;
};

type ResponseMetrics = {
  jsonSerializations: number;
  bodyEncodes: number;
  maxWriteChunkBytes: number;
};

const metrics: ResponseMetrics = {
  jsonSerializations: 0,
  bodyEncodes: 0,
  maxWriteChunkBytes: 0,
};

function prepareText(args: ResponseArgs & { bodyText: string }) {
  const contentType = args.contentType || "application/json";
  const bodyBytes = new TextEncoder().encode(args.bodyText);
  metrics.bodyEncodes += 1;
  const headers = [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    `Content-Type: ${contentType}; charset=utf-8`,
    `Content-Length: ${bodyBytes.byteLength}`,
    ...Object.entries(args.headers || {}).map(
      ([name, value]) => `${name}: ${value}`,
    ),
    "Connection: close",
    "",
    "",
  ].join("\r\n");
  return {
    kind: "memory" as const,
    headers,
    bodyBytes,
    bodyCharLength: args.bodyText.length,
    bodyByteLength: bodyBytes.byteLength,
    wireByteLength: headers.length + bodyBytes.byteLength,
    contentType: `${contentType}; charset=utf-8`,
  };
}

export function prepareJsonHttpResponse(
  args: ResponseArgs & { body: unknown },
): PreparedMemoryHttpResponse {
  metrics.jsonSerializations += 1;
  const serialized = JSON.stringify(args.body === undefined ? null : args.body);
  return prepareText({
    ...args,
    bodyText: serialized === undefined ? "null" : serialized,
  });
}

export function prepareTextHttpResponse(
  args: ResponseArgs & { bodyText: string },
): PreparedMemoryHttpResponse {
  return prepareText(args);
}

export function prepareEmptyHttpResponse(args: {
  status: number;
  reason: string;
  headers?: Record<string, string>;
}): PreparedMemoryHttpResponse {
  const headers = [
    `HTTP/1.1 ${args.status} ${args.reason}`,
    "Content-Length: 0",
    ...Object.entries(args.headers || {}).map(
      ([name, value]) => `${name}: ${value}`,
    ),
    "Connection: close",
    "",
    "",
  ].join("\r\n");
  return {
    kind: "memory",
    headers,
    bodyBytes: new Uint8Array(),
    bodyCharLength: 0,
    bodyByteLength: 0,
    wireByteLength: headers.length,
    contentType: "",
  };
}

function runtimeComponents() {
  const runtime = globalThis as any;
  const components = runtime.Components;
  return {
    components,
    classes: components?.classes || runtime.Cc,
    interfaces: components?.interfaces || runtime.Ci,
    results: components?.results || runtime.Cr,
  };
}

function bytesToBinaryString(bytes: Uint8Array) {
  return String.fromCharCode(...bytes);
}

function responseWireChunks(response: PreparedMemoryHttpResponse) {
  return [new TextEncoder().encode(response.headers), response.bodyBytes];
}

function observeMemoryWrite(chunkIndex: number, byteLength: number) {
  if (chunkIndex !== 1) return;
  metrics.maxWriteChunkBytes = Math.max(metrics.maxWriteChunkBytes, byteLength);
}

function beginNodeMemoryCopy(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
}) {
  let aborted = false;
  const completion = (async () => {
    const chunks = responseWireChunks(args.response);
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const source = chunks[chunkIndex];
      for (let offset = 0; offset < source.byteLength; ) {
        if (aborted) throw new Error("Runtime memory response was aborted");
        const chunk = source.subarray(
          offset,
          Math.min(
            source.byteLength,
            offset + RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes,
          ),
        );
        observeMemoryWrite(chunkIndex, chunk.byteLength);
        const written = Number(
          args.outputStream.write(bytesToBinaryString(chunk), chunk.byteLength),
        );
        if (!Number.isInteger(written) || written <= 0) {
          throw new Error("Runtime memory response made no write progress");
        }
        offset += Math.min(written, chunk.byteLength);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    args.outputStream.close?.();
  })();
  return {
    completion,
    abort() {
      aborted = true;
      args.outputStream.close?.();
    },
  };
}

function resolveAsyncOutputStream(outputStream: any) {
  if (typeof outputStream?.asyncWait === "function") {
    return outputStream;
  }
  const { interfaces } = runtimeComponents();
  if (
    typeof outputStream?.QueryInterface !== "function" ||
    !interfaces?.nsIAsyncOutputStream
  ) {
    return undefined;
  }
  try {
    const resolved = outputStream.QueryInterface(
      interfaces.nsIAsyncOutputStream,
    );
    return typeof resolved?.asyncWait === "function" ? resolved : undefined;
  } catch {
    return undefined;
  }
}

function beginAsyncMemoryCopy(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
  asyncOutputStream: any;
}): RuntimeMemoryResponseTransfer {
  const { components, results } = runtimeComponents();
  if (typeof args.asyncOutputStream?.asyncWait !== "function") {
    throw new Error(
      "Asynchronous Zotero memory response output is unavailable",
    );
  }
  const chunks = responseWireChunks(args.response);
  let chunkIndex = 0;
  let offset = 0;
  let settled = false;
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });

  const close = () => {
    try {
      args.outputStream.close?.();
    } catch {
      // Closing is best effort after completion or failure.
    }
  };
  const fail = (error: unknown) => {
    if (settled) return;
    settled = true;
    close();
    rejectCompletion(error);
  };
  const complete = () => {
    if (settled) return;
    settled = true;
    close();
    resolveCompletion();
  };
  const wouldBlock = (error: unknown) => {
    const code =
      error && typeof error === "object"
        ? Number((error as { result?: unknown }).result)
        : Number.NaN;
    return (
      Number.isFinite(code) &&
      code ===
        Number(
          results?.NS_BASE_STREAM_WOULD_BLOCK ??
            components?.results?.NS_BASE_STREAM_WOULD_BLOCK,
        )
    );
  };
  const observer = {
    onOutputStreamReady(stream: any) {
      if (settled) return;
      try {
        while (chunkIndex < chunks.length && !chunks[chunkIndex].byteLength) {
          chunkIndex += 1;
          offset = 0;
        }
        if (chunkIndex >= chunks.length) {
          complete();
          return;
        }
        const source = chunks[chunkIndex];
        const chunk = source.subarray(
          offset,
          Math.min(
            source.byteLength,
            offset + RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes,
          ),
        );
        observeMemoryWrite(chunkIndex, chunk.byteLength);
        const written = Number(
          stream.write(bytesToBinaryString(chunk), chunk.byteLength),
        );
        if (!Number.isInteger(written) || written <= 0) {
          throw new Error("Runtime memory response made no write progress");
        }
        offset += Math.min(written, chunk.byteLength);
        if (offset >= source.byteLength) {
          chunkIndex += 1;
          offset = 0;
        }
        schedule();
      } catch (error) {
        if (wouldBlock(error)) {
          schedule();
        } else {
          fail(error);
        }
      }
    },
  };
  const schedule = () => {
    if (settled) return;
    try {
      args.asyncOutputStream.asyncWait(observer, 0, 0, null);
    } catch (error) {
      fail(error);
    }
  };
  schedule();

  return {
    completion,
    abort() {
      if (settled) return;
      fail(new Error("Runtime memory response was aborted"));
    },
  };
}

export function beginRuntimeMemoryResponseTransfer(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
}): RuntimeMemoryResponseTransfer {
  const asyncOutputStream = resolveAsyncOutputStream(args.outputStream);
  return asyncOutputStream
    ? beginAsyncMemoryCopy({ ...args, asyncOutputStream })
    : beginNodeMemoryCopy(args);
}

export const runtimeHttpResponseInternalsForTests = {
  getMetrics(): ResponseMetrics {
    return { ...metrics };
  },
  resetMetrics() {
    metrics.jsonSerializations = 0;
    metrics.bodyEncodes = 0;
    metrics.maxWriteChunkBytes = 0;
  },
};
