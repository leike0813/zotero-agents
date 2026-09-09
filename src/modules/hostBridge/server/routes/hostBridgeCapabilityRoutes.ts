import {
  getHostBridgeCapability,
  isCanonicalMutationProjectionCapability,
} from "../../../hostBridgeCapabilityRegistry";
import type { HostBridgeCallRequest } from "../hostBridgeProtocol";
import type { HostHttpRequest } from "../hostHttpRequestReader";
import { parseHostHttpJsonBody } from "../hostHttpRequestReader";
import type {
  HostBridgeRouteAdmission,
  HostBridgeRouteMatch,
} from "../hostBridgeRouteContract";

export type HostBridgeCapabilityRouteHandlers = {
  callCapability: HostBridgeRouteMatch["handle"];
  getCurrentContext: HostBridgeRouteMatch["handle"];
  getCurrentSelection: HostBridgeRouteMatch["handle"];
};

function capabilityAdmission(
  request: HostHttpRequest,
): HostBridgeRouteAdmission {
  if (request.method === "GET") return "read";
  try {
    const payload = parseHostHttpJsonBody(
      request.body,
    ) as HostBridgeCallRequest;
    const capabilityName = String(payload.capability || "").trim();
    if (isCanonicalMutationProjectionCapability(capabilityName)) {
      return "canonical-mutation";
    }
    return getHostBridgeCapability(capabilityName)?.requestEffect ===
      "state-change"
      ? "generic-operation"
      : "read";
  } catch {
    return "read";
  }
}

export function matchHostBridgeCapabilityRoute(
  request: HostHttpRequest,
  handlers: HostBridgeCapabilityRouteHandlers,
): HostBridgeRouteMatch | null {
  if (request.path === "/bridge/v2/call") {
    return {
      admission: capabilityAdmission(request),
      handle: handlers.callCapability,
    };
  }
  if (request.path === "/bridge/v2/context/current") {
    return { admission: "read", handle: handlers.getCurrentContext };
  }
  if (request.path === "/bridge/v2/context/selection") {
    return { admission: "read", handle: handlers.getCurrentSelection };
  }
  return null;
}
