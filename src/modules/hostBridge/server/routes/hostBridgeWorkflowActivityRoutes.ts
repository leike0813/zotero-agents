import type { HostHttpRequest } from "../hostHttpRequestReader";
import {
  parseHostHttpJsonBody,
  safeDecodeHostHttpPath,
} from "../hostHttpRequestReader";
import {
  HostBridgePermissionError,
  getHostBridgePermissionProjection,
  listHostBridgePendingPermissions,
  type HostBridgePermissionScope,
} from "../../permissions/hostBridgePermissionManager";
import type { HostBridgeNotificationFilters } from "../hostBridgeNotificationInbox";
import {
  HostBridgeCursorError,
  paginateHostBridgeRequestRows,
} from "../hostBridgePagination";
import type {
  HostBridgeErrorCode,
  HostBridgeResponse,
} from "../hostBridgeProtocol";
import { hostBridgeError, hostBridgeOk } from "../hostBridgeProtocol";
import type {
  HostBridgeRouteAdmission,
  HostBridgeRouteMatch,
  HostBridgeRouteRespond,
} from "../hostBridgeRouteContract";
import {
  describeHostBridgeWorkflow,
  requirementsForHostBridgeWorkflow,
  validateHostBridgeWorkflow,
  buildHostBridgeWorkflowAgentRun,
  ackHostBridgeNotifications,
  cancelHostBridgeWorkflowRun,
  connectHostBridgeSkillRun,
  getHostBridgeSkillRun,
  getHostBridgeWorkflowRunStatus,
  applyHostBridgeWorkflowAgentRun,
  abandonHostBridgeWorkflowAgentRun,
  getHostBridgeWorkflowAgentRunApplyReceipt,
  describeHostBridgeProviderProfile,
  listHostBridgeProviderProfiles,
  validateHostBridgeProviderProfile,
  refreshHostBridgeProviderProfile,
  getHostBridgeWorkflowDefaults,
  listHostBridgeActiveTasks,
  listHostBridgeNotifications,
  listHostBridgeRecentSkillRuns,
  listHostBridgeRecentTasks,
  listHostBridgeSkillRunEvents,
  listHostBridgeTasks,
  listHostBridgeWorkflowRuns,
  listHostBridgeWorkflowQueue,
  getHostBridgeWorkflowSubmission,
  cancelHostBridgeWorkflowQueueUnit,
  listHostBridgeWorkflows,
  replyHostBridgeSkillRun,
  renewHostBridgeWorkflowAgentRun,
  submitHostBridgeWorkflow,
  type HostBridgeTaskFilters,
  type HostBridgeWorkflowAgentApplyRequest,
  type HostBridgeWorkflowAgentRunRequest,
  type HostBridgeWorkflowDescribeRequest,
  type HostBridgeWorkflowValidateRequest,
  type HostBridgeProviderProfileDescribeRequest,
  type HostBridgeProviderProfileValidateRequest,
  type HostBridgeWorkflowSubmitRequest,
} from "../../workflow/hostBridgeWorkflowControl";

export type HostBridgeWorkflowActivityRouteContext = {
  respond: HostBridgeRouteRespond;
  getPermissionScope: () => HostBridgePermissionScope | null;
  permissionErrorResponse: (
    error: HostBridgePermissionError,
  ) => ReturnType<HostBridgeRouteRespond>;
};
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function methodNotAllowed(
  context: HostBridgeWorkflowActivityRouteContext,
  message: string,
  allow: string,
) {
  return context.respond(
    405,
    "Method Not Allowed",
    hostBridgeError("method_not_allowed", message, "routing", { allow }),
    "method_not_allowed",
  );
}

function paginationErrorResponse(
  context: HostBridgeWorkflowActivityRouteContext,
  error: HostBridgeCursorError,
) {
  return context.respond(
    400,
    "Bad Request",
    hostBridgeError("invalid_host_bridge_cursor", error.message, "validation", {
      reason: error.reason,
      ...error.details,
    }),
    "invalid_host_bridge_cursor",
  );
}

function workflowValidationErrorCode(
  error: unknown,
  fallback: HostBridgeErrorCode,
): HostBridgeErrorCode {
  const code = (error as { code?: string })?.code;
  return code === "invalid_workflow_describe_request" ||
    code === "invalid_workflow_validate_request" ||
    code === "invalid_workflow_agent_run_request" ||
    code === "invalid_workflow_submit_request" ||
    code === "invalid_provider_profile_request" ||
    code === "invalid_provider_profile" ||
    code === "provider_profile_backend_not_found" ||
    code === "provider_profile_backend_unready" ||
    code === "provider_profile_provider_unavailable" ||
    code === "provider_profile_option_unknown" ||
    code === "provider_profile_option_invalid" ||
    code === "provider_profile_option_unavailable" ||
    code === "workflow_provider_incompatible" ||
    code === "workflow_resource_missing" ||
    code === "workflow_resource_ineligible" ||
    code === "workflow_resource_mismatch" ||
    code === "workflow_resource_output_invalid" ||
    code === "invalid_workflow_resource_bindings" ||
    code === "workflow_interaction_required" ||
    code === "workflow_conflict_requires_policy" ||
    code === "missing_required_workflow_parameter"
    ? code
    : fallback;
}

function workflowValidationErrorDetails(error: unknown) {
  const requiredFields = (error as { requiredFields?: unknown })
    ?.requiredFields;
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details || {};
  const normalized = {
    ...details,
    ...(Array.isArray(requiredFields)
      ? {
          requiredFields: requiredFields
            .map((entry) => String(entry || "").trim())
            .filter(Boolean),
        }
      : {}),
  };
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function controlPlaneErrorResponse(
  context: HostBridgeWorkflowActivityRouteContext,
  error: unknown,
) {
  const code = String((error as { code?: unknown })?.code || "").trim();
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details ||
    undefined;
  if (code === "workflow_submission_not_found") {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_submission_not_found" as HostBridgeErrorCode,
        errorMessage(error),
        "workflow",
        details,
      ),
      "workflow_submission_not_found" as HostBridgeErrorCode,
    );
  }
  if (code === "queue_unit_not_pending") {
    return context.respond(
      409,
      "Conflict",
      hostBridgeError(
        "queue_unit_not_pending" as HostBridgeErrorCode,
        errorMessage(error),
        "workflow",
        details,
      ),
      "queue_unit_not_pending" as HostBridgeErrorCode,
    );
  }
  if (code === "workflow_run_not_found") {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_run_not_found",
        errorMessage(error),
        "workflow",
        details,
      ),
      "workflow_run_not_found",
    );
  }
  if (code === "skill_run_not_found") {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "skill_run_not_found",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_found",
    );
  }
  if (code === "invalid_skill_run_id") {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_skill_run_id",
        errorMessage(error),
        "validation",
        details,
      ),
      "invalid_skill_run_id",
    );
  }
  if (code === "skill_run_not_waiting") {
    return context.respond(
      409,
      "Conflict",
      hostBridgeError(
        "skill_run_not_waiting",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_waiting",
    );
  }
  if (code === "skill_run_not_recoverable") {
    return context.respond(
      409,
      "Conflict",
      hostBridgeError(
        "skill_run_not_recoverable",
        errorMessage(error),
        "workflow",
        details,
      ),
      "skill_run_not_recoverable",
    );
  }
  if (code === "unsupported_interaction_backend") {
    return context.respond(
      422,
      "Unprocessable Entity",
      hostBridgeError(
        "unsupported_interaction_backend",
        errorMessage(error),
        "workflow",
        details,
      ),
      "unsupported_interaction_backend",
    );
  }
  return context.respond(
    500,
    "Internal Server Error",
    hostBridgeError("internal_error", errorMessage(error), "internal", details),
    "internal_error",
  );
}

function agentRunApplyErrorResponse(
  context: HostBridgeWorkflowActivityRouteContext,
  error: unknown,
) {
  const code = String((error as { code?: unknown })?.code || "").trim();
  const details =
    (error as { details?: Record<string, unknown> | undefined })?.details ||
    undefined;
  const statusByCode: Record<string, number> = {
    invalid_agent_run_apply_request: 400,
    agent_run_not_found: 404,
    workflow_not_found: 404,
    agent_run_expired: 410,
    agent_run_already_consumed: 409,
    agent_run_lifecycle_conflict: 409,
    unknown_request: 400,
    invalid_bundle: 422,
    apply_not_allowed: 409,
  };
  const status = statusByCode[code] || 500;
  const reason =
    status === 400
      ? "Bad Request"
      : status === 404
        ? "Not Found"
        : status === 409
          ? "Conflict"
          : status === 410
            ? "Gone"
            : status === 422
              ? "Unprocessable Entity"
              : "Internal Server Error";
  const responseCode = code || "internal_error";
  return context.respond(
    status,
    reason,
    hostBridgeError(
      responseCode as HostBridgeErrorCode,
      errorMessage(error),
      status >= 500 ? "internal" : "workflow",
      details,
    ),
    responseCode as HostBridgeErrorCode,
  );
}

function parseWorkflowTaskFilters(query: Record<string, string>) {
  const filters: HostBridgeTaskFilters = {};
  for (const key of [
    "workflowId",
    "backendId",
    "backendType",
    "requestId",
    "submissionId",
    "runId",
    "state",
  ] as const) {
    const value = String(query[key] || "").trim();
    if (value) {
      filters[key] = value;
    }
  }
  if (
    String(query.includeHistory || "")
      .trim()
      .toLowerCase() === "false"
  ) {
    filters.includeHistory = false;
    filters.activeOnly = true;
  }
  const activeOnly = String(query.activeOnly || query["active-only"] || "")
    .trim()
    .toLowerCase();
  if (activeOnly === "true" || activeOnly === "1" || activeOnly === "yes") {
    filters.activeOnly = true;
  }
  return filters;
}

function parseOptionalBoolean(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseHostBridgeNotificationFilters(
  query: Record<string, string>,
): HostBridgeNotificationFilters {
  const filters: HostBridgeNotificationFilters = {};
  const workflowRunId = String(query.workflowRunId || query.runId || "").trim();
  const skillRunId = String(query.skillRunId || "").trim();
  const type = String(query.type || "").trim();
  const sinceEventId = String(query.sinceEventId || "").trim();
  const clientId = String(query.clientId || "").trim();
  if (workflowRunId) filters.workflowRunId = workflowRunId;
  if (skillRunId) filters.skillRunId = skillRunId;
  if (type) filters.type = type;
  if (sinceEventId) filters.sinceEventId = sinceEventId;
  if (clientId) filters.clientId = clientId;
  const includeSuppressed = parseOptionalBoolean(query.includeSuppressed);
  if (typeof includeSuppressed === "boolean") {
    filters.includeSuppressed = includeSuppressed;
  }
  const acknowledged = parseOptionalBoolean(query.acknowledged);
  if (typeof acknowledged === "boolean") {
    filters.acknowledged = acknowledged;
  }
  const limit = Number(query.limit || "");
  if (Number.isFinite(limit) && limit > 0) {
    filters.limit = Math.floor(limit);
  }
  return filters;
}

function parsePositiveLimit(query: Record<string, string>, fallback = 20) {
  const value = Number(query.limit || "");
  if (Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.min(200, Math.floor(value)));
  }
  return fallback;
}

function parseSkillRunEventFilters(query: Record<string, string>) {
  const sinceUpdatedAt = String(
    query.sinceUpdatedAt || query["since-updated-at"] || "",
  ).trim();
  return {
    sinceUpdatedAt: sinceUpdatedAt || undefined,
    limit: parsePositiveLimit(query),
  };
}

function skillRunPathParts(path: string) {
  const prefix = "/bridge/v2/skill-runs/";
  const rest = path.slice(prefix.length);
  const parts = rest.split("/");
  return {
    skillRunId: safeDecodeHostHttpPath(parts[0] || "") || "",
    action: parts[1] || "",
    extra: parts.slice(2),
  };
}

export function matchHostBridgeWorkflowActivityRoute(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
): HostBridgeRouteMatch | null {
  const path = request.path;
  const read = (
    handle: HostBridgeRouteMatch["handle"],
  ): HostBridgeRouteMatch => ({
    admission: "read",
    handle,
  });
  const write = (
    handle: HostBridgeRouteMatch["handle"],
  ): HostBridgeRouteMatch => ({
    admission: request.method === "GET" ? "read" : "generic-operation",
    handle,
  });

  if (path === "/bridge/v2/workflows")
    return read(() => handleListWorkflows(request, context));
  if (path === "/bridge/v2/workflows/describe")
    return read(() => handleDescribeWorkflow(request, context));
  if (path === "/bridge/v2/workflows/provider-profiles")
    return read(() => handleListProviderProfiles(request, context));
  if (path === "/bridge/v2/workflows/provider-profiles/describe")
    return read(() => handleDescribeProviderProfile(request, context));
  if (path === "/bridge/v2/workflows/provider-profiles/validate")
    return read(() => handleValidateProviderProfile(request, context));
  if (path === "/bridge/v2/workflows/provider-profiles/refresh")
    return read(() => handleRefreshProviderProfile(request, context));
  if (path === "/bridge/v2/workflows/defaults")
    return read(() => handleWorkflowDefaults(request, context));
  if (path === "/bridge/v2/workflows/validate")
    return read(() => handleValidateWorkflow(request, context));
  if (path === "/bridge/v2/workflows/requirements")
    return read(() => handleWorkflowRequirements(request, context));
  if (path === "/bridge/v2/workflows/submit")
    return write(() => handleSubmitWorkflow(request, context));
  if (path === "/bridge/v2/workflows/queue")
    return read(() => handleListWorkflowQueue(request, context));
  if (/^\/bridge\/v2\/workflows\/queue\/[^/]+\/cancel$/.test(path))
    return write(() => handleCancelWorkflowQueueUnit(request, context));
  if (path.startsWith("/bridge/v2/workflows/submissions/"))
    return read(() => handleGetWorkflowSubmission(request, context));
  if (path === "/bridge/v2/workflows/agent-run")
    return write(() => handleAgentRunWorkflow(request, context));
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/apply$/.test(path))
    return write(() => handleApplyAgentRunWorkflow(request, context));
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/renew$/.test(path))
    return write(() =>
      handleChangeAgentRunLifecycle(request, context, "renew"),
    );
  if (/^\/bridge\/v2\/workflows\/agent-runs\/[^/]+\/abandon$/.test(path))
    return write(() =>
      handleChangeAgentRunLifecycle(request, context, "abandon"),
    );
  if (/^\/bridge\/v2\/workflows\/runs\/[^/]+\/cancel$/.test(path))
    return write(() => handleCancelWorkflowRun(request, context));
  if (path === "/bridge/v2/workflows/runs")
    return read(() => handleListWorkflowRuns(request, context));
  if (path.startsWith("/bridge/v2/workflows/runs/"))
    return read(() => handleGetWorkflowRun(request, context));
  if (path === "/bridge/v2/tasks/active")
    return read(() => handleListActiveTasks(request, context));
  if (path === "/bridge/v2/tasks/recent")
    return read(() => handleListRecentTasks(request, context));
  if (path === "/bridge/v2/tasks")
    return read(() => handleListTasks(request, context));
  if (path === "/bridge/v2/permissions/pending")
    return read(() => handleListPendingPermissions(request, context));
  if (path.startsWith("/bridge/v2/permissions/"))
    return read(() => handleGetPermission(request, context));
  if (path === "/bridge/v2/notifications")
    return read(() => handleListNotifications(request, context));
  if (path === "/bridge/v2/notifications/ack")
    return write(() => handleAckNotifications(request, context));
  if (path === "/bridge/v2/skill-runs/recent")
    return read(() => handleListRecentSkillRuns(request, context));
  if (/^\/bridge\/v2\/skill-runs\/[^/]+\/(reply|connect)$/.test(path))
    return write(() => handleSkillRun(request, context));
  if (path.startsWith("/bridge/v2/skill-runs/"))
    return read(() => handleSkillRun(request, context));
  return null;
}

async function handleListWorkflows(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Workflow list endpoint only supports GET",
      "GET",
    );
  }
  return context.respond(
    200,
    "OK",
    hostBridgeOk({ workflows: listHostBridgeWorkflows() }),
  );
}

async function handleDescribeWorkflow(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow describe endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowDescribeRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowDescribeRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_describe_request",
        "Workflow describe request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_describe_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await describeHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_describe_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function handleApplyAgentRunWorkflow(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  const prefix = "/bridge/v2/workflows/agent-runs/";
  const suffix = "/apply";
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const agentRunId = safeDecodeHostHttpPath(encoded) || "";
  if (request.method === "GET") {
    const receipt = getHostBridgeWorkflowAgentRunApplyReceipt(agentRunId);
    if (!receipt) {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "agent_run_not_found",
          "Agent run not found",
          "workflow",
          {
            agentRunId,
          },
        ),
        "agent_run_not_found",
      );
    }
    try {
      const page = paginateHostBridgeRequestRows({
        request,
        scope: "workflow agent-apply-status",
        rows: receipt.results,
        extraCriteria: { agentRunId },
      });
      return context.respond(
        200,
        "OK",
        hostBridgeOk({
          ...receipt,
          results: page.page,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          returned: page.returned,
          total: page.total,
          limit: page.limit,
        }),
      );
    } catch (error) {
      if (error instanceof HostBridgeCursorError) {
        return paginationErrorResponse(context, error);
      }
      throw error;
    }
  }
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow agent-run apply endpoint only supports GET and POST",
      "GET, POST",
    );
  }
  let payload: HostBridgeWorkflowAgentApplyRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowAgentApplyRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_agent_run_apply_request" as HostBridgeErrorCode,
        "Workflow agent-run apply request body must be valid JSON",
        "validation",
      ),
      "invalid_agent_run_apply_request" as HostBridgeErrorCode,
    );
  }
  try {
    const result = await applyHostBridgeWorkflowAgentRun({
      agentRunId,
      payload,
      scope: context.getPermissionScope(),
    });
    const { results: _results, warnings: _warnings, ...boundedResult } = result;
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        ...boundedResult,
        receiptUrl:
          "/bridge/v2/workflows/agent-runs/" +
          encodeURIComponent(agentRunId) +
          "/apply",
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return context.permissionErrorResponse(error);
    }
    return agentRunApplyErrorResponse(context, error);
  }
}

async function handleChangeAgentRunLifecycle(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
  action: "renew" | "abandon",
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow agent-run " + action + " endpoint only supports POST",
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/agent-runs/";
  const suffix = "/" + action;
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const agentRunId = safeDecodeHostHttpPath(encoded) || "";
  try {
    const result =
      action === "renew"
        ? renewHostBridgeWorkflowAgentRun(agentRunId)
        : abandonHostBridgeWorkflowAgentRun(agentRunId);
    return context.respond(200, "OK", hostBridgeOk(result));
  } catch (error) {
    return agentRunApplyErrorResponse(context, error);
  }
}

async function handleCancelWorkflowRun(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow cancel endpoint only supports POST",
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/runs/";
  const suffix = "/cancel";
  const encoded = request.path.slice(prefix.length, -suffix.length);
  const workflowRunId = safeDecodeHostHttpPath(encoded) || "";
  try {
    const payload = parseHostHttpJsonBody(request.body || "");
    const object =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {};
    const result = await cancelHostBridgeWorkflowRun({
      workflowRunId,
      reason: String(object.reason || "").trim() || undefined,
      message: String(object.message || "").trim() || undefined,
      scope: context.getPermissionScope(),
      timeoutMs: 5 * 60 * 1000,
    });
    return context.respond(200, "OK", hostBridgeOk(result));
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return context.permissionErrorResponse(error);
    }
    return controlPlaneErrorResponse(context, error);
  }
}

async function handleGetWorkflowRun(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Workflow run endpoint only supports GET",
      "GET",
    );
  }
  const prefix = "/bridge/v2/workflows/runs/";
  const runId = safeDecodeHostHttpPath(request.path.slice(prefix.length)) || "";
  const status = getHostBridgeWorkflowRunStatus(runId);
  if (!status.found) {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "workflow_run_not_found",
        "Workflow run not found",
        "workflow",
        {
          runId,
        },
      ),
      "workflow_run_not_found",
    );
  }
  try {
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run get",
      rows: status.skillRuns || [],
      extraCriteria: { runId },
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        ...status,
        skillRuns: page.page,
        pagination: {
          skillRuns: {
            nextCursor: page.nextCursor,
            hasMore: page.hasMore,
            returned: page.returned,
            total: page.total,
            limit: page.limit,
          },
        },
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(context, error);
    }
    return controlPlaneErrorResponse(context, error);
  }
}

async function handleListWorkflowRuns(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Workflow runs endpoint only supports GET",
      "GET",
    );
  }
  try {
    const result = listHostBridgeWorkflowRuns(
      parseWorkflowTaskFilters(request.query),
    );
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run workflow recent",
      rows: result.runs,
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        runs: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleListTasks(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Task list endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run list",
      rows: listHostBridgeTasks(parseWorkflowTaskFilters(request.query)),
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        items: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleListRecentTasks(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Recent task endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run recent",
      rows: listHostBridgeTasks({
        ...parseWorkflowTaskFilters(request.query),
        includeHistory: true,
      }),
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        items: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleListActiveTasks(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Active task endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run active",
      rows: listHostBridgeActiveTasks(),
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        tasks: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleListPendingPermissions(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Permission pending endpoint only supports GET",
      "GET",
    );
  }
  try {
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run permission pending",
      rows: listHostBridgePendingPermissions(),
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        permissions: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleGetPermission(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Permission get endpoint only supports GET",
      "GET",
    );
  }
  const prefix = "/bridge/v2/permissions/";
  const permissionRequestId =
    safeDecodeHostHttpPath(request.path.slice(prefix.length)) || "";
  const permission = getHostBridgePermissionProjection(permissionRequestId);
  if (!permission) {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "permission_request_not_found",
        "Permission request not found",
        "not_found",
        { permissionRequestId },
      ),
      "permission_request_not_found",
    );
  }
  return context.respond(200, "OK", hostBridgeOk({ permission }));
}

async function handleListNotifications(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Notification list endpoint only supports GET",
      "GET",
    );
  }
  return context.respond(
    200,
    "OK",
    hostBridgeOk(
      listHostBridgeNotifications(
        parseHostBridgeNotificationFilters(request.query),
      ),
    ),
  );
}

async function handleAckNotifications(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Notification ack endpoint only supports POST",
      "POST",
    );
  }
  const payload = parseHostHttpJsonBody(request.body || "");
  const object =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const eventIds = Array.isArray(object.eventIds)
    ? object.eventIds.map((entry) => String(entry || "").trim())
    : [String(object.eventId || "").trim()];
  const normalized = eventIds.filter(Boolean);
  const clientId = String(
    object.clientId || request.query.clientId || "",
  ).trim();
  if (normalized.length === 0) {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_request_body",
        "notification ack requires body.eventId or body.eventIds",
        "validation",
      ),
      "invalid_request_body",
    );
  }
  return context.respond(
    200,
    "OK",
    hostBridgeOk(ackHostBridgeNotifications(normalized, clientId)),
  );
}

async function handleListRecentSkillRuns(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Recent skill-run endpoint only supports GET",
      "GET",
    );
  }
  try {
    const result = listHostBridgeRecentSkillRuns(
      parseWorkflowTaskFilters(request.query),
    );
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "run skill recent",
      rows: result.skillRuns,
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        skillRuns: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    return error instanceof HostBridgeCursorError
      ? paginationErrorResponse(context, error)
      : controlPlaneErrorResponse(context, error);
  }
}

async function handleListWorkflowQueue(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Workflow queue endpoint only supports GET",
      "GET",
    );
  }
  const backendType = String(request.query.backendType || "").trim();
  const backendId = String(request.query.backendId || "").trim();
  const scope =
    (backendType === "acp" || backendType === "skillrunner") && backendId
      ? {
          backendType: backendType as "acp" | "skillrunner",
          backendId,
        }
      : undefined;
  try {
    const result = listHostBridgeWorkflowQueue(scope);
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "workflow queue list",
      rows: result.units,
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        ...result,
        units: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        total: page.total,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(context, error);
    }
    throw error;
  }
}

async function handleGetWorkflowSubmission(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Workflow submission endpoint only supports GET",
      "GET",
    );
  }
  const prefix = "/bridge/v2/workflows/submissions/";
  const submissionId =
    safeDecodeHostHttpPath(request.path.slice(prefix.length)) || "";
  try {
    const result = getHostBridgeWorkflowSubmission(submissionId);
    const page = paginateHostBridgeRequestRows({
      request,
      scope: "workflow submission get",
      rows: result.units,
    });
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        ...result,
        units: page.page,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        returned: page.returned,
        limit: page.limit,
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(context, error);
    }
    return controlPlaneErrorResponse(context, error);
  }
}

async function handleCancelWorkflowQueueUnit(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow queue cancel endpoint only supports POST",
      "POST",
    );
  }
  const prefix = "/bridge/v2/workflows/queue/";
  const suffix = "/cancel";
  const queueId =
    safeDecodeHostHttpPath(request.path.slice(prefix.length, -suffix.length)) ||
    "";
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(cancelHostBridgeWorkflowQueueUnit(queueId)),
    );
  } catch (error) {
    return controlPlaneErrorResponse(context, error);
  }
}

async function handleAgentRunWorkflow(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow agent-run endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowAgentRunRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowAgentRunRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_agent_run_request",
        "Workflow agent-run request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_agent_run_request",
    );
  }
  try {
    const result = await buildHostBridgeWorkflowAgentRun({ payload });
    const { requests, ...boundedResult } = result;
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        ...boundedResult,
        requestCount: requests.length,
        bundleInspectCommand:
          "zotero-bridge workflow agent-bundle inspect --bundle " +
          result.bundle.file.displayName,
      }),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_agent_run_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function handleSubmitWorkflow(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow submit endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowSubmitRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowSubmitRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_submit_request",
        "Workflow submit request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_submit_request",
    );
  }
  try {
    const result = await submitHostBridgeWorkflow({
      payload,
      scope: context.getPermissionScope(),
    });
    const boundedResult =
      result.admission === "direct"
        ? {
            workflowId: result.workflowId,
            workflowLabel: result.workflowLabel,
            admission: result.admission,
            workflowRunId: result.workflowRunId,
            totalJobs: result.totalJobs,
            permission: result.permission,
            resourceOutputs: result.resourceOutputs,
            runUrl:
              "/bridge/v2/workflows/runs/" +
              encodeURIComponent(result.workflowRunId),
            tasksUrl:
              "/bridge/v2/tasks?runId=" +
              encodeURIComponent(result.workflowRunId),
          }
        : result;
    return context.respond(
      result.admission === "host-queue" ? 202 : 200,
      result.admission === "host-queue" ? "Accepted" : "OK",
      hostBridgeOk(boundedResult),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return context.permissionErrorResponse(error);
    }
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const message = errorMessage(error);
    if (
      message === "workflow preparation halted" ||
      message === "workflow submission produced no allowed requests"
    ) {
      return context.respond(
        500,
        "Internal Server Error",
        hostBridgeError("workflow_submit_failed", message, "workflow"),
        "workflow_submit_failed",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_submit_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function handleValidateWorkflow(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow validate endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowValidateRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowValidateRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_validate_request",
        "Workflow validate request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_validate_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await validateHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_validate_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function handleListProviderProfiles(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "GET") {
    return methodNotAllowed(
      context,
      "Provider profile list endpoint only supports GET",
      "GET",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await listHostBridgeProviderProfiles()),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_provider_profile_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(code, errorMessage(error), "validation"),
      code,
    );
  }
}

async function handleDescribeProviderProfile(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Provider profile describe endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeProviderProfileDescribeRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeProviderProfileDescribeRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile_request",
        "Provider profile describe request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await describeHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_provider_profile_request",
    );
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return context.respond(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function handleValidateProviderProfile(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Provider profile validate endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeProviderProfileValidateRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeProviderProfileValidateRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile",
        "Provider profile validate request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await validateHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(error, "invalid_provider_profile");
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return context.respond(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function handleRefreshProviderProfile(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Provider profile refresh endpoint only supports POST",
      "POST",
    );
  }
  let payload: { backendId?: unknown };
  try {
    payload = parseHostHttpJsonBody(request.body) as { backendId?: unknown };
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_provider_profile_request",
        "Provider profile refresh request body must be valid JSON",
        "validation",
      ),
      "invalid_provider_profile_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await refreshHostBridgeProviderProfile(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "provider_profile_refresh_failed",
    );
    const status = code === "provider_profile_backend_not_found" ? 404 : 400;
    return context.respond(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(
        code,
        errorMessage(error),
        "validation",
        (error as { details?: Record<string, unknown> }).details,
      ),
      code,
    );
  }
}

async function handleWorkflowDefaults(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow defaults endpoint only supports POST",
      "POST",
    );
  }
  let payload: { workflowId?: unknown };
  try {
    payload = parseHostHttpJsonBody(request.body) as { workflowId?: unknown };
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_defaults_request",
        "Workflow defaults request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_defaults_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await getHostBridgeWorkflowDefaults(payload)),
    );
  } catch (error) {
    const code = workflowValidationErrorCode(
      error,
      "invalid_workflow_defaults_request",
    );
    const status = code === "workflow_not_found" ? 404 : 400;
    return context.respond(
      status,
      status === 404 ? "Not Found" : "Bad Request",
      hostBridgeError(code, errorMessage(error), "validation"),
      code,
    );
  }
}

async function handleWorkflowRequirements(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  if (request.method !== "POST") {
    return methodNotAllowed(
      context,
      "Workflow requirements endpoint only supports POST",
      "POST",
    );
  }
  let payload: HostBridgeWorkflowDescribeRequest;
  try {
    payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeWorkflowDescribeRequest;
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_workflow_describe_request",
        "Workflow requirements request body must be valid JSON",
        "validation",
      ),
      "invalid_workflow_describe_request",
    );
  }
  try {
    return context.respond(
      200,
      "OK",
      hostBridgeOk(await requirementsForHostBridgeWorkflow(payload)),
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "workflow_not_found") {
      return context.respond(
        404,
        "Not Found",
        hostBridgeError(
          "workflow_not_found",
          "Workflow not found",
          "workflow",
          {
            workflowId: String(payload?.workflowId || "").trim(),
          },
        ),
        "workflow_not_found",
      );
    }
    const validationCode = workflowValidationErrorCode(
      error,
      "invalid_workflow_describe_request",
    );
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        validationCode,
        errorMessage(error),
        "validation",
        workflowValidationErrorDetails(error),
      ),
      validationCode,
    );
  }
}

async function handleSkillRun(
  request: HostHttpRequest,
  context: HostBridgeWorkflowActivityRouteContext,
) {
  const { skillRunId, action, extra } = skillRunPathParts(request.path);
  if (extra.length > 0) {
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "not_found",
        "Host Bridge skill run route not found",
        "not_found",
      ),
      "not_found",
    );
  }
  try {
    if (!action) {
      if (request.method !== "GET") {
        return methodNotAllowed(
          context,
          "Skill run endpoint only supports GET",
          "GET",
        );
      }
      return context.respond(
        200,
        "OK",
        hostBridgeOk(getHostBridgeSkillRun(skillRunId)),
      );
    }
    if (action === "reply") {
      if (request.method !== "POST") {
        return methodNotAllowed(
          context,
          "Skill run reply endpoint only supports POST",
          "POST",
        );
      }
      const payload = parseHostHttpJsonBody(request.body || "");
      const object =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as Record<string, unknown>)
          : {};
      const message = String(object.message || "").trim();
      if (!message) {
        return context.respond(
          400,
          "Bad Request",
          hostBridgeError(
            "invalid_request_body",
            "skill-run reply requires body.message",
            "validation",
          ),
          "invalid_request_body",
        );
      }
      return context.respond(
        200,
        "OK",
        hostBridgeOk(await replyHostBridgeSkillRun({ skillRunId, message })),
      );
    }
    if (action === "connect") {
      if (request.method !== "POST") {
        return methodNotAllowed(
          context,
          "Skill run connect endpoint only supports POST",
          "POST",
        );
      }
      return context.respond(
        200,
        "OK",
        hostBridgeOk(await connectHostBridgeSkillRun({ skillRunId })),
      );
    }
    if (action === "events") {
      if (request.method !== "GET") {
        return methodNotAllowed(
          context,
          "Skill run events endpoint only supports GET",
          "GET",
        );
      }
      const filters = parseSkillRunEventFilters(request.query);
      const result = listHostBridgeSkillRunEvents(skillRunId, {
        ...filters,
        limit: 1000,
      });
      const page = paginateHostBridgeRequestRows({
        request,
        scope: "run skill events",
        rows: result.events,
        extraCriteria: { skillRunId, sinceUpdatedAt: filters.sinceUpdatedAt },
      });
      return context.respond(
        200,
        "OK",
        hostBridgeOk({
          ...result,
          events: page.page,
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          returned: page.returned,
          total: page.total,
          limit: page.limit,
        }),
      );
    }
    return context.respond(
      404,
      "Not Found",
      hostBridgeError(
        "not_found",
        "Host Bridge skill run route not found",
        "not_found",
      ),
      "not_found",
    );
  } catch (error) {
    if (error instanceof HostBridgeCursorError) {
      return paginationErrorResponse(context, error);
    }
    return controlPlaneErrorResponse(context, error);
  }
}
