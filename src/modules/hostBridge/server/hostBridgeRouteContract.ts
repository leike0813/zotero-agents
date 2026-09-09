import type { RuntimeHttpResponse } from "./runtimeHttpResponse";
import type { HostBridgeResponse } from "./hostBridgeProtocol";

export type HostBridgeRouteAdmission =
  | "read"
  | "generic-operation"
  | "canonical-mutation";

export type HostBridgeRouteMatch = {
  admission: HostBridgeRouteAdmission;
  handle: () => RuntimeHttpResponse | Promise<RuntimeHttpResponse>;
};

export type HostBridgeRouteRespond = (
  status: number,
  reason: string,
  body: HostBridgeResponse,
  lastError?: string,
) => RuntimeHttpResponse;
