import { sha256Hex } from "../utils/sha256";
import { readRuntimeTextFile } from "./runtimePersistence";

export const ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA =
  "zotero-agents.acp-runtime-semantic-trace.v1" as const;

export function createAcpRuntimeMonotonicClock() {
  let previous = Number.NEGATIVE_INFINITY;
  return () => {
    const runtime = globalThis as {
      performance?: { now?: () => number };
    };
    let candidate: number | undefined;
    try {
      if (typeof runtime.performance?.now === "function") {
        candidate = runtime.performance.now();
      }
    } catch {
      candidate = undefined;
    }
    if (!Number.isFinite(candidate)) candidate = Date.now();
    previous = Math.max(previous, candidate as number);
    return previous;
  };
}

export type AcpRuntimeTraceSourceKind =
  | "acp-chat-conversation"
  | "acp-workflow-execution";

export type AcpRuntimeTraceOwner = {
  rootId: string;
  conversationId?: string;
  workflowId?: string;
  workflowRunId?: string;
  jobId?: string;
  stageId?: string;
  requestId?: string;
  sessionId?: string;
  turnId?: string;
};

export type AcpRuntimeSemanticTraceEventKind =
  | "root-start"
  | "root-end"
  | "request-start"
  | "request-end"
  | "turn-start"
  | "turn-end"
  | "session-notification"
  | "diagnostic"
  | "permission-request"
  | "permission-outcome"
  | "terminal"
  | "connection-close";

export type AcpRuntimeSemanticTraceEventInput = {
  kind: AcpRuntimeSemanticTraceEventKind;
  sourceKind: AcpRuntimeTraceSourceKind;
  owner: AcpRuntimeTraceOwner;
  payload: unknown;
};

export type AcpRuntimeSemanticTraceEvent = AcpRuntimeSemanticTraceEventInput & {
  record: "event";
  seq: number;
  monotonicOffsetMs: number;
};

export type AcpRuntimeSemanticTraceHeader = {
  record: "header";
  schema: typeof ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA;
  sourceKind: AcpRuntimeTraceSourceKind;
  createdAt: string;
};

export type AcpRuntimeSemanticTraceWarning = {
  code:
    | "unowned-event"
    | "mid-turn-start"
    | "active-owner"
    | "event-limit"
    | "byte-limit"
    | "single-event-limit"
    | "write-failed"
    | "integrity-failed";
  detail?: string;
};

export type AcpRuntimeSemanticTraceFooter = {
  record: "footer";
  eventCount: number;
  contentBytes: number;
  sha256: string;
  completion: "complete" | "incomplete";
  warnings: AcpRuntimeSemanticTraceWarning[];
};

export type AcpRuntimeSemanticTraceDocument = {
  header: AcpRuntimeSemanticTraceHeader;
  events: AcpRuntimeSemanticTraceEvent[];
  footer: AcpRuntimeSemanticTraceFooter;
  digest: string;
};

export type AcpRuntimeSemanticTraceLimits = {
  maxBytes: number;
  maxEvents: number;
  maxEventBytes: number;
};

export const ACP_RUNTIME_SEMANTIC_TRACE_DEFAULT_LIMITS = Object.freeze({
  maxBytes: 256 * 1024 * 1024,
  maxEvents: 250_000,
  maxEventBytes: 16 * 1024 * 1024,
});

const Encoder = globalThis.TextEncoder;

export function encodeAcpRuntimeSemanticTraceText(value: string) {
  return new Encoder().encode(value);
}

export function acpRuntimeSemanticTraceByteLength(value: string) {
  return encodeAcpRuntimeSemanticTraceText(value).byteLength;
}

export function encodeAcpRuntimeSemanticTraceLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

function isSourceKind(value: unknown): value is AcpRuntimeTraceSourceKind {
  return (
    value === "acp-chat-conversation" || value === "acp-workflow-execution"
  );
}

export async function parseAcpRuntimeSemanticTraceNdjson(
  content: string,
): Promise<AcpRuntimeSemanticTraceDocument> {
  const rawLines = content.split("\n");
  if (rawLines.at(-1) === "") rawLines.pop();
  if (rawLines.length < 2) {
    throw new Error("ACP semantic trace is incomplete");
  }
  let records: unknown[];
  try {
    records = rawLines.map((entry) => JSON.parse(entry));
  } catch {
    throw new Error("ACP semantic trace contains invalid NDJSON");
  }
  const header = records[0] as AcpRuntimeSemanticTraceHeader;
  const footer = records.at(-1) as AcpRuntimeSemanticTraceFooter;
  if (
    header?.record !== "header" ||
    header.schema !== ACP_RUNTIME_SEMANTIC_TRACE_SCHEMA ||
    !isSourceKind(header.sourceKind)
  ) {
    throw new Error("ACP semantic trace header is invalid");
  }
  if (footer?.record !== "footer") {
    throw new Error("ACP semantic trace footer is missing");
  }
  const events = records.slice(1, -1) as AcpRuntimeSemanticTraceEvent[];
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (
      event?.record !== "event" ||
      event.seq !== index + 1 ||
      event.sourceKind !== header.sourceKind ||
      !event.owner?.rootId ||
      !Number.isFinite(event.monotonicOffsetMs) ||
      event.monotonicOffsetMs < 0 ||
      (index > 0 &&
        event.monotonicOffsetMs < events[index - 1].monotonicOffsetMs)
    ) {
      throw new Error("ACP semantic trace event sequence is invalid");
    }
  }
  const canonicalContent = rawLines
    .slice(0, -1)
    .map((entry) => `${entry}\n`)
    .join("");
  const digest = await sha256Hex(
    encodeAcpRuntimeSemanticTraceText(canonicalContent),
  );
  if (!digest) throw new Error("SHA-256 is unavailable");
  if (
    footer.eventCount !== events.length ||
    footer.contentBytes !==
      acpRuntimeSemanticTraceByteLength(canonicalContent) ||
    footer.sha256 !== digest ||
    (footer.completion !== "complete" && footer.completion !== "incomplete")
  ) {
    throw new Error("ACP semantic trace integrity check failed");
  }
  return { header, events, footer, digest };
}

export async function loadAcpRuntimeSemanticTrace(path: string) {
  return parseAcpRuntimeSemanticTraceNdjson(await readRuntimeTextFile(path));
}
