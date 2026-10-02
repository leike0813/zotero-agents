import { sha256Hex } from "../../../utils/sha256";
import { readRuntimeTextFile } from "../../runtimePersistence";
export const ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA = "zotero-agents.acp-runtime-semantic-trace.v1";
export function createAcpRuntimeMonotonicClock() {
    let previous = Number.NEGATIVE_INFINITY;
    return () => {
        const runtime = globalThis;
        let candidate;
        try {
            if (typeof runtime.performance?.now === "function") {
                candidate = runtime.performance.now();
            }
        }
        catch {
            candidate = undefined;
        }
        if (!Number.isFinite(candidate))
            candidate = Date.now();
        previous = Math.max(previous, candidate);
        return previous;
    };
}
export const ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS = Object.freeze({
    maxBytes: 256 * 1024 * 1024,
    maxEvents: 250_000,
    maxEventBytes: 16 * 1024 * 1024,
});
const Encoder = globalThis.TextEncoder;
export function encodeAcpRuntimeSemanticTraceText(value) {
    return new Encoder().encode(value);
}
export function acpRuntimeSemanticTraceByteLength(value) {
    return encodeAcpRuntimeSemanticTraceText(value).byteLength;
}
export function encodeAcpRuntimeSemanticTraceLine(value) {
    return `${JSON.stringify(value)}\n`;
}
function isSourceKind(value) {
    return (value === "acp-chat-conversation" || value === "acp-workflow-execution");
}
const ACP_RUNTIME_SEMANTIC_TRACE_EVENT_KINDS = new Set([
    "root-start",
    "root-end",
    "request-start",
    "request-end",
    "turn-start",
    "turn-end",
    "session-notification",
    "diagnostic",
    "permission-request",
    "permission-outcome",
    "terminal",
    "connection-close",
]);
function validateCompleteAcpRuntimeSemanticTrace(events) {
    if (events[0]?.kind !== "root-start" || events.at(-1)?.kind !== "root-end") {
        throw new Error("ACP semantic trace root boundary is incomplete");
    }
    const rootId = events[0].owner.rootId;
    let rootStartCount = 0;
    let rootEndCount = 0;
    let completedActivityCount = 0;
    const activeTurns = new Set();
    const activeRequests = new Set();
    for (const event of events) {
        if (event.owner.rootId !== rootId) {
            throw new Error("ACP semantic trace root ownership is inconsistent");
        }
        if (event.kind === "root-start")
            rootStartCount += 1;
        if (event.kind === "root-end")
            rootEndCount += 1;
        if (event.kind === "turn-start") {
            if (!event.owner.turnId || activeTurns.has(event.owner.turnId)) {
                throw new Error("ACP semantic trace turn activity is invalid");
            }
            activeTurns.add(event.owner.turnId);
        }
        else if (event.kind === "turn-end") {
            if (!event.owner.turnId || !activeTurns.delete(event.owner.turnId)) {
                throw new Error("ACP semantic trace turn activity is invalid");
            }
            completedActivityCount += 1;
        }
        else if (event.kind === "request-start") {
            if (!event.owner.requestId || activeRequests.has(event.owner.requestId)) {
                throw new Error("ACP semantic trace request activity is invalid");
            }
            activeRequests.add(event.owner.requestId);
        }
        else if (event.kind === "request-end") {
            if (!event.owner.requestId ||
                !activeRequests.delete(event.owner.requestId)) {
                throw new Error("ACP semantic trace request activity is invalid");
            }
            completedActivityCount += 1;
        }
    }
    if (rootStartCount !== 1 ||
        rootEndCount !== 1 ||
        activeTurns.size > 0 ||
        activeRequests.size > 0 ||
        completedActivityCount < 1) {
        throw new Error("ACP semantic trace activity boundary is incomplete");
    }
}
export async function parseAcpRuntimeSemanticTraceNdjson(content) {
    const rawLines = content.split("\n");
    if (rawLines.at(-1) === "")
        rawLines.pop();
    if (rawLines.length < 2) {
        throw new Error("ACP semantic trace is incomplete");
    }
    let records;
    try {
        records = rawLines.map((entry) => JSON.parse(entry));
    }
    catch {
        throw new Error("ACP semantic trace contains invalid NDJSON");
    }
    const header = records[0];
    const footer = records.at(-1);
    if (header?.record !== "header" ||
        header.schema !== ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA ||
        !isSourceKind(header.sourceKind)) {
        throw new Error("ACP semantic trace header is invalid");
    }
    if (footer?.record !== "footer") {
        throw new Error("ACP semantic trace footer is missing");
    }
    const events = records.slice(1, -1);
    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (event?.record !== "event" ||
            !ACP_RUNTIME_SEMANTIC_TRACE_EVENT_KINDS.has(event.kind) ||
            event.seq !== index + 1 ||
            event.sourceKind !== header.sourceKind ||
            !event.owner?.rootId ||
            !Number.isFinite(event.monotonicOffsetMs) ||
            event.monotonicOffsetMs < 0 ||
            (index > 0 &&
                event.monotonicOffsetMs < events[index - 1].monotonicOffsetMs)) {
            throw new Error("ACP semantic trace event sequence is invalid");
        }
    }
    const canonicalContent = rawLines
        .slice(0, -1)
        .map((entry) => `${entry}\n`)
        .join("");
    const digest = await sha256Hex(encodeAcpRuntimeSemanticTraceText(canonicalContent));
    if (!digest)
        throw new Error("SHA-256 is unavailable");
    if (footer.eventCount !== events.length ||
        footer.contentBytes !==
            acpRuntimeSemanticTraceByteLength(canonicalContent) ||
        footer.sha256 !== digest ||
        (footer.completion !== "complete" && footer.completion !== "incomplete")) {
        throw new Error("ACP semantic trace integrity check failed");
    }
    if (footer.completion === "complete") {
        validateCompleteAcpRuntimeSemanticTrace(events);
    }
    return { header, events, footer, digest };
}
export async function loadAcpRuntimeSemanticTrace(path) {
    return parseAcpRuntimeSemanticTraceNdjson(await readRuntimeTextFile(path));
}
