import { joinPath } from "../utils/path";
import { readPackagedBinaryAsset, writeBinaryFile, } from "../modules/packagedAssetResolver";
import { readRuntimeTextFile, runtimePathExists, writeRuntimeTextFile, } from "../modules/runtimePersistence";
import { buildSubprocessEnvironment } from "./env";
import { detectRuntimePlatform } from "./runtimePlatform";
import { getMozillaSubprocessModule } from "./subprocess";
const BRIDGE_RELATIVE_PATH = "bin/win32-x64/zotero-stdio-bridge.exe";
const BRIDGE_SHA_RELATIVE_PATH = "bin/win32-x64/zotero-stdio-bridge.exe.sha256";
const BRIDGE_RUNTIME_DIR = ["tmp", "stdio-bridge"];
const BRIDGE_READY_TIMEOUT_MS = 5_000;
const BRIDGE_SHUTDOWN_WAIT_MS = 1_000;
const BRIDGE_BINARY_NAME = "zotero-stdio-bridge.exe";
let bridgeServicePromise = null;
let bridgeService = null;
let bridgeTestOverrides = {};
function normalizeString(value) {
    return String(value || "").trim();
}
function redactBridgeUrl(url) {
    return url.replace(/([?&]token=)[^&]+/i, "$1<redacted>");
}
function decodeAscii(bytes) {
    return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}
function parseBridgeSha256Text(text) {
    const match = normalizeString(text).match(/\b[a-fA-F0-9]{64}\b/);
    return match ? match[0].toLowerCase() : "";
}
function buildBridgeRuntimeBinaryPath(runtimeRoot, sha256) {
    const normalizedSha = parseBridgeSha256Text(sha256);
    if (!normalizedSha) {
        return joinPath(runtimeRoot, "bin", BRIDGE_BINARY_NAME);
    }
    return joinPath(runtimeRoot, "bin", "stdio-bridge", normalizedSha.slice(0, 16), BRIDGE_BINARY_NAME);
}
function isNodeRuntime() {
    const runtime = globalThis;
    return Boolean(runtime.process?.versions?.node);
}
export function shouldUseWindowsStdioBridge() {
    if (typeof bridgeTestOverrides.enabled === "boolean") {
        return bridgeTestOverrides.enabled;
    }
    return detectRuntimePlatform() === "win32" && !isNodeRuntime();
}
function getRuntimeRootPath() {
    if (bridgeTestOverrides.runtimeRoot) {
        return bridgeTestOverrides.runtimeRoot;
    }
    const runtime = globalThis;
    const pref = normalizeString(runtime.Zotero?.Prefs?.get?.("extensions.zotero.zotero-skills.runtimeRoot", true));
    if (pref) {
        return pref;
    }
    const dataDir = normalizeString(runtime.Zotero?.DataDirectory?.dir);
    if (dataDir) {
        return typeof runtime.OS?.Path?.join === "function"
            ? runtime.OS.Path.join(dataDir, "zotero-agents", "runtime")
            : joinPath(dataDir, "zotero-agents", "runtime");
    }
    return normalizeString(runtime.process?.cwd?.()) || ".";
}
function randomHex(byteCount) {
    const runtime = globalThis;
    const bytes = new Uint8Array(byteCount);
    if (typeof runtime.crypto?.getRandomValues === "function") {
        runtime.crypto.getRandomValues(bytes);
    }
    else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}
async function waitForReadyFile(path) {
    const deadline = Date.now() + BRIDGE_READY_TIMEOUT_MS;
    let lastText = "";
    while (Date.now() < deadline) {
        lastText = await readRuntimeTextFile(path);
        const trimmed = lastText.trim();
        if (trimmed) {
            try {
                return JSON.parse(trimmed);
            }
            catch {
                // The writer may still be flushing the JSON file.
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Stdio bridge did not write a ready file within ${BRIDGE_READY_TIMEOUT_MS}ms; last=${lastText.slice(-500)}`);
}
async function waitForBridgeCloseWithTimeout(closed, timeoutMs = BRIDGE_SHUTDOWN_WAIT_MS) {
    if (timeoutMs <= 0) {
        return false;
    }
    return Promise.race([
        closed.then(() => true, () => true),
        new Promise((resolve) => {
            setTimeout(() => resolve(false), timeoutMs);
        }),
    ]);
}
async function resolveBridgeBinary(runtimeRoot) {
    if (bridgeTestOverrides.binaryPath) {
        return {
            binaryPath: bridgeTestOverrides.binaryPath,
            source: undefined,
            diagnostics: undefined,
        };
    }
    const shaRead = await readPackagedBinaryAsset(BRIDGE_SHA_RELATIVE_PATH);
    const sha256 = shaRead.ok
        ? parseBridgeSha256Text(decodeAscii(shaRead.bytes))
        : "";
    const binaryPath = buildBridgeRuntimeBinaryPath(runtimeRoot, sha256);
    if (await runtimePathExists(binaryPath)) {
        return {
            binaryPath,
            source: shaRead.ok ? shaRead.source : undefined,
            diagnostics: shaRead.diagnostics,
        };
    }
    const binaryRead = await readPackagedBinaryAsset(BRIDGE_RELATIVE_PATH);
    if (binaryRead.ok) {
        await writeBinaryFile(binaryPath, binaryRead.bytes);
        return {
            binaryPath,
            source: binaryRead.source,
            diagnostics: binaryRead.diagnostics,
        };
    }
    throw new Error(`Stdio bridge binary is unavailable; checked=${JSON.stringify({
        sha: shaRead.diagnostics,
        binary: binaryRead.diagnostics,
    })}`);
}
function extractPid(value) {
    return typeof value === "number" && Number.isFinite(value)
        ? Math.floor(value)
        : null;
}
function getSubprocessForBridge() {
    return bridgeTestOverrides.subprocess === undefined
        ? getMozillaSubprocessModule()
        : bridgeTestOverrides.subprocess;
}
async function startBridgeService() {
    if (bridgeTestOverrides.service) {
        bridgeService = bridgeTestOverrides.service;
        return bridgeTestOverrides.service;
    }
    const subprocess = getSubprocessForBridge();
    if (!subprocess?.call) {
        throw new Error("Mozilla Subprocess.call is required for the stdio bridge");
    }
    const runtimeRoot = getRuntimeRootPath();
    const bridgeDir = joinPath(runtimeRoot, ...BRIDGE_RUNTIME_DIR);
    const token = bridgeTestOverrides.token || randomHex(32);
    const startedAt = new Date().toISOString();
    const readyFile = joinPath(bridgeDir, `ready-${Date.now()}.json`);
    const logFile = joinPath(bridgeDir, "zotero-stdio-bridge.log");
    const { binaryPath, source } = await resolveBridgeBinary(runtimeRoot);
    await writeRuntimeTextFile(readyFile, "");
    await writeRuntimeTextFile(logFile, "");
    const proc = await subprocess.call({
        command: binaryPath,
        arguments: [
            "--serve",
            "--host",
            "127.0.0.1",
            "--port",
            "0",
            "--token",
            token,
            "--ready-file",
            readyFile,
            "--log-file",
            logFile,
        ],
        environment: buildSubprocessEnvironment(),
        environmentAppend: true,
        workdir: bridgeDir,
    });
    const ready = await waitForReadyFile(readyFile);
    if (ready.ok !== true || !normalizeString(ready.url)) {
        throw new Error(`Stdio bridge failed to start: ${JSON.stringify(ready)}`);
    }
    const service = {
        url: normalizeString(ready.url),
        pid: extractPid(ready.pid),
        proc,
        binaryPath,
        readyFile,
        logFile,
        startedAt,
        source,
        closed: Promise.resolve(),
    };
    service.closed = (async () => {
        try {
            await proc.wait?.();
        }
        catch {
            // The singleton is cleared below; callers get launch-time errors on restart.
        }
        finally {
            if (bridgeService === service) {
                bridgeService = null;
                bridgeServicePromise = null;
            }
        }
    })();
    bridgeService = service;
    return service;
}
export async function ensureWindowsStdioBridgeService() {
    if (bridgeService) {
        return bridgeService;
    }
    bridgeServicePromise ||= startBridgeService().catch((error) => {
        bridgeServicePromise = null;
        bridgeService = null;
        throw error;
    });
    return bridgeServicePromise;
}
export function getWindowsStdioBridgeSnapshot() {
    if (!bridgeService) {
        return null;
    }
    return {
        url: redactBridgeUrl(bridgeService.url),
        pid: bridgeService.pid,
        binaryPath: bridgeService.binaryPath,
        readyFile: bridgeService.readyFile,
        logFile: bridgeService.logFile,
        startedAt: bridgeService.startedAt,
        source: bridgeService.source,
    };
}
export async function shutdownWindowsStdioBridgeService() {
    const service = bridgeService;
    bridgeService = null;
    bridgeServicePromise = null;
    if (service) {
        try {
            service.proc.kill?.(0);
        }
        catch {
            // Bridge shutdown is best-effort.
        }
        await waitForBridgeCloseWithTimeout(service.closed);
    }
}
export async function resetWindowsStdioBridgeServiceForTests() {
    await shutdownWindowsStdioBridgeService();
    bridgeTestOverrides = {};
}
export function seedWindowsStdioBridgeServiceForTests(service) {
    bridgeTestOverrides.service = service;
    bridgeService = service;
    bridgeServicePromise = Promise.resolve(service);
}
export function setWindowsStdioBridgeTestOverridesForTests(overrides) {
    bridgeTestOverrides = overrides || {};
    if (!bridgeTestOverrides.service) {
        bridgeService = null;
        bridgeServicePromise = null;
    }
}
export function getWindowsStdioWebSocketConstructor() {
    if (bridgeTestOverrides.websocketCtor) {
        return bridgeTestOverrides.websocketCtor;
    }
    const runtime = globalThis;
    const candidates = [
        { label: "globalThis", resolve: () => runtime },
        { label: "globalThis.window", resolve: () => runtime.window },
        {
            label: "Zotero.getMainWindow()",
            resolve: () => runtime.Zotero?.getMainWindow?.(),
        },
        {
            label: "Services.appShell.hiddenDOMWindow",
            resolve: () => runtime.Services?.appShell?.hiddenDOMWindow,
        },
    ];
    const checked = [];
    for (const candidate of candidates) {
        try {
            const source = candidate.resolve();
            const ctor = source?.WebSocket || source?.MozWebSocket;
            checked.push(`${candidate.label}:${typeof ctor === "function" ? "function" : "missing"}`);
            if (typeof ctor === "function") {
                return ctor;
            }
        }
        catch (error) {
            checked.push(`${candidate.label}:error:${String(error?.message || error)}`);
        }
    }
    throw new Error(`WebSocket constructor is unavailable for the stdio bridge transport; checked=${checked.join(" | ")}`);
}
export const windowsStdioBridgeServiceInternalsForTests = {
    redactBridgeUrl,
    randomHex,
    parseBridgeSha256Text,
    buildBridgeRuntimeBinaryPath,
    waitForReadyFile,
    waitForBridgeCloseWithTimeout,
    shouldUseWindowsStdioBridge,
};
