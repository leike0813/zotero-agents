import {
  executeHostBridgeCapability,
  getHostBridgeCapability,
  type HostBridgeCapabilityContext,
} from "../../../hostBridgeCapabilityRegistry";
import { invalidateDefaultSynthesisClient } from "../../../synthesisClient/defaultClient";
import {
  HostBridgePermissionError,
  requestHostBridgePermissionForRequirement,
  type HostBridgePermissionScope,
} from "../../permissions/hostBridgePermissionManager";
import { hostBridgeError, hostBridgeOk } from "../hostBridgeProtocol";
import type { HostHttpRequest } from "../hostHttpRequestReader";
import { parseHostHttpJsonBody } from "../hostHttpRequestReader";
import type {
  HostBridgeRouteMatch,
  HostBridgeRouteRespond,
} from "../hostBridgeRouteContract";

export type HostBridgeSynthesisRouteContext = {
  respond: HostBridgeRouteRespond;
  getCapabilityContext: () => HostBridgeCapabilityContext;
  getPermissionScope: () => HostBridgePermissionScope | null;
  permissionErrorResponse: (
    error: HostBridgePermissionError,
  ) => ReturnType<HostBridgeRouteRespond>;
};

function maintenanceStatus(kind: "cache" | "index") {
  return {
    schema: `host-bridge.synthesis-${kind}-status.v1`,
    generatedAt: new Date().toISOString(),
    status: "available",
    readOnly: true,
    cacheView: true,
    supportedInvalidateScopes: ["topic", "graph", "index"],
  };
}

async function getCacheStatus(
  request: HostHttpRequest,
  context: HostBridgeSynthesisRouteContext,
) {
  if (request.method !== "GET") {
    return context.respond(
      405,
      "Method Not Allowed",
      hostBridgeError(
        "method_not_allowed",
        "Synthesis cache status endpoint only supports GET",
        "routing",
        { allow: "GET" },
      ),
      "method_not_allowed",
    );
  }
  const operationId = String(
    request.query.operationId || request.query.operation_id || "",
  ).trim();
  if (!operationId) {
    return context.respond(200, "OK", hostBridgeOk(maintenanceStatus("cache")));
  }
  const capability = getHostBridgeCapability("synthesis.operation.get");
  if (!capability) {
    return context.respond(
      503,
      "Service Unavailable",
      hostBridgeError(
        "capability_not_found",
        "Synthesis maintenance operation status is unavailable",
        "capability",
      ),
      "capability_not_found",
    );
  }
  const data = await executeHostBridgeCapability(
    capability.name,
    { operation_id: operationId },
    context.getCapabilityContext(),
  );
  return context.respond(200, "OK", hostBridgeOk(data));
}

async function getIndexStatus(
  request: HostHttpRequest,
  context: HostBridgeSynthesisRouteContext,
) {
  if (request.method !== "GET") {
    return context.respond(
      405,
      "Method Not Allowed",
      hostBridgeError(
        "method_not_allowed",
        "Synthesis index status endpoint only supports GET",
        "routing",
        { allow: "GET" },
      ),
      "method_not_allowed",
    );
  }
  return context.respond(
    200,
    "OK",
    hostBridgeOk({
      ...maintenanceStatus("index"),
      indexes: ["library", "reference", "topic", "graph"],
    }),
  );
}

async function invalidateCache(
  request: HostHttpRequest,
  context: HostBridgeSynthesisRouteContext,
) {
  if (request.method !== "POST") {
    return context.respond(
      405,
      "Method Not Allowed",
      hostBridgeError(
        "method_not_allowed",
        "Synthesis cache invalidate endpoint only supports POST",
        "routing",
        { allow: "POST" },
      ),
      "method_not_allowed",
    );
  }
  let payload: Record<string, unknown>;
  try {
    const value = parseHostHttpJsonBody(request.body || "");
    payload =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
  } catch {
    return context.respond(
      400,
      "Bad Request",
      hostBridgeError(
        "invalid_request_body",
        "Synthesis cache invalidate body must be valid JSON",
        "validation",
      ),
      "invalid_request_body",
    );
  }
  const scope = String(payload.scope || "").trim();
  if (!["topic", "graph", "index"].includes(scope)) {
    return context.respond(
      422,
      "Unprocessable Entity",
      hostBridgeError(
        "unsupported_cache_scope",
        "Unsupported synthesis cache invalidate scope",
        "validation",
        { scope },
      ),
      "unsupported_cache_scope",
    );
  }
  try {
    await requestHostBridgePermissionForRequirement({
      action: "synthesis.cache.invalidate",
      title: "Invalidate Synthesis cache",
      summary: `Invalidate default Synthesis service cache; requested scope: ${scope}`,
      detail: payload.id
        ? `Requested target id for audit: ${String(payload.id)}`
        : undefined,
      source: "host-bridge-cli",
      scope: context.getPermissionScope(),
    });
    invalidateDefaultSynthesisClient();
    return context.respond(
      200,
      "OK",
      hostBridgeOk({
        invalidated: true,
        scope,
        id: typeof payload.id === "string" ? payload.id : undefined,
        effect: "default_synthesis_service_invalidated",
        effectScope: "default_synthesis_service",
        scopedInvalidationApplied: false,
        invalidatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    if (error instanceof HostBridgePermissionError) {
      return context.permissionErrorResponse(error);
    }
    return context.respond(
      500,
      "Internal Server Error",
      hostBridgeError(
        "internal_error",
        error instanceof Error ? error.message : String(error || ""),
        "internal",
      ),
      "internal_error",
    );
  }
}

export function matchHostBridgeSynthesisRoute(
  request: HostHttpRequest,
  context: HostBridgeSynthesisRouteContext,
): HostBridgeRouteMatch | null {
  if (request.path === "/bridge/v2/synthesis/cache/status") {
    return {
      admission: "read",
      handle: () => getCacheStatus(request, context),
    };
  }
  if (request.path === "/bridge/v2/synthesis/cache/invalidate") {
    return {
      admission: request.method === "GET" ? "read" : "generic-operation",
      handle: () => invalidateCache(request, context),
    };
  }
  if (request.path === "/bridge/v2/synthesis/index/status") {
    return {
      admission: "read",
      handle: () => getIndexStatus(request, context),
    };
  }
  return null;
}
