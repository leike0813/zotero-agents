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

function beginNodeMemoryCopy(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
}) {
  let aborted = false;
  const completion = (async () => {
    for (
      let offset = 0;
      offset < args.response.bodyBytes.byteLength;
      offset += RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes
    ) {
      if (aborted) throw new Error("Runtime memory response was aborted");
      const chunk = args.response.bodyBytes.subarray(
        offset,
        Math.min(
          args.response.bodyBytes.byteLength,
          offset + RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes,
        ),
      );
      metrics.maxWriteChunkBytes = Math.max(
        metrics.maxWriteChunkBytes,
        chunk.byteLength,
      );
      args.outputStream.write(bytesToBinaryString(chunk), chunk.byteLength);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
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

function beginXpcMemoryCopy(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
}): RuntimeMemoryResponseTransfer {
  const { components, classes, interfaces, results } = runtimeComponents();
  const inputFactory = classes?.["@mozilla.org/io/arraybuffer-input-stream;1"];
  const copierFactory = classes?.["@mozilla.org/network/async-stream-copier;1"];
  if (
    !inputFactory ||
    !copierFactory ||
    !interfaces?.nsIArrayBufferInputStream ||
    !interfaces?.nsIAsyncStreamCopier2
  ) {
    throw new Error(
      "Asynchronous Zotero memory response primitives are unavailable",
    );
  }
  const input = inputFactory.createInstance(
    interfaces.nsIArrayBufferInputStream,
  );
  input.setData(
    args.response.bodyBytes.buffer,
    args.response.bodyBytes.byteOffset,
    args.response.bodyBytes.byteLength,
  );
  const copier = copierFactory.createInstance(interfaces.nsIAsyncStreamCopier2);
  metrics.maxWriteChunkBytes = Math.max(
    metrics.maxWriteChunkBytes,
    Math.min(
      RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes,
      args.response.bodyBytes.byteLength,
    ),
  );
  copier.init(
    input,
    args.outputStream,
    null,
    0,
    true,
    true,
  );
  let settled = false;
  let resolveCompletion!: () => void;
  let rejectCompletion!: (error: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  const copyRequest =
    typeof copier.QueryInterface === "function" &&
    interfaces?.nsIAsyncStreamCopier
      ? copier.QueryInterface(interfaces.nsIAsyncStreamCopier)
      : copier;
  copyRequest.asyncCopy(
    {
      onStartRequest() {},
      onStopRequest(_request: unknown, status: number) {
        if (settled) return;
        settled = true;
        const succeeded =
          status === 0 ||
          (typeof components?.isSuccessCode === "function" &&
            components.isSuccessCode(status));
        if (succeeded) resolveCompletion();
        else
          rejectCompletion(
            new Error(`Memory response copy failed (${status})`),
          );
      },
    },
    null,
  );
  return {
    completion,
    abort() {
      if (settled) return;
      settled = true;
      copier.cancel?.(
        results?.NS_BINDING_ABORTED ||
          components?.results?.NS_BINDING_ABORTED ||
          0x804b0002,
      );
      rejectCompletion(new Error("Runtime memory response was aborted"));
    },
  };
}

export function beginRuntimeMemoryResponseTransfer(args: {
  response: PreparedMemoryHttpResponse;
  outputStream: any;
}): RuntimeMemoryResponseTransfer {
  args.outputStream.write(args.response.headers, args.response.headers.length);
  if (!args.response.bodyBytes.byteLength) {
    args.outputStream.close?.();
    return { completion: Promise.resolve(), abort() {} };
  }
  const { classes } = runtimeComponents();
  return classes?.["@mozilla.org/io/arraybuffer-input-stream;1"]
    ? beginXpcMemoryCopy(args)
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
