import type { IncomingMessage } from "node:http";
import {
  isSynthesisSidecarComputeCapability,
  rebuildSynthesisSidecarCallRequest,
  SYNTHESIS_SIDECAR_LIMITS,
  type SynthesisSidecarCallRequest,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import { SynthesisClientError } from "../../../packages/synthesis-contracts/src/common.js";
import { SidecarRuntimeError } from "./errors.js";

export const REQUEST_DEADLINE_MS = 5000;

export type SynthesisSidecarRequestBody = {
  source: string;
  byteLength: number;
};

export type SynthesisSidecarJsonBounds = {
  maxDepth: number;
  maxNodes: number;
  maxStringLength: number;
};

export type SynthesisSidecarJsonBoundViolation = {
  kind: "depth" | "nodes" | "string";
  limit: number;
};

function requestError(args: {
  status: number;
  code:
    | "invalid_request"
    | "malformed_json"
    | "request_body_too_large"
    | "request_json_too_deep"
    | "request_json_too_large"
    | "request_string_too_long"
    | "request_timeout";
  message: string;
  details?: Record<string, string | number | boolean | null>;
}): never {
  throw new SidecarRuntimeError({
    status: args.status,
    code: args.code,
    message: args.message,
    details: args.details ?? {},
  });
}

export async function readRequestBody(
  request: IncomingMessage,
  maxBytes = SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes,
): Promise<SynthesisSidecarRequestBody> {
  const contentLength = request.headers["content-length"];
  if (contentLength !== undefined) {
    if (
      Array.isArray(contentLength) ||
      !/^(0|[1-9][0-9]*)$/.test(contentLength) ||
      !Number.isSafeInteger(Number(contentLength))
    ) {
      requestError({
        status: 400,
        code: "invalid_request",
        message: "The Synthesis sidecar Content-Length is invalid.",
      });
    }
    if (Number(contentLength) > maxBytes) {
      requestError({
        status: 413,
        code: "request_body_too_large",
        message: "The Synthesis sidecar request body is too large.",
        details: { maxBytes },
      });
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    let settled = false;

    const cleanup = () => {
      clearTimeout(timeout);
      request.off("data", onData);
      request.off("error", onError);
      request.off("end", onEnd);
      request.off("aborted", onAborted);
      request.off("close", onClose);
    };

    const fail = (error: unknown, drain = false) => {
      if (settled) {
        return;
      }
      settled = true;
      chunks.length = 0;
      cleanup();
      if (drain && !request.destroyed) {
        request.resume();
      }
      reject(error);
    };

    const onData = (chunk: Buffer) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteLength += bytes.byteLength;
      if (byteLength > maxBytes) {
        fail(
          new SidecarRuntimeError({
            status: 413,
            code: "request_body_too_large",
            message: "The Synthesis sidecar request body is too large.",
            details: { maxBytes },
          }),
          true,
        );
        return;
      }
      chunks.push(Buffer.from(bytes));
    };

    const onError = (error: Error) => fail(error);
    const onAborted = () =>
      fail(
        new SidecarRuntimeError({
          status: 400,
          code: "invalid_request",
          message: "The Synthesis sidecar request was aborted.",
        }),
      );
    const onClose = () => {
      if (!request.complete) {
        onAborted();
      }
    };
    const onEnd = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve({
        source: Buffer.concat(chunks).toString("utf8"),
        byteLength,
      });
    };

    const timeout = setTimeout(() => {
      fail(
        new SidecarRuntimeError({
          status: 408,
          code: "request_timeout",
          message: "The Synthesis sidecar request timed out.",
          retryable: true,
        }),
        true,
      );
    }, REQUEST_DEADLINE_MS);
    timeout.unref();

    request.on("data", onData);
    request.once("error", onError);
    request.once("end", onEnd);
    request.once("aborted", onAborted);
    request.once("close", onClose);
  });
}

export function findSynthesisSidecarJsonBoundViolation(
  value: unknown,
  bounds: SynthesisSidecarJsonBounds,
): SynthesisSidecarJsonBoundViolation | null {
  let nodes = 0;
  let violation: SynthesisSidecarJsonBoundViolation | null = null;
  const visit = (entry: unknown, depth: number) => {
    if (violation) {
      return;
    }
    if (depth > bounds.maxDepth) {
      violation = { kind: "depth", limit: bounds.maxDepth };
      return;
    }
    nodes += 1;
    if (nodes > bounds.maxNodes) {
      violation = { kind: "nodes", limit: bounds.maxNodes };
      return;
    }
    if (typeof entry === "string") {
      if (entry.length > bounds.maxStringLength) {
        violation = { kind: "string", limit: bounds.maxStringLength };
      }
      return;
    }
    if (Array.isArray(entry)) {
      for (const child of entry) {
        visit(child, depth + 1);
      }
      return;
    }
    if (entry && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry)) {
        visit(key, depth + 1);
        visit(child, depth + 1);
      }
    }
  };
  visit(value, 0);
  return violation;
}

function validateJsonBounds(value: unknown, maxNodes: number) {
  const violation = findSynthesisSidecarJsonBoundViolation(value, {
    maxDepth: SYNTHESIS_SIDECAR_LIMITS.jsonDepth,
    maxNodes,
    maxStringLength: SYNTHESIS_SIDECAR_LIMITS.stringLength,
  });
  if (!violation) {
    return;
  }
  if (violation.kind === "depth") {
    requestError({
      status: 400,
      code: "request_json_too_deep",
      message: "The Synthesis sidecar request JSON is too deep.",
      details: { maxDepth: violation.limit },
    });
  }
  if (violation.kind === "nodes") {
    requestError({
      status: 400,
      code: "request_json_too_large",
      message: "The Synthesis sidecar request JSON has too many nodes.",
      details: { maxNodes: violation.limit },
    });
  }
  requestError({
    status: 400,
    code: "request_string_too_long",
    message: "A Synthesis sidecar request string is too long.",
    details: { maxLength: violation.limit },
  });
}

const REQUEST_FIELDS = new Set([
  "protocol",
  "requestId",
  "profileId",
  "capability",
  "payload",
]);

export function parseCallRequest(
  body: SynthesisSidecarRequestBody | string,
): SynthesisSidecarCallRequest {
  const source = typeof body === "string" ? body : body.source;
  const byteLength =
    typeof body === "string" ? Buffer.byteLength(body) : body.byteLength;
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    if (byteLength > SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes) {
      requestError({
        status: 413,
        code: "request_body_too_large",
        message: "The Synthesis sidecar request body is too large.",
        details: { maxBytes: SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes },
      });
    }
    requestError({
      status: 400,
      code: "malformed_json",
      message: "The Synthesis sidecar request body is not valid JSON.",
    });
  }
  const capability =
    parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).capability
      : undefined;
  const isCompute =
    typeof capability === "string" &&
    isSynthesisSidecarComputeCapability(capability);
  const maxBytes = isCompute
    ? SYNTHESIS_SIDECAR_LIMITS.computeRequestBodyBytes
    : SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes;
  if (byteLength > maxBytes) {
    requestError({
      status: 413,
      code: "request_body_too_large",
      message: "The Synthesis sidecar request body is too large.",
      details: { maxBytes },
    });
  }
  validateJsonBounds(
    parsed,
    isCompute
      ? SYNTHESIS_SIDECAR_LIMITS.computeRequestJsonNodes
      : SYNTHESIS_SIDECAR_LIMITS.jsonNodes,
  );
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    requestError({
      status: 400,
      code: "invalid_request",
      message: "The Synthesis sidecar request must be an object.",
    });
  }
  for (const key of Object.keys(parsed as Record<string, unknown>)) {
    if (!REQUEST_FIELDS.has(key)) {
      requestError({
        status: 400,
        code: "invalid_request",
        message: "The Synthesis sidecar request contains an unknown field.",
        details: { field: key },
      });
    }
  }
  try {
    return rebuildSynthesisSidecarCallRequest(parsed);
  } catch (error) {
    if (error instanceof SynthesisClientError) {
      requestError({
        status: 400,
        code: "invalid_request",
        message: "The Synthesis sidecar request envelope is invalid.",
      });
    }
    throw error;
  }
}
