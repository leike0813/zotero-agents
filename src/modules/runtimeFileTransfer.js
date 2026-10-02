import { createSha256Accumulator } from "../utils/sha256";
import { statRuntimePath } from "./runtimePersistence";
export const RUNTIME_FILE_TRANSFER_POLICY = Object.freeze({
    chunkBytes: 0x8000,
    maxConcurrentTransfers: 1,
});
export class RuntimeFileTransferError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "RuntimeFileTransferError";
        this.code = code;
        this.details = details;
    }
}
const dynamicImport = new Function("specifier", "return import(specifier)");
const metrics = {
    activeTransfers: 0,
    peakActiveTransfers: 0,
    maxChunkBytes: 0,
    digestBytes: 0,
    copyBytes: 0,
};
const transferWaiters = [];
let activeTransfers = 0;
function observeChunk(bytes, phase) {
    metrics.maxChunkBytes = Math.max(metrics.maxChunkBytes, bytes);
    if (phase === "digest") {
        metrics.digestBytes += bytes;
    }
    else {
        metrics.copyBytes += bytes;
    }
}
async function acquireTransferSlot() {
    if (activeTransfers < RUNTIME_FILE_TRANSFER_POLICY.maxConcurrentTransfers &&
        transferWaiters.length === 0) {
        activeTransfers += 1;
    }
    else {
        await new Promise((resolve) => transferWaiters.push(resolve));
    }
    metrics.activeTransfers = activeTransfers;
    metrics.peakActiveTransfers = Math.max(metrics.peakActiveTransfers, activeTransfers);
}
function releaseTransferSlot() {
    const next = transferWaiters.shift();
    if (next) {
        next();
        return;
    }
    activeTransfers = Math.max(0, activeTransfers - 1);
    metrics.activeTransfers = activeTransfers;
}
async function withTransferSlot(operation) {
    await acquireTransferSlot();
    try {
        return await operation();
    }
    finally {
        releaseTransferSlot();
    }
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
function createLocalFile(path, classes, interfaces) {
    const fileFactory = classes?.["@mozilla.org/file/local;1"];
    const nsIFile = interfaces?.nsIFile;
    if (!fileFactory || !nsIFile)
        return undefined;
    const file = fileFactory.createInstance(nsIFile);
    file.initWithPath(path);
    return file;
}
async function statRuntimeFile(path) {
    const stat = await statRuntimePath(path);
    if (stat.exists && !stat.isDir) {
        return stat.size;
    }
    throw new RuntimeFileTransferError("runtime_file_unavailable", "Runtime file is unavailable", { path });
}
async function readNodeFileChunks(path, onChunk) {
    const fs = await dynamicImport("fs/promises");
    const handle = await fs.open(path, "r");
    let bytesReadTotal = 0;
    try {
        while (true) {
            const buffer = new Uint8Array(RUNTIME_FILE_TRANSFER_POLICY.chunkBytes);
            const result = await handle.read(buffer, 0, buffer.byteLength, bytesReadTotal);
            const bytesRead = Number(result?.bytesRead || 0);
            if (bytesRead <= 0)
                break;
            const chunk = bytesRead === buffer.byteLength
                ? buffer
                : buffer.subarray(0, bytesRead);
            onChunk(chunk);
            bytesReadTotal += bytesRead;
        }
        return bytesReadTotal;
    }
    finally {
        await handle.close();
    }
}
function readXpcFileChunks(path, onChunk) {
    const { components, classes, interfaces } = runtimeComponents();
    const file = createLocalFile(path, classes, interfaces);
    const fileInputFactory = classes?.["@mozilla.org/network/file-input-stream;1"];
    const transportFactory = classes?.["@mozilla.org/network/stream-transport-service;1"];
    const pumpFactory = classes?.["@mozilla.org/network/input-stream-pump;1"];
    const binaryFactory = classes?.["@mozilla.org/binaryinputstream;1"];
    if (!file ||
        !fileInputFactory ||
        !transportFactory ||
        !pumpFactory ||
        !binaryFactory ||
        !interfaces?.nsIFileInputStream ||
        !interfaces?.nsIStreamTransportService ||
        !interfaces?.nsIInputStreamPump ||
        !interfaces?.nsIBinaryInputStream) {
        return Promise.reject(new RuntimeFileTransferError("runtime_file_transfer_unavailable", "Asynchronous Zotero file input primitives are unavailable", { path }));
    }
    return new Promise((resolve, reject) => {
        const fileInput = fileInputFactory.createInstance(interfaces.nsIFileInputStream);
        fileInput.init(file, 0x01, 0o444, 0);
        const transportService = transportFactory.getService(interfaces.nsIStreamTransportService);
        const transport = transportService.createInputTransport(fileInput, 0, -1, true);
        const asyncInput = transport.openInputStream(0, RUNTIME_FILE_TRANSFER_POLICY.chunkBytes, 1);
        const pump = pumpFactory.createInstance(interfaces.nsIInputStreamPump);
        try {
            pump.init(asyncInput, RUNTIME_FILE_TRANSFER_POLICY.chunkBytes, 1, false);
        }
        catch {
            pump.init(asyncInput, 0, 0, RUNTIME_FILE_TRANSFER_POLICY.chunkBytes, 1, false);
        }
        let bytesReadTotal = 0;
        pump.asyncRead({
            onStartRequest() { },
            onDataAvailable(_request, inputStream, _offset, count) {
                try {
                    const binary = binaryFactory.createInstance(interfaces.nsIBinaryInputStream);
                    binary.setInputStream(inputStream);
                    const chunk = Uint8Array.from(binary.readByteArray(count));
                    onChunk(chunk);
                    bytesReadTotal += chunk.byteLength;
                }
                catch (error) {
                    pump.cancel?.(components?.results?.NS_ERROR_FAILURE || 0x80004005);
                    reject(error);
                }
            },
            onStopRequest(_request, status) {
                try {
                    asyncInput.close?.();
                }
                catch {
                    // Best-effort stream cleanup.
                }
                const succeeded = status === 0 ||
                    (typeof components?.isSuccessCode === "function" &&
                        components.isSuccessCode(status));
                if (succeeded) {
                    resolve(bytesReadTotal);
                }
                else {
                    reject(new RuntimeFileTransferError("runtime_file_transfer_failed", "Asynchronous Zotero file read failed", { path, status }));
                }
            },
        }, null);
    });
}
async function readRuntimeFileChunks(path, onChunk) {
    const runtime = globalThis;
    const { classes } = runtimeComponents();
    if (classes?.["@mozilla.org/network/input-stream-pump;1"] &&
        classes?.["@mozilla.org/network/stream-transport-service;1"]) {
        return readXpcFileChunks(path, onChunk);
    }
    if (runtime.process) {
        return readNodeFileChunks(path, onChunk);
    }
    throw new RuntimeFileTransferError("runtime_file_transfer_unavailable", "No bounded runtime file reader is available", { path });
}
export async function inspectRuntimeFileSource(pathRaw, sha256) {
    const path = String(pathRaw || "").trim();
    if (!path) {
        throw new RuntimeFileTransferError("runtime_file_unavailable", "Runtime file path is required");
    }
    try {
        const size = await statRuntimeFile(path);
        return {
            path,
            size,
            ...(sha256 ? { sha256: String(sha256) } : {}),
        };
    }
    catch (error) {
        if (error instanceof RuntimeFileTransferError)
            throw error;
        throw new RuntimeFileTransferError("runtime_file_unavailable", "Runtime file is unavailable", {
            path,
            message: error instanceof Error ? error.message : String(error || ""),
        });
    }
}
export async function digestRuntimeFileSource(source) {
    return withTransferSlot(async () => {
        const accumulator = await createSha256Accumulator();
        if (!accumulator) {
            throw new RuntimeFileTransferError("runtime_file_transfer_unavailable", "No incremental SHA-256 backend is available", { path: source.path });
        }
        let observed = 0;
        const bytesRead = await readRuntimeFileChunks(source.path, (chunk) => {
            observed += chunk.byteLength;
            if (observed > source.size)
                throw new RuntimeFileTransferError("runtime_file_changed", "Runtime file exceeded its declared size");
            observeChunk(chunk.byteLength, "digest");
            accumulator.update(chunk);
        });
        return {
            bytesRead,
            sha256: `sha256:${accumulator.digestHex()}`,
        };
    });
}
export async function verifyRuntimeFileSource(source) {
    const inspected = await inspectRuntimeFileSource(source.path, source.sha256);
    if (inspected.size !== source.size) {
        throw new RuntimeFileTransferError("runtime_file_changed", "Runtime file size changed", {
            path: source.path,
            bytesExpected: source.size,
            bytesActual: inspected.size,
        });
    }
    if (!source.sha256)
        return inspected;
    const digest = await digestRuntimeFileSource(inspected);
    if (digest.bytesRead !== source.size || digest.sha256 !== source.sha256) {
        throw new RuntimeFileTransferError("runtime_file_changed", "Runtime file checksum changed", {
            path: source.path,
            bytesExpected: source.size,
            bytesActual: digest.bytesRead,
            sha256Expected: source.sha256,
            sha256Actual: digest.sha256,
        });
    }
    return inspected;
}
export async function collectRuntimeFileSourceBytes(source) {
    return withTransferSlot(async () => {
        const bytes = new Uint8Array(source.size);
        let offset = 0;
        const bytesRead = await readRuntimeFileChunks(source.path, (chunk) => {
            if (offset + chunk.byteLength > source.size)
                throw new RuntimeFileTransferError("runtime_file_changed", "Runtime file exceeded its declared size");
            observeChunk(chunk.byteLength, "copy");
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        });
        if (bytesRead !== source.size)
            throw new RuntimeFileTransferError("runtime_file_changed", "Runtime file size changed");
        return bytes;
    });
}
function beginXpcFileCopy(args) {
    const { components, classes, interfaces, results } = runtimeComponents();
    const file = createLocalFile(args.source.path, classes, interfaces);
    const fileInputFactory = classes?.["@mozilla.org/network/file-input-stream;1"];
    const transportFactory = classes?.["@mozilla.org/network/stream-transport-service;1"];
    const copierFactory = classes?.["@mozilla.org/network/async-stream-copier;1"];
    if (!file ||
        !fileInputFactory ||
        !transportFactory ||
        !copierFactory ||
        !interfaces?.nsIFileInputStream ||
        !interfaces?.nsIStreamTransportService ||
        !interfaces?.nsIAsyncStreamCopier2) {
        throw new RuntimeFileTransferError("runtime_file_transfer_unavailable", "Asynchronous Zotero file copy primitives are unavailable", { path: args.source.path });
    }
    const fileInput = fileInputFactory.createInstance(interfaces.nsIFileInputStream);
    fileInput.init(file, 0x01, 0o444, 0);
    const transportService = transportFactory.getService(interfaces.nsIStreamTransportService);
    const copier = copierFactory.createInstance(interfaces.nsIAsyncStreamCopier2);
    metrics.maxChunkBytes = Math.max(metrics.maxChunkBytes, RUNTIME_FILE_TRANSFER_POLICY.chunkBytes);
    copier.init(fileInput, args.outputStream, transportService, RUNTIME_FILE_TRANSFER_POLICY.chunkBytes, true, true);
    let settled = false;
    let resolveCompletion;
    let rejectCompletion;
    const completion = new Promise((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
    });
    copier.asyncCopy({
        onStartRequest() { },
        onStopRequest(_request, status) {
            if (settled)
                return;
            settled = true;
            const succeeded = status === 0 ||
                (typeof components?.isSuccessCode === "function" &&
                    components.isSuccessCode(status));
            if (succeeded) {
                metrics.copyBytes += args.source.size;
                resolveCompletion();
            }
            else {
                rejectCompletion(new RuntimeFileTransferError("runtime_file_transfer_failed", "Asynchronous Zotero file copy failed", { path: args.source.path, status }));
            }
        },
    }, null);
    return {
        completion,
        abort() {
            if (settled)
                return;
            settled = true;
            try {
                copier.cancel?.(results?.NS_BINDING_ABORTED ||
                    components?.results?.NS_BINDING_ABORTED ||
                    0x804b0002);
            }
            finally {
                rejectCompletion(new RuntimeFileTransferError("runtime_file_transfer_failed", "Runtime file copy was aborted", { path: args.source.path }));
            }
        },
    };
}
function beginNodeFileCopy(args) {
    let aborted = false;
    const completion = readNodeFileChunks(args.source.path, (chunk) => {
        if (aborted) {
            throw new RuntimeFileTransferError("runtime_file_transfer_failed", "Runtime file copy was aborted");
        }
        observeChunk(chunk.byteLength, "copy");
        args.outputStream.write(chunk, chunk.byteLength);
    }).then(() => {
        args.outputStream.close?.();
    });
    return {
        completion,
        abort() {
            aborted = true;
            args.outputStream.close?.();
        },
    };
}
export function beginRuntimeFileResponseTransfer(args) {
    let backend;
    let aborted = false;
    const completion = withTransferSlot(async () => {
        if (aborted) {
            throw new RuntimeFileTransferError("runtime_file_transfer_failed", "Runtime file response was aborted before copy");
        }
        args.outputStream.write(args.headers, args.headers.length);
        const { classes } = runtimeComponents();
        backend = classes?.["@mozilla.org/network/async-stream-copier;1"]
            ? beginXpcFileCopy(args)
            : beginNodeFileCopy(args);
        await backend.completion;
    });
    return {
        completion,
        abort() {
            aborted = true;
            backend?.abort();
        },
    };
}
export const runtimeFileTransferInternalsForTests = {
    getMetrics() {
        return { ...metrics };
    },
    resetMetrics() {
        metrics.activeTransfers = activeTransfers;
        metrics.peakActiveTransfers = activeTransfers;
        metrics.maxChunkBytes = 0;
        metrics.digestBytes = 0;
        metrics.copyBytes = 0;
    },
};
