import { getMozillaSubprocessModule, normalizeSubprocessExitCode, } from "./subprocess";
import { ensureWindowsStdioBridgeService, getWindowsStdioWebSocketConstructor, shouldUseWindowsStdioBridge, } from "./windowsStdioBridgeService";
import { waitForBoundedPromise, } from "../utils/wait";
const dynamicImport = new Function("specifier", "return import(specifier)");
const MAX_PENDING_BYTES = 16 * 1024 * 1024;
const TERMINATION_WAIT_MS = 1_000;
const WINDOWS_TERMINATION_WAIT_MS = 2_500;
function byteQueue(onOverflow) {
    const pending = [];
    const readers = [];
    let pendingBytes = 0;
    let done = false;
    let error = null;
    const drain = () => {
        while (readers.length) {
            const reader = readers.shift();
            if (error) {
                reader.reject(error);
            }
            else if (pending.length) {
                const value = pending.shift();
                pendingBytes -= value.byteLength;
                reader.resolve({ done: false, value });
            }
            else if (done) {
                reader.resolve({ done: true });
            }
            else {
                readers.unshift(reader);
                break;
            }
        }
    };
    return {
        push(value) {
            if (done || error)
                return;
            if (pendingBytes + value.byteLength > MAX_PENDING_BYTES) {
                this.fail(new Error("long-lived process stream buffer exceeded 16 MiB"));
                onOverflow();
                return;
            }
            pending.push(value);
            pendingBytes += value.byteLength;
            drain();
        },
        end() {
            done = true;
            drain();
        },
        fail(cause) {
            error = cause;
            pending.length = 0;
            pendingBytes = 0;
            drain();
        },
        readable: {
            getReader() {
                let released = false;
                return {
                    read() {
                        if (released)
                            return Promise.resolve({ done: true });
                        if (error)
                            return Promise.reject(error);
                        if (pending.length) {
                            const value = pending.shift();
                            pendingBytes -= value.byteLength;
                            return Promise.resolve({ done: false, value });
                        }
                        if (done)
                            return Promise.resolve({ done: true });
                        return new Promise((resolve, reject) => {
                            readers.push({ resolve, reject });
                        });
                    },
                    releaseLock() {
                        released = true;
                    },
                };
            },
        },
    };
}
function boundedWait(promise, timeoutMs) {
    let timer;
    return Promise.race([
        promise,
        new Promise((resolve) => {
            timer = setTimeout(() => resolve(null), timeoutMs);
        }),
    ]).finally(() => {
        if (timer)
            clearTimeout(timer);
    });
}
function ensureRequest(request) {
    if (!request.executable ||
        request.executable.includes("\0") ||
        !Array.isArray(request.argv) ||
        request.argv.some((arg) => typeof arg !== "string" || arg.includes("\0")) ||
        !request.cwd ||
        request.cwd.includes("\0")) {
        throw new Error("resolved executable, argv, and cwd are required");
    }
    if (!request.environment ||
        Object.entries(request.environment).some(([key, value]) => !key ||
            key.includes("=") ||
            key.includes("\0") ||
            typeof value !== "string" ||
            value.includes("\0"))) {
        throw new Error("process environment contains an invalid entry");
    }
}
function toBytes(value) {
    if (value instanceof Uint8Array)
        return new Uint8Array(value);
    return new TextEncoder().encode(String(value ?? ""));
}
async function startNodeProcess(request) {
    const { spawn } = await dynamicImport("node:child_process");
    const child = spawn(request.executable, request.argv, {
        cwd: request.cwd,
        env: request.environment,
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
        windowsHide: true,
        shell: false,
    });
    let terminationRequested = false;
    let settled = null;
    const snapshot = () => settled || {
        adapter: "node",
        pid: typeof child.pid === "number" ? child.pid : null,
        exitCode: null,
        outcome: "running",
        terminationRequested,
    };
    const stdout = byteQueue(() => {
        void terminate();
    });
    const stderr = byteQueue(() => {
        void terminate();
    });
    child.stdout.on("data", (chunk) => stdout.push(toBytes(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(toBytes(chunk)));
    child.stdout.once("end", () => stdout.end());
    child.stderr.once("end", () => stderr.end());
    child.stdout.once("error", (error) => stdout.fail(error));
    child.stderr.once("error", (error) => stderr.fail(error));
    const exit = new Promise((resolve) => {
        child.once("error", (error) => {
            if (settled)
                return;
            stdout.fail(error);
            stderr.fail(error);
            settled = { ...snapshot(), outcome: "unknown" };
            resolve(settled);
        });
        child.once("close", (code) => {
            stdout.end();
            stderr.end();
            if (settled)
                return;
            settled = {
                adapter: "node",
                pid: snapshot().pid,
                exitCode: typeof code === "number" ? code : null,
                outcome: "exited",
                terminationRequested,
            };
            resolve(settled);
        });
    });
    const signal = (name) => {
        try {
            child.kill(name);
        }
        catch {
            /* Exit may have raced with cleanup. */
        }
    };
    async function terminate() {
        terminationRequested = true;
        if (settled)
            return settled;
        signal("SIGTERM");
        const graceful = await boundedWait(exit, TERMINATION_WAIT_MS);
        if (graceful)
            return graceful;
        signal("SIGKILL");
        return ((await boundedWait(exit, TERMINATION_WAIT_MS)) || {
            ...snapshot(),
            outcome: "unknown",
        });
    }
    let eof = false;
    return {
        stdin: {
            getWriter() {
                return {
                    async write(chunk) {
                        if (eof || chunk.byteLength > MAX_PENDING_BYTES)
                            throw new Error("stdin is closed or chunk exceeds 16 MiB");
                        await new Promise((resolve, reject) => child.stdin.write(chunk, (error) => error ? reject(error) : resolve()));
                    },
                    async close() {
                        if (eof)
                            return;
                        eof = true;
                        await new Promise((resolve, reject) => child.stdin.end((error) => error ? reject(error) : resolve()));
                    },
                    releaseLock() { },
                };
            },
        },
        stdout: stdout.readable,
        stderr: stderr.readable,
        wait: () => exit,
        terminate,
        snapshot,
    };
}
async function startMozillaProcess(request) {
    const subprocess = getMozillaSubprocessModule();
    if (!subprocess?.call)
        throw new Error("Mozilla Subprocess is unavailable");
    const child = await subprocess.call({
        command: request.executable,
        arguments: request.argv,
        workdir: request.cwd,
        environment: request.environment,
        environmentAppend: true,
        stderr: "pipe",
    });
    let terminationRequested = false;
    let settled = null;
    const snapshot = () => settled || {
        adapter: "mozilla",
        pid: typeof child.pid === "number" ? child.pid : null,
        exitCode: null,
        outcome: "running",
        terminationRequested,
    };
    const stdout = byteQueue(() => {
        void terminate();
    });
    const stderr = byteQueue(() => {
        void terminate();
    });
    const pump = async (pipe, queue) => {
        try {
            while (pipe?.readString) {
                const value = await pipe.readString();
                if (!value)
                    break;
                queue.push(toBytes(value));
            }
            queue.end();
        }
        catch (error) {
            queue.fail(error instanceof Error ? error : new Error(String(error)));
        }
    };
    void pump(child.stdout, stdout);
    void pump(child.stderr, stderr);
    const exit = (child.wait
        ? child.wait()
        : Promise.reject(new Error("Mozilla process has no wait method"))).then((value) => {
        settled = {
            adapter: "mozilla",
            pid: snapshot().pid,
            exitCode: normalizeSubprocessExitCode(value) ??
                normalizeSubprocessExitCode(child),
            outcome: "exited",
            terminationRequested,
        };
        return settled;
    }, () => {
        settled = { ...snapshot(), outcome: "unknown" };
        return settled;
    });
    async function terminate() {
        terminationRequested = true;
        if (settled)
            return settled;
        try {
            child.kill?.(0);
        }
        catch {
            /* Exit may have raced with cleanup. */
        }
        return ((await boundedWait(exit, TERMINATION_WAIT_MS)) || {
            ...snapshot(),
            outcome: "unknown",
        });
    }
    let eof = false;
    const decoder = new TextDecoder();
    return {
        stdin: {
            getWriter() {
                return {
                    async write(chunk) {
                        if (eof || chunk.byteLength > MAX_PENDING_BYTES)
                            throw new Error("stdin is closed or chunk exceeds 16 MiB");
                        const text = decoder.decode(chunk, { stream: true });
                        if (text)
                            await child.stdin?.write?.(text);
                    },
                    async close() {
                        if (!eof) {
                            eof = true;
                            const tail = decoder.decode();
                            if (tail)
                                await child.stdin?.write?.(tail);
                            await child.stdin?.close?.();
                        }
                    },
                    releaseLock() { },
                };
            },
        },
        stdout: stdout.readable,
        stderr: stderr.readable,
        wait: () => exit,
        terminate,
        snapshot,
    };
}
async function decodeFrame(value) {
    if (value instanceof Uint8Array)
        return new Uint8Array(value);
    if (value instanceof ArrayBuffer ||
        Object.prototype.toString.call(value) === "[object ArrayBuffer]") {
        return new Uint8Array(value);
    }
    if (ArrayBuffer.isView(value)) {
        const view = value;
        return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    }
    if (value &&
        typeof value.arrayBuffer === "function") {
        return new Uint8Array(await value.arrayBuffer());
    }
    return null;
}
function decodeBase64Bytes(value) {
    if (typeof value !== "string" || !value)
        return new Uint8Array();
    const binary = globalThis.atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
function frameBytes(value) {
    if (typeof value === "string")
        return value.length * 2;
    if (value instanceof ArrayBuffer ||
        Object.prototype.toString.call(value) === "[object ArrayBuffer]") {
        return value.byteLength;
    }
    if (ArrayBuffer.isView(value))
        return value.byteLength;
    if (value && typeof value.size === "number") {
        return value.size;
    }
    return 0;
}
function describeSocketEvent(event) {
    if (!event || typeof event !== "object")
        return String(event || "");
    const record = event;
    const parts = ["type", "message", "code", "reason"]
        .filter((key) => record[key] !== undefined && record[key] !== "")
        .map((key) => `${key}=${String(record[key])}`);
    const target = record.target;
    if (target?.readyState !== undefined) {
        parts.push(`readyState=${String(target.readyState)}`);
    }
    return parts.join(" ");
}
async function startWindowsProcess(request) {
    const bridge = await ensureWindowsStdioBridgeService();
    const Socket = getWindowsStdioWebSocketConstructor();
    const socket = new Socket(bridge.url);
    socket.binaryType = "arraybuffer";
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let terminationRequested = false;
    let settled = null;
    let opened = false;
    let eof = false;
    let startupResolve;
    let startupReject;
    let exitResolve;
    let messageChain = Promise.resolve();
    let pendingFrameBytes = 0;
    let webSocketError = "";
    let readError = "";
    const redactedBridgeUrl = bridge.url.replace(/([?&]token=)[^&]+/i, "$1<redacted>");
    const snapshot = () => settled || {
        adapter: "websocket-bridge",
        pid: null,
        exitCode: null,
        outcome: "running",
        terminationRequested,
        spawnId: id,
        bridgePid: bridge.pid,
        bridgeUrl: redactedBridgeUrl,
        webSocketError,
        readError,
    };
    const exit = new Promise((resolve) => {
        exitResolve = resolve;
    });
    const finish = (result) => {
        if (settled)
            return;
        settled = result;
        stdout.end();
        stderr.end();
        exitResolve?.(result);
    };
    const stdout = byteQueue(() => {
        void terminate();
    });
    const stderr = byteQueue(() => {
        void terminate();
    });
    const startup = new Promise((resolve, reject) => {
        startupResolve = resolve;
        startupReject = reject;
    });
    socket.onopen = () => {
        opened = true;
        socket.send(JSON.stringify({
            type: "spawn",
            id,
            command: request.executable,
            args: request.argv,
            cwd: request.cwd,
            env: request.environment,
            ...(request.auditFile ? { auditFile: request.auditFile } : {}),
        }));
    };
    socket.onmessage = (event) => {
        const frameSize = frameBytes(event.data);
        if (pendingFrameBytes + frameSize > MAX_PENDING_BYTES) {
            const cause = new Error("stdio bridge pending frames exceeded 16 MiB");
            stdout.fail(cause);
            stderr.fail(cause);
            startupReject?.(cause);
            void terminate();
            return;
        }
        pendingFrameBytes += frameSize;
        messageChain = messageChain
            .then(async () => {
            if (typeof event.data === "string") {
                const message = JSON.parse(event.data);
                if (message.id !== undefined && message.id !== id)
                    throw new Error("stdio bridge response id mismatch");
                switch (message.type) {
                    case "spawned":
                        if (!settled) {
                            const pid = typeof message.pid === "number" && message.pid > 0
                                ? message.pid
                                : null;
                            childPid = pid;
                            startupResolve?.();
                        }
                        return;
                    case "stderr":
                        stderr.push(decodeBase64Bytes(message.dataBase64));
                        return;
                    case "exit":
                        finish({
                            ...snapshot(),
                            pid: childPid,
                            exitCode: normalizeSubprocessExitCode(message.code),
                            outcome: "exited",
                        });
                        return;
                    case "error":
                        throw new Error(String(message.message || "stdio bridge error"));
                }
                return;
            }
            const bytes = await decodeFrame(event.data);
            if (!bytes)
                throw new Error(`stdio bridge stdout frame has unsupported data type: ${Object.prototype.toString.call(event.data)}`);
            stdout.push(bytes);
        })
            .catch((error) => {
            const cause = error instanceof Error ? error : new Error(String(error));
            readError = cause.message;
            stdout.fail(cause);
            stderr.fail(cause);
            startupReject?.(cause);
            try {
                socket.close();
            }
            catch {
                /* Socket may already be closed. */
            }
        })
            .finally(() => {
            pendingFrameBytes -= frameSize;
        });
    };
    socket.onerror = (event) => {
        const detail = describeSocketEvent(event);
        const cause = new Error(`stdio bridge WebSocket error${detail ? `: ${detail}` : ""}`);
        webSocketError = cause.message;
        startupReject?.(cause);
        stdout.fail(cause);
        stderr.fail(cause);
        try {
            socket.close();
        }
        catch {
            /* Disconnect is uncertain. */
        }
    };
    socket.onclose = () => {
        void messageChain.finally(() => {
            startupReject?.(new Error("stdio bridge closed before spawn"));
            finish({ ...snapshot(), outcome: "unknown" });
        });
    };
    let childPid = null;
    try {
        await waitForBoundedPromise(startup, {
            phase: "windows-stdio-bridge-spawn",
            timeoutMs: Math.min(request.startup?.timeoutMs ?? 60_000, 60_000),
            signal: request.startup?.signal,
        });
    }
    catch (error) {
        try {
            socket.close();
        }
        catch {
            /* Startup socket may not have opened. */
        }
        throw error;
    }
    const currentSnapshot = () => ({
        ...snapshot(),
        pid: childPid,
        webSocketError,
        readError,
    });
    async function terminate() {
        terminationRequested = true;
        if (settled)
            return currentSnapshot();
        if (opened) {
            try {
                socket.send(JSON.stringify({ type: "terminate", id }));
            }
            catch {
                /* Disconnect is uncertain. */
            }
        }
        const observed = await boundedWait(exit, WINDOWS_TERMINATION_WAIT_MS);
        if (observed)
            return observed;
        try {
            socket.close();
        }
        catch {
            /* Disconnect is uncertain. */
        }
        return { ...currentSnapshot(), outcome: "unknown" };
    }
    return {
        stdin: {
            getWriter() {
                return {
                    async write(chunk) {
                        if (eof || settled || chunk.byteLength > MAX_PENDING_BYTES)
                            throw new Error("stdin is closed or chunk exceeds 16 MiB");
                        const bufferedAmount = socket.bufferedAmount || 0;
                        if (bufferedAmount + chunk.byteLength > MAX_PENDING_BYTES) {
                            void terminate();
                            throw new Error("stdio bridge pending stdin exceeded 16 MiB");
                        }
                        socket.send(chunk);
                    },
                    async close() {
                        if (eof)
                            return;
                        eof = true;
                        if (!settled)
                            socket.send(JSON.stringify({ type: "stdin_eof", id }));
                    },
                    releaseLock() { },
                };
            },
        },
        stdout: stdout.readable,
        stderr: stderr.readable,
        wait: () => exit,
        terminate,
        snapshot: currentSnapshot,
    };
}
export async function startLongLivedProcess(request) {
    ensureRequest(request);
    if (shouldUseWindowsStdioBridge())
        return startWindowsProcess(request);
    const runtime = globalThis;
    if (runtime.process?.versions?.node)
        return startNodeProcess(request);
    return startMozillaProcess(request);
}
