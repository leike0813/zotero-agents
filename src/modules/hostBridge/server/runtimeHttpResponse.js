import { beginRuntimeFileResponseTransfer, } from "../../runtimeFileTransfer";
export const RUNTIME_HTTP_RESPONSE_POLICY = Object.freeze({
    chunkBytes: 0x8000,
});
const metrics = {
    jsonSerializations: 0,
    bodyEncodes: 0,
    maxWriteChunkBytes: 0,
};
function prepareText(args) {
    const contentType = args.contentType || "application/json";
    const bodyBytes = new TextEncoder().encode(args.bodyText);
    metrics.bodyEncodes += 1;
    const headers = [
        `HTTP/1.1 ${args.status} ${args.reason}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        `Content-Length: ${bodyBytes.byteLength}`,
        ...Object.entries(args.headers || {}).map(([name, value]) => `${name}: ${value}`),
        "Connection: close",
        "",
        "",
    ].join("\r\n");
    return {
        kind: "memory",
        headers,
        bodyBytes,
        bodyCharLength: args.bodyText.length,
        bodyByteLength: bodyBytes.byteLength,
        wireByteLength: headers.length + bodyBytes.byteLength,
        contentType: `${contentType}; charset=utf-8`,
    };
}
export function prepareJsonHttpResponse(args) {
    metrics.jsonSerializations += 1;
    const serialized = JSON.stringify(args.body === undefined ? null : args.body);
    return prepareText({
        ...args,
        bodyText: serialized === undefined ? "null" : serialized,
    });
}
export function prepareTextHttpResponse(args) {
    return prepareText(args);
}
export function prepareEmptyHttpResponse(args) {
    const headers = [
        `HTTP/1.1 ${args.status} ${args.reason}`,
        "Content-Length: 0",
        ...Object.entries(args.headers || {}).map(([name, value]) => `${name}: ${value}`),
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
export function prepareRuntimeHttpResponse(args) {
    return typeof args.body === "string"
        ? prepareTextHttpResponse({
            status: args.status,
            reason: args.reason,
            bodyText: args.body,
            contentType: args.contentType,
            headers: args.headers,
        })
        : prepareJsonHttpResponse({
            status: args.status,
            reason: args.reason,
            body: args.body,
            contentType: args.contentType,
            headers: args.headers,
        });
}
export function runtimeHttpBytesToBinaryString(bytes) {
    const chunks = [];
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        chunks.push(String.fromCharCode(...bytes.slice(offset, offset + chunkSize)));
    }
    return chunks.join("");
}
function headerSafeFilename(filename) {
    return String(filename || "download.bin")
        .split("")
        .map((char) => {
        const code = char.charCodeAt(0);
        return char === '"' || code <= 0x1f || code === 0x7f ? "_" : char;
    })
        .join("");
}
function asciiContentDispositionFilename(filename) {
    const safe = headerSafeFilename(filename);
    const ascii = safe.replace(/[^\x20-\x7e]/g, "_").trim();
    const extension = safe.match(/(\.[A-Za-z0-9]{1,16})$/)?.[1] || ".bin";
    const stem = ascii.replace(/(\.[A-Za-z0-9]{1,16})$/, "");
    return /[A-Za-z0-9]/.test(stem)
        ? ascii || `download${extension}`
        : `download${extension}`;
}
function encodeContentDispositionFilename(filename) {
    const safe = headerSafeFilename(filename);
    return encodeURIComponent(safe)
        .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
        .replace(/\*/g, "%2A");
}
export function prepareRuntimeFileHttpResponse(args) {
    const fallback = asciiContentDispositionFilename(args.filename);
    const encoded = encodeContentDispositionFilename(args.filename || fallback);
    const contentDisposition = `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
    const headers = [
        "HTTP/1.1 200 OK",
        `Content-Type: ${args.contentType || "application/octet-stream"}`,
        `Content-Length: ${args.source.size}`,
        ...(args.sha256 ? [`X-Zotero-Bridge-Sha256: ${args.sha256}`] : []),
        `Content-Disposition: ${contentDisposition}`,
        "Connection: close",
        "",
        "",
    ].join("\r\n");
    return { kind: "file", headers, source: args.source };
}
function runtimeComponents() {
    const runtime = globalThis;
    const components = runtime.Components;
    return {
        components,
        classes: components?.classes || runtime.Cc,
        interfaces: components?.interfaces || runtime.Ci,
        results: components?.results || runtime.Cr,
    };
}
function bytesToBinaryString(bytes) {
    return String.fromCharCode(...bytes);
}
function responseWireChunks(response) {
    return [new TextEncoder().encode(response.headers), response.bodyBytes];
}
function observeMemoryWrite(chunkIndex, byteLength) {
    if (chunkIndex !== 1)
        return;
    metrics.maxWriteChunkBytes = Math.max(metrics.maxWriteChunkBytes, byteLength);
}
function beginNodeMemoryCopy(args) {
    let aborted = false;
    const completion = (async () => {
        const chunks = responseWireChunks(args.response);
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
            const source = chunks[chunkIndex];
            for (let offset = 0; offset < source.byteLength;) {
                if (aborted)
                    throw new Error("Runtime memory response was aborted");
                const chunk = source.subarray(offset, Math.min(source.byteLength, offset + RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes));
                observeMemoryWrite(chunkIndex, chunk.byteLength);
                const written = Number(args.outputStream.write(bytesToBinaryString(chunk), chunk.byteLength));
                if (!Number.isInteger(written) || written <= 0) {
                    throw new Error("Runtime memory response made no write progress");
                }
                offset += Math.min(written, chunk.byteLength);
                await new Promise((resolve) => setTimeout(resolve, 0));
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
function resolveAsyncOutputStream(outputStream) {
    if (typeof outputStream?.asyncWait === "function") {
        return outputStream;
    }
    const { interfaces } = runtimeComponents();
    if (typeof outputStream?.QueryInterface !== "function" ||
        !interfaces?.nsIAsyncOutputStream) {
        return undefined;
    }
    try {
        const resolved = outputStream.QueryInterface(interfaces.nsIAsyncOutputStream);
        return typeof resolved?.asyncWait === "function" ? resolved : undefined;
    }
    catch {
        return undefined;
    }
}
function beginAsyncMemoryCopy(args) {
    const { components, results } = runtimeComponents();
    if (typeof args.asyncOutputStream?.asyncWait !== "function") {
        throw new Error("Asynchronous Zotero memory response output is unavailable");
    }
    const chunks = responseWireChunks(args.response);
    let chunkIndex = 0;
    let offset = 0;
    let settled = false;
    let resolveCompletion;
    let rejectCompletion;
    const completion = new Promise((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
    });
    const close = () => {
        try {
            args.outputStream.close?.();
        }
        catch {
            // Closing is best effort after completion or failure.
        }
    };
    const fail = (error) => {
        if (settled)
            return;
        settled = true;
        close();
        rejectCompletion(error);
    };
    const complete = () => {
        if (settled)
            return;
        settled = true;
        close();
        resolveCompletion();
    };
    const wouldBlock = (error) => {
        const code = error && typeof error === "object"
            ? Number(error.result)
            : Number.NaN;
        return (Number.isFinite(code) &&
            code ===
                Number(results?.NS_BASE_STREAM_WOULD_BLOCK ??
                    components?.results?.NS_BASE_STREAM_WOULD_BLOCK));
    };
    const observer = {
        onOutputStreamReady(stream) {
            if (settled)
                return;
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
                const chunk = source.subarray(offset, Math.min(source.byteLength, offset + RUNTIME_HTTP_RESPONSE_POLICY.chunkBytes));
                observeMemoryWrite(chunkIndex, chunk.byteLength);
                const written = Number(stream.write(bytesToBinaryString(chunk), chunk.byteLength));
                if (!Number.isInteger(written) || written <= 0) {
                    throw new Error("Runtime memory response made no write progress");
                }
                offset += Math.min(written, chunk.byteLength);
                if (offset >= source.byteLength) {
                    chunkIndex += 1;
                    offset = 0;
                }
                schedule();
            }
            catch (error) {
                if (wouldBlock(error)) {
                    schedule();
                }
                else {
                    fail(error);
                }
            }
        },
    };
    const schedule = () => {
        if (settled)
            return;
        try {
            args.asyncOutputStream.asyncWait(observer, 0, 0, null);
        }
        catch (error) {
            fail(error);
        }
    };
    schedule();
    return {
        completion,
        abort() {
            if (settled)
                return;
            fail(new Error("Runtime memory response was aborted"));
        },
    };
}
export function beginRuntimeMemoryResponseTransfer(args) {
    const asyncOutputStream = resolveAsyncOutputStream(args.outputStream);
    return asyncOutputStream
        ? beginAsyncMemoryCopy({ ...args, asyncOutputStream })
        : beginNodeMemoryCopy(args);
}
export async function writeRuntimeHttpResponse(outputStream, response, onTransfer) {
    if (response.kind === "file") {
        const transfer = beginRuntimeFileResponseTransfer({
            headers: response.headers,
            source: response.source,
            outputStream,
        });
        onTransfer?.(transfer);
        await transfer.completion;
        return;
    }
    const transfer = beginRuntimeMemoryResponseTransfer({
        response,
        outputStream,
    });
    onTransfer?.(transfer);
    await transfer.completion;
}
export const runtimeHttpResponseInternalsForTests = {
    getMetrics() {
        return { ...metrics };
    },
    resetMetrics() {
        metrics.jsonSerializations = 0;
        metrics.bodyEncodes = 0;
        metrics.maxWriteChunkBytes = 0;
    },
};
