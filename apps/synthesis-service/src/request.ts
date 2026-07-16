import type { IncomingMessage } from "node:http";
import {
  rebuildSynthesisSidecarCallRequest,
  SYNTHESIS_SIDECAR_LIMITS,
  type SynthesisSidecarCallRequest,
} from "../../../packages/synthesis-contracts/src/sidecarSystem.js";
import { SynthesisClientError } from "../../../packages/synthesis-contracts/src/common.js";
import { SidecarRuntimeError } from "./errors.js";

export const REQUEST_DEADLINE_MS = 5000;

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
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    let tooLarge = false;
    const timeout = setTimeout(() => {
      reject(
        new SidecarRuntimeError({
          status: 408,
          code: "request_timeout",
          message: "The Synthesis sidecar request timed out.",
          retryable: true,
        }),
      );
    }, REQUEST_DEADLINE_MS);
    timeout.unref();

    request.on("data", (chunk: Buffer) => {
      byteLength += chunk.byteLength;
      if (byteLength > SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    request.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    request.once("end", () => {
      clearTimeout(timeout);
      if (tooLarge) {
        reject(
          new SidecarRuntimeError({
            status: 413,
            code: "request_body_too_large",
            message: "The Synthesis sidecar request body is too large.",
            details: {
              maxBytes: SYNTHESIS_SIDECAR_LIMITS.requestBodyBytes,
            },
          }),
        );
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

function validateJsonBounds(value: unknown) {
  let nodes = 0;
  const visit = (entry: unknown, depth: number) => {
    if (depth > SYNTHESIS_SIDECAR_LIMITS.jsonDepth) {
      requestError({
        status: 400,
        code: "request_json_too_deep",
        message: "The Synthesis sidecar request JSON is too deep.",
        details: { maxDepth: SYNTHESIS_SIDECAR_LIMITS.jsonDepth },
      });
    }
    nodes += 1;
    if (nodes > SYNTHESIS_SIDECAR_LIMITS.jsonNodes) {
      requestError({
        status: 400,
        code: "request_json_too_large",
        message: "The Synthesis sidecar request JSON has too many nodes.",
        details: { maxNodes: SYNTHESIS_SIDECAR_LIMITS.jsonNodes },
      });
    }
    if (typeof entry === "string") {
      if (entry.length > SYNTHESIS_SIDECAR_LIMITS.stringLength) {
        requestError({
          status: 400,
          code: "request_string_too_long",
          message: "A Synthesis sidecar request string is too long.",
          details: {
            maxLength: SYNTHESIS_SIDECAR_LIMITS.stringLength,
          },
        });
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
}

const REQUEST_FIELDS = new Set([
  "protocol",
  "requestId",
  "profileId",
  "capability",
  "payload",
]);

export function parseCallRequest(source: string): SynthesisSidecarCallRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    requestError({
      status: 400,
      code: "malformed_json",
      message: "The Synthesis sidecar request body is not valid JSON.",
    });
  }
  validateJsonBounds(parsed);
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
