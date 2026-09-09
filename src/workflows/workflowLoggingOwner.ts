import { appendRuntimeLog } from "../modules/runtimeLogManager";
import {
  assertWorkflowHostStrictJsonValue,
  createWorkflowHostError,
} from "./workflowHostErrorContract";
import type {
  JsonObject,
  WorkflowLoggingOwner,
  WorkflowRuntimeLogRequestDto,
} from "./types";

export type WorkflowRuntimeLogBinding = Readonly<{
  workflowId: string;
  packageId: string;
  runId?: string;
  requestId?: string;
  jobId?: string;
  backendId?: string;
  backendType?: string;
  providerId?: string;
}>;

function sanitizeWorkflowLogMessage(value: string) {
  return value
    .replace(
      /\b(?:bearer\s+)?[a-z0-9_-]*(?:token|secret|password|api[-_]?key)[a-z0-9_-]*\s*[:=]\s*\S+/gi,
      "<redacted>",
    )
    .replace(/\bBearer\s+\S+/gi, "Bearer <redacted>")
    .replace(
      /\bfile:\/\/\S+|\b[A-Za-z]:\\[^\s]+|\/(?:home|Users|tmp|var)\/[^\s]+/g,
      "<redacted-path>",
    );
}

function validateWorkflowLogRequest(input: WorkflowRuntimeLogRequestDto) {
  const allowed = new Set([
    "level",
    "stage",
    "message",
    "operation",
    "phase",
    "details",
  ]);
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.has(key)) ||
    !["debug", "info", "warn", "error"].includes(input.level) ||
    typeof input.stage !== "string" ||
    typeof input.message !== "string"
  ) {
    throw createWorkflowHostError(
      "invalid_request",
      "Workflow log request is invalid",
      { reason: "invalid_schema", field: "input" },
    );
  }
  for (const [field, value] of [
    ["stage", input.stage],
    ["operation", input.operation],
    ["phase", input.phase],
  ] as const) {
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length > 128)
    ) {
      throw createWorkflowHostError(
        "resource_limited",
        `Workflow log ${field} exceeds the character limit`,
        { resource: "characters", limit: 128, observed: String(value).length },
      );
    }
  }
  const messageBytes = new TextEncoder().encode(input.message).byteLength;
  if (messageBytes > 16 * 1024) {
    throw createWorkflowHostError(
      "resource_limited",
      "Workflow log message exceeds the byte limit",
      { resource: "bytes", limit: 16 * 1024, observed: messageBytes },
    );
  }
  if (input.details === undefined) return;
  try {
    assertWorkflowHostStrictJsonValue(input.details, {
      maxDepth: 8,
      maxCollectionEntries: 512,
      maxStringCharacters: 64 * 1024,
    });
  } catch {
    throw createWorkflowHostError(
      "invalid_request",
      "Workflow log details must be bounded strict JSON",
      { reason: "invalid_schema", field: "details" },
    );
  }
  let nodes = 0;
  const count = (value: unknown): void => {
    nodes += 1;
    if (Array.isArray(value)) value.forEach(count);
    else if (value && typeof value === "object")
      Object.values(value).forEach(count);
  };
  count(input.details);
  if (nodes > 512) {
    throw createWorkflowHostError(
      "resource_limited",
      "Workflow log details exceed the node limit",
      { resource: "entries", limit: 512, observed: nodes },
    );
  }
  const bytes = new TextEncoder().encode(
    JSON.stringify(input.details),
  ).byteLength;
  if (bytes > 64 * 1024) {
    throw createWorkflowHostError(
      "resource_limited",
      "Workflow log details exceed the byte limit",
      { resource: "bytes", limit: 64 * 1024, observed: bytes },
    );
  }
}

export function createWorkflowLoggingOwner(
  binding: WorkflowRuntimeLogBinding,
): WorkflowLoggingOwner {
  return {
    appendRuntimeLog(input) {
      validateWorkflowLogRequest(input);
      appendRuntimeLog({
        level: input.level,
        scope: "hook",
        workflowId: binding.workflowId,
        packageId: binding.packageId,
        runId: binding.runId,
        requestId: binding.requestId,
        jobId: binding.jobId,
        backendId: binding.backendId,
        backendType: binding.backendType,
        providerId: binding.providerId,
        stage: input.stage,
        message: sanitizeWorkflowLogMessage(input.message),
        operation: input.operation,
        phase: input.phase,
        details: input.details as JsonObject | undefined,
      });
    },
  };
}
